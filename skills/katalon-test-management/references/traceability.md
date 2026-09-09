# Traceability reference

## The trace map (the deliverable)

```text
Requirement  ->  Test case(s)   ->  Suite(s)      Coverage
CEL-6            TC-1042, TC-1043   Auth/Smoke     covered
CEL-7            TC-1050            (none)         covered, not in a suite
CEL-8            (none)             (none)         ORPHAN requirement
—                TC-1099            (none)         ORPHAN case (no requirement link)
```

Coverage % = requirements with >=1 linked case / total in-scope requirements.

## Tool sequence for an audit

1. `find_requirements` (or the supplied keys) — the in-scope requirement set.
2. `find_test_cases_by_requirement` per key — the linked cases.
3. `fetch_requirement_data` — platform coverage status to reconcile against the link map.
4. `find_test_cases` by folder/feature — surface cases that never appear in step 2 (orphan cases).
5. Diff: requirements with no case = orphan requirements; cases with no requirement = orphan cases.

## Classification rules

- **Covered:** requirement has >=1 linked, current test case.
- **Partially covered:** linked cases exist but leave known behavior untested (defer the judgment to `katalon-test-review`).
- **Orphan requirement:** no linked case — the top gap; route to planning/design.
- **Orphan case:** case with no requirement link — either link it (if a requirement is known) or flag for review; do not delete without approval.

## Safe-mutation rules

- Prefer `update_test_case` / `move_test_case` over `delete_test_case` (delete has been unreliable, HTTP 500 observed).
- Test case name charset: letters, numbers, spaces, `( ) . , _ -` only. No `@ : /` in titles.
- Summarize any bulk move/link/delete and get approval before executing.
- Never fabricate a requirement<->case link; link only confirmed IDs.
