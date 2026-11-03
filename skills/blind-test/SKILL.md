---
name: blind-test
description: Prove whether an agent skill, harness, prompt, rule file or plugin actually changes what an agent does, with a blind test scored against a hidden answer key. Builds a fictional target with planted problems and traps (legitimate decisions that look like mistakes), writes the key before any run, runs the same request with and without the skill in isolated agents, grades the outputs without knowing which arm produced them, and reports what changed, what didn't and what the numbers can honestly claim. It has two levels, a quick check by default and the full test with calibration and normalization when the numbers go public. Use when someone asks "does my skill work", "is it any good", "is it better than the free ones", "prove it before I publish", wants numbers for a skill listing, or is about to tune a skill by feel.
summary: Blind tests for agent skills, scored against a hidden key, with traps that catch false alarms.
version: 1.3.0
tags: [agent-skills, evaluation, blind-test, ab-test, benchmarking, claude-code, prompts, agent-harness]
---

# Blind test

A skill is a claim: "with me, the agent does X better." A blind test checks the claim the way a careful reviewer would. The agent gets a target and a request. The answer — a key of planted problems and traps — is written before any run and kept where the agents can't see it. Every output is graded against the key, without knowing which arm produced it.

Two things make this different from asking a model to judge two outputs:

- **The key is ground truth.** A finding either matches a planted problem or it doesn't. A judge's taste doesn't enter.
- **Traps measure false alarms.** A skill that makes the agent flag everything finds more problems and is worse. Traps are legitimate decisions that look like mistakes; reporting one as a failure counts against the arm.

## 0. Before anything

Find out, from the files first and the user second:

1. **The claim.** One sentence per thing the skill says it changes: "finds data that disagrees with itself", "doesn't report 44 px as a WCAG AA failure", "builds lists that survive ten times the items". No claim, no test: a test without claims measures noise.
2. **The test type.** *Review* (the agent finds problems in something that exists) or *Build* (the agent makes something from a brief). Many skills need both. Read `references/build-tests.md` for Build.
3. **The arms.** Baseline (same agent, no skill) always. Treatment (with the skill). Optionally a competitor skill, installed in a sandbox (`references/runs.md`). When the change is the harness itself, the arms are one harness with and without a setting, or two harnesses on the same model (`references/runs.md`, Harnesses).
4. **The model.** Start with the smallest model the skill is meant for: a skill's effect shows most where the model is weakest, and runs are cheap. Confirm on a larger one only if the result is borderline.
5. **The level** (`references/levels.md`). A *quick check* shows a direction: one target, 6–8 K, 2–3 T, the key and the decision rule before any run, two runs per arm, one blind grader, about five agents. The *full test* adds calibration (two baseline pilot runs, four when the target needs its revision), the rewrite of every output into one format before grading and, before a public number, three or more runs per arm; in our runs on Haiku it started 13–16 agents and took 90–110 minutes. Take the full test when the request asks for proof or for numbers that go public, and the quick check when it asks whether a skill is any good. Otherwise name both with their cost and ask. If you can't ask (you run as a subagent, or were told to go ahead without questions), take the quick check and say so in the first line of the report. At either level, one run per arm is a demo, two show the spread, three or more come before a published number; record tokens per run.

## 1. Read what applies

| If | Read |
|---|---|
| Always | `references/levels.md`, `references/target-design.md`, `references/key-format.md`, `references/runs.md`, `references/grading.md` |
| The full test | `references/calibration.md` |
| The skill builds things | `references/build-tests.md` |
| The numbers go into a listing, a post or a README | `references/report.md` |

## 2. The rules of a fair test

1. **The key is written before the first run** and never edited to match an output. A real problem found by an agent but not planted goes into the key as *found beyond the key*, credited to that run only.
2. **Every claim has at least one planted problem that discriminates.** If the baseline would find it anyway, it doesn't test the skill: keep it as a control, which shows the target is fair. Pilot runs of the baseline decide which is which (`references/calibration.md`); before them, and in a quick check that skips them, the roles are a guess.
3. **Every claim that could cause false alarms has a trap.** A rule against uppercase labels needs a legitimate uppercase label; a rule about 24 px targets needs a 20 px button with spacing.
4. **The target is fictional.** No real brand, product or person. Real names leak the answer from training data and drag third parties into a published test.
5. **Agents see only the target, the request and (in the treatment arm) the skill.** The key, other runs, this skill's files and, when the test is about the rendered result, the target's source stay out of their reach.
6. **The request is identical, word for word**, in every arm. Only the skill changes. If the request contains folklore (a common wrong belief the skill corrects), it's the same folklore in every arm.
7. **Nothing the agents do touches anything real.** Targets run on localhost; every state-changing request is logged (`scripts/target-server.mjs` writes `posts.log`), and a non-empty log is itself a finding. Every file the test writes stays inside the test folder, the runs' scratch files and your own probes and logs included: a file left in `/tmp` or in a session scratchpad counts as a side effect.
8. **Grading is blind.** Outputs are relabelled before grading (`scripts/blind-labels.mjs`); the grader learns which arm is which after the scores are written. Run paths are stripped before the labels. In the full test every output is also rewritten into one neutral format after them, so a skill's format doesn't name its arm (`scripts/refcheck.mjs` checks the rewrite lost no place); a quick check keeps each output's own format and says it may give the arm away.
9. **Fixes go to classes, then the test runs again** — on the same target to confirm, and on a fresh one before you publish, so the skill isn't tuned to one key.

## 3. Loop

The full test runs every step. A quick check skips step 4, keeps two runs per arm in step 5 and skips the rewrite in step 6 (`references/levels.md`).

1. **Claims → key.** Write the claims, then for each claim the planted problems (K), traps (T), and the folklore line for the request (`references/key-format.md`). Mark which K are controls (a strong baseline should find them) and which discriminate, as a first guess; calibration (step 4) settles it. Write the decision rule now, before any run: what result means the skill helps ("treatment finds at least two more discriminating K than baseline in every run, with no more traps flagged"), and the calibration rule with it. Keep `key.json` outside every folder an agent can read.
2. **Target.** Build it from the key (`references/target-design.md`): realistic, internally consistent, no comments or names that give a planted problem away. Serve it with `scripts/target-server.mjs` or hand over a folder copy.
3. **Check the target before any run.** Every K is actually present and observable; every T is actually legitimate; nothing else is accidentally broken (or, if it is, it's in the key as R, a real issue).
4. **Calibrate** (full test; `references/calibration.md`). Two pilot runs of the baseline, with the final prompt, graded against the key. Every K a pilot finds or half-finds becomes a control; the rest discriminate. Too few discriminating items means the target is too easy: revise it once, where the pilots' attention was thin, check it again and run two new pilots. Then freeze the key and write its sha256 next to the decision rule. Pilots don't count in the result.
5. **Runs.** Same request, isolated agents, one folder per run (`references/runs.md`). Confirm each treatment run actually used the skill; record tokens and time.
6. **Blind grading** (`references/grading.md`). Strip run paths from the outputs and relabel them; in the full test, rewrite each into one neutral format and check with `scripts/refcheck.mjs` that no place was lost. Then grade each against the key: found, partial, missed; traps reported as failures; folklore corrected or repeated; side effects. Then unblind.
7. **Score.** `scripts/score.mjs key.json grades.json` → the table per arm, and the classes only the treatment found.
8. **Fix and rerun.** Misses and false alarms become fixes to the skill, written as classes. Rerun the same arms. Before publishing, one more run on a target the skill was never tuned on.
9. **Report** (`references/report.md`): what was tested, the calibration, the table, what only the skill found, what it missed, and the honest limits.

## 4. When the result is bad

A treatment that finds less, or flags more traps, than the baseline is the most useful result this test produces. Report it as it is, find the rule that caused it (an imperative without its exception is the usual suspect), fix it, rerun. Never drop a trap or soften the key to rescue a number.

## 5. Hand-over

- The level, and for a quick check what it skipped and what the full test would add.
- The claims, and which held.
- The calibration (full test): what the pilots found, which items became controls, and any revision of the target.
- The table per arm: planted found, partial, missed; traps flagged; folklore; side effects; tokens.
- What only the treatment found, what only the baseline found, what neither did.
- The fixes made to the skill and the rerun result.
- The limits, in one sentence, next to any number that leaves the room.
