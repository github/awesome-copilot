# Lifecycle and `atk` CLI

## purpose

M365 Agents Toolkit lifecycle configuration (`m365agents.yml`) and full `atk` CLI command reference for provisioning, deploying, and managing M365 agents (declarative agents, custom engine agents, Teams bots/tabs/message extensions, Copilot connectors, Office add-ins).

## rules

1. **m365agents.yml is the lifecycle manifest.** Every Agents Toolkit project has an `m365agents.yml` at the project root for dev/cloud deployment, and typically an `m365agents.local.yml` for local development. They define the `provision`, `deploy`, and `publish` lifecycle stages — each stage is an ordered list of actions. `atk provision --env local` runs `m365agents.local.yml`; `atk provision --env dev` runs `m365agents.yml`.
2. **Lifecycle stages run in order: provision → deploy → publish.** Provision creates cloud resources (Azure Bot, App Registration, resource groups). Deploy pushes app code to compute targets. Publish submits the app package to the Teams catalog.
3. **All actions use `uses:` — there is no `runs:` syntax.** Built-in actions like `arm/deploy` or `teamsApp/create` are referenced with `uses: <action-name>`. Custom shell commands use the built-in `script` action: `uses: script` with `with.run: <command>`. Every action accepts a `with:` block for parameters.
4. **Built-in actions cover the full lifecycle.** Key actions: `aadApp/create`, `aadApp/update`, `botAadApp/create`, `botFramework/create`, `arm/deploy`, `azureAppService/zipDeploy`, `azureFunctions/zipDeploy`, `teamsApp/create`, `teamsApp/update`, `teamsApp/validateManifest`, `teamsApp/zipAppPackage`, `file/createOrUpdateEnvironmentFile`. The `aadApp/create` action **must include `generateServicePrincipal: true`** — without it, the service principal is not created and the bot gets `AADSTS7000229`.
5. **Use `m365agents.yml` to replace manual Azure portal setup.** A single `provision` stage automates what otherwise requires 10+ manual `az` CLI commands or Azure Portal steps: Entra ID App Registration (`aadApp/create`), bot identity and password (`botAadApp/create`), Bot Service with Teams channel (`botFramework/create`), ARM/Bicep resource deployment (`arm/deploy`), and Teams app registration (`teamsApp/create`). Each action writes its outputs (IDs, secrets) to env files automatically. For the full manual walkthrough these actions replace, see `../experts/deploy/azure-bot-deploy-ts.md` rules 3–12.
6. **`environmentFolderPath`** in `m365agents.yml` points to the `env/` directory. Defaults to `./env`. All `${{VAR}}` placeholders resolve from the active environment's `.env.{name}` files.
7. **`atk new` scaffolds a project.** Creates project structure with `m365agents.yml`, `m365agents.local.yml`, `env/` folder, `appPackage/`, and starter code. Supports `--capability` for predefined templates and `-i false` for non-interactive mode. ATK CLI version must be > 1.1.5-beta — install with `npm i -g @microsoft/m365agentstoolkit-cli@beta`.
8. **`atk provision` creates cloud resources.** Runs the `provision` stage in the environment-specific YAML. Accepts `--env <name>` to target a specific environment (default: `dev`). Always add `-i false` for non-interactive execution. Creates resources defined by ARM templates or built-in actions.
9. **`atk deploy` pushes code to cloud or generates local config.** Runs the `deploy` stage. For cloud (`--env dev`), builds the project and deploys to Azure. For local (`--env local`), writes runtime credentials to `.localConfigs` via `file/createOrUpdateEnvironmentFile`. Always run `atk provision` before first deploy.
10. **`atk publish` submits to the org catalog.** Runs the `publish` stage. Packages the app and submits it to the Teams Admin Center for org-wide distribution. Requires admin approval after submission.
11. **`atk validate` checks the manifest.** Validates `manifest.json` against the Teams schema before packaging. Catches missing fields, invalid scopes, and schema violations early.
12. **`atk package` creates the app zip bundle.** Generates the `.zip` containing `manifest.json`, icons, and resolved placeholders. Use `atk package --env <name> -i false`. This is the artifact uploaded to Teams or Partner Center.
13. **`atk preview` launches local testing.** Starts the Agents Playground for local testing without deploying to Teams. See `playground.md` for the recommended `agentsplayground` CLI alternative that requires no provisioning.
14. **CI/CD integration uses `atk` CLI with `--env` and `-i false` flags.** GitHub Actions and Azure Pipelines call `atk provision --env staging -i false` and `atk deploy --env staging -i false` in sequence. Store credentials in CI secrets, not in `.env.*.user` files.

## patterns

### Pattern 1: m365agents.yml anatomy (cloud deployment)

```yaml
# m365agents.yml — lifecycle configuration for dev/cloud
version: v1.11

environmentFolderPath: ./env

provision:
  - uses: teamsApp/create
    with:
      name: ${{TEAMS_APP_NAME}}
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID

  - uses: botAadApp/create
    with:
      name: ${{BOT_DISPLAY_NAME}}
    writeToEnvironmentFile:
      botId: BOT_ID
      botPassword: SECRET_BOT_PASSWORD

  - uses: arm/deploy
    with:
      subscriptionId: ${{AZURE_SUBSCRIPTION_ID}}
      resourceGroupName: ${{AZURE_RESOURCE_GROUP_NAME}}
      templates:
        - path: ./infra/azure.bicep
          parameters: ./infra/azure.parameters.json
          deploymentName: teams-bot
    writeToEnvironmentFile:
      botEndpoint: BOT_ENDPOINT

  - uses: teamsApp/zipAppPackage
    with:
      manifestPath: ./appPackage/manifest.json
      outputZipPath: ./appPackage/build/appPackage.${{APP_ENV}}.zip
      outputFolder: ./appPackage/build

  - uses: teamsApp/update
    with:
      appPackagePath: ./appPackage/build/appPackage.${{APP_ENV}}.zip

deploy:
  - uses: cli/runNpmCommand
    with:
      args: install
  - uses: azureAppService/zipDeploy
    with:
      artifactFolder: .
      resourceId: ${{AZURE_APP_SERVICE_RESOURCE_ID}}
```

### Pattern 1b: m365agents.local.yml anatomy (local development)

```yaml
# m365agents.local.yml — lifecycle configuration for local
version: v1.11

provision:
  - uses: teamsApp/create
    with:
      name: ${{TEAMS_APP_NAME}}-local-debug
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID

  - uses: aadApp/create
    with:
      name: ${{CONFIG__MANIFEST__NAME}}-aad
      generateClientSecret: true
      generateServicePrincipal: true  # REQUIRED — without this, AADSTS7000229
      signInAudience: AzureADMultipleOrgs
    writeToEnvironmentFile:
      clientId: BOT_ID
      clientSecret: SECRET_BOT_PASSWORD
      objectId: BOT_OBJECT_ID
      tenantId: TEAMS_APP_TENANT_ID

  - uses: botFramework/create
    with:
      botId: ${{BOT_ID}}
      name: ${{CONFIG__MANIFEST__NAME}}
      messagingEndpoint: ${{BOT_ENDPOINT}}/api/messages
      description: ""  # Optional — driver defaults to ""; templates set it explicitly for clarity
      channels:
        - name: msteams

deploy:
  - uses: file/createOrUpdateEnvironmentFile
    with:
      target: ./.localConfigs
      envs:
        PORT: 3978
        CLIENT_ID: ${{BOT_ID}}
        CLIENT_SECRET: ${{SECRET_BOT_PASSWORD}}
        TENANT_ID: ${{TEAMS_APP_TENANT_ID}}
```

> **Critical:** `.localConfigs` is what your app reads at runtime, NOT `env/.env.local`. The `file/createOrUpdateEnvironmentFile` action transforms env vars from `env/.env.local` into `.localConfigs`. In the example above, `.localConfigs` `TENANT_ID` comes from `TEAMS_APP_TENANT_ID` in `env/.env.local`. If `TENANT_ID` is missing from `.localConfigs` after deploy, copy the value from `TEAMS_APP_TENANT_ID` in `env/.env.local`.

### Pattern 2: Manual steps replaced by m365agents.yml

Each `provision` action in `m365agents.yml` replaces one or more manual Azure CLI / Portal steps. This table maps them:

| `m365agents.yml` action | Manual equivalent it replaces | What gets auto-created |
|---|---|---|
| `aadApp/create` | Azure Portal → App Registrations → New registration, or `az ad app create` + `az ad app credential reset` | Entra ID App with client ID + secret, written to env |
| `botAadApp/create` | `az ad app create` (separate bot identity) + `az ad app credential reset` | Bot-specific App ID + password, written to env |
| `botFramework/create` | `az bot create --app-type SingleTenant` + `az bot msteams create` | Azure Bot Service resource with Teams channel connected |
| `arm/deploy` | `az group create` + `az webapp create` + `az webapp config appsettings set` (or equivalent for Functions/Container Apps) | All Bicep/ARM resources (App Service, plan, settings) |
| `teamsApp/create` | Teams client → Apps → Upload a custom app, or Teams Admin Center upload | Teams app registration with `TEAMS_APP_ID` |
| `azureAppService/zipDeploy` | `az webapp deploy --src-path <zip>` | Code deployed to App Service |
| `teamsApp/zipAppPackage` | Manually zip `manifest.json` + icons with resolved placeholders | App package `.zip` ready for sideload or publishing |

> **Bottom line:** `atk provision` + `atk deploy` replaces steps 3–12 in `../experts/deploy/azure-bot-deploy-ts.md`. Two commands instead of ten.

### Pattern 2b: Custom shell commands via `uses: script`

There is no `runs:` step in `m365agents.yml`. To run an arbitrary shell command, use the built-in `script` action:

```yaml
# Set environment variables for local launch (from templates/configs/local/typescript/m365agents.local.yml.tpl)
- uses: script
  with:
    run:
      echo "::set-teamsfx-env BOT_DOMAIN=localhost";
      echo "::set-teamsfx-env BOT_ENDPOINT=https://localhost:3978";

# Run a build step in a subdirectory
- uses: script
  with:
    run: npm run build
    workingDirectory: ./src
```

The `script` driver also supports `shell:` (e.g., `bash`, `pwsh`) and `redirectTo:` for capturing output.

### Pattern 3: CLI command reference

```bash
# Check CLI version (must be > 1.1.5-beta)
atk --version

# Install / update CLI
npm i -g @microsoft/m365agentstoolkit-cli@beta

# Scaffold a new project
atk new                                         # Interactive wizard
atk new -c ai-bot -l typescript -i false        # Non-interactive

# Provision cloud resources
atk provision --env dev -i false                # Uses m365agents.yml
atk provision --env local -i false              # Uses m365agents.local.yml
atk provision --env dev --resource-group <rg> --region <region> -i false  # Azure resources

# Deploy application code / generate .localConfigs
atk deploy --env dev -i false                   # Deploy to Azure
atk deploy --env local -i false                 # Generate .localConfigs

# Validate and package
atk validate --env dev -i false
atk package --env dev -i false

# Publish to org catalog
atk publish --env dev -i false

# Local preview / Agents Playground
atk preview

# Update an existing Teams app registration
atk update

# Auth management
atk auth login m365
atk auth login azure
atk auth list
```

### Pattern 4: GitHub Actions CI/CD pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Teams Bot
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Install Agents Toolkit CLI
        run: npm install -g @microsoft/m365agentstoolkit-cli

      - name: Provision
        run: atk provision --env production -i false
        env:
          AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          AZURE_RESOURCE_GROUP_NAME: ${{ secrets.AZURE_RESOURCE_GROUP_NAME }}
          # M365 credentials for app registration
          M365_ACCOUNT_NAME: ${{ secrets.M365_ACCOUNT_NAME }}
          M365_ACCOUNT_PASSWORD: ${{ secrets.M365_ACCOUNT_PASSWORD }}

      - name: Deploy
        run: atk deploy --env production -i false
        env:
          AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### Pattern 5: Cross-Platform Projects (no m365agents.yml)

Standalone cross-platform examples (Teams + Slack) can skip `m365agents.yml` entirely. These projects:

- Use a single `.env` file at the project root (loaded via `dotenv`) instead of `env/.env.{name}` pairs
- Still include `appPackage/manifest.json` for sideloading into Teams
- Run with `tsx watch` or `node` directly — no `atk provision` or `atk deploy` needed
- Manage Azure resources manually (Bot Registration, App Service) rather than through lifecycle actions

```
cross-platform-bot/
├── appPackage/
│   └── manifest.json          # v1.26 schema, ${{VAR}} placeholders for sideloading
├── src/
│   ├── adapters/
│   │   ├── teams-bot.ts       # @microsoft/teams.apps handler
│   │   └── slack-bot.ts       # @slack/bolt handler
│   └── index.ts               # Starts both platforms
├── .env                       # All credentials (Teams + Slack) in one file
├── package.json
└── tsconfig.json              # extends @microsoft/teams.config/tsconfig.node.json
```

> **When to add `m365agents.yml`:** Only when you want `atk provision` / `atk deploy` to manage Azure resources automatically. For teaching examples and local development, manual `.env` + sideloading is simpler.

## pitfalls

- **Running `deploy` before `provision`** — Cloud resources must exist first. Always provision before the first deploy. Subsequent deploys can skip provision if resources haven't changed.
- **Forgetting `writeToEnvironmentFile`** — Built-in actions that create resources output IDs and secrets. Without `writeToEnvironmentFile`, downstream actions can't reference these values.
- **Editing `m365agents.yml` action order** — Actions run top-to-bottom within a stage. Moving `arm/deploy` before `botAadApp/create` breaks because the ARM template references the bot ID.
- **Inventing a `runs:` field** — There is no top-level `runs:` step in `m365agents.yml`. For custom shell commands, use the built-in `uses: script` action with a `with.run: <command>` block (and an optional `working-directory:`).
- **Committing `.env.*.user` files** — These contain secrets (`SECRET_*` vars). They're gitignored by default — don't override this.
- **Missing `--env` in CI** — Without `--env`, the CLI uses the `dev` environment. Production pipelines must specify `--env production` explicitly.
- **Confusing `atk` with legacy CLI names** — The CLI was previously called `teamsfx`, then `teamsapp`. The current CLI is `atk` (installed as `@microsoft/m365agentstoolkit-cli`). If docs or examples reference `teamsfx` or `teamsapp`, translate to `atk`.
- **ARM template parameter mismatches** — `arm/deploy` parameters must match the Bicep/ARM template's expected inputs. Mismatches cause silent failures during provisioning.
- **Missing `generateServicePrincipal: true` in `aadApp/create`** — Without this field, no service principal is created. The bot gets `AADSTS7000229` at runtime. Always include it in the local YAML's `aadApp/create` action.
- **`TENANT_ID` not written to `.localConfigs`** — The `file/createOrUpdateEnvironmentFile` may not include `TENANT_ID`. Without it, the SDK acquires tokens from the wrong authority, causing 401 from Bot Connector. Copy from `env/.env.local` if missing.
- **Devtunnel URL blacklisted after repeated 401s** — Bot Framework may cache a failing tunnel URL. Even after fixing auth, the bot still gets 401. Create a fresh devtunnel, update `BOT_ENDPOINT`, and re-provision.
- **`outputJsonPath` in `teamsApp/zipAppPackage`** — This field does not exist. Use `outputFolder` instead. Using the wrong field causes a silent schema validation error.
- **Assuming `description` is required in `botFramework/create`** — It is optional. The driver defaults to `""` when not provided. Templates set `description: ""` explicitly only for clarity, not because the schema rejects its omission.
- **Using `botAadApp/create` in local YAML** — `botAadApp/create` is for cloud (`m365agents.yml`). Local templates use `aadApp/create` + `botFramework/create` instead.

## references

- [M365 Agents Toolkit overview](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [m365agents.yml schema](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/m365-agents-yml-file)
- [Provision cloud resources](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/provision)
- [Deploy to Azure](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/deploy)
- [CI/CD with Agents Toolkit](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/toolkit-v4/use-cicd-template-v4)
- [ATK CLI reference](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/toolkit-cli)

## instructions

Do a web search for:

- "Microsoft 365 Agents Toolkit m365agents.yml lifecycle configuration 2025"
- "atk CLI provision deploy publish commands reference"
- "Agents Toolkit CI/CD GitHub Actions Azure Pipelines"

Pair with:
- `../experts/teams/project.scaffold-files-ts.md` — project scaffolding (what `atk new` creates)
- `../experts/deploy/azure-bot-deploy-ts.md` — manual Azure deployment as alternative to Agents Toolkit
- `environments.md` — environment files consumed by lifecycle hooks
- `publish.md` — detailed publishing workflow

## research

Deep Research prompt:

"Write a micro expert on Microsoft 365 Agents Toolkit lifecycle management (TypeScript). Cover m365agents.yml anatomy, atk CLI commands (new, provision, deploy, publish, validate, package, preview, update), built-in actions (arm/deploy, azureAppService/deploy, aadApp/create, botAadApp/create, teamsApp/create, teamsApp/validateManifest, teamsApp/zipAppPackage), uses: vs runs: hooks, writeToEnvironmentFile, CI/CD integration with GitHub Actions and Azure Pipelines. Include canonical patterns for: complete m365agents.yml config, CLI command reference cheat sheet, GitHub Actions deployment pipeline."
