---
name: capacitor-app-upgrade-v6-to-v7
description: Guides the agent through upgrading a Capacitor app from v6 to v7. Use when the project is on Capacitor 6 and needs the v7 migration path. Do not use for other major versions, plugin-only upgrades, or non-Capacitor apps.
---

# Capacitor App Upgrade v6 to v7

Upgrade a Capacitor app from version 6 to version 7.

## When to Use This Skill

- User says the app is on Capacitor 6 and must move to v7
- User wants the exact v6 to v7 migration path
- User needs v7-specific native and package updates

## Procedure

1. Read the current `@capacitor/core` version from `package.json`.
2. Update all `@capacitor/*` packages to the v7-compatible range.
3. Review the v6 to v7 migration notes before editing native files.
4. Run `npm install`.
5. Sync with `npx cap sync`.
6. Verify the iOS and Android builds.

## Error Handling

- If the automated migration misses a package, update it manually before syncing again.
- If iOS fails, check the deployment target and Xcode compatibility for Capacitor 7.
- If Android fails, check the Gradle and Java requirements for Capacitor 7.
