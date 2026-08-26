# Copyright 2026 Fastah Inc.
"""Portable analyzer runtime compatibility guard."""

from __future__ import annotations

import sys

MINIMUM_PYTHON = (3, 14)


def require_supported_python(
    version: tuple[int, int] | None = None, *, releaselevel: str | None = None
) -> None:
    actual = version or sys.version_info[:2]
    if actual < MINIMUM_PYTHON:
        raise RuntimeError(
            f"fastah-geofeed-quality requires Python {MINIMUM_PYTHON[0]}."
            f"{MINIMUM_PYTHON[1]} or newer; found {actual[0]}.{actual[1]}"
        )
    actual_releaselevel = releaselevel or (
        sys.version_info.releaselevel if version is None else "final"
    )
    if actual_releaselevel != "final":
        raise RuntimeError(
            "fastah-geofeed-quality requires a final Python 3.14 or newer release; "
            f"found prerelease {actual[0]}.{actual[1]} ({actual_releaselevel})"
        )
