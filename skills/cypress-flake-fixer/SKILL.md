---
name: cypress-flake-fixer
description: 'Find and fix flake-prone anti-patterns in an existing Cypress suite, and APIs removed in Cypress 12 to 16. Bundles a zero-dependency scanner for fixed cy.wait() delays, assigned command return values, async/await, force: true, chaining after actions, one-shot expect() inside .then(), conditional testing, and removed APIs such as Cypress.env(), cy.exec(), cy.server()/cy.route(). Use when asked to fix flaky Cypress tests, remove cy.wait, stabilize or harden a Cypress suite, audit Cypress specs, debug "detached from the DOM" errors, or prepare an upgrade to Cypress 15 or 16.'
---

# Cypress Flake Fixer

Audit an existing Cypress suite for the code patterns that cause intermittent failures, then fix them without hiding the problem behind retries, longer timeouts, or `force: true`.

## When to Use This Skill

- A Cypress spec passes locally and fails in CI, or fails once in every few runs
- The suite contains `cy.wait(<number>)`, `{ force: true }`, or tests that only pass in order
- Errors mention "detached from the DOM", "timed out retrying", or a subject that "is no longer attached"
- The project is upgrading Cypress across a major version (12 through 16)
- A review of Cypress test code is requested

For writing new Cypress tests from scratch, coding standards are enough. This skill is for diagnosing and repairing an existing suite.

## Prerequisites

- Node.js 18 or later to run the scanner (it has no dependencies and does not need Cypress installed)
- The Cypress version, read from `package.json`. Fixes differ by major version

## Workflow

### 1. Scan

```bash
node ./scripts/scan-cypress.mjs <project-root>
node ./scripts/scan-cypress.mjs <project-root> --json          # machine-readable
node ./scripts/scan-cypress.mjs <project-root> --strict        # add low-confidence rules
node ./scripts/scan-cypress.mjs cypress/e2e/checkout.cy.ts     # one file
```

The scanner reads the Cypress version from the nearest `package.json` and grades removed APIs as `error` when the installed major already rejects them and `warn` when they break on upgrade. Run `--list-rules` for the catalog.

Findings are heuristic. Open each location and confirm before editing.

### 2. Measure before changing anything

When the goal is to fix a specific flaky spec, record how often it fails first. Without a baseline there is no way to tell a fix from luck.

```bash
for i in $(seq 1 20); do npx cypress run --spec "cypress/e2e/checkout.cy.ts" --quiet || echo "FAIL $i"; done
```

A spec that fails 1 run in 10 needs about 30 clean runs after the fix before the fix is believable.

### 3. Fix in this order

| Order | Rules | Why first |
|---|---|---|
| 1 | CY002, CY003, CY007 graded `error` | The test is wrong or already broken; other fixes build on correct command flow |
| 2 | CY001, intercept ordering | Time-based waits are the largest single source of flake |
| 3 | CY005, CY006 | Broken retry-ability causes detached-DOM and one-shot assertion failures |
| 4 | CY004 | `force: true` hides a real overlap, animation, or disabled state |
| 5 | CY008, CY010, CY012 | State leaks and order dependence |
| 6 | CY013, CY101, CY102 | Selector and assertion hygiene |

Before-and-after code for every rule is in [references/anti-patterns.md](./references/anti-patterns.md). Replacements for removed APIs are in [references/removed-apis.md](./references/removed-apis.md). Read the section for the rule being fixed; do not load both files upfront.

### 4. Replace each fixed wait with the condition it was standing in for

Do not delete a `cy.wait(n)` or swap it for a guess. Work out what the delay covered:

| The wait covered | Replace with |
|---|---|
| A network request | `cy.intercept(...).as('x')` registered before the trigger, then `cy.wait('@x')` |
| A render that follows a request or state change | A `.should()` on the DOM that results |
| A debounce, throttle, polling interval, or toast timeout | `cy.clock()` before `cy.visit()`, then `cy.tick(ms)` |
| A CSS animation or transition | An assertion on the final state; Cypress already waits for the element to stop moving before acting |
| Client-side hydration of server-rendered HTML | A signal the app sets when hydration finishes (see Gotchas) |
| Unknown | Run the test in `npx cypress open`, select the wait in the Command Log, and read which requests and DOM changes happened during it |

### 5. Verify

1. Run the changed spec alone, then repeat it at least as many times as the baseline run.
2. Rerun the scanner and compare counts per rule.
3. Run the full suite once to catch order dependence exposed by the change.

## Rules for the fix itself

- Change test code only. If the test exposes an application bug (double submit, missing loading state, race in the UI), report it instead of working around it.
- Do not raise `defaultCommandTimeout`, add `retries`, or add `{ force: true }` to make a test pass. Each one converts a visible failure into a slower or hidden one.
- Do not replace `cy.wait(2000)` with `cy.wait(5000)`, or with `.should('exist')` on an element that was already present.
- Keep one rule category per commit so a regression can be bisected.
- Fix shared custom commands in `cypress/support` first. A fixed wait inside a command runs in every test that calls it.

## Gotchas

- **Register `cy.intercept()` before the request can fire.** For requests made on page load that means before `cy.visit()`. An intercept registered after the request has left never matches, and `cy.wait('@alias')` times out intermittently depending on network speed.
- **Each `cy.wait('@alias')` consumes one request.** If the app calls the endpoint twice, the first wait resolves on the first call and the assertion runs against stale data. Wait once per expected call, or assert on the DOM.
- **GraphQL uses one URL for every operation.** Alias inside the handler: `cy.intercept('POST', '/graphql', (req) => { if (req.body.operationName === 'GetOrders') req.alias = 'getOrders' })`.
- **`.should('not.exist')` passes before the element has rendered.** Using it to wait for a spinner to disappear succeeds instantly on a slow page. Assert the positive end state.
- **Server-rendered apps accept clicks before handlers are attached.** In Next.js, Nuxt, SvelteKit, and Remix the button is visible and enabled in the server HTML, so Cypress clicks it during hydration and nothing happens. Have the app set a marker when hydration completes (for example a `data-hydrated` attribute on `<body>` from a mount effect) and assert on it after `cy.visit()`.
- **A `.should()` in the middle of a chain pins the subject.** Queries after it cannot re-query past the assertion, so a re-render produces a detached-DOM error. Split the chain at the assertion.
- **`.then()` breaks the retry chain even with no assertion inside.** Everything before it runs once.
- **Cypress 16 types with no delay between keys** (`keystrokeDelay` default changed from 10 to 0). Inputs that re-render per keystroke or debounce on input may now drop characters or fire once. Assert the field value after typing instead of restoring the delay.
- **Cypress 16 turned cookie and storage getters into queries.** `cy.getCookie()`, `cy.getCookies()`, `cy.getAllCookies()`, `cy.getAllLocalStorage()`, and `cy.getAllSessionStorage()` now retry chained `.should()` assertions, which removes the need for waits around auth cookies.
- **The page is blank after `cy.session()`.** A missing `cy.visit()` after it looks like a flaky selector failure.
- **`testIsolation: false` shares state across tests.** If the config sets it, every order-dependent failure is expected behavior, not flake. Check the config before diagnosing.
- **Retries hide flake unless configured to report it.** To find flaky tests instead of masking them, use the experimental strategy that retries and still fails:

  ```js
  retries: {
    experimentalStrategy: 'detect-flake-but-always-fail',
    experimentalOptions: { maxRetries: 2, stopIfAnyPassed: true },
    openMode: true,
    runMode: true,
  }
  ```

- **CY005 is a judgement call.** `cy.get(input).clear().type('x')` on an input that never re-renders is fine. Split the chain when the element belongs to a list, a form library that remounts fields, or anything driven by async state.

## Report format

```markdown
## Cypress flake audit: <scope>

- Cypress version: <range>, major <n>
- Files scanned: <n>
- Baseline: <spec> failed <f> of <n> runs

| Rule | Before | After | Notes |
|---|---|---|---|
| CY001 fixed-wait | 14 | 0 | 9 replaced by intercept aliases, 5 by assertions |

### Not fixed
- <location>: <reason, for example needs an application change>

### Application issues found
- <behavior the tests exposed>

### Verification
- <spec>: <n> of <n> runs passed after the change
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Scanner reports "No Cypress files found" | Pass the folder that contains `cypress/` or `*.cy.*` files. Specs outside those conventions can be passed as explicit file paths |
| A finding is a false positive | Add `// cy-scan-ignore CY0xx` on the same or previous line, with the reason |
| Version shows "not detected" | Pass `--cypress-major <n>`; in a monorepo, run the scanner from the package that depends on Cypress |
| The test fails only in CI after fixes | Compare viewport, browser, and CPU. Run locally with the CI browser and `--browser chrome --headless`, and throttle CPU to surface timing gaps |
| `cy.wait('@alias')` times out after the change | The intercept is registered after the request, the URL pattern misses a query string (add `*`), or the request is served from cache and never reaches the network |

## References

- [references/anti-patterns.md](./references/anti-patterns.md): before-and-after code for every scanner rule
- [references/removed-apis.md](./references/removed-apis.md): removed APIs by Cypress major, with migration code for `Cypress.env()` and `cy.exec()`
- [Cypress retry-ability](https://docs.cypress.io/app/core-concepts/retry-ability)
- [Cypress migration guide](https://docs.cypress.io/app/references/migration-guide)
