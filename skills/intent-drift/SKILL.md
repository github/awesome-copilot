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
request. It uses only `git` and the repository's existing acceptance command;
it does not install or run external scoring packages.

## Procedure

1. **State the request and its acceptance check.** Write the original request in
   one sentence. Then name the check that decides whether it is done. For "make
   the tests pass", that is the full test suite the request refers to, not only
   the first test that failed: a shared-helper change can need another edit to
   keep an already-passing test green. Include any security constraint the
   change must preserve (authorization, input validation, secret handling) in
   the check.
2. **Inspect all pending changes.** Changes can be unstaged, staged, or in new
   files, and `git diff` alone shows none of the last two. Run:

   ```bash
   git status --short --untracked-files=all
   git diff --stat
   git diff
   git diff --cached --stat
   git diff --cached
   ```

   `--untracked-files=all` is required: plain `git status --short` collapses a
   new directory to `?? newdir/`, and can omit untracked files entirely when
   `status.showUntrackedFiles` is disabled. Read every untracked file the
   command lists. Review all of these sources before judging anything; a
   staged-only or untracked change is still part of the work.
3. **Confirm a passing baseline, then split each hunk into logical changes.**
   Run the acceptance check on the current tree. If it does not pass, the
   necessity test has no baseline and would mislabel unrelated breakage as
   required: report `VERDICT: inconclusive`, show what is failing, and pause
   before reverting anything.

   One hunk often mixes a required fix with unrelated edits, so a file-level or
   hunk-level verdict can hide drift or wrongly protect it. Separate each hunk
   into the smallest independently reviewable changes, then test each one:

   *"Does the acceptance check fail without this change, or does the stated
   request or a required security/input-validation constraint require it?"*

   - **Required** — yes, the check fails without it, or the change directly
     implements part of the stated request or a required security/input-validation
     constraint. If the current acceptance check does not cover that required
     control, keep it, add the missing coverage or flag it for human review, and
     do not revert it.
   - **Out of scope** — no, the check still passes without it and it does not
     implement part of the stated request or a required constraint.

   Do not treat a change as out of scope merely because it was not named in the
   prompt; compare it against the stated request, acceptance check, and required
   constraints. Docstrings, type coercion, cleanup, refactors, comment changes,
   and edits to functions the acceptance check never exercises are often out of
   scope, but only when they are not explicitly requested and not required by a
   security/input-validation constraint. If classification is ambiguous, ask
   before reverting. Only judge a whole hunk when it truly cannot be split.
4. **Report in this exact format:**

   ```
   REQUEST: <one sentence>
   ACCEPTANCE: <test suite or behavior that decides done>
   REQUIRED: <files/functions and why the check fails without them>
   OUT OF SCOPE: <every out-of-scope change, marked "reverted" or "kept because ...">
   VERDICT: <on track | drifted (uncorrected) | drifted (corrected) | inconclusive>
   ```

   Use `drifted (uncorrected)` when drift exists and has not been dealt with
   yet, including when an out-of-scope change must be kept because it is
   user-authored. Use `drifted (corrected)` only after step 5 is complete.
   Use `inconclusive` when the acceptance check has no passing baseline.
5. **Correct only when the verdict is `drifted (uncorrected)`.** Revert only the
   out-of-scope changes, keep the required changes, then re-run the full
   acceptance check. A change can live in the index, the working tree, or both,
   and each needs its own revert. Clear the index first, then the working tree:

   ```bash
   git restore --staged -p             # staged hunks: remove from the index
   git restore -p                      # working-tree hunks: remove from files
   ```

   That order matters. For a staged-only change the working tree already
   matches the index, so restoring the working tree first does nothing; resetting
   the index afterwards would only unstage the drift and leave it in the files.

   Edit the file and stage the correction when that is clearer. If a revert
   makes the check fail, that change was required: restore it and reclassify
   it. Before reporting `drifted (corrected)`, confirm the drift is gone from
   every source:

   ```bash
   git status --short --untracked-files=all
   git diff
   git diff --cached
   ```

   Both diffs omit untracked files, and unstaging a newly added file leaves it
   untracked, so the status check is required. Do not delete untracked files by
   default. Only remove an out-of-scope untracked file if you created it in this
   task and it is clearly not user-authored work; if that is uncertain, keep it,
   report it, and ask before deleting. Name every reverted or kept out-of-scope
   change in `OUT OF SCOPE`; do not report "none" just because it is gone from
   the final diff.

## Rules

- **Tests follow the requested behavior.** Weakening, skipping, deleting, or
  bypassing a test to make it pass is drift (for example, broadening assertions,
  commenting out checks, or adding skip/xfail/todo markers) unless the user
  explicitly asked to remove or relax that coverage. Updating assertions that
  encode the old behavior is required when the user asked to change that
  behavior, even if the user never mentioned the test file. If a test is wrong or
  obsolete, explain why, keep or replace its coverage where appropriate, and get
  confirmation before removing it.
- **Passing tests are not proof of alignment.** Inspect the diff.
- **Report concrete changes.** Base the verdict on the request, the acceptance
  check, and the diff. This skill does not run PyPI/npm engine checks and does
  not rely on an external alignment score to decide the verdict.
- **Do not revert required changes, tests that define acceptance criteria, or
  user-authored work.**
- **Security controls are required until the user says otherwise.** An
  authorization check, input validation, escaping, or secret handling is not
  out of scope just because the acceptance suite passes without it. Keep it,
  add it to the acceptance check, and flag it for human review rather than
  reverting it.
- **If the request is ambiguous, ask before reverting anything.**

## Worked example

See [examples/real-session.md](examples/real-session.md) for a real GitHub
Copilot CLI session (kept as a historical transcript) and an illustrative
current-procedure walkthrough that applies this package-free diff-review flow,
including keeping and flagging input-validation changes for human review.
