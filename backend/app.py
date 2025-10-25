import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = (BASE_DIR.parent / "live-examples").resolve()
DATA_DIR = BASE_DIR / "data"
DEFAULT_DECK_FILE = DATA_DIR / "default_deck.json"
PROGRESS_FILE = DATA_DIR / "progress.json"

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


@app.route("/")
def serve_index() -> Any:
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/decks/default", methods=["GET"])
def get_default_deck() -> Any:
    deck = load_json(DEFAULT_DECK_FILE, default={"name": "default", "flashcards": []})
    return jsonify(deck)


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
