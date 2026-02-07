---
name: azure-static-web-apps
description: Helps create, configure, and deploy Azure Static Web Apps using the SWA CLI. Use when deploying static sites to Azure, setting up SWA local development, configuring staticwebapp.config.json, adding Azure Functions APIs to SWA, or setting up GitHub Actions CI/CD for Static Web Apps.
---

## Overview

Azure Static Web Apps (SWA) hosts static frontends with optional serverless API backends. The SWA CLI (`swa`) provides local development emulation and deployment capabilities.

**Key features:**
- Local emulator with API proxy and auth simulation
- Framework auto-detection and configuration
- Direct deployment to Azure
- Database connections support

**Config files:**
- `swa-cli.config.json` - CLI settings, **created by `swa init`** (never create manually)
- `staticwebapp.config.json` - Runtime config (routes, auth, headers, API runtime) - can be created manually

## General Instructions

### Installation

```bash
npm install -D @azure/static-web-apps-cli
```

Verify: `npx swa --version`

### Quick Start Workflow

**IMPORTANT: Always use `swa init` to create configuration files. Never manually create `swa-cli.config.json`.**

1. `swa init` - **Required first step** - auto-detects framework and creates `swa-cli.config.json`
2. `swa start` - Run local emulator at `http://localhost:4280`
3. `swa login` - Authenticate with Azure
4. `swa deploy` - Deploy to Azure

### Configuration Files

**swa-cli.config.json** - Created by `swa init`, do not create manually:
- Run `swa init` for interactive setup with framework detection
- Run `swa init --yes` to accept auto-detected defaults
- Edit the generated file only to customize settings after initialization

Example of generated config (for reference only):
```json
{
  "$schema": "https://aka.ms/azure/static-web-apps-cli/schema",
  "configurations": {
    "app": {
      "appLocation": ".",
      "apiLocation": "api",
      "outputLocation": "dist",
      "appBuildCommand": "npm run build",
      "run": "npm run dev",
      "appDevserverUrl": "http://localhost:3000"
    }
  }
}
```

**staticwebapp.config.json** (in app source or output folder) - This file CAN be created manually for runtime configuration:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*", "/css/*"]
  },
  "routes": [
    { "route": "/api/*", "allowedRoles": ["authenticated"] }
  ],
  "platform": {
    "apiRuntime": "node:20"
  }
}
```

## Command-line Reference

### swa login

Authenticate with Azure for deployment.

```bash
swa login                              # Interactive login
swa login --subscription-id <id>       # Specific subscription
swa login --clear-credentials          # Clear cached credentials
```

**Flags:** `--subscription-id, -S` | `--resource-group, -R` | `--tenant-id, -T` | `--client-id, -C` | `--client-secret, -CS` | `--app-name, -n`

### swa init

Configure a new SWA project based on an existing frontend and (optional) API. Detects frameworks automatically.

```bash
swa init                    # Interactive setup
swa init --yes              # Accept defaults
```

### swa build

Build frontend and/or API.

```bash
swa build                   # Build using config
swa build --auto            # Auto-detect and build
swa build myApp             # Build specific configuration
```

**Flags:** `--app-location, -a` | `--api-location, -i` | `--output-location, -O` | `--app-build-command, -A` | `--api-build-command, -I`

### swa start

Start local development emulator.

```bash
swa start                                    # Serve from outputLocation
swa start ./dist                             # Serve specific folder
swa start http://localhost:3000              # Proxy to dev server
swa start ./dist --api-location ./api        # With API folder
swa start http://localhost:3000 --run "npm start"  # Auto-start dev server
```

**Common framework ports:**
| Framework | Port |
|-----------|------|
| React/Vue/Next.js | 3000 |
| Angular | 4200 |
| Vite | 5173 |

**Key flags:**
- `--port, -p` - Emulator port (default: 4280)
- `--api-location, -i` - API folder path
- `--api-port, -j` - API port (default: 7071)
- `--run, -r` - Command to start dev server
- `--open, -o` - Open browser automatically
- `--ssl, -s` - Enable HTTPS

### swa deploy

Deploy to Azure Static Web Apps.

```bash
swa deploy                              # Deploy using config
swa deploy ./dist                       # Deploy specific folder
swa deploy --env production             # Deploy to production
swa deploy --deployment-token <TOKEN>   # Use deployment token
swa deploy --dry-run                    # Preview without deploying
```

**Get deployment token:**
- Azure Portal: Static Web App → Overview → Manage deployment token
- CLI: `swa deploy --print-token`
- Environment variable: `SWA_CLI_DEPLOYMENT_TOKEN`

**Key flags:**
- `--env` - Target environment (`preview` or `production`)
- `--deployment-token, -d` - Deployment token
- `--app-name, -n` - Azure SWA resource name

### swa db

Initialize database connections.

```bash
swa db init --database-type mssql
swa db init --database-type postgresql
swa db init --database-type cosmosdb_nosql
```

## Scenarios

### Create SWA from Existing Frontend and Backend

**Always run `swa init` before `swa start` or `swa deploy`. Do not manually create `swa-cli.config.json`.**

```bash
# 1. Install CLI
npm install -D @azure/static-web-apps-cli

# 2. Initialize - REQUIRED: creates swa-cli.config.json with auto-detected settings
npx swa init              # Interactive mode
# OR
npx swa init --yes        # Accept auto-detected defaults

# 3. Build application (if needed)
npm run build

# 4. Test locally (uses settings from swa-cli.config.json)
npx swa start

# 5. Deploy
npx swa login
npx swa deploy --env production
```

### Add Azure Functions Backend

1. **Create API folder:**
```bash
mkdir api && cd api
func init --worker-runtime node --model V4
func new --name message --template "HTTP trigger"
```

2. **Example function** (`api/src/functions/message.js`):
```javascript
const { app } = require('@azure/functions');

app.http('message', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const name = request.query.get('name') || 'World';
        return { jsonBody: { message: `Hello, ${name}!` } };
    }
});
```

3. **Set API runtime** in `staticwebapp.config.json`:
```json
{
  "platform": { "apiRuntime": "node:20" }
}
```

4. **Update CLI config** in `swa-cli.config.json`:
```json
{
  "configurations": {
    "app": { "apiLocation": "api" }
  }
}
```

5. **Test locally:**
```bash
npx swa start ./dist --api-location ./api
# Access API at http://localhost:4280/api/message
```

**Supported API runtimes:** `node:18`, `node:20`, `node:22`, `dotnet:8.0`, `dotnet-isolated:8.0`, `python:3.10`, `python:3.11`

### Set Up GitHub Actions Deployment

1. **Create SWA resource** in Azure Portal or via Azure CLI
2. **Link GitHub repository** - workflow auto-generated, or create manually:

`.github/workflows/azure-static-web-apps.yml`:
```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: /
          api_location: api
          output_location: dist

  close_pr:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: close
```

3. **Add secret:** Copy deployment token to repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN`

**Workflow settings:**
- `app_location` - Frontend source path
- `api_location` - API source path
- `output_location` - Built output folder
- `skip_app_build: true` - Skip if pre-built
- `app_build_command` - Custom build command

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on client routes | Add `navigationFallback` with `rewrite: "/index.html"` to `staticwebapp.config.json` |
| API returns 404 | Verify `api` folder structure, ensure `platform.apiRuntime` is set, check function exports |
| Build output not found | Verify `output_location` matches actual build output directory |
| Auth not working locally | Use `/.auth/login/<provider>` to access auth emulator UI |
| CORS errors | APIs under `/api/*` are same-origin; external APIs need CORS headers |
| Deployment token expired | Regenerate in Azure Portal → Static Web App → Manage deployment token |
| Config not applied | Ensure `staticwebapp.config.json` is in `app_location` or `output_location` |
| Local API timeout | Default is 45 seconds; optimize function or check for blocking calls |

**Debug commands:**
```bash
swa start --verbose log        # Verbose output
swa deploy --dry-run           # Preview deployment
swa --print-config             # Show resolved configuration
```
