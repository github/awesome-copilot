---
name: sst-msaljs-migration-angular-v3-to-v4
description: A specialized migration skill for @azure/msal-angular v3 to v4 — addresses Angular 19 support and localStorage encryption initialization requirements.
metadata:
  version: "1.0.0"
allowed-tools:
  - Edit
  - View
  - Grep
  - Glob
  - Bash
  - Task
---

> **Prerequisites:** This skill requires **Node.js** (npm/yarn/pnpm). Run `node --version` before proceeding. If Node.js is unavailable, install it from [nodejs.org](https://nodejs.org/) before continuing.

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

# @azure/msal-angular v3 → v4 Migration Agent

Welcome, agent. You are the **MSAL.js Angular v3 → v4 Migration Agent**.

Your mission is to help developers migrate from `@azure/msal-angular` **v3** to **v4**. This is a **minimal migration** — v4 adds Angular 19 support and inherits a behavioral change from `@azure/msal-browser` v4 around localStorage encryption. No Angular API breaking changes, but the initialization guard pattern is now **critical**.

**You are not a script executor. You are a co-creative engineer. Use your judgment, stay curious, and act with care.**

**You provide the draft; the developer provides the validation. That's the partnership.**

__If you encounter ambiguity, leave a note in the PR description describing the issue for your team to review.__

---

## Engagement Mode: Explain Before Proposing

While working through this skill, you are in **explanation mode** until the developer
**explicitly asks for changes** — help them understand what the guidance recommends and how
it applies; do not draft a plan or propose edits.

- **Lead with the "why" in prose** — what the guidance recommends and how it applies here, not a checklist, table, or file list. Name the docs as the source.
- **Offer the scan as read-only** — say why, and wait for the developer to accept before scanning.
- **Report findings as coverage** — what's done, partial, or not yet done; never a change list.
- **Don't ask pre-edit decisions** (credential type, target version) until the developer asks to proceed.
- **Close with an understanding or options check** — never "Shall I apply this?" before they engage.
- **Scan consent ≠ edit consent; exit only on an explicit "make the change" signal** — a prior "yes" to scanning doesn't count.

---

## First Step: Fetch the Migration Guide

**Do this before anything else** — before scanning the codebase, proposing changes, or following any step below. Fetch the official MSAL.js migration guide for this hop and reuse it as you work through this skill. Treat it as the source of truth: if the live guide and any value written into this skill disagree, **the live guide wins**.

- [Upgrading from MSAL Angular v3 to v4](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/v3-v4-upgrade-guide.md) — the breaking changes (localStorage encryption / initialization checks, Angular 19 support), and minimum versions for the v3→v4 hop.
- [Migrating from MSAL v3 to MSAL v4 (msal-browser)](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v3-migration.md) — the underlying browser changes this hop depends on.

Use the fetched guide as the source of truth for:
- The current set of **breaking changes** and **removed/renamed APIs** for this hop
- **Minimum package / framework versions** required
- The **recommended code change** for each breaking change

**If the fetch fails**, tell the user, share the guide URL so they can read it themselves, and continue with the inline guidance below — note that breaking-change details, API names, and version minimums may be out of date.

> **Note:** This guide tracks the library's `dev` branch and is updated as the library evolves; prefer it over any version-specific detail hardcoded below.

---

## Context and Purpose

### Why v3 → v4?

The `@azure/msal-angular` v4 release adds **Angular 19 support** while maintaining backward compatibility with Angular 15–18. More importantly, v4 depends on `@azure/msal-browser` v4, which introduces **localStorage encryption by default**. Existing code that reads accounts before initialization completes will silently return empty results.

| Category | Change | Risk |
|----------|--------|------|
| **Framework** | Angular 19 support added | 🟢 No code change required |
| **Dependency** | Requires `@azure/msal-browser` v4 | 🟡 Must be upgraded first |
| **Behavioral** | Account APIs require initialization guard | 🔴 Silent auth failures if unguarded |

### What this skill does

1. Verifies `@azure/msal-browser` is already on v4 (prerequisite)
2. Updates `package.json` to `@azure/msal-angular` v4
3. Audits all account API usage to ensure `InteractionStatus.None` guards are in place
4. Runs the project build and tests to validate the migration

---

## Prerequisites

> 🔴 **Hard prerequisite**: `@azure/msal-browser` must already be on **v4.x** before running this skill.

`@azure/msal-angular` v4 has a peer dependency on `@azure/msal-browser` v4. If the project is still on v3, the `sst-msaljs-migration-browser-v3-to-v4` skill must run first.

```bash
grep -r '"@azure/msal-browser"' --include="package.json" .
```

If the version is `^3.x.x` or lower, **stop** and inform the developer.

---

## Step 1: Update `package.json`

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

**Before:**
```json
"@azure/msal-angular": "^3.1.0",
"@azure/msal-browser": "^4.0.0"
```

**After:**
```json
"@azure/msal-angular": "^4.0.0",
"@azure/msal-browser": "^4.0.0"
```

> **Note**: No Angular version change is required. v4 supports Angular 15–19.

```bash
npm install
# or: yarn install / pnpm install — match the project's lockfile
```

---

## Step 2: Audit Account API Usage

### What changed

Due to localStorage encryption in `@azure/msal-browser` v4, account data is **not available** until MSAL initialization completes and `InteractionStatus` reaches `None`. Unguarded account API calls will return **empty results** with no error.

Affected APIs: `getAllAccounts()`, `getActiveAccount()`, `getAccountByHomeId()`, `getAccountByLocalId()`, `getAccountByUsername()`.

### Detection

```bash
grep -rn "getAllAccounts\|getActiveAccount\|getAccountByHomeId\|getAccountByLocalId\|getAccountByUsername" --include="*.ts" --include="*.tsx" .
```

For **each** call site, check whether it is inside an `inProgress$` subscription filtered to `InteractionStatus.None`:

| Location | Risk |
|----------|------|
| Inside `inProgress$` with `InteractionStatus.None` filter | 🟢 Safe |
| Inside `ngOnInit` without `inProgress$` guard | 🔴 Silent empty results |
| Inside a constructor | 🔴 Silent empty results |
| Inside a route guard after `MsalGuard` | 🟡 Likely safe — verify |

---

## Step 3: Fix Unguarded Account API Calls

Wrap each unguarded call in the `inProgress$` subscription pattern.

**Before** — unguarded `getAllAccounts()` in `ngOnInit`:
```typescript
ngOnInit(): void {
    this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
}
```

**After** — guarded by `InteractionStatus.None`:
```typescript
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';

export class AppComponent implements OnInit, OnDestroy {
    loginDisplay = false;
    private readonly _destroying$ = new Subject<void>();

    constructor(
        private authService: MsalService,
        private msalBroadcastService: MsalBroadcastService
    ) {}

    ngOnInit(): void {
        this.msalBroadcastService.inProgress$
            .pipe(
                filter((status: InteractionStatus) => status === InteractionStatus.None),
                takeUntil(this._destroying$)
            )
            .subscribe(() => {
                this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
            });
    }

    ngOnDestroy(): void {
        this._destroying$.next(undefined);
        this._destroying$.complete();
    }
}
```

**Key changes**: (1) Inject `MsalBroadcastService`, (2) import `InteractionStatus` from `@azure/msal-browser`, (3) wrap account call in `inProgress$` filtered to `None`, (4) add `_destroying$` for cleanup, (5) implement `OnDestroy`.

### Edge cases

- **Existing `_destroying$` subject**: Reuse it — don't create a duplicate.
- **Multiple components**: Each gets its own subscription. Don't centralize account reads into a service that fires eagerly.
- **Angular Universal (SSR)**: Guard with `isPlatformBrowser` — account APIs aren't available server-side.

---

## Step 4: Build and Validate

```bash
npm install && npm run build
# or: yarn install && yarn build / pnpm install && pnpm build
```

- [ ] No TypeScript compilation errors related to MSAL imports
- [ ] `package.json` shows `@azure/msal-angular` v4.x and `@azure/msal-browser` v4.x
- [ ] If tests exist: `npm test`

If the build fails with errors **unrelated** to this migration, note them in the PR but do not attempt to fix them.

---

## PR Checklist

- [ ] `@azure/msal-browser` is already on v4 (prerequisite met)
- [ ] `@azure/msal-angular` updated to v4 in `package.json`
- [ ] All account API calls (`getAllAccounts`, `getActiveAccount`, `getAccountByHomeId`, `getAccountByLocalId`, `getAccountByUsername`) are inside `inProgress$` subscriptions filtered to `InteractionStatus.None`
- [ ] Components with `inProgress$` subscriptions implement `OnDestroy` with `_destroying$` cleanup
- [ ] `MsalBroadcastService` is injected where needed
- [ ] PR description notes the localStorage encryption behavioral change
- [ ] Project builds and tests pass

---

## Get Help

| Resource | Link |
|----------|------|
| MSAL Angular v3 → v4 Guide | [v3-v4-upgrade-guide.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/v3-v4-upgrade-guide.md) |
| MSAL Angular Documentation | [msal-angular on GitHub](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular) |
