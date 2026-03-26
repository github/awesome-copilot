---
name: capacitor-plugin-upgrade-v6-to-v7
description: Guides the agent through upgrading a Capacitor plugin from v6 to v7. Use when the plugin targets Capacitor 6 and needs the v7 migration path. Do not use for app upgrades, other major versions, or non-Capacitor plugins.
---

# Capacitor Plugin Upgrade v6 to v7

Upgrade a Capacitor plugin from version 6 to version 7.

## When to Use This Skill

- User says the plugin targets Capacitor 6 and must move to v7
- User wants the exact v6 to v7 migration path
- User needs v7-specific native and package updates

## Procedure

1. Read the plugin's `package.json` and current Capacitor peer dependency range.
2. Update the peer dependency range to Capacitor 7.
3. Review the v6 to v7 migration notes before editing native files.
4. Update the example app if it exists.
5. Run `npm install`.
6. Sync and verify the example or test app.

## Error Handling

- If the example app breaks, fix the plugin API or native bridge before moving on.
- If iOS fails, verify the deployment target for Capacitor 7.
- If Android fails, verify the Gradle and Java requirements for Capacitor 7.
