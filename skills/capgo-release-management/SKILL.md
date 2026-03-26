---
name: capgo-release-management
description: Guides the agent through Capgo OTA release workflows including bundle uploads, compatibility checks, channels, cleanup, and encryption key setup. Use when managing Capgo bundle and channel operations. Do not use for native build requests or organization administration.
---

# Capgo Release Management

Use this skill for Capgo OTA bundle, channel, and encryption-key workflows.

## When to Use This Skill

- User wants to upload or manage a Capgo bundle
- User needs channel targeting or compatibility checks
- User wants bundle encryption or cleanup

## Procedures

### Step 1: Choose the Release Operation

Use the matching command group:

- bundle upload/list/delete/cleanup
- bundle compatibility/releaseType/zip/encrypt/decrypt
- channel add/list/delete/set/currentBundle
- key save/create/delete_old

### Step 2: Upload or Inspect Bundles

Prefer the current Capgo CLI:

```bash
npx @capgo/cli@latest bundle upload com.example.app --path ./dist --channel production
```

Use compatibility checks before channel changes when the user is unsure whether a bundle is safe for rollout.

### Step 3: Manage Channels

Use channel operations to set defaults, target specific bundles, and control rollout scope.

Only change the default channel when the user explicitly intends to move production traffic.

### Step 4: Set Up Encryption

Use `key create` or `key save` before encrypted bundle uploads.

Keep private keys out of version control.

## Error Handling

- For upload failures, verify bundle version uniqueness and channel selection before retrying.
- For compatibility failures, inspect package metadata and native version constraints before forcing a rollout.
- For encrypted upload issues, verify the public key and session key flow before rotating keys.
