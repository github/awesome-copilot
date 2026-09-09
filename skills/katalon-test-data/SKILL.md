---
name: katalon-test-data
description: Design, source, seed, and tear down the test data a Katalon True Platform test case or an automated suite runs on. Use when the steps are already settled and the blocker is the values, for example which data classes a case needs, which records must exist before a run, how to keep literals out of the step text and into the Test Data column or a fixture, and how to reset state afterwards so the next run starts clean. Covers choosing between static, generated, and cloned production data, keeping credentials out of test data, and the boundary that the Katalon MCP has no test data, fixture, seeding, or secrets tool of its own. If the cases do not exist yet, start at katalon-create-test-cases. Written for the manual tester filling in a case's Test Data column and precondition, and the automation tester wiring fixtures and teardown for a suite.
---

# Katalon Test Data

Use this skill for the **data** half of test design: which values a case runs on, which records must already exist when it starts, and what has to be true again when it finishes. The steps belong to `katalon-create-test-cases`; the code belongs to `katalon-test-case-to-playwright`; the values, the state, and the cleanup belong here.

One artifact serves both lanes. Call it the **data contract**: what must exist, which values, and who resets it. A manual case carries the contract in its Pre-condition and per-step Test Data column. An automated suite carries the same contract in a fixture plus a teardown. Design it once, write it down twice.

## Availability Boundary

State this before promising anything, because three different things in the Katalon world are called "test data" and the MCP reaches only one of them.

- **Available via MCP:** resolve scope (`list_projects`, `list_repositories`); read the requirement the data must satisfy (`find_requirements`, `read_requirement`); find the cases the data belongs to (`find_test_cases`, `find_test_cases_by_requirement`, `read_test_case`); write the Pre-condition and the per-step Test Data column into a case (`create_test_case`, `update_test_case`); read the target environment (`read_auts`); group data-dependent cases so they run together (`manage_test_folder`, `find_test_suites`, `read_test_suite`, `manage_test_suite`).
- **Not available via MCP, at all:**
  - **No katalon-test-data entity, data file, or data binding.** The standalone Test Data object (CSV, Excel, internal, database) is a **Katalon Studio desktop** artifact. The MCP does not create, read, or bind it.
  - **No secrets or variables.** Project `SECRET` and `VAR` entries live in the platform UI under Settings -> Configurations -> Secrets & Variables, are referenced in steps as `{KEY}`, apply to cloud-hosted execution only, and are scoped to the project. There is no tool to read or write them.
  - **No seeding, no teardown, no database access, no API-call tool.** Nothing in the MCP can create or destroy application state.
  - **No requirement creation.** Requirements sync from Jira or Azure; create them there, then find and link.
- **Do not invent tools.** `manage_test_data`, `create_test_data`, `read_secrets`, `seed_data`, `reset_environment`, and `query_database` **do not exist**. If a workflow seems to need one, use the workaround below and say the boundary out loud.
- **Run with AI reads the case body and nothing else.** Data that is not in the Pre-condition or the Test Data column does not reach the AI runner. This is why the placement rule below is not a style preference.
- **Workaround, the MCP-legal data contract:**
  - Manual lane: the case's **Pre-condition + per-step Test Data column**, written through `update_test_case`, is the data contract of record.
  - Automation lane: a **checked-in fixture or factory**, plus the **seed command named in the case Pre-condition** so the manual and coded lanes agree on the same starting state.
  - Either way the contract is versioned, reviewable, and needs no tool that does not exist.

## Workflow

```text
+------------------+ --> +---------------------+ --> +----------------------+
| Resolve scope    |     | Derive data classes |     | Choose data strategy |
+------------------+     +---------------------+     +----------------------+
                                                                |
                                                                v
+------------------+ <-- +---------------------+ <-- +----------------------+
| Verify, run twice|     | Plan seed + teardown|     | Place the data       |
+------------------+     +---------------------+     +----------------------+
```

## Steps and tool rules

1. **Resolve scope.** `list_projects` -> `list_repositories`. If exactly one matches the user's wording or context, use it. Call `read_auts` to learn which environment the data has to exist in; data designed for the wrong environment is worse than no data.
2. **Derive the data classes, do not guess values.** Read the requirement (`read_requirement`) and the cases (`find_test_cases_by_requirement`, then `read_test_case` on each). Turn each condition in the requirement into a data class using equivalence partitioning and boundary value analysis, exactly as `katalon-create-test-cases` does for coverage. One class per case, matching the atomic-case rule. Read `references/data-design.md` before deriving classes for a non-trivial requirement.
3. **Choose the strategy per class.** Static, generated, or cloned from production, decided per class and never by default. The trade-offs and the decision table are in `references/data-design.md`. Say which one you chose and why in the report.
4. **Place the data.** Apply the placement rule below. This is the step that stops data rotting inside step text.
5. **Plan seed and teardown together.** Never design a seed without its teardown in the same breath. Use the seeding ladder in `references/seed-and-teardown.md`: application API first, CLI or SQL second, UI last. Record the seed command in the case Pre-condition so both lanes start from the same state.
6. **Verify, then run it twice.** `read_test_case` to confirm the data actually landed in the case. Then the real check: the suite must pass **twice in a row from the state the first run left behind**, with no manual reset in between. A second-run failure is a data defect, not a flaky test.

## The placement rule

Concrete values do not belong in step text or in a spec file. They belong in a named place, one per lane.

| Data | Manual lane | Automation lane |
|---|---|---|
| Values the step consumes | per-step **Test Data** column | typed fixture or factory module |
| State that must pre-exist | case **Pre-condition**, with the seed command named | `globalSetup` or a fixture that creates it |
| Environment or AUT URL | Pre-condition, or the AUT environment from `read_auts` | config or env var, never a literal in a spec |
| Credentials and tokens | `{KEY}` reference to Secrets & Variables | environment variable, never checked in |
| Cleanup | an explicit reset step in the Pre-condition or final step | teardown in the same fixture that created the state |

Two rules that follow from it:

- **A step reads `Enter the loyalty email`, not `Enter qa+cel9@example.com`.** The value goes in the Test Data column so the same step survives a data change.
- **A fixture owns creation and destruction of the same record.** If one function creates it and a different one deletes it, they will drift and the second run will fail.

## Credentials are not test data

This is a hard rule, not a preference.

- **Never** write a password, token, API key, cookie, JWT, or MFA code into a step, a Test Data column, a fixture file, a Pre-condition, or the chat.
- Reference a platform secret as `{KEY}` and tell the human to create it in Settings -> Configurations -> Secrets & Variables. That page is UI-only; there is no MCP tool for it.
- In code, read from an environment variable and commit only the variable's name.
- If a user pastes a real credential, do not store it in a case or a file. Ask them to add it as a secret and use the `{KEY}` reference instead.
- Production clones carry real people's data. Mask or synthesize personally identifying fields before anything is written into a case, a fixture, or a report. Details in `references/data-design.md`.

## Seed and teardown

The short version; the full ladder, idempotency rules, and per-lane patterns are in `references/seed-and-teardown.md`.

- **Prefer the application's own API** to create state. It is fast, it is the same code path the product uses, and it fails loudly.
- **Fall back to CLI or SQL** when no API exists, and say in the report that the seed bypasses application rules.
- **Seed through the UI only as a last resort**, and never inside the test that is measuring the behaviour, or a setup failure will be reported as a product failure.
- **Make every seed idempotent.** Running it twice must leave one record, not two.
- **Make every key unique per run.** A run stamp such as `qa+cel9-20260810-1432@example.com` prevents cross-run collisions and lets teardown find exactly what it created.
- **Tear down what you created, in the place that created it.** Not in a nightly cleanup job, not by hand.
- **Never seed or clean a production environment.** Confirm the target from `read_auts` before any destructive step.

## Worked example

**Input.** Project `Cellphone Shop`, requirement `CEL-9` synced from Jira:

> A returning shopper whose loyalty tier is Silver or above receives 10% off when the cart subtotal reaches $500. The discount applies once per order and never applies to gift cards.

`find_test_cases_by_requirement(requirement = "CEL-9")` returns three existing cases with empty Test Data columns:

```text
TC-2101  Apply loyalty discount at the subtotal threshold
TC-2102  No loyalty discount below the subtotal threshold
TC-2103  Loyalty discount excludes gift cards
```

**Step 2 output, the data classes.** Four conditions in the requirement, so four classes, plus the two boundary values the threshold demands:

| Class | Account | Cart | Expected |
|---|---|---|---|
| At threshold, eligible tier | Silver | subtotal exactly 500.00 | 10% applied, total 450.00 |
| Below threshold, eligible tier | Silver | subtotal 499.99 | no discount, total 499.99 |
| At threshold, ineligible tier | Bronze | subtotal 500.00 | no discount |
| Gift card in cart | Silver | 1 gift card 500.00 | no discount |

**Step 3 output, the strategy.** Generated, not static and not cloned. Loyalty tier and order history are mutated by the test, so a shared static account goes stale after the first run, and cloned production accounts carry real customer PII for no benefit.

**Step 4 output, the manual lane.** One `update_test_case` call per case, all edits in a single call. For `TC-2101`:

```text
Pre-condition:
  Storefront reachable at the Cellphone Shop AUT environment.
  Seed a Silver-tier account with zero orders this month, using:
    npm run seed -- --profile loyalty-silver --stamp <run-stamp>
  Cart is empty. Log in as the seeded account.

| Step | Test Step                          | Expected Result                         | Test Data                          |
| 1    | Navigate to the storefront         | Storefront home page is displayed       | {AUT_URL}                          |
| 2    | Log in as the loyalty shopper      | Account menu shows the Silver badge     | qa+cel9-<run-stamp>@example.com / {LOYALTY_PASSWORD} |
| 3    | Add the listed phone to the cart   | Cart subtotal shows 500.00              | Model A-500, quantity 1, 500.00    |
| 4    | Open the cart                      | Loyalty discount line shows -50.00 and the order total shows 450.00 | N/A |

Teardown: delete the seeded account with
  npm run seed -- --teardown --stamp <run-stamp>
```

**Expected output of the verification call.** `read_test_case(id = "TC-2101")` returns the case with a non-empty `testData` value on steps 1 to 3, the seed command inside `precondition`, `{LOYALTY_PASSWORD}` as a reference rather than a literal, and the requirement link to `CEL-9` intact. If the Test Data column comes back empty, the update did not land; re-issue the single `update_test_case` call rather than creating a second case.

**Step 4 output, the automation lane.** The same contract as a typed factory, with creation and destruction in one place:

```ts
// fixtures/loyalty-data.ts
export type LoyaltyShopper = { email: string; tier: 'Bronze' | 'Silver'; teardown: () => Promise<void> };

export async function createLoyaltyShopper(tier: 'Bronze' | 'Silver'): Promise<LoyaltyShopper> {
  const stamp = `${Date.now()}`;
  const email = `qa+cel9-${stamp}@example.com`;
  await api.post('/test-support/accounts', { email, tier, password: process.env.LOYALTY_PASSWORD });
  return { email, tier, teardown: () => api.delete(`/test-support/accounts/${email}`) };
}

export const CART = {
  atThreshold:   { sku: 'A-500', quantity: 1, subtotal: 500.00, expectedTotal: 450.00 },
  belowThreshold:{ sku: 'A-499', quantity: 1, subtotal: 499.99, expectedTotal: 499.99 },
  giftCard:      { sku: 'GIFT-500', quantity: 1, subtotal: 500.00, expectedTotal: 500.00 },
};
```

**Expected report to the user.** Name every one of these; a report missing the boundary line is incomplete:

```text
Data contract for CEL-9, 4 classes across 3 cases.
Strategy: generated per run. Reason: the test mutates tier and order history.
Manual lane: TC-2101, TC-2102, TC-2103 updated. Pre-condition carries the seed command, Test Data column carries the values.
Automation lane: fixtures/loyalty-data.ts creates and tears down the shopper in one factory.
Credentials: LOYALTY_PASSWORD referenced as {LOYALTY_PASSWORD} and as an env var. Not stored in any case or file.
Second-run check: pending. Run the suite twice with no reset between runs before trusting these cases.
Boundary: the Katalon MCP has no katalon-test-data, seeding, or secrets tool. {LOYALTY_PASSWORD} must be created by hand
  in Settings -> Configurations -> Secrets & Variables, which is UI-only and applies to cloud-hosted runs only.
```

## Prompt recipes

- `Design the test data for requirement CEL-9 and write it into the existing cases.`
- `These cases have values hard-coded in the step text. Move them into the Test Data column and give me the seed command.`
- `Seed and tear down the order data for tonight's run, manual lane and Playwright lane using the same records.`
- `Our suite passes once and fails on the second run. Find the missing teardown.`
- `What data does this requirement need before anyone writes a case for it?`

## Hand-offs

- No cases exist yet -> `katalon-create-test-cases`, then come back for the data.
- Turning the case into code, where the fixture will live -> `katalon-test-case-to-playwright`.
- Running the cases once the data exists -> `katalon-execute-test`, or `katalon-playwright-execute` for the coded lane.
- A red run that may be a data problem rather than a product problem -> `katalon-analyze-failures`, which routes "environment / data" failures back here.
- Cases that keep breaking on stale data -> `katalon-test-maintenance`.
- Scoping the cycle before any of this -> `katalon-test-plan`.

Read `references/data-design.md` before deriving data classes or choosing a strategy. Read `references/seed-and-teardown.md` before writing any seed or teardown. Read the orchestrator's `katalon-true-platform-testing/references/unavailable-capabilities.md` when the user asks "can Katalon manage test data?".
