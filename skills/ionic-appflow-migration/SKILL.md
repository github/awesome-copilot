---
name: ionic-appflow-migration
description: Guides the agent through migrating an existing Ionic or Capacitor project away from Ionic Appflow. Use when detecting Appflow live updates, cloud builds, or store deployment flows and replacing them with Capgo live updates plus the repository's CI/CD and store publishing setup. Do not use for Ionic Enterprise SDK plugin migration or for setting up a fresh Capacitor project from scratch.
---

# Ionic Appflow Migration

Migrate an existing Ionic or Capacitor project away from Ionic Appflow.

## When to Use This Skill

- User is moving off Ionic Appflow
- The project uses Appflow Live Updates, cloud builds, or store deployment
- The repository still references `ionic appflow`, `@capacitor/live-updates`, or `cordova-plugin-ionic`

## Migration Strategy

Split the Appflow migration by feature instead of treating it as a single package swap.

- Live Updates -> `capgo-live-updates`
- Native cloud builds -> `capacitor-ci-cd`
- Store publishing -> `capacitor-app-store`

Use this skill to detect what Appflow is doing today, then hand off each feature area to the right skill.

## Procedures

### Step 1: Detect Appflow Usage

Search the repository for:

- `ionic appflow`
- `@capacitor/live-updates`
- `cordova-plugin-ionic`
- `dashboard.ionicframework.com`
- `appflow.ionic.io`

Record whether the project currently uses:

- live updates
- cloud/native builds
- app store deployment automation

### Step 2: Migrate Live Updates

If Appflow live updates are in use:

1. Remove `@capacitor/live-updates` or `cordova-plugin-ionic`.
2. Install and configure Capgo using the `capgo-live-updates` skill.
3. Map Appflow channels and rollout behavior onto Capgo channels.
4. Verify that `notifyAppReady()` or the equivalent Capgo startup flow is wired correctly.

Do not delete Appflow configuration until the Capgo update path is validated.

### Step 3: Replace Cloud Build Automation

If Appflow was building the app in the cloud:

1. Inspect the existing CI/CD workflow for `ionic appflow build`.
2. Replace it with repository-owned automation using the `capacitor-ci-cd` skill.
3. Preserve signing inputs, environment variables, and platform-specific build arguments.

Treat Appflow build settings as migration input, not as a runtime dependency.

### Step 4: Replace Store Publishing

If Appflow handled TestFlight or Google Play publishing:

1. Inspect the current deployment flow.
2. Move that workflow to the repository's publishing pipeline using the `capacitor-app-store` skill.
3. Keep bundle identifiers, track selection, and credential handling unchanged unless the user wants a new release process.

### Step 5: Clean Up

After each migrated feature is verified:

- remove Appflow packages and scripts
- remove obsolete Appflow configuration
- remove stale CI secrets that are no longer needed

## Error Handling

- For live update migrations, validate rollback behavior before deleting the old Appflow setup.
- For build migrations, preserve the existing signing path first and only simplify later.
- For publishing migrations, move one destination at a time so App Store and Play failures stay isolated.
