# Test Data Design

## From requirement to data classes

The steps come from the requirement's actions. The data comes from its **conditions**. Read the requirement once for each and do not mix the passes.

1. List every condition the requirement states: thresholds, statuses, roles, tiers, quantities, dates, formats, and exclusions.
2. Partition each condition into equivalence classes. One class is one case, matching the atomic-case rule in `katalon-create-test-cases`.
3. Add boundary values for every ordered condition: at the boundary, one below, one above. A threshold of "500 or more" produces 499.99, 500.00, and 500.01, not "a big number".
4. Add the exclusions the requirement names explicitly. "Never applies to gift cards" is a data class, not an edge case to remember later.
5. Stop when every condition has at least one class. Combinatorial explosion is handled by pairwise reduction, not by inventing more accounts.

Write the classes as a table with the account state, the input values, and the expected outcome, and confirm it with the user before touching a single case.

## Choosing a strategy, per class

Decide per class. A suite that uses one strategy for everything has not made a decision.

| Strategy | Use when | Costs |
|---|---|---|
| **Static** | The data is read-only and shared safely, such as a product catalogue or a country list | Goes stale silently; any test that mutates it poisons every other test |
| **Generated per run** | The test mutates the record: accounts, orders, carts, subscriptions, anything with a lifecycle | Needs a seed path and a teardown; needs unique keys |
| **Cloned from production** | The behaviour only reproduces at real-world scale or shape | Carries real PII, needs masking, needs a refresh policy, and is the slowest to provision |

Default to **generated** whenever the test writes. Reach for **static** only for read-only reference data. Reach for **cloned** only when the other two provably cannot reproduce the behaviour, and say so in the report.

## The placement rule, and why it is not cosmetic

Concrete values inside step text are invisible to everyone who needs them: the next tester, the automation engineer converting the case, and the AI runner that reads the case body.

- **Manual lane.** Values go in the per-step **Test Data** column. State that must pre-exist goes in the **Pre-condition**, with the seed command written out. Environment URLs come from the AUT environment or the Pre-condition.
- **Automation lane.** Values go in a typed fixture or factory. Nothing that varies by environment is a literal in a spec.
- **Both lanes reference the same records.** If the manual case says "a Silver-tier account seeded by `npm run seed -- --profile loyalty-silver`" and the fixture calls a different endpoint, the two lanes are testing two different applications.

A step that reads `Enter the loyalty email` survives a data change. A step that reads `Enter qa+cel9@example.com` has to be rewritten every time, in every case that mentions it.

## Personally identifying data

- **Never** copy real names, emails, phone numbers, addresses, payment details, or government identifiers into a test case, a fixture, a screenshot, or a report.
- Mask or synthesize before the data leaves the source system, not after it has been written somewhere.
- Use reserved, non-routable values: `@example.com` for email, documented reserved ranges for phone numbers, and test card numbers published by the payment provider.
- Production clones are the highest-risk path in this whole skill. If a clone is unavoidable, name in the report what was masked, what was not, and who approved it.

## Credentials

Credentials are not test data and never live with it.

- Platform secrets live in Settings -> Configurations -> Secrets & Variables and are referenced as `{KEY}`. The page is UI-only; the MCP has no tool for it, and secrets apply to cloud-hosted execution only.
- Code reads credentials from environment variables. Commit the variable name, never the value.
- Never paste a password, token, cookie, JWT, or MFA code into chat, a case, or a file, and never ask a user to.

## Data quality checklist

Run this before declaring a data design done.

- [ ] Every requirement condition maps to at least one data class.
- [ ] Every ordered condition has its boundary values, not just a representative value.
- [ ] Every class names its expected outcome, not just its inputs.
- [ ] No value that the test mutates is shared between cases.
- [ ] Every key that must be unique carries a run stamp.
- [ ] No credential, token, or real personal detail appears anywhere in the contract.
- [ ] Every seed has a teardown written at the same time.
- [ ] The design says which environment it targets, and it is not production.
