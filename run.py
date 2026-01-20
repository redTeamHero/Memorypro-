import os
import socket
import sys
import threading
import time
import webbrowser

from backend.app import DATA_DIR, DEFAULT_DECK_FILE, PROGRESS_FILE, app, write_json

PORT = 5000
HOST = "127.0.0.1"


def resource_path(relative_path: str) -> str:
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


def ensure_data_files() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DEFAULT_DECK_FILE.exists():
        raise FileNotFoundError(
            "Default deck is missing. Populate backend/data/default_deck.json before starting the server."
        )
    if not PROGRESS_FILE.exists():
        write_json(PROGRESS_FILE, [])


def start_server() -> None:
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False)


def wait_for_server(timeout_seconds: float = 5.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.2)
            if sock.connect_ex((HOST, PORT)) == 0:
                return
        time.sleep(0.1)


def launch_browser() -> None:
    webbrowser.open(f"http://{HOST}:{PORT}/index.html")


if __name__ == "__main__":
    base_dir = resource_path("")
    if base_dir:
        os.chdir(base_dir)
    ensure_data_files()
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    wait_for_server()
    launch_browser()
    input("MemoryPro running. Press ENTER to quit.")
