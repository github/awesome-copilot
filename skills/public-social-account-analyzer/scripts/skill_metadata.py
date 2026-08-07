"""Read release metadata from the installed Skill package."""

from __future__ import annotations

import hashlib
import re
from functools import lru_cache
from pathlib import Path


_SKILL_ROOT = Path(__file__).resolve().parent.parent
_SEMVER = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$")


@lru_cache(maxsize=1)
def skill_release() -> str:
    """Return the validated package VERSION value."""
    value = (_SKILL_ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if not _SEMVER.fullmatch(value):
        raise RuntimeError("Skill VERSION is missing or invalid")
    return value


@lru_cache(maxsize=1)
def skill_contract_sha256() -> str:
    """Hash the exact SKILL.md bytes shipped with this package."""
    return hashlib.sha256((_SKILL_ROOT / "SKILL.md").read_bytes()).hexdigest()
