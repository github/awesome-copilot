# app-distribution-packaging-ts

## purpose

Bridges Slack App Directory distribution and Teams app packaging / Admin Center publishing for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack App Directory → Teams App Store (Partner Center).** Slack apps are listed in the Slack App Directory for public distribution. Teams apps are published to the Microsoft Teams App Store via Partner Center. The review and submission process is completely different — Partner Center requires a Microsoft Partner Network account and compliance with Teams store validation policies. [learn.microsoft.com -- Publish to store](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/publish)
2. **Slack OAuth install flow → Azure Bot registration (no per-workspace tokens).** Slack apps use OAuth to install into each workspace, generating per-workspace `xoxb-` tokens stored in an `InstallationStore`. Teams bots use Azure Bot Framework credentials (`CLIENT_ID`/`CLIENT_SECRET`) that work across all tenants. There are no per-workspace tokens to manage. Delete `InstallationStore` and all OAuth install flow code. [learn.microsoft.com -- Bot registration](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration)
3. **Slack `InstallationStore` → conversation reference storage.** Slack's `InstallationStore` persists tokens per workspace for API calls. Teams doesn't need per-workspace tokens, but you still need to store conversation references for proactive messaging. Replace `InstallationStore` with a conversation reference store keyed by `conversationId`. [learn.microsoft.com -- Proactive messages](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
4. **Slack org-level install → Teams Admin Center tenant-wide deployment.** Slack Enterprise Grid supports org-level app installation. In Teams, tenant-wide deployment is done via the Teams Admin Center by an IT admin: Manage Apps → Upload/Approve → Deploy to users/groups. No code changes needed — the admin controls distribution. [learn.microsoft.com -- Admin Center](https://learn.microsoft.com/en-us/microsoftteams/manage-apps)
5. **Development install → Teams sideloading.** Slack development apps are installed via the app's manage page or OAuth URL. Teams development apps are sideloaded: upload the app package (ZIP with manifest + icons) directly into Teams. Sideloading must be enabled by the tenant admin. [learn.microsoft.com -- Sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload)
6. **Agents Toolkit simplifies packaging, provisioning, and deployment.** Agents Toolkit (VS Code extension or CLI `atk`) automates: Azure resource provisioning, app package generation, sideloading, and publishing. It replaces the manual Azure Portal + zip file workflow. Use `atk package` to generate the app package and `atk publish` to submit. [learn.microsoft.com -- Agents Toolkit](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
7. **Multi-tenant Slack app → Azure AD multi-tenant app registration.** Slack multi-workspace apps use the App Directory + OAuth per workspace. Teams multi-tenant bots use a single Azure AD app registration with `signInAudience: "AzureADMultipleOrgs"`. Any tenant can install the bot without workspace-specific OAuth. [learn.microsoft.com -- Multi-tenant](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-authentication-basics)
8. **Slack app manifest (`manifest.json`) → Teams app manifest (`manifest.json` in app package).** Both platforms use JSON manifests but with completely different schemas. Slack's manifest includes OAuth scopes, event subscriptions, slash commands. Teams manifest includes `bots`, `composeExtensions`, `staticTabs`, `webApplicationInfo`, `validDomains`. No automatic conversion exists. [learn.microsoft.com -- Manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
9. **Slack app icons (512x512 + workspace-specific) → Teams icons (color 192x192 + outline 32x32).** Teams requires exactly two icon files in the app package: a full-color icon (192x192 PNG) and an outline/monochrome icon (32x32 PNG with transparent background). The outline icon is used in the Teams activity bar. [learn.microsoft.com -- App icons](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#icons)
10. **Slack app review (hours-days) vs Teams store review (1-2 weeks).** Slack's App Directory review is relatively fast. Teams App Store review via Partner Center is more rigorous and can take 1-2 weeks. Plan for revision cycles — common rejection reasons include missing privacy policy URL, incomplete manifest, and accessibility issues. [learn.microsoft.com -- Store validation](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/teams-store-validation-guidelines)
11. **Reverse direction (Teams → Slack):** For Teams → Slack, map Teams manifest to Slack app manifest, and Teams Admin Center publishing to Slack App Directory submission. Azure Bot registration credentials map to Slack OAuth install flow with `InstallationStore` for per-workspace tokens. Teams sideloading maps to Slack development install via OAuth URL. The Teams color/outline icon pair maps to Slack's single 512x512 app icon. Azure AD multi-tenant registration maps to Slack App Directory multi-workspace distribution with per-workspace OAuth.

## patterns

### InstallationStore removal + conversation reference storage

**Slack (before):**

```typescript
import { App, Installation, InstallationQuery } from "@slack/bolt";

// InstallationStore — persist per-workspace tokens
const installationStore = {
  storeInstallation: async (installation: Installation) => {
    const teamId = installation.team?.id ?? installation.enterprise?.id;
    await db.put(`installation:${teamId}`, JSON.stringify(installation));
  },
  fetchInstallation: async (query: InstallationQuery<boolean>) => {
    const teamId = query.teamId ?? query.enterpriseId;
    const data = await db.get(`installation:${teamId}`);
    return JSON.parse(data) as Installation;
  },
  deleteInstallation: async (query: InstallationQuery<boolean>) => {
    const teamId = query.teamId ?? query.enterpriseId;
    await db.delete(`installation:${teamId}`);
  },
};

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  stateSecret: process.env.SLACK_STATE_SECRET!,
  installationStore,
  scopes: ["chat:write", "commands", "channels:history"],
});

// Use workspace-specific token for API calls
app.message(/hello/i, async ({ say, client }) => {
  // client automatically uses the workspace's xoxb token
  await say("Hello!");
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

// No InstallationStore needed — single credential set works for all tenants
const app = new App({
  clientId: process.env.CLIENT_ID,      // Azure Bot app ID
  clientSecret: process.env.CLIENT_SECRET, // Azure Bot secret
  tenantId: process.env.TENANT_ID,       // or "common" for multi-tenant
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Store conversation references instead of installations
// Needed for proactive messaging (the only thing that replaced InstallationStore's purpose)
const conversationRefs = new Map<string, {
  conversationId: string;
  serviceUrl: string;
  tenantId: string;
}>();

app.on("install.add", async ({ activity, send }) => {
  // Persist conversation reference for future proactive messaging
  const convId = activity.conversation?.id ?? "";
  conversationRefs.set(convId, {
    conversationId: convId,
    serviceUrl: (activity as any).serviceUrl,
    tenantId: activity.channelData?.tenant?.id ?? "",
  });
  await send("Bot installed! I'm ready to help.");
});

app.on("install.remove", async ({ activity }) => {
  const convId = activity.conversation?.id ?? "";
  conversationRefs.delete(convId);
});

app.message(/hello/i, async ({ send }) => {
  // No workspace token lookup needed — just send
  await send("Hello!");
});

app.start(3978);
```

### App Directory → Admin Center deployment

**Slack** — submit app to Slack App Directory via api.slack.com dashboard. Users install via the directory.

**Teams** — multiple distribution paths:

```shell
# Option 1: Sideload for development
# Build the app package (manifest.json + icons in a ZIP)
atk package --env dev -i false

# Upload to Teams:
# Teams → Apps → Manage your apps → Upload a custom app

# Option 2: Submit to organization's app catalog
atk publish --env staging
# IT admin approves in Teams Admin Center → Manage Apps

# Option 3: Submit to public Teams App Store (Partner Center)
# 1. Create Partner Center account
# 2. Submit app package for review
# 3. Review takes 1-2 weeks
# 4. Once approved, appears in Teams App Store

# Option 4: Tenant-wide deployment (admin pushes to all users)
# Teams Admin Center → Manage Apps → find app → Assign to users/groups
# No code changes — purely admin configuration
```

**Teams app package structure:**

```
my-teams-bot.zip
├── manifest.json       # Teams-specific manifest (not Slack's)
├── color.png           # 192x192 full-color icon
└── outline.png         # 32x32 monochrome outline icon
```

### Distribution model mapping table

| Slack Distribution | Teams Equivalent | Notes |
|---|---|---|
| App Directory (public listing) | Teams App Store via Partner Center | Requires partner account; 1-2 week review |
| OAuth install flow (per-workspace) | Azure Bot registration (global) | No per-workspace tokens |
| `InstallationStore` | Conversation reference store | Only for proactive messaging |
| Org-level install (Enterprise Grid) | Teams Admin Center tenant-wide deploy | Admin pushes to users/groups |
| Development install (OAuth URL) | Sideloading (upload ZIP) | Admin must enable sideloading |
| `manifest.json` (Slack schema) | `manifest.json` (Teams schema) | Completely different schemas |
| App icon (512x512) | Color (192x192) + Outline (32x32) | Two icons required |
| OAuth scopes (`chat:write`, etc.) | Azure AD permissions + RSC | Different permission model |
| Multi-workspace (App Directory) | Multi-tenant (Azure AD) | `signInAudience: "AzureADMultipleOrgs"` |

## pitfalls

- **Trying to port the InstallationStore**: Teams does not need per-workspace token storage. Developers who port `InstallationStore` logic create unnecessary complexity. Delete it and use conversation reference storage only for proactive messaging.
- **Sideloading disabled by default in many orgs**: IT admins may have disabled sideloading. If the developer can't upload the app package, they need to request sideloading permission from their Teams admin. This is a common blocker during development.
- **Partner Center account setup takes time**: Publishing to the Teams App Store requires a Microsoft Partner Network account. Account verification can take days. Start the Partner Center registration early in the migration timeline.
- **Icon format rejection**: Teams requires exactly two PNG icons with specific dimensions. The outline icon must have a transparent background. Submitting icons in the wrong format or size causes app package validation failure.
- **Multi-tenant vs single-tenant confusion**: Slack apps are inherently multi-workspace when listed in the App Directory. Teams apps must explicitly set multi-tenant in the Azure AD app registration. A single-tenant registration only works in the developer's own organization.
- **OAuth scopes → RSC permissions**: Slack OAuth scopes (`channels:history`, `chat:write`) have no direct mapping to Azure AD permissions. Teams uses a combination of Azure AD API permissions and Resource-Specific Consent (RSC) permissions declared in the manifest. This is the most conceptually different part of the migration.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/publish
- https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload
- https://learn.microsoft.com/en-us/microsoftteams/manage-apps
- https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teams-toolkit-fundamentals
- https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema
- https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration
- https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/teams-store-validation-guidelines
- https://github.com/microsoft/teams.ts
- https://api.slack.com/distribution — Slack app distribution

## instructions

Use this expert when adding cross-platform support in either direction for app distribution and packaging. It covers: Slack App Directory bridged to Teams App Store (Partner Center), OAuth install flow vs Azure Bot registration, InstallationStore vs conversation reference storage, org-level deployment via Teams Admin Center, sideloading for development, Agents Toolkit for packaging, multi-tenant Azure AD registration, icon requirements, store review timelines, and reverse mapping from Teams manifest/Admin Center back to Slack app manifest and App Directory submission. Pair with `identity-oauth-bridge-ts.md` for the identity/OAuth model change, `../teams/runtime.manifest-ts.md` for Teams manifest creation, and `../teams/runtime.proactive-messaging-ts.md` for conversation reference storage patterns.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack App Directory distribution and Microsoft Teams app packaging / Admin Center publishing in either direction. Cover: App Directory vs Teams App Store (Partner Center), OAuth install flow vs Azure Bot registration, InstallationStore vs conversation reference storage, org-level install vs Teams Admin Center, sideloading, Agents Toolkit packaging, multi-tenant Azure AD app registration, icon requirements, manifest schema differences, OAuth scope to RSC mapping, store review timeline, and reverse mapping from Teams manifest/publishing back to Slack app manifest and App Directory submission. Include code examples and a mapping table."
