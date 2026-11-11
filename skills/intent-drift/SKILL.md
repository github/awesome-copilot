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
   one sentence. Then name the check that decides whether it is done. For "make
   the tests pass", that is the full test suite the request refers to, not only
   the first test that failed: a shared-helper change can need another edit to
   keep an already-passing test green. For other requests, name the behavior the
   user asked for.
2. **Inspect all pending changes.** Changes can be unstaged, staged, or in new
   files, and `git diff` alone shows none of the last two. Run:

   ```bash
   git status --short
   git diff --stat
   git diff
   git diff --cached --stat
   git diff --cached
   ```

   Then read every untracked file that `git status` lists. Review all of these
   sources before judging anything; a staged-only or untracked change is still
   part of the work.
3. **Split each hunk into logical changes.** One hunk often mixes a required fix
   with unrelated edits, so a file-level or hunk-level verdict can hide drift or
   wrongly protect it. Separate each hunk into the smallest independently
   reviewable changes, then test each one:

   *"Does the acceptance check fail without this change?"*

   - **Required** — yes, the check fails without it.
   - **Out of scope** — no, the check still passes without it.

   Docstrings, type coercion, cleanup, refactors, comment changes, and edits to
   functions the acceptance check never exercises are out of scope unless the
   check genuinely fails without them. Only judge a whole hunk when it truly
   cannot be split.
4. **Report in this exact format:**

   ```
   REQUEST: <one sentence>
   ACCEPTANCE: <test suite or behavior that decides done>
   REQUIRED: <files/functions and why the check fails without them>
   OUT OF SCOPE: <every out-of-scope change, marked "reverted" or "kept because ...">
   VERDICT: <on track | drifted (uncorrected) | drifted (corrected)>
   ```

   Use `drifted (uncorrected)` when drift exists and has not been dealt with
   yet, including when an out-of-scope change must be kept because it is
   user-authored. Use `drifted (corrected)` only after step 5 is complete.
5. **Correct only when the verdict is `drifted (uncorrected)`.** Revert only the
   out-of-scope changes (edit the file back or use `git restore -p`), keep the
   required changes, then re-run the full acceptance check. If a revert makes
   the check fail, that change was required: restore it and reclassify it.
   Report again as `drifted (corrected)` only after the reversions are complete
   and the check passes. Name every reverted change in `OUT OF SCOPE`; do not
   report "none" just because it is gone from the final diff.

## Rules

- **Tests follow the requested behavior.** Weakening, skipping, or deleting a
  test to make it pass is drift. Updating assertions that encode the old
  behavior is required when the user asked to change that behavior, even if the
  user never mentioned the test file.
- **Passing tests are not proof of alignment.** Inspect the diff.
- **Do not score alignment or estimate a percentage.** Report concrete changes.
- **Do not revert required changes, tests that define acceptance criteria, or
  user-authored work.**
- **If the request is ambiguous, ask before reverting anything.**

## Worked example

See [examples/real-session.md](examples/real-session.md) for a real GitHub
Copilot CLI session where this check caught unrelated edits and restored the
minimal fix.
