# Provision and Deploy

Provision Azure and M365 resources, then deploy your agent to the cloud.

## Local Provisioning (for Teams testing)

```bash
atk provision --env local -i false
atk deploy --env local -i false
```

This runs actions in `m365agents.local.yml` — registers Teams app, creates bot AAD app, and writes runtime config to `.localConfigs`.

### Post-Provisioning Verification (Required)

ATK's `aadApp/create` may not write `TENANT_ID` to `.localConfigs`. After provisioning, always verify:

```bash
# 1. Check TENANT_ID is in .localConfigs
grep TENANT_ID .localConfigs

# 2. If missing, copy it from the env file (aadApp/create writes it there)
grep TENANT_ID env/.env.local
# Then add: TENANT_ID=<tenant-id> to .localConfigs
```

> **Why this matters:** Without `TENANT_ID` in `.localConfigs`, the SDK acquires tokens from the wrong authority (`botframework.com` instead of your tenant), causing 401 from Bot Connector. The tenant ID is available in `env/.env.local` after provisioning — copy it to `.localConfigs` if missing. See [troubleshoot.md](../troubleshoot/troubleshoot.md) for details.

> **If you hit `AADSTS7000229` / `invalid_client`:** Your `aadApp/create` action is missing `generateServicePrincipal: true`. Add it to the YAML and re-provision:
> ```yaml
> - uses: aadApp/create
>   with:
>     generateServicePrincipal: true  # ← add this
> ```
> Then run `atk provision --env local -i false` again. If you still get 401 after fixing this, your devtunnel URL may be blacklisted — create a fresh tunnel and update `BOT_ENDPOINT`.

## Cloud Deployment Workflow

### Prerequisites

1. Azure subscription — set `AZURE_SUBSCRIPTION_ID` in `env/.env.dev`
2. Azure login — `atk auth login azure`
3. Resource group — `az group create --name <rg> --location <region>` (if needed)
4. Verify accounts match: `az account show` vs `atk auth list`

### Steps

```bash
# Step 1: Copy required env vars from env/.env.local to env/.env.dev
# Look at m365agents.yml for ${{VAR_NAME}} references

# Step 2: Provision Azure + M365 resources
atk provision --env dev --resource-group <rg> --region <region> -i false

# Step 3: Deploy code to Azure
atk deploy --env dev -i false
```

Both commands can take several minutes — wait for completion (timeout 120000ms+).

## Quick Reference

| Task | Command |
|------|---------|
| Provision local | `atk provision --env local -i false` |
| Deploy local | `atk deploy --env local -i false` |
| Provision cloud | `atk provision --env dev --resource-group <rg> --region <region> -i false` |
| Deploy cloud | `atk deploy --env dev -i false` |
| Login M365 | `atk auth login m365` |
| Login Azure | `atk auth login azure` |
| Check login | `atk auth list` |

## Azure OpenAI Configuration

For custom engine agents using Azure OpenAI, add env vars to the YAML and set their values — see [../toolkit/manifest-and-yaml.md](../toolkit/manifest-and-yaml.md) for details.

## References

- For YAML structure and env var flow → see [../toolkit/manifest-and-yaml.md](../toolkit/manifest-and-yaml.md)
- For package, validate, share, collaborate → see [../toolkit/commands.md](../toolkit/commands.md)
- If something goes wrong → see [../troubleshoot/troubleshoot.md](../troubleshoot/troubleshoot.md)

## Expert Deep Dives

> **Applies to all ATK projects** — the lifecycle/environments/publish experts cover the YAML-driven `atk provision/deploy/publish` flow used by every template (declarative agents, API plugins, Copilot connectors, Teams bots, tabs).
>
> The **azure-bot-deploy** expert applies only to projects that deploy code to Azure (Teams bots, custom engine agents, RAG agents, message extensions). Declarative agents and pure-API-plugin projects don't deploy compute and can ignore it.

| Topic | Expert |
|---|---|
| `m365agents.yml` action catalog, lifecycle stages, full `atk` CLI reference | [../toolkit/lifecycle-cli.md](../toolkit/lifecycle-cli.md) |
| `env/` files, `${{VAR}}` resolution, `SECRET_` prefix, multi-environment isolation | [../toolkit/environments.md](../toolkit/environments.md) |
| Sideload → org catalog → Teams Store publish flow, `atk publish`, version bumping | [../toolkit/publish.md](../toolkit/publish.md) |
| Manual Azure deployment walkthrough (what `atk provision` automates) — Teams bots only | [../experts/deploy/azure-bot-deploy-ts.md](../experts/deploy/azure-bot-deploy-ts.md) |
