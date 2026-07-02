# runtime.manifest-ts

## purpose

Teams app manifest (manifest.json) structure, schema, bots config, permissions, compose extensions, commands, and deployment packaging.

## rules

1. Use schema version `1.20` with `"$schema": "https://developer.microsoft.com/json-schemas/teams/v1.20/MicrosoftTeams.schema.json"` and `"manifestVersion": "1.20"`. This is the current stable schema for Teams SDK v2 projects. [learn.microsoft.com -- Manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
2. Required top-level fields are: `$schema`, `version`, `manifestVersion`, `id`, `name` (with `short` max 30 chars and `full` max 100 chars), `description` (with `short` max 80 chars and `full` max 4000 chars), `developer` (with `name`, `websiteUrl`, `privacyUrl`, `termsOfUseUrl`), `icons` (`outline` and `color`), and `accentColor`. Omitting any causes validation failure on upload. [learn.microsoft.com -- Manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
3. The `bots` array defines bot registrations. Each entry requires `botId` (the Azure Bot ID, typically a placeholder like `${{BOT_ID}}`), `scopes` (array of `"personal"`, `"team"`, `"groupChat"`), and optional flags `isNotificationOnly`, `supportsCalling`, `supportsVideo`, `supportsFiles`. Scopes determine where the bot can receive activities. [learn.microsoft.com -- Bots in manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#bots)
4. Add `composeExtensions` for message extensions. Each entry needs `botId`, `type` (`"query"` or `"action"`), and a `commands` array. Each command has `id`, `type`, `title`, and `parameters` for query commands or `fetchTask: true` for action commands. [learn.microsoft.com -- Compose extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#composeextensions)
5. The `validDomains` array lists domains the bot is allowed to open in web views and task modules. Always include `"*.botframework.com"` and your bot's domain. Omitting a domain causes blank task modules. [learn.microsoft.com -- Valid domains](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#validdomains)
6. The `webApplicationInfo` section provides SSO configuration with `id` (the bot/app ID) and `resource` (the application ID URI, typically `"api://botid-${{BOT_ID}}"`). Required for OAuth/SSO flows. [learn.microsoft.com -- webApplicationInfo](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#webapplicationinfo)
7. Icons must be: `color.png` at exactly 192x192 pixels and `outline.png` at exactly 32x32 pixels with a transparent background. Both are PNG format. Place them in the `appPackage/` directory alongside `manifest.json`. [learn.microsoft.com -- App icons](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/apps-package#app-icons)
8. Package the app as a `.zip` file containing `manifest.json`, `color.png`, and `outline.png` from the `appPackage/` directory. The zip must contain these files at the root level (not nested in subdirectories). Use `atk package` to generate the zip with placeholders resolved, or manually zip and upload via Teams > Apps > Upload a custom app, or through Teams Admin Center. [learn.microsoft.com -- App package](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/apps-package)
9. Use placeholder variables like `${{TEAMS_APP_ID}}`, `${{BOT_ID}}`, and `${{BOT_DOMAIN}}` in the manifest for values that change between environments. The M365 Agents Toolkit resolves these during packaging. For manual deployment, replace them with actual values before zipping. [learn.microsoft.com -- Agents Toolkit](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/toolkit-v4/teams-toolkit-fundamentals-vs)
10. Add `staticTabs` for personal-scope tab experiences. The two default entries (`conversations` and `about`) are recommended for all bots. Add `commands` inside bot entries for slash-command discoverability in the Teams compose box. [learn.microsoft.com -- Static tabs](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#statictabs)

## patterns

### Minimal bot manifest

```typescript
// appPackage/manifest.json
const manifest = {
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.20/MicrosoftTeams.schema.json",
  "version": "1.0.0",
  "manifestVersion": "1.20",
  "id": "${{TEAMS_APP_ID}}",
  "name": {
    "short": "My Bot",
    "full": "My Teams Bot Application"
  },
  "developer": {
    "name": "Contoso",
    "mpnId": "",
    "websiteUrl": "https://example.com",
    "privacyUrl": "https://example.com/privacy",
    "termsOfUseUrl": "https://example.com/terms"
  },
  "description": {
    "short": "A helpful Teams bot",
    "full": "A Teams bot built with Teams SDK v2 that helps users with tasks."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#FFFFFF",
  "staticTabs": [
    { "entityId": "conversations", "scopes": ["personal"] },
    { "entityId": "about", "scopes": ["personal"] }
  ],
  "bots": [
    {
      "botId": "${{BOT_ID}}",
      "scopes": ["personal", "team", "groupChat"],
      "isNotificationOnly": false,
      "supportsCalling": false,
      "supportsVideo": false,
      "supportsFiles": false
    }
  ],
  "validDomains": ["${{BOT_DOMAIN}}", "*.botframework.com"],
  "webApplicationInfo": {
    "id": "${{BOT_ID}}",
    "resource": "api://botid-${{BOT_ID}}"
  }
};
```

### Manifest with message extensions

```typescript
// appPackage/manifest.json -- adding composeExtensions for a search command
const manifestWithExtensions = {
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.20/MicrosoftTeams.schema.json",
  "version": "1.0.0",
  "manifestVersion": "1.20",
  "id": "${{TEAMS_APP_ID}}",
  "name": {
    "short": "Search Bot",
    "full": "Search Bot with Message Extension"
  },
  "developer": {
    "name": "Contoso",
    "mpnId": "",
    "websiteUrl": "https://example.com",
    "privacyUrl": "https://example.com/privacy",
    "termsOfUseUrl": "https://example.com/terms"
  },
  "description": {
    "short": "Search and share results in Teams",
    "full": "A Teams bot with a search-based message extension."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#FFFFFF",
  "bots": [
    {
      "botId": "${{BOT_ID}}",
      "scopes": ["personal", "team", "groupChat"],
      "isNotificationOnly": false
    }
  ],
  "composeExtensions": [
    {
      "botId": "${{BOT_ID}}",
      "commands": [
        {
          "id": "searchCmd",
          "type": "query",
          "title": "Search",
          "description": "Search for items",
          "parameters": [
            {
              "name": "query",
              "title": "Search query",
              "description": "Enter search terms",
              "inputType": "text"
            }
          ]
        },
        {
          "id": "createCmd",
          "type": "action",
          "title": "Create Item",
          "description": "Create a new item",
          "fetchTask": true
        }
      ]
    }
  ],
  "validDomains": ["${{BOT_DOMAIN}}", "*.botframework.com"],
  "webApplicationInfo": {
    "id": "${{BOT_ID}}",
    "resource": "api://botid-${{BOT_ID}}"
  }
};
```

### Packaging the app for sideloading

```typescript
// Build script or manual steps to create the app package
// Preferred: atk package --env <environment> (resolves placeholders automatically)
// Manual steps below:

// 1. Ensure appPackage/ contains:
//    - manifest.json (with placeholders replaced)
//    - color.png   (192x192 pixels)
//    - outline.png (32x32 pixels, transparent background)

// 2. Replace placeholders before zipping:
//    ${{TEAMS_APP_ID}} -> your Azure AD app registration ID
//    ${{BOT_ID}}       -> your Azure Bot resource ID
//    ${{BOT_DOMAIN}}   -> your deployment domain (e.g., mybot.azurewebsites.net)

// 3. Create zip from the appPackage directory:
//    cd appPackage && zip -r ../mybot.zip manifest.json color.png outline.png

// 4. Upload in Teams:
//    Teams > Apps > Manage your apps > Upload a custom app > Upload mybot.zip
```

## pitfalls

- **Wrong icon dimensions**: Teams silently rejects or distorts icons that are not exactly 192x192 (color) and 32x32 (outline). Validate dimensions before packaging.
- **Nested zip structure**: The zip must contain `manifest.json`, `color.png`, and `outline.png` at the root. If they are in a subdirectory inside the zip (e.g., `appPackage/manifest.json`), Teams cannot read them.
- **Missing scopes**: If `bots[0].scopes` does not include `"team"`, the bot cannot be added to channels and never receives channel messages. If `"personal"` is missing, 1:1 chat does not work. Always verify scopes match your intended deployment.
- **Unresolved placeholders**: Shipping `${{BOT_ID}}` literally in the manifest causes the bot registration to fail. Either use the M365 Agents Toolkit to auto-resolve or manually replace all `${{...}}` values before zipping.
- **`validDomains` missing your domain**: Task modules, web views, and link unfurling that reference domains not listed in `validDomains` show blank content or fail silently.
- **Schema version mismatch**: Using features from a newer schema version (e.g., 1.17 features with `manifestVersion: "1.13"`) causes validation errors on upload. Keep `manifestVersion` and `$schema` in sync.
- **Forgetting `composeExtensions` for message extensions**: Registering `app.on('message.ext.query', ...)` in code without a matching `composeExtensions` entry in the manifest means the extension never appears in Teams.
- **`webApplicationInfo` misconfigured for SSO**: The `resource` field must match the Application ID URI configured in Azure AD. A mismatch causes the SSO token exchange to fail silently.

## references

- [Teams manifest schema reference](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Teams app package structure](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/apps-package)
- [Teams: Bots in manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#bots)
- [Teams: Compose extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#composeextensions)
- [Teams: App icons guidelines](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/apps-package#app-icons)
- [Teams: Valid domains](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#validdomains)

## instructions

This expert covers the Teams app manifest (`manifest.json`) and packaging for deployment. Use it when you need to:

- Create or modify `appPackage/manifest.json` for a Teams bot project
- Configure the `bots` section with correct `botId` and `scopes`
- Add `composeExtensions` for search or action-based message extensions
- Set up `validDomains` for task modules and web views
- Configure `webApplicationInfo` for OAuth/SSO
- Prepare icons (`color.png` 192x192, `outline.png` 32x32)
- Package the app as a zip for sideloading or admin deployment
- Resolve placeholder variables (`${{BOT_ID}}`, `${{TEAMS_APP_ID}}`, etc.)

Pair with `project.scaffold-files-ts.md` for the full project file structure and `runtime.app-init-ts.md` for the corresponding code-side initialization. Pair with `project.scaffold-files-ts.md` for appPackage directory structure, and `ui.message-extensions-ts.md` when adding composeExtensions to the manifest.

## research

Deep Research prompt:

"Write a micro expert on Microsoft Teams app manifest.json for SDK v2 bots (TypeScript). Cover the v1.20 schema, all required fields (id, name, description, developer, icons, accentColor, manifestVersion), bots section (botId, scopes, isNotificationOnly, supportsCalling, supportsVideo, supportsFiles), composeExtensions for message extensions (query and action types, commands, parameters, fetchTask), staticTabs, validDomains, webApplicationInfo for SSO, icon requirements (192x192 color PNG, 32x32 outline PNG with transparency), placeholder variable patterns (${{BOT_ID}}), zip packaging rules, and common validation errors. Include a complete manifest template and a manifest-with-extensions template."
