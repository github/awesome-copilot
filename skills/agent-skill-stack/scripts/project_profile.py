#!/usr/bin/env python3
"""Preview or create a project-local Skill Stack routing profile."""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path


SKILL_NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def validate_skill_name(value: str) -> str:
    if not SKILL_NAME.fullmatch(value):
        raise argparse.ArgumentTypeError(f"invalid Skill name: {value!r}")
    return value


def parse_route(raw: str, active: set[str]) -> dict[str, object]:
    if "=" not in raw:
        raise ValueError(f"route must use 'intent=primary[,helper]': {raw!r}")
    intent, raw_skills = raw.split("=", 1)
    intent = intent.strip()
    skills = [item.strip() for item in raw_skills.split(",") if item.strip()]
    if not intent or not skills:
        raise ValueError(f"route has no intent or Skill: {raw!r}")
    invalid = [name for name in skills if not SKILL_NAME.fullmatch(name)]
    if invalid:
        raise ValueError("route contains invalid Skill names: " + ", ".join(invalid))
    missing = [name for name in skills if name not in active]
    if missing:
        raise ValueError("route refers to Skills not listed with --skill: " + ", ".join(missing))
    return {
        "intent": intent,
        "primary": skills[0],
        "supporting": skills[1:],
    }


def atomic_write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = handle.name
    os.replace(temporary, path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, help="Project root")
    parser.add_argument("--name", required=True, help="Plain profile name")
    parser.add_argument("--skill", action="append", required=True, type=validate_skill_name, help="Active Skill; repeatable")
    parser.add_argument("--route", action="append", default=[], help="Intent route: intent=primary[,helper]")
    parser.add_argument("--strict", action="store_true", help="Do not search outside this profile automatically")
    parser.add_argument("--apply", action="store_true", help="Write the profile; default is preview only")
    parser.add_argument("--update", action="store_true", help="Replace an existing profile; requires --apply")
    args = parser.parse_args()

    if args.update and not args.apply:
        raise SystemExit("--update requires --apply")

    project = Path(os.path.expandvars(os.path.expanduser(args.project))).resolve()
    if project.is_symlink() or not project.is_dir():
        raise SystemExit(f"project is not a regular directory: {project}")

    active_skills = list(dict.fromkeys(args.skill))
    active_set = set(active_skills)
    try:
        routes = [parse_route(raw, active_set) for raw in args.route]
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    profile_path = project / ".codex" / "skill-stack.json"
    if profile_path.exists() and not args.update:
        raise SystemExit(f"profile already exists; refusing to overwrite: {profile_path}")

    payload: dict[str, object] = {
        "schema": 1,
        "profile_name": args.name.strip(),
        "project_root": str(project),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "active_skills": active_skills,
        "routes": routes,
        "routing": {
            "preference": "profile-first",
            "outside_search": "never" if args.strict else "only-for-uncovered-capabilities",
        },
        "privacy": "This profile stores routing preferences only. It contains no prompts, usage history, or feedback logs.",
        "technical_note": "A profile guides routing. Actual hard scoping requires project-local Skill installation when supported by the client.",
    }

    if args.apply:
        atomic_write_json(profile_path, payload)
        status = "updated" if args.update else "created"
    else:
        status = "preview"

    print(json.dumps({
        "status": status,
        "profile_path": str(profile_path),
        "profile": payload,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
