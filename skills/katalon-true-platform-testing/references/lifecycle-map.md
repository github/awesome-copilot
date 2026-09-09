# Lifecycle map — 7 stages -> skills -> MCP tools

Single source for the README diagram and the orchestrator's routing. The Katalon testing lifecycle has 7 stages; each maps to one or more skills and a set of MCP tools.

```text
1 PLAN ......... katalon-test-plan
                 list_projects, list_repositories, find_iterations,
                 fetch_requirement_data, find_test_cases_by_requirement,
                 manage_test_folder, manage_test_suite

2 DESIGN ....... katalon-create-test-cases  (+ katalon-test-case-to-playwright)
                 find_requirements, read_requirement, create_test_case,
                 read_test_case, update_test_case, find_test_cases

3 MANAGE ....... katalon-test-management
                 find_test_folders, manage_test_folder, find_test_suites,
                 manage_test_suite, move_test_case, duplicate_test_case,
                 link_requirements_to_test_case, unlink_requirements_from_test_case,
                 find_test_cases_by_requirement, fetch_requirement_data

4 REVIEW ....... katalon-test-review
                 fetch_requirement_data, fetch_test_case_data,
                 fetch_test_stability_data, fetch_test_configuration_data,
                 find_test_cases_by_requirement, read_auts

5 EXECUTE ...... katalon-execute-test  (+ katalon-upload-report, katalon-playwright-execute)
                 read_auts, create_manual_test_run, create_manual_ai_session,
                 read_manual_ai_session, find_execution_profiles,
                 list_test_cloud_environments, build_run_configuration,
                 build_schedule, schedule_test_run, read_execution,
                 read_execution_test_results

6 ANALYZE ...... katalon-analyze-failures + katalon-release-analyze
                 read_test_result, read_execution_test_results, find_test_results,
                 fetch_defect_data, fetch_test_case_data, fetch_test_stability_data,
                 fetch_test_configuration_data, fetch_requirement_data,
                 find_alm_integration_projects, create_defect

7 MAINTAIN ..... katalon-test-maintenance
                 fetch_test_stability_data, find_test_results, read_execution,
                 update_test_case, move_test_case, duplicate_test_case
                 |
                 +--> feeds the gap list back to 1 PLAN (the loop closes)

CROSS-CUTTING .. katalon-platform-setup (connect) · katalon-true-platform-testing (router)
```

## Stage boundaries (no MCP)

- Object/action capture, data design, resilience design (stage 2): Studio desktop.
- Custom fields/tags, Git config, governance (stage 3): TestOps UI.
- Code/object review, local debug (stage 4): Studio desktop.
- Rerun / terminate / Live Monitor (stage 5): TestOps UI (MCP reads results only).
- AI root-cause, self-healing, Time Capsule, TrueTest regeneration (stages 6-7): product surfaces, not MCP.

Use Browser/Playwright for AUT exploration; use Studio for object/script work; use the MCP for everything in the tool lists above.

## Role map

Four canonical roles. The synonyms are prose only, so someone who uses the industry's noun instead of Katalon's still finds their row.

| Role | Also called | Comes here to | Starts at | Then |
|---|---|---|---|---|
| Manual tester | QA analyst, test analyst, QA engineer | turn a written requirement into cases and run them | `katalon-create-test-cases` | `katalon-execute-test`, `katalon-analyze-failures` |
| Automation tester | SDET, automation engineer, QA engineer | turn cases into code, run it, ship the results | `katalon-test-case-to-playwright` | `katalon-playwright-execute`, `katalon-upload-report`, `katalon-test-maintenance` |
| Test lead | QA lead, QE lead, test coordinator | scope the cycle, judge readiness, keep the suite healthy | `katalon-test-plan` | `katalon-test-review`, `katalon-test-management`, `katalon-release-analyze` |
| Test manager | QA manager, QE manager, head of quality | read coverage and risk, and call ship | `katalon-release-analyze` | `katalon-test-review`, `katalon-test-management` |

A skill is named here when a request phrased in role terms, naming no skill, should land there first. Everything else is reached by handoff. `QA engineer` maps to two roles on purpose: resolve it by asking one question, never by guessing.

`katalon-platform-setup` is role-neutral. It routes on the words connect, install, and MCP rather than on a role, and everyone runs it once.

## Intent to skill

**When a row's owning skill does not exist yet, route to the fallback and say the boundary out loud. Never invent a capability to fill a row.**

| Intent, in the tester's words | Route to today | When the gap closes |
|---|---|---|
| Where do I start, I own quality for this and do not know the tooling | `katalon-true-platform-testing` | covered |
| Connect the platform, nothing works | `katalon-platform-setup` | covered |
| Analyze this requirement before I write anything | `katalon-create-test-cases` | covered |
| I just got requirement CEL-6 and need cases | `katalon-create-test-cases` | covered |
| What test data do these cases need | `katalon-create-test-cases`, per-case test data field only | `katalon-test-data` |
| Seed and tear down data for the run | **boundary only.** No skill owns this. State it | `katalon-test-data` |
| Run an exploratory session on checkout | `katalon-exploratory-charter` | covered |
| What should we test first this sprint | `katalon-test-plan` | covered |
| How many testers, how long, for this release | `katalon-test-plan`, scope only. State the boundary | `katalon-test-estimation` |
| Which product areas carry the most risk this quarter | `katalon-test-plan`, per-cycle risk ranking only. State the boundary | `risk-portfolio` |
| Organize our test cases, they are a mess | `katalon-test-management` | covered |
| Which requirements have no coverage | `katalon-test-management` | covered |
| Is this suite good enough for the pipeline | `katalon-test-review` | covered |
| Run these cases and tell me what broke | `katalon-execute-test` | covered |
| Run it with AI, I do not have time to click through | `katalon-execute-test` | covered |
| Schedule the automated suite on TestCloud | `katalon-execute-test` | covered |
| Turn TC-1042 into a Playwright spec | `katalon-test-case-to-playwright` | covered |
| Get my Playwright run into the platform | `katalon-playwright-execute` | covered |
| I have a JUnit or Katalon report on disk | `katalon-upload-report` | covered |
| Turn this manual case into a Cypress spec | `katalon-test-case-to-playwright` as the pattern, `katalon-upload-report` via a Mocha JUnit reporter. State the boundary | Cypress pair |
| Turn this manual case into a Selenium test | `katalon-upload-report`, JUnit XML path only. State the boundary | Selenium pair |
| Turn this manual case into a Katalon Studio test | `katalon-upload-report` runs `katalonc`, execution only, no authoring. State the boundary | Katalon Studio pair |
| Wire this into CI | `katalon-playwright-execute` + `katalon-upload-report`, both expose CI-invocable commands | `ci-setup` |
| This run failed, is it us or the app | `katalon-analyze-failures` | covered |
| File the bugs for these failures | `katalon-analyze-failures` | covered |
| Our Cypress suite is flaky | `katalon-test-maintenance` | Cypress pair, for the framework-specific rerun path |
| Which tests went flaky this month | `katalon-test-maintenance` | covered |
| Can we ship 3.2 | `katalon-release-analyze` | covered |
| I need a status deck for the steering committee | `katalon-release-analyze`, single-release verdict only. State the boundary | `katalon-test-reporting` |
| Trend escaped defects across the last four releases | `katalon-release-analyze`, single release only. State the boundary | `katalon-test-reporting` |
| What should we change about how we test | `katalon-test-maintenance`, asset-level gap list only. State the boundary | `test-retro` |
| Assert on an email, a PDF, a visual, a credential, or a database row inside a test | **boundary only.** No skill owns this. State it | not yet named, script distribution still blocks it |
