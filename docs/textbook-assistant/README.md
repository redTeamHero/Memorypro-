# Textbook Assistant Guide

This guide explains how to use the multi-source textbook workflow that was added to Memorypro. The flow lets you search Google Books and Open Library, upload your own PDFs or text files, pick a chapter outline, and auto-generate flashcards that can be imported straight into your active deck.【F:backend/app.py†L332-L371】【F:backend/app.py†L508-L552】

## Feature Overview

The assistant consists of four core capabilities:

1. **Textbook search.** A `/api/textbooks/search` endpoint fans out to Google Books and Open Library so learners see results from both catalogs in one list, and it reports warnings if a source is temporarily unavailable.【F:backend/app.py†L332-L371】
2. **Chapter outline synthesis.** Once you choose a volume, `/api/textbooks/<volume_id>/chapters` inspects Google Books descriptions, Open Library tables of contents, or uploaded text to build a concise chapter list.【F:backend/app.py†L180-L330】【F:backend/app.py†L373-L462】
3. **Flashcard generation.** A POST to `/api/textbooks/flashcards` turns the selected chapter summary into up to six study-ready question/answer pairs that can be previewed and imported on the client.【F:backend/app.py†L464-L506】
4. **Upload analysis.** Learners can upload their own PDF, TXT, or Markdown files via `/api/textbooks/upload`; the backend extracts headings to synthesize a chapter outline when public catalogs are insufficient.【F:backend/app.py†L208-L330】【F:backend/app.py†L508-L552】

On the client (`live-examples/index.html` + `example.js`), the "Generate flashcards from a textbook" panel orchestrates the complete flow: search or upload, chapter selection, preview, and import into the chosen study set.【F:live-examples/index.html†L53-L116】【F:live-examples/example.js†L1-L140】

## Prerequisites

- Python 3.9 or newer
- `pip` for installing the backend dependencies (`requests`, `pypdf`)
- An internet connection so the server can reach Google Books and Open Library

> **Note:** Google Books requests do not require an API key for low-volume usage. If you plan to exceed the default quota, register a key and pass it via the standard `key` query parameter (edit `google_books_search` accordingly).【F:backend/app.py†L306-L350】

## Backend Setup

1. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Ensure `backend/data/default_deck.json` exists—the server refuses to start without a seed deck so the UI always has content.【F:backend/app.py†L486-L494】
3. Start the Flask server:
   ```bash
   python backend/app.py
   ```
   The app listens on `http://127.0.0.1:5000/` and automatically initializes `backend/data/progress.json` the first time it runs.【F:backend/app.py†L486-L503】

All textbook endpoints live under `/api/textbooks/*` and are CORS-enabled so the static front-end can call them from `localhost` or any origin.【F:backend/app.py†L12-L92】

## Front-End Workflow

1. Serve the static assets (for example with Python's HTTP server):
   ```bash
   python3 -m http.server 8000
   ```
2. Open `http://localhost:8000/live-examples/index.html` in your browser. The new "AI textbook assistant" card sits near the top of the dashboard.【F:live-examples/index.html†L79-L112】
3. Enter a textbook title or topic and optionally attach a PDF/TXT before clicking **Search textbooks**. Results from Google Books, Open Library, and any analyzed upload appear together with source badges and catalog warnings when a provider is offline.【F:live-examples/index.html†L79-L112】【F:live-examples/example.js†L729-L881】【F:live-examples/example.js†L1262-L1344】
4. Click **Choose book** on a catalog entry or the uploaded file to fetch synthesized chapter headings. Selecting one triggers flashcard generation and renders a preview list with an **Import to active set** action.【F:live-examples/example.js†L1020-L1199】
5. Press **Import to active set** to merge the generated cards into whichever deck is currently active in the set manager controls.【F:live-examples/example.js†L1236-L1306】

## API Reference

### `GET /api/textbooks/search`
- **Query parameters:** `q` (required) – the textbook title, author, or topic.
- **Response:** `{ "results": [ { "source", "id", "title", ... } ], "warnings": ["GoogleBooksUnavailable", ...] }`
- **Error cases:** `400` when no query is supplied; `502` when both catalogs are unreachable.【F:backend/app.py†L332-L371】

### `GET /api/textbooks/<volume_id>/chapters`
- **Path parameter:** `volume_id` – the catalog identifier chosen from the search results.
- **Query parameter:** `source` – set to `open_library` when requesting chapters from that catalog.
- **Response:** `{ "book": {...}, "chapters": [ { "index", "title", "summary" }, ... ] }`
- **Error cases:** `400` for a blank or malformed identifier; `4xx/5xx` proxying the upstream catalog.【F:backend/app.py†L373-L462】

### `POST /api/textbooks/flashcards`
- **Body:** JSON with `bookTitle`, `chapterTitle`, and optionally `chapterSummary` / `chapterIndex`.
- **Response:** `{ "flashcards": [ { "question", "answer" }, ... ], "metadata": {...} }`
- **Error cases:** `400` if either the book or chapter title is missing.【F:backend/app.py†L464-L506】

### `POST /api/textbooks/upload`
- **Body:** `multipart/form-data` with a `file` field (PDF/TXT/MD) and optional `title` override.
- **Response:** `{ "source": "upload", "book": {...}, "chapters": [...] }`
- **Error cases:** `400` if the file is missing, unreadable, or empty.【F:backend/app.py†L508-L552】

Each flashcard set balances overview, linkage to the larger book, supporting details, terminology, and application prompts. The heuristics combine sentence splitting with keyword extraction to stay on topic even with short summaries.【F:backend/app.py†L180-L330】

## Data Persistence

- Deck changes and generated cards are merged into the in-memory OuiCards store on the client and saved to `localStorage` just like manually edited cards.【F:live-examples/example.js†L1224-L1259】
- Study-session progress events are posted back to `/api/progress`, which snapshots recent interactions in `backend/data/progress.json` for analytics or debugging.【F:backend/app.py†L800-L821】

## Troubleshooting

- **Empty results:** Try broadening the search term; each catalog returns only its top matches, and warnings indicate when a provider was unreachable.【F:backend/app.py†L332-L371】【F:live-examples/example.js†L807-L902】
- **No chapters generated:** Some catalog entries lack descriptions. The server falls back to subject categories or uploaded headings; you can still provide your own summary before generating flashcards.【F:backend/app.py†L180-L330】
- **Import button disabled:** Ensure a study set is selected in the "Organize your study sets" control. Generated cards append to the active set only when one is active.【F:live-examples/index.html†L24-L63】【F:live-examples/example.js†L1160-L1306】

Happy studying!
