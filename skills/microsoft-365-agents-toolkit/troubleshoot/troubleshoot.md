# Troubleshooting

Consolidated troubleshooting for ATK projects — provisioning, runtime, Playground, and Teams issues.

## Error Code Quick Reference

| Error Code | Section |
|------------|---------|
| `Ext.FindProcessError` | [Port already in use](#port-already-in-use) |
| `Ext.PortsConflictError` | [Port already in use](#port-already-in-use) |
| `fileCreateOrUpdateEnvironmentFile.MissingEnvironmentVariablesError` | [Missing environment variables at runtime](#missing-environment-variables-at-runtime) |
| `botFrameworkCreate.MissingEnvironmentVariablesError` | [Missing environment variables at runtime](#missing-environment-variables-at-runtime) |
| `devToolInstall.TestToolInstallationError` | [Agents Playground installation failed](#agents-playground-installation-failed) |
| `devToolInstall.FuncInstallationError` | [Azure Functions Core Tools installation failed](#azure-functions-core-tools-installation-failed) |
| `Ext.DebugTestToolFailedToStartError` | [Playground won't start](#playground-wont-start) |
| `AppStudioPlugin.ManifestValidationFailed` | [Manifest validation failed](#manifest-validation-failed) |
| `armDeploy.DeployArmError` | [ARM deployment failed](#arm-deployment-failed) |
| `Ext.DevTunnelOperationError` | [Dev tunnel operation failed](#dev-tunnel-operation-failed) |

## Common Provisioning Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| YAML schema validation error during `atk provision` | Wrong field names in `m365agents.yml` or `m365agents.local.yml` | Check [field reference](../toolkit/manifest-and-yaml.md). Common: `outputJsonPath` → `outputFolder`, missing `description: ""` in `botFramework/create` |
| `teamsApp/validateManifest` fails with network error | Schema URL (`https://developer.microsoft.com/...`) unreachable | Remove `teamsApp/validateManifest` from local YAML, or retry with network access |
| `AADSTS7000229: missing service principal` | `aadApp/create` missing `generateServicePrincipal: true` | Add `generateServicePrincipal: true` to `aadApp/create` in YAML, re-provision — see [Missing Service Principal](#missing-service-principal-aadsts7000229) |
| 401 from Bot Connector (bot receives messages but can't reply) | `TENANT_ID` missing from `.localConfigs` → SDK uses wrong token authority | Copy `TENANT_ID` from `env/.env.local` to `.localConfigs` — see [Missing TENANT_ID](#missing-tenant_id-wrong-token-authority--401) |
| Bot still gets 401 after fixing auth issues | Devtunnel URL blacklisted by Bot Framework due to repeated prior failures | Create a fresh devtunnel (`devtunnel delete` + `devtunnel create`), update `BOT_ENDPOINT`, re-provision — see [Blacklisted Devtunnel URL](#blacklisted-devtunnel-url) |
| `Authorization: Bearer null` (401) at runtime | `clientId`/`clientSecret` not passed to Teams SDK `App` constructor | Pass credentials explicitly: `new App({ adapter: { credentials: { clientId, clientSecret, tenantId } } })` |
| 401 after changing to single-tenant (`AzureADMyOrg`) | Tenant mismatch — SDK doesn't accept `api://botid-{appId}` audience | Add custom JWT middleware accepting all audience formats, or stay with `AzureADMultipleOrgs` |
| Stale bot after re-provisioning | Old AAD app still referenced by Bot Framework registration | Delete `env/.env.local` and `env/.env.local.user`, re-run `atk provision --env local -i false` + `atk deploy --env local -i false` |
| Bot works in Playground but not in Teams | Missing dev tunnel or wrong `BOT_ENDPOINT` | Start `devtunnel host -p 3978 --allow-anonymous`, set `BOT_ENDPOINT` in `env/.env.local` before provisioning |
| Manifest v1.25 validation fails with `"team"` scope | `supportsChannelFeatures` required at runtime but rejected by v1.25 schema | Use `"personal"` scope only in v1.25, or use devPreview schema that defines the property |

## YAML Schema Errors

Common field name mistakes in `m365agents.local.yml`:
- `outputJsonPath` does not exist — use `outputFolder` in `teamsApp/zipAppPackage`
- `AAD_APP_OBJECT_ID` — use `BOT_OBJECT_ID` in local YAML's `aadApp/create` writeToEnvironmentFile
- Missing `description: ""` in `botFramework/create` — this field is required

See [../toolkit/manifest-and-yaml.md](../toolkit/manifest-and-yaml.md) for the full field reference.

## Known ATK Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| `aadApp/create` missing `generateServicePrincipal: true` | `AADSTS7000229: missing service principal in tenant` when bot calls Bot Connector | Add `generateServicePrincipal: true` to `aadApp/create` in YAML, then re-provision |
| `TENANT_ID` not written to `.localConfigs` | SDK defaults to `botframework.com` tenant → 401 from Bot Connector (wrong issuer/tid in token) | Copy `TENANT_ID` from `env/.env.local` (where `aadApp/create` writes it) into `.localConfigs` |
| Devtunnel URL blacklisted after repeated 401s | Bot still gets 401 even after fixing auth — Bot Framework cached the tunnel URL as failing | Delete old tunnel, create a fresh one, update `BOT_ENDPOINT`, re-provision |

## Authorization / 401 Issues

### Missing Service Principal (AADSTS7000229)

The `aadApp/create` action in `m365agents.local.yml` must include `generateServicePrincipal: true` to create the service principal (enterprise application) alongside the app registration. Without it, the client credentials grant fails:

```
AADSTS7000229: The client application <BOT_ID> is missing service principal in the tenant <TENANT_ID>
```

**Fix — add `generateServicePrincipal: true` to your YAML:**
```yaml
  - uses: aadApp/create
    with:
      name: ${{CONFIG__MANIFEST__NAME}}-aad
      generateClientSecret: true
      generateServicePrincipal: true   # ← REQUIRED — without this, no SP is created
      signInAudience: AzureADMultipleOrgs
    writeToEnvironmentFile:
      clientId: BOT_ID
      clientSecret: SECRET_BOT_PASSWORD
      objectId: BOT_OBJECT_ID
```

Then re-provision:
```bash
atk provision --env local -i false
```

> **Manual fallback** (if you can't re-provision): `az ad sp create --id <BOT_ID>`

### Blacklisted Devtunnel URL

After repeated 401 failures (e.g., from a missing service principal), Bot Framework may blacklist the devtunnel URL. Even after fixing the auth issue, the bot continues to get 401.

**Fix — create a fresh devtunnel:**
```bash
devtunnel delete <old-tunnel-id>
devtunnel create --allow-anonymous
devtunnel port create -p 3978
devtunnel host
```

Update `BOT_ENDPOINT` in `env/.env.local` with the new tunnel URL, then re-provision:
```bash
atk provision --env local -i false
atk deploy --env local -i false
```

### Missing TENANT_ID (wrong token authority → 401)

When `TENANT_ID` is not set in `.localConfigs` or environment, the Teams SDK (both Python and Node) may default to acquiring tokens from the shared `botframework.com` tenant (`d6d49420-f39b-4df7-a1dc-d59a935871db`) instead of your home tenant. The resulting token has:
- Wrong `iss` (issuer) and `tid` (tenant) claims
- No `roles` assigned

Bot Connector rejects this token with **401 Unauthorized**.

**Diagnose:**
```bash
# Check if TENANT_ID is set
grep TENANT_ID .localConfigs
# Or in env file
grep TENANT_ID env/.env.local
```

**Fix:**
```bash
# Copy TENANT_ID from env file (aadApp/create writes it there, not to .localConfigs)
grep TENANT_ID env/.env.local
# Add the value to .localConfigs
echo TENANT_ID=<tenant-id-from-env-file> >> .localConfigs
```

This ensures the SDK uses `https://login.microsoftonline.com/<your-tenant-id>` instead of `https://login.microsoftonline.com/botframework.com`.

> **Python SDK note:** `TokenManager._resolve_tenant_id()` falls back to `botframework.com` when `TENANT_ID` is unset. Always set it explicitly.

### `Authorization: Bearer null`

The Teams SDK v2 `App` constructor requires explicit credentials. If `clientId`/`clientSecret` are not passed, the auth header will be `Bearer null`:
```typescript
const app = new App({
  adapter: {
    credentials: {
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      tenantId: process.env.TENANT_ID, // required for single-tenant
    },
  },
});
```
Ensure `.localConfigs` has `CLIENT_ID` and `CLIENT_SECRET`. Run `atk deploy --env local -i false` to regenerate.

### 401 with single-tenant bots (`AzureADMyOrg`)

If `aadApp/create` uses `signInAudience: AzureADMyOrg`, Bot Framework tokens have audience `api://botid-{appId}`. The Teams SDK v2 only validates `{appId}` and `api://{appId}` by default, causing 401 errors. Solutions:
1. **Stay with `AzureADMultipleOrgs`** (recommended for most scenarios)
2. **Create custom auth middleware** with `skipAuth: true` on the `HttpPlugin`, then manually validate JWT tokens accepting all three audience formats: `{appId}`, `api://{appId}`, `api://botid-{appId}`

## Stale Bot Framework Registration

If you delete and re-create Azure AD apps, the Bot Framework registration may still reference the old app ID. Fix:
1. Delete `env/.env.local` and `env/.env.local.user`
2. Re-run `atk provision --env local -i false`
3. Re-run `atk deploy --env local -i false`
4. Re-sideload the Teams app

## Playground Issues

### Playground won't start

**Error code:** `Ext.DebugTestToolFailedToStartError`

Check if port 56150 is in use:
```bash
# Windows
netstat -ano | findstr :56150
# macOS / Linux
lsof -i :56150
```

The playground will automatically find an available port if 56150 is taken. If it still fails to start:
1. Check the output/terminal for error messages.
2. Ensure Agents Playground is installed correctly — see [Agents Playground installation failed](#agents-playground-installation-failed).
3. Try launching manually: `./devTools/playground/node_modules/.bin/agentsplayground start`

### Bot not responding in Playground

1. Verify bot is running on specified endpoint
2. Check bot logs for errors
3. Ensure your bot endpoint is accessible:
   ```bash
   curl http://localhost:3978/api/messages
   ```

## Teams Issues

### Teams shows "app not available"

This usually means BOT_ENDPOINT requires HTTPS. Use Agents Playground instead, or ensure dev tunnel is running and BOT_ENDPOINT is properly configured.

### App not loading

Verify `M365_APP_ID` (for declarative agents) or `TEAMS_APP_ID` (for bots/tabs) exists in `env/.env.local`.

### Manifest validation failed

**Error code:** `AppStudioPlugin.ManifestValidationFailed`

The app manifest (`appPackage/manifest.json`) failed validation against the Teams schema.

1. **Check the error details** — the output lists which fields are invalid.
2. **Common fixes:**
   - Missing required fields (e.g., `description`, `version`, `icons`).
   - Invalid scope — e.g., `"team"` scope with `supportsChannelFeatures` on schema v1.25 (use `"personal"` only, or switch to devPreview schema).
   - Schema URL mismatch — ensure `$schema` points to the correct manifest version.
3. **Validate locally:**
   ```bash
   atk validate --env <env>
   ```
4. **Re-build and re-provision after fixing:**
   ```bash
   atk provision --env local -i false
   ```

## Runtime Issues

### Port already in use

**Error codes:** `Ext.FindProcessError`, `Ext.PortsConflictError`

Common ports used by ATK projects: **3978** (bot), **9239** (Node debugger), **56150** (Agents Playground).

**Find and release occupied ports:**
```bash
# Check which ports are in use (replace PORT with 3978, 9239, 56150, etc.)
# Windows
netstat -ano | findstr :PORT
# macOS / Linux
lsof -i :PORT

# Kill the process occupying the port
# Windows (replace PID with the process ID from above)
taskkill /PID PID /F
# macOS / Linux
kill -9 PID
```

If the issue continues after releasing those three ports, inspect your bot logs and code for additional ports (e.g., custom API servers, function hosts on port 7071). Release them the same way.

### Missing environment variables at runtime

**Error codes:** `fileCreateOrUpdateEnvironmentFile.MissingEnvironmentVariablesError`, `botFrameworkCreate.MissingEnvironmentVariablesError`

Check that environment config files exist and contain all required values:
- For **local debug**: check `.localConfigs`
- For **Agents Playground debug**: also check `.localConfigs.playground`

Run `atk deploy --env local -i false` (or `--env playground` for Playground) to regenerate.

If a specific variable is reported missing, locate it in the relevant config file. Either fill in the correct value or remove the variable reference from your YAML if it is not needed.

### Agents Playground installation failed

**Error code:** `devToolInstall.TestToolInstallationError`

If automatic installation of Agents Playground fails, install it manually.

**Option 1 — npm (recommended):**
```bash
npm install -g @microsoft/m365agentsplayground
```

**Option 2 — winget (Windows only):**
```bash
winget install agentsplayground
```

**Option 3 — script (Linux only):**
```bash
curl -s https://raw.githubusercontent.com/OfficeDev/microsoft-365-agents-toolkit/dev/.github/scripts/install-agentsplayground-linux.sh | bash
```

**If installation still fails**, clear cached installation files and retry:
- npm version cache: `~/.fx/bin/testTool/`
- Binary version cache: `~/.fx/bin/testToolBinary/`

```bash
# Clear caches (adjust path separator for your OS)
rm -rf ~/.fx/bin/testTool
rm -rf ~/.fx/bin/testToolBinary
```

Then reinstall using one of the options above.

**Verify installation structure (npm version):**

A valid npm installation looks like:
```
~/.fx/bin/testTool/<version>/
```
where `<version>` is the npm version of `@microsoft/m365agentsplayground`, and the folder contains the installed package contents.

After installation, create a symlink under your project root:
```bash
# From your project root
ln -s ~/.fx/bin/testTool/<version> devTools/playground
```

**Verify installation structure (binary version):**

A valid binary installation looks like:
```
~/.fx/bin/testToolBinary/<version>/agentsplayground.exe
```

To install manually, download the release from:
`https://github.com/OfficeDev/microsoft-365-agents-toolkit/releases/tag/teams-app-test-tool%40<version>`
(e.g., `teams-app-test-tool%400.2.25` for version 0.2.25).

Extract `teamsapptester-win32-x64.zip` and place the contents (including the `.exe`) into `~/.fx/bin/testToolBinary/<version>/`.

If you encounter permission or OS-level errors (e.g., "access denied", "not recognized as executable"), try:
```bash
# Windows — unblock the downloaded file
powershell -Command "Unblock-File -Path '$HOME\.fx\bin\testToolBinary\<version>\agentsplayground.exe'"

# macOS / Linux — set executable permission
chmod +x ~/.fx/bin/testToolBinary/<version>/agentsplayground
```

If the issue persists, check your OS security settings and unblock the file manually.

### Azure Functions Core Tools installation failed

**Error code:** `devToolInstall.FuncInstallationError`

The `devTool/install` action in `m365agents.local.yml` installs Azure Functions Core Tools. The version range is defined in your YAML, for example:
```yaml
- uses: devTool/install
  with:
    func:
      version: ^4.0.5530
      symlinkDir: ./devTools/func
  writeToEnvironmentFile:
    funcPath: FUNC_PATH
```

**Manual installation steps:**

1. **Check your required version range** in `m365agents.local.yml` under `devTool/install → func → version`.

2. **Install via npm:**
   ```bash
   npm install azure-functions-core-tools@<version> --prefix ~/.fx/bin/azfunc/<version> --no-audit
   ```
   Replace `<version>` with a version matching your YAML range (e.g., `4.0.5530`).

3. **Create the sentinel file** (marks the installation as valid):
   ```bash
   touch ~/.fx/bin/azfunc/<version>/node_modules/azure-functions-core-tools/bin/func-sentinel
   ```

4. **Create the project symlink:**
   ```bash
   # From your project root
   ln -s ~/.fx/bin/azfunc/<version>/node_modules/azure-functions-core-tools/bin devTools/func
   ```

5. **Verify the installation:**
   ```bash
   ./devTools/func/func --version
   ```

If npm is not available, install it first (`npm` ships with Node.js). On Linux, the npm-based portable installation is not supported — install Azure Functions Core Tools via the system package manager instead (see [Azure docs](https://learn.microsoft.com/azure/azure-functions/functions-run-local)).

### ARM deployment failed

**Error code:** `armDeploy.DeployArmError`

ARM deployment errors usually come from invalid Bicep templates or Azure resource configuration issues.

1. **Check the deployment log** — the error message includes the log file path (typically under `.fx/` or the output pane). Open it and look for the first error entry.

2. **Common causes and fixes:**
   - **Invalid parameter or resource property**: open the Bicep files under `infra/` (e.g., `azure.bicep`, `azure.parameters.json`) and fix the flagged property.
   - **Resource name conflict**: Azure resource names must be globally unique. Change the name in your Bicep parameters.
   - **Quota or region limitation**: check if the target region supports the requested SKU or resource type.
   - **Missing role assignment**: ensure the deploying identity has Contributor (or required) role on the target resource group.

3. **Validate Bicep locally before re-deploying:**
   ```bash
   az bicep build --file infra/azure.bicep
   az deployment group validate --resource-group <rg-name> --template-file infra/azure.bicep --parameters infra/azure.parameters.json
   ```

4. **Re-deploy after fixing:**
   ```bash
   atk provision --env <env>
   ```

### Dev tunnel operation failed

**Error code:** `Ext.DevTunnelOperationError`

This error occurs when a dev tunnel operation (create, delete, host, list) fails. Common causes:

1. **Not logged in to dev tunnels:**
   ```bash
   devtunnel user login
   ```

2. **Tunnel limit reached** — free accounts have a limit on active tunnels. List and delete unused ones:
   ```bash
   devtunnel list
   devtunnel delete <tunnel-id>
   ```

3. **Port already hosted by another tunnel session:**
   ```bash
   # Check if another devtunnel process is running
   # Windows
   tasklist | findstr devtunnel
   # macOS / Linux
   ps aux | grep devtunnel

   # Kill stale sessions
   # Windows
   taskkill /IM devtunnel.exe /F
   # macOS / Linux
   killall devtunnel
   ```

4. **Network or proxy issues** — dev tunnels require outbound HTTPS. If behind a corporate proxy, configure it:
   ```bash
   set HTTPS_PROXY=http://proxy:port   # Windows
   export HTTPS_PROXY=http://proxy:port # macOS / Linux
   ```

5. **Stale tunnel state** — if the tunnel was deleted externally or is in a bad state, create a fresh one:
   ```bash
   devtunnel create --allow-anonymous
   devtunnel port create -p 3978
   devtunnel host
   ```
   Update `BOT_ENDPOINT` in `env/.env.local` with the new tunnel URL, then re-provision:
   ```bash
   atk provision --env local -i false
   atk deploy --env local -i false
   ```

See also [Blacklisted Devtunnel URL](#blacklisted-devtunnel-url) if you continue to get 401 errors after fixing tunnel issues.

## Diagnostics Commands

```bash
atk doctor              # Check ATK installation and dependencies
atk validate --env <env> # Validate project configuration
atk auth list           # Check logged-in accounts
agentsplayground --help # Playground CLI help
atk provision --help    # Provision help
atk deploy --help       # Deploy help
```

## Expert Deep Dives

> **Applicability per row**: lifecycle / environments rows apply to **all ATK projects**. The dev-debug, OAuth/SSO, and manifest rows apply only to **code-based Teams bots/agents**. Declarative-agent and API-plugin troubleshooting (Copilot recognition, instructions tuning, action invocation) is not covered by these experts — use the [Microsoft 365 Copilot extensibility docs](https://learn.microsoft.com/microsoft-365-copilot/extensibility/) and the in-product Copilot developer mode logs.

| Symptom area | Expert |
|---|---|
| YAML actions, `aadApp/create` options, `m365agents.yml` field reference (all projects) | [../toolkit/lifecycle-cli.md](../toolkit/lifecycle-cli.md) |
| `.localConfigs` vs `env/.env.local`, `TENANT_ID` mapping, `SECRET_` files (all projects) | [../toolkit/environments.md](../toolkit/environments.md) |
| DevTools plugin, sideloading URL, `skipAuth`, devtunnel debugging (Teams bots only) | [../experts/teams/dev.debug-test-ts.md](../experts/teams/dev.debug-test-ts.md) |
| 401 / `Bearer null` / single-tenant audience issues, JWT validation (Teams bots only) | [../experts/teams/auth.oauth-sso-ts.md](../experts/teams/auth.oauth-sso-ts.md) |
| Manifest validation errors, scope/permission rejections (Teams bots / tabs / message extensions) | [../experts/teams/runtime.manifest-ts.md](../experts/teams/runtime.manifest-ts.md) |
