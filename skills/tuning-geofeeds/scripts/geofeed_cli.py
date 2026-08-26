#!/usr/bin/env python3
# Copyright 2026 Fastah Inc.
"""Run the bundled analyzer without relying on the current working directory."""

from __future__ import annotations

import sys
from collections.abc import Callable
from pathlib import Path
from typing import cast


def package_root() -> Path:
    skill_root = Path(__file__).resolve().parents[1]
    bundled = skill_root / "package"
    # A distributable skill always contains package/. Never fall through to a
    # host checkout when that bundle is present but incomplete or damaged.
    candidates = (bundled,) if bundled.exists() else (skill_root.parent,)
    for candidate in candidates:
        if (candidate / "pyproject.toml").is_file() and (
            candidate / "src" / "geofeed_quality"
        ).is_dir():
            return candidate
    raise SystemExit("error: bundled geofeed-quality package is unavailable")


def main() -> int:
    if sys.version_info < (3, 14):  # noqa: UP036 - portable runtime guard is intentional
        raise SystemExit("error: tuning-geofeeds requires Python 3.14 or newer")
    if sys.version_info.releaselevel != "final":
        raise SystemExit(
            "error: tuning-geofeeds requires a final Python 3.14 or newer release; "
            f"found prerelease {sys.version.split()[0]}"
        )
    root = package_root()
    if sys.argv[1:] == ["--print-package-root"]:
        print(root)
        return 0
    sys.path.insert(0, str(root / "src"))
    try:
        from geofeed_quality.cli import main as cli_main
    except ModuleNotFoundError as error:
        raise SystemExit(
            "error: analyzer dependencies are unavailable; follow references/setup.md"
        ) from error
    return cast(Callable[[list[str]], int], cli_main)(sys.argv[1:])


if __name__ == "__main__":
    raise SystemExit(main())
