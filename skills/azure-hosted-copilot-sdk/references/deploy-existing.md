# Deploy Existing Copilot SDK App

Adapt a user's existing Copilot SDK app for Azure by scaffolding the template to a temp directory, then copying infra into the user's project.

> ⚠️ **Warning:** Do NOT run `azd init` inside the user's project — it overwrites existing files. Always scaffold to a temp dir.

## 1. Scaffold Template to Temp Dir

```bash
azd init --template azure-samples/copilot-sdk-service --cwd <temp-dir>
```

This gives you the working infra, scripts, and Dockerfiles without touching the user's project.

## 2. Copy Infra Into User's Project

From the temp scaffold, copy these into the user's project root:

| Source | Purpose |
|--------|---------|
| `infra/` | Bicep modules (AVM-based), main.bicep, resources.bicep |
| `scripts/get-github-token.mjs` | azd hook — gets `GITHUB_TOKEN` via `gh auth token` |
| `azure.yaml` | Deployment manifest (will need editing) |

> ⚠️ Copy `scripts/get-github-token.mjs` exactly — do NOT rewrite it.

## 3. Adapt azure.yaml

Edit the copied `azure.yaml` to point at the user's app:

- Set `services.api.project` to the user's API directory
- Set `services.api.language` to the detected language
- Set `services.api.ports` to the user's port
- Add a `web` service if the app has a frontend
- Keep the `hooks` section unchanged (preprovision + prerun call the token script)

## 4. GitHub Token Flow

The template's token flow (already in the copied files):

1. **`scripts/get-github-token.mjs`** — runs `gh auth token`, verifies `copilot` scope, stores via `azd env set`
2. **`azure.yaml` hooks** — `preprovision` and `prerun` call the token script
3. **Bicep `@secure() param githubToken`** — azd auto-maps the env var
4. **Key Vault** — stores secret; Managed Identity gets `Key Vault Secrets User` role

## 5. Dockerfile

If the user has no Dockerfile, copy the template's Dockerfile for the detected language from the temp dir and adapt entry point, build steps, and port.

## 6. BYOM Infrastructure (Azure Model)

If the user wants Azure BYOM, add to the copied Bicep:

| Resource | Purpose |
|----------|---------|
| Azure OpenAI / AI Services account | Hosts model deployments |
| Role assignment | `Cognitive Services OpenAI User` for Managed Identity |

Add env vars to Container App: `AZURE_OPENAI_ENDPOINT`, `MODEL_PROVIDER=azure`, `MODEL_NAME=<deployment>`, `AZURE_CLIENT_ID=<managed-identity-client-id>`.

> ⚠️ **Warning:** The template's `main.parameters.json` defaults to `gpt-4o` which does NOT support BYOM (encrypted content). Change the default to an o-series or gpt-5 family model.

See [Azure Model Configuration](azure-model-config.md) for provider config and auth pattern.

## 7. Errors

| Error | Fix |
|-------|-----|
| `gh` not installed | User must install GitHub CLI |
| Missing `copilot` scope | Run `gh auth refresh --scopes copilot` |
| Key Vault soft-delete conflict | Use a unique vault name or purge the old one |
| Token not injected | Verify `azure.yaml` hooks and `scripts/get-github-token.mjs` exist |
