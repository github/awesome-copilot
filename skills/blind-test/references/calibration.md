# Calibration

The key marks each planted problem `control` (a strong baseline finds it) or `discriminating` (only the skill should). That mark starts as a guess, and guesses about what a model finds on its own are often wrong: in one code-review round all 12 items predicted as discriminating were found by the baseline in every run, and the test could show nothing. Calibration turns the guess into a measurement before the runs that count.

## When

In the full test (`references/levels.md`): after the target check (step 3 of the loop) and before the first counted run. Write the calibration rule into the decision file before the first pilot: what turns an item into a control, how many discriminating items the decision rule needs, and what happens when there are fewer.

## Pilots

1. **Two pilot runs of the baseline arm**, with the exact prompt the final baseline runs will get, each in its own folder (`pilot-1`, `pilot-2`, apart from the final runs; `references/runs.md`). Same model, same tools, same isolation.
2. **Grade them against the key** with the rules in `references/grading.md`. They don't need to be blind: their arm is known and they don't count in the result.
3. **Set the roles.** Every K that either pilot finds or half-finds gets `"role": "control"`; the rest get `"role": "discriminating"`. `score.mjs` counts its Discriminating column from `role`.
4. **Count.** Enough discriminating items when the decision rule can still be met and each claim the rule leans on keeps at least one. A rule that asks for "two more discriminating K than the baseline" needs at least three, and 6 or more give it room.

## When the target is too easy

Too few discriminating items means the baseline already does what the target asks. Revise the target once:

- Keep 5–8 of the found items as controls, unchanged. They show the target stays fair, and an item kept unchanged keeps the role it earned in the first pilots.
- Fix the other found items in the target's code, so they stop costing the runs reading time.
- Add new problems where the pilots' outputs show their attention was thin: files they never opened, numbers they never ran, assurances they took on faith, tests they read only for familiar shapes. Each new problem is real, observable in what the agents get, and free of tells (`references/target-design.md`).
- Whoever revises the target reads the pilots' outputs and the key and stays away from the skill under test, so the new problems come from what the baseline missed.
- Check the revised target (step 3), then run two new pilots and set the roles again.

One revision only. If the second calibration still leaves too few discriminating items, run the test on the revised target with the calibrated key, and say in the report that the decision rule could not be met with that many items. Each further revision tunes the target to the pilots.

## Freeze the key

Once the roles are set, write the key's sha256 next to the decision rule. From then on nothing in the key changes. Corrections found while grading the pilots (a trap whose text reaches too far, a stray detail in an item) go in before the freeze, apply to both arms alike, and are listed in the calibration record.

## What to keep

`calibration/`: each pilot's prompt and output (with its run path stripped), the grades table, tokens and time, the outcome (which items became controls, which stayed discriminating) and, after a revision, the old-to-new item ids with what was fixed and what was added.

## Limits it adds

Discriminating items are the ones two baseline runs missed. The final baseline runs are new runs and can still find them; that is part of the result, and the report says so. Calibration costs two baseline runs, four with a revision. A quick check skips it, and its report then says the roles are guesses.
