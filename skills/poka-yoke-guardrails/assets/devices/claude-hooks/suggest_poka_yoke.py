#!/usr/bin/env python3
"""UserPromptSubmit hook, turn auto-triggering from a hope into a device.

Claude Code skills are documented as model-invoked, and in practice they often are not.
This is a widely reported platform behaviour, not a defect in any one description:
anthropics/claude-code#9716 collects reports of skills being ignored even when the query
exactly matches the description. Testing this plugin found the same, five realistic queries
across four modes, zero skill invocations.

The plugin's own argument applies to the plugin: if the behaviour you want depends on the
model remembering to look, that is rung zero. So install a device.

What does NOT work, per Scott Spence's write-up of the same problem: a hook that emits a
gentle reminder, "check .claude/skills/ for something relevant", is treated as background
noise. The model acknowledges it and proceeds anyway.

What does work is naming the specific skill and instructing its use. That is what this does:
match the prompt against each mode's trigger vocabulary, and if one matches, inject an
explicit instruction to load that skill.

    # poka-yoke: makes skill invocation explicit rather than hoping the model volunteers [warning]

This is Warning rung, not Control. The injected instruction is still an instruction, and the
model can still decline, Spence's verdict after living with it is "for anything important,
invoke it explicitly." Treat this as convenience for the common case, and use the slash
command when it matters.

Install in .claude/settings.json:

    {"hooks": {"UserPromptSubmit": [{"hooks": [{"type": "command",
      "command": "python3 \\"${CLAUDE_PROJECT_DIR}\\"/.claude/hooks/suggest_poka_yoke.py"}]}]}}
"""

from __future__ import annotations

import json
import re
import sys

# Ordered: the first match wins, so put the specific modes ahead of the general ones.
# Patterns are deliberately narrow. A hook that fires on every prompt is noise, and noise
# gets the hook removed: the same failure mode as a guardrail that cries wolf.
MODES: list[tuple[str, str]] = [
    ("authz",
     r"\b(tenant|multi.?tenant|idor|cross.?tenant|row.?level security|rls)\b.*"
     r"\b(isolat|scope|leak|filter|see (each )?other)|"
     r"\b(one|another) (customer|tenant|user)('s)? (data|documents|records)\b"),

    ("agent-guardrails",
     r"\b(claude|the agent|codex|cursor|copilot)\b.*\b(keeps?|still|ignor|won'?t stop)\b|"
     r"\bCLAUDE\.md\b.*\b(ignor|says|but it)\b|"
     r"\b(stop|prevent) (the )?(agent|claude)\b"),

    ("llm",
     r"\b(prompt injection|structured output|hallucinat)\b|"
     r"\b(our|the) (bot|ai|llm|model|agent)\b.*\b(returns?|extracts?|calls?|refunds?|sometimes)\b"),

    ("data",
     r"\b(dashboard|pipeline|warehouse|dbt|etl|metric|revenue)\b.*"
     r"\b(wrong|silently|nulls?|stale|didn'?t notice|coalesc)\b"),

    ("ops",
     r"\b(drop(ping)? (a )?column|migration|expand.?contract|blast radius|kill switch)\b|"
     r"\b(deploy|ship|merge)\b.*\b(friday|risky|safe|rollback|irreversible)\b"),

    ("ux",
     r"\b(users?|customers?)\b.*\b(accident|by mistake|keep deleting|panic)\b|"
     r"\b(confirm(ation)? (dialog|modal)|are you sure|undo)\b"),

    ("retro",
     # "root cause" and "incident" were missing, so the single most standard way anyone
     # describes this work, "do a root cause on last night's outage", got silence.
     r"\b(happened again|second time|third time|keeps? happening|postmortem|post.?mortem|"
     r"never happens? again|prevent .*recurr|root.?cause|incident review|"
     r"(after|following) (the|an|last night'?s) (incident|outage))\b|"
     r"\b(incident|outage|we (double.?charged|dropped|lost|corrupted|deleted))\b"
     r"[^.?!]*\b(root.?cause|why|how did|what went wrong|so it (does not|doesn'?t) happen)\b"),

    ("guardrails",
     r"\b(pre.?commit|ci gate|required check|branch protection|lint rule)\b|"
     r"\b(we (agreed|said)|team agreed)\b.*\b(still|don'?t|nobody)\b|"
     r"\benforce\b.*\b(so (people|they) can'?t|instead of (asking|documenting))\b"),

    ("design",
     # The jargon alternatives fire only for people who already know the vocabulary. Someone
     # who says "design the types for our state machine so bad states can't exist" wants this
     # mode and was getting silence, which made the README's claim that all ten modes route
     # false for the one mode the README tells people to start with.
     # `design` sits below `ux`, `ops` and `authz`, so "redesign the deletion flow" is still
     # claimed by ux before it reaches here.
     r"\b(invalid states? unrepresentable|make it impossible to|so (you|people) can'?t "
     r"(accidentally|screw)|typestate|discriminated union|branded type)\b|"
     r"\bwhat should (the )?(types?|signature|api)\b.*\blook like\b|"
     r"\b(design|model|write|writing|about to write)\b[^.?!]*\b(api|sdk|types?|schema|"
     r"interface|signature|state machine|enum|data model)\b|"
     r"\b(api|types?|schema|interface)\b[^.?!]*\b(hard|impossible|difficult) to (mis)?use\b"),

    ("audit",
     r"\b(footgun|easy to (mis)?use|what could (go wrong|bite)|mistake.?proof|error.?proof|"
     r"poka.?yoke|poke.?yoke|foolproof)\b"),
]

TEMPLATE = (
    "[poka-yoke] This request matches the `{skill}` skill, which carries a specific method "
    "for it, classify the mistake, pick the strongest device that prevents it, and say which "
    "rung that reaches. Load `{skill}` and follow it before answering. If it turns out not to "
    "fit, say so in one line and answer normally."
)


def main() -> None:
    try:
        prompt = (json.load(sys.stdin).get("prompt") or "")
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)  # fail open: a broken hook must not block every prompt

    if len(prompt) > 4000:
        prompt = prompt[:4000]

    for skill, pattern in MODES:
        if re.search(pattern, prompt, re.IGNORECASE):
            print(TEMPLATE.format(skill=skill))
            break
    sys.exit(0)


if __name__ == "__main__":
    main()
