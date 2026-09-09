# Playwright Katalon Reporting

## Official References

- Playwright Integration: https://docs.katalon.com/katalon-platform/integrations/testing-framework/playwright-integration
- Katalon API Key: https://docs.katalon.com/katalon-platform/administer/profile/katalon-api-key-in-katalon-testops
- Katalon CLI Integration: https://docs.katalon.com/katalon-platform/integrations/ci-cd/katalon-cli-integration

## Dependencies

Required:

- Node.js 18+
- `@playwright/test` 1.0+
- `@katalon/playwright-reporter`
- `KATALON_API_KEY` for upload
- `KATALON_PROJECT_ID` for upload

Install with the repo package manager:

```bash
npm install --save-dev @katalon/playwright-reporter
pnpm add -D @katalon/playwright-reporter
yarn add -D @katalon/playwright-reporter
```

Use the package manager already used by the repo. Do not install dependencies globally unless the repo already does that.

## API Key Check

Before running or uploading, check whether the API key is already available:

```bash
test -n "$KATALON_API_KEY" && echo "KATALON_API_KEY is set" || echo "KATALON_API_KEY is missing"
```

Do not print the key value. If missing, ask the user to provide it through a secure environment variable or secret mechanism, for example by setting `KATALON_API_KEY` in the shell/session. Stop before upload until the key is available.

## Playwright Config Pattern

Add the reporter without removing existing reporters:

```ts
import { defineConfig } from '@playwright/test';
import { getGlobalSetupPath } from '@katalon/playwright-reporter';

export default defineConfig({
  globalSetup: getGlobalSetupPath(),
  reporter: [
    ['list'],
    [
      '@katalon/playwright-reporter',
      {
        outputDir: './reports',
        ...(process.env.KATALON_API_KEY && {
          platform: {
            apiKey: process.env.KATALON_API_KEY,
            projectId: process.env.KATALON_PROJECT_ID,
            baseUrl: process.env.KATALON_BASE_URL,
            authUrl: process.env.KATALON_AUTH_URL,
          },
        }),
      },
    ],
  ],
});
```

When an existing `globalSetup` exists, preserve it. If combining setup is non-trivial, ask before editing and prefer separate upload after execution.

## Run Commands

Run the user's target command when provided. Otherwise use the narrowest Playwright command:

```bash
npx playwright test
npx playwright test tests/example.spec.ts
npx playwright test --grep "TC-07"
npx playwright test --project chromium
```

Upload during execution:

```bash
KATALON_API_KEY="$KATALON_API_KEY" \
KATALON_PROJECT_ID="<project_id>" \
KATALON_BASE_URL="<platform_url>" \
npx playwright test <target>
```

Omit `KATALON_BASE_URL` when the default Katalon endpoint is correct.

## Separate Upload

Use this when the report already exists or when run and upload are separate:

```bash
npx playwright test <target>
playwright-reporter upload \
  --output ./reports \
  --api-key "$KATALON_API_KEY" \
  --project-id "<project_id>" \
  --base-url "<platform_url>"
```

Omit `--base-url` when the default endpoint is correct.

## Secret Handling

- Never print `KATALON_API_KEY` or auth tokens.
- Do not write API keys to `playwright.config.*`, `package.json`, logs, reports, or skill files.
- Prefer environment variables, shell secret injection, or the platform's secure secret mechanism.
- Redact secret-like values before summarizing command output.

## Result URL

After upload, return a URL the user can open:

- Prefer an exact URL returned by `@katalon/playwright-reporter` or `playwright-reporter upload`.
- If MCP can find the execution/report, use that execution/report path.
- If only `project_id` is known, provide the closest Platform project reports or executions URL and mark it as a fallback.
- For custom Platform domains, build links from `KATALON_BASE_URL`; otherwise use the default Katalon Platform base URL expected by the reporter.

Do not finish with only "uploaded successfully"; include the result URL or explicitly state why no URL could be resolved.

## Common Failure Handling

- Missing dependency: install `@katalon/playwright-reporter` only with permission to modify dependencies.
- Missing API key: stop before upload and ask for a secure secret source.
- Missing project ID: use Katalon MCP `list_projects`; ask only if multiple possible projects remain.
- Playwright test failures: still upload reports if artifacts exist.
- Reporter output missing: inspect Playwright config and stdout; do not run separate upload without an output directory.
- Upload returns success but MCP cannot find a run: report upload output and state that Platform verification is not available from current tools.
