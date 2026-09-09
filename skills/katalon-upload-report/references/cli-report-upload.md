# Katalon CLI And Report Upload Reference

Use this reference when a workflow needs to run automation locally, collect Katalon/JUnit/Playwright reports, upload or confirm upload to Katalon Platform, and summarize the result.

## Official Docs Checked

- Katalon Runtime Engine command-line syntax: https://docs.katalon.com/katalon-studio/execute-tests/katalon-runtime-engine/command-line-syntax-in-katalon-runtime-engine
- Upload test results from Katalon Studio to Katalon True Platform manually: https://docs.katalon.com/katalon-studio/test-reports/upload-test-results-from-katalon-studio-to-katalon-testops-manually
- View test reports in Katalon True Platform: https://docs.katalon.com/katalon-platform/analyze/view-test-results
- Katalon True Platform Report Uploader: https://docs.katalon.com/katalon-platform/integrations/ci-cd/report-uploader-integration
- Playwright integration: https://docs.katalon.com/katalon-platform/integrations/testing-framework/playwright-integration
- Katalon Report Uploader Legacy: https://docs.katalon.com/katalon-platform/analyze/reports/upload-test-reports/use-katalon-report-uploader

## Katalon Reports

- After Katalon Studio/Runtime Engine execution, test results are expected to upload automatically to Katalon True Platform when TestOps/Platform arguments are configured.
- Use CLI arguments such as `-apiKey`, `-orgID`, `-testOpsProjectId`, and `-reportFolder` with the normal execution command.
- Keep `-reportFolder` deterministic so the agent can locate generated artifacts after the run.
- Use Katalon MCP result tools after the run to confirm whether the platform imported the execution.

## JUnit Reports

Use Katalon Report Uploader when the input is existing JUnit XML or a report folder containing JUnit XML.

Common inputs:

- `PROJECT_ID`: Katalon Platform/TestOps project ID.
- `REPORT_PATH`: Local report folder path.
- `TYPE`: `junit`.
- `PASSWORD`: Prefer an API key, never a plaintext password.
- `SERVER`: Optional Platform/TestOps endpoint.

## Report Uploader Types

Current Katalon True Platform Report Uploader supports:

- `katalon`: Katalon Studio report folder.
- `junit`: JUnit XML report file/folder.
- `katalon_recorder`: Katalon Recorder reports.

Use `katalon` and `junit` for this skill unless the user explicitly asks for Katalon Recorder.

## Playwright Reports

Use `@katalon/playwright-reporter`, not the generic JUnit uploader, when the source project is Playwright and can be configured.

Required inputs:

- `KATALON_API_KEY`: API key for upload.
- `KATALON_PROJECT_ID`: target Katalon project ID.
- `KATALON_BASE_URL`: optional custom Platform URL.
- `KATALON_AUTH_URL`: optional custom auth URL.

The reporter can upload during `npx playwright test` or upload a generated output directory later through `playwright-reporter upload --output <path> --api-key <key> --project-id <id>`.

If the user only has JUnit XML produced by Playwright and does not want to configure the Katalon reporter, use the JUnit flow and state that Playwright-specific attachments/metadata may be reduced.

## Secret Handling

- Never print API keys, passwords, cookies, or raw auth callback URLs.
- Prefer existing environment variables or secure secret stores.
- Redact command output before reporting it in chat.
- Do not write secrets into skill files, repo files, test reports, or logs.
