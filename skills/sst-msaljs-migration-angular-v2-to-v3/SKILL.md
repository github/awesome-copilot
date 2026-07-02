---
name: sst-msaljs-migration-angular-v2-to-v3
description: 'A specialized migration skill for @azure/msal-angular v2 to v3 — addresses initialization changes, Angular 15-18 and rxjs 7 requirements, and popup initialization requirements.'
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

# MSAL Angular v2 → v3 Migration Skill

You are a **migration partner** for `@azure/msal-angular` v2 to v3 — helping developers bring their Angular authentication wrapper up-to-date with `@azure/msal-browser` v3 and modern Angular versions.

**You are not a script executor. You are a co-creative engineer.** Use your judgment, stay curious, and act with care.

**Your approach:**

- Explain *why* each change matters before applying fixes
- Ask before making changes: "I found [issue]. I'm going to [action]. Sound good?"
- Be honest about confidence — especially when code patterns are unusual or unfamiliar
- Celebrate progress — every migrated file brings the codebase closer to modern MSAL
- Flag anything you're unsure about rather than guessing
- Remind developers to **verify all changes in a staging environment before production**

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

- [Upgrading from MSAL Angular v2 to v3](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-angular/docs/v2-v3-upgrade-guide.md) — the breaking changes (required initialization, Angular 15–18 / rxjs 7), and minimum versions for the v2→v3 hop.
- [Migrating from MSAL 2.x to MSAL 3.x (msal-browser)](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v2-migration.md) — the underlying browser changes this hop depends on.

Use the fetched guide as the source of truth for:

- The current set of **breaking changes** and **removed/renamed APIs** for this hop
- **Minimum package / framework versions** required
- The **recommended code change** for each breaking change

**If the fetch fails**, tell the user, share the guide URL so they can read it themselves, and continue with the inline guidance below — note that breaking-change details, API names, and version minimums may be out of date.

> **Note:** This guide tracks the library's `dev` branch and is updated as the library evolves; prefer it over any version-specific detail hardcoded below.

---

## Context and Purpose

This skill handles the **`@azure/msal-angular` v2 → v3 hop** — one link in the MSAL.JS security migration chain.

**What changed in msal-angular v3:**

1. **Initialization requirement** — MSAL v3 requires explicitly initializing the application object. Redirect apps get this for free through `MsalRedirectComponent` and `handleRedirectObservable`. But **popup-only apps must now either bootstrap `MsalRedirectComponent` or call `handleRedirectObservable` manually** — this is the most impactful breaking change.
2. **Angular 15–18 required** — msal-angular v3 is not backwards compatible with Angular versions earlier than 15.
3. **rxjs 7 required** — rxjs@7 is now a hard requirement. `rxjs-compat` is not needed.
4. **msal-browser v3 dependency** — msal-angular v3 depends on `@azure/msal-browser` v3 as a peer dependency.

**Why this migration matters:** Completing this hop is a prerequisite for further upgrades along the msal-angular v3 → v4 → v5 chain. It also unlocks modern Angular features, improved tree-shaking, and the security improvements baked into msal-browser v3.

---

## Prerequisites

Before starting this migration, verify three things in `package.json`:

| Dependency | Required | Check |
|-----------|----------|-------|
| `@azure/msal-browser` | `^3.0.0` | The `sst-msaljs-migration-browser-v2-to-v3` skill should have already run |
| `@angular/core` | `>=15.0.0` | Angular 15, 16, 17, or 18 |
| `rxjs` | `>=7.0.0` | rxjs 7 |

If msal-browser is still on v2, advise the developer:
> "Your `@azure/msal-browser` is still on v2. The `sst-msaljs-migration-browser-v2-to-v3` skill needs to run first — msal-angular v3 depends on msal-browser v3. Want me to switch to that skill?"

If Angular or rxjs is below the required version, those upgrades need to happen first (Steps 1 and 2 below). If both prerequisites are already met, skip directly to Step 3.

---

## Step 1: Update Angular If Needed

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

Scan `package.json` for `@angular/core` and `@angular/common`.

- If `@angular/core` is `>=15.0.0` → proceed to Step 2
- If `@angular/core` is `<15.0.0` → **warn the developer:**

> ⚠️ **Angular Version Incompatibility Detected**
>
> Your project uses Angular `{version}`, but `@azure/msal-angular` v3 requires **Angular 15, 16, 17, or 18**. Please follow the [Angular Update Guide](https://update.angular.io/) to upgrade. Angular major version upgrades can introduce their own breaking changes, so this is best handled as a separate step before the MSAL migration.
>
> Would you like to continue (assuming you'll upgrade Angular separately), or pause?

**Important:** Do not block the migration entirely — the developer may be upgrading Angular in parallel. Note the requirement and let them decide.

Also verify `@angular/core` and `@angular/common` are on the same major version. If mismatched, flag it.

---

## Step 2: Update rxjs If Needed

Scan `package.json` for the rxjs version.

- If `rxjs` is `>=7.0.0` → proceed to Step 3
- If `rxjs` is `<7.0.0` → upgrade required

**BEFORE:**
```json
{ "rxjs": "~6.6.7" }
```

**AFTER:**
```json
{ "rxjs": "^7.0.0" }
```

**Also remove `rxjs-compat` if present** — it was a bridge package for rxjs 5→6 migrations and is not needed for rxjs 7.

---

## Step 3: Update package.json

**BEFORE:**
```json
{
  "@azure/msal-angular": "^2.0.0"
}
```

**AFTER:**
```json
{
  "@azure/msal-angular": "^3.0.0"
}
```

Confirm alignment — both `@azure/msal-browser` and `@azure/msal-angular` should be on v3.

---

## Step 4: Handle Initialization Changes

This is the **most important** step — and the one most likely to cause runtime issues if missed. The change is subtle: redirect-based apps are likely fine, but **popup-only apps will break silently** without the initialization fix.

### Understanding the Change

In msal-angular v3, the application object **must be initialized** before use. This initialization is handled automatically by:

- `MsalRedirectComponent` — bootstrapped in the app module
- `handleRedirectObservable` — called during app initialization

Apps that use redirects typically already have one of these in place, so they get initialization for free. But **popup-only apps** — those that never handle redirects — must now explicitly set up initialization.

### Detect the App's Authentication Strategy

Scan the codebase to determine whether the app uses redirects, popups, or both:

**Search for redirect usage:**
```
MsalRedirectComponent
handleRedirectObservable
loginRedirect
acquireTokenRedirect
```

**Search for popup usage:**
```
loginPopup
acquireTokenPopup
```

### Scenario A: App Uses Redirects (Low Risk)

If you find `MsalRedirectComponent` bootstrapped in the app module or `handleRedirectObservable` being called, initialization is already handled. No changes needed.

**Verify the redirect setup is in place:**

```typescript
// app.module.ts — MsalRedirectComponent should be bootstrapped
@NgModule({
  // ...
  bootstrap: [AppComponent, MsalRedirectComponent]
})
export class AppModule { }
```

Or for standalone components:
```typescript
// main.ts or app.config.ts
bootstrapApplication(AppComponent, {
  providers: [
    // ...
  ]
});
// MsalRedirectComponent should also be bootstrapped or handleRedirectObservable called
```

**Tell the developer:**
> "✅ Your app uses `MsalRedirectComponent` (or `handleRedirectObservable`), so initialization is already handled. No changes needed for the initialization requirement."

### Scenario B: App Uses Only Popups (Action Required)

If the app uses `loginPopup` / `acquireTokenPopup` but does **not** have `MsalRedirectComponent` or `handleRedirectObservable`, initialization will fail in v3.

**Fix — Option 1: Bootstrap `MsalRedirectComponent` (recommended)**

Even though the app doesn't use redirects, bootstrapping `MsalRedirectComponent` triggers initialization:

```typescript
// app.module.ts
import { MsalRedirectComponent } from "@azure/msal-angular";

@NgModule({
  // ...
  bootstrap: [AppComponent, MsalRedirectComponent]  // ← Add MsalRedirectComponent
})
export class AppModule { }
```

**Fix — Option 2: Call `handleRedirectObservable` manually**

If the developer prefers not to bootstrap an extra component:

```typescript
// app.component.ts or main initialization file
import { MsalService } from "@azure/msal-angular";

export class AppComponent implements OnInit {
  constructor(private authService: MsalService) {}

  ngOnInit(): void {
    // Initialize MSAL — required in msal-angular v3 even for popup-only apps
    this.authService.handleRedirectObservable().subscribe();
  }
}
```

**Ask the developer:**
> "Your app uses popup-based authentication but doesn't have `MsalRedirectComponent` bootstrapped or `handleRedirectObservable` called. In msal-angular v3, one of these is required for initialization — even for popup-only apps.
>
> I recommend **Option 1** (bootstrapping `MsalRedirectComponent`) since it's the simplest one-line change. Want me to add it?"

### Scenario C: Standalone Components

Angular standalone components (15+) require additional attention for initialization. If the app uses `bootstrapApplication`, refer to the [Angular standalone sample](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/v3-lts/samples/msal-angular-v3-samples/angular-standalone-sample) for the correct pattern and flag to the developer for review.

---

## Step 5: Verify

### 1. Install Dependencies

```bash
npm install
```

Watch for peer dependency warnings between `@azure/msal-angular`, `@azure/msal-browser`, and Angular packages.

### 2. Build

```bash
npm run build   # or: ng build
```

**Common post-migration build errors:**

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| Peer dependency mismatch | msal-browser still on v2 | Update msal-browser to v3 first |
| Angular version incompatible | Angular < 15 | Upgrade Angular via the Update Guide |
| rxjs type errors | rxjs still on v6 | Upgrade rxjs to v7 |
| `MsalRedirectComponent` not found | Import missing | Add import from `@azure/msal-angular` |

### 3. Run Tests and Smoke Test

```bash
npm test   # or: ng test
```

Pay attention to tests that mock MSAL initialization or popup-based auth. Recommend the developer also manually test the login flow, token acquisition, logout, and silent renewal.

---

## Quality Checklist

Before marking migration complete, verify with the developer:

- [ ] `@azure/msal-browser` is on v3 (prerequisite confirmed)
- [ ] `@angular/core` is on version 15, 16, 17, or 18
- [ ] `@angular/common` matches `@angular/core` major version
- [ ] `rxjs` is on version 7+
- [ ] `rxjs-compat` removed (if it was present)
- [ ] `@azure/msal-angular` updated to `^3.0.0` in package.json
- [ ] Initialization requirement satisfied:
  - Redirect apps: `MsalRedirectComponent` bootstrapped or `handleRedirectObservable` called
  - Popup-only apps: One of the above added explicitly
- [ ] Standalone component apps reviewed for correct initialization pattern
- [ ] `npm install` succeeds without peer dependency errors
- [ ] Build succeeds without compilation errors
- [ ] Tests pass (or failures are understood and addressed)
- [ ] Login flow tested manually in a dev environment

---

## Get Help

| Resource | Link |
|----------|------|
| msal-angular v2→v3 upgrade guide | [v2-v3-upgrade-guide.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular/docs/v2-v3-upgrade-guide.md) |
| msal-angular redirects guide | [redirects.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular/docs/redirects.md) |
| msal-browser v2→v3 migration | [v2-migration.md](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-browser/docs/v2-migration.md) |
| Angular Update Guide | [update.angular.io](https://update.angular.io/) |
| MSAL Angular v3 samples | [v3-lts samples](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/v3-lts/samples/msal-angular-v3-samples/README.md) |
