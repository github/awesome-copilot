# Requirement Analysis Checklist

Use this checklist before writing tests from requirements.

## Inputs To Gather

- Requirement source: Jira key, Azure item, Katalon requirement ID, pasted text, or URL.
- Target AUT/environment.
- Persona or role.
- Business objective.
- Acceptance criteria.
- Known constraints, data, permissions, and dependencies.
- Sprint/release scope if test assets should be organized by iteration.

## Analysis Output

Produce:

- Requirement summary: what must be true for the feature to be accepted.
- Main flow: happy path from user intent to expected outcome.
- Alternate flows: optional paths, branching choices, pagination, sorting, filtering, retries.
- Negative flows: invalid data, missing data, permissions, empty states, out-of-stock or unavailable state.
- Data matrix: values needed for manual tests.
- Risk matrix: high-risk areas that deserve P0/P1 tests.
- Coverage map: requirement or story -> proposed test cases.

## Katalon Requirement Handling

- Use `find_requirements` to search synced Jira/Azure requirements.
- Use `read_requirement` for a specific requirement by source key or internal ID.
- Use `find_test_cases_by_requirement` to inspect existing coverage.
- Use `link_requirements_to_test_case` after test cases exist.
- Do not claim that the MCP can create requirements; current available tools only find/read/link synced requirements.
