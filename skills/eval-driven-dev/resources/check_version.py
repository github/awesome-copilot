#!/usr/bin/env python3
"""Check whether the eval-driven-dev skill is outdated and update it if needed."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


def _load_local_version(resource_dir: Path) -> dict[str, str]:
    with (resource_dir / "version.json").open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("version.json must contain a JSON object")
    return {str(key): str(value) for key, value in data.items()}


def _fetch_remote_version(version_url: str) -> dict[str, str]:
    with urlopen(version_url, timeout=10) as response:
        data = json.load(response)
    if not isinstance(data, dict):
        raise ValueError("Remote version.json must contain a JSON object")
    return {str(key): str(value) for key, value in data.items()}


def _normalise_version(version: str) -> tuple[int, ...]:
    parts = []
    for part in version.strip().split("."):
        try:
            parts.append(int(part))
        except ValueError:
            break
    return tuple(parts)


def main() -> int:
    resource_dir = Path(__file__).resolve().parent

    local_data = _load_local_version(resource_dir)

    # Prefer an explicit version URL if provided in version.json; otherwise,
    # construct one using the known repository location and a relative
    # skill_location path (defaulting to the eval-driven-dev skill directory).
    version_url = local_data.get("version_url")
    if not version_url:
        skill_location = local_data.get(
            "skill_location",
            "skills/eval-driven-dev/",
        )
        version_url = (
            "https://raw.githubusercontent.com/"
            "github/awesome-copilot/main/"
            f"{skill_location}resources/version.json"
        )
    local_version = local_data.get("version", "0.0.0")

    print(
        f"Checking {local_data.get('skill_name', 'skill')} version "
        f"{local_version} against {version_url}"
    )

    try:
        remote_data = _fetch_remote_version(version_url)
    except (OSError, URLError, ValueError) as exc:
        print(f"Could not fetch remote version metadata: {exc}")
        return 0

    remote_version = remote_data.get("version", local_version)
    if _normalise_version(remote_version) <= _normalise_version(local_version):
        print(f"Skill is up to date ({local_version}).")
        return 0

    print(f"Skill is outdated: local={local_version}, remote={remote_version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
