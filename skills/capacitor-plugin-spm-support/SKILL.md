---
name: capacitor-plugin-spm-support
description: Guides the agent through adding Swift Package Manager support to an existing Capacitor plugin. Covers Package.swift, CAPBridgedPlugin conversion, bridge cleanup, and package manifest updates. Do not use for app projects or non-Capacitor plugin frameworks.
---

# Add Swift Package Manager Support to a Capacitor Plugin

Add SPM support to an existing Capacitor plugin so it can be consumed without CocoaPods.

## When to Use This Skill

- User wants a plugin to work through Xcode's package manager
- User is converting an existing iOS plugin from Obj-C bridge files to bridged Swift registration
- User needs the plugin package manifest and file exports updated for SPM

## Procedures

### Step 1: Gather Plugin Information

Read these files in the plugin root:

- `package.json`
- the `.podspec`
- the main Swift plugin class under `ios/`

Record:

- the package name
- the pod name
- the iOS deployment target
- the plugin class name
- the JavaScript plugin name
- all exposed plugin methods
- any third-party CocoaPods dependencies that also need SPM equivalents

### Step 2: Create `Package.swift`

Add a `Package.swift` manifest that:

- declares the plugin package name
- sets the iOS minimum version
- points the target at the plugin's iOS source directory
- depends on the Capacitor Swift package support package used by the project
- adds any resolved third-party SPM packages

Keep the target structure aligned with the actual plugin source tree.

### Step 3: Convert the Swift Plugin Class

Update the plugin class to conform to `CAPBridgedPlugin`.

Add the bridge properties at the top of the class:

- `identifier`
- `jsName`
- `pluginMethods`

Preserve each method name and return type exactly as the plugin already exposes them.

### Step 4: Remove Objective-C Bridge Files

Delete the old bridge header and implementation files once the Swift bridge is in place.

Then clean the Xcode project file so it no longer references them.

### Step 5: Update Package Metadata

Update the plugin package manifest so it exports:

- the iOS sources
- the podspec
- `Package.swift`

Add an iOS SPM install command if the project maintains script helpers.

### Step 6: Verify

Install dependencies with the repository's existing package manager.

Then `cd` into the example or test app directory that contains `capacitor.config.*`, run `npx cap sync` (or the repository's equivalent runner) there, and build that same app.

## Error Handling

- Start with the Swift package resolver: check the target path and package dependency names first.
- Verify bridge registration by matching the class name, `identifier`, and `jsName` against the exported API.
- For unsupported CocoaPods dependencies, replace them with SPM-compatible packages or keep CocoaPods for that dependency.
