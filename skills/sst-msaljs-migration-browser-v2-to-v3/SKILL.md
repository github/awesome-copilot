---
name: sst-msaljs-migration-browser-v2-to-v3
description: 'A specialized migration skill for @azure/msal-browser v2 to v3 — adds required async initialization, updates claims-based caching defaults, and addresses browser support changes.'
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

# MSAL.JS Browser v2 → v3 Migration

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

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

- [Migrating from MSAL 2.x to MSAL 3.x](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v2-migration.md) — the breaking changes, removed/renamed APIs, and minimum versions for the v2→v3 hop.

Use the fetched guide as the source of truth for:
- The current set of **breaking changes** and **removed/renamed APIs** for this hop
- **Minimum package / framework versions** required
- The **recommended code change** for each breaking change

**If the fetch fails**, tell the user, share the guide URL so they can read it themselves, and continue with the inline guidance below — note that breaking-change details, API names, and version minimums may be out of date.

> **Note:** This guide tracks the library's `dev` branch and is updated as the library evolves; prefer it over any version-specific detail hardcoded below.

---

## Context and Purpose

You are a **migration partner** for `@azure/msal-browser` v2 → v3 — helping developers upgrade their browser-based authentication library to the latest major version with minimal disruption.

**This migration is a stepping stone.** Many v2 services need to reach v3 before they can adopt downstream improvements (v2 front-end integration, updated token caching strategies, modern browser-only targeting). Completing this migration unblocks those future investments.

**You are not a script executor. You are a co-creative engineer.** Use your judgment, stay curious, and act with care. If you encounter ambiguity or unfamiliar patterns, pause and escalate rather than guessing.

**Your approach:**
- Explain *why* each change matters before applying it
- Ask before making changes: "I found [pattern]. I'm going to [action]. Sound good?"
- Be honest about confidence — especially when code patterns are unusual or unfamiliar
- Flag anything you're unsure about rather than guessing
- Remind developers to verify all changes in a staging environment before production

You provide the draft; the developer provides the validation. That's the partnership.

---

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| **Repository path** | ✅ | Path to the repository containing `@azure/msal-browser` v2 usage |
| **Target v3 version** | ❌ | Defaults to latest stable v3.x (currently `^3.0.0`). Override if pinning to a specific version. |

**First, ask the developer:** "What is the path to your repository? I'll scan it for `@azure/msal-browser` v2 usage and walk you through the migration."

---

## Workflow Overview

| Step | Action | Risk | Automatable |
|------|--------|------|-------------|
| **1. Discovery** | Scan for `@azure/msal-browser` in package.json and lock files; confirm v2.x | Low | ✅ Yes |
| **2. Instantiation** | Add required `await initialize()` or switch to `createPublicClientApplication` | 🔴 Critical | ✅ Yes |
| **3. Claims-Based Caching** | Detect claims usage in token requests; warn about default change; optionally restore v2 behavior | 🟡 Medium | ⚠️ Semi — needs developer decision |
| **4. Crypto Cleanup** | Remove `msCrypto`, `msrCrypto`, `cryptoOptions` references | Low | ✅ Yes |
| **5. Browser Support** | Flag IE11 / Edge Legacy polyfills or conditional code | Low | ⚠️ Semi — may need manual review |
| **6. CDN Deprecation** | Detect CDN `<script>` tags loading msal-browser; migrate to npm | 🟡 Medium | ⚠️ Semi — architectural change |
| **7. Package Update** | Bump `@azure/msal-browser` to v3 in package.json | Low | ✅ Yes |
| **8. Build & Validate** | Run build; surface compile errors | Low | ✅ Yes |

---

## Detailed Migration Steps

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

### Step 1: Discovery — Confirm v2 Usage

Scan the repository to locate all `@azure/msal-browser` references and confirm the current major version.

**Search targets:**
```
package.json → "@azure/msal-browser": "^2.x.x"
package-lock.json / yarn.lock / pnpm-lock.yaml → resolved version
```

**Actions:**
1. Use `grep` to find `@azure/msal-browser` across all `package.json` files (monorepos may have multiple)
2. Confirm the installed version is `2.x.x`
3. If already on v3 — tell the developer and stop
4. If on v1 — this skill does not cover v1→v3; escalate

**Report to developer:**
> "I found `@azure/msal-browser@2.x.x` in [file]. I'll walk you through the v3 migration. There are [N] breaking changes that affect your codebase."

---

### Step 2: Application Instantiation (CRITICAL)

This is the **highest-risk** breaking change. In v2, `PublicClientApplication` was ready immediately after construction. In v3, an async initialization step is **mandatory** before calling any other MSAL API.

**Scan for:**
```
new PublicClientApplication(
```

#### BEFORE (v2) — synchronous construction
```typescript
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/your-tenant-id",
    redirectUri: "http://localhost:3000",
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

// Immediately usable — msal-browser v2 allowed this
msalInstance.handleRedirectPromise().then((response) => {
  // handle redirect
});
```

#### AFTER (v3) — Option A: explicit `initialize()` call
```typescript
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/your-tenant-id",
    redirectUri: "http://localhost:3000",
  },
};

const msalInstance = new PublicClientApplication(msalConfig);
await msalInstance.initialize();

// Now safe to call MSAL APIs
msalInstance.handleRedirectPromise().then((response) => {
  // handle redirect
});
```

#### AFTER (v3) — Option B: factory method (preferred for new code)
```typescript
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/your-tenant-id",
    redirectUri: "http://localhost:3000",
  },
};

// Factory handles construction + initialization in one step
const msalInstance = await PublicClientApplication.createPublicClientApplication(msalConfig);

// Now safe to call MSAL APIs
msalInstance.handleRedirectPromise().then((response) => {
  // handle redirect
});
```

**Implementation guidance:**
1. Find every `new PublicClientApplication(...)` call
2. Determine the surrounding context:
   - **Top-level module scope** → Option B (factory) is cleaner since the file likely already has top-level await or an async bootstrap
   - **Inside an async function** → Either option works; Option A is minimal-diff
   - **Inside a synchronous function that cannot be made async** → Escalate to developer. This requires restructuring.
   - **React app using `@azure/msal-react`** → Check if `MsalProvider` initialization pattern needs updating; the provider typically handles initialization internally in v3-compatible versions
3. After adding `initialize()`, ensure no MSAL API calls happen before initialization resolves
4. Search for any code that calls MSAL methods at module-load time (outside of async contexts) — these will break

**Common patterns that need attention:**
```
// ❌ BREAKS IN msal-browser v3 — MSAL API called before initialize()
const msalInstance = new PublicClientApplication(config);
const accounts = msalInstance.getAllAccounts(); // Will throw

// ✅ FIXED
const msalInstance = new PublicClientApplication(config);
await msalInstance.initialize();
const accounts = msalInstance.getAllAccounts(); // Safe
```

**Ask the developer:** "I found [N] instances of `new PublicClientApplication(...)`. I'll add `await msalInstance.initialize()` after each. Do you prefer Option A (explicit initialize) or Option B (factory method)?"

---

### Step 3: Claims-Based Caching

The default behavior for claims-based token caching **changed silently** between v2 and v3. This can cause unexpected network traffic increases if the service uses claims in token requests.

**v2 behavior (default):** Tokens were cached and matched based on a hash of the claims. Subsequent requests with the same claims returned the cached token.

**v3 behavior (default):** When claims are present in a request, MSAL **always goes to the network** and **overwrites** the cached token. No claims-based cache matching occurs.

**Impact:** Services that frequently request tokens with claims will see a significant increase in network calls to the identity provider, potentially causing latency spikes or throttling.

**Scan for claims usage:**
```
claims:
claims?:
claimsRequest
```

Search across all `.ts`, `.tsx`, `.js`, `.jsx` files for token request objects that include a `claims` property:

```typescript
// Example: acquireTokenSilent with claims
msalInstance.acquireTokenSilent({
  scopes: ["api://resource/.default"],
  claims: claimsChallenge,   // ← THIS triggers the behavioral change
  account: account,
});
```

#### If claims usage IS found

**Warn the developer:**
> "⚠️ I found claims being passed in token requests at [locations]. In v3, MSAL will **no longer cache tokens when claims are present** — it will go to the network every time. This is a behavioral change from v2 that could increase your token acquisition latency and network traffic.
>
> **Options:**
> 1. **Accept v3 default** — recommended if claims change frequently (e.g., Continuous Access Evaluation challenges)
> 2. **Restore v2 behavior** — add `claimsBasedCachingEnabled: true` to your config if claims are stable and caching is safe
>
> Which do you prefer?"

#### BEFORE (v2) — claims-based caching enabled by default (implicit)
```typescript
const msalConfig = {
  auth: {
    clientId: "your-client-id",
  },
};
```

#### AFTER (v3) — to restore v2 caching behavior
```typescript
const msalConfig = {
  auth: {
    clientId: "your-client-id",
  },
  cache: {
    claimsBasedCachingEnabled: true,  // Restores v2 default behavior
  },
};
```

#### If claims usage is NOT found

No action needed. Inform the developer:
> "I didn't find any claims usage in token requests. The caching default change won't affect your service. No config change needed."

---

### Step 4: Crypto Cleanup

v3 dropped support for legacy crypto implementations that were only needed for IE11 and other obsolete browsers.

**Scan for and remove:**

| Pattern | What It Was | Action |
|---------|-------------|--------|
| `window.msCrypto` | IE11 crypto polyfill | Remove references |
| `window.msrCrypto` | MSR (Microsoft Research) crypto polyfill | Remove references |
| `cryptoOptions` | `config.system.cryptoOptions` configuration | Remove from config |

**Scan targets:**
```
msCrypto
msrCrypto
cryptoOptions
```

#### BEFORE (v2) — crypto polyfill/config
```typescript
const msalConfig = {
  auth: { clientId: "your-client-id" },
  system: {
    cryptoOptions: {
      useMsrCrypto: true,       // ← No longer supported in msal-browser v3
      entropy: customEntropy,    // ← No longer supported in msal-browser v3
    },
  },
};

// Conditional polyfill for IE11
if (!window.crypto && window.msCrypto) {
  window.crypto = window.msCrypto;
}
```

#### AFTER (v3) — removed
```typescript
const msalConfig = {
  auth: { clientId: "your-client-id" },
  // system.cryptoOptions removed — msal-browser v3 uses native Web Crypto API only
};

// IE11 polyfill removed — msal-browser v3 does not support IE11
```

**If `cryptoOptions` is found:**
> "I found `system.cryptoOptions` in your MSAL config at [location]. This is no longer supported in v3 — the library now exclusively uses the native Web Crypto API. I'll remove it."

**If `msCrypto` or `msrCrypto` references are found:**
> "I found IE11 crypto polyfill references at [locations]. v3 drops IE11 support entirely, so these are no longer needed. I'll remove them."

---

### Step 5: Browser Support Changes

v3 drops support for Internet Explorer 11 and Edge Legacy (EdgeHTML engine). This is informational but may affect services that still have IE11-specific code paths.

**Scan for indicators of IE11/Edge Legacy support:**
```
msie
trident
edge/
EdgeHTML
-ms-
@supports (-ms-
navigator.userAgent.*IE
navigator.userAgent.*Trident
```

Also check for:
- Babel/webpack config targeting `ie 11` in browserslist
- Polyfill imports (e.g., `core-js`, `regenerator-runtime`, `whatwg-fetch`) that may be IE-specific

**If found:**
> "ℹ️ I found IE11/Edge Legacy references at [locations]. `@azure/msal-browser` v3 no longer supports these browsers. If your service still needs IE11 support for non-auth flows, that's fine — but MSAL will not work in IE11 after this upgrade.
>
> Do you want me to remove the IE11-specific auth code paths, or leave them for you to review?"

**If not found:**
> "No IE11 or Edge Legacy code detected. No action needed for browser support."

---

### Step 6: CDN Deprecation

`@azure/msal-browser` v3 fully deprecates CDN distribution. If the service loads MSAL via a `<script>` tag from a CDN, it **must** switch to an npm package.

**Scan for:**
```html
<script src=".*msal-browser.*">
<script src=".*msal\.min\.js.*">
<script src=".*cdn.*msal.*">
```

Also search `.html`, `.ejs`, `.hbs`, `.cshtml`, `.pug`, and similar template files.

#### BEFORE (v2) — CDN script tag
```html
<script
  type="text/javascript"
  src="https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js"
></script>
<script>
  const msalConfig = { auth: { clientId: "your-client-id" } };
  const msalInstance = new msal.PublicClientApplication(msalConfig);
</script>
```

#### AFTER (v3) — npm package with bundler
```typescript
// Install: npm install @azure/msal-browser@^3.0.0
import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = { auth: { clientId: "your-client-id" } };
const msalInstance = await PublicClientApplication.createPublicClientApplication(msalConfig);
```

**If CDN usage is found:**
> "🚨 I found CDN `<script>` tags loading `@azure/msal-browser` at [locations]. CDN distribution is fully deprecated in v3. This requires switching to an npm package with a bundler (webpack, Vite, esbuild, etc.).
>
> This is an **architectural change** that I can guide you through, but it may require build tooling changes. Want to proceed?"

**If not found:**
> "No CDN script tag usage detected. Your service already uses npm — no action needed."

---

### Step 7: Package Update

Update `@azure/msal-browser` to v3 in all relevant package files.

**Files to update:**
- `package.json` (may be multiple in monorepos)
- `.npmrc` if registry overrides exist

#### BEFORE
```json
{
  "dependencies": {
    "@azure/msal-browser": "^2.38.3"
  }
}
```

#### AFTER
```json
{
  "dependencies": {
    "@azure/msal-browser": "^3.0.0"
  }
}
```

**Additional dependency considerations:**

| Dependency | v2 Requirement | v3 Requirement | Action |
|-----------|---------------|---------------|--------|
| TypeScript | ≥ 3.8.3 | ≥ 4.9.5 | Verify and bump if needed |
| TS module | `es6` | `es2020` | Update tsconfig.json |
| TS target | `es5` | `es2020` | Update tsconfig.json |

**If TypeScript is used, check `tsconfig.json`:**

#### BEFORE (v2-era tsconfig)
```json
{
  "compilerOptions": {
    "module": "es6",
    "target": "es5"
  }
}
```

#### AFTER (v3-compatible tsconfig)
```json
{
  "compilerOptions": {
    "module": "es2020",
    "target": "es2020"
  }
}
```

> **⚠️ Caution:** Changing `target` from `es5` to `es2020` means the output will no longer run in IE11 or very old browsers. This aligns with v3's browser support drop, but verify with the developer if their browserslist has other constraints.

**If `@azure/msal-react` is also present:**
> "I see `@azure/msal-react` in your dependencies. Make sure to update it to a version compatible with `@azure/msal-browser` v3 (typically `@azure/msal-react@^2.0.0`). I'll include that in the package update."

---

### Step 8: Install Updated Dependencies

After updating `package.json`, run the package manager to update the lock file. **This is critical** — without this step, `npm ci` in CI pipelines will still install the vulnerable v2 version.

**Actions:**
1. Detect the project's package manager from the lock file:
   - `package-lock.json` → `npm install`
   - `yarn.lock` → `yarn install`
   - `pnpm-lock.yaml` → `pnpm install`
2. Run the install command
3. Verify the lock file was updated (check `git diff` on the lock file)
4. If install fails, check for peer dependency conflicts and report to the developer (there can be cases when the feed is not accessible)

> ⚠️ **Do not skip this step.** If the lock file is not updated, CI pipelines using `npm ci` will install the old vulnerable version even though `package.json` specifies v3.

---

### Step 9: Build & Validate

After all changes are applied, run the build to surface any compile-time errors.

**Actions:**
1. Look for a build script in `package.json` → `scripts.build`
2. Run it: `npm run build` or `yarn build` or equivalent
3. If the build fails:
   - Parse the error output
   - Correlate errors with migration changes
   - Fix or escalate as appropriate
4. If the build succeeds:
   - Report success to the developer
   - Remind them to run their test suite and validate in a staging environment

**Common post-migration build errors:**

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `Property 'initialize' does not exist` | Old `@types` or stale cache | Clear `node_modules`, reinstall |
| `Top-level 'await' expressions are only allowed...` | tsconfig `module` not updated to `es2020`+ | Update tsconfig (Step 7) |
| `Cannot find name 'msCrypto'` | Removed polyfill but reference remains elsewhere | Search and clean up all references |
| `Type 'PublicClientApplication' is not assignable...` | Interface changes between v2 and v3 | Check for custom type extensions |

---

## Migration Checklist

Use this checklist to confirm all migration steps are complete:

- [ ] `@azure/msal-browser` updated to `^3.0.0` in all package.json files
- [ ] Lock file updated (`npm install` / `yarn install` / `pnpm install` run after version bump)
- [ ] All `new PublicClientApplication(...)` calls have `await initialize()` or use the factory method
- [ ] No MSAL API calls occur before `initialize()` resolves
- [ ] Claims-based caching reviewed — v3 default accepted or `claimsBasedCachingEnabled: true` added
- [ ] `system.cryptoOptions` removed from MSAL config (if present)
- [ ] `window.msCrypto` / `window.msrCrypto` references removed (if present)
- [ ] CDN `<script>` tags replaced with npm package (if applicable)
- [ ] TypeScript version ≥ 4.9.5 (if TypeScript is used)
- [ ] `tsconfig.json` updated: `module` and `target` set to `es2020` or higher
- [ ] `@azure/msal-react` updated to v3-compatible version (if applicable)
- [ ] Build passes
- [ ] Developer reminded to run tests and validate in staging

---

## Edge Cases and Escalation

### When to escalate to the developer

| Situation | Why |
|-----------|-----|
| `new PublicClientApplication()` is in a synchronous function that cannot be made async | Requires restructuring the application bootstrap |
| CDN usage detected with no existing bundler setup | Architectural change requiring build tooling decisions |
| Claims usage found but developer intent is unclear | Security and performance trade-off requires human judgment |
| Custom MSAL wrapper class extends `PublicClientApplication` | Inheritance may break due to internal API changes |
| Multiple MSAL instances across different packages in a monorepo | Coordination needed to avoid version conflicts |
| `@azure/msal-node` is also present (SSR / hybrid app) | Server-side and client-side MSAL have different upgrade paths |

### When to stop and ask for help

If you encounter something not covered by this skill — an unusual MSAL configuration, a custom authentication flow, or an error you can't diagnose — leave a note:

> "If you encounter ambiguity, leave a note in the PR description describing the issue for your team to review."
