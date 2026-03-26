---
name: capacitor-app-upgrade-v4-to-v5
description: Guides the agent through upgrading a Capacitor app from v4 to v5. Use when the project is on Capacitor 4 and needs the v5 migration path. Do not use for other major versions, plugin-only upgrades, or non-Capacitor apps.
---

# Capacitor App Upgrade v4 to v5

Upgrade a Capacitor app from version 4 to version 5.

## When to Use This Skill

- User says the app is on Capacitor 4 and must move to v5
- User wants the exact v4 to v5 migration path
- User needs v5-specific native and package updates

## Procedure

1. Read the current `@capacitor/core` version from `package.json`.
2. Update all `@capacitor/*` packages to the v5-compatible range.
3. Review the v4 to v5 migration notes before editing native files.
4. Run `npm install`.
5. Sync with `npx cap sync`.
6. Verify the iOS and Android builds.

## Error Handling

- If the automated migration misses a package, update it manually before syncing again.
- If iOS fails, check the deployment target and Xcode compatibility for Capacitor 5.
- If Android fails, check the Gradle and Java requirements for Capacitor 5.
