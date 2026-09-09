---
name: katalon-upload-report
description: Run automation and upload or verify Katalon Platform reports for Katalon Studio/KRE, JUnit XML, and Playwright reports. Use when you need to combine Katalon MCP project/result discovery with Katalon CLI execution, Katalon Report Uploader, or @katalon/playwright-reporter; configure report folders, report types, Platform/TestOps IDs, verify uploaded runs, handle failed auto-upload, or summarize execution results after automation completes. Written for the automation tester whose framework has already run and whose report is sitting on disk. If the Playwright run has not happened yet, start at katalon-playwright-execute.
---

# Katalon Upload Report

Use this skill after or during an automated execution when the user wants Katalon, JUnit, or Playwright reports collected, uploaded to Katalon Platform, and summarized. Use Katalon MCP for platform discovery and post-upload verification; use the report-specific CLI/uploader for local execution and upload.

## Capability Boundary

State the boundary before running or uploading:

- Katalon CLI/KRE can run local automation and generate Katalon Studio reports. With Platform/TestOps arguments configured, current Katalon Studio/Runtime Engine executions are expected to upload results automatically to Katalon True Platform.
- Katalon Report Uploader can upload Katalon Studio and JUnit reports to Katalon True Platform with report `type` values such as `katalon` and `junit`.
- `@katalon/playwright-reporter` can generate and upload Playwright report data to Katalon True Platform during `npx playwright test` or through a separate `playwright-reporter upload` command.
- Katalon MCP can discover projects/repositories, read executions/results, find test results, and fetch quality data when those tools are exposed.
- Katalon MCP does not inspect the live AUT UI, create requirements, guarantee report import completion, or replace Katalon CLI execution.

Read `references/capability-boundaries.md` when tool availability is unclear. Read `references/cli-report-upload.md` before composing CLI commands or choosing the Katalon, JUnit, or Playwright upload flow.

## Required Inputs

Resolve or ask for only the missing required values:

- Report type: `katalon`, `junit`, or `playwright`.
- Execution mode: run tests now, upload an existing report, or verify a report that should already be uploaded.
- Report path: Katalon report folder, JUnit XML file/folder, or Playwright reporter output directory.
- Test target when running tests: Katalon test suite/collection path, Playwright project/test command, or explicit command provided by the user.
- Katalon API key through a secure mechanism or existing environment variable.
- Katalon Platform/TestOps project ID.
- Organization ID for Katalon Studio/KRE execution when required.
- Target Platform/TestOps server only when not default or when using a non-production environment.
- Browser/device/execution profile when required by the project.

Never ask the user to paste secrets into normal chat when a secure secret mechanism exists.

## MCP Context First

When Katalon MCP tools are available:

1. Call `list_projects`.
2. Call `list_repositories`.
3. Resolve the repository/Test Project.
4. If execution IDs, suite IDs, or project IDs are provided, read them before running.

If Katalon MCP tools are missing, continue with CLI-only execution only when all CLI inputs are available, and clearly state that platform verification cannot be completed through MCP in this session.

## Choose Report Flow

Use this decision order:

1. If the user says Playwright or the repo has `@playwright/test`, use the Playwright flow.
2. If the user provides `.xml` JUnit files or says JUnit, use the JUnit flow.
3. If the user provides a Katalon Studio/KRE report folder or `.prj` run target, use the Katalon flow.
4. If unclear, inspect local files for `.prj`, `playwright.config.*`, or JUnit XML before asking.

Do not convert Playwright to JUnit unless the user already has only JUnit XML output or explicitly requests JUnit upload.

## Preflight

Before running:

1. Verify the required CLI exists: Katalon CLI/KRE, Java/Docker for Report Uploader, or Node/npm/pnpm for Playwright.
2. Verify source paths exist: `.prj`, report folder, JUnit XML, Playwright config, or Playwright output directory.
3. Create or clean only a run-specific report folder. Do not delete broad `Reports/`, `test-results/`, or `playwright-report/` folders.
4. Build the command with redacted secrets for display.

## Katalon Report Flow

When running Katalon Studio/KRE automation, prefer this command shape for current True Platform uploads:

```text
katalonc -noSplash -runMode=console \
  -projectPath="<project.prj>" \
  -testSuitePath="Test Suites/<suite>" \
  -executionProfile="<profile>" \
  -browserType="<browser>" \
  -apiKey="$KATALON_API_KEY" \
  -orgID="<org_id>" \
  -testOpsProjectId="<project_id>" \
  --config \
  -webui.autoUpdateDrivers=true \
  -reportFolder="<run_report_folder>"
```

Adapt for `katalon.exe`, suite collections, mobile, API-only suites, proxy settings, retries, and repository-specific conventions.

When uploading an existing Katalon Studio report folder, use Report Uploader with `--type=katalon` if auto-upload did not happen or the user explicitly asks for uploader-based upload.

## JUnit Report Flow

Use this flow when the input is JUnit XML from any automation framework:

1. Verify the XML file or report folder exists.
2. Verify the files are JUnit-style XML, not Playwright HTML or trace artifacts.
3. Use Katalon Report Uploader with `--type=junit`.
4. Prefer API key as the uploader password value, sourced from a secure variable.
5. After upload, use MCP result tools to find/read the new run when available.

Command shape:

```text
java -jar katalon-report-uploader-<version>.jar \
  --projectId="<project_id>" \
  --path="<junit_report_path>" \
  --password="$KATALON_API_KEY" \
  --type=junit \
  --server="<platform_url>"
```

Omit `--server` when the default target is correct.

## Playwright Report Flow

Use this flow when the input is Playwright:

1. Verify Node.js, `@playwright/test`, and Playwright config.
2. Install or verify `@katalon/playwright-reporter`.
3. Configure `playwright.config.ts` or `playwright.config.js` with the Katalon reporter and stable `outputDir`, typically `./reports`.
4. Upload during execution by setting `KATALON_API_KEY` and `KATALON_PROJECT_ID`, or upload separately with `playwright-reporter upload`.
5. Preserve Playwright screenshots, videos, and traces as attachments when configured.
6. Verify uploaded runs through MCP when possible.

Upload during execution:

```text
KATALON_API_KEY="$KATALON_API_KEY" \
KATALON_PROJECT_ID="<project_id>" \
KATALON_BASE_URL="<platform_url>" \
npx playwright test
```

Separate upload:

```text
playwright-reporter upload \
  --output "<playwright_report_output_dir>" \
  --api-key "$KATALON_API_KEY" \
  --project-id "<project_id>" \
  --base-url "<platform_url>"
```

Omit `KATALON_BASE_URL` or `--base-url` when the default target is correct.

## Run And Collect

1. Run the Katalon CLI command.
2. For JUnit-only uploads, run the producing test command only if requested; otherwise upload the existing report.
3. For Playwright, run `npx playwright test` or the user's package script when execution is requested.
4. Preserve stdout/stderr logs, but redact secrets before summarizing.
5. Locate the generated report folder.
6. Check for common artifacts such as execution logs, JUnit XML, HTML reports, screenshots, videos, traces, and attachments.
7. Record local pass/fail/error signals from CLI exit code and report files.

If the CLI run fails before report generation, report the failure and skip upload verification unless a partial report exists.

## Upload Or Confirm Upload

For current Katalon True Platform:

1. Treat Katalon CLI execution with `-apiKey`, `-orgID`, and `-testOpsProjectId` as the Katalon Studio report upload path.
2. Treat Report Uploader with `--type=katalon` or `--type=junit` as the Katalon/JUnit report upload path when uploading existing reports.
3. Treat `@katalon/playwright-reporter` or `playwright-reporter upload` as the Playwright report upload path.
4. Use MCP result tools after the run to find/read the new execution or test results.
5. If the platform shows the run as importing, poll practical intervals when a read/poll tool exists.
6. If auto-upload fails but local report files exist, state the available manual upload path and do not claim the upload succeeded.

## Report Back

Always report:

- Report type: `katalon`, `junit`, or `playwright`.
- CLI command status, with secrets redacted.
- Local report folder path.
- Upload status: verified uploaded, importing, failed, or not verifiable because MCP is unavailable.
- Platform execution/run link when returned.
- Passed, failed, skipped, blocked/incomplete, and error counts when available.
- Failed tests and concise failure reasons.
- Artifacts created: HTML/XML/screenshots/videos/logs.
- Follow-up needed for missing credentials, import failure, or manual upload.

Do not mark the task complete merely because local automation finished; completion requires either verified Platform upload or a clear explanation that upload verification is blocked.
