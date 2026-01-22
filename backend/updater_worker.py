import argparse
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Optional


def is_process_running(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name == "nt":
        return _is_process_running_windows(pid)
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _is_process_running_windows(pid: int) -> bool:
    import ctypes

    kernel32 = ctypes.windll.kernel32
    process = kernel32.OpenProcess(0x1000, 0, pid)
    if not process:
        return False
    try:
        exit_code = ctypes.c_ulong()
        if kernel32.GetExitCodeProcess(process, ctypes.byref(exit_code)) == 0:
            return False
        return exit_code.value == 259
    finally:
        kernel32.CloseHandle(process)


def wait_for_exit(pid: int, timeout_seconds: float = 60.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if not is_process_running(pid):
            return
        time.sleep(0.5)
    raise RuntimeError("Timed out waiting for the app to exit.")


def replace_with_rollback(current_exe: Path, new_exe: Path, backup_exe: Path) -> None:
    if not current_exe.exists():
        raise RuntimeError(f"Current executable not found: {current_exe}")
    if not new_exe.exists():
        raise RuntimeError(f"New executable not found: {new_exe}")
    if backup_exe.exists():
        backup_exe.unlink()

    try:
        os.replace(current_exe, backup_exe)
        os.replace(new_exe, current_exe)
    except Exception as exc:
        if backup_exe.exists() and not current_exe.exists():
            os.replace(backup_exe, current_exe)
        raise RuntimeError("Update failed; restored previous executable.") from exc


def launch_app(launch_cmd: str) -> None:
    subprocess.Popen([launch_cmd], cwd=str(Path(launch_cmd).parent))


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MemoryPro updater worker")
    parser.add_argument("--wait-pid", type=int, required=True)
    parser.add_argument("--current-exe", required=True)
    parser.add_argument("--new-exe", required=True)
    parser.add_argument("--backup-exe", required=True)
    parser.add_argument("--launch", required=True)
    parser.add_argument("--state-file")
    return parser.parse_args(argv)


def main() -> int:
    args = parse_args()
    current_exe = Path(args.current_exe)
    new_exe = Path(args.new_exe)
    backup_exe = Path(args.backup_exe)
    state_file = Path(args.state_file) if args.state_file else None

    wait_for_exit(args.wait_pid)
    replace_with_rollback(current_exe, new_exe, backup_exe)
    if state_file and state_file.exists():
        state_file.unlink()
    launch_app(args.launch)

    if backup_exe.exists():
        backup_exe.unlink()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        log_path = Path(__file__).with_name("update.log")
        log_path.write_text(f"{exc}\n", encoding="utf-8")
        raise
