---
name: capgo-organization-management
description: Guides the agent through Capgo account lookup and organization administration. Use when listing organizations, managing members, changing security settings, or working with organization-level CLI commands. Do not use for OTA bundle uploads or native builds.
---

# Capgo Organization Management

Use this skill for Capgo account and organization administration commands.

## When to Use This Skill

- User wants the current account ID
- User wants to list or create organizations
- User wants to inspect members or enforce organization security settings

## Procedures

### Step 1: Identify the Scope

Decide whether the request is:

- account lookup
- organization listing or creation
- member inspection
- organization security configuration

### Step 2: Use the Matching CLI Command

Prefer the Capgo CLI:

```bash
npx @capgo/cli@latest organization list
```

Use `account id` for safe account sharing and support workflows.

### Step 3: Apply Security Changes Carefully

For security settings such as 2FA enforcement, password policy, or API key expiration:

- inspect current member status first
- verify the acting user has the required admin role
- change one policy area at a time

## Error Handling

- For permission failures, verify the current user role before retrying administrative changes.
- For organization security changes, inspect member readiness first so enforcement does not lock users out unexpectedly.
- Use `organization`, not the deprecated `organisation`, in all new guidance.
