---
name: agent-instructions-audit
description: 'Grade a repository''s AGENTS.md, .github/copilot-instructions.md, or CLAUDE.md agent instructions (0-100) against a concrete evidence-based rubric. Use when the user asks to review, audit, improve, verify, or score repository instructions for coding agents.'
license: MIT
metadata:
  author: fablerlabs
  source: https://github.com/fablerlabs/claude-md-templates
---

# Agent Instructions Audit

Audit the current repository's agent instructions. Use the path the user names; otherwise
look for `AGENTS.md`, `.github/copilot-instructions.md`, and `CLAUDE.md`. If exactly one
exists, audit it. If several exist, audit each and flag conflicting instructions or an
unclear source of truth. If none exists, say so and suggest scaffolding one instead, then
stop.

Read each instructions file AND spot-check it against reality: open the manifests and CI
configuration it references (or should reference) and verify that its commands and paths
actually exist. An instructions file that lies is worse than none. Read this skill's
`FIELD-GUIDE.md` first for the operating principles and context behind the rubric.

## Rubric — score each, then sum (0–100)

1. **Commands (0–25).** Exact run / test / single-test / lint / build commands present
   and REAL (verified against package.json scripts, Makefile, CI, etc.). Deduct for
   missing single-test invocation, wrong or invented commands.
2. **Map of the repo (0–20).** Says where things live and where new code should go —
   specific paths, not descriptions. Deduct for anything an agent could only learn by
   asking.
3. **Non-obvious conventions (0–20).** The rules a new hire would have to be told:
   invariants, footguns, "we do X here, not Y", what NOT to touch. Deduct for generic
   advice ("write tests", "follow best practices") — each wish-list line is negative
   signal.
4. **Verification loop (0–15).** Tells the agent how to prove a change works (run tests
   and read output, curl the endpoint, screenshot) — not just typecheck.
5. **Terseness & altitude (0–10).** Imperative bullets, no prose padding, ~30–80 lines.
   Deduct for paragraphs of philosophy or duplicated README content.
6. **Freshness (0–10).** References match the current tree (paths exist, scripts still
   in package.json, stack versions not stale).

## Output format

- **Score: N/100** with the six sub-scores on one line each.
- **Worst-first fixes:** numbered list; each item = the problem, why it costs agent
  performance, and the concrete replacement text (write the actual lines, ready to
  paste).
- **Verified-command check:** table of every command in the file → found-in /
  not-found.
- Offer to apply the fixes directly if the user wants.
