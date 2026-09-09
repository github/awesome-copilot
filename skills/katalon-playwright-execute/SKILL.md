---
name: katalon-playwright-execute
description: Run Playwright tests or suites and upload the resulting report to Katalon True Platform. Use when you need to execute Playwright scripts, package scripts, spec files, projects, or suites, configure or verify @katalon/playwright-reporter, upload Playwright reports with Katalon CLI/reporter commands, and verify uploaded Katalon Platform runs or reports. Written for the automation tester who wants the suite driven and the results landed in the platform in one step. For a report from a run that has already finished, or from any other framework, use katalon-upload-report.
---

# Katalon Playwright Execute

Use this skill when the user asks to execute a Playwright script/suite and send results to Katalon True Platform. The workflow is not complete until local execution finishes, report artifacts are collected, and upload is either verified or clearly blocked.

## Execution Workflow

```text
+------------------+ --> +------------------+ --> +------------------+
| Resolve target   |     | Preflight repo   |     | Configure report |
+------------------+     +------------------+     +------------------+
                                                        |
                                                        v
+------------------+ <-- +------------------+ <-- +------------------+
| Verify Platform  |     | Upload report    |     | Run Playwright   |
+------------------+     +------------------+     +------------------+
```

## Required Context

Resolve or ask for only missing required values:

- Playwright target: spec file, grep, project, package script, suite command, or user-provided command.
- Repository/root directory that contains `package.json` and Playwright config.
- Katalon Platform project ID. Use Katalon MCP `list_projects` when available.
- Katalon API key from a secure source such as `KATALON_API_KEY`; check whether it is already available before asking.
- Platform base URL only when non-default or when the project uses QA/prod custom domains.
- Whether the agent may modify Playwright config/package files if the Katalon reporter is missing.

Treat the human as a tool: ask concise questions when target, credentials, project, or permission cannot be resolved safely. Never ask the user to paste secrets into normal chat when a secure secret mechanism or environment variable can be used.

## Preflight

Before running:

- Inspect the repository for `package.json`, `playwright.config.*`, `@playwright/test`, existing reporters, package manager lockfiles, and scripts.
- Verify Node.js is version 18 or newer when possible.
- Check for `KATALON_API_KEY` in the current process environment or the repo's approved secret mechanism before composing any upload command.
- If `KATALON_API_KEY` is missing, stop before execution/upload and ask the user to provide it through a secure environment variable or secret mechanism.
- Run dependency installation only when the repo convention is clear and the user has allowed dependency changes.
- Confirm `@katalon/playwright-reporter` is installed or can be installed.
- Verify a deterministic report output directory, preferably `./reports` or the repo's existing Katalon report directory.
- Build commands with secrets redacted in user-facing output.

Read `references/playwright-katalon-reporting.md` before editing config or composing upload commands.

## Configure Reporter

Prefer the existing project convention. If the Katalon reporter is absent and the user allowed edits:

- Add `@katalon/playwright-reporter` as a dev dependency.
- Add `getGlobalSetupPath()` from `@katalon/playwright-reporter` to Playwright `globalSetup` unless the existing config already has a global setup that must be preserved.
- Add the Katalon reporter with `outputDir`.
- Configure platform upload through environment variables, not hard-coded values.
- Preserve existing reporters such as `list`, `html`, `junit`, or custom reporters.

Do not overwrite unrelated Playwright projects, retries, timeouts, use settings, web servers, or CI-specific behavior.

## Run And Upload

Use one of these modes:

- Upload during execution: set `KATALON_API_KEY` and `KATALON_PROJECT_ID`, then run the selected Playwright command.
- Separate upload: run Playwright to generate report files, then run `playwright-reporter upload`.
- Existing report upload: skip execution only when the user explicitly provides an existing Playwright reporter output directory.

Prefer upload during execution when the project already has the Katalon reporter configured. Prefer separate upload when the user asks to run first, upload later, or when troubleshooting import failures.

If the Playwright command fails after generating report artifacts, still attempt upload when the reporter output exists unless the user asked to skip upload on failure. Test failures are valid report data.

## Platform Verification

After upload:

- Use Katalon MCP tools to list/read recent executions, test results, or quality data when available.
- Match by project ID, run time, test names, and framework metadata.
- Resolve the Platform result URL from reporter output, upload output, MCP execution data, or the known project/execution path.
- Always provide the best available Platform result URL so the user can open the uploaded run/report.
- If MCP cannot verify, inspect CLI output for upload success and report that Platform verification is blocked.
- If upload is asynchronous/importing, poll when a read/list tool exists; otherwise report the importing state.

## Response Contract

Report:

- Playwright command run and exit status, with secrets redacted.
- Katalon upload mode: during execution, separate upload, or existing report upload.
- Local report output directory and key artifacts.
- Platform upload status: verified, importing, failed, or not verifiable.
- Platform report/run URL for the user to open when returned or discoverable; if no exact URL is available, provide the closest project reports/executions URL and state why it is not exact.
- Passed, failed, skipped, and timed-out counts when available.
- Failed tests with concise reasons.
- Any required follow-up: missing API key, missing project ID, install blocked, config permission missing, upload failed, or MCP verification unavailable.

Do not claim success if Playwright ran locally but the Katalon upload did not happen or cannot be verified.
