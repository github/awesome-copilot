---
name: capacitor-plugin-upgrade-v5-to-v6
description: Guides the agent through upgrading a Capacitor plugin from v5 to v6. Use when the plugin targets Capacitor 5 and needs the v6 migration path. Do not use for app upgrades, other major versions, or non-Capacitor plugins.
---

# Capacitor Plugin Upgrade v5 to v6

Upgrade a Capacitor plugin from version 5 to version 6.

## When to Use This Skill

- User says the plugin targets Capacitor 5 and must move to v6
- User wants the exact v5 to v6 migration path
- User needs v6-specific native and package updates

## Procedure

1. Read the plugin's `package.json` and current Capacitor peer dependency range.
2. Update the peer dependency range to Capacitor 6.
3. Review the v5 to v6 migration notes before editing native files.
4. Update the example app if it exists.
5. Run `npm install`.
6. Sync and verify the example or test app.

## Error Handling

- If the example app breaks, fix the plugin API or native bridge before moving on.
- If iOS fails, verify the deployment target for Capacitor 6.
- If Android fails, verify the Gradle and Java requirements for Capacitor 6.
