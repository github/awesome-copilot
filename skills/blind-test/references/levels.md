# Levels

Two levels, chosen before anything is built. Both keep the method: claims first, a key and a decision rule written before any run, a fictional target, the same request in every arm, fresh isolated runs, blind grading against the key. The full test adds what lets a number hold up in public.

| | Quick check | Full test |
|---|---|---|
| For | "Is this skill any good?", "does my change help?", an hour to spare, a small skill, a decision you make yourself | numbers for a listing, a post or a README; "prove it"; a result someone else will rely on |
| Key | 6–8 K, 2–3 T, a folklore line when a claim needs one | sized to the claims (`references/key-format.md`) |
| Calibration | skipped: the roles stay guesses | two baseline pilots, four with a revision of the target; the key frozen by its sha256 |
| Runs per arm | two | two, and three or more before a public number |
| Grading | run paths stripped, outputs relabelled, one grader | stripped, relabelled, rewritten into one neutral format, checked with `refcheck.mjs`, graded in pieces |
| Agents started | about five: four runs and a grader | 11 or more |
| What it can say | a direction: where the arms differ on this target, two runs each | a number with its range and its limits |

In our runs on Haiku, one full test of a plain request ("check whether this code-review skill is any good") started 13–16 agents and took 90–110 minutes: four pilots after one revision of the target, four or five counted runs, four rewrites and one to four graders. The same request without Blind Test took 6–14 minutes and ran no comparison.

## Choosing

1. **The request decides when it can.** "Prove", "for the listing", "numbers I can publish", "before I publish" → the full test. "Quick", "is it any good", "does it help", a small budget → the quick check.
2. **Otherwise ask, with the cost.** Name both levels in two lines, with what each gives and what it costs, and ask which one. For example: "A quick check: two runs per arm and one grader, about five agents; it shows a direction on this target. The full test adds calibration and a rewrite of every output into one format, 11 or more agents and on a small model about an hour and a half; its numbers can go into a listing. Which one?"
3. **When you can't ask** (you run as a subagent, or the person said to go ahead without questions), take the quick check and say so in the first line of the report, together with what the full test would add.

## The quick check

The loop in `SKILL.md`, with these changes:

- **Step 1.** The three to five claims that matter most. 6–8 K, 2–3 T, and a folklore line only when a claim is about following the truth over the request. The decision rule is written before any run, as in the full test. The roles are a first guess and stay one.
- **Step 4 is skipped.** The report says the roles are guesses. An item both arms find shows the target is fair and says nothing yet about the skill.
- **Step 5.** Two runs per arm, interleaved, each a fresh agent in its own folder.
- **Step 6.** Strip the run paths and relabel; the outputs keep their own format. One grader grades them one at a time. The report says a skill's format may have given its arm away.
- **Step 9.** The report opens with "Quick check": what was skipped and what the full test would add.

A quick check's numbers stay in your notes. A number for a listing comes from the full test.

## From a quick check to the full test

Keep the claims, the key and the target. The quick check's runs don't count in the full test: calibrate on two fresh pilots, revise the target once if needed, freeze the key, then run the counted runs. The report says the key's author had seen the quick check's outputs.
