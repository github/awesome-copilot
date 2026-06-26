---
name: sst-msaljs-migration-browser-v4-to-v5
description: 'A specialized migration skill for @azure/msal-browser v4 to v5 — implements COOP redirect bridge, updates removed APIs, consolidates event types, and applies configuration changes to resolve the authentication vulnerability.'
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

# MSAL.JS Browser v4 → v5 Migration Skill

You are a **migration partner** — helping developers migrate `@azure/msal-browser` from v4 to v5 to resolve a critical authentication vulnerability. You work alongside the developer, not instead of them.

**You are not a script executor. You are a co-creative engineer. Use your judgment, stay curious, and act with care.**

**Your approach:**

- Explain *why* this migration matters (auth code theft, COOP handling) before diving into code changes
- Ask before making changes: "I found [pattern]. I'm going to [action]. Sound good?"
- Be honest about confidence — especially when code patterns are unusual or involve custom auth wrappers
- Celebrate progress — every migrated API call and every COOP bridge added reduces exploit surface
- Flag anything you're unsure about rather than guessing
- Remind developers to verify all changes in a staging environment before production

You provide the draft; the developer provides the validation. That's the partnership.

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

- [Migrating from MSAL v4 to MSAL v5](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v4-migration.md) — the breaking changes (COOP redirect bridge, event / `LOGIN_SUCCESS` payload changes, removed APIs, config moves), removed/renamed APIs, and minimum versions for the v4→v5 hop.
- [Redirect Bridge — Framework-Specific Setup](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md) — the COOP redirect bridge required by v5.

Use the fetched guide as the source of truth for:

- The current set of **breaking changes** and **removed/renamed APIs** for this hop
- **Minimum package / framework versions** required
- The **recommended code change** for each breaking change

**If the fetch fails**, tell the user, share the guide URL so they can read it themselves, and continue with the inline guidance below — note that breaking-change details, API names, and version minimums may be out of date.

> **Note:** This guide tracks the library's `dev` branch and is updated as the library evolves; prefer it over any version-specific detail hardcoded below.

---

## Context and Purpose

### What is the security vulnerability?

A critical vulnerability was identifiedin `@azure/msal-browser` v4.x related to **auth code theft via Cross-Origin-Opener-Policy (COOP) handling**. The vulnerability allows attackers to intercept authentication codes during redirect flows when the Identity Provider (IdP) sets COOP headers that isolate the browsing context.

In v4, `handleRedirectPromise` communicated the auth response through `window.location.hash`, which is readable across COOP boundaries. An attacker who controls a co-resident iframe or popup can extract the auth code before the legitimate application processes it.

### Why can't you just bump the version?

Simply changing `"@azure/msal-browser": "^4.x.x"` to `"^5.2.0"` in `package.json` will **break your application**. MSAL Browser v5 includes:

- **Removed APIs** — methods like `getAccountByHomeId()`, `logout()`, and `getTokenCache()` no longer exist
- **Changed signatures** — `handleRedirectPromise` now takes an options object, not a hash string
- **Removed configuration options** — fields like `navigateToLoginRequestUrl`, `temporaryCacheLocation`, and `asyncPopups` are gone or renamed
- **Inverted booleans** — `asyncPopups: true` becomes `navigatePopups: false`
- **New architecture** — all auth flows now route through a **COOP redirect bridge** page

This skill walks through every breaking change, detects affected code in the codebase, and applies the correct transformation.

### What is COOP (Cross-Origin-Opener-Policy)?

COOP is a browser security header that controls which documents can retain a reference to the opener window. When an Identity Provider (like Entra ID) sets `Cross-Origin-Opener-Policy: same-origin`, it severs the `window.opener` reference, breaking the traditional popup/redirect communication channel that MSAL v4 relied on.

MSAL v5 solves this by introducing a **redirect bridge** — a dedicated page that does not set COOP headers and uses `broadcastResponseToMainFrame` to relay the auth response securely via `BroadcastChannel` instead of `window.location.hash`.

---

## 📋 Inputs

| Input | Required | Description |
|-------|----------|-------------|
| **Package path** | Optional | Path to `package.json`. If not provided, auto-detect by scanning for `package.json` files containing `@azure/msal-browser`. |
| **Redirect URI page** | Optional | Desired path for the COOP redirect bridge page (e.g., `public/redirect.html`). Defaults to `public/redirect.html` or the project's static asset directory. |
| **Server framework** | Optional | The web server or hosting platform (e.g., Express, nginx, Azure Static Web Apps). Needed to advise on COOP header removal for the redirect page. |

If the developer does not provide a package path, scan the repository:

```
Glob: **/package.json
Grep in matches: @azure/msal-browser
```

If no `@azure/msal-browser` dependency is found, inform the developer and halt.

> ⚠️ **Monorepo note:** If the repository contains multiple `package.json` files with `@azure/msal-browser` (monorepo, workspaces), clarify **which package owns the web app's static output directory** before placing the redirect bridge page. The bridge page must be served by the web-facing package, not a shared library or backend package. Ask: "I found msal-browser in multiple packages. Which one serves the web application that users interact with?"

---

## 🔄 Workflow Overview

| Phase | What | Your Role |
|-------|------|-----------|
| **1. Detection** | Scan codebase for all v4 patterns | Automated — grep/glob for every breaking pattern |
| **2. Assessment** | Present findings to developer | Show count and location of each pattern |
| **3. Transformation** | Apply BEFORE→AFTER changes | Edit files with developer confirmation |
| **4. COOP Bridge Setup** | Create redirect bridge page | Generate `redirect.html`, guide server config |
| **5. Package Update** | Bump `@azure/msal-browser` to `^5.2.0` | Edit `package.json` |
| **6. Validation** | Build and verify | Run `npm run build` / `tsc` / framework build |

---

## Step-by-Step Migration

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

### Step 1: Detect All v4 Patterns

Scan the codebase for every known breaking pattern. Run these searches and collect results:

```
# Removed account lookup methods
Grep: getAccountByHomeId|getAccountByLocalId|getAccountByUsername

# Removed logout alias
Grep: \.logout\(

# Removed TokenCache / getTokenCache
Grep: getTokenCache|TokenCache|loadExternalTokens

# handleRedirectPromise with string argument
Grep: handleRedirectPromise\(

# Removed PublicClientNext / static createPublicClientApplication
Grep: PublicClientNext|createPublicClientApplication

# Removed startPerformanceMeasurement
Grep: startPerformanceMeasurement

# SignedHttpRequest.removeKeys boolean check
Grep: removeKeys

# Removed config options
Grep: navigateToLoginRequestUrl|skipAuthorityMetadataCache|supportsNestedAppAuth|encodeExtraQueryParams|temporaryCacheLocation|claimsBasedCachingEnabled|storeAuthStateInCookie|secureCookies|cacheMigrationEnabled|navigateFrameWait|iframeHashTimeout|windowHashTimeout|asyncPopups

# Removed request options
Grep: onRedirectNavigate|authorizePostBodyParams|tokenBodyParameters|tokenQueryParameters

# Event type changes
Grep: SSO_SILENT|ACQUIRE_TOKEN_BY_CODE|ACCOUNT_ADDED|ACCOUNT_REMOVED|LOGIN_START|LOGIN_FAILURE|LOGIN_SUCCESS

# ServerResponseType (replaced by ResponseMode)
Grep: ServerResponseType

# protocolMode in auth config
Grep: protocolMode

# Error message string matching (will break with hashed messages)
Grep: error\.message\.includes\(|error\.message ===|error\.message\.match\(|errorMessage\.includes\(
```

Present findings grouped by category. Example output:

> **Detection Summary:**
>
> - 3 files use `getAccountByHomeId` (src/auth.ts:42, src/hooks/useAuth.ts:18, src/utils/account.ts:7)
> - 1 file uses `logout()` (src/components/Header.tsx:31)
> - 2 files reference `handleRedirectPromise` with a string arg (src/auth.ts:55, src/index.tsx:12)
> - ...

---

### Step 2: Removed Account Lookup Methods

`getAccountByHomeId()`, `getAccountByLocalId()`, and `getAccountByUsername()` are removed. Use the unified `getAccount()` method with a filter object.

#### getAccountByHomeId → getAccount

**BEFORE:**
```typescript
const account = msalInstance.getAccountByHomeId(homeAccountId);
```

**AFTER:**
```typescript
const account = msalInstance.getAccount({ homeAccountId });
```

#### getAccountByLocalId → getAccount

**BEFORE:**
```typescript
const account = msalInstance.getAccountByLocalId(localAccountId);
```

**AFTER:**
```typescript
const account = msalInstance.getAccount({ localAccountId });
```

#### getAccountByUsername → getAccount

**BEFORE:**
```typescript
const account = msalInstance.getAccountByUsername(username);
```

**AFTER:**
```typescript
const account = msalInstance.getAccount({ username });
```

---

### Step 3: Removed `logout()` Method

The generic `logout()` method is removed. Replace with the explicit redirect or popup variant.

**BEFORE:**
```typescript
msalInstance.logout();
// or
msalInstance.logout({ postLogoutRedirectUri: "/logged-out" });
```

**AFTER (redirect — most common):**
```typescript
msalInstance.logoutRedirect();
// or
msalInstance.logoutRedirect({ postLogoutRedirectUri: "/logged-out" });
```

**AFTER (popup):**
```typescript
msalInstance.logoutPopup();
// or
msalInstance.logoutPopup({ postLogoutRedirectUri: "/logged-out" });
```

> ⚠️ **Ask the developer** which logout method they prefer if the codebase doesn't make it obvious (e.g., if they use `loginRedirect`, default to `logoutRedirect`).

---

### Step 4: TokenCache / loadExternalTokens

`getTokenCache()` and the `TokenCache` class are removed. `loadExternalTokens` is now a standalone export that requires a `Configuration` object.

**BEFORE:**
```typescript
import { PublicClientApplication } from "@azure/msal-browser";

const pca = new PublicClientApplication(msalConfig);
const tokenCache = pca.getTokenCache();
tokenCache.loadExternalTokens(silentRequest, serverResponse, options);
```

**AFTER:**
```typescript
import { PublicClientApplication, loadExternalTokens } from "@azure/msal-browser";

const pca = new PublicClientApplication(msalConfig);
await loadExternalTokens(msalConfig, silentRequest, serverResponse, options);
```

> Note: `loadExternalTokens` is now async and requires `await`. The first argument is the `Configuration` object (the same one passed to `PublicClientApplication`).

---

### Step 5: handleRedirectPromise Signature Change

The `handleRedirectPromise` method no longer accepts a hash string directly. It now takes a `HandleRedirectPromiseOptions` object.

**BEFORE:**
```typescript
// No arguments
const response = await msalInstance.handleRedirectPromise();

// With hash string
const response = await msalInstance.handleRedirectPromise(window.location.hash);
```

**AFTER:**
```typescript
// No arguments — still valid
const response = await msalInstance.handleRedirectPromise();

// With hash — wrap in options object
const response = await msalInstance.handleRedirectPromise({
  hash: window.location.hash,
});
```

> ⚠️ **Important:** If the v4 code passed `navigateToLoginRequestUrl` in the auth config, it must now be passed here instead:
>
> ```typescript
> const response = await msalInstance.handleRedirectPromise({
>   hash: window.location.hash,
>   navigateToLoginRequestUrl: true,
> });
> ```

---

### Step 6: Removed `startPerformanceMeasurement()`

**BEFORE:**
```typescript
const measurement = msalInstance.startPerformanceMeasurement(eventName, correlationId);
```

**AFTER:**
```typescript
const measurement = msalInstance.startMeasurement(eventName, correlationId);
```

---

### Step 7: PublicClientNext and Static Factory Removal

`PublicClientNext` and `PublicClientApplication.createPublicClientApplication` are removed.

#### PublicClientNext → PublicClientApplication

**BEFORE:**
```typescript
import { PublicClientNext } from "@azure/msal-browser";

const pca = new PublicClientNext(msalConfig);
```

**AFTER:**
```typescript
import { PublicClientApplication } from "@azure/msal-browser";

const pca = new PublicClientApplication(msalConfig);
```

#### Static createPublicClientApplication → createStandardPublicClientApplication

**BEFORE:**
```typescript
import { PublicClientApplication } from "@azure/msal-browser";

const pca = await PublicClientApplication.createPublicClientApplication(msalConfig);
```

**AFTER:**
```typescript
import { createStandardPublicClientApplication } from "@azure/msal-browser";

const pca = await createStandardPublicClientApplication(msalConfig);
```

> If the codebase uses nested app auth (e.g., Office Add-ins), use `createNestablePublicClientApplication` instead and note that `supportsNestedAppAuth` config is no longer needed.

---

### Step 8: SignedHttpRequest.removeKeys Return Type

`removeKeys` now returns `Promise<void>` instead of `Promise<boolean>`.

**BEFORE:**
```typescript
const result = await signedHttpRequest.removeKeys(keyId);
if (result) {
  console.log("Key removed successfully");
}
```

**AFTER:**
```typescript
try {
  await signedHttpRequest.removeKeys(keyId);
  console.log("Key removed successfully");
} catch (error) {
  console.error("Failed to remove key:", error);
}
```

---

### Step 9: Configuration Changes — BrowserAuthOptions

Remove or relocate these options from the `auth` configuration block:

| Removed Option | Migration Action |
|----------------|-----------------|
| `skipAuthorityMetadataCache` | Remove — no longer supported |
| `protocolMode` | Move to `system` block (see Step 11) |
| `supportsNestedAppAuth` | Remove — use `createNestablePublicClientApplication` instead |
| `navigateToLoginRequestUrl` | Remove — pass in `handleRedirectPromise({ navigateToLoginRequestUrl: true })` |
| `encodeExtraQueryParams` | Remove — no longer supported |
| `OIDCOptions.serverResponseType` | Replace `ServerResponseType` with `ResponseMode` |

**BEFORE:**
```typescript
const msalConfig = {
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/your-tenant-id",
    redirectUri: "/redirect",
    navigateToLoginRequestUrl: true,
    protocolMode: ProtocolMode.OIDC,
    supportsNestedAppAuth: true,
    skipAuthorityMetadataCache: false,
    encodeExtraQueryParams: true,
    OIDCOptions: {
      serverResponseType: ServerResponseType.Code,
    },
  },
};
```

**AFTER:**
```typescript
import { ResponseMode } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/your-tenant-id",
    redirectUri: "/redirect",
    OIDCOptions: {
      responseMode: ResponseMode.Fragment, // replaces ServerResponseType
    },
  },
  system: {
    protocolMode: ProtocolMode.OIDC, // moved from auth
  },
};

// navigateToLoginRequestUrl is now passed per-call:
await msalInstance.handleRedirectPromise({ navigateToLoginRequestUrl: true });
```

---

### Step 10: Configuration Changes — CacheOptions

Remove these options from the `cache` configuration block:

| Removed Option | Migration Action |
|----------------|-----------------|
| `temporaryCacheLocation` | Remove — no longer supported |
| `claimsBasedCachingEnabled` | Remove — no longer supported |
| `storeAuthStateInCookie` | Remove — no longer supported |
| `secureCookies` | Remove — no longer supported |
| `cacheMigrationEnabled` | Remove — no longer supported |

**BEFORE:**
```typescript
const msalConfig = {
  cache: {
    cacheLocation: "sessionStorage",
    temporaryCacheLocation: "sessionStorage",
    storeAuthStateInCookie: true,
    secureCookies: true,
    claimsBasedCachingEnabled: true,
    cacheMigrationEnabled: true,
  },
};
```

**AFTER:**
```typescript
const msalConfig = {
  cache: {
    cacheLocation: "sessionStorage",
  },
};
```

---

### Step 11: Configuration Changes — SystemOptions

Rename and relocate these options in the `system` configuration block:

| Old Option | New Option | Notes |
|------------|-----------|-------|
| `navigateFrameWait` | *(removed)* | Remove — no longer supported |
| `iframeHashTimeout` | `iframeBridgeTimeout` | Rename only |
| `windowHashTimeout` | `popupBridgeTimeout` | Rename only |
| `asyncPopups` | `navigatePopups` | **Boolean INVERTED** |
| `protocolMode` | `protocolMode` | Moved here from `auth` block |

**BEFORE:**
```typescript
const msalConfig = {
  system: {
    navigateFrameWait: 500,
    iframeHashTimeout: 6000,
    windowHashTimeout: 60000,
    asyncPopups: true,
  },
};
```

**AFTER:**
```typescript
const msalConfig = {
  system: {
    iframeBridgeTimeout: 6000,   // renamed from iframeHashTimeout
    popupBridgeTimeout: 60000,   // renamed from windowHashTimeout
    navigatePopups: false,       // INVERTED: asyncPopups true → navigatePopups false
  },
};
```

> ⚠️ **Critical inversion:** `asyncPopups: true` means "don't navigate popups" → `navigatePopups: false`. And `asyncPopups: false` → `navigatePopups: true`. Getting this wrong will break popup auth flows.

---

### Step 12: Request Object Changes — onRedirectNavigate

`onRedirectNavigate` is removed from `RedirectRequest` and `EndSessionRequest`. It is now only supported as a top-level configuration option.

**BEFORE:**
```typescript
msalInstance.loginRedirect({
  scopes: ["User.Read"],
  onRedirectNavigate: (url) => {
    console.log("Redirecting to:", url);
    return true; // return false to cancel navigation
  },
});
```

**AFTER:**
```typescript
// Move onRedirectNavigate to the MSAL configuration
const msalConfig = {
  auth: {
    clientId: "your-client-id",
    onRedirectNavigate: (url) => {
      console.log("Redirecting to:", url);
      return true;
    },
  },
};

// Request no longer includes onRedirectNavigate
msalInstance.loginRedirect({
  scopes: ["User.Read"],
});
```

> ⚠️ **Ask the developer** if different redirect requests use different `onRedirectNavigate` callbacks. If so, they'll need to consolidate into a single callback in config or use conditional logic within it.

---

### Step 13: Request Object Changes — Token Parameters

`authorizePostBodyParams`, `tokenBodyParameters`, and `tokenQueryParameters` are removed. Use `extraParameters` (new) and `extraQueryParameters` (existing).

**BEFORE:**
```typescript
const tokenRequest = {
  scopes: ["User.Read"],
  tokenBodyParameters: {
    custom_param: "value",
  },
  tokenQueryParameters: {
    query_param: "value",
  },
  authorizePostBodyParams: {
    body_param: "value",
  },
};
```

**AFTER:**
```typescript
const tokenRequest = {
  scopes: ["User.Read"],
  extraParameters: {
    custom_param: "value",   // replaces tokenBodyParameters
    body_param: "value",     // replaces authorizePostBodyParams
  },
  extraQueryParameters: {
    query_param: "value",    // replaces tokenQueryParameters (same name, already existed)
  },
};
```

> Note: `extraParameters` is a new field that consolidates both `tokenBodyParameters` and `authorizePostBodyParams`.

---

### Step 14: COOP Redirect Bridge Setup (CRITICAL — Security Fix)

This is the **core security fix** that resolves the authentication vulnerability. All authentication flows (redirect, popup, silent) now route through a dedicated bridge page that avoids COOP isolation.

> ⚠️ **WARNING:** If the redirect bridge is **not** set up, all authentication flows that rely on a popup or hidden iframe will stop working. `ssoSilent`, `acquireTokenPopup`, and `loginPopup` depend on the redirect bridge to receive the authentication response from the identity provider. `acquireTokenSilent` is also affected when the refresh token is expired and MSAL falls back to acquiring a new token in a hidden iframe (the same mechanism used by `ssoSilent`). Without the redirect bridge, the popup or iframe cannot communicate the response back to the main application window.
>
> Redirect flows (`loginRedirect` / `acquireTokenRedirect`) **can** work without the redirect bridge **only if** your `redirectUri` points to a page that directly processes the authentication response (for example, using `handleRedirectPromise` as in MSAL.js v4). However, when following the v5 guidance — where `redirectUri` is set to the redirect bridge page that calls `broadcastResponseToMainFrame()` — those redirect flows will also fail if the bridge page is missing or not implemented correctly.

> 🚨 **CAUTION:** **Do NOT load the redirect bridge page from a CDN** (e.g., jsdelivr, unpkg, cdnjs). The redirect bridge receives the raw authentication response — including authorization codes and tokens — directly from the identity provider. Loading this page from a third-party CDN creates a **supply-chain and token-theft risk**: a compromised CDN asset could intercept the authentication response before it reaches your application. Always bundle the redirect bridge with your application or serve it from your own infrastructure.

> ⛔ **HARD CONSTRAINT:** The COOP redirect bridge is mandatory for resolving the authentication vulnerability. Do not skip this step regardless of the developer's assessment of their redirect usage — MSAL v5 routes ALL auth flows through the bridge, including silent token renewal via hidden iframes. Skipping this step leaves the vulnerability unresolved and breaks `ssoSilent`, `acquireTokenPopup`, and `loginPopup`.
>
> If the developer asserts the bridge is unnecessary and asks to skip it, halt and explain: the COOP bridge is required for vulnerability resolution — MSAL v5 routes all auth flows through it, including silent token renewal. Proceed only after the developer acknowledges this is understood and accepts the risk.

#### 14a. Create the Redirect Bridge Page

> ⚠️ **Important:** The redirect bridge page must be processed by your bundler (webpack, vite, esbuild, etc.) so the bare import specifier resolves correctly. Do NOT place a raw HTML file with bare imports in `public/` — it will fail at runtime because browsers cannot resolve bare specifiers like `@azure/msal-browser/redirect-bridge`.

**Option A: Bundler entry point (Recommended)**

Create a dedicated entry point that your bundler processes (e.g., `src/redirect.ts` or `src/redirect.js`):

```typescript
// src/redirect.ts (or src/redirect.js)
import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";
broadcastResponseToMainFrame().catch(console.error);
```

Then configure your bundler to emit this as a separate page. For example, in **webpack**:
```javascript
// webpack.config.js
entry: {
  main: "./src/index.ts",
  redirect: "./src/redirect.ts",  // separate entry for redirect bridge
},
```

In **vite**:
```javascript
// vite.config.ts
build: {
  rollupOptions: {
    input: {
      main: "index.html",
      redirect: "redirect.html",
    },
  },
},
```

Create the HTML shell. The `<script>` tag depends on your bundler:

**For webpack** — reference the output bundle name (matches the entry key):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authentication Redirect</title>
</head>
<body>
  <script src="/redirect.bundle.js"></script>
</body>
</html>
```

> If using `HtmlWebpackPlugin`, add a second instance for the redirect entry and it will inject the script tag automatically.

**For vite** — reference the source file directly (vite resolves it during build):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authentication Redirect</title>
</head>
<body>
  <script type="module" src="/src/redirect.ts"></script>
</body>
</html>
```

**Option B: No-bundler fallback**

If the project does not use a bundler, the redirect bridge **cannot be loaded via CDN** because the module has internal imports that require the full package. In this case:

1. Install `@azure/msal-browser` as a dependency (even if previously loaded via CDN)
2. Create a minimal build step (e.g., `esbuild src/redirect.ts --bundle --outfile=public/redirect.js`) to bundle just the redirect bridge
3. Reference the bundled output in your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authentication Redirect</title>
</head>
<body>
  <script src="/redirect.js"></script>
</body>
</html>
```

**Option B (alternative): UMD script for projects that cannot run a bundler at all**

Copy `msal-redirect-bridge.min.js` from `node_modules/@azure/msal-browser/lib/redirect-bridge/` to your public directory and reference it via the UMD global:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authentication Redirect</title>
</head>
<body>
  <script src="/msal-redirect-bridge.min.js"></script>
  <script>
    msalRedirectBridge.broadcastResponseToMainFrame().catch(console.error);
  </script>
</body>
</html>
```

> ⚠️ **CDN not available:** `msal-redirect-bridge.min.js` cannot be loaded from a CDN — CDN hosting for this file was removed in msal-browser v3. You must copy the file from your local `node_modules`.

**Option C: Framework-specific setup**

Use this option when the project uses a specific framework (CRA, Angular CLI, or Next.js). These recipes place a plain HTML file in the framework's static assets directory so no bundler configuration is needed for the redirect page itself.

##### Vite (Recommended for React apps)

Vite is the recommended build tool for React apps using MSAL.js. The official msal-react samples all use Vite.

Create `public/redirect.html` in your project:

```html
<!-- public/redirect.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authentication Redirect</title>
</head>
<body>
  <script src="/msal-redirect-bridge.min.js"></script>
  <script>
    msalRedirectBridge.broadcastResponseToMainFrame().catch(console.error);
  </script>
</body>
</html>
```

> Copy `msal-redirect-bridge.min.js` from `node_modules/@azure/msal-browser/lib/redirect-bridge/` into your `public/` directory.

Add the redirect page as a separate Rollup input in `vite.config.js`:

```javascript
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        redirect: resolve(__dirname, "public/redirect.html"),
      },
    },
  },
});
```

Set `redirectUri` in the MSAL config:
```typescript
redirectUri: window.location.origin + "/redirect.html",
```

> **Samples:** See the [react-router-sample](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-react-samples/react-router-sample), [typescript-sample](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-react-samples/typescript-sample), and [b2c-sample](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-react-samples/b2c-sample) for complete Vite-based examples.

##### CRA (Create React App) — DEPRECATED

> ⚠️ **Create React App is deprecated.** `react-scripts` does not support React 19, which is required by `@azure/msal-react` v5. The CRA section has been removed from the [upstream MSAL.js redirect bridge documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md). **Migrate to Vite** using the recipe in the `sst-msaljs-migration-react-v3-to-v5` skill before setting up the redirect bridge.
>
> The recipe below is retained only for apps that have not yet migrated away from CRA. If the app uses `react-scripts`, strongly recommend migrating to Vite first.

Place the bridge page in `public/redirect.html`. CRA copies the entire `public/` directory verbatim to the build output — the file is served as static HTML with no React bundle, no router, and no MsalProvider:

```html
<!-- public/redirect.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authentication Redirect</title>
</head>
<body>
  <script src="%PUBLIC_URL%/msal-redirect-bridge.min.js"></script>
  <script>
    msalRedirectBridge.broadcastResponseToMainFrame().catch(console.error);
  </script>
</body>
</html>
```

> Copy `msal-redirect-bridge.min.js` from `node_modules/@azure/msal-browser/lib/redirect-bridge/` into your CRA `public/` directory. CRA copies `public/` files verbatim — bare ESM `import` specifiers do not work in static HTML files served outside the bundler.

Set `redirectUri` in the MSAL config:
```typescript
redirectUri: window.location.origin + "/redirect.html",
```

> **CRA caveat:** If the app is still on CRA and cannot migrate to Vite immediately, the static HTML approach above works. However, **plan the Vite migration** — CRA is deprecated and `react-scripts` will not support React 19 or later. See the `sst-msaljs-migration-react-v3-to-v5` skill for the full CRA→Vite migration recipe.

##### Angular CLI

Add `redirect.html` to the `angular.json` `assets` array so the Angular CLI copies it to the build output:

```json
// angular.json (in architect.build.options.assets)
"assets": [
  "src/favicon.ico",
  "src/assets",
  { "glob": "redirect.html", "input": "src", "output": "/" },
  { "glob": "msal-redirect-bridge.min.js", "input": "src", "output": "/" }
]
```

Place the HTML file at `src/redirect.html` using the UMD script approach:

```html
<!-- src/redirect.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authentication Redirect</title>
</head>
<body>
  <script src="/msal-redirect-bridge.min.js"></script>
  <script>
    msalRedirectBridge.broadcastResponseToMainFrame().catch(console.error);
  </script>
</body>
</html>
```

> Copy `msal-redirect-bridge.min.js` from `node_modules/@azure/msal-browser/lib/redirect-bridge/` into your `src/` directory. Angular CLI copies assets listed in `angular.json` verbatim — bare ESM `import` specifiers do not work in static HTML files served outside the bundler.

##### Next.js

Place `redirect.html` in the `public/` directory. Next.js serves files in `public/` as static assets:

```html
<!-- public/redirect.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authentication Redirect</title>
</head>
<body>
  <script src="/msal-redirect-bridge.min.js"></script>
  <script>
    msalRedirectBridge.broadcastResponseToMainFrame().catch(console.error);
  </script>
</body>
</html>
```

> Copy `msal-redirect-bridge.min.js` from `node_modules/@azure/msal-browser/lib/redirect-bridge/` into your Next.js `public/` directory. Next.js copies `public/` files verbatim — bare ESM `import` specifiers do not work in static HTML files served outside the bundler.

Use an absolute `redirectUri` in the MSAL config:
```typescript
redirectUri: window.location.origin + "/redirect.html",
```

> For additional framework-specific setup instructions, see the [Redirect Bridge — Framework-Specific Setup guide](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md).

#### 14b. Configure the Redirect URI

Update the MSAL configuration to point `redirectUri` to the bridge page:

**BEFORE:**
```typescript
const msalConfig = {
  auth: {
    clientId: "your-client-id",
    redirectUri: "/",
  },
};
```

**AFTER:**
```typescript
const msalConfig = {
  auth: {
    clientId: "your-client-id",
    redirectUri: "/redirect.html",        // points to the bridge page
    postLogoutRedirectUri: "/",           // ⚠️ Must be a user-facing page, NOT the bridge page
  },
};
```

> ⚠️ **Critical: Set `postLogoutRedirectUri` explicitly.** When you change `redirectUri` to point to the bridge page, `postLogoutRedirectUri` defaults to the same value. Without an explicit override, users will land on a blank bridge page after logout.

#### 14c. Ensure No COOP Headers on the Bridge Page

⚠️ **This step requires developer input.** The redirect bridge page **must not** have `Cross-Origin-Opener-Policy` headers. This depends on the server configuration.

Tell the developer:

> Your `redirect.html` page must be served **without** the `Cross-Origin-Opener-Policy` header. If your server sets COOP globally, you need to exclude the redirect page.
>
> **Express example:**
> ```javascript
> // Remove COOP for the redirect bridge page
> app.get("/redirect.html", (req, res, next) => {
>   res.removeHeader("Cross-Origin-Opener-Policy");
>   next();
> });
> ```
>
> **nginx example:**
> ```nginx
> location = /redirect.html {
>   # Do NOT add Cross-Origin-Opener-Policy here
>   add_header Cross-Origin-Embedder-Policy "require-corp";
> }
> ```
>
> **Azure Static Web Apps (staticwebapp.config.json):**
> ```json
> {
>   "route": "/redirect.html",
>   "headers": {
>     "Cross-Origin-Opener-Policy": ""
>   }
> }
> ```
>
> If you're unsure about your server's COOP configuration, check with your infrastructure team.

#### 14d. Update Entra ID App Registration

Tell the developer:

> The redirect URI in your **Entra ID app registration** must match the new bridge page path. Update it in the Azure Portal:
>
> 1. Go to **Azure Portal → App registrations → Your app → Authentication**
> 2. Under **Redirect URIs**, update or add: `https://your-domain.com/redirect.html`
> 3. Save changes
>
> The redirect URI must exactly match what's in your MSAL config.

---

### Step 15: Event Type Consolidation

MSAL v5 consolidates several event types. Update any `addEventCallback` or event-handling code.

| v4 Event | v5 Replacement | Notes |
|----------|---------------|-------|
| `EventType.SSO_SILENT_START` | `EventType.ACQUIRE_TOKEN_START` | Consolidated |
| `EventType.SSO_SILENT_SUCCESS` | `EventType.ACQUIRE_TOKEN_SUCCESS` | Consolidated |
| `EventType.SSO_SILENT_FAILURE` | `EventType.ACQUIRE_TOKEN_FAILURE` | Consolidated |
| `EventType.ACQUIRE_TOKEN_BY_CODE_START` | `EventType.ACQUIRE_TOKEN_START` | Consolidated |
| `EventType.ACQUIRE_TOKEN_BY_CODE_SUCCESS` | `EventType.ACQUIRE_TOKEN_SUCCESS` | Consolidated |
| `EventType.ACQUIRE_TOKEN_BY_CODE_FAILURE` | `EventType.ACQUIRE_TOKEN_FAILURE` | Consolidated |
| `EventType.ACCOUNT_ADDED` | *(removed)* | Use `EventType.LOGIN_SUCCESS` |
| `EventType.ACCOUNT_REMOVED` | *(removed)* | Use `EventType.LOGOUT_SUCCESS` |
| `EventType.LOGIN_START` | `EventType.ACQUIRE_TOKEN_START` | Consolidated |
| `EventType.LOGIN_FAILURE` | `EventType.ACQUIRE_TOKEN_FAILURE` | Consolidated |
| `EventType.LOGIN_SUCCESS` | `EventType.LOGIN_SUCCESS` | **Payload changed:** now `AccountInfo` instead of `AuthenticationResult` |

**BEFORE:**
```typescript
msalInstance.addEventCallback((event) => {
  switch (event.eventType) {
    case EventType.LOGIN_START:
      showLoading();
      break;
    case EventType.LOGIN_SUCCESS:
      const result = event.payload as AuthenticationResult;
      setAccount(result.account);
      break;
    case EventType.LOGIN_FAILURE:
      showError(event.error);
      break;
    case EventType.ACCOUNT_ADDED:
      refreshAccountList();
      break;
    case EventType.ACCOUNT_REMOVED:
      clearAccountState();
      break;
    case EventType.SSO_SILENT_SUCCESS:
      handleSilentSuccess(event.payload);
      break;
  }
});
```

**AFTER:**
```typescript
msalInstance.addEventCallback((event) => {
  switch (event.eventType) {
    case EventType.ACQUIRE_TOKEN_START:
      // Consolidates LOGIN_START, SSO_SILENT_START, ACQUIRE_TOKEN_BY_CODE_START
      showLoading();
      break;
    case EventType.LOGIN_SUCCESS:
      // Payload is now AccountInfo, not AuthenticationResult
      const account = event.payload as AccountInfo;
      setAccount(account);
      break;
    case EventType.ACQUIRE_TOKEN_SUCCESS:
      // Consolidates SSO_SILENT_SUCCESS, ACQUIRE_TOKEN_BY_CODE_SUCCESS
      handleTokenSuccess(event.payload);
      break;
    case EventType.ACQUIRE_TOKEN_FAILURE:
      // Consolidates LOGIN_FAILURE, SSO_SILENT_FAILURE, ACQUIRE_TOKEN_BY_CODE_FAILURE
      showError(event.error);
      break;
    case EventType.LOGOUT_SUCCESS:
      // Replaces ACCOUNT_REMOVED
      clearAccountState();
      break;
  }
});
```

> ⚠️ **Critical:** Per the [v4→v5 migration guide](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v4-migration.md), `LOGIN_SUCCESS` payload changed from `AuthenticationResult` to `AccountInfo` in v5. If code accesses `event.payload.accessToken` or other `AuthenticationResult` fields from a `LOGIN_SUCCESS` event, it will break. Use `ACQUIRE_TOKEN_SUCCESS` to get the `AuthenticationResult` with the access token. Note that a successful login now emits **both** `LOGIN_SUCCESS` (with `AccountInfo`) and `ACQUIRE_TOKEN_SUCCESS` (with `AuthenticationResult`).

---

### Step 16: Update package.json

After all code transformations are applied, update the dependency version:

**BEFORE:**
```json
{
  "dependencies": {
    "@azure/msal-browser": "^4.0.0"
  }
}
```

**AFTER:**
```json
{
  "dependencies": {
    "@azure/msal-browser": "^5.2.0"
  }
}
```

Also check for and update related packages:

| Package | Action |
|---------|--------|
| `@azure/msal-browser` | Update to `^5.2.0` |
| `@azure/msal-react` | Check compatibility — may need update to match v5 |
| `@azure/msal-common` | Remove if explicitly listed — bundled in v5 |
| `@azure/msal-node` | Separate package — not affected by this migration |

---

### Step 17: Install Updated Dependencies

After updating `package.json`, run the package manager to update the lock file. **This is critical** — without this step, `npm ci` in CI pipelines will still install the vulnerable v4 version.

```bash
# Detect from lock file:
npm install      # if package-lock.json exists
# yarn install   # if yarn.lock exists
# pnpm install   # if pnpm-lock.yaml exists
```

Verify the lock file was updated: `git diff package-lock.json` (or equivalent) should show the new version.

> ⚠️ **Do not skip this step.** The lock file must be committed alongside `package.json` changes, otherwise CI using `npm ci` will install the old vulnerable version.

---

### Step 18: Behavioral Changes (Awareness)

These changes don't require code fixes but the developer should be aware:

#### Error Messages Are Hashed

MSAL v5 no longer includes descriptive error message strings. Error messages are replaced with hashed codes that link to documentation.

**BEFORE:**
```
BrowserAuthError: interaction_in_progress: Interaction is currently in progress.
```

**AFTER:**
```
BrowserAuthError: F5gMiaa
```

> Developers can look up error codes at the MSAL.js error documentation. If the codebase matches on error message strings (not error codes), those matches will break. Search for string comparisons against MSAL error messages and migrate them to use error codes instead.

#### Impact on Error Handling Code

If the codebase matches on error message strings, those matches will silently stop working in v5. Migrate to error codes:

**BEFORE (v4 — matches on message string):**
```typescript
try {
  await msalInstance.acquireTokenSilent(request);
} catch (error) {
  if (error.message.includes("interaction_required")) {
    // Falls through silently in v5 — message is now a hash
    await msalInstance.acquireTokenRedirect(request);
  }
}
```

**AFTER (v5 — matches on error code):**
```typescript
import { InteractionRequiredAuthError } from "@azure/msal-browser";

try {
  await msalInstance.acquireTokenSilent(request);
} catch (error) {
  if (error instanceof InteractionRequiredAuthError) {
    await msalInstance.acquireTokenRedirect(request);
  }
}
```

> Search the codebase for these patterns that will break:
> ```
> Grep: error\.message\.includes\(|error\.message ===|error\.message\.match\(|errorMessage\.includes\(
> ```
> (The last pattern catches codebases that assign MSAL's error message to a local `errorMessage` variable before comparing.)

#### Common BrowserAuthError Migration Table

Beyond `InteractionRequiredAuthError`, other error subtypes also lose their message strings in v5. Use `instanceof` or `error.errorCode` instead:

| v4 Message String | v5 Migration | Error Class / Code |
|---|---|---|
| `"interaction_required"` | `error instanceof InteractionRequiredAuthError` | `InteractionRequiredAuthError` |
| `"user_cancelled"` | `error.errorCode === "user_cancelled"` | `BrowserAuthError` |
| `"popup_window_error"` | `error.errorCode === "popup_window_error"` | `BrowserAuthError` |
| `"empty_window_error"` | `error.errorCode === "empty_window_error"` | `BrowserAuthError` |
| `"interaction_in_progress"` | `error.errorCode === "interaction_in_progress"` | `BrowserAuthError` |
| `"monitor_window_timeout"` | `error.errorCode === "monitor_window_timeout"` | `BrowserAuthError` |
| `"redirect_in_iframe"` | `error.errorCode === "redirect_in_iframe"` | `BrowserAuthError` |
| `"block_iframe_reload"` | `error.errorCode === "block_iframe_reload"` | `BrowserAuthError` |
| `"no_account_error"` | `error.errorCode === "no_account_error"` | `BrowserAuthError` |

**Pattern:**
```typescript
import { BrowserAuthError, InteractionRequiredAuthError } from "@azure/msal-browser";

try {
  await msalInstance.acquireTokenSilent(request);
} catch (error) {
  if (error instanceof InteractionRequiredAuthError) {
    await msalInstance.acquireTokenRedirect(request);
  } else if (error instanceof BrowserAuthError && error.errorCode === "user_cancelled") {
    console.log("User cancelled the authentication flow.");
  }
}
```

> For a complete list of error codes, see the [MSAL.js Error Codes documentation](https://learn.microsoft.com/entra/identity-platform/msal-error-handling-js).

#### Console Logs Are Hashed

Console log messages are also hashed in v5. If the developer's monitoring or log analysis relies on specific MSAL log message text, it will need updating.

---

### Step 19: Build Validation

After all changes are applied, validate the build:

```bash
# Run TypeScript compilation (if applicable)
npx tsc --noEmit

# Run project build
npm run build

# Run tests (if available)
npm test
```

If the build fails:

1. Check error messages for remaining v4 API references
2. Look for type errors from changed signatures or payloads
3. Verify all imports are updated (especially `loadExternalTokens`, `createStandardPublicClientApplication`, `ResponseMode`)
4. Check for indirect usage through wrapper libraries or shared auth modules

---

## Rollback Instructions

If issues arise after migration, the developer can roll back:

1. **Revert `package.json`** to the previous `@azure/msal-browser` version
2. **Revert all code changes** via git (recommend creating a feature branch before starting)
3. **Run `npm install`** to restore v4 dependencies
4. **Remove the redirect bridge page** (`redirect.html`)
5. **Revert the Entra ID app registration** redirect URI

> ⚠️ Rolling back means the COOP vulnerability remains unpatched. This should only be temporary while addressing migration issues.

---

## Quality Checklist

Before marking migration complete, verify with the developer:

- [ ] All `getAccountByHomeId` / `getAccountByLocalId` / `getAccountByUsername` calls replaced with `getAccount()`
- [ ] All `logout()` calls replaced with `logoutRedirect()` or `logoutPopup()`
- [ ] `getTokenCache()` / `loadExternalTokens` updated to standalone export pattern
- [ ] `handleRedirectPromise` calls use options object if passing arguments
- [ ] `startPerformanceMeasurement` replaced with `startMeasurement`
- [ ] `PublicClientNext` replaced with `PublicClientApplication`
- [ ] Static `createPublicClientApplication` replaced with `createStandardPublicClientApplication`
- [ ] `SignedHttpRequest.removeKeys` callers handle `Promise<void>` (not `Promise<boolean>`)
- [ ] Removed config options cleaned from `auth`, `cache`, and `system` blocks
- [ ] `asyncPopups` correctly inverted to `navigatePopups`
- [ ] `iframeHashTimeout` → `iframeBridgeTimeout`, `windowHashTimeout` → `popupBridgeTimeout`
- [ ] `protocolMode` moved from `auth` to `system`
- [ ] `onRedirectNavigate` moved from request objects to configuration
- [ ] `tokenBodyParameters` / `authorizePostBodyParams` / `tokenQueryParameters` replaced with `extraParameters` / `extraQueryParameters`
- [ ] `ServerResponseType` replaced with `ResponseMode`
- [ ] Event types updated (consolidated events, payload type changes)
- [ ] COOP redirect bridge page created and configured
- [ ] Redirect URI updated in MSAL config and Entra ID app registration
- [ ] Server confirmed to not send COOP headers on the bridge page
- [ ] `@azure/msal-browser` updated to `^5.2.0` in `package.json`
- [ ] Lock file updated (`npm install` / `yarn install` / `pnpm install` run after version bump) — **⚠️ GATE: Do not mark migration complete if this is unchecked. CI using `npm ci` will install the vulnerable v4 version.**
- [ ] Build passes with no TypeScript or compilation errors
- [ ] Tests pass (if available)
- [ ] Error handling code uses `instanceof` or `error.errorCode` checks instead of `error.message` string matching

---

## Get Help

| Resource | Link |
|----------|------|
| MSAL.js v4 Migration Guide | [v4-migration.md on GitHub](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v4-migration.md) |
| MSAL Browser v5 Docs | [msal-browser README](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-browser) |
| COOP Redirect Bridge | [MSAL.js Redirect Bridge documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md) |
| Redirect Bridge — Framework Setup | [redirect-bridge.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md) |
| Error Code Lookup | [MSAL.js Error Codes](https://learn.microsoft.com/entra/identity-platform/msal-error-handling-js) |
