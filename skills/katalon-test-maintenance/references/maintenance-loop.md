# Maintenance loop reference

## Detect -> diagnose -> repair -> validate -> feed back

```text
stability/history  ->  per-case decision  ->  MCP-legal edit  ->  re-run  ->  gap list -> plan
```

## Per-case decision table

| Signal | Decision | MCP action |
|---|---|---|
| passes on re-run, no app change | flaky -> stabilize | `update_test_case` (waits/data); flag for Studio object review |
| consistent fail, app behavior changed | regenerate | hand to `katalon-create-test-cases`; narrate TrueTest regeneration |
| step/element gone from app | repair or retire | `update_test_case` to match new flow; retire with approval |
| duplicate/near-duplicate drift | consolidate | `duplicate_test_case` base + `move_test_case`; keep one canonical |
| wrong folder/suite after refactor | reorganize | `move_test_case`, `manage_test_suite` |

## Boundaries to narrate (never claim as MCP)

- Self-healing locators, Time Capsule object repair, Studio Tracer, object-repository refactor = **Studio desktop**.
- TrueTest regeneration from live user journeys = **TrueTest** surface.
- MCP maintenance = **test-case content edits** (title, steps, expected results, data, links, location) + reorganization.

## Closing the loop

Maintenance is not done at "green again." Emit:

```text
Repaired:     <cases + what changed>
Regenerate:   <cases handed to katalon-create-test-cases + why>
Retired:      <cases + approval note>
New gaps:     <coverage now missing> -> katalon-test-plan
Stability:    <before/after flakiness signal>
```

## Safe-mutation rules

- Prefer `update_test_case` / `move_test_case` over `delete_test_case` (delete unreliable).
- One `update_test_case` call carries all intended edits for a case.
- Approve bulk changes and any retire/delete before executing.
