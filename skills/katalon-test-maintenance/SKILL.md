---
name: katalon-test-maintenance
description: Maintain and evolve a Katalon True Platform/TestOps regression suite as the application changes. Use when you need to detect which tests broke or became flaky from stability and result history, diagnose whether a case needs repair vs regeneration, repair test assets (update, move, reorganize cases), refresh coverage after application or requirement changes, and feed the resulting gap list back into planning. Closes the lifecycle loop. For classifying a specific run's failures use katalon-analyze-failures; for authoring brand-new cases use katalon-create-test-cases. Written for the automation tester repairing a suite that has started lying, and the test lead who has to keep it trustworthy.
---

# Katalon Test Maintenance

Use this skill for the **maintenance** stage: keep the regression suite healthy over time and feed learning back to the plan. It consumes failure/stability signals and produces repairs plus a refreshed coverage gap list.

## Availability Boundary

- **Available via MCP:** change/impact signals (`fetch_test_stability_data`, `find_test_results`, `read_execution`), and case-level repair (`update_test_case`, `move_test_case`, `duplicate_test_case`).
- **Not directly available:** Self-healing tests, Time Capsule, Studio Tracer, object refactoring, and StudioAssist Agent-mode edits are **Studio-desktop** features. TrueTest regeneration from live journeys is a **TrueTest** surface. Narrate these; MCP repairs are case-level content edits, not object/script self-healing.

## Maintenance Workflow

```text
+---------------------+     +----------------------+     +----------------------+
| Detect change impact| --> | Diagnose: repair vs  | --> | Repair case assets   |
| stability + history |     | regenerate vs retire |     | update/move/dup      |
+---------------------+     +----------------------+     +----------------------+
                                                                   |
                                                                   v
                                                         +----------------------+
                                                         | Validate + feed back |
                                                         | to plan (gap list)   |
                                                         +----------------------+
```

## Steps and tool rules

1. **Detect impact.** `fetch_test_stability_data` for flakiness trend; `find_test_results` + `read_execution` for what changed across recent runs. Build the list of broken / flaky / degraded cases.
2. **Diagnose each.** Decide per case:
   - **Repair** — the case is salvageable: fix data, steps, or expected result via `update_test_case`; reorganize via `move_test_case`; branch a variant via `duplicate_test_case`.
   - **Regenerate** — behavior changed enough that the case should be re-derived (TrueTest regeneration / re-author) -> hand to `katalon-create-test-cases`; narrate the TrueTest boundary.
   - **Retire** — behavior removed: unlink/retire (prefer update/flag over unreliable `delete_test_case`); get approval.
3. **Repair (MCP-legal edits only).** Pass all intended updates in one `update_test_case` call. Do not claim to have self-healed locators/objects — that is Studio.
4. **Validate.** Re-run through `katalon-execute-test` and confirm via `find_test_results` / `read_execution`.
5. **Feed back.** Emit the refreshed coverage gap list to `katalon-test-plan` so maintenance closes the loop instead of dead-ending.

## Prompt recipes

- `Which regression cases became flaky this month, and which should we repair vs regenerate?`
- `Repair the login suite after the new auth flow: update the affected cases and tell me what still needs re-authoring.`
- `After this release's UI change, refresh coverage and give me the gap list for next sprint.`

## Hand-offs

- Classify a specific failed run first -> `katalon-analyze-failures`.
- Re-author changed behavior -> `katalon-create-test-cases`.
- Confirm repairs -> `katalon-execute-test` then `katalon-test-review`.
- Refreshed gaps -> `katalon-test-plan`.

Read `references/maintenance-loop.md` before repairing. Consult the orchestrator's `references/unavailable-capabilities.md` for the Studio/TrueTest boundary.
