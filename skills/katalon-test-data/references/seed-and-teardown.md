# Seed And Teardown

The Katalon MCP cannot create or destroy application state. Everything in this file happens outside it, and the case Pre-condition is how the platform learns what happened.

## The seeding ladder

Take the highest rung that works.

1. **The application's own API.** Fastest, uses the product's real validation, and fails loudly with a status code. Prefer a dedicated test-support endpoint when the product has one.
2. **A CLI or a seed script the product already ships.** Good, but say in the report that it may bypass some application rules.
3. **Direct SQL.** Only when no API and no CLI exists. It bypasses every application rule, so a row can be created that the product itself would refuse. Note that risk explicitly.
4. **The UI.** Last resort. Never seed through the UI inside the test that measures the behaviour, or a setup failure gets reported as a product failure. If the UI is the only path, seed in a separate step and let it fail separately.

## Rules that make a seed trustworthy

- **Idempotent.** Running it twice leaves one record, not two, and does not error on the second run.
- **Unique per run.** Stamp every key that must be unique: `qa+cel9-20260810-1432@example.com`, `ORDER-<stamp>`. The stamp is what teardown searches for.
- **Self-describing.** A seeded record should be identifiable as test data by looking at it, so a human who finds one in a shared environment knows what it is.
- **Scoped to what the case needs.** Seeding a hundred orders to test one discount makes the failure harder to read and the teardown slower.
- **Environment-checked.** Confirm the target from `read_auts` before anything destructive. Never seed or clean production.
- **Recorded in the Pre-condition.** Write the exact command in the case Pre-condition so the manual lane and the coded lane start from the same state.

## Teardown

- **The thing that created the state destroys it**, in the same module or the same fixture. Split creation and destruction and they will drift.
- **Teardown runs even when the test fails.** Use the framework's guaranteed hook, not a line at the end of the test body.
- **Teardown is scoped to this run's stamp.** Never delete by a broad pattern in a shared environment.
- **Leave nothing behind that changes another test's outcome**, including cart state, session state, and feature-flag overrides.
- **A nightly cleanup job is not teardown.** It hides the defect until the day it does not run.

## Manual lane pattern

```text
Pre-condition:
  Target environment: <AUT environment name from read_auts>
  Seed:      npm run seed -- --profile <profile> --stamp <run-stamp>
  Login as:  qa+<case>-<run-stamp>@example.com  /  {SECRET_KEY}
  State:     cart empty, no orders this month

... steps, with values in the Test Data column ...

Teardown:
  npm run seed -- --teardown --stamp <run-stamp>
```

Write it into the case with a single `update_test_case` call containing every edit, then confirm with `read_test_case`. If the Test Data column comes back empty, re-issue the update; never create a duplicate case because an update appeared to fail.

## Automation lane pattern

Creation and destruction in one factory, teardown attached to the fixture that owns it:

```ts
// fixtures/data.ts
import { test as base } from '@playwright/test';

type Fixtures = { shopper: { email: string } };

export const test = base.extend<Fixtures>({
  shopper: async ({}, use) => {
    const stamp = `${Date.now()}`;
    const email = `qa+cel9-${stamp}@example.com`;
    await api.post('/test-support/accounts', { email, tier: 'Silver', password: process.env.LOYALTY_PASSWORD });
    await use({ email });
    await api.delete(`/test-support/accounts/${email}`); // runs even if the test fails
  },
});
```

Use `globalSetup` only for state that is genuinely shared and read-only across the whole run. Anything a test mutates belongs to a per-test fixture, or the tests become order-dependent.

## The acceptance test for any data design

**Run the suite twice in a row, from the state the first run left behind, with no manual reset.**

A second-run failure is a data defect and it has exactly three causes:

| Symptom on the second run | Cause | Fix |
|---|---|---|
| "already exists" or a uniqueness error | The key is not run-stamped | Stamp the key |
| The assertion sees data from the first run | Teardown missing or not guaranteed | Move teardown into the fixture hook |
| Passes alone, fails in the suite | One test depends on another's state | Give each test its own seeded record |

Report this check by name. If it has not been run, say so rather than implying the data design is proven.
