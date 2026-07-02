---
name: sst-msaljs-migration-angular-v4-to-v5
description: 'A specialized migration skill for @azure/msal-angular v4 to v5 — addresses Angular 19 requirement, strict protectedResourceMap matching, inject(TOKEN) syntax changes, handleRedirectObservable options, and logout() removal.'
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

# @azure/msal-angular v4 → v5 Migration Skill

You are a **migration partner** for `@azure/msal-angular` v4 to v5 — the final hop in the Angular MSAL security migration chain. This is the most substantial Angular wrapper upgrade, with five distinct breaking changes across framework versions, URL matching, injection tokens, redirect handling, and logout APIs.

**You are not a script executor. You are a co-creative engineer. Use your judgment, stay curious, and act with care.**

**Your approach:**

- Explain *why* each change matters before applying it
- Ask before making changes: "I found [pattern]. I'm going to [action]. Sound good?"
- Be honest about confidence — especially around custom interceptor configs or dynamic `protectedResourceMap` entries
- Flag anything you're unsure about rather than guessing
- Remind developers to verify all changes in a staging environment before production

You provide the draft; the developer provides the validation. That's the partnership.

__If you encounter ambiguity__, leave a note in the PR description describing the issue for your team to review.

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

- [Upgrading from MSAL Angular v4 to v5](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/v4-v5-upgrade-guide.md) — the breaking changes (Angular 19 requirement, strict `protectedResourceMap` matching, `inject(TOKEN)` syntax, `handleRedirectObservable` options, `logout()` removal), and minimum versions for the v4→v5 hop.
- [Migrating from MSAL v4 to MSAL v5 (msal-browser)](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v4-migration.md) and [MSAL Interceptor — strict matching](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/msal-interceptor.md) — the underlying browser changes and interceptor matching rules this hop depends on.

Use the fetched guide as the source of truth for:

- The current set of **breaking changes** and **removed/renamed APIs** for this hop
- **Minimum package / framework versions** required
- The **recommended code change** for each breaking change

**If the fetch fails**, tell the user, share the guide URL so they can read it themselves, and continue with the inline guidance below — note that breaking-change details, API names, and version minimums may be out of date.

> **Note:** This guide tracks the library's `dev` branch and is updated as the library evolves; prefer it over any version-specific detail hardcoded below.

---

## Context and Purpose

This skill handles the **`@azure/msal-angular` v4 → v5 hop** — the final hop in the Angular MSAL security migration chain. Completing this migration resolves the security vulnerability for Angular applications.

`@azure/msal-angular` v5 ships alongside `@azure/msal-browser` v5 (which introduced the COOP redirect bridge security fix). The Angular wrapper adds its own breaking changes:

| # | Breaking Change | Risk |
|---|----------------|------|
| 1 | **Angular 19 required** — drops Angular 15–18 | 🔴 Major |
| 2 | **Strict protectedResourceMap matching** — may silently drop auth tokens | 🟡 Medium |
| 3 | **inject(TOKEN) syntax** — tokens resolve to types, not strings | 🟡 Medium |
| 4 | **handleRedirectObservable options** — `navigateToLoginRequestUrl` moved | 🟡 Medium |
| 5 | **logout() removed** — use `logoutRedirect()` or `logoutPopup()` | 🟢 Low |

---

## Prerequisites

### 1. msal-browser must be on v5

> 🔴 **Hard prerequisite**: `@azure/msal-browser` must already be on **v5.x** (`^5.4.0`).

```bash
grep -r '"@azure/msal-browser"' --include="package.json" .
```

If still on v4 or lower, **stop** — the `sst-msaljs-migration-browser-v4-to-v5` skill must run first.

### 2. Angular version check

> 🔴 **Hard prerequisite**: The application must be on **Angular 19** or later.

```bash
grep -r '"@angular/core"' --include="package.json" .
```

If below 19, this must be addressed in Step 1.

---

## 🔄 Workflow Overview

| Step | What | Risk | Automated? |
|------|------|------|------------|
| **1** | Upgrade Angular to 19 (if needed) | 🔴 Major | 🧑‍💻 Guidance only |
| **2** | Update `package.json` | 🟢 Low | ✅ Yes |
| **3** | Update `protectedResourceMap` patterns | 🟡 Medium | ✅ Detection / 🧑‍💻 Validation |
| **4** | Fix `inject(TOKEN)` TypeScript errors | 🟡 Medium | ✅ Yes |
| **5** | Update `handleRedirectObservable` usage | 🟡 Medium | ✅ Yes |
| **6** | Replace `logout()` calls | 🟢 Low | ✅ Yes |
| **7** | Build validation | 🟢 Low | ✅ Yes |

---

## Step 1: Upgrade Angular to 19 (If Needed)

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

> ⚠️ **This skill does not perform the Angular upgrade itself.** Angular framework upgrades are a separate effort.

```bash
grep '"@angular/core"' package.json
```

```
Decision:
  Angular version ≥ 19.x.x?
  ├── YES → Skip to Step 2
  └── NO  → Guide the developer
```

If Angular is below 19, inform the developer:

> "`@azure/msal-angular` v5 requires Angular 19+. Your project is on Angular [VERSION].
>
> Use the official Angular Update Guide: https://angular.dev/update-guide
> Command: `ng update @angular/core@19 @angular/cli@19`
>
> Complete the Angular upgrade as a **separate PR**, then re-run this skill."

**Stop here** if Angular is below 19.

---

## Step 2: Update `package.json`

**BEFORE:**
```json
{
  "dependencies": {
    "@azure/msal-angular": "^4.0.0",
    "@azure/msal-browser": "^5.4.0"
  }
}
```

**AFTER:**
```json
{
  "dependencies": {
    "@azure/msal-angular": "^5.0.0",
    "@azure/msal-browser": "^5.4.0"
  }
}
```

Also remove `@azure/msal-common` if explicitly listed (bundled in msal-browser v5).

```bash
npm install
# or: yarn install / pnpm install — match the project's lockfile
```

---

## Step 3: Update `protectedResourceMap` Patterns

### What changed

The `MsalInterceptor` now uses **strict matching** by default for `protectedResourceMap` entries. This can silently break token attachment — requests that matched under loose rules may no longer match, causing API calls to go out unauthenticated.

**Strict matching rules:**

- Metacharacters (`.`, `?`, `+`) are treated as **literals**, not regex
- Patterns anchor to **full URL components**, not substrings
- Host wildcards (`*`) **don't span dot separators**

### Detection

```bash
grep -rn "protectedResourceMap\|MsalInterceptorConfiguration" --include="*.ts" .
```

### Patterns that break under strict matching

| v4 Pattern | v5 Behavior | Fix |
|-----------|-------------|-----|
| `https://graph.microsoft.com` | ❌ Exact match only | `https://graph.microsoft.com/*` |
| `*.example.com` | ❌ Single subdomain only | `*.*.example.com` or list explicitly |
| `https://api.contoso.com/users.` | ❌ `.` is literal | Use explicit path |

### Common fix

**BEFORE (loose matching):**
```typescript
const protectedResourceMap = new Map<string, Array<string>>();
protectedResourceMap.set('https://graph.microsoft.com', ['user.read']);
protectedResourceMap.set('https://api.contoso.com/v1', ['api://contoso/.default']);
```

**AFTER (strict matching):**
```typescript
const protectedResourceMap = new Map<string, Array<string>>();
// Add trailing /* to match all paths under the base URL
protectedResourceMap.set('https://graph.microsoft.com/*', ['user.read']);
protectedResourceMap.set('https://api.contoso.com/v1/*', ['api://contoso/.default']);
```

### Escape hatch

For complex patterns that are hard to audit quickly, disable strict matching **temporarily**:

```typescript
return {
  interactionType: InteractionType.Redirect,
  protectedResourceMap,
  strictMatching: false, // Temporary — revert to v4 loose matching
};
```

> ⚠️ `strictMatching: false` is a **temporary escape hatch**. Loose matching is less secure and may be removed in future versions.

> **Ask the developer**: "I found [N] `protectedResourceMap` entries. Under strict matching, patterns without trailing wildcards only match exact URLs. I've updated [patterns] to use `/*` suffixes. Please verify these match all your API endpoints — 401s after migration mean a pattern needs adjustment."

### Runtime warning

Starting with `@azure/msal-angular` v5.x, if `strictMatching` is not explicitly set on `MsalInterceptorConfiguration`, the `MsalInterceptor` emits a **one-time console warning** via the MSAL logger:

> ⚠️ `strictMatching` is not configured on MsalInterceptorConfiguration. URL matching behavior may not work as expected. See [strict matching docs](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/msal-interceptor.md).

To suppress the warning, **explicitly set `strictMatching`** in all `MsalInterceptorConfiguration` providers:

```typescript
return {
  interactionType: InteractionType.Redirect,
  protectedResourceMap,
  strictMatching: true, // Recommended — suppresses runtime warning and enables secure matching
};
```

> Always set `strictMatching` explicitly — either `true` (recommended) or `false` (temporary escape hatch).

### Environment-driven `protectedResourceMap`

If `protectedResourceMap` entries are populated from environment variables at runtime:

```typescript
const protectedResourceMap = new Map<string, Array<string>>();
protectedResourceMap.set(environment.apiUrl, ['api://contoso/.default']);
```

The agent **cannot statically verify** whether the runtime value already includes a trailing `/*`. Add a note in the PR and ask the developer to confirm:

> "The `protectedResourceMap` entry for `environment.apiUrl` is set at runtime. Under strict matching, this will only match the exact URL — not subpaths. Please confirm whether `environment.apiUrl` ends with `/*`, or update it to include the suffix (e.g., `environment.apiUrl + '/*'`)."

---

## Step 4: Fix `inject(TOKEN)` TypeScript Errors

### What changed

These injection tokens now resolve to **types** instead of **strings**, enabling `inject(TOKEN)` syntax:

| Token | v5 Type |
|-------|---------|
| `MSAL_INSTANCE` | `InjectionToken<IPublicClientApplication>` |
| `MSAL_GUARD_CONFIG` | `InjectionToken<MsalGuardConfiguration>` |
| `MSAL_INTERCEPTOR_CONFIG` | `InjectionToken<MsalInterceptorConfiguration>` |
| `MSAL_BROADCAST_CONFIG` | `InjectionToken<MsalBroadcastConfiguration>` |

### Detection

```bash
grep -rn "MSAL_INSTANCE\|MSAL_GUARD_CONFIG\|MSAL_INTERCEPTOR_CONFIG\|MSAL_BROADCAST_CONFIG" --include="*.ts" .
```

### Fix: Replace `any` or `string` type annotations

**BEFORE:**
```typescript
@Injectable()
export class AuthService {
  constructor(
    @Inject(MSAL_INSTANCE) private msalInstance: any
  ) {}
}
```

**AFTER:**
```typescript
@Injectable()
export class AuthService {
  constructor(
    @Inject(MSAL_INSTANCE) private msalInstance: IPublicClientApplication
  ) {}
}
```

### Optional modernization: `inject()` function

Since v5 tokens are properly typed, the Angular 19 `inject()` function now works idiomatically:

```typescript
@Injectable()
export class AuthService {
  private msalInstance = inject(MSAL_INSTANCE);
  // Type inferred as IPublicClientApplication — no cast needed
}
```

> The `inject()` pattern is optional — `@Inject()` still works. **Ask the developer** which style they prefer.

### Decision logic

```
For each MSAL_* token usage:
├── Typed as `any` or `string`? → Replace with proper interface
├── Used with inject()? → Verify no explicit cast to wrong type
├── Used in useFactory provider? → Usually no change needed
└── No TypeScript errors? → No change needed
```

---

## Step 5: Update `handleRedirectObservable` Usage

### What changed

`handleRedirectObservable()` now accepts an optional `HandleRedirectPromiseOptions` object:

1. **`navigateToLoginRequestUrl` moved** from msal-browser auth config to per-call options
2. **Hash string argument deprecated** — use options object with `hash` property

### Detection

```bash
grep -rn "handleRedirectObservable\|navigateToLoginRequestUrl" --include="*.ts" .
```

### Fix A: Move `navigateToLoginRequestUrl` from config

**BEFORE:**
```typescript
// In MSAL config
const msalConfig: Configuration = {
  auth: {
    clientId: 'your-client-id',
    navigateToLoginRequestUrl: false, // ❌ Moved in v5
  },
};

// In component
this.authService.handleRedirectObservable().subscribe();
```

**AFTER:**
```typescript
// Config — remove navigateToLoginRequestUrl
const msalConfig: Configuration = {
  auth: {
    clientId: 'your-client-id',
  },
};

// Component — pass as option
this.authService.handleRedirectObservable({
  navigateToLoginRequestUrl: false,
}).subscribe();
```

> ⚠️ You must both **remove from config** and **add to the call**. Missing either side changes behavior.

### Fix B: Hash string → options object

**BEFORE:**
```typescript
this.authService.handleRedirectObservable(window.location.hash).subscribe();
```

**AFTER:**
```typescript
this.authService.handleRedirectObservable({
  hash: window.location.hash,
}).subscribe();
```

Both options can be combined: `{ hash: window.location.hash, navigateToLoginRequestUrl: false }`.

### MsalRedirectComponent check

If the project uses `MsalRedirectComponent` (recommended pattern), `handleRedirectObservable` is called automatically. No change needed for the call itself — but still check for `navigateToLoginRequestUrl` in the MSAL config and remove it.

---

## Step 6: Replace `logout()` with `logoutRedirect()` / `logoutPopup()`

The generic `logout()` is removed. Use the explicit variant.

### Detection

```bash
grep -rn "\.logout(" --include="*.ts" .
```

> ⚠️ Distinguish MSAL `logout()` from unrelated methods. Look for calls on `MsalService`, `authService`, or `msalInstance`.

### Replacement

**BEFORE:**
```typescript
this.authService.logout();
this.authService.logout({ postLogoutRedirectUri: '/signed-out' });
```

**AFTER (redirect — most common):**
```typescript
this.authService.logoutRedirect();
this.authService.logoutRedirect({ postLogoutRedirectUri: '/signed-out' });
```

**AFTER (popup):**
```typescript
this.authService.logoutPopup();
this.authService.logoutPopup({ postLogoutRedirectUri: '/signed-out' });
```

```
Decision:
  Codebase uses loginRedirect or loginPopup?
  ├── loginRedirect → Use logoutRedirect
  ├── loginPopup → Use logoutPopup
  └── Both / unclear → Ask the developer
```

---

## Step 7: Build Validation

```bash
npm install
npx tsc --noEmit
npm run build
npm test
```

### Common errors and fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `TS2345: Argument of type 'string' is not assignable` | Hash string passed to `handleRedirectObservable` | Wrap in options object (Step 5) |
| `TS2551: Property 'logout' does not exist` | Removed method | Replace with `logoutRedirect()` / `logoutPopup()` (Step 6) |
| `TS2322: Type 'any' is not assignable` | Token type changed | Update type annotation (Step 4) |
| `NG0203: inject() must be called from injection context` | `inject()` outside field initializer | Move to class field or keep `@Inject()` |
| `401 Unauthorized at runtime` | `protectedResourceMap` no longer matches | Add `/*` suffix or set `strictMatching: false` (Step 3) |

---

## Edge Cases and Escalation

| Situation | Why Escalate |
|-----------|-------------|
| `protectedResourceMap` uses environment variables | Can't statically verify patterns match under strict matching |
| Custom `MsalInterceptor` subclass | May override URL matching — need compatibility check |
| `handleRedirectObservable` called in multiple places | Confirm intended behavior for each call site |
| `logout()` in a shared service across multiple apps | Redirect vs popup choice may differ per consumer |
| Angular below 17 | Multi-version Angular jump is a major separate effort |
| NX monorepo with shared MSAL config | Changes affect multiple apps — confirm scope |

For `protectedResourceMap` with environment variables, ask the developer to confirm the runtime value and whether it needs `/*` appended.

---

## Quality Checklist

- [ ] `@azure/msal-browser` is on v5 (`^5.4.0`)
- [ ] Angular is on version 19+
- [ ] `@azure/msal-angular` updated to `^5.0.0` in `package.json`
- [ ] `@azure/msal-common` removed if explicitly listed
- [ ] `protectedResourceMap` patterns reviewed for strict matching
  - [ ] Base URLs updated with `/*` wildcard suffix
  - [ ] No patterns rely on regex metacharacter behavior
  - [ ] Host wildcards don't span dot separators
- [ ] `strictMatching` explicitly set to `true` or `false` (not left undefined) — suppresses runtime warning
- [ ] `MSAL_INSTANCE`, `MSAL_GUARD_CONFIG`, `MSAL_INTERCEPTOR_CONFIG`, `MSAL_BROADCAST_CONFIG` — no `any`/`string` types
- [ ] `navigateToLoginRequestUrl` removed from config, moved to `handleRedirectObservable()` options
- [ ] No hash string arguments to `handleRedirectObservable`
- [ ] All `logout()` replaced with `logoutRedirect()` or `logoutPopup()`
- [ ] Build passes, tests pass
- [ ] Developer reminded to test end-to-end: login, token acquisition, API calls, logout

---

## Get Help

| Resource | Link |
|----------|------|
| MSAL Angular v4 → v5 Guide | [v4-v5-upgrade-guide.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/v4-v5-upgrade-guide.md) |
| MSAL Browser v4 → v5 Guide | [v4-migration.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v4-migration.md) |
| MSAL Interceptor Strict Matching | [msal-interceptor.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/msal-interceptor.md) |
| MSAL Angular Known Issues | [known-issues.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/known-issues.md) |
| Redirect Bridge — Framework Setup | [redirect-bridge.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md) |
| Angular Update Guide | [angular.dev/update-guide](https://angular.dev/update-guide) |
| MSAL Angular Docs | [msal-angular on GitHub](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular) |
