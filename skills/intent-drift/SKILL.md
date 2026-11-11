---
name: intent-drift
description: Use when the user asks whether current work still matches the original request, or when an agent has made several edits and is about to continue. Compares the working-tree diff against the stated request and lists out-of-scope changes before more edits are made.
---

# Intent Drift Check

Use this skill when the user asks "are we still on track?", "did we drift?",
"check intent drift", or when an agent has made several edits and is about to
continue.

This skill produces a concrete diff review, not a score. A passing test only
proves the tested behavior; it does not prove the rest of the diff matches the
request.

## Procedure

1. **State the request and its acceptance check.** Write the original request in
   one sentence. Then name the concrete check that decides whether it is done.
   For "make the tests pass", that is the failing test. For other requests, name
   the behavior the user asked for.
2. **Inspect the working tree.** Run:

   ```bash
   git status --short
   git diff --stat
   git diff
   ```

3. **Test every changed hunk for necessity.** For each changed file or hunk, ask:
   *"Does the acceptance check fail without this change?"*
   - **Required** — yes, the acceptance check fails without it.
   - **Out of scope** — no, the check still passes without it.

   Docstrings, type coercion, cleanup, refactors, comment changes, and edits to
   functions the acceptance check never exercises are out of scope unless the
   check genuinely fails without them.

4. **Report in this exact format:**

   ```
   REQUEST: <one sentence>
   ACCEPTANCE: <test or behavior that decides done>
   REQUIRED: <files/functions and why the check fails without them>
   OUT OF SCOPE: <every out-of-scope change, marked "reverted" or "kept because ...">
   VERDICT: <on track | drifted (corrected)>
   ```

5. **If drift is present, stop before making more edits.** Revert only the
   out-of-scope hunks (edit the file back or use `git restore -p`), keep the
   required changes, then re-run the acceptance check and report again. Name
   the reverted changes in `OUT OF SCOPE`; do not report "none" just because
   they are gone from the final diff.

## Rules

- **A test file is the specification.** Changing a test to make it pass is drift
  unless the user explicitly asked you to change the test.
- **Passing tests are not proof of alignment.** Inspect the diff.
- **Do not score alignment or estimate a percentage.** Report concrete changes.
- **Do not revert required changes, tests that define acceptance criteria, or
  user-authored work.**
- **If the request is ambiguous, ask before reverting anything.**

## Worked example

See [examples/real-session.md](examples/real-session.md) for a real GitHub
Copilot CLI session where this check caught unrelated edits and restored the
minimal fix.
