# Conventional Commits — Quick Reference Guide

Full spec: https://www.conventionalcommits.org/en/v1.0.0/

---

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

---

## Type Examples

### `feat` — New Feature
```
feat(payments): add Apple Pay support for checkout flow

Users in supported regions can now complete purchases using Apple Pay.
This reduces checkout friction and is expected to improve mobile conversion rates.

Closes #88
```

### `fix` — Bug Fix
```
fix(api): correct off-by-one error in pagination offset

The results page was skipping the last item on every page because the
offset calculation used `>` instead of `>=`. Users were missing records
silently with no error.

Fixes #201
```

### `refactor` — Code Restructure (no behavior change)
```
refactor(user-service): extract email validation into shared utility

Email validation logic was duplicated across 4 modules. Extracted into
`utils/validators.ts` so future changes only need to happen in one place.
```

### `perf` — Performance Improvement
```
perf(dashboard): lazy-load chart components to reduce initial bundle size

The dashboard was importing all chart types upfront, adding ~180KB to the
initial load. Charts are now loaded on demand, cutting initial load time
by ~40% on slow connections.
```

### `docs` — Documentation Only
```
docs(readme): add local development setup instructions

New contributors were struggling to get the dev environment running.
Added step-by-step instructions covering Node version, env vars, and
the database seed command.
```

### `test` — Tests Added or Updated
```
test(auth): add coverage for concurrent login edge cases

The login flow had no tests for simultaneous requests from the same
session. Added tests that verify only one session token is issued
when multiple requests arrive in the same tick.
```

### `chore` — Maintenance / Config
```
chore(deps): upgrade eslint from v8 to v9

v8 reached end-of-life. Migrated config to flat config format required
by v9. No rule changes — this is a tooling-only update.
```

### `ci` — CI/CD Pipeline
```
ci: add caching for node_modules in GitHub Actions

Cold CI runs were taking 4+ minutes due to repeated installs.
Adding cache restore on lockfile hash reduces this to ~90 seconds.
```

### `revert` — Reverting a Commit
```
revert: feat(notifications): add push notification opt-in

Reverts commit a3f92bc.

The push notification feature caused a crash on Android 12 devices.
Rolling back until the root cause is identified.
```

---

## Scope Guidelines

The `scope` is optional but strongly recommended. It should be:
- A short noun identifying the area of the codebase: `auth`, `api`, `dashboard`, `payments`
- Consistent across the project (don't mix `user` and `users`)
- Omitted if the change is truly global

---

## Breaking Changes

Add `BREAKING CHANGE:` in the footer (or use `!` after the type):

```
feat(api)!: remove v1 endpoints

All v1 REST endpoints have been removed following the 6-month deprecation
notice. Consumers must migrate to v2 before upgrading.

BREAKING CHANGE: /api/v1/* routes no longer exist. See migration guide at docs/v2-migration.md
```

---

## Body Writing Tips

Ask yourself before writing the body:
- **What was broken / missing before this change?**
- **Why was this approach chosen over alternatives?**
- **What will be different for users or developers after this?**

Avoid:
- Restating what the diff already shows ("changed the variable name")
- Vague language ("various improvements", "miscellaneous fixes")
- Future tense ("this will fix...") — write in present/past tense

---

## Commit Message Anti-Patterns

| ❌ Bad | ✅ Better |
|--------|----------|
| `fix bug` | `fix(cart): prevent duplicate items on rapid add-to-cart clicks` |
| `updates` | `feat(profile): allow users to update display name` |
| `WIP` | Don't commit WIP — stash it |
| `misc changes` | Split into separate, meaningful commits |
| `John's changes` | Describe what changed, not who changed it |
