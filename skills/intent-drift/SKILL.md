---
name: intent-drift
description: Use when the user asks whether current work still matches the original request, or when an agent has made several edits and is about to continue. Compares the working-tree diff against the stated request and lists out-of-scope changes before more edits are made.
---

# Intent Drift Check

Use this skill when the user asks "are we still on track?", "did we drift?",
"check intent drift", or when an agent has made several edits and is about to
continue.

This skill produces a concrete diff review, not just a score. A passing test
only proves the tested behavior; it does not prove the rest of the diff matches
the request. Two published packages check that independently, and both run.

## Dependencies

This skill runs both published `intent-drift` packages, pinned to these
versions. Both are maintained by this skill's author. Do not install anything
else yourself and do not float the pins.

- **PyPI:** `intent-drift==0.1.3`, imported as `intent_alignment`.
- **npm:** `intent-drift@1.1.0`, CLI `intent-drift`. Its launcher creates
  `~/.intent-drift-venv` and installs the engine on first run, so Python 3.10+
  and Node 16+ are required.

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

   *"Does the acceptance check fail without this change?"*

   - **Required** — yes, the check fails without it.
   - **Out of scope** — no, the check still passes without it.

   Docstrings, type coercion, cleanup, refactors, comment changes, and edits to
   functions the acceptance check never exercises are out of scope unless the
   check genuinely fails without them. Only judge a whole hunk when it truly
   cannot be split.
4. **Run both packages.** Both implementations are required on every run;
   neither substitutes for the other. Use the request as the goal and a one-line
   summary of the classified changes as the plan.

   PyPI package:

   ```bash
   python3 -m venv .intent-drift-venv
   .intent-drift-venv/bin/pip install --quiet intent-drift==0.1.3
   .intent-drift-venv/bin/python - <<'PY'
   import subprocess
   from intent_alignment import IntentAlignmentEngine
   from intent_alignment.report import render_report

   diff = subprocess.run(
       ["git", "diff", "HEAD"], capture_output=True, text=True
   ).stdout
   report = IntentAlignmentEngine().evaluate({
       "original_goal": {"text": "<request>"},
       "current_plan": {"summary": "<what the diff does>"},
       "execution_context": {"git_diff": diff},
   })
   print(
       f"PYPI status={report.status} alignment={report.overall_alignment:.0f} "
       f"confidence={report.confidence:.0f}"
   )
   print(render_report(report))
   PY
   ```

   npm package:

   ```bash
   npx -y intent-drift@1.1.0 \
     --original-goal "<request>" \
     --current-plan "<what the diff does>" \
     --auto-context \
     --format json
   ```

   The npm CLI exits 1 when alignment is below its default 75% threshold, and
   prints a `Warning: Alignment score ...` line before the JSON in that case.
   Treat the exit code as a drift result, not a crash, and parse from the first
   `{`. If either package cannot run, report that explicitly instead of
   continuing with one result. If either package reports drift, the verdict is
   drift. If they disagree, report both and treat the work as drifted until
   reconciled.
5. **Report in this exact format:**

   ```
   REQUEST: <one sentence>
   ACCEPTANCE: <test suite or behavior that decides done>
   REQUIRED: <files/functions and why the check fails without them>
   OUT OF SCOPE: <every out-of-scope change, marked "reverted" or "kept because ...">
   PYPI: <status>, <alignment>% alignment, <confidence>% confidence
   NPM: <status>, <alignment>% alignment, <confidence>% confidence
   VERDICT: <on track | drifted (uncorrected) | drifted (corrected) | inconclusive>
   ```

   Use `drifted (uncorrected)` when drift exists and has not been dealt with
   yet, including when an out-of-scope change must be kept because it is
   user-authored. Use `drifted (corrected)` only after step 6 is complete.
   Use `inconclusive` when the acceptance check has no passing baseline.
6. **Correct only when the verdict is `drifted (uncorrected)`.** Revert only the
   out-of-scope changes, keep the required changes, then re-run the full
   acceptance check and both packages. A change can live in the index, the
   working tree, or both, and each needs its own revert. Clear the index first,
   then the working tree:

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
   untracked, so the status check is required. Delete out-of-scope new files
   that the agent created (`rm <path>`); keep untracked files that are
   user-authored. Name every reverted change in `OUT OF SCOPE`; do not report
   "none" just because it is gone from the final diff.

## Rules

- **Both packages run every time.** A report with one engine's result is
  incomplete; say which one is missing and why.
- **Tests follow the requested behavior.** Weakening, skipping, or deleting a
  test to make it pass is drift. Updating assertions that encode the old
  behavior is required when the user asked to change that behavior, even if the
  user never mentioned the test file.
- **Passing tests are not proof of alignment.** Inspect the diff.
- **Report concrete changes.** A score alone is not a verdict.
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
Copilot CLI session where this check caught unrelated edits and restored the
minimal fix. That capture predates the packaged engine cross-check.
