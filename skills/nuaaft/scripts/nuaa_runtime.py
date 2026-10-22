"""Shared local paths, dependency bootstrap and browser discovery."""
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


SESSION_DIR = Path(tempfile.gettempdir()) / "nuaa-course-video"
STATE_DEFAULT = str(SESSION_DIR / "state.json")
QR_PNG = str(SESSION_DIR / "qr.png")
LOGIN_LOG = str(SESSION_DIR / "login.log")


def ensure_dependencies(modules):
    """Install missing packages into a dedicated venv, never the caller's Python."""
    if all(importlib.util.find_spec(module) for module in modules):
        return
    venv = Path.home() / ".cache" / "nuaa-course-video" / "venv"
    python = venv / ("Scripts/python.exe" if os.name == "nt" else "bin/python3")
    if not python.exists():
        subprocess.run([sys.executable, "-m", "venv", str(venv)], check=True)
    subprocess.run([str(python), "-m", "pip", "install", "websockets", "pycryptodome"], check=True)
    # Windows os.execv does not reliably preserve the caller's process lifetime.
    raise SystemExit(subprocess.call([str(python), *sys.argv]))


def chrome_binary():
    override = os.environ.get("CHROME_BIN")
    if override:
        if Path(override).is_file():
            return override
        raise RuntimeError("CHROME_BIN does not point to an executable file")
    candidates = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    for env in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
        if os.environ.get(env):
            candidates.append(str(Path(os.environ[env]) / "Google/Chrome/Application/chrome.exe"))
    for path in candidates:
        if Path(path).is_file():
            return path
    for name in ("google-chrome", "chromium", "chromium-browser"):
        if shutil.which(name):
            return shutil.which(name)
    raise RuntimeError("Chrome not found; set CHROME_BIN to the Chrome executable path")
