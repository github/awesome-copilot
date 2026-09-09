# Planning workflow reference

## Scope resolution order

1. Project (`list_projects`) — one match from context, else ask.
2. Repository / Test Project (`list_repositories`) — treat repository and Test Project as the same target; prefer `Katalon Cloud` when the user says "cloud repo".
3. Iteration / sprint / release (`find_iterations`) — bind the plan when the user names a sprint or release.

## Risk-prioritization inputs (only what MCP returns)

| Signal | Tool | Use |
|---|---|---|
| Requirement coverage status | `fetch_requirement_data` | Untested / partially-covered requirements rank first. |
| Requirement -> case links | `find_test_cases_by_requirement` | Orphan requirements (no case) are the top gap. |
| Configuration coverage | `fetch_test_configuration_data` | Under-covered browsers/platforms are planning risk. |
| Test stability | `fetch_test_stability_data` | Unstable areas need re-planning, not just re-run (defer detail to katalon-test-review). |

Do not fabricate production traffic, change frequency, or defect rates the MCP does not expose. If the user supplies them (from TrueTest Test Gap Analysis, PostHog, or Jira), use them and cite the source.

## The executable "test plan" structure

Because MCP cannot create a Test Plan entity, the plan of record is:

```text
Folder:  Test Cases/<Release or Feature>/
Suite:   <Feature> — <Sprint/Release>          (manage_test_suite)
         + selected test cases added
Assoc:   sprint/release via find_iterations context
```

Report the suite ID as the plan artifact. List the requirement->case coverage matrix and the open gaps as the plan's backlog.

## Plan output template

```text
Objective:        <what quality outcome this plan targets>
In scope:         <features/requirements>
Out of scope:     <explicitly excluded + why>
Coverage matrix:  requirement -> planned/existing cases (mark gaps)
Risk ranking:     1..n with the signal that drove each rank
Environments:     <AUT/config targets>
Executable plan:  folder + suite (IDs) associated to <sprint/release>
Next:             gaps to fill (-> katalon-create-test-cases)
```
