"""Atomic private-file storage for user-authorized Cookie records."""

from __future__ import annotations

import os
import stat
import tempfile
from pathlib import Path
from typing import Type


def atomic_write_private_text(
    path: str | os.PathLike[str],
    text: str,
    *,
    error_type: Type[ValueError],
    error_message: str,
) -> None:
    """Atomically replace one regular file without following target symlinks."""
    target = Path(path)
    temporary_path: str | None = None
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            current = os.lstat(target)
        except FileNotFoundError:
            current = None
        if current is not None and not stat.S_ISREG(current.st_mode):
            raise OSError("target is not a regular file")

        fd, temporary_path = tempfile.mkstemp(
            dir=target.parent,
            prefix=f".{target.name}.",
            suffix=".tmp",
        )
        try:
            os.fchmod(fd, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(text)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, target)
            temporary_path = None
        except Exception:
            try:
                os.close(fd)
            except OSError:
                pass
            raise
    except (OSError, UnicodeError) as exc:
        raise error_type(error_message) from exc
    finally:
        if temporary_path is not None:
            try:
                os.unlink(temporary_path)
            except FileNotFoundError:
                pass
            except OSError:
                pass
