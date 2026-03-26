---
name: capgo-cli-usage
description: Guides the agent through the Capgo CLI command surface and routes requests to more specific Capgo skills. Use when the user asks generally about the Capgo CLI, app setup, diagnostics, OTA operations, native builds, or organization commands. Do not use when a more specific Capgo skill already clearly matches the request.
---

# Capgo CLI Usage

Use this skill as the entry point for Capgo CLI command routing.

## When to Use This Skill

- User asks generally how to use the Capgo CLI
- The request spans multiple Capgo command groups
- The right Capgo sub-workflow is not obvious yet

## Routing

Route specific workflows to the matching skill:

- OTA bundles and channels -> `capgo-release-management`
- native cloud builds -> `capgo-native-builds`
- organizations and account commands -> `capgo-organization-management`

## Common Commands

- `init`
- `login`
- `doctor`
- `probe`
- `app add`
- `app list`
- `app delete`
- `app set`
- `app debug`
- `mcp`

Prefer the current CLI form:

```bash
npx @capgo/cli@latest doctor
```

## Error Handling

- If the request is specific enough for a narrower Capgo skill, switch to that skill instead of staying at the routing layer.
- For CLI auth issues, fix `login` first before troubleshooting downstream commands.
