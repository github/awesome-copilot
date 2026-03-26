---
name: capgo-release-workflows
description: Guides the agent through setting up Capgo-centered release workflows for Capacitor apps. Use when the user needs a unified path for live updates, native builds, and app store publishing using Capgo plus repository-owned CI/CD. Do not use for non-Capacitor frameworks or for Ionic Enterprise plugin migration.
---

# Capgo Release Workflows

Set up release workflows for Capacitor apps using Capgo live updates plus repository-owned build and publishing automation.

## When to Use This Skill

- User wants one release workflow covering live updates, builds, and store publishing
- User is replacing a hosted release service with repo-owned automation
- User wants Capgo for OTA updates and standard CI/CD for native artifacts

## Scope

This skill coordinates three workflow areas:

- live updates -> `capgo-live-updates`
- native builds -> `capacitor-ci-cd`
- app store publishing -> `capacitor-app-store`

Use this skill as the top-level router when the user asks for the whole release system, not just one piece.

## Procedures

### Step 1: Identify Release Requirements

Determine whether the app needs:

- OTA web updates
- signed iOS and Android builds
- TestFlight or Google Play publishing
- staged channels or phased rollout

Record which parts already exist in the repository.

### Step 2: Set Up Live Updates

If OTA updates are required, use the `capgo-live-updates` skill.

Preserve the app's release channel structure and define the rollback strategy before enabling automatic rollout.

### Step 3: Set Up Native Build Automation

If the team needs reproducible native builds, use the `capacitor-ci-cd` skill.

Keep signing, build environment variables, and version bumping under repository control.

### Step 4: Set Up Store Publishing

If automated publishing is required, use the `capacitor-app-store` skill.

Keep credentials, track selection, and release gating aligned with the current release policy.

### Step 5: Verify the End-to-End Release Flow

Verify the workflow in order:

1. native build succeeds
2. store artifact is valid
3. live update upload works for the matching app version
4. rollback and channel targeting behave as expected

## Error Handling

- For OTA setup issues, validate the Capgo plugin startup and rollback path before enabling broad rollout.
- For CI/CD failures, fix signing and environment inputs before changing release logic.
- For store publishing failures, isolate Apple and Google pipelines so one platform does not block diagnosis of the other.
