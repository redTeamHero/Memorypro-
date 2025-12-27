import json
import os
import re
from collections import Counter
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

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
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_CHARS_PER_CHUNK = 5500
MAX_FLASHCARDS_PER_CHUNK = 20

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


def normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


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

    app.run(host="0.0.0.0", port=5000)
