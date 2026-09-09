---
name: katalon-test-plan
description: Plan Katalon True Platform/TestOps testing for a release, sprint, or feature. Use when you need to translate quality goals into scope, prioritize testing by requirement coverage and risk, decide what to test first, or build the executable plan structure (folders, suites, and sprint/release association) that stands in for a formal Test Plan. Reads project/repository/iteration context and requirement coverage, then proposes and materializes a prioritized plan. For designing the actual test cases, hand off to katalon-create-test-cases; for the ship/no-ship call, hand off to katalon-release-analyze. Written for the test lead who owns the cycle and has to decide what gets tested first.
---

# Katalon Test Plan

Use this skill for the **planning** stage of the Katalon lifecycle: turn quality goals into a scoped, risk-prioritized, executable plan. The output is a plan the team can act on plus the folder/suite/release structure that makes it runnable. Prefer Katalon MCP tools for platform data; use the human as a tool when scope, risk appetite, or release target cannot be resolved safely.

## Availability Boundary

State the boundary before promising a plan:

- **Available via MCP:** resolve scope (`list_projects`, `list_repositories`, `find_iterations`), read requirement coverage and gaps (`fetch_requirement_data`, `find_requirements`, `find_test_cases_by_requirement`), and build the executable plan structure (`manage_test_folder`, `manage_test_suite`, add cases to suites).
- **Not directly available:** create a Release or Build entity, create a formal Test Plan entity, or author release gates through MCP. These live in the TestOps UI.
- **Workaround (the MCP-legal test plan):** a **named folder + test suite associated with a sprint/release** is the executable plan. Create it, populate it, and report it as the plan of record.

## Planning Workflow

```text
+---------------+     +----------------------+     +----------------------+
| Resolve scope | --> | Read coverage + risk | --> | Prioritize what first|
+---------------+     +----------------------+     +----------------------+
        |                        |                             |
        v                        v                             v
+---------------+     +----------------------+     +----------------------+
| Propose plan  | --> | Build folder + suite | --> | Associate sprint/rel |
+---------------+     +----------------------+     +----------------------+
```

## Steps and tool rules

1. **Resolve scope.** `list_projects` -> `list_repositories`. If exactly one matches the user's wording or context, use it. Use `find_iterations` to bind the plan to a sprint/release when named.
2. **Read coverage and gaps.** Use `fetch_requirement_data` for requirement coverage status and `find_test_cases_by_requirement` to see which requirements already have cases. `find_requirements` / `read_requirement` when requirement keys are supplied.
3. **Prioritize by risk and evidence.** Rank scope using: requirement coverage gaps first, then high-change/high-traffic areas, then areas with historically unstable tests (defer stability detail to `katalon-test-review`). State the risk basis; do not invent traffic numbers the MCP does not return.
4. **Propose the plan in chat.** Objectives, in-scope / out-of-scope, coverage matrix (requirement -> planned cases), risk ranking, target environments, and the suite/folder structure you will create.
5. **Materialize the executable structure.** `manage_test_folder` for the plan folder, `manage_test_suite` for the runnable suite, add the selected/known cases. Reuse an existing folder/suite when one already matches instead of creating a duplicate.
6. **Verify and report.** `read_test_suite` to confirm; report the plan of record with the suite as the executable artifact and the open gaps to fill next.

## Prompt recipes

- `Plan testing for sprint 3.2 in project Cellphone Shop: show coverage gaps and build the executable suite.`
- `What should we test first for release R-2026-Q3 based on requirement coverage? Propose a risk-ranked plan.`
- `Create a test plan structure (folder + suite) for requirement CEL-6 and associate it with the current sprint.`

## Hand-offs

- Gaps to fill -> `katalon-create-test-cases`.
- Plan ready to run -> `katalon-execute-test`.
- Ship decision on the planned scope -> `katalon-release-analyze`.
- Traceability audit of the plan -> `katalon-test-management`.

Read `references/planning-workflow.md` before proposing scope. Read the orchestrator `katalon-true-platform-testing/references/unavailable-capabilities.md` when the user asks "can Katalon plan X?".
