#!/usr/bin/env python3
"""PreToolUse guard, deny irreversible agent actions before they execute.

Wire this into .claude/settings.json (see hooks.json in this directory). It reads the hook
payload on stdin and denies commands whose mistakes cannot be undone.

Design notes worth keeping if you adapt this:

  * Aim at IRREVERSIBLE and OUTWARD-FACING actions only. Git makes ordinary code changes
    cheap to undo, so gating them produces an agent that fights the harness and a user who
    turns the hook off. Rotated credentials and dropped tables are the real targets.

  * The deny REASON is the device. The agent reads it and acts on it, so a bare "denied"
    produces a creative workaround, often worse than the original command. Say what was
    blocked, why, and what to do instead.

  * Fail open on unexpected input. A hook that crashes on an unusual payload blocks all
    tool use, which is its own outage.
"""

from __future__ import annotations

import json
import re
import sys

# (pattern, reason). Reasons are written for the agent to act on, not for a log.
RULES: list[tuple[str, str]] = [
    # --force-with-lease is the safe form and must stay allowed, so the lookahead sits
    # directly after "--force" rather than at the end of the line.
    (r"\bgit\s+push\b.*(--force(?!-with-lease)|(?<![\w-])-f(?![\w-]))",
     "Force-push can destroy commits that exist only on the remote. "
     "Use --force-with-lease if you must rewrite, and ask the user before rewriting shared history."),

    (r"\bgit\s+(reset\s+--hard|checkout\s+--?\s*\.|clean\s+-[a-zA-Z]*f)",
     "This discards uncommitted work irreversibly. "
     "Stash it first (git stash -u) or ask the user what to keep."),

    (r"\bgit\s+commit\b.*--no-verify",
     "--no-verify skips the pre-commit hooks, which exist to stop mistakes reaching main. "
     "Fix what the hooks report instead of bypassing them."),

    (r"\brm\s+-[a-zA-Z]*[rR][a-zA-Z]*f|\brm\s+-[a-zA-Z]*f[a-zA-Z]*[rR]",
     "Recursive force-delete is irreversible and a wrong or empty path variable deletes far "
     "more than intended. Delete specific paths, or ask the user to run it themselves."),

    (r"\b(DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE)\b",
     "Destructive DDL is irreversible. Use expand/contract: add the new shape, migrate, and "
     "drop in a separate later change that a human approves."),

    (r"\bDELETE\s+FROM\b(?!.*\bWHERE\b)|\bUPDATE\b(?!.*\bWHERE\b).*\bSET\b",
     "An unbounded DELETE or UPDATE affects every row. Add a WHERE clause. If a full-table "
     "operation is genuinely intended, ask the user to confirm and run it themselves."),

    (r"\bterraform\s+(apply|destroy)\b(?!.*-help)",
     "Infrastructure changes are outward-facing and often irreversible. Run 'terraform plan', "
     "show the user the output, and let them apply it."),

    (r"\bkubectl\s+delete\b|\bhelm\s+(delete|uninstall)\b",
     "Deleting cluster resources can take down running services. Show the user what would be "
     "deleted and let them run it."),

    (r"\b(npm|pnpm|yarn)\s+publish\b|\bcargo\s+publish\b|\btwine\s+upload\b",
     "Publishing is public and effectively permanent: a released version cannot be unreleased. "
     "This is the user's decision to make."),

    (r"\bgh\s+(repo\s+delete|release\s+delete|secret\s+set)\b",
     "This changes repository state or secrets outside the working tree. Ask the user to run it."),

    (r"\bchmod\s+-R\s+777\b",
     "World-writable permissions are a security hazard. Set the narrowest permission that works."),

    (r">\s*/dev/sd|\bmkfs\b|\bdd\s+.*of=/dev/",
     "This writes directly to a block device and destroys data unrecoverably."),
]

# Paths an agent should not read or write. Reading a secret matters as much as writing one:
# it can be echoed into a log, a commit, or a message to a third party.
# .env.example / .sample / .template hold the SHAPE of the config, not the values, and the
# deny message below points the agent at them, so denying them would block the alternative
# the device recommends.
PROTECTED_PATHS = re.compile(
    r"(^|/)\.env($|\.(?!example|sample|template|dist))"
    r"|(^|/)\.aws/credentials|(^|/)\.ssh/id_|(^|/)\.npmrc|(^|/)\.pypirc"
)


# poka-yoke: blocks irreversible agent actions before they execute [control]
def deny(reason: str) -> None:
    json.dump({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": f"[poka-yoke] {reason}",
        }
    }, sys.stdout)
    sys.exit(0)


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)  # fail open: a crashing hook blocks all tool use

    tool = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}

    if tool == "Bash":
        command = tool_input.get("command", "")
        for pattern, reason in RULES:
            if re.search(pattern, command, re.IGNORECASE):
                deny(f"{reason}\n\nBlocked command: {command[:200]}")

    if tool in ("Read", "Edit", "Write", "NotebookEdit"):
        path = tool_input.get("file_path", "") or tool_input.get("notebook_path", "")
        if path and PROTECTED_PATHS.search(path):
            deny(
                f"'{path}' holds credentials. Reading them risks echoing a secret into a log, "
                "a commit, or a message to a third party. Use .env.example for the shape of "
                "the config, and ask the user for any value you actually need."
            )

    sys.exit(0)


if __name__ == "__main__":
    main()
