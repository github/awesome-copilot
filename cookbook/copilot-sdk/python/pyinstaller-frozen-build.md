# Deploying Copilot SDK Apps with PyInstaller

Package a Copilot SDK application into a standalone executable using PyInstaller (or Nuitka).

## Problem

When you freeze a Python SDK application with PyInstaller, three things break:

1. **CLI binary resolution** — The SDK locates its CLI via `__file__`, which points inside the PYZ archive in a frozen build.
2. **SSL certificates** — On macOS, the frozen app can't find system CA certs, so the CLI subprocess fails TLS handshakes.
3. **Execute permissions** — The bundled CLI binary may lose its `+x` bit when extracted from the archive.

## Solution

Resolve the CLI path by searching both the SDK's normal location and PyInstaller's `_MEIPASS` temp directory. Fix SSL by injecting `certifi`'s CA bundle into the environment. Restore execute permissions on Unix before launching.

```python
"""Frozen-build compatibility for Copilot SDK applications."""
import os, sys
from pathlib import Path
from copilot import CopilotClient, SubprocessConfig


def resolve_cli_path() -> str | None:
    """Find the Copilot CLI binary in a frozen build."""
    candidates = []
    binary = "copilot.exe" if sys.platform == "win32" else "copilot"

    # 1. SDK's normal resolution
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
            if sys.platform != "win32" and not os.access(str(c), os.X_OK):
                os.chmod(str(c), c.stat().st_mode | 0o755)
            return str(c)
    return None


def ensure_ssl_certs():
    """Set SSL env vars for the CLI subprocess (macOS frozen builds)."""
    if os.environ.get("SSL_CERT_FILE"):
        return
    try:
        import certifi
        ca = certifi.where()
        if Path(ca).is_file():
            os.environ["SSL_CERT_FILE"] = ca
            os.environ["REQUESTS_CA_BUNDLE"] = ca
            os.environ.setdefault("NODE_EXTRA_CA_CERTS", ca)
    except ImportError:
        pass  # CLI will use platform defaults


async def create_frozen_client():
    """Create a CopilotClient that works in both normal and frozen builds."""
    ensure_ssl_certs()
    kwargs = {"log_level": "info", "use_stdio": True}
    if getattr(sys, "frozen", False):
        cli = resolve_cli_path()
        if cli:
            kwargs["cli_path"] = cli
    client = CopilotClient(SubprocessConfig(**kwargs), auto_start=True)
    await client.start()
    return client
```

## PyInstaller Spec

Include the SDK's binary directory in your `.spec` file so PyInstaller bundles it:

```python
from PyInstaller.utils.hooks import collect_data_files

data += collect_data_files('copilot', include_py_files=False)
```

## Tips

- **Test the frozen build on a clean machine** — `_MEIPASS` extraction behaves differently than your dev environment.
- **Pin `certifi`** in your requirements so the CA bundle is always available.
- **Nuitka** uses a different extraction model (`--include-package-data=copilot`), but the same `resolve_cli_path` logic works.

## Runnable Example

See [`recipe/pyinstaller_frozen_build.py`](recipe/pyinstaller_frozen_build.py) for a complete working example.
