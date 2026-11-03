# Blind test: <skill> <version>

<date> · <model> · <quick check | full test> · <runs per arm> runs per arm

<quick check: what it skipped (calibration, the rewrite into one format) and what the full test would add>

## What was tested

- **Claims:** C1 …; C2 …
- **Target:** <fictional product, one line>, <how agents reached it>
- **Request:** "<word for word, folklore included>"
- **Arms:** baseline (no skill), treatment (<skill> <version>)[, competitor (<name> <version>)]

## Calibration

<full test: two pilot runs of the baseline: what they found; N controls, N discriminating; the revision of the target, if any; the key frozen at sha256 <first 8>…<last 4>. Quick check: skipped, so the roles are guesses>

## Result

<paste the table from score.mjs>

## By class

- **Only with the skill:** <class> — <one example>
- **Only without it:** <class> — <one example>
- **Neither:** <class> — <one example>
- **Traps:** <which were flagged, by which arm, and why the rule over-fired>

## Beyond the key

<real problems agents found that nobody planted, verified on the target>

## What changed in the skill

<fixes, written as classes> → rerun: <new numbers>

## Grading

<run paths stripped, outputs relabelled and, in the full test, rewritten into one format; places lost in the rewrites, if any, and where they sat; who graded>

## Limits

<one target, N runs, one model, key written by the skill's author — whatever applies>
