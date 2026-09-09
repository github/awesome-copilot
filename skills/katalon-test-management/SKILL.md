---
name: katalon-test-management
description: Organize, classify, and trace Katalon True Platform/TestOps test assets. Use when you need to structure test cases into folders and suites, move or reorganize cases, search and find existing assets at scale, link or unlink requirements to test cases, or produce a requirement-to-test traceability report (which requirements have coverage, which cases are orphaned, coverage percentage). Prefer this skill for inventory hygiene and traceability audits. For authoring new cases use katalon-create-test-cases; for coverage quality verdicts use katalon-test-review. Written for the test lead doing inventory hygiene on a repository nobody has curated in months.
---

# Katalon Test Management

Use this skill for the **management** stage: keep the test inventory organized, findable, and fully traceable to requirements. Traceability is the platform's differentiator, so the headline output is a **requirement <-> test case <-> suite** map, not just folder tidying.

## Availability Boundary

- **Available via MCP:** folders (`find_test_folders`, `manage_test_folder`), suites (`find_test_suites`, `manage_test_suite`, `read_test_suite`), case organization (`move_test_case`, `duplicate_test_case`, `delete_test_case`), search (`find_test_cases`), and requirement links (`link_requirements_to_test_case`, `unlink_requirements_from_test_case`, `find_test_cases_by_requirement`, `fetch_requirement_data`).
- **Not directly available:** custom fields and tags authoring, dynamic test suites, Git repository configuration, script-repo upload, and project governance/notifications — these are TestOps-UI or Studio operations. Name them as boundaries; do not claim MCP writes for them.
- **Naming charset:** test case names allow only letters, numbers, spaces and `( ) . , _ -`. Folder paths allow `/`. Prefer `update`/`move` over delete-and-recreate (`delete_test_case` has been unreliable).

## Traceability Workflow

```text
+---------------------+     +-----------------------+     +----------------------+
| Read requirements   | --> | Map cases <-> reqs    | --> | Find orphans + gaps  |
+---------------------+     +-----------------------+     +----------------------+
        |                             |                              |
        v                             v                              v
+---------------------+     +-----------------------+     +----------------------+
| Link/unlink to fix  | --> | Organize into suites  | --> | Report traceability  |
+---------------------+     +-----------------------+     +----------------------+
```

## Steps and tool rules

1. **Establish scope.** `list_projects` -> `list_repositories`. Resolve one target from context.
2. **Build the trace map.** For each requirement key, `find_test_cases_by_requirement`; use `fetch_requirement_data` for coverage status. Classify each requirement as: covered, partially covered, or orphan (no case).
3. **Find loose assets.** `find_test_cases` by feature/folder/keyword to surface cases with no requirement link (orphan cases) and duplicates.
4. **Fix links (only when known and requested).** `link_requirements_to_test_case` after requirement IDs are confirmed; `unlink_requirements_from_test_case` for wrong links. Never guess a link.
5. **Organize inventory.** `manage_test_folder` and `move_test_case` for structure; `manage_test_suite` to group runnable cases. Reuse before creating; summarize bulk moves and get approval before executing them.
6. **Report the traceability matrix.** requirement -> case(s) -> suite(s), coverage %, orphan requirements, orphan cases, and duplicate candidates. This is the deliverable.

## Prompt recipes

- `Audit requirement-to-test traceability for project X and list every requirement with no test case.`
- `Reorganize the smoke suite: move all P0 login cases into Test Cases/Auth/Smoke and report the new structure.`
- `Link test cases TC-1042 and TC-1043 to requirement CEL-6 and confirm the coverage.`
- `Find duplicate test cases in the Checkout folder and propose which to keep.`

## Hand-offs

- Coverage gaps found -> `katalon-create-test-cases` (author) or `katalon-test-plan` (schedule).
- Quality verdict on the organized suite -> `katalon-test-review`.

Read `references/traceability.md` before running an audit. Consult the orchestrator's `references/unavailable-capabilities.md` for the full boundary list.
