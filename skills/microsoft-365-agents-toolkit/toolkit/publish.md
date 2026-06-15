# Publishing

## purpose

Publishing workflow for M365 agents — from local sideloading through org catalog distribution to public Teams Store / Microsoft AppSource submission. Applies to Teams apps, declarative agents, message extensions, and Copilot connectors; the org-catalog and Store stages are the same for all of them.

## rules

1. **Three publishing stages: sideload → org catalog → Teams Store.** Each stage expands the audience. Sideload is developer-only. Org catalog reaches your tenant. Teams Store is public to all Teams users.
2. **Sideloading is for development and testing.** Upload the app package directly in Teams (`Apps → Manage your apps → Upload a custom app`). No admin approval needed, but only you can see the app. Requires "Upload custom apps" policy to be enabled.
3. **`atk publish` submits to the org catalog.** The command packages the app and submits it to the Teams Admin Center. An admin must approve the submission before the app appears in the org's app catalog.
4. **Admin approval happens in Teams Admin Center.** After `atk publish`, admins review the submission at `admin.teams.microsoft.com → Teams apps → Manage apps`. They can approve, reject, or request changes.
5. **`atk validate` catches manifest errors before publishing.** Always validate before publishing. The command checks the manifest against the Teams schema, verifies required fields, and flags common issues. Fix all validation errors before submitting.
6. **`atk package` creates the submission artifact.** Generates a `.zip` bundle containing the resolved `manifest.json` and icon files. This is the file that gets uploaded to the org catalog or Partner Center.
7. **Version bumping is required for updates.** When publishing an update to an already-published app, increment the `version` field in `manifest.json`. The org catalog and Teams Store reject submissions with the same version as an existing entry.
8. **`atk update` pushes changes to an existing Teams app.** Updates the app registration without creating a new one. Use this after changing manifest properties, bot endpoints, or permissions.
9. **Teams Store submission goes through Partner Center.** To publish publicly, submit the app package at `partner.microsoft.com`. Microsoft reviews the app against validation policies (functionality, security, compliance). Review takes 1-2+ weeks.
10. **Teams Store validation requirements are strict.** The app must: work correctly in all declared scopes, handle errors gracefully, not crash or hang, follow Teams design guidelines, include privacy policy and terms of use URLs, and pass automated testing.
11. **Pre-submission checklist.** Before any publishing: validate manifest (`atk validate`), test in real Teams client (not just playground), verify all URLs are HTTPS and reachable, confirm icons meet size requirements (192x192 color, 32x32 outline), and ensure the app works in all declared scopes (personal, team, groupChat).
12. **App update propagation varies by stage.** Sideloaded updates are immediate. Org catalog updates require admin re-approval. Teams Store updates require Microsoft re-review.

## patterns

### Pattern 1: Publishing to org catalog

```bash
# Step 1: Validate the manifest
atk validate --manifest-file ./appPackage/manifest.json
# Fix any reported errors before continuing

# Step 2: Package the app
atk package --manifest-file ./appPackage/manifest.json \
  --output-package-file ./build/appPackage.zip

# Step 3: Publish to org catalog (submits for admin approval)
atk publish --env dev -i false

# Step 4: Notify your Teams admin to approve in Admin Center
# admin.teams.microsoft.com → Teams apps → Manage apps → search for your app

# Step 5: After approval, users find the app in Teams → Apps → Built for your org
```

### Pattern 2: App update workflow

```bash
# Step 1: Bump the version in manifest.json
# Before: "version": "1.0.0"
# After:  "version": "1.1.0"

# Step 2: Validate the updated manifest
atk validate --manifest-file ./appPackage/manifest.json

# Step 3: Update the Teams app registration
atk update

# Step 4: Re-package with the new version
atk package --manifest-file ./appPackage/manifest.json \
  --output-package-file ./build/appPackage.zip

# Step 5: Re-publish (triggers admin re-approval for org catalog)
atk publish
```

### Pattern 3: Manifest fields required for publishing

```jsonc
// appPackage/manifest.json — fields required for org catalog and Teams Store
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.26/MicrosoftTeams.schema.json",
  "manifestVersion": "1.26",
  "version": "1.0.0",  // Must increment for updates
  "id": "${{TEAMS_APP_ID}}",
  "developer": {
    "name": "Your Company",                          // Required
    "websiteUrl": "https://yourcompany.com",         // Required — HTTPS
    "privacyUrl": "https://yourcompany.com/privacy", // Required for Store
    "termsOfUseUrl": "https://yourcompany.com/terms" // Required for Store
  },
  "name": {
    "short": "My Bot",        // Max 30 chars
    "full": "My Bot for Teams" // Max 100 chars
  },
  "description": {
    "short": "A helpful Teams bot",                    // Max 80 chars, required
    "full": "Detailed description of what the bot does, its features, and how to use it. This appears in the Teams Store listing." // Max 4000 chars
  },
  "icons": {
    "color": "color.png",     // 192x192 px, full color
    "outline": "outline.png"  // 32x32 px, transparent + white only
  },
  "bots": [
    {
      "botId": "${{BOT_ID}}",
      "scopes": ["personal", "team", "groupChat"],
      "commandLists": [
        {
          "scopes": ["personal"],
          "commands": [
            { "title": "help", "description": "Show help information" },
            { "title": "start", "description": "Start a new conversation" }
          ]
        }
      ]
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["${{BOT_DOMAIN}}"]
}
```

## pitfalls

- **Publishing without validating first** — `atk validate` catches schema errors, missing fields, and invalid URLs. Skipping it means surprises during admin review or Store rejection.
- **Same version number on update** — The org catalog and Store reject duplicate versions. Always bump `version` in manifest.json before re-publishing.
- **Missing privacy/terms URLs** — Required for Teams Store submission. Org catalog may accept without them, but add them early to avoid rework.
- **Icons wrong size or format** — Color icon must be 192x192 PNG. Outline icon must be 32x32 PNG with only white and transparent pixels. Wrong sizes cause validation failure.
- **Not testing in all declared scopes** — If manifest declares `personal`, `team`, and `groupChat` scopes, the app must work correctly in all three. Store review tests all declared scopes.
- **Forgetting admin approval step** — `atk publish` only submits. The app isn't available until an admin approves it in the Teams Admin Center. Plan for this delay.
- **Testing only in playground before publishing** — The playground doesn't cover SSO, message extensions, or Teams-specific behaviors. Always do a full sideload test in the real Teams client.
- **Partner Center submission without meeting all policies** — Microsoft's validation checks functionality, security, performance, and compliance. Read the [validation guidelines](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/teams-store-validation-guidelines) before submitting.

## references

- [Publish Teams apps overview](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-publish-overview)
- [Publish to org catalog](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload)
- [Submit to Teams Store](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/publish)
- [Teams Store validation guidelines](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/teams-store-validation-guidelines)
- [ATK publish command](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/toolkit-cli)
- [App manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)

## instructions

Do a web search for:

- "Microsoft Teams app publishing org catalog admin approval 2025"
- "atk publish validate package CLI commands"
- "Teams Store submission Partner Center validation requirements"

Pair with:
- `../experts/teams/runtime.manifest-ts.md` — manifest structure and schema requirements
- `lifecycle-cli.md` — CLI commands for validate, package, publish
- `environments.md` — environment-specific publishing (dev vs production)
- `../experts/deploy/azure-bot-deploy-ts.md` — deploy must succeed before publishing

## research

Deep Research prompt:

"Write a micro expert on Microsoft Teams app publishing workflow (TypeScript). Cover the three publishing stages (sideload, org catalog, Teams Store), atk publish / validate / package / update commands, admin approval flow in Teams Admin Center, Partner Center submission for Teams Store, validation requirements (manifest schema, icons, scopes, privacy/terms URLs), version bumping for updates, and the complete pre-submission checklist. Include canonical patterns for: org catalog publishing steps, app update workflow, manifest fields required for Store submission."
