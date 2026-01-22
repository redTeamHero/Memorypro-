import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional, Sequence

import requests

VERSION_URL = "https://raw.githubusercontent.com/redTeamHero/Memorypro-/main/version.json"
UPDATE_DIR_NAME = "updates"
UPDATE_STATE_FILE = "update_state.json"


class UpdateError(RuntimeError):
    pass


def is_packaged() -> bool:
    return bool(getattr(sys, "frozen", False) or getattr(sys, "_MEIPASS", None))


def find_git_root(base_dir: Path) -> Optional[Path]:
    candidates = [base_dir, base_dir.parent]
    for candidate in candidates:
        if (candidate / ".git").exists():
            return candidate
    return None


def install_type(base_dir: Path) -> str:
    if is_packaged():
        return "packaged"
    if find_git_root(base_dir):
        return "source"
    return "packaged"


def _run_git(command: Sequence[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(cwd),
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def _git_has_local_changes(git_root: Path) -> bool:
    status = _run_git(["git", "status", "--porcelain", "-uno"], git_root)
    return bool(status.stdout.strip())


def _git_upstream(git_root: Path) -> str:
    try:
        upstream = _run_git(
            ["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
            git_root,
        )
    except subprocess.CalledProcessError as exc:  # pragma: no cover - depends on repo config
        raise UpdateError("No upstream branch configured for this repository.") from exc
    return upstream.stdout.strip()


def _git_update_available(git_root: Path) -> bool:
    _run_git(["git", "fetch", "origin"], git_root)
    _git_upstream(git_root)
    ahead = _run_git(["git", "rev-list", "--count", "HEAD..@{u}"], git_root)
    return int(ahead.stdout.strip() or 0) > 0


def _git_pull_fast_forward(git_root: Path) -> str:
    result = _run_git(["git", "pull", "--ff-only"], git_root)
    return result.stdout.strip()


def _parse_version(value: str) -> tuple[int, ...]:
    parts = []
    for chunk in value.split("."):
        try:
            parts.append(int(chunk))
        except ValueError:
            break
    return tuple(parts)


def _is_version_newer(current: str, latest: str) -> bool:
    current_parts = _parse_version(current)
    latest_parts = _parse_version(latest)
    if current_parts and latest_parts:
        return latest_parts > current_parts
    return latest != current


def _fetch_remote_version() -> Dict[str, Any]:
    response = requests.get(VERSION_URL, timeout=8)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise UpdateError("Invalid update metadata received.")
    return payload


def _resolve_update_root(base_dir: Path) -> Path:
    if is_packaged():
        return Path(sys.executable).resolve().parent
    git_root = find_git_root(base_dir)
    return git_root if git_root is not None else base_dir


def _update_state_path(base_dir: Path) -> Path:
    return _resolve_update_root(base_dir) / UPDATE_STATE_FILE


def load_update_state(base_dir: Path) -> Optional[Dict[str, Any]]:
    state_path = _update_state_path(base_dir)
    if not state_path.exists():
        return None
    with state_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_update_state(base_dir: Path, payload: Dict[str, Any]) -> None:
    state_path = _update_state_path(base_dir)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    with state_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def clear_update_state(base_dir: Path) -> None:
    state_path = _update_state_path(base_dir)
    if state_path.exists():
        state_path.unlink()


def get_update_status(current_version: str, base_dir: Path) -> Dict[str, Any]:
    install = install_type(base_dir)
    update_state = load_update_state(base_dir)
    return {
        "currentVersion": current_version,
        "installType": install,
        "updateReady": bool(update_state),
        "pendingVersion": update_state.get("version") if update_state else None,
    }


def check_for_update(current_version: str, base_dir: Path) -> Dict[str, Any]:
    install = install_type(base_dir)
    if install == "source":
        git_root = find_git_root(base_dir)
        if git_root is None:
            raise UpdateError("Git repository not found.")
        if _git_has_local_changes(git_root):
            return {
                "installType": install,
                "updateAvailable": False,
                "blocked": True,
                "message": "Local changes detected. Commit or stash before updating.",
            }
        update_available = _git_update_available(git_root)
        return {
            "installType": install,
            "updateAvailable": update_available,
            "blocked": False,
            "message": "Updates are available." if update_available else "You are on the latest commit.",
        }

    payload = _fetch_remote_version()
    latest_version = str(payload.get("version") or "")
    update_available = bool(latest_version) and _is_version_newer(current_version, latest_version)
    return {
        "installType": install,
        "updateAvailable": update_available,
        "latestVersion": latest_version or None,
        "notes": payload.get("notes") or "",
        "releaseNotesUrl": payload.get("release_notes_url") or payload.get("releaseNotesUrl"),
        "downloadUrl": payload.get("installer_url") or payload.get("download_url"),
        "sha256": payload.get("sha256"),
    }


def _download_file(url: str, destination: Path) -> str:
    hasher = hashlib.sha256()
    with requests.get(url, stream=True, timeout=20) as response:
        response.raise_for_status()
        with destination.open("wb") as handle:
            for chunk in response.iter_content(8192):
                if chunk:
                    handle.write(chunk)
                    hasher.update(chunk)
    return hasher.hexdigest()


def download_update(current_version: str, base_dir: Path) -> Dict[str, Any]:
    install = install_type(base_dir)
    if install == "source":
        git_root = find_git_root(base_dir)
        if git_root is None:
            raise UpdateError("Git repository not found.")
        if _git_has_local_changes(git_root):
            raise UpdateError("Local changes detected. Commit or stash before updating.")
        output = _git_pull_fast_forward(git_root)
        return {
            "installType": install,
            "updated": True,
            "message": output or "Repository updated. Restart to apply changes.",
            "requiresRestart": True,
        }

    payload = check_for_update(current_version, base_dir)
    if not payload.get("updateAvailable"):
        raise UpdateError("No update available.")
    download_url = payload.get("downloadUrl")
    if not download_url:
        raise UpdateError("No download URL provided for the update.")

    update_root = _resolve_update_root(base_dir)
    update_dir = update_root / UPDATE_DIR_NAME
    update_dir.mkdir(parents=True, exist_ok=True)

    latest_version = payload.get("latestVersion") or "latest"
    filename = f"MemoryPro-{latest_version}.exe"
    download_path = update_dir / filename

    downloaded_hash = _download_file(download_url, download_path)
    expected_hash = payload.get("sha256")
    if expected_hash and downloaded_hash.lower() != str(expected_hash).lower():
        if download_path.exists():
            download_path.unlink()
        raise UpdateError("Downloaded update failed verification.")

    write_update_state(
        base_dir,
        {
            "version": latest_version,
            "downloadUrl": download_url,
            "downloadedPath": str(download_path),
            "sha256": downloaded_hash,
            "downloadedAt": time.time(),
        },
    )
    return {
        "installType": install,
        "updated": True,
        "message": "Update downloaded. Restart to apply.",
        "requiresRestart": True,
    }


def _find_updater_executable(base_dir: Path) -> Path:
    update_root = _resolve_update_root(base_dir)
    candidate = update_root / "MemoryProUpdater.exe"
    if candidate.exists():
        return candidate
    raise UpdateError("Updater executable not found. Ensure MemoryProUpdater.exe is bundled.")


def apply_update(base_dir: Path) -> Dict[str, Any]:
    install = install_type(base_dir)
    if install != "packaged":
        raise UpdateError("Apply update is only available for packaged builds.")
    state = load_update_state(base_dir)
    if not state:
        raise UpdateError("No downloaded update to apply.")

    current_exe = Path(sys.executable).resolve()
    new_exe = Path(state["downloadedPath"]).resolve()
    if not new_exe.exists():
        raise UpdateError("Downloaded update file is missing.")

    updater = _find_updater_executable(base_dir)
    backup_path = current_exe.with_suffix(".bak")
    subprocess.Popen(
        [
            str(updater),
            "--wait-pid",
            str(os.getpid()),
            "--current-exe",
            str(current_exe),
            "--new-exe",
            str(new_exe),
            "--backup-exe",
            str(backup_path),
            "--launch",
            str(current_exe),
            "--state-file",
            str(_update_state_path(base_dir)),
        ],
        cwd=str(updater.parent),
    )
    return {"installType": install, "message": "Updater launched. Restarting to apply update."}
