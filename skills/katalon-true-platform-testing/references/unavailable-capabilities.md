# Katalon MCP Capability Boundaries

## Available

- Project discovery: `list_projects`.
- Repository/Test Project discovery: `list_repositories`.
- Requirement discovery: `find_requirements`, `read_requirement`.
- Requirement coverage: `fetch_requirement_data`.
- Test case operations: `create_test_case`, `read_test_case`, `update_test_case`, `duplicate_test_case`, `delete_test_case`, `move_test_case`, `find_test_cases`.
- Test folder operations: `find_test_folders`, `manage_test_folder`.
- Test suite operations: `find_test_suites`, `read_test_suite`, `manage_test_suite`.
- Requirement links: `link_requirements_to_test_case`, `unlink_requirements_from_test_case`, `find_test_cases_by_requirement`.
- Manual execution: `read_auts`, `create_manual_test_run`, `create_manual_ai_session`, `read_manual_ai_session`.
- Automated execution: `find_execution_profiles`, `list_test_cloud_environments`, `build_run_configuration`, `build_schedule`, `schedule_test_run`.
- Execution results: `read_execution`, `read_execution_test_results`, `read_test_result`, `find_test_results`.
- Quality data: requirement, defect, test case, test stability, and configuration coverage fetch tools.
- ALM defects: `find_alm_integration_projects`, `create_defect`.

## Not Directly Available

- Create requirements in Katalon True Platform. Requirements are synced from Jira/Azure and can be found/read/linked.
- Create a formal Test Plan entity. Use test suites/folders/executions as the executable planning structure.
- Guarantee Run with AI completion. The platform may block, fail, or require AUT/account state.
- Inspect AUT pages through Katalon MCP. Use Browser/Playwright for website exploration.
- Create defects without a failed test result ID and ALM integration details.

## Recommended Workarounds

- Requirement creation: create in Jira/Azure first, then sync/find/link in Katalon.
- Test plan: create a named folder and/or test suite, link to sprint/release, and create execution from that suite.
- AUT exploration: use Browser/Playwright to understand the product, then import manual cases into Katalon.
- AI execution blocked: report blocked state with required fixture, AUT, account, or environment action.
