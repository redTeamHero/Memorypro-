import subprocess
import sys
import tempfile
from typing import Any, Dict, Optional

import requests

VERSION_URL = "https://raw.githubusercontent.com/redTeamHero/Memorypro-/main/version.json"


def check_for_update(current_version: str) -> Optional[Dict[str, Any]]:
    try:
        response = requests.get(VERSION_URL, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get("version") and data.get("version") != current_version:
            return data
    except Exception:
        return None

    return None


def download_and_install(installer_url: str) -> None:
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".exe")
    tmp_file.close()

    with requests.get(installer_url, stream=True) as response:
        response.raise_for_status()
        with open(tmp_file.name, "wb") as handle:
            for chunk in response.iter_content(8192):
                if chunk:
                    handle.write(chunk)

    subprocess.Popen([tmp_file.name])
    sys.exit(0)
