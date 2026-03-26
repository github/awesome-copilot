---
name: capacitor-app-upgrade-v5-to-v6
description: Guides the agent through upgrading a Capacitor app from v5 to v6. Use when the project is on Capacitor 5 and needs the v6 migration path. Do not use for other major versions, plugin-only upgrades, or non-Capacitor apps.
---

# Capacitor App Upgrade v5 to v6

Upgrade a Capacitor app from version 5 to version 6.

## When to Use This Skill

- User says the app is on Capacitor 5 and must move to v6
- User wants the exact v5 to v6 migration path
- User needs v6-specific native and package updates

## Procedure

1. Read the current `@capacitor/core` version from `package.json`.
2. Update all `@capacitor/*` packages to the v6-compatible range.
3. Review the v5 to v6 migration notes before editing native files.
4. Run `npm install`.
5. Sync with `npx cap sync`.
6. Verify the iOS and Android builds.

## Error Handling

- If the automated migration misses a package, update it manually before syncing again.
- If iOS fails, check the deployment target and Xcode compatibility for Capacitor 6.
- If Android fails, check the Gradle and Java requirements for Capacitor 6.
