#!/usr/bin/env python3
"""
CodeTour validator — bundled with the code-tour skill.

Checks a .tour file for:
  - Valid JSON
  - Required fields (title, steps, description per step)
  - File paths that actually exist in the repo
  - Line numbers within file bounds
  - Selection ranges within file bounds
  - Directory paths that exist
  - Pattern regexes that compile AND match at least one line
  - URI format (must start with https://)
  - nextTour matches an existing tour title in .tours/
  - Content-only step count (max 2 recommended)
  - Narrative arc (first step should orient, last step should close)

Usage:
    python validate_tour.py <tour_file> [--repo-root <path>]

Examples:
    python validate_tour.py .tours/new-joiner.tour
    python validate_tour.py .tours/new-joiner.tour --repo-root /path/to/repo
"""

import json
import re
import sys
import os
from pathlib import Path


RESET = "\033[0m"
RED = "\033[31m"
YELLOW = "\033[33m"
GREEN = "\033[32m"
BOLD = "\033[1m"
DIM = "\033[2m"


def _line_count(path: Path) -> int:
    try:
        with open(path, errors="replace") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def _file_content(path: Path) -> str:
    try:
        return path.read_text(errors="replace")
    except Exception:
        return ""


def validate_tour(tour_path: str, repo_root: str = ".") -> dict:
    repo = Path(repo_root).resolve()
    errors = []
    warnings = []
    info = []

    # ── 1. JSON validity ────────────────────────────────────────────────────
    try:
        with open(tour_path, errors="replace") as f:
            tour = json.load(f)
    except json.JSONDecodeError as e:
        return {
            "passed": False,
            "errors": [f"Invalid JSON: {e}"],
            "warnings": [],
            "info": [],
            "stats": {},
        }
    except FileNotFoundError:
        return {
            "passed": False,
            "errors": [f"File not found: {tour_path}"],
            "warnings": [],
            "info": [],
            "stats": {},
        }

    # ── 2. Required top-level fields ────────────────────────────────────────
    if "title" not in tour:
        errors.append("Missing required field: 'title'")
    if "steps" not in tour:
        errors.append("Missing required field: 'steps'")
        return {"passed": False, "errors": errors, "warnings": warnings, "info": info, "stats": {}}

    steps = tour["steps"]
    if not isinstance(steps, list):
        errors.append("'steps' must be an array")
        return {"passed": False, "errors": errors, "warnings": warnings, "info": info, "stats": {}}

    if len(steps) == 0:
        errors.append("Tour has no steps")
        return {"passed": False, "errors": errors, "warnings": warnings, "info": info, "stats": {}}

    # ── 3. Tour-level optional fields ───────────────────────────────────────
    if "nextTour" in tour:
        tours_dir = Path(tour_path).parent
        next_title = tour["nextTour"]
        found_next = False
        for tf in tours_dir.glob("*.tour"):
            if tf.resolve() == Path(tour_path).resolve():
                continue
            try:
                other = json.loads(tf.read_text())
                if other.get("title") == next_title:
                    found_next = True
                    break
            except Exception:
                pass
        if not found_next:
            warnings.append(
                f"nextTour '{next_title}' — no .tour file in .tours/ has a matching title"
            )

    # ── 4. Per-step validation ───────────────────────────────────────────────
    content_only_count = 0
    file_step_count = 0
    dir_step_count = 0
    uri_step_count = 0

    for i, step in enumerate(steps):
        label = f"Step {i + 1}"
        if "title" in step:
            label += f" — {step['title']!r}"

        # description required on every step
        if "description" not in step:
            errors.append(f"{label}: Missing required field 'description'")

        has_file = "file" in step
        has_dir = "directory" in step
        has_uri = "uri" in step
        has_selection = "selection" in step

        if not has_file and not has_dir and not has_uri:
            content_only_count += 1

        # ── file ──────────────────────────────────────────────────────────
        if has_file:
            file_step_count += 1
            raw_path = step["file"]

            # must be relative — no leading slash, no ./
            if raw_path.startswith("/"):
                errors.append(f"{label}: File path must be relative (no leading /): {raw_path!r}")
            elif raw_path.startswith("./"):
                warnings.append(f"{label}: File path should not start with './': {raw_path!r}")

            file_path = repo / raw_path
            if not file_path.exists():
                errors.append(f"{label}: File does not exist: {raw_path!r}")
            elif not file_path.is_file():
                errors.append(f"{label}: Path is not a file: {raw_path!r}")
            else:
                lc = _line_count(file_path)

                # line number
                if "line" in step:
                    ln = step["line"]
                    if not isinstance(ln, int):
                        errors.append(f"{label}: 'line' must be an integer, got {ln!r}")
                    elif ln < 1:
                        errors.append(f"{label}: Line number must be >= 1, got {ln}")
                    elif ln > lc:
                        errors.append(
                            f"{label}: Line {ln} exceeds file length ({lc} lines): {raw_path!r}"
                        )

                # selection
                if has_selection:
                    sel = step["selection"]
                    start = sel.get("start", {})
                    end = sel.get("end", {})
                    s_line = start.get("line", 0)
                    e_line = end.get("line", 0)
                    if s_line > lc:
                        errors.append(
                            f"{label}: Selection start line {s_line} exceeds file length ({lc})"
                        )
                    if e_line > lc:
                        errors.append(
                            f"{label}: Selection end line {e_line} exceeds file length ({lc})"
                        )
                    if s_line > e_line:
                        errors.append(
                            f"{label}: Selection start ({s_line}) is after end ({e_line})"
                        )

                # pattern
                if "pattern" in step:
                    try:
                        compiled = re.compile(step["pattern"], re.MULTILINE)
                        content = _file_content(file_path)
                        if not compiled.search(content):
                            errors.append(
                                f"{label}: Pattern {step['pattern']!r} matches nothing in {raw_path!r}"
                            )
                    except re.error as e:
                        errors.append(f"{label}: Invalid regex pattern: {e}")

        # ── directory ─────────────────────────────────────────────────────
        if has_dir:
            dir_step_count += 1
            raw_dir = step["directory"]
            dir_path = repo / raw_dir
            if not dir_path.exists():
                errors.append(f"{label}: Directory does not exist: {raw_dir!r}")
            elif not dir_path.is_dir():
                errors.append(f"{label}: Path is not a directory: {raw_dir!r}")

        # ── uri ───────────────────────────────────────────────────────────
        if has_uri:
            uri_step_count += 1
            uri = step["uri"]
            if not uri.startswith("https://") and not uri.startswith("http://"):
                warnings.append(f"{label}: URI should start with https://: {uri!r}")

        # ── commands ──────────────────────────────────────────────────────
        if "commands" in step:
            if not isinstance(step["commands"], list):
                errors.append(f"{label}: 'commands' must be an array")
            else:
                for cmd in step["commands"]:
                    if not isinstance(cmd, str):
                        errors.append(f"{label}: Each command must be a string, got {cmd!r}")

    # ── 5. Content-only step count ──────────────────────────────────────────
    if content_only_count > 2:
        warnings.append(
            f"{content_only_count} content-only steps (no file/dir/uri). "
            f"Recommended max: 2 (intro + closing)."
        )

    # ── 6. Narrative arc checks ─────────────────────────────────────────────
    first = steps[0]
    last = steps[-1]
    first_is_orient = "file" not in first and "directory" not in first and "uri" not in first
    last_is_closing = "file" not in last and "directory" not in last and "uri" not in last

    if not first_is_orient and "directory" not in first:
        info.append(
            "First step is a file/uri step — consider starting with a content or directory "
            "orientation step."
        )
    if not last_is_closing:
        info.append(
            "Last step is not a content step — consider ending with a closing/summary step."
        )

    stats = {
        "total_steps": len(steps),
        "file_steps": file_step_count,
        "directory_steps": dir_step_count,
        "content_steps": content_only_count,
        "uri_steps": uri_step_count,
    }

    return {
        "passed": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "info": info,
        "stats": stats,
    }


def print_report(tour_path: str, result: dict) -> None:
    title = f"{BOLD}{tour_path}{RESET}"
    print(f"\n{title}")
    print("─" * 60)

    stats = result.get("stats", {})
    if stats:
        parts = [
            f"{stats.get('total_steps', 0)} steps",
            f"{stats.get('file_steps', 0)} file",
            f"{stats.get('directory_steps', 0)} dir",
            f"{stats.get('content_steps', 0)} content",
            f"{stats.get('uri_steps', 0)} uri",
        ]
        print(f"{DIM}  {' · '.join(parts)}{RESET}")

    errors = result.get("errors", [])
    warnings = result.get("warnings", [])
    info = result.get("info", [])

    for e in errors:
        print(f"  {RED}✗ {e}{RESET}")
    for w in warnings:
        print(f"  {YELLOW}⚠ {w}{RESET}")
    for i in info:
        print(f"  {DIM}ℹ {i}{RESET}")

    if result["passed"] and not warnings:
        print(f"  {GREEN}✓ All checks passed{RESET}")
    elif result["passed"]:
        print(f"  {GREEN}✓ Passed{RESET} {YELLOW}(with warnings){RESET}")
    else:
        print(f"  {RED}✗ Failed — {len(errors)} error(s){RESET}")

    print()


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)

    repo_root = "."
    tour_files = []

    i = 0
    while i < len(args):
        if args[i] == "--repo-root" and i + 1 < len(args):
            repo_root = args[i + 1]
            i += 2
        else:
            tour_files.append(args[i])
            i += 1

    if not tour_files:
        # validate all tours in .tours/
        tours_dir = Path(".tours")
        if tours_dir.exists():
            tour_files = [str(p) for p in sorted(tours_dir.glob("*.tour"))]
        if not tour_files:
            print("No .tour files found. Pass a file path or run from a repo with a .tours/ directory.")
            sys.exit(1)

    all_passed = True
    for tf in tour_files:
        result = validate_tour(tf, repo_root)
        print_report(tf, result)
        if not result["passed"]:
            all_passed = False

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
