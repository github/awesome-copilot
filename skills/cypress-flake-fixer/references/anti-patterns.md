# Cypress anti-patterns: before and after

One section per scanner rule. Each shows the failing shape, why it flakes, and the replacement.

## CY001 fixed-wait

```js
// Before
cy.get('[data-cy=save]').click()
cy.wait(3000)
cy.get('[data-cy=toast]').should('contain', 'Saved')

// After: the wait was covering a request
cy.intercept('PUT', '/api/profile').as('saveProfile')
cy.get('[data-cy=save]').click()
cy.wait('@saveProfile').its('response.statusCode').should('eq', 200)
cy.get('[data-cy=toast]').should('contain', 'Saved')
```

The delay is either too short on a slow machine (flake) or too long everywhere (slow suite). When the wait covers a timer in the app, fake the clock:

```js
cy.clock()
cy.visit('/search')
cy.get('[data-cy=query]').type('shoes')
cy.tick(300) // the debounce interval
cy.get('[data-cy=result]').should('have.length.greaterThan', 0)
```

`cy.clock()` must run before `cy.visit()` to capture timers the app creates while loading.

## CY002 assigned-return-value

```js
// Before
const row = cy.get('[data-cy=row]').first()
row.click()
row.should('have.class', 'selected')

// After
cy.get('[data-cy=row]').first().as('row')
cy.get('@row').click()
cy.get('@row').should('have.class', 'selected')
```

A command returns a chainable, not an element. Reusing the variable chains new commands onto a subject captured once. An alias re-runs the query each time it is read.

To use a value later in the test, nest or alias the value:

```js
cy.get('[data-cy=order-id]').invoke('text').as('orderId')
cy.get('@orderId').then((orderId) => {
  cy.visit(`/orders/${orderId}`)
})
```

`cy.stub()` and `cy.spy()` are synchronous and may be assigned.

## CY003 async-await

```js
// Before
it('loads the user', async () => {
  const user = await cy.request('/api/me')
  expect(user.body.name).to.eq('Ada')
})

// After
it('loads the user', () => {
  cy.request('/api/me').its('body.name').should('eq', 'Ada')
})
```

Commands are not promises. `await` resolves at the wrong time or never, and an `async` test function returns a promise that Cypress races against its own queue. Awaiting a real promise inside `cy.then()` or `cy.wrap(promise)` is fine.

## CY004 force-true

```js
// Before
cy.get('[data-cy=submit]').click({ force: true })

// After: the button was covered by a cookie banner
cy.get('[data-cy=cookie-accept]').click()
cy.get('[data-cy=cookie-banner]').should('not.exist')
cy.get('[data-cy=submit]').click()
```

Read the actionability error Cypress printed before `force` was added. It names the cause:

| Error says | Usual cause | Fix |
|---|---|---|
| is being covered by another element | Overlay, sticky header, banner, toast | Dismiss it, or scroll with `scrollIntoView()` and assert position |
| is not visible | Collapsed menu, `display: none`, zero size | Open the parent first |
| is disabled | Form not yet valid, request in flight | Assert `.should('be.enabled')` before acting |
| is animating | Transition still running | Assert the final state; do not disable the check globally |

`force: true` is legitimate for hidden native inputs behind a styled control, such as a custom file input or checkbox. Leave those and add a comment.

## CY005 chain-after-action

```js
// Before
cy.get('[data-cy=todo]').first().click().find('[data-cy=delete]').click()

// After
cy.get('[data-cy=todo]').first().click()
cy.get('[data-cy=todo]').first().find('[data-cy=delete]').click()
```

An action runs once. If it triggers a re-render, the subject passed down the chain is the old element, and the next command fails with a detached-DOM error or acts on a node that is no longer on screen. A new `cy.get()` re-queries.

Chaining is fine when the element cannot be replaced: `cy.get(input).focus().clear().type('x')` on a plain input.

## CY006 one-shot-assertion

```js
// Before
cy.get('[data-cy=count]').then(($el) => {
  expect(Number($el.text())).to.eq(3)
})

// After: simple cases
cy.get('[data-cy=count]').should('have.text', '3')

// After: when the value needs processing
cy.get('[data-cy=count]').should(($el) => {
  expect(Number($el.text())).to.eq(3)
})
```

`.then()` runs its callback once with whatever the element contained at that instant. `.should(callback)` re-runs the query and the callback until it stops throwing. Do not call `cy` commands inside a `.should()` callback.

`.then()` is correct after one-shot commands such as `cy.request()`, `cy.task()`, `cy.wait('@alias')`, and `cy.env()`.

## CY008 conditional-on-dom

```js
// Before
cy.get('body').then(($body) => {
  if ($body.find('[data-cy=promo-modal]').length) {
    cy.get('[data-cy=promo-close]').click()
  }
})

// After: control the condition
cy.intercept('GET', '/api/promotions', { body: [] })
cy.visit('/')
cy.get('[data-cy=promo-modal]').should('not.exist')
```

The `if` runs once, at an arbitrary moment. If the modal renders 50 ms later, the test continues with it open. Remove the uncertainty at its source: stub the response, seed the data, set the cookie or feature flag that decides the branch.

## CY009 exclusive-or-debug

Remove `.only`, `cy.pause()`, and `cy.debug()` before committing. A committed `.only` silently disables every other test in the spec.

## CY010 cleanup-in-after-hook

```js
// Before
afterEach(() => { cy.task('db:reset') })

// After
beforeEach(() => { cy.task('db:reset') })
```

An `after` hook does not run when the run is cancelled, the browser crashes, or a developer refreshes the runner. The next run then starts from dirty state. Resetting first also leaves the failing state in place for debugging.

## CY011 absolute-local-visit

Set `baseUrl` in `cypress.config` and call `cy.visit('/login')`. Without it Cypress loads on a random localhost port and reloads when the first `cy.visit()` runs, and the same spec cannot run against another environment.

## CY012 ui-login-without-session

```js
// cypress/support/commands.js
Cypress.Commands.add('login', (email) => {
  cy.session(['login', email], () => {
    cy.env(['userPassword']).then(({ userPassword }) => {
      cy.request('POST', '/api/login', { email, password: userPassword })
    })
  }, {
    validate() {
      cy.request('/api/me').its('status').should('eq', 200)
    },
  })
})

// in specs
beforeEach(() => {
  cy.login('ada@example.com')
  cy.visit('/dashboard')
})
```

- Put every input that changes the session in the `id` array, never the password.
- The page is blank after `cy.session()`; call `cy.visit()`.
- On Cypress older than 15.10, read the password with `Cypress.env('userPassword')` instead of `cy.env()`.
- Keep one test that logs in through the UI. Everything else should use the cached session.

## CY013 positional-selector and CY101 brittle-selector

```js
// Before
cy.get('ul.results > li:nth-child(2) .btn-primary').click()

// After
cy.get('[data-cy=result]').eq(1).find('[data-cy=open]').click()
// or, when the row is identified by content
cy.contains('[data-cy=result]', 'Invoice 1042').find('[data-cy=open]').click()
```

Class names change with styling work and positions change with sorting and data. Add `data-cy` attributes to the application when they are missing; that is a legitimate application change for a test fix.

## CY102 negative-assertion-as-wait

```js
// Before
cy.get('[data-cy=save]').click()
cy.get('[data-cy=spinner]').should('not.exist')
cy.get('[data-cy=status]').should('have.text', 'Saved')

// After
cy.get('[data-cy=save]').click()
cy.get('[data-cy=status]').should('have.text', 'Saved')
```

`should('not.exist')` passes immediately if the spinner has not rendered yet. The assertion on the final state already waits for the right moment. Keep a negative assertion only after a positive one has proved the page reached the expected state.

## CY103 variable-wait

`cy.wait(TIMEOUT)` with a numeric constant is CY001 behind a name. `cy.wait(alias)` where the variable holds `'@orders'` is fine. Check the declaration.

## Patterns the scanner cannot see

- **Intercept registered too late.** Compare the order of `cy.intercept()` and the action or `cy.visit()` that triggers the request.
- **Shared mutable test data.** Two specs that edit the same seeded record collide when specs run in parallel. Create a record per test.
- **Order dependence.** Run the failing test with `.only`. If it fails alone, an earlier test was setting state for it.
- **Time and locale.** Assertions on formatted dates or "today" fail near midnight and in other time zones. Fix the clock with `cy.clock(new Date(2025, 0, 15))`.
- **Third-party scripts.** Analytics and chat widgets slow page load unpredictably. Block them with the `blockHosts` config option.
- **Viewport-dependent layout.** A menu that collapses below a breakpoint behaves differently in CI when the viewport differs. Set `viewportWidth` and `viewportHeight` in the config.
