#!/usr/bin/env python3
"""Weekly maintainer summary for intent-drift.

Prints a short digest of the last 7 days that answers one question:
"is the project still moving toward ROADMAP.md?"

Requires the `gh` CLI authenticated with repo read access (uses GH_REPO or the
current repo). Run manually or from the weekly-review workflow:

    python3 scripts/weekly_summary.py
"""

from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
import sys


def gh(*args: str) -> str:
    env = os.environ.copy()
    repo = os.environ.get("GH_REPO", "")
    if repo:
        env["GH_REPO"] = repo
    try:
        out = subprocess.run(["gh", *args], capture_output=True, text=True, check=True, env=env)
        return out.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"gh {' '.join(args)} failed: {e.stderr}", file=sys.stderr)
        raise


def since_week() -> str:
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)).isoformat()


def main() -> None:
    merged = json.loads(
        gh(
            "pr",
            "list",
            "--state",
            "merged",
            "--limit",
            "50",
            "--json",
            "number,title,mergedAt,author,headRefName",
        )
        or "[]"
    )
    open_prs = json.loads(
        gh("pr", "list", "--state", "open", "--limit", "100", "--json", "number,title,author")
        or "[]"
    )
    up_for_grabs = json.loads(
        gh("issue", "list", "--state", "open", "--label", "up for grabs", "--json", "number,title")
        or "[]"
    )

    cutoff = since_week()
    recent = [p for p in merged if p.get("mergedAt", "") >= cutoff]

    print("=" * 60)
    print("intent-drift weekly maintainer summary")
    print("=" * 60)

    print(f"\n## Merged in the last 7 days ({len(recent)})")
    if recent:
        for p in recent:
            print(f"  - #{p['number']} {p['title']} (by {p['author']['login']})")
        print("\n> Direction check: read the CHANGELOG diff — does each merged PR move")
        print("> toward a ROADMAP milestone (M1/M2/M3)? Anything that doesn't is drift.")
    else:
        print("  (none)")

    by_author: dict[str, int] = {}
    for p in open_prs:
        by_author[p["author"]["login"]] = by_author.get(p["author"]["login"], 0) + 1

    print(f"\n## Open PRs ({len(open_prs)}, cap is 3 per author)")
    for author, count in sorted(by_author.items(), key=lambda kv: -kv[1]):
        flag = "  <-- over cap" if count > 3 else ""
        print(f"  - {author}: {count}{flag}")
    if not by_author:
        print("  (none)")

    print(f"\n## Up-for-grabs backlog ({len(up_for_grabs)} open)")
    for i in up_for_grabs:
        print(f"  - #{i['number']} {i['title']}")
    if not up_for_grabs:
        print("  (empty — pick next milestones from ROADMAP.md)")

    print("\n" + "=" * 60)
    print("Still toward the roadmap? (GO / HOLD / PAUSE-and-reset)")
    print("=" * 60)


if __name__ == "__main__":
    main()
