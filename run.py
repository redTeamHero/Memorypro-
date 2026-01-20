import os
import socket
import sys
import threading
import time
import json

import webview
import tkinter as tk
import tkinter.messagebox as mb

from backend.app import APP_VERSION, app, write_json
from backend.updater import check_for_update, download_and_install

HOST = "127.0.0.1"
PORT = 5000


# -------------------------------
# PyInstaller-safe path resolver
# -------------------------------
def resource_path(relative_path: str) -> str:
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)


# -------------------------------
# Data paths (inside EXE)
# -------------------------------
BASE_DIR = resource_path("")
DATA_DIR = os.path.join(BASE_DIR, "backend", "data")
DEFAULT_DECK_FILE = os.path.join(DATA_DIR, "default_deck.json")
PROGRESS_FILE = os.path.join(DATA_DIR, "progress.json")


# -------------------------------
# Auto-create data files
# -------------------------------
def ensure_data_files() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

    if not os.path.exists(DEFAULT_DECK_FILE):
        default_deck = {
            "name": "Default Deck",
            "cards": []
        }
        with open(DEFAULT_DECK_FILE, "w", encoding="utf-8") as f:
            json.dump(default_deck, f, indent=2)

    if not os.path.exists(PROGRESS_FILE):
        write_json(PROGRESS_FILE, [])


# -------------------------------
# Flask server
# -------------------------------
def start_server() -> None:
    app.run(
        host=HOST,
        port=PORT,
        debug=False,
        use_reloader=False,
    )


def wait_for_server(timeout_seconds: float = 6.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.2)
            if sock.connect_ex((HOST, PORT)) == 0:
                return
        time.sleep(0.1)
    raise RuntimeError("Flask server failed to start.")


# -------------------------------
# MAIN
# -------------------------------
if __name__ == "__main__":
    os.chdir(BASE_DIR)

    ensure_data_files()

    update = check_for_update(APP_VERSION)
    if update:
        root = tk.Tk()
        root.withdraw()
        should_update = mb.askyesno(
            "Update Available",
            f"Version {update['version']} is available.\n\n{update.get('notes', '')}\n\nUpdate now?",
        )
        root.destroy()
        if should_update:
            download_and_install(update["installer_url"])

    server_thread = threading.Thread(target=start_server)
    server_thread.start()

    wait_for_server()

    webview.create_window(
        "MemoryPro",
        f"http://{HOST}:{PORT}/index.html",
        width=1200,
        height=800,
        resizable=True,
    )

    webview.start()
