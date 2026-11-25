# Red → Green

The implementation loop that makes maintainers trust the PR.

## Write the failing test first

The regression test must capture the reported symptom, not the fix. Start
from the issue's reproduction: the test should fail on the unfixed tree for
exactly the reason the reporter described.

- Put the test where the project's tests for that module live.
- Name it after the behavior: `terminates a server that severs stdout after
  the handshake and keeps running` — not `fix_leak`.
- Use the project's test framework and helpers; mimic neighboring tests.

## Fixture fidelity

A bad fixture makes a green test meaningless. Verify the fixture reproduces
the real conditions **outside the test harness** before trusting it inside
one:

- Run the fixture standalone and observe the behavior (does the child
  process actually survive? does the parser actually reject `1e6`?).
- Check captured state is what you think it is. A common failure: the test
  records a promise instead of the resolved object, so assertions pass
  vacuously. Assert on the thing itself (`exitCode`, a file, a return
  value), never on a wrapper.
- Prefer fixtures that fail loudly (timeouts, explicit assertions) over
  ones that pass by accident.

## Confirm red, then fix minimally

1. Run the new test on the unfixed tree. Expect failure, and read the
   failure: it must be the reported symptom, not a setup error.
2. Apply the smallest fix that turns the test green. Do not refactor
   unrelated code; do not add features.
3. Re-run the test. Green.

If the fix touches an existing helper, extract it rather than duplicating
logic — but keep the diff reviewable.

## Prove the neighborhood is clean

Run the full test suite for the affected package, plus lint and typecheck:

```bash
# examples — use the project's actual commands from CONTRIBUTING/CI config
pnpm --filter <pkg> test
ruff check . && ruff format --check .
mypy src/<pkg>
```

If unrelated tests fail:

```bash
git stash -u
<run the failing tests>            # confirm they fail on the clean tree
git stash pop
```

State this in the PR body: "the N failures in X reproduce on a clean
checkout (verified via stash) and are unrelated." Never leave the reviewer
to wonder whether you broke something.

## Never trust a green test blindly

If a test for the bug passes before your fix, either the fixture is wrong,
the assertion is vacuous, or the bug was already fixed. All three are worth
knowing before they cost you a review cycle.
