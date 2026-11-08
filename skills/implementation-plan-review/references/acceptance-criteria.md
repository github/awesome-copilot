# Acceptance criteria that can fail

A criterion is useless if no observation can contradict it. Most plans produce criteria that
are true by construction ("code is clean", "change is complete"), which is why they pass.

## Three rules

**1. One criterion, one observation.**
If answering it needs two checks, split it. A criterion containing "and" is two criteria.

**2. Name the observation, not the intention.**

| Cannot fail | Can fail |
|---|---|
| The change is complete | Every file in the scope list appears in the diff, and no other file does |
| Tests still pass | `pytest tests/test_billing.py -q` passes, and it failed before the change |
| Performance is fine | `python -m bench.list_users` runs under 200ms on the fixture dataset |
| Error handling added | Passing `None` to `parse_date` returns a typed error instead of raising |
| Backwards compatible | The old call `client.get(url, timeout=5)` still works, in a test |

**3. Write it before the plan is executed, answer it after.**
A criterion invented after the diff is a description of the diff. Ask the agent to write the
criteria in the retake note, before re-planning.

## Good criteria for common plan shapes

### Refactor
- The public functions in `<module>` keep their names and signatures.
- The existing test suite passes with no test file modified.
- The diff touches only `<paths>`, and the touched line count is under `<n>`.

### Behaviour change
- `<input>` now produces `<output>`; the same input before the change produced `<other>`.
- One test exists that fails on the old code and passes on the new code.
- `<untouched behaviour>` still passes its existing test.

### Migration
- Running the migration twice does not error and does not duplicate data.
- The rollback command restores the previous schema on a copy of the fixture database.
- Rows written by the old code path read correctly under the new code path.

### Dependency upgrade
- The lockfile changed for exactly the intended package and its transitive deps.
- The app boots and the `<critical path>` test passes.
- No call site of a removed API remains: a grep for `<old_method>` returns nothing.

### Bug fix
- A test reproduces the reported symptom and fails before the fix.
- The fix does not change unrelated output: `<golden file>` is byte-identical.

## Smells in a criteria list

- **Adjectives.** "Clean", "robust", "readable", "complete". Unanswerable.
- **Process claims.** "The plan was reviewed", "requirements were gathered". Not properties
  of the result.
- **Restating the task.** "The feature is implemented" is the task, not a check.
- **All-green lists.** If every criterion would pass on the current tree, they are not
  testing the change.
- **More than ten.** Long lists get skimmed; the last three never get answered.

## What to do when the agent cannot write a criterion

That is the finding. A change nobody can verify is a change nobody can approve — say so and
ask for the smallest observable that would be different.
