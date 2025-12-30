import json
import os
import re
from collections import Counter
from copy import deepcopy
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import requests
from docx import Document
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from openai import OpenAI
from pypdf import PdfReader

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = (BASE_DIR.parent / "live-examples").resolve()
DATA_DIR = BASE_DIR / "data"
DEFAULT_DECK_FILE = DATA_DIR / "default_deck.json"
PROGRESS_FILE = DATA_DIR / "progress.json"
LEARNING_PATH_FILE = DATA_DIR / "learning_paths.json"
LEARNER_PROGRESS_FILE = DATA_DIR / "learner_progress.json"
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_CHARS_PER_CHUNK = 5500
MAX_FLASHCARDS_PER_CHUNK = 20
DIFFICULTY_ORDER: Tuple[str, str, str] = ("medium", "expert", "professor")
DIFFICULTY_STREAKS: Dict[str, int] = {"medium": 1, "expert": 2, "professor": 3}

GOOGLE_BOOKS_SEARCH_URL = "https://www.googleapis.com/books/v1/volumes"
GOOGLE_BOOKS_DEFAULT_LIMIT = 5
HTTP_TIMEOUT_SECONDS = 12
KEYWORD_STOPWORDS = {
    "about",
    "after",
    "again",
    "against",
    "among",
    "because",
    "between",
    "chapter",
    "could",
    "describe",
    "during",
    "every",
    "first",
    "focus",
    "found",
    "having",
    "ideas",
    "inside",
    "introduction",
    "later",
    "learners",
    "learning",
    "major",
    "other",
    "overview",
    "study",
    "text",
    "textbook",
    "their",
    "there",
    "these",
    "those",
    "through",
    "topics",
    "using",
    "which",
    "while",
    "within",
    "would",
}

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})


def load_json(path: Path, default: Any) -> Any:
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    return default


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def load_learning_paths() -> Dict[str, Any]:
    return load_json(LEARNING_PATH_FILE, default={})


def save_learning_paths(paths: Dict[str, Any]) -> None:
    write_json(LEARNING_PATH_FILE, paths)


def load_learner_progress() -> List[Dict[str, Any]]:
    return load_json(LEARNER_PROGRESS_FILE, default=[])


def save_learner_progress(entries: List[Dict[str, Any]]) -> None:
    write_json(LEARNER_PROGRESS_FILE, entries)


def normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def normalize_answer_list(answers: Sequence[str]) -> List[str]:
    normalized: List[str] = []
    for answer in answers:
        cleaned = normalize_text(answer)
        if cleaned and cleaned not in normalized:
            normalized.append(cleaned)
    return normalized


def split_text(text: str, max_chars: int = MAX_CHARS_PER_CHUNK) -> List[str]:
    cleaned = text or ""
    if not cleaned:
        return []

    segments: List[str] = []
    cursor = 0
    while cursor < len(cleaned):
        segments.append(cleaned[cursor : cursor + max_chars])
        cursor += max_chars

    return segments


def sentence_split(text: str) -> List[str]:
    cleaned = normalize_text(text)
    if not cleaned:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    return [normalize_text(sentence) for sentence in sentences if sentence and any(ch.isalpha() for ch in sentence)]


def keyword_to_title(keyword: str) -> str:
    normalized = normalize_text(keyword.replace("-", " ").replace("_", " "))
    if not normalized:
        return "Overview"
    return normalized.title()


def parse_bool(value: Any) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y"}:
            return True
        if lowered in {"false", "0", "no", "n"}:
            return False
    return None


def validate_base_question(base_question: Dict[str, Any]) -> Optional[str]:
    question_text = normalize_text(base_question.get("question_text"))
    correct_answer = normalize_text(base_question.get("correct_answer"))
    incorrect_answers = normalize_answer_list(base_question.get("incorrect_answers", []))

    if not question_text:
        return "Each base question requires question_text."
    if not correct_answer:
        return "Each base question requires correct_answer."
    if len(incorrect_answers) < 3:
        return "Each base question needs at least three incorrect_answers to satisfy all difficulty rules."
    return None


def select_distractors(incorrect_answers: List[str], required: int = 3) -> List[str]:
    if len(incorrect_answers) >= required:
        return incorrect_answers[:required]
    padded = incorrect_answers[:]
    while len(padded) < required:
        padded.append(incorrect_answers[len(padded) % len(incorrect_answers)])
    return padded


def build_choices_for_difficulty(
    base_question: Dict[str, Any],
    difficulty: str,
) -> List[Dict[str, Any]]:
    correct_answer = normalize_text(base_question.get("correct_answer"))
    incorrect_answers = select_distractors(normalize_answer_list(base_question.get("incorrect_answers", [])), 3)

    if difficulty not in DIFFICULTY_ORDER:
        return []

    choice_plan: List[Tuple[str, str]] = []

    if difficulty == "medium":
        choice_plan = [
            (correct_answer, "correct"),
            (incorrect_answers[0], "close"),
            (incorrect_answers[1], "plausible"),
            (incorrect_answers[2], "obvious"),
        ]
    elif difficulty == "expert":
        choice_plan = [
            (incorrect_answers[0], "similar"),
            (correct_answer, "correct"),
            (incorrect_answers[1], "parallel"),
            (incorrect_answers[2], "edge"),
        ]
    else:  # professor
        choice_plan = [
            (incorrect_answers[1], "nuanced"),
            (incorrect_answers[0], "ambiguous"),
            (correct_answer, "precise"),
            (incorrect_answers[2], "broad"),
        ]

    choices: List[Dict[str, Any]] = []
    for text, flavor in choice_plan:
        choices.append(
            {
                "text": text,
                "correct": text == correct_answer,
                "distractor_kind": flavor if text != correct_answer else "answer",
            }
        )

    return choices


def mutate_question_text(question_text: str, difficulty: str, attempt_seed: int) -> str:
    base = normalize_text(question_text)
    if not base:
        return ""

    medium_templates = [
        "Recall check: {q}",
        "Quick review: {q}",
        "Memory probe: {q}",
    ]
    expert_templates = [
        "Apply and differentiate: {q}",
        "Connect details: {q}",
        "Test comprehension: {q}",
    ]
    professor_templates = [
        "Disambiguate precisely: {q}",
        "Focus on scope and exceptions: {q}",
        "Select the most exact statement: {q}",
    ]

    templates_map = {
        "medium": medium_templates,
        "expert": expert_templates,
        "professor": professor_templates,
    }

    templates = templates_map.get(difficulty, [ "{q}" ])
    if not templates:
        return base

    index = attempt_seed % len(templates)
    return templates[index].format(q=base)


def build_mode_question(
    base_question: Dict[str, Any],
    difficulty: str,
    attempt_seed: int = 0,
) -> Dict[str, Any]:
    return {
        "difficulty": difficulty,
        "question_text": mutate_question_text(base_question.get("question_text", ""), difficulty, attempt_seed),
        "choices": build_choices_for_difficulty(base_question, difficulty),
        "base_question": {
            "question_text": normalize_text(base_question.get("question_text")),
            "correct_answer": normalize_text(base_question.get("correct_answer")),
            "incorrect_answers": normalize_answer_list(base_question.get("incorrect_answers", [])),
        },
    }


def build_concept_modes(base_questions: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    modes: Dict[str, List[Dict[str, Any]]] = {"medium": [], "expert": [], "professor": []}
    for base_question in base_questions:
        for difficulty in DIFFICULTY_ORDER:
            modes[difficulty].append(build_mode_question(base_question, difficulty, attempt_seed=0))
    return modes


def initialize_progress_entry(user_id: str, topic_id: str, concept_id: str) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "topic_id": topic_id,
        "concept_id": concept_id,
        "medium_passed": False,
        "expert_passed": False,
        "professor_passed": False,
        "attempts": 0,
        "current_difficulty": "medium",
        "streak": 0,
    }


def downgrade_difficulty(current: str) -> str:
    if current == "professor":
        return "expert"
    if current == "expert":
        return "medium"
    return "medium"


def advance_difficulty(current: str) -> str:
    if current == "medium":
        return "expert"
    if current == "expert":
        return "professor"
    return "professor"


def apply_attempt_to_progress(entry: Dict[str, Any], is_correct: bool) -> Dict[str, Any]:
    current_difficulty = entry.get("current_difficulty", "medium")
    streak = entry.get("streak", 0)
    entry["attempts"] = entry.get("attempts", 0) + 1

    if is_correct:
        streak += 1
        required = DIFFICULTY_STREAKS.get(current_difficulty, 1)
        if streak >= required:
            if current_difficulty == "medium":
                entry["medium_passed"] = True
            elif current_difficulty == "expert":
                entry["expert_passed"] = True
            elif current_difficulty == "professor":
                entry["professor_passed"] = True

            entry["current_difficulty"] = advance_difficulty(current_difficulty)
            streak = 0
        entry["streak"] = streak
        return entry

    # incorrect path
    entry["streak"] = 0
    entry["current_difficulty"] = downgrade_difficulty(current_difficulty)
    return entry


def validate_learning_path_payload(payload: Dict[str, Any]) -> Optional[str]:
    topic_id = normalize_text(payload.get("topic_id") or payload.get("topicId"))
    if not topic_id:
        return "A topic_id is required."

    concepts = payload.get("concepts")
    if not isinstance(concepts, list) or not concepts:
        return "Provide at least one concept."

    for concept in concepts:
        concept_id = normalize_text(concept.get("concept_id") or concept.get("conceptId"))
        if not concept_id:
            return "Each concept requires concept_id."
        base_questions = concept.get("base_questions") or concept.get("baseQuestions")
        if not isinstance(base_questions, list) or not base_questions:
            return f"Concept {concept_id} must include base_questions."
        for base_question in base_questions:
            error = validate_base_question(base_question)
            if error:
                return f"Concept {concept_id}: {error}"

    return None


def normalize_concept(concept: Dict[str, Any], order: int) -> Dict[str, Any]:
    concept_id = normalize_text(concept.get("concept_id") or concept.get("conceptId"))
    title = normalize_text(concept.get("title") or concept.get("name") or concept_id)
    base_questions = concept.get("base_questions") or concept.get("baseQuestions") or []
    normalized_base = []
    for base_question in base_questions:
        normalized_base.append(
            {
                "question_text": normalize_text(base_question.get("question_text")),
                "correct_answer": normalize_text(base_question.get("correct_answer")),
                "incorrect_answers": normalize_answer_list(base_question.get("incorrect_answers", [])),
            }
        )

    return {
        "concept_id": concept_id,
        "title": title,
        "order": order,
        "base_questions": normalized_base,
        "modes": build_concept_modes(normalized_base),
    }


def build_learning_path_from_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    topic_id = normalize_text(payload.get("topic_id") or payload.get("topicId"))
    topic_name = normalize_text(payload.get("topic_name") or payload.get("topicName") or topic_id)
    description = normalize_text(payload.get("description"))
    concepts = payload.get("concepts", [])

    normalized_concepts = [normalize_concept(concept, order=index + 1) for index, concept in enumerate(concepts)]

    return {
        "topic_id": topic_id,
        "topic_name": topic_name,
        "description": description,
        "concepts": normalized_concepts,
        "rules": {
            "difficulty_order": list(DIFFICULTY_ORDER),
            "streak_requirements": DIFFICULTY_STREAKS,
            "unlock": "sequential",
        },
        "created_at": datetime.utcnow().isoformat() + "Z",
    }


def map_progress_by_concept(entries: List[Dict[str, Any]], topic_id: str, user_id: Optional[str]) -> Dict[str, Dict[str, Any]]:
    progress_map: Dict[str, Dict[str, Any]] = {}
    for entry in entries:
        if normalize_text(entry.get("topic_id")) != topic_id:
            continue
        if user_id and normalize_text(entry.get("user_id")) != user_id:
            continue
        concept_id = normalize_text(entry.get("concept_id"))
        if concept_id:
            progress_map[concept_id] = entry
    return progress_map


def attach_states_to_path(path: Dict[str, Any], progress_entries: List[Dict[str, Any]], user_id: Optional[str]) -> Dict[str, Any]:
    decorated = deepcopy(path)
    progress_map = map_progress_by_concept(progress_entries, decorated.get("topic_id", ""), user_id)

    previous_mastered = True
    ordered_concepts = sorted(decorated.get("concepts", []), key=lambda c: c.get("order", 0))

    for concept in ordered_concepts:
        concept_id = concept.get("concept_id")
        progress = progress_map.get(concept_id)
        unlocked = previous_mastered
        state = "locked"

        if unlocked:
            if progress and progress.get("professor_passed"):
                state = "mastered"
                previous_mastered = True
            elif progress and progress.get("expert_passed"):
                state = "completed"
                previous_mastered = False
            else:
                state = "active"
                previous_mastered = False
        else:
            previous_mastered = False

        concept["state"] = state
        concept["active_difficulty"] = progress.get("current_difficulty", "medium") if progress else "medium"
        concept["attempts"] = progress.get("attempts", 0) if progress else 0
        concept["progress"] = progress or None

    decorated["concepts"] = ordered_concepts
    return decorated


def pick_next_question_variant(concept: Dict[str, Any], difficulty: str, attempt_seed: int) -> Dict[str, Any]:
    base_questions = concept.get("base_questions") or []
    if not base_questions:
        return {}

    index = attempt_seed % len(base_questions)
    base_question = base_questions[index]
    return build_mode_question(base_question, difficulty, attempt_seed=attempt_seed)


def build_failure_rationale(base_question: Dict[str, Any], difficulty: str) -> Dict[str, str]:
    correct_answer = normalize_text(base_question.get("correct_answer"))
    question_text = normalize_text(base_question.get("question_text"))
    return {
        "message": "Review the distinction and retry with adjusted wording.",
        "correct_answer": correct_answer,
        "reference_question": mutate_question_text(question_text, difficulty, attempt_seed=1),
    }




def extract_keywords(text: str, limit: int = 6) -> List[str]:
    cleaned = normalize_text(text)
    if not cleaned:
        return []

    tokens = re.findall(r"[A-Za-z][A-Za-z'\-]+", cleaned.lower())
    counter = Counter(
        token for token in tokens if len(token) > 4 and token not in KEYWORD_STOPWORDS
    )

    keywords: List[str] = []
    for token, _ in counter.most_common():
        if any(token in existing or existing in token for existing in keywords):
            continue
        keywords.append(token)
        if len(keywords) >= limit:
            break

    return keywords


def google_books_search(query: str, max_results: int = GOOGLE_BOOKS_DEFAULT_LIMIT) -> List[Dict[str, Any]]:
    params = {"q": query, "maxResults": max_results}
    response = requests.get(GOOGLE_BOOKS_SEARCH_URL, params=params, timeout=HTTP_TIMEOUT_SECONDS)
    response.raise_for_status()
    payload = response.json()
    items = payload.get("items", []) if isinstance(payload, dict) else []

    results: List[Dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        volume_id = item.get("id")
        volume_info = item.get("volumeInfo") or {}

        if not volume_id or not isinstance(volume_info, dict):
            continue

        title = normalize_text(volume_info.get("title"))
        if not title:
            continue

        results.append(
            {
                "id": volume_id,
                "title": title,
                "authors": [normalize_text(author) for author in volume_info.get("authors", []) if normalize_text(author)],
                "publishedDate": normalize_text(volume_info.get("publishedDate")),
                "description": normalize_text(volume_info.get("description")),
                "pageCount": volume_info.get("pageCount"),
                "categories": [
                    normalize_text(category)
                    for category in volume_info.get("categories", [])
                    if normalize_text(category)
                ],
                "thumbnail": (volume_info.get("imageLinks") or {}).get("thumbnail"),
                "infoLink": volume_info.get("infoLink"),
            }
        )

    return results


def fetch_volume_details(volume_id: str) -> Dict[str, Any]:
    response = requests.get(
        f"{GOOGLE_BOOKS_SEARCH_URL}/{volume_id}",
        params={"projection": "full"},
        timeout=HTTP_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        return {}
    return data


def build_chapter_outline(volume_info: Dict[str, Any], limit: int = 7) -> List[Dict[str, Any]]:
    description = normalize_text(volume_info.get("description"))
    book_title = normalize_text(volume_info.get("title")) or "the textbook"

    if description:
        sentences = sentence_split(description)
        keywords = extract_keywords(description, limit=limit)
        chapters: List[Dict[str, Any]] = []
        used_sentences: set[str] = set()

        for index, keyword in enumerate(keywords, start=1):
            summary = next(
                (
                    sentence
                    for sentence in sentences
                    if keyword.lower() in sentence.lower() and sentence not in used_sentences
                ),
                None,
            )

            if summary is None and sentences:
                summary = sentences[(index - 1) % len(sentences)]

            if summary:
                used_sentences.add(summary)
            else:
                summary = f"{keyword_to_title(keyword)} is introduced as part of {book_title}."

            chapters.append(
                {
                    "index": index,
                    "title": keyword_to_title(keyword),
                    "summary": summary,
                }
            )

        if chapters:
            return chapters[:limit]

        if sentences:
            return [
                {"index": idx + 1, "title": f"Key Concept {idx + 1}", "summary": sentence}
                for idx, sentence in enumerate(sentences[:limit])
            ]

    categories = [keyword_to_title(category.split("/")[-1]) for category in volume_info.get("categories", [])]

    if not categories:
        categories = ["Orientation", "Core Principles", "Case Studies", "Practice Review"]

    chapters: List[Dict[str, Any]] = []
    for index, topic in enumerate(categories[:limit], start=1):
        summary = f"{topic} explores how {topic.lower()} supports the themes in {book_title}."
        chapters.append({"index": index, "title": topic, "summary": summary})

    return chapters


def generate_flashcards(
    book_title: str,
    chapter_title: str,
    chapter_summary: str,
    max_cards: int = 6,
) -> List[Dict[str, str]]:
    resolved_book = normalize_text(book_title) or "the textbook"
    resolved_chapter = normalize_text(chapter_title) or "This chapter"
    resolved_summary = normalize_text(chapter_summary)

    if not resolved_summary:
        resolved_summary = f"{resolved_chapter} is a foundational idea discussed throughout {resolved_book}."

    sentences = sentence_split(resolved_summary)
    if not sentences:
        sentences = [resolved_summary]

    detail_sentences = sentences[1:]

    flashcards: List[Dict[str, str]] = [
        {
            "question": f"What is the main idea of {resolved_chapter}?",
            "answer": sentences[0],
        }
    ]

    remaining_details = detail_sentences
    if detail_sentences:
        flashcards.append(
            {
                "question": f"How does {resolved_chapter} connect to {resolved_book}?",
                "answer": detail_sentences[0],
            }
        )
        remaining_details = detail_sentences[1:]

    for idx, sentence in enumerate(remaining_details[:2], start=1):
        flashcards.append(
            {
                "question": f"What supporting point {idx} reinforces {resolved_chapter}?",
                "answer": sentence,
            }
        )

    keywords = extract_keywords(chapter_summary or chapter_title, limit=3)
    if keywords:
        flashcards.append(
            {
                "question": f"Which key terms should you remember from {resolved_chapter}?",
                "answer": ", ".join(keyword_to_title(keyword) for keyword in keywords),
            }
        )

    application_answer = (
        f"Connect {keyword_to_title(keywords[0])} to real scenarios covered in {resolved_book}."
        if keywords
        else f"Relate {resolved_chapter} to earlier material in {resolved_book} and practice explaining it aloud."
    )
    flashcards.append(
        {
            "question": f"How could you apply the ideas from {resolved_chapter}?",
            "answer": application_answer,
        }
    )

    filtered_cards: List[Dict[str, str]] = []
    seen_questions: set[str] = set()
    for card in flashcards:
        question = normalize_text(card.get("question"))
        answer = normalize_text(card.get("answer"))
        if not question or not answer:
            continue
        normalized_question = question.lower()
        if normalized_question in seen_questions:
            continue
        seen_questions.add(normalized_question)
        filtered_cards.append({"question": question, "answer": answer})
        if len(filtered_cards) >= max_cards:
            break

    if not filtered_cards:
        filtered_cards.append(
            {
                "question": f"What should you know about {resolved_chapter}?",
                "answer": resolved_summary,
            }
        )

    return filtered_cards


def extract_text_from_file(file: Any) -> str:
    filename = normalize_text(getattr(file, "filename", "")) or "document"
    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):
        file.stream.seek(0)
        reader = PdfReader(file.stream)
        text_parts: List[str] = []
        for page in reader.pages:
            extracted = page.extract_text() or ""
            if extracted:
                text_parts.append(extracted)
        return "\n".join(text_parts)

    if lower_name.endswith(".docx"):
        file.stream.seek(0)
        buffer = BytesIO(file.read())
        document = Document(buffer)
        return "\n".join(paragraph.text for paragraph in document.paragraphs)

    file.stream.seek(0)
    return file.read().decode("utf-8", errors="ignore")


def build_flashcard_prompt(text: str, source: str) -> str:
    return f"""
You are a flashcard generator.

Input: Raw text from a PDF or document.

Output Format (JSON array):
[
  {{
    "question": "Question text here",
    "answer": "Answer text here",
    "tags": ["tag1","tag2"],
    "source": "{source}"
  }}
]

Instructions:
1) Read the text carefully.
2) Identify key concepts, terms, definitions, and ideas.
3) Generate flashcards where each card is a meaningful Q/A pair.
4) Avoid overly long answers; keep cards concise.
5) Include relevant tags based on document sections or keywords.
6) Do not hallucinate — use only the provided text.

Here’s the text:
{text}
"""


def parse_flashcard_response(raw_response: str, source: str) -> List[Dict[str, Any]]:
    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*", "", cleaned, count=1).strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        return []

    if not isinstance(data, list):
        return []

    parsed: List[Dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        question = normalize_text(item.get("question"))
        answer = normalize_text(item.get("answer"))
        tags = item.get("tags") or []

        if not question or not answer:
            continue

        parsed.append(
            {
                "question": question,
                "answer": answer,
                "tags": [normalize_text(tag) for tag in tags if normalize_text(tag)],
                "source": item.get("source") or source,
            }
        )

    return parsed


def call_openai_flashcards(chunks: Sequence[str], source: str) -> List[Dict[str, Any]]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=api_key)
    flashcards: List[Dict[str, Any]] = []

    for chunk in chunks:
        prompt = build_flashcard_prompt(chunk, source)
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1200,
        )

        content = response.choices[0].message.content if response.choices else ""
        parsed_cards = parse_flashcard_response(content or "[]", source)
        flashcards.extend(parsed_cards[:MAX_FLASHCARDS_PER_CHUNK])

    return flashcards


@app.route("/")
def serve_index() -> Any:
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/decks/default", methods=["GET"])
def get_default_deck() -> Any:
    deck = load_json(DEFAULT_DECK_FILE, default={"name": "default", "flashcards": []})
    return jsonify(deck)


@app.route("/api/learning-paths", methods=["GET"])
def list_learning_paths() -> Any:
    paths = load_learning_paths()
    return jsonify({"learning_paths": list(paths.values())})


@app.route("/api/learning-paths", methods=["POST"])
def create_learning_path() -> Any:
    payload = request.get_json(force=True, silent=True) or {}
    validation_error = validate_learning_path_payload(payload)

    if validation_error:
        return jsonify({"error": "InvalidLearningPath", "message": validation_error}), 400

    learning_path = build_learning_path_from_payload(payload)
    stored_paths = load_learning_paths()
    stored_paths[learning_path["topic_id"]] = learning_path
    save_learning_paths(stored_paths)

    return jsonify({"learning_path": learning_path})


@app.route("/api/learning-paths/<topic_id>", methods=["GET"])
def get_learning_path(topic_id: str) -> Any:
    resolved_topic = normalize_text(topic_id)
    if not resolved_topic:
        return jsonify({"error": "InvalidTopic", "message": "A valid topic_id is required."}), 400

    user_id = normalize_text(request.args.get("user_id") or request.args.get("userId"))
    stored_paths = load_learning_paths()
    learning_path = stored_paths.get(resolved_topic)

    if not learning_path:
        return jsonify({"error": "NotFound", "message": "No learning path found for this topic."}), 404

    if user_id:
        progress_entries = load_learner_progress()
        learning_path = attach_states_to_path(learning_path, progress_entries, user_id)

    return jsonify({"learning_path": learning_path})


@app.route("/api/textbooks/search", methods=["GET"])
def search_textbooks() -> Any:
    query = normalize_text(request.args.get("q") or request.args.get("query"))

    if not query:
        return (
            jsonify({"error": "MissingQuery", "message": "Provide a textbook title or topic to search."}),
            400,
        )

    try:
        results = google_books_search(query)
    except requests.RequestException as exc:  # pragma: no cover - network failure handling
        app.logger.warning("Google Books search failed", exc_info=exc)
        return (
            jsonify({"error": "SearchFailed", "message": "Unable to reach the Google Books service."}),
            502,
        )

    return jsonify({"results": results})


@app.route("/api/textbooks/<volume_id>/chapters", methods=["GET"])
def get_textbook_chapters(volume_id: str) -> Any:
    resolved_id = normalize_text(volume_id)
    if not resolved_id:
        return (
            jsonify({"error": "InvalidVolume", "message": "A valid volume identifier is required."}),
            400,
        )

    try:
        volume_payload = fetch_volume_details(resolved_id)
    except requests.HTTPError as exc:  # pragma: no cover - dependent on external API
        status_code = exc.response.status_code if exc.response is not None else 502
        app.logger.warning("Google Books volume lookup failed", exc_info=exc)
        return (
            jsonify({"error": "VolumeLookupFailed", "message": "Unable to retrieve textbook details."}),
            status_code if 400 <= status_code < 600 else 502,
        )
    except requests.RequestException as exc:  # pragma: no cover - dependent on external API
        app.logger.warning("Google Books volume lookup failed", exc_info=exc)
        return (
            jsonify({"error": "VolumeLookupFailed", "message": "Unable to retrieve textbook details."}),
            502,
        )

    volume_info = volume_payload.get("volumeInfo") if isinstance(volume_payload, dict) else {}
    if not isinstance(volume_info, dict):
        volume_info = {}

    chapters = build_chapter_outline(volume_info)

    book_info = {
        "id": volume_payload.get("id") if isinstance(volume_payload, dict) else resolved_id,
        "title": normalize_text(volume_info.get("title")) or resolved_id,
        "authors": [
            normalize_text(author)
            for author in volume_info.get("authors", [])
            if normalize_text(author)
        ],
        "description": normalize_text(volume_info.get("description")),
        "infoLink": volume_info.get("infoLink"),
        "pageCount": volume_info.get("pageCount"),
        "publishedDate": normalize_text(volume_info.get("publishedDate")),
    }

    return jsonify({"book": book_info, "chapters": chapters})


@app.route("/api/textbooks/flashcards", methods=["POST"])
def create_textbook_flashcards() -> Any:
    payload = request.get_json(force=True, silent=True) or {}

    book_title = normalize_text(
        payload.get("bookTitle")
        or (payload.get("book") or {}).get("title")
    )
    chapter_title = normalize_text(
        payload.get("chapterTitle")
        or (payload.get("chapter") or {}).get("title")
    )
    chapter_summary = normalize_text(
        payload.get("chapterSummary")
        or (payload.get("chapter") or {}).get("summary")
    )
    chapter_index = payload.get("chapterIndex") or (payload.get("chapter") or {}).get("index")

    if not book_title or not chapter_title:
        return (
            jsonify(
                {
                    "error": "MissingDetails",
                    "message": "Both the book title and chapter title are required to generate flashcards.",
                }
            ),
            400,
        )

    flashcards = generate_flashcards(book_title, chapter_title, chapter_summary)

    return jsonify(
        {
            "flashcards": flashcards,
            "metadata": {
                "bookTitle": book_title,
                "chapterTitle": chapter_title,
                "chapterIndex": chapter_index,
            },
        }
    )


@app.route("/api/learning-paths/progress", methods=["GET"])
def get_learning_progress() -> Any:
    user_id = normalize_text(request.args.get("user_id") or request.args.get("userId"))
    topic_id = normalize_text(request.args.get("topic_id") or request.args.get("topicId"))

    entries = load_learner_progress()
    filtered: List[Dict[str, Any]] = []

    for entry in entries:
        if user_id and normalize_text(entry.get("user_id")) != user_id:
            continue
        if topic_id and normalize_text(entry.get("topic_id")) != topic_id:
            continue
        filtered.append(entry)

    return jsonify({"progress": filtered})


@app.route("/api/learning-paths/progress", methods=["POST"])
def update_learning_progress() -> Any:
    payload = request.get_json(force=True, silent=True) or {}
    user_id = normalize_text(payload.get("user_id") or payload.get("userId"))
    topic_id = normalize_text(payload.get("topic_id") or payload.get("topicId"))
    concept_id = normalize_text(payload.get("concept_id") or payload.get("conceptId"))
    is_correct_value = payload.get("is_correct", payload.get("isCorrect"))
    is_correct = parse_bool(is_correct_value)

    if not user_id or not topic_id or not concept_id:
        return jsonify({"error": "MissingFields", "message": "user_id, topic_id, and concept_id are required."}), 400
    if is_correct is None:
        return jsonify({"error": "MissingOutcome", "message": "is_correct must be provided as true or false."}), 400

    stored_paths = load_learning_paths()
    learning_path = stored_paths.get(topic_id)
    if not learning_path:
        return jsonify({"error": "NotFound", "message": "No learning path found for this topic."}), 404

    ordered_concepts = sorted(learning_path.get("concepts", []), key=lambda c: c.get("order", 0))
    concept_lookup = {concept.get("concept_id"): concept for concept in ordered_concepts}
    concept = concept_lookup.get(concept_id)

    if not concept:
        return jsonify({"error": "NotFound", "message": "Concept not found in learning path."}), 404

    progress_entries = load_learner_progress()
    progress_map = map_progress_by_concept(progress_entries, topic_id, user_id)

    current_index = next((idx for idx, item in enumerate(ordered_concepts) if item.get("concept_id") == concept_id), None)
    if current_index is None:
        return jsonify({"error": "NotFound", "message": "Concept not found."}), 404

    if current_index > 0:
        previous_concept = ordered_concepts[current_index - 1]
        previous_progress = progress_map.get(previous_concept.get("concept_id"))
        if not (previous_progress and previous_progress.get("professor_passed")):
            return jsonify({"error": "Locked", "message": "Previous concept must be mastered before unlocking this one."}), 409

    progress_entry = progress_map.get(concept_id)
    if not progress_entry:
        progress_entry = initialize_progress_entry(user_id, topic_id, concept_id)

    progress_entry = apply_attempt_to_progress(progress_entry, is_correct)

    updated_entries: List[Dict[str, Any]] = []
    for entry in progress_entries:
        if (
            normalize_text(entry.get("user_id")) == user_id
            and normalize_text(entry.get("topic_id")) == topic_id
            and normalize_text(entry.get("concept_id")) == concept_id
        ):
            continue
        updated_entries.append(entry)
    updated_entries.append(progress_entry)

    save_learner_progress(updated_entries)

    decorated_path = attach_states_to_path(learning_path, updated_entries, user_id)
    concept_state = next(
        (concept for concept in decorated_path.get("concepts", []) if concept.get("concept_id") == concept_id),
        None,
    )
    next_question = pick_next_question_variant(
        concept,
        progress_entry.get("current_difficulty", "medium"),
        progress_entry.get("attempts", 0),
    )
    failure_rationale = None
    if not is_correct and concept.get("base_questions"):
        seed_index = progress_entry.get("attempts", 1)
        base_questions = concept.get("base_questions") or []
        base_question = base_questions[seed_index % len(base_questions)]
        failure_rationale = build_failure_rationale(base_question, progress_entry.get("current_difficulty", "medium"))

    return jsonify(
        {
            "progress": progress_entry,
            "concept_state": concept_state,
            "next_question": next_question,
            "rationale": failure_rationale,
        }
    )


@app.route("/api/progress", methods=["GET"])
def get_progress() -> Any:
    progress_entries: List[Dict[str, Any]] = load_json(PROGRESS_FILE, default=[])
    return jsonify({"entries": progress_entries[-100:]})


@app.route("/api/progress", methods=["POST"])
def record_progress() -> Any:
    payload = request.get_json(force=True, silent=True) or {}
    progress_entries: List[Dict[str, Any]] = load_json(PROGRESS_FILE, default=[])

    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "event": payload.get("event", "unknown"),
        "totals": payload.get("totals", {}),
        "bucketSnapshot": payload.get("bucketSnapshot", {}),
    }
    progress_entries.append(entry)
    write_json(PROGRESS_FILE, progress_entries[-500:])

    return jsonify({"status": "ok"})


@app.route("/api/documents/flashcards", methods=["POST"])
def upload_document() -> Any:
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "MissingFile", "message": "No file provided."}), 400

    try:
        raw_text = normalize_text(extract_text_from_file(file))
    except Exception as exc:
        app.logger.exception("Failed to extract text from upload")
        return jsonify({"error": "ExtractionFailed", "message": "Unable to read the uploaded file."}), 400

    if not raw_text:
        return jsonify({"error": "EmptyDocument", "message": "No readable text found in the file."}), 400

    chunks = split_text(raw_text)
    try:
        flashcards = call_openai_flashcards(chunks, file.filename or "document")
    except Exception as exc:  # pragma: no cover - depends on network/API
        app.logger.exception("Flashcard generation failed")
        return (
            jsonify({"error": "GenerationFailed", "message": "Flashcard generation is unavailable right now."}),
            502,
        )

    return jsonify(
        {
            "flashcards": flashcards,
            "metadata": {"source": file.filename, "chunkCount": len(chunks)},
        }
    )


@app.route("/<path:path>")
def serve_static(path: str) -> Any:
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DEFAULT_DECK_FILE.exists():
        raise FileNotFoundError(
            "Default deck is missing. Populate backend/data/default_deck.json before starting the server."
        )
    if not PROGRESS_FILE.exists():
        write_json(PROGRESS_FILE, [])
    if not LEARNING_PATH_FILE.exists():
        write_json(LEARNING_PATH_FILE, {})
    if not LEARNER_PROGRESS_FILE.exists():
        write_json(LEARNER_PROGRESS_FILE, [])

    app.run(host="0.0.0.0", port=5000)
