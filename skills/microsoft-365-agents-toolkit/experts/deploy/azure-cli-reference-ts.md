# azure-cli-reference-ts

## purpose

Comprehensive reference of all Azure CLI (`az`) command groups a developer needs for creating, reading, updating, and deleting resources in a bot or AI agent project on Azure. Use as a lookup companion to `azure-bot-deploy-ts.md` (step-by-step deployment) — this file maps every relevant CLI surface so you know what commands exist.

## rules

1. **This is a reference, not a tutorial.** For step-by-step deployment walkthroughs, see `azure-bot-deploy-ts.md`. This file catalogs every `az` command group relevant to bot/agent projects.
2. **Always authenticate first.** Every command below assumes you have run `az login` and `az account set --subscription <id>`. [learn.microsoft.com/cli/azure/authenticate-azure-cli](https://learn.microsoft.com/cli/azure/authenticate-azure-cli)
3. **Resource group is required for almost everything.** Most commands take `--resource-group <rg>`. Create one with `az group create` before provisioning any resources.

---

## 1. Bot Service (`az bot`)

The core resource for registering and managing a bot on Azure.

| Command | Purpose |
|---|---|
| `az bot create` | Register a new v4 SDK bot (requires `--app-type`, `--appid`, `--name`, `--resource-group`) |
| `az bot show` | Get bot details |
| `az bot update` | Update bot properties (endpoint, description, display name) |
| `az bot delete` | Delete a bot registration |
| `az bot download` | Download bot source code |
| `az bot publish` | Publish to the bot's associated App Service |
| `az bot prepare-deploy` | Add deployment config files |

Reference: [learn.microsoft.com/cli/azure/bot](https://learn.microsoft.com/cli/azure/bot)

### Bot Channels

Connect a bot to messaging platforms. Each channel group has `create`, `delete`, `show` sub-commands:

| Channel Group | Platform |
|---|---|
| `az bot msteams` | Microsoft Teams |
| `az bot slack` | Slack |
| `az bot directline` | DirectLine (web/custom clients) |
| `az bot webchat` | Web Chat embed |
| `az bot facebook` | Facebook Messenger |
| `az bot telegram` | Telegram |
| `az bot email` | Email |
| `az bot sms` | SMS |
| `az bot kik` | Kik |
| `az bot skype` | Skype |

Reference: [learn.microsoft.com/cli/azure/bot/msteams](https://learn.microsoft.com/cli/azure/bot/msteams)

### Bot Auth (`az bot authsetting`)

Manage OAuth connection settings on a bot:

| Command | Purpose |
|---|---|
| `az bot authsetting create` | Create an OAuth connection |
| `az bot authsetting show` | View a connection |
| `az bot authsetting list` | List all connections |
| `az bot authsetting delete` | Delete a connection |
| `az bot authsetting list-providers` | List available OAuth providers |

Reference: [learn.microsoft.com/cli/azure/bot/authsetting](https://learn.microsoft.com/cli/azure/bot/authsetting)

---

## 2. AI Foundry Agents (`az cognitiveservices agent`)

For hosted AI agents via Azure AI Foundry:

| Command | Purpose |
|---|---|
| `az cognitiveservices agent create` | Create hosted agent from container image or source |
| `az cognitiveservices agent show` | Get agent details |
| `az cognitiveservices agent update` | Update agent deployment |
| `az cognitiveservices agent delete` | Delete agent version(s) |
| `az cognitiveservices agent list` | List agents |
| `az cognitiveservices agent list-versions` | List all versions of an agent |
| `az cognitiveservices agent start` | Start agent deployment |
| `az cognitiveservices agent stop` | Stop agent deployment |
| `az cognitiveservices agent status` | Check deployment status |
| `az cognitiveservices agent delete-deployment` | Delete a deployment |
| `az cognitiveservices agent logs` | View container logs |

Reference: [learn.microsoft.com/cli/azure/cognitiveservices/agent](https://learn.microsoft.com/cli/azure/cognitiveservices/agent)

---

## 3. Azure OpenAI / Cognitive Services (`az cognitiveservices account`)

Manage the AI backend your bot/agent calls:

| Command | Purpose |
|---|---|
| `az cognitiveservices account create` | Create an Azure OpenAI / Cognitive Services account |
| `az cognitiveservices account show` | View account details |
| `az cognitiveservices account update` | Update account settings |
| `az cognitiveservices account delete` | Delete account |
| `az cognitiveservices account list` | List all accounts in subscription |
| `az cognitiveservices account keys list` | Get API keys |
| `az cognitiveservices account keys regenerate` | Rotate keys |
| `az cognitiveservices account deployment create` | Deploy a model (e.g., GPT-4o) |
| `az cognitiveservices account deployment show` | View deployment |
| `az cognitiveservices account deployment list` | List deployments |
| `az cognitiveservices account deployment delete` | Remove deployment |
| `az cognitiveservices model list` | List available models |

Reference: [learn.microsoft.com/cli/azure/cognitiveservices/account](https://learn.microsoft.com/cli/azure/cognitiveservices/account)

---

## 4. App Registration / Identity (`az ad app`, `az ad sp`, `az identity`)

Every bot needs an app registration for authentication.

### App Registration (`az ad app`)

| Command | Purpose |
|---|---|
| `az ad app create` | Create Entra ID app registration (gets the appId for bot) |
| `az ad app show` | View app details |
| `az ad app update` | Update app properties |
| `az ad app delete` | Delete app registration |
| `az ad app list` | List apps |
| `az ad app credential reset` | Reset password/certificate |
| `az ad app credential list` | List credentials |
| `az ad app credential delete` | Remove a credential |
| `az ad app permission` | Manage OAuth2 API permissions |

Reference: [learn.microsoft.com/cli/azure/ad/app](https://learn.microsoft.com/cli/azure/ad/app)

### Managed Identity (`az identity`)

| Command | Purpose |
|---|---|
| `az identity create` | Create a user-assigned managed identity |
| `az identity show` | View identity details |
| `az identity list` | List identities |
| `az identity delete` | Delete identity |

Reference: [learn.microsoft.com/cli/azure/identity](https://learn.microsoft.com/cli/azure/identity)

### Role Assignments (`az role assignment`)

| Command | Purpose |
|---|---|
| `az role assignment create` | Grant a role (e.g., "Cognitive Services OpenAI User") |
| `az role assignment list` | List current assignments |
| `az role assignment delete` | Revoke a role |

Reference: [learn.microsoft.com/cli/azure/role/assignment](https://learn.microsoft.com/cli/azure/role/assignment)

---

## 5. Hosting / Compute

### Web App (`az webapp`)

Traditional bot hosting on App Service:

| Command | Purpose |
|---|---|
| `az webapp create` | Create App Service for bot |
| `az webapp show` / `list` / `delete` / `update` | Standard CRUD |
| `az webapp start` / `stop` / `restart` | Lifecycle management |
| `az webapp deploy` | Deploy artifact (zip, war, jar) |
| `az webapp up` | Create + deploy from local workspace |
| `az webapp deployment source` | Configure source control deployment |
| `az webapp deployment github-actions` | Configure CI/CD via GitHub Actions |
| `az webapp deployment slot` | Manage staging slots |
| `az webapp config` | App settings, connection strings, runtime |
| `az webapp identity` | Assign managed identity to web app |
| `az webapp log` | View/configure logs |

Reference: [learn.microsoft.com/cli/azure/webapp](https://learn.microsoft.com/cli/azure/webapp)

### App Service Plan (`az appservice plan`)

| Command | Purpose |
|---|---|
| `az appservice plan create` | Create hosting plan (defines SKU/pricing tier) |
| `az appservice plan show` / `list` / `update` / `delete` | Standard CRUD |

Reference: [learn.microsoft.com/cli/azure/appservice/plan](https://learn.microsoft.com/cli/azure/appservice/plan)

### Function App (`az functionapp`)

Serverless bot hosting:

| Command | Purpose |
|---|---|
| `az functionapp create` | Create a function app |
| `az functionapp show` / `list` / `delete` / `update` | Standard CRUD |
| `az functionapp start` / `stop` / `restart` | Lifecycle |
| `az functionapp deploy` | Deploy artifact |
| `az functionapp config` | App settings, runtime config |
| `az functionapp identity` | Managed identity |
| `az functionapp keys` | Manage function keys |
| `az functionapp log` | View logs |

Reference: [learn.microsoft.com/cli/azure/functionapp](https://learn.microsoft.com/cli/azure/functionapp)

### Container App (`az containerapp`)

Containerized bot hosting:

| Command | Purpose |
|---|---|
| `az containerapp create` | Create container app |
| `az containerapp show` / `list` / `delete` / `update` | Standard CRUD |
| `az containerapp up` | Create + deploy (handles ACR, env, etc.) |
| `az containerapp env` | Manage Container Apps environments |
| `az containerapp secret` | Manage secrets |
| `az containerapp identity` | Managed identity |
| `az containerapp ingress` | Configure ingress / traffic |
| `az containerapp revision` | Manage revisions |
| `az containerapp logs` | View logs |
| `az containerapp job` | Manage background jobs |

Reference: [learn.microsoft.com/cli/azure/containerapp](https://learn.microsoft.com/cli/azure/containerapp)

---

## 6. Infrastructure & Resource Management

### Resource Groups (`az group`)

| Command | Purpose |
|---|---|
| `az group create` | Create resource group (logical container for all bot resources) |
| `az group show` / `list` / `delete` / `update` | Standard CRUD |
| `az group exists` | Check existence |
| `az group export` | Export as ARM template |

Reference: [learn.microsoft.com/cli/azure/group](https://learn.microsoft.com/cli/azure/group)

### Subscriptions (`az account`)

| Command | Purpose |
|---|---|
| `az account list` | List subscriptions |
| `az account set` | Switch active subscription |
| `az account show` | Show current subscription |

Reference: [learn.microsoft.com/cli/azure/account](https://learn.microsoft.com/cli/azure/account)

---

## 7. Secrets & Configuration (`az keyvault`)

| Command | Purpose |
|---|---|
| `az keyvault create` / `show` / `list` / `delete` | Vault CRUD |
| `az keyvault secret set` | Store a secret (API keys, connection strings) |
| `az keyvault secret show` | Retrieve a secret |
| `az keyvault secret list` | List secrets |
| `az keyvault secret delete` | Delete a secret |
| `az keyvault set-policy` | Grant access to the bot's identity |

Reference: [learn.microsoft.com/cli/azure/keyvault](https://learn.microsoft.com/cli/azure/keyvault)

---

## 8. Storage & State

### Storage Account (`az storage account`)

For bot state and blob storage:

| Command | Purpose |
|---|---|
| `az storage account create` | Create storage account |
| `az storage account show` / `list` / `delete` / `update` | Standard CRUD |
| `az storage account show-connection-string` | Get connection string |
| `az storage account keys list` | Get access keys |

Reference: [learn.microsoft.com/cli/azure/storage/account](https://learn.microsoft.com/cli/azure/storage/account)

### Cosmos DB (`az cosmosdb`)

For bot conversation state:

| Command | Purpose |
|---|---|
| `az cosmosdb create` | Create Cosmos DB account |
| `az cosmosdb show` / `list` / `delete` / `update` | Standard CRUD |
| `az cosmosdb keys list` | Get access keys |
| `az cosmosdb sql database create` | Create a SQL API database |
| `az cosmosdb sql container create` | Create a container |

Reference: [learn.microsoft.com/cli/azure/cosmosdb](https://learn.microsoft.com/cli/azure/cosmosdb)

---

## 9. Monitoring & Diagnostics (`az monitor`)

| Command | Purpose |
|---|---|
| `az monitor log-analytics workspace create` | Create Log Analytics workspace |
| `az monitor diagnostic-settings create` | Enable diagnostics on bot resources |
| `az monitor metrics list` | View resource metrics |
| `az monitor activity-log list` | View activity logs |
| `az monitor action-group create` | Set up alert notifications |

Reference: [learn.microsoft.com/cli/azure/monitor](https://learn.microsoft.com/cli/azure/monitor)

---

## patterns

### Minimum viable bot/agent CRUD flow

The numbered steps below show the typical order for provisioning a complete bot project from scratch using only `az` commands:

```bash
# 1. Resource group
az group create --name rg-mybot --location eastus

# 2. App registration + secret
APP_ID=$(az ad app create --display-name "MyBot" --query appId -o tsv)
APP_SECRET=$(az ad app credential reset --id $APP_ID --query password -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

# 3. Hosting plan
az appservice plan create --resource-group rg-mybot --name mybot-plan --sku B1 --is-linux

# 4. Web app (or functionapp / containerapp)
az webapp create --resource-group rg-mybot --plan mybot-plan --name mybot-app --runtime "NODE:20-lts"

# 5. Bot registration
az bot create --resource-group rg-mybot --name mybot-bot \
  --app-type SingleTenant --appid $APP_ID --tenant-id $TENANT_ID

# 6. Connect channels
az bot msteams create --resource-group rg-mybot --name mybot-bot
# az bot slack create --resource-group rg-mybot --name mybot-bot ...

# 7. AI backend (Azure OpenAI)
az cognitiveservices account create --resource-group rg-mybot --name mybot-openai \
  --kind OpenAI --sku S0 --location eastus
az cognitiveservices account deployment create --resource-group rg-mybot \
  --name mybot-openai --deployment-name gpt-4o \
  --model-name gpt-4o --model-version "2024-08-06" --model-format OpenAI \
  --sku-name Standard --sku-capacity 10

# 8. Secrets management
az keyvault create --resource-group rg-mybot --name mybot-kv --location eastus
az keyvault secret set --vault-name mybot-kv --name "AppSecret" --value "$APP_SECRET"

# 9. Wire up permissions (managed identity → OpenAI)
az webapp identity assign --resource-group rg-mybot --name mybot-app
PRINCIPAL_ID=$(az webapp identity show --resource-group rg-mybot --name mybot-app --query principalId -o tsv)
OPENAI_ID=$(az cognitiveservices account show --resource-group rg-mybot --name mybot-openai --query id -o tsv)
az role assignment create --assignee $PRINCIPAL_ID \
  --role "Cognitive Services OpenAI User" --scope $OPENAI_ID

# 10. Observability
az monitor diagnostic-settings create --resource rg-mybot/mybot-app \
  --name mybot-diag --logs '[{"enabled":true,"category":"AppServiceHTTPLogs"}]' \
  --workspace <log-analytics-workspace-id>
```

### Teardown (delete everything)

```bash
# Delete the entire resource group and all resources within it
az group delete --name rg-mybot --yes --no-wait

# Delete the app registration separately (it lives in Entra ID, not the resource group)
az ad app delete --id $APP_ID
```

### List all resources in a bot project

```bash
# See everything in the resource group
az resource list --resource-group rg-mybot --output table

# Check bot channel connections
az bot show --resource-group rg-mybot --name mybot-bot --query "properties.enabledChannels"

# Check OpenAI deployments
az cognitiveservices account deployment list --resource-group rg-mybot --name mybot-openai --output table
```

## pitfalls

- **App Registration lives outside the resource group.** Deleting the resource group does not delete the Entra ID app registration. Always clean up with `az ad app delete --id <appId>` separately.
- **Key Vault soft-delete.** Deleted vaults are retained for 90 days by default. Recreating a vault with the same name fails until you purge it: `az keyvault purge --name <vault-name>`.
- **Cognitive Services region availability.** Not all Azure OpenAI models are available in all regions. Check `az cognitiveservices model list --location <region>` before creating the account.
- **Role assignment propagation delay.** After `az role assignment create`, it can take up to 5 minutes for the assignment to propagate. If your bot gets 403 errors immediately after setup, wait and retry.
- **Managed identity vs app secret.** Prefer managed identity (`az webapp identity assign`) over storing `MicrosoftAppPassword` in app settings. Managed identities rotate automatically and never expire.
- **Container Apps require an environment.** You must create a Container Apps environment (`az containerapp env create`) before creating a container app. The environment defines the Log Analytics workspace and networking.

## instructions

This expert is a reference catalog of all Azure CLI commands relevant to bot and agent development. Use it when a developer asks "what az commands do I need for X?" or needs to look up the CLI surface for a specific Azure service. For step-by-step deployment instructions, defer to `azure-bot-deploy-ts.md`.

Pair with: `azure-bot-deploy-ts.md` (step-by-step deployment), `../security/secrets-ts.md` (secrets best practices), `../bridge/infra-compute-ts.md` (compute comparisons).

## research

Deep Research prompt:

"Catalog all Azure CLI (`az`) command groups a developer would need for creating, reading, updating, and deleting resources in a bot/agent project on Azure. Include: bot service (az bot), bot channels, bot auth settings, AI Foundry agents (az cognitiveservices agent), Azure OpenAI (az cognitiveservices account), app registration (az ad app), managed identity (az identity), role assignments, hosting (webapp, functionapp, containerapp), resource groups, subscriptions, Key Vault, storage accounts, Cosmos DB, and monitoring. For each group, list the key CRUD commands and their purpose."
