# MCP tool index — every Katalon MCP tool, one line, stage-tagged

Stages: 1 plan · 2 design · 3 manage · 4 review · 5 execute · 6 analyze · 7 maintain.

## Discovery
- `list_projects` — list Katalon projects. [1,2,3,5]
- `list_repositories` — list repositories / Test Projects. [1,3]
- `find_iterations` — find sprints/iterations for a project. [1]

## Requirements
- `find_requirements` — find synced requirements (Jira/Azure). [2]
- `read_requirement` — read one requirement's detail. [2]
- `fetch_requirement_data` — requirement coverage status. [1,4,6]

## Test cases
- `create_test_case` — create a manual test case. [2]
- `read_test_case` — read a test case. [2,4]
- `update_test_case` — update a case (all edits in one call). [2,7]
- `duplicate_test_case` — copy a case. [7]
- `delete_test_case` — delete a case (unreliable; prefer update/move). [3]
- `move_test_case` — move a case between folders. [3,7]
- `find_test_cases` — search cases by key/title/feature/folder. [2,3]

## Folders and suites
- `find_test_folders` — list folders. [3]
- `manage_test_folder` — create/organize folders. [1,3]
- `find_test_suites` — list suites. [3,5]
- `read_test_suite` — read a suite's cases. [3,5]
- `manage_test_suite` — create/edit a suite. [1,3]

## Requirement links
- `link_requirements_to_test_case` — link req -> case. [3]
- `unlink_requirements_from_test_case` — remove a link. [3]
- `find_test_cases_by_requirement` — cases linked to a requirement. [1,3,4]

## Manual execution
- `read_auts` — read applications-under-test / environments (call right before a manual run). [4,5]
- `create_manual_test_run` — start a manual run. [5]
- `create_manual_ai_session` — start Run with AI. [5]
- `read_manual_ai_session` — poll AI session until no item is TODO/IN_TESTING. [5]

## Automated execution
- `find_execution_profiles` — execution profiles. [5]
- `list_test_cloud_environments` — TestCloud environments. [5]
- `build_run_configuration` — build a run config. [1,5]
- `build_schedule` — build a schedule. [5]
- `schedule_test_run` — schedule an automated run (never for manual cases). [1,5]

## Results
- `read_execution` — read an execution. [5,6,7]
- `read_execution_test_results` — results within an execution. [5,6]
- `read_test_result` — one test result's detail (needed for defect filing). [6,7]
- `find_test_results` — find recent/specific results. [6,7]

## Quality data
- `fetch_defect_data` — defect status/context. [6,7]
- `fetch_test_case_data` — test-case quality signals. [4,6]
- `fetch_test_stability_data` — flakiness/stability signal. [4,6,7]
- `fetch_test_configuration_data` — configuration coverage. [4,6]

## ALM defects
- `find_alm_integration_projects` — ALM integration projects. [6]
- `create_defect` — create an ALM-linked defect (requires a failed result ID). [6]

## Not available via MCP (state as boundary)
Create requirements · create Release/Build/Test-Plan entity · author release gates · guarantee Run-with-AI completion · inspect AUT UI · self-healing / Time Capsule / Tracer / object refactor · TrueTest regeneration · rerun/terminate/Live-Monitor · custom fields & tags · Git repo config · project governance. Use Jira/Azure, Studio, TestOps UI, or Browser/Playwright for these.
