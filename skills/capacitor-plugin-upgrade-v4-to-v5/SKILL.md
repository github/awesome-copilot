---
name: capacitor-plugin-upgrade-v4-to-v5
description: Guides the agent through upgrading a Capacitor plugin from v4 to v5. Use when the plugin targets Capacitor 4 and needs the v5 migration path. Do not use for app upgrades, other major versions, or non-Capacitor plugins.
---

# Capacitor Plugin Upgrade v4 to v5

Upgrade a Capacitor plugin from version 4 to version 5.

## When to Use This Skill

- User says the plugin targets Capacitor 4 and must move to v5
- User wants the exact v4 to v5 migration path
- User needs v5-specific native and package updates

## Procedure

1. Read the plugin's `package.json` and current Capacitor peer dependency range.
2. Update the peer dependency range to Capacitor 5.
3. Review the v4 to v5 migration notes before editing native files.
4. Update the example app if it exists.
5. Run `npm install`.
6. Sync and verify the example or test app.

## Error Handling

- If the example app breaks, fix the plugin API or native bridge before moving on.
- If iOS fails, verify the deployment target for Capacitor 5.
- If Android fails, verify the Gradle and Java requirements for Capacitor 5.
