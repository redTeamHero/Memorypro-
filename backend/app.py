import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pypdf import PdfReader

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = (BASE_DIR.parent / "live-examples").resolve()
DATA_DIR = BASE_DIR / "data"
DEFAULT_DECK_FILE = DATA_DIR / "default_deck.json"
PROGRESS_FILE = DATA_DIR / "progress.json"

GOOGLE_BOOKS_SEARCH_URL = "https://www.googleapis.com/books/v1/volumes"
GOOGLE_BOOKS_DEFAULT_LIMIT = 5
OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json"
OPEN_LIBRARY_WORKS_URL = "https://openlibrary.org"
UPLOAD_MAX_CANDIDATES = 12
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


def build_chapter_outline(volume_info: Dict[str, Any], limit: int = 7) -> List[Dict[str, Any]]:
    table_of_contents = volume_info.get("table_of_contents")
    if isinstance(table_of_contents, list):
        chapters: List[Dict[str, Any]] = []

        for index, entry in enumerate(table_of_contents[:limit], start=1):
            if isinstance(entry, dict):
                title_candidate = (
                    entry.get("title")
                    or entry.get("label")
                    or entry.get("pagenum")
                    or entry.get("short_title")
                    or "Section"
                )
                summary_source = entry.get("summary") or entry.get("content")
            else:
                title_candidate = entry
                summary_source = None

            resolved_title = keyword_to_title(str(title_candidate)) or f"Section {index}"
            summary_text = normalize_text(summary_source)

            if not summary_text:
                summary_text = f"{resolved_title} expands on themes explored in {normalize_text(volume_info.get('title')) or 'the textbook'}."

            chapters.append({"index": index, "title": resolved_title, "summary": summary_text})

        if chapters:
            return chapters

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
                "source": "google_books",
                "id": volume_id,
                "title": title,
                "authors": [
                    normalize_text(author)
                    for author in volume_info.get("authors", [])
                    if normalize_text(author)
                ],
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


def open_library_search(query: str, max_results: int = GOOGLE_BOOKS_DEFAULT_LIMIT) -> List[Dict[str, Any]]:
    params = {"q": query, "limit": max_results}
    response = requests.get(OPEN_LIBRARY_SEARCH_URL, params=params, timeout=HTTP_TIMEOUT_SECONDS)
    response.raise_for_status()
    data = response.json()
    docs = data.get("docs") if isinstance(data, dict) else None

    if not isinstance(docs, list):
        return []

    results: List[Dict[str, Any]] = []
    for entry in docs:
        if not isinstance(entry, dict):
            continue

        work_key = entry.get("key")
        title = normalize_text(entry.get("title"))
        if not work_key or not title:
            continue

        authors = [normalize_text(name) for name in entry.get("author_name", []) if normalize_text(name)]
        description = normalize_text(entry.get("subtitle")) or normalize_text(entry.get("first_sentence"))
        publish_year = entry.get("first_publish_year")
        subjects = [normalize_text(subject) for subject in entry.get("subject", []) if normalize_text(subject)]

        results.append(
            {
                "source": "open_library",
                "id": work_key,
                "title": title,
                "authors": authors,
                "publishedDate": str(publish_year) if publish_year else "",
                "description": description,
                "categories": subjects,
                "infoLink": f"{OPEN_LIBRARY_WORKS_URL}{work_key}",
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


def fetch_open_library_details(work_key: str) -> Dict[str, Any]:
    normalized_key = work_key if work_key.startswith("/") else f"/{work_key}"
    response = requests.get(
        f"{OPEN_LIBRARY_WORKS_URL}{normalized_key}.json",
        timeout=HTTP_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        return {}
    return payload


def _normalize_open_library_description(payload: Dict[str, Any]) -> str:
    description = payload.get("description")
    if isinstance(description, dict):
        return normalize_text(description.get("value"))
    return normalize_text(description)


def _normalize_open_library_categories(payload: Dict[str, Any]) -> List[str]:
    subjects = payload.get("subjects")
    if not isinstance(subjects, list):
        return []
    return [normalize_text(subject) for subject in subjects if normalize_text(subject)]


def read_uploaded_text(file_storage: Any) -> Tuple[str, str]:
    filename = normalize_text(getattr(file_storage, "filename", "")) or f"upload-{uuid4().hex}"
    suffix = Path(filename).suffix.lower()

    file_storage.stream.seek(0)

    if suffix == ".pdf":
        try:
            reader = PdfReader(file_storage.stream)
        except Exception as exc:  # pragma: no cover - parser variability
            raise ValueError("Unable to read the uploaded PDF.") from exc

        text_fragments: List[str] = []
        for page in reader.pages:
            try:
                extracted = page.extract_text() or ""
            except Exception:  # pragma: no cover - parser variability
                extracted = ""
            text_fragments.append(extracted)
        content = "\n".join(fragment for fragment in text_fragments if fragment)
    else:
        raw_bytes = file_storage.stream.read()
        try:
            content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = raw_bytes.decode("latin-1", errors="ignore")

    file_storage.stream.seek(0)

    normalized_lines = content.replace("\r\n", "\n").replace("\r", "\n").strip()
    return filename, normalized_lines


def derive_outline_from_text(text: str, limit: int = 7) -> List[Dict[str, Any]]:
    if not text:
        return []

    lines = [normalize_text(line) for line in text.splitlines()]
    headings: List[Tuple[str, str]] = []

    def is_heading(value: str) -> bool:
        if not value or len(value) < 5:
            return False
        lower_value = value.lower()
        if re.match(r"^(chapter|unit|lesson|section|module|part)\s+\d+", lower_value):
            return True
        if re.match(r"^\d+(\.\d+)*\s+[A-Za-z]", value):
            return True
        if lower_value.isupper() and len(lower_value.split()) <= 8:
            return True
        return False

    def clean_heading(value: str) -> str:
        stripped = re.sub(r"^(chapter|unit|lesson|section|module|part)\s+\d+[:.\-]?\s*", "", value, flags=re.IGNORECASE)
        stripped = re.sub(r"^\d+(\.\d+)*\s+", "", stripped)
        return keyword_to_title(stripped) or keyword_to_title(value)

    for idx, line in enumerate(lines):
        if not is_heading(line):
            continue

        summary_chunks: List[str] = []
        for offset in range(1, 6):
            if idx + offset >= len(lines):
                break
            candidate = lines[idx + offset]
            if not candidate:
                continue
            if is_heading(candidate):
                break
            summary_chunks.append(candidate)
            if len(summary_chunks) >= 2:
                break

        summary = normalize_text(" ".join(summary_chunks))
        if not summary:
            summary = f"{clean_heading(line)} introduces a key idea in the uploaded material."

        headings.append((clean_heading(line), summary))
        if len(headings) >= UPLOAD_MAX_CANDIDATES:
            break

    if not headings:
        sentences = sentence_split(text)
        if not sentences:
            return []
        return [
            {"index": idx + 1, "title": f"Key Idea {idx + 1}", "summary": sentence}
            for idx, sentence in enumerate(sentences[:limit])
        ]

    chapters = [
        {"index": idx + 1, "title": title, "summary": summary}
        for idx, (title, summary) in enumerate(headings[:limit])
    ]
    return chapters


def summarize_uploaded_text(text: str) -> str:
    sentences = sentence_split(text)
    if not sentences:
        return ""
    return " ".join(sentences[:3])


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

    results: List[Dict[str, Any]] = []
    warnings: List[str] = []

    try:
        results.extend(google_books_search(query))
    except requests.RequestException as exc:  # pragma: no cover - network failure handling
        app.logger.warning("Google Books search failed", exc_info=exc)
        warnings.append("GoogleBooksUnavailable")

    try:
        results.extend(open_library_search(query))
    except requests.RequestException as exc:  # pragma: no cover - network failure handling
        app.logger.warning("Open Library search failed", exc_info=exc)
        warnings.append("OpenLibraryUnavailable")

    if not results and warnings:
        return (
            jsonify({"error": "SearchFailed", "message": "No catalog services were reachable."}),
            502,
        )

    payload: Dict[str, Any] = {"results": results}
    if warnings:
        payload["warnings"] = warnings

    return jsonify(payload)


@app.route("/api/textbooks/<volume_id>/chapters", methods=["GET"])
def get_textbook_chapters(volume_id: str) -> Any:
    resolved_id = normalize_text(volume_id)
    if not resolved_id:
        return (
            jsonify({"error": "InvalidVolume", "message": "A valid volume identifier is required."}),
            400,
        )

    source = normalize_text(request.args.get("source")) or "google_books"

    if source == "open_library":
        try:
            work_payload = fetch_open_library_details(resolved_id)
        except requests.HTTPError as exc:  # pragma: no cover - dependent on external API
            status_code = exc.response.status_code if exc.response is not None else 502
            app.logger.warning("Open Library work lookup failed", exc_info=exc)
            return (
                jsonify({"error": "VolumeLookupFailed", "message": "Unable to retrieve textbook details."}),
                status_code if 400 <= status_code < 600 else 502,
            )
        except requests.RequestException as exc:  # pragma: no cover - dependent on external API
            app.logger.warning("Open Library work lookup failed", exc_info=exc)
            return (
                jsonify({"error": "VolumeLookupFailed", "message": "Unable to retrieve textbook details."}),
                502,
            )

        volume_info: Dict[str, Any] = {
            "title": normalize_text(work_payload.get("title")) or resolved_id,
            "description": _normalize_open_library_description(work_payload),
            "categories": _normalize_open_library_categories(work_payload),
            "table_of_contents": work_payload.get("table_of_contents"),
        }

        chapters = build_chapter_outline(volume_info)

        published_date = normalize_text(work_payload.get("first_publish_date"))
        if not published_date:
            created = work_payload.get("created")
            if isinstance(created, dict):
                published_date = normalize_text(created.get("value"))

        book_info: Dict[str, Any] = {
            "id": resolved_id,
            "title": volume_info["title"],
            "description": volume_info.get("description"),
            "infoLink": f"{OPEN_LIBRARY_WORKS_URL}{resolved_id}",
            "publishedDate": published_date,
        }

        categories = volume_info.get("categories") or []
        if categories:
            book_info["categories"] = categories

        page_count = work_payload.get("number_of_pages")
        if page_count:
            book_info["pageCount"] = page_count

        return jsonify({"book": book_info, "chapters": chapters})

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
        "categories": [
            normalize_text(category)
            for category in volume_info.get("categories", [])
            if normalize_text(category)
        ],
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


@app.route("/api/textbooks/upload", methods=["POST"])
def upload_textbook_outline() -> Any:
    if "file" not in request.files:
        return (
            jsonify({"error": "MissingFile", "message": "Upload a PDF, text, or markdown file to analyze."}),
            400,
        )

    uploaded = request.files["file"]

    if not uploaded or not uploaded.filename:
        return (
            jsonify({"error": "MissingFile", "message": "Upload a PDF, text, or markdown file to analyze."}),
            400,
        )

    title_hint = normalize_text(
        request.form.get("title")
        or request.form.get("bookTitle")
        or request.args.get("title")
    )

    try:
        filename, content = read_uploaded_text(uploaded)
    except ValueError as exc:
        return (
            jsonify({"error": "UploadUnreadable", "message": str(exc) or "Unable to read the uploaded file."}),
            400,
        )

    if not content:
        return (
            jsonify({"error": "UploadEmpty", "message": "The uploaded file did not contain any text."}),
            400,
        )

    chapters = derive_outline_from_text(content)
    if not chapters:
        fallback_summary = summarize_uploaded_text(content) or "Review the uploaded material to outline chapters manually."
        chapters = [
            {
                "index": 1,
                "title": "Overview",
                "summary": fallback_summary,
            }
        ]

    description = summarize_uploaded_text(content)
    resolved_title = title_hint or keyword_to_title(Path(filename).stem)
    if not resolved_title:
        resolved_title = "Uploaded Textbook"

    book_id = f"upload-{uuid4().hex}"
    book_payload = {
        "id": book_id,
        "title": resolved_title,
        "description": description,
        "source": "upload",
        "filename": filename,
    }

    return jsonify({"source": "upload", "book": book_payload, "chapters": chapters})


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
