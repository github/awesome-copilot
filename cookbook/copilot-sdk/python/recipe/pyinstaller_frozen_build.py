"""
PyInstaller / Frozen Build Compatibility
=========================================
Demonstrates how to create a CopilotClient that works correctly inside
a PyInstaller (or Nuitka) frozen executable.

Run normally:
    python pyinstaller_frozen_build.py

Build with PyInstaller:
    pyinstaller --onefile pyinstaller_frozen_build.py

Requirements:
    pip install copilot-sdk certifi
"""

import asyncio
import os
import sys
from pathlib import Path

from copilot import CopilotClient, SubprocessConfig


# ---------------------------------------------------------------------------
# CLI binary resolution
# ---------------------------------------------------------------------------

def resolve_cli_path() -> str | None:
    """Find the Copilot CLI binary in a frozen build.

    Searches the SDK's standard location first, then falls back to
    PyInstaller's _MEIPASS temporary directory.
    """
    candidates: list[Path] = []
    binary = "copilot.exe" if sys.platform == "win32" else "copilot"

    # 1. SDK's normal resolution (works in non-frozen builds)
    try:
        import copilot as pkg
        candidates.append(Path(pkg.__file__).parent / "bin" / binary)
    except Exception:
        pass

    # 2. PyInstaller _MEIPASS fallback
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        meipass = Path(sys._MEIPASS)
        candidates.append(meipass / "copilot" / "bin" / binary)
        candidates.append(meipass.parent / "copilot" / "bin" / binary)

    for c in candidates:
        if c.exists():
            # Restore execute permissions on Unix (lost during archive extraction)
            if sys.platform != "win32" and not os.access(str(c), os.X_OK):
                os.chmod(str(c), c.stat().st_mode | 0o755)
            return str(c)

    return None


# ---------------------------------------------------------------------------
# SSL certificate setup
# ---------------------------------------------------------------------------

def ensure_ssl_certs():
    """Inject certifi's CA bundle into the environment.

    On macOS frozen builds the system certificate store is unreachable,
    so the CLI subprocess fails TLS handshakes unless we set these vars.
    """
    if os.environ.get("SSL_CERT_FILE"):
        return  # Already configured

    try:
        import certifi
        ca = certifi.where()
        if Path(ca).is_file():
            os.environ["SSL_CERT_FILE"] = ca
            os.environ["REQUESTS_CA_BUNDLE"] = ca
            os.environ.setdefault("NODE_EXTRA_CA_CERTS", ca)
    except ImportError:
        pass  # CLI will fall back to platform defaults


# ---------------------------------------------------------------------------
# Client factory
# ---------------------------------------------------------------------------

async def create_frozen_client() -> CopilotClient:
    """Create a CopilotClient that works in both normal and frozen builds."""
    ensure_ssl_certs()

    kwargs: dict = {"log_level": "info", "use_stdio": True}

    if getattr(sys, "frozen", False):
        cli = resolve_cli_path()
        if cli:
            kwargs["cli_path"] = cli
            print(f"[frozen] Using CLI at: {cli}")
        else:
            print("[frozen] WARNING: Could not locate Copilot CLI binary")

    client = CopilotClient(SubprocessConfig(**kwargs), auto_start=True)
    await client.start()
    return client


# ---------------------------------------------------------------------------
# Demo
# ---------------------------------------------------------------------------

async def main():
    frozen = getattr(sys, "frozen", False)
    print(f"Running as {'frozen' if frozen else 'normal'} Python process")

    client = await create_frozen_client()
    try:
        session = await client.create_session()
        response = await session.send_message(
            "Say 'Hello from a frozen build!' if you can read this."
        )
        print(f"Response: {response}")
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
