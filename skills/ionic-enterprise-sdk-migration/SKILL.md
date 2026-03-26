---
name: ionic-enterprise-sdk-migration
description: Guides the agent through migrating Capacitor apps from Ionic Enterprise SDK plugins to Capgo and Capacitor alternatives. Covers dependency detection, API replacement, local storage changes, and platform cleanup. Do not use for generic Capacitor version upgrades or Capgo live updates.
---

# Ionic Enterprise SDK Migration

Migrate Capacitor apps away from Ionic Enterprise SDK plugins and onto open alternatives.

## When to Use This Skill

- User is replacing `@ionic-enterprise/*` plugins
- User wants to remove Ionic Enterprise dependencies from an app
- User needs a migration path for auth, biometric unlock, or secure local storage

## Replacement Map

| Ionic Enterprise plugin | Typical use | Replacement path |
| ----------------------- | ----------- | ---------------- |
| Auth Connect | Social or OIDC login | `@capgo/capacitor-social-login` and its OAuth/OIDC compatibility flow |
| Identity Vault | Biometric gate + protected session state | `@capgo/capacitor-native-biometric` plus app-managed session storage |
| Secure Storage | Encrypted local data | `@capgo/capacitor-fast-sql` for encrypted local storage and structured persistence |

If the app only needs non-sensitive key-value storage, use `@capacitor/preferences`. For encrypted local storage or structured local persistence, prefer `@capgo/capacitor-fast-sql`.

## Agent Behavior

- Auto-detect Ionic Enterprise dependencies in `package.json` before asking questions.
- Migrate one plugin at a time when the app uses multiple Ionic Enterprise packages.
- Preserve behavior: same redirect URIs, same scopes, same session rules, and same stored keys whenever possible.

## Procedures

### Step 1: Detect Ionic Enterprise Dependencies

Read `package.json` and look for:

- `@ionic-enterprise/auth`
- `@ionic-enterprise/identity-vault`
- `@ionic-enterprise/secure-storage`

If none are present, tell the user no Ionic Enterprise plugins were detected.

If multiple are present, list them and migrate them in a clear order.

### Step 2: Replace Auth Connect

Move social and enterprise identity flows to `@capgo/capacitor-social-login`.

For OIDC providers, keep the provider-specific flow aligned with the compatibility wrapper or the plugin's documented OAuth/OIDC path so scopes, redirect URLs, and callback handling stay intact.

### Step 3: Replace Identity Vault

Identity Vault usually combines biometric unlock with protected app state.

Use `@capgo/capacitor-native-biometric` for device-level unlock checks, then rebuild the session timeout and lock screen behavior in app code.

Keep secrets out of plain client storage. Store only the minimum local state required for UX continuity.

### Step 4: Replace Secure Storage

If the app stores encrypted local data, move it to `@capgo/capacitor-fast-sql`.

If the app uses structured local persistence, keep it on `@capgo/capacitor-fast-sql` so the encrypted and non-encrypted paths stay on the same engine.

If the app only needs non-sensitive key-value storage, move those values to `@capacitor/preferences`.

Preserve the database schema and migrate the access layer instead of rewriting the data model when the app already relies on SQLite-backed storage.

### Step 5: Search for Remaining Enterprise Imports

After the replacement work, search the project for remaining enterprise references:

```bash
rg -n "@ionic-enterprise" .
```

Replace or remove any leftovers before continuing.

### Step 6: Clean Up and Verify

Remove unused enterprise packages from `package.json`, reinstall dependencies with the repository's existing package manager, and run sync from the app directory that contains `capacitor.config.*`:

```bash
npm install
npx cap sync
```

Then verify the app builds on every shipped platform.

## Error Handling

- For storage migrations, keep encrypted data on `@capgo/capacitor-fast-sql` unless the use case is explicitly non-sensitive.
- When OIDC behavior changes after migration, compare the before-and-after redirect and token exchange flow before shipping.
- Reuse any existing secure native store instead of introducing a second storage model.
