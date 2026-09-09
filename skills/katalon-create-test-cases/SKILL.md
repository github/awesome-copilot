---
name: katalon-create-test-cases
description: Create, update, organize, and link Katalon True Platform/TestOps manual test cases from a synced requirement key such as CEL-6, a read requirement, or free-text product behavior. Use when you need to analyze requirements, design manual test cases using ISTQB techniques as a reference, check existing Katalon coverage, avoid duplicate test cases, import only missing cases, update or link existing cases, or create/reuse a test suite for newly designed cases. For full requirement-to-execution workflows, combine with or defer to katalon-true-platform-testing. Written for the manual tester who has a written requirement in hand and no cases for it yet.
---

# Katalon Create Test Cases

Use this skill for the test design and import portion of Katalon True Platform work. Keep the larger `katalon-true-platform-testing` skill available as the end-to-end orchestrator; this skill is only the focused create/update/link workflow.

## Availability Boundary

State the Katalon MCP boundary before promising writes:

- Available: list projects/repositories, find/read requirements, create/read/update/move test cases, find/manage folders, find/read/manage test suites, and link requirements to test cases.
- Not directly available: create requirements, create a formal Test Plan entity, inspect the live AUT UI, or guarantee downstream AI execution.
- Workaround for a test plan: create or reuse a named test suite/folder as the executable planning structure.

Read `references/capability-boundaries.md` when the user asks whether Katalon can do a specific operation.

## Resolve Context First

Before mutating Katalon data:

1. Call `list_projects`.
2. Call `list_repositories`.
3. Resolve the repository/Test Project from the user's wording, requirement key, or unique available repository.

Rules:

- Treat repository and Test Project as the same resolution target.
- If exactly one repository exists, use it.
- If multiple equally plausible repositories remain, ask the user to choose.
- If the user says "Katalon Cloud" or "cloud repo", prefer a repository named `Katalon Cloud` when present.
- Do not scan every repository just to avoid asking.

## Analyze Requirement

If the user provides a requirement key, use `find_requirements` or `read_requirement`. If the user provides free text, analyze it locally and only link requirements when a real requirement ID is known.

Output or internally track:

- Requirement intent
- Personas
- Main flows
- Alternate and negative flows
- Data and environment assumptions
- Risk areas
- Coverage recommendations

Read `references/requirement-analysis.md` before analyzing non-trivial requirements.

## Design Coverage

Design manual cases using ISTQB techniques as a reference for coverage (the techniques guide the design; the deliverable is plain platform test cases, not an ISTQB certification):

- Equivalence partitioning for input classes, statuses, roles, filters, and product states.
- Boundary value analysis for ranges, quantities, prices, dates, pagination, and text lengths.
- Decision tables for business rules with multiple conditions.
- State transitions for lifecycle flows such as cart, checkout, status, and execution.
- Use-case scenarios for realistic end-to-end user journeys.
- Error guessing for ecommerce, account, permissions, environment, and data risks.

### Make each case atomic

Each test case targets **one validation condition (one acceptance-criteria line)** — but it must still be a **complete, independently runnable flow**, not a single bare assertion.

- "Atomic" describes the *scope under test* (one rule per case), not the step count. Every case walks the real path to that condition: precondition/navigation -> enter the surrounding valid data -> perform the action under test -> verify the expected result. A case that is a lone step like "count the columns" is too thin; lead with the steps to reach and exercise that state so the case runs on its own (and so Run with AI can execute it).
- Split each input class, each required field, each boundary value, and each error message into its own case. Example: a password rule of "min 8 chars, has a letter, has a number, no spaces" becomes separate cases for too-short (7), exactly-8 valid, letters-only, numbers-only, and contains-space — each one a full fill-the-form-and-submit flow, differing only in the field under test.
- Cover both the happy-path flow and its edge cases. For every feature, include at least the main success flow plus the boundary and negative variants around it; do not stop at the positive path.
- Reserve genuinely combined multi-feature cases for true end-to-end scenarios (e.g. register -> log in -> land on dashboard), never as a container for unrelated checks.
- Why: a case mixing several *conditions* fails as a whole, so the result cannot tell you which rule broke and you lose 1 requirement-line -> 1 test-result traceability. Atomic-scope cases pinpoint the failing rule and map cleanly back to the requirement.
- Quote expected error and UI strings **verbatim** from the requirement, including any source typos. Flag suspected typos separately; never silently "correct" them in the expected result, or the test will assert behavior the app does not produce.

Read `references/istqb-coverage.md` before creating cases from requirements, and `references/manual-test-case-format.md` before importing several cases.

## Platform Constraints

- Test case **names** accept only letters, numbers, spaces, and `( ) . , _ -`. Avoid other symbols (such as `@`, `:`, `/`) in titles; keep them in descriptions or steps instead. Folder paths may use `/`.
- Prefer `update_test_case` over delete-and-recreate when adjusting an existing set. Deletion can fail server-side, and updating in place keeps IDs, links, and history intact.

## Check Existing Cases

This step is mandatory before every create/import attempt, including retries after partial failure:

1. If requirement IDs are known, call `find_test_cases_by_requirement`.
2. Search by requirement key, title keywords, feature area, and target folder with `find_test_cases`.
3. Read likely matches with `read_test_case` when the title alone is not enough to judge coverage.
4. Reuse, update, move, or link existing cases when they already cover the behavior.
5. Create new cases only for uncovered behavior, missing coverage classes, or clearly obsolete/incorrect cases.

Never create a duplicate just because a previous create call failed.

## Create Or Update Cases

Use Katalon tools in this order:

1. `create_test_case` only for uncovered manual cases.
2. `update_test_case` for revisions, passing all intended updates in one call.
3. `link_requirements_to_test_case` only after requirement IDs are known.
4. `read_test_case` after creation or update when verification matters.
5. `manage_test_folder` or `move_test_case` only when organization is requested or clearly needed.

Use this manual case shape:

- Title
- Description
- Pre-condition
- Steps
- Expected results
- Test data
- Priority
- Requirement links

## Test Suite Handling

When the user asks to create a test suite/test plan from the cases:

1. Search existing suites with `find_test_suites` before creating anything.
2. Read likely matching suites with `read_test_suite`.
3. Reuse the matching suite and add missing cases instead of creating a duplicate.
4. Create a new suite with `manage_test_suite` only when no suitable suite exists.
5. Verify the final suite with `read_test_suite`.

Report what was reused, updated, newly created, linked, and left uncovered.
