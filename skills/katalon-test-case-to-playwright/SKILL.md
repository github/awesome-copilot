---
name: katalon-test-case-to-playwright
description: Convert Katalon True Platform/TestOps manual test cases, test suites, or requirement-linked cases into Playwright TypeScript automation. Use when you need to fetch/read Katalon Platform test cases and implement Playwright scripts, create or adapt a Playwright framework, apply Page Object Model and fixtures, or translate manual steps into meaningful automated test keywords. Written for the automation tester converting a manual case into code that fits an existing page-object layer.
---

# Katalon Test Case To Playwright Script

Use this skill to turn Katalon Platform/TestOps test cases into maintainable Playwright TypeScript automation. Prefer existing project patterns when a Playwright framework already exists. Treat the human as a tool: ask concise questions whenever a required target, credential, repository, AUT detail, or test data value cannot be discovered safely.

## Workflow

```text
+-------------------+ --> +-------------------+ --> +---------------------+
| Resolve Katalon   |     | Read test cases   |     | Resolve framework   |
+-------------------+     +-------------------+     +---------------------+
                                                           |
                                                           v
+-------------------+ <-- +-------------------+ <-- +---------------------+
| Verify scripts    |     | Write automation  |     | Map manual steps    |
+-------------------+     +-------------------+     +---------------------+
```

## Katalon Source

Resolve the Katalon context before writing code:

- Use Katalon MCP tools when available to list projects, list repositories/Test Projects, find test suites, find test cases, and read each selected test case.
- If the user gives a test suite, read the suite and every included test case before generating scripts.
- If the user gives requirement keys, find requirement-linked cases first.
- If MCP tools are unavailable or authentication fails, ask the user for exported test cases, case URLs, case IDs, or the test case text.
- Preserve traceability by keeping Katalon case IDs or titles in test annotations, comments, tags, or test names according to the target framework's style.

Extract for each case:

- Title, priority, requirement links, folder/suite, preconditions, test data, manual steps, and expected results.
- AUT URL, user roles/accounts, environment, browser/device assumptions, and cleanup requirements.
- Ambiguous selectors or business data that require human input.

## Framework Resolution

Inspect the workspace before creating anything:

- Search with `rg --files` for `playwright.config.*`, `package.json`, `tests/`, `e2e/`, `fixtures/`, `pages/`, and existing `*.spec.ts` files.
- If a Playwright framework exists in the workspace, summarize the detected path, conventions, and intended files, then ask the user to confirm before modifying it.
- If multiple candidate frameworks exist, ask the user which one to use.
- If no Playwright framework exists, ask whether the user wants to provide a Git repository/path or wants the agent to create/copy a framework into a target directory.
- If the user does not provide a repository/path after that prompt and the current workspace is writable, initialize a Playwright TypeScript framework in the current workspace.

When initializing a new framework, use TypeScript and include:

- `playwright.config.ts`
- `tests/` for specs
- `pages/` for Page Object Model classes
- `fixtures/` for custom fixtures and shared test data
- meaningful helper methods that read like domain actions, not raw selector operations

Read `references/playwright-typescript.md` before scaffolding a new framework or making broad changes to an existing one.

## Automation Design

Translate manual Katalon steps into Playwright scripts using these rules:

- Use Page Object Model for page structure and domain actions.
- Use fixtures for authenticated users, test data, API setup, reusable pages, and environment URLs.
- Write spec names and test steps that remain understandable to a manual tester.
- Prefer stable user-facing locators: role, label, placeholder, text, test id. Avoid brittle CSS/XPath unless the app gives no better option.
- Convert manual expected results into assertions near the action that produces them.
- Keep one automated test aligned to one Katalon test case unless the existing framework groups scenarios differently.
- Do not silently invent credentials, URLs, product IDs, account state, or selectors. Ask the human or mark a small TODO only when the missing value cannot be discovered.

Use meaningful keywords in page objects and fixtures, for example:

```ts
await productCatalog.searchForPhone(testData.phoneName);
await productCatalog.expectPhoneVisible(testData.phoneName);
await cart.addVisibleProductToCart(testData.phoneName);
await checkout.expectOrderSummaryTotal(expectedTotal);
```

## Implementation Rules

- Follow the existing repository's naming, linting, folder, fixture, and assertion conventions when present.
- Keep generated code idiomatic TypeScript with explicit domain names and minimal comments.
- Store test data in the existing data fixture pattern; if none exists, create typed fixture data rather than scattering literals across specs.
- Add tags or annotations for Katalon case IDs when the framework supports it.
- Avoid changing unrelated framework config unless required for the requested tests.
- If the AUT must be inspected to identify selectors, use Browser/Playwright exploration and keep selectors stable.
- If live AUT access is blocked, implement the structure and mark only selector/test data gaps that require human input.

## Verification

After writing scripts:

- Run the narrowest available check: TypeScript compile, lint, Playwright list, or a targeted `npx playwright test`.
- If the test cannot run because credentials, AUT access, or dependencies are missing, report the exact blocker and what remains unverified.
- Report created/updated files, mapped Katalon cases, commands run, and any manual inputs still needed.
