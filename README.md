# Memorypro

## Overview
Memorypro is a flashcard study app that blends a spaced-repetition engine with AI-assisted content generation. It is designed for learners, coaches, and study teams who want to build, organize, and review decks quickly from topics, textbooks, or uploaded documents. The project ships a Flask backend that powers AI endpoints and a static front-end experience that runs entirely in the browser. A lightweight desktop wrapper (via `run.py`) launches the same web UI in a native window for offline-style use. The UI focuses on deck organization, importing/exporting content, and reinforcing progress through a Leitner-style flow. AI helpers connect to OpenAI and Google Books to turn topics and textbook outlines into study-ready cards. Overall, Memorypro targets fast iteration on flashcards and supports both manual editing and AI-driven generation.

Key capabilities:
- Create, edit, and organize multiple flashcard sets.
- Import flashcards from CSV/JSON text input.
- Generate cards from textbook search results and chapter summaries.
- Generate cards from topics or uploaded documents using OpenAI.
- Track study progress and persist data locally.

## Repository Status
- **Fork status:** Fork
- **Explanation:** The repository includes the OuiCards engine (`ouicards.js`) and front-end conventions, indicating it is derived from the original OuiCards project.
- **Upstream:** [OuiCards](http://carlsednaoui.github.io/ouicards/)
- **Fork changes (inferred):** Adds a Flask API for AI-assisted flashcard generation, a refreshed UI in `backend/static`, and a desktop wrapper via `run.py`.

## Features
- Multi-set flashcard management with local persistence.
- CSV/JSON paste import for bulk deck creation.
- Topic-based flashcard generation with configurable difficulty and card count.
- Google Books search + chapter outline workflow for textbook-based cards.
- Document upload (PDF/DOCX/TXT) to generate flashcards from source text.
- Progress tracking endpoint that stores session snapshots.
- Desktop app launcher using a Flask server plus `pywebview`.

## Tech Stack
- **Languages:** Python, JavaScript, HTML, CSS.
- **Backend:** Flask, Flask-CORS, OpenAI SDK, Requests, PyPDF, python-docx, python-dotenv.
- **Frontend:** Vanilla JS + OuiCards logic, static HTML/CSS.
- **Desktop wrapper:** `pywebview` + Tkinter (used in `run.py`).
- **Tooling:** `pip`, optional PyInstaller for packaging.

## Project Structure
```
.
├── backend/
│   ├── app.py                 # Flask API + AI endpoints + static file serving
│   ├── requirements.txt       # Backend Python dependencies
│   ├── updater.py             # Version check + updater utility
│   ├── data/                  # Default deck + progress store
│   └── static/                # Web UI (index.html, JS, CSS, fonts)
├── docs/
│   └── textbook-assistant/     # Guide for Google Books workflow
├── live-examples/
│   └── ouicards-jquery-example.html
└── run.py                      # Desktop launcher with pywebview
```

## Getting Started

### Prerequisites
- **OS:** Any OS that can run Python and a web browser.
- **Python:** 3.9+ recommended.
- **Package manager:** `pip`.
- **External services:** OpenAI API access for AI features.

### Installation
1. Install backend dependencies:
   ```bash
   python3 -m pip install -r backend/requirements.txt
   ```
2. (Optional) Install the desktop wrapper dependency if you plan to run `run.py`:
   ```bash
   python3 -m pip install pywebview
   ```

### Configuration
Memorypro reads environment variables via `python-dotenv` (from a `.env` file) or your shell.

Create a `.env` file in the repo root if you want local environment management:
```
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

- `OPENAI_API_KEY` is **required**; the backend raises an error on startup if it is missing.
- `OPENAI_MODEL` is optional and defaults to `gpt-4o-mini`.

## Usage

### Run Locally
**Backend + Web UI (recommended):**
```bash
export OPENAI_API_KEY=your_api_key_here
python3 backend/app.py
```
Open `http://127.0.0.1:5000/index.html` in your browser. The UI will load from `backend/static` and call the API at the same origin.

**Desktop app wrapper (optional):**
```bash
export OPENAI_API_KEY=your_api_key_here
python3 run.py
```
This starts the Flask server and opens a native window pointing at the local UI.

**Static jQuery example (optional):**
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000/live-examples/ouicards-jquery-example.html`.

### Build / Packaging
No build scripts or packaging configs are included. If you want a desktop installer, you can package `run.py` using PyInstaller or a similar tool based on your environment.

### Tests
No automated tests or linting scripts are included in the repository.

## Development Guide

### How to Edit / Customize
- **Backend API:** Edit `backend/app.py` to change endpoints, AI prompts, and persistence logic.
- **Front-end UI:** Update `backend/static/index.html`, `backend/static/example.js`, and `backend/static/example.css`.
- **Data defaults:** Modify `backend/data/default_deck.json` for seed decks.
- **Desktop wrapper:** Adjust `run.py` for window sizing or update flow.

### Troubleshooting
1. **`OPENAI_API_KEY is not set` error:** Export the variable or add it to `.env` before starting `backend/app.py`.
2. **Port 5000 already in use:** Stop the other process or change the port in `backend/app.py` and `run.py`.
3. **Google Books requests failing:** Confirm internet access; the API can return 502 errors when unavailable.
4. **Document upload fails:** Ensure the file is a supported format (.pdf, .docx, .txt) and not empty.
5. **Deck doesn’t load:** Verify `backend/data/default_deck.json` exists; the backend refuses to start without it.
6. **Desktop window doesn’t open:** Install `pywebview` and ensure Tkinter is available in your Python distribution.

## Roadmap
Suggested improvements (not yet implemented):
1. Add a test suite for API endpoints and front-end workflows.
2. Provide a Dockerfile for consistent local setup.
3. Add a dedicated build script for PyInstaller packaging.
4. Add authentication for multi-user deployments.
5. Add structured logging and error monitoring.
6. Add an export feature for generated decks (CSV/Anki).
7. Add a basic role-based admin panel for managing decks.
8. Improve offline support and caching for the UI.

## Contributing
- Open issues for bugs or feature requests.
- Fork the repo and submit a PR with a clear description of changes.
- No formal linting or formatting rules are enforced; follow the existing style.
- If you introduce new dependencies, document them in the README and `backend/requirements.txt`.

## License
No license file detected.

## Acknowledgements / Credits
### Upstream / Credits
- OuiCards, the original spaced-repetition engine and inspiration for the UI.

### Additional Credits
- OpenAI, Google Books, Flask, and PyWebView for powering AI, search, and desktop features.

## Donate / Support
If you find Memorypro useful, donations help cover maintenance, infrastructure, and future feature development.

- GitHub Sponsors: <link>
- Buy Me a Coffee: <link>
- PayPal: <link>
- Crypto (optional): <address>

Thank you for supporting the project!
