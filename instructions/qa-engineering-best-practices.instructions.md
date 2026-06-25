---
applyTo: '**'
description: 'Comprehensive QA engineering best practices covering test strategy, test pyramid, naming conventions, assertion patterns, bug reporting, and automation guidelines for modern software projects.'
---

# QA Engineering Best Practices

A structured set of instructions for GitHub Copilot to assist with quality assurance engineering tasks including test design, automation, and defect management across any technology stack.

---

## Core Testing Principles

- **Test early, test often**: Shift testing left — write tests alongside code, not after.
- **Test one thing at a time**: Each test case should verify a single behaviour or assertion.
- **Tests are first-class code**: Apply the same readability, naming, and refactoring standards to test code as to production code.
- **Fail fast**: Tests should produce clear, actionable failures that point directly to the broken behaviour.
- **Deterministic tests**: Tests must produce the same result on every run. Eliminate randomness, timing dependencies, and shared mutable state.
- **Independent tests**: No test should depend on another test's side effects. Tests must be runnable in any order.

---

## Test Pyramid

Follow the test pyramid to balance coverage, speed, and maintenance cost:

| Layer | Scope | Quantity | Speed |
|-------|-------|----------|-------|
| Unit | Single function / class | Many (60–70 %) | Milliseconds |
| Integration | Module boundaries, DB, API contracts | Moderate (20–30 %) | Seconds |
| End-to-End | Full user journey across UI + backend | Few (5–10 %) | Minutes |

- Prefer unit tests for business logic and edge cases.
- Use integration tests to validate contracts between services and external dependencies.
- Reserve end-to-end tests for critical user paths and smoke suites.

---

## Test Naming Conventions

Use the **Given / When / Then** (GWT) or **should_doX_whenY** pattern consistently.

```
// Good – describes scenario, action, expected result
test('should return 404 when product id does not exist')
test('given an expired token, when the user calls /me, then it returns 401')

// Bad – vague, implementation-focused
test('test1')
test('check user')
```

- Group related tests in `describe` / `context` blocks named after the unit under test.
- Use `it` or `test` for individual cases.
- Test names must be readable as standalone sentences.

---

## Assertion Best Practices

- **One logical assertion per test** where practical; avoid asserting multiple unrelated things.
- Use **specific matchers** over equality checks (`toContain`, `toBeGreaterThan`, `toMatchObject`).
- Always assert the **exact expected value**, not just truthiness (`expect(result).toBe(42)` not `expect(result).toBeTruthy()`).
- For exception testing, assert both the exception type and message.
- Prefer **positive assertions** over negative ones when testing the happy path.

```typescript
// Good
expect(response.status).toBe(200);
expect(response.body.items).toHaveLength(3);

// Avoid
expect(response).toBeTruthy();
expect(response.body).not.toBeNull();
```

---

## Test Data Management

- Use **factories or builders** to create test data — avoid hardcoding raw objects in every test.
- Keep test data **minimal**: only include fields relevant to the test.
- Use **unique identifiers** per test run to avoid collision in shared environments.
- Never use production data or PII in tests.
- Reset or isolate state between tests (in-memory DB, transactions rolled back, mocked dependencies).

---

## Mocking and Stubbing Guidelines

- Mock **at the boundary** (HTTP clients, DB adapters, message queues) — not deep inside business logic.
- Prefer **real implementations** for pure functions and simple value objects.
- Stubs return controlled data; mocks additionally verify interactions — choose the right tool.
- Reset all mocks between tests to prevent state leakage.
- Document why a dependency is mocked if the reason is non-obvious.

---

## API Testing

- Validate **status code**, **response schema**, **headers**, and **response time** for every endpoint.
- Test all **HTTP methods** the endpoint exposes (GET, POST, PUT, PATCH, DELETE).
- Cover **authentication and authorisation** paths: valid token, expired token, missing token, wrong role.
- Test **boundary values** for inputs: empty string, null, max length, special characters, Unicode.
- Validate **error response bodies** follow a consistent schema.
- Assert **idempotency** for PUT and DELETE operations.

---

## UI / End-to-End Testing

- Target **user-visible behaviour**, not implementation details (avoid asserting CSS classes or internal state).
- Use **accessible selectors** in order of preference: `role` → `label` → `test-id` → `text`.
- Avoid `sleep` / fixed waits; use **explicit waits** on element state (visible, enabled, network idle).
- Run E2E tests against a **stable, isolated environment** (not shared staging).
- Keep E2E scenarios **short and focused** — break long flows into smaller composable steps.
- Capture **screenshots and traces** on failure for easier debugging.

---

## Performance Testing

- Define **SLOs** (Service Level Objectives) before writing performance tests: target latency p50/p95/p99, throughput, error rate.
- Include **ramp-up**, **steady state**, and **ramp-down** phases in load tests.
- Test under **realistic data volumes** — synthetic tests with empty DBs are not representative.
- Track results over time to detect **performance regressions**.
- Distinguish between **load testing** (expected traffic), **stress testing** (beyond capacity), and **soak testing** (sustained load over time).

---

## Bug Reporting Standards

A good bug report includes:

1. **Title**: concise, specific — include component, action, and symptom (`[Checkout] Order total is incorrect when coupon is applied`).
2. **Environment**: OS, browser/runtime version, deployment environment.
3. **Steps to reproduce**: numbered, minimal, deterministic.
4. **Expected result**: what should happen.
5. **Actual result**: what actually happens, including error messages and stack traces.
6. **Severity**: Critical / High / Medium / Low (defined by business impact).
7. **Attachments**: screenshots, logs, network traces, test IDs.

---

## Test Coverage Guidelines

- Aim for **meaningful coverage**, not a percentage target — 100 % line coverage with trivial tests is worthless.
- Prioritise coverage for **critical paths**, **complex logic**, and **previously buggy areas**.
- Track **branch coverage** and **mutation scores** alongside line coverage.
- Use coverage reports to find untested **edge cases**, not to game metrics.

---

## CI/CD Integration

- Tests must pass in CI before any merge to main/trunk — no exceptions.
- Run **fast tests** (unit, lint) on every commit; run **slow tests** (integration, E2E) on PR merge or nightly.
- Make test failures **visible and actionable** in CI output — include test name, failure reason, and relevant logs.
- Archive **test reports and artefacts** (JUnit XML, coverage HTML, traces) as CI build artefacts.
- Configure **flaky test detection**: auto-retry once, flag as flaky after repeated inconsistency.

---

## Test Review Checklist

Before approving a PR that changes tests:

- [ ] New behaviour is covered by tests at the appropriate pyramid level.
- [ ] Tests are named clearly and follow the project convention.
- [ ] No `sleep`, `Thread.Sleep`, or arbitrary timeouts.
- [ ] Mocks are reset after each test.
- [ ] No hardcoded environment-specific values (URLs, credentials).
- [ ] Tests are independent and can run in isolation.
- [ ] Test code is readable without needing to read the implementation.
