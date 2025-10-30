# Textbook Assistant Guide

This guide explains how to use the Google Books–powered textbook workflow that was added to Memorypro. The flow lets you search for a book, pick a chapter outline, and auto-generate flashcards that can be imported straight into your active deck.

## Feature Overview

The assistant consists of three core capabilities:

1. **Textbook search.** A `/api/textbooks/search` endpoint proxies Google Books queries and returns lightweight metadata for the top results so learners can pick the right title quickly.【F:backend/app.py†L338-L359】
2. **Chapter outline synthesis.** Once you choose a volume, `/api/textbooks/<volume_id>/chapters` constructs a concise chapter list by inspecting Google Books descriptions and category data.【F:backend/app.py†L360-L409】
3. **Flashcard generation.** A POST to `/api/textbooks/flashcards` turns the selected chapter summary into up to six study-ready question/answer pairs that can be previewed and imported on the client.【F:backend/app.py†L408-L451】

On the client (`live-examples/index.html` + `example.js`), the "Generate flashcards from a textbook" panel orchestrates the complete flow: search, chapter selection, preview, and import into the chosen study set.【F:live-examples/index.html†L53-L111】【F:live-examples/example.js†L1-L120】

## Prerequisites

- Python 3.9 or newer
- `pip` for installing the backend dependency (`requests`)
- An internet connection so the server can reach the Google Books API

> **Note:** Google Books requests do not require an API key for low-volume usage. If you plan to exceed the default quota, register a key and pass it via the standard `key` query parameter (edit `google_books_search` accordingly).【F:backend/app.py†L200-L259】

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
2. Open `http://localhost:8000/live-examples/index.html` in your browser. The new "AI textbook assistant" card sits near the top of the dashboard.【F:live-examples/index.html†L53-L111】
3. Enter a textbook title or topic, then click **Search textbooks**. Results stream into the panel with titles, authors, and a **Preview outline** button for each.【F:live-examples/example.js†L121-L220】
4. Click **Preview outline** on a result to fetch synthesized chapter headings. Selecting one triggers flashcard generation and renders a preview list with an **Import to active set** action.【F:live-examples/example.js†L221-L400】
5. Press **Import to active set** to merge the generated cards into whichever deck is currently active in the set manager controls.【F:live-examples/example.js†L401-L520】

## API Reference

### `GET /api/textbooks/search`
- **Query parameters:** `q` (required) – the textbook title, author, or topic.
- **Response:** `{ "results": [ { "id", "title", "authors", ... } ] }`
- **Error cases:** `400` when no query is supplied; `502` when the Google Books service cannot be reached.【F:backend/app.py†L338-L359】

### `GET /api/textbooks/<volume_id>/chapters`
- **Path parameter:** `volume_id` – the Google Books volume identifier chosen from the search results.
- **Response:** `{ "book": {...}, "chapters": [ { "index", "title", "summary" }, ... ] }`
- **Error cases:** `400` for a blank or malformed identifier; `4xx/5xx` proxying Google Books failures.【F:backend/app.py†L360-L409】

### `POST /api/textbooks/flashcards`
- **Body:** JSON with `bookTitle`, `chapterTitle`, and optionally `chapterSummary` / `chapterIndex`.
- **Response:** `{ "flashcards": [ { "question", "answer" }, ... ], "metadata": {...} }`
- **Error cases:** `400` if either the book or chapter title is missing.【F:backend/app.py†L408-L451】

Each flashcard set balances overview, linkage to the larger book, supporting details, terminology, and application prompts. The heuristics combine sentence splitting with keyword extraction to stay on topic even with short summaries.【F:backend/app.py†L180-L319】

## Data Persistence

- Deck changes and generated cards are merged into the in-memory OuiCards store on the client and saved to `localStorage` just like manually edited cards.【F:live-examples/example.js†L401-L520】
- Study-session progress events are posted back to `/api/progress`, which snapshots recent interactions in `backend/data/progress.json` for analytics or debugging.【F:backend/app.py†L451-L483】

## Troubleshooting

- **Empty results:** Try broadening the search term; the server only returns the top five Google Books matches by default.【F:backend/app.py†L200-L259】
- **No chapters generated:** Some Google Books entries lack descriptions. The server falls back to using subject categories; if none exist, you may need to write a short summary manually before generating flashcards.【F:backend/app.py†L180-L239】
- **Import button disabled:** Ensure a study set is selected in the "Organize your study sets" control. Generated cards append to the active set only when one is active.【F:live-examples/index.html†L24-L63】【F:live-examples/example.js†L401-L520】

Happy studying!
