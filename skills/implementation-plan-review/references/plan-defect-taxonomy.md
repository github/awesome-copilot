# Plan defect taxonomy

Twelve shapes that show up in real plans, with the sentence that gives it away and the
question that exposes it. Use this when a finding is hard to name.

## 1. Phantom symbol

> "Update `retry_with_backoff` in `src/http.py` to use the new timeout."

The function does not exist, or lives elsewhere, or is named differently.

**Ask:** what exact line does it live on? If the plan cannot name it, it is guessing.

## 2. Signature drift

> "Pass the new option through to `create_client()`."

The function exists but takes positional arguments, or the option does not reach it.

**Ask:** show the current signature and the call site.

## 3. Constraint amnesia

> "I'll update the docs and rename the flag while I'm here."

The user said not to rename the flag; or the repo treats that flag as published API.

**Ask:** which constraint allowed this step?

## 4. Silent deletion

> "Simplify `report.py` by removing the legacy branch."

The branch handles stored data or an untested path. "Legacy" is a feeling, not evidence.

**Ask:** what breaks if that branch is the only one that handles old rows?

## 5. Cleanup creep

> "Also reformat the touched files."

The diff becomes unreviewable, and rollback now includes formatting noise.

**Ask:** is any part of this step required by the requirement?

## 6. Verification vacuum

> "Implement, then we'll see if it works."

No test, no command, no assertion. Nobody can tell success from silence.

**Ask:** what command will fail before the change and pass after it?

## 7. Rollback gap

> "Run the migration, then update the model."

No reverse path, and the order leaves the schema ahead of the code.

**Ask:** if step 3 is wrong, what do we run to get back?

## 8. Broken window

> "Steps 2 through 7 will not compile until step 8."

The tree is unusable for six steps, so nothing can be verified in between.

**Ask:** can this be reordered so every step leaves a working tree?

## 9. Self-clearance

> "This part is probably fine, no need to test it."

The planner noticed a gap and talked itself past it.

**Ask:** what would you need to see to be sure?

## 10. Unsupported inheritance

> "The helper already handles retries."

Nobody opened the helper. It may retry once, or not at all, or only on 5xx.

**Ask:** quote the line that retries.

## 11. Circular standard

> "Behaviour X is the spec, because that is how it behaves."

Current behaviour may be the bug the user is reporting.

**Ask:** where is that written down outside the code under change?

## 12. False precision

> "This adds about 5ms."

No measurement, no baseline. Precision without a source reads as confidence and is not.

**Ask:** measured where, against what?

---

## Ordering a report

When several findings compete, rank by cost of being wrong:

1. data loss, security, irreversible migration
2. wrong result that ships quietly
3. a plan step that cannot be undone cheaply
4. missing verification
5. scope and size

Two findings at the same rank: put the one that is cheaper to fix first.
