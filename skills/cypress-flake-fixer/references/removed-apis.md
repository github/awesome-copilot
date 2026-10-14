# Cypress APIs removed or changed, by major version

The scanner reports these as CY007. An entry is graded `error` when the installed major already rejects it. Always confirm against the [official migration guide](https://docs.cypress.io/app/references/migration-guide) for the exact target version.

## Cypress 16

Requires Node.js 22, 24, or 26+.

| Removed or changed | Replacement |
|---|---|
| `Cypress.env()` | `cy.env([...])` for secrets, `Cypress.expose()` for public values |
| `env` in a test or suite config object | `expose` |
| `allowCypressEnv` config option | delete |
| `cy.exec()`, `execTimeout` | `cy.task()` in `setupNodeEvents`, `taskTimeout` |
| `.end()` | delete the call |
| `cy.getCookie()`, `cy.getCookies()`, `cy.getAllCookies()`, `cy.getAllLocalStorage()`, `cy.getAllSessionStorage()` | now queries: chain `.should()`; override with `Cypress.Commands.overwriteQuery()` |
| `Cypress.config('viewportWidth' / 'viewportHeight' / 'blockHosts', v)` during a test | `cy.viewport(w, h)`; `{ blockHosts: '...' }` in the test config object |
| `experimentalMemoryManagement: true` | delete (on by default as `manageBrowserMemory`) |
| `experimentalMemoryManagement: false` | `manageBrowserMemory: false` |
| `experimentalFastVisibility` | delete; `visibilityStrategy` defaults to `'modern'` |
| `experimentalSourceRewriting` | delete; `removeSRIAttributes` if it was used for SRI errors |
| `keystrokeDelay` default 10 | default is 0; pass `{ delay: 10 }` to a single `.type()` only where the app needs it |
| CoffeeScript specs, support files, fixtures | convert to JavaScript or TypeScript |
| `cypress/angular-zoneless` | `cypress/angular` |
| Electron as the test browser | deprecated: set `defaultBrowser: 'chrome'` or pass `--browser chrome` |

Component testing minimums in 16: Angular 21, Vite 8, Next.js 15.0.4.

### Migrating `Cypress.env()`

Decide per key whether the value is sensitive.

**Public values** (feature flags, API version, public URLs) are a mechanical change, because `Cypress.expose()` is synchronous like the API it replaces:

```js
// cypress.config.js
module.exports = defineConfig({
  expose: { apiVersion: 'v2', featureNewCheckout: true },   // moved out of env
  env: { apiKey: process.env.API_KEY },                     // secrets stay in env
})

// Before
const version = Cypress.env('apiVersion')
// After
const version = Cypress.expose('apiVersion')
```

- CLI: `--env apiVersion=v2` becomes `--expose apiVersion=v2` (short form `-x`).
- Per test: `it('...', { env: { flag: true } }, ...)` becomes `{ expose: { flag: true } }`.
- `CYPRESS_*` environment variables populate `env`, not `expose`. A public value that CI injects as `CYPRESS_apiVersion` must be either read with `cy.env()` or copied into `expose` in the config file (`expose: { apiVersion: process.env.API_VERSION }`).

**Sensitive values** require restructuring, because `cy.env()` is an asynchronous command:

```js
// Before: read at module scope, used anywhere
const apiKey = Cypress.env('apiKey')
it('lists users', () => {
  cy.request({ url: '/api/users', headers: { Authorization: `Bearer ${apiKey}` } })
})

// After: read inside the test, used inside the callback
it('lists users', () => {
  cy.env(['apiKey']).then(({ apiKey }) => {
    cy.request({ url: '/api/users', headers: { Authorization: `Bearer ${apiKey}` } })
  })
})
```

- `cy.env()` takes an array of keys and yields an object. An undefined key yields `undefined`.
- It cannot be called at module scope or outside a test or hook.
- It cannot set values. Code that used `Cypress.env('token', value)` to pass state between steps should use an alias within a test, or a `set`/`get` pair of tasks across tests.
- Yielded values are not masked. Do not assert on them or pass them through `.its()`.
- Inside `cy.origin()`, call `cy.env()` within the callback.

**Plugins** that call `Cypress.env()` throw on Cypress 16. Upgrade them in the same change. Known minimums: `@cypress/grep` 6.0.0, `@cypress/code-coverage` 4.0.0, `cypress-mailpit` 2.0.0. Search `node_modules` of other Cypress plugins for `Cypress.env(` before upgrading.

On Cypress 15.10 through 15.x, set `allowCypressEnv: false` after migrating to make any remaining `Cypress.env()` call fail early. Remove the option when moving to 16.

### Migrating `cy.exec()`

```js
// cypress.config.js
const { execFileSync } = require('node:child_process')

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on) {
      on('task', {
        seedDatabase(fixture) {
          execFileSync('node', ['scripts/seed.js', fixture], { stdio: 'inherit' })
          return null
        },
      })
    },
  },
})

// Before
cy.exec('node scripts/seed.js users')
// After
cy.task('seedDatabase', 'users')
```

- A task must return a value or `null`. Returning `undefined` fails the task.
- Use `execFileSync` with an argument array so test input never reaches a shell.
- Tasks time out after 60 seconds by default; set `taskTimeout` for longer work.

## Cypress 15

Requires Node.js 20, 22, or 24+ (18 and 23 dropped).

| Removed or changed | Replacement |
|---|---|
| `cy.stub(obj, 'method', fn)` | `cy.stub(obj, 'method').callsFake(fn)` |
| `cy.exec(...).its('code')` | `exitCode` |
| `Cypress.SelectorPlayground` | `Cypress.ElementSelector` |
| Webpack 4 | Webpack 5 |
| Firefox automation over CDP | WebDriver BiDi only; Firefox 135+ (140+ from 15.19) |
| CommonJS config with `@cypress/vite-dev-server` | ESM config (`.mjs`, `"type": "module"`, or `cypress.config.ts`) |

## Cypress 14

| Removed or changed | Replacement |
|---|---|
| Commands on a different subdomain worked without `cy.origin()` | wrap them in `cy.origin()`; `injectDocumentDomain` is a deprecated escape hatch |
| `experimentalSkipDomainInjection` | removed |
| `experimentalJustInTimeCompile` | `justInTimeCompile` |

## Cypress 13

| Removed or changed | Replacement |
|---|---|
| `video` default `true` | default `false`; enable explicitly if CI relies on videos |
| `videoUploadOnPasses` | removed |

## Cypress 12

| Removed or changed | Replacement |
|---|---|
| `cy.server()`, `cy.route()` | `cy.intercept()` |
| `Cypress.Cookies.preserveOnce()`, `Cypress.Cookies.defaults()` | `cy.session()` |
| `experimentalSessionAndOrigin` | delete; `cy.session()` and `cy.origin()` are stable |
| Tests shared page and storage state | `testIsolation` is on: each test starts on a blank page with cleared cookies and storage |

`cy.route()` to `cy.intercept()` is not a rename. Differences that change test behavior:

- `cy.intercept()` glob-matches the full URL including the query string. `cy.intercept('/api/users')` never matches `/api/users?page=2`; use `'/api/users*'` or `{ pathname: '/api/users' }`.
- `cy.intercept()` matches every HTTP method when none is given. `cy.route()` defaulted to `GET`.
- When several intercepts match, the most recently defined one runs first. Define general stubs in `beforeEach` and overrides inside the test.
- A response served from the browser cache never reaches the network layer, so the intercept does not fire and `cy.wait('@alias')` times out. Disable cache headers on the test server.
- `cy.intercept()` also sees `fetch` requests and static resources, which `cy.route()` did not.
