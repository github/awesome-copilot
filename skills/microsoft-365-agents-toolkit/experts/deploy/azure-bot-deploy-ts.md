# azure-bot-deploy-ts

## purpose

Step-by-step deployment of a Slack bot, Teams bot, or dual bot to Azure. Covers CLI setup, App Registration, Bot Service registration, compute provisioning (App Service / Functions / Container Apps), environment configuration, and verification.

## rules

1. **Install prerequisites before anything else.** You need: Node.js 20 LTS, Azure CLI (`az`), and optionally the Agents Toolkit CLI (`npm install -g @microsoft/m365agentstoolkit-cli`). Verify with `az --version` and `node --version`. [learn.microsoft.com/cli/azure/install-azure-cli](https://learn.microsoft.com/cli/azure/install-azure-cli)
2. **Authenticate and set the target subscription.** Run `az login` to open browser auth, then `az account set --subscription <subscription-id>`. All subsequent commands use this subscription. [learn.microsoft.com/cli/azure/authenticate-azure-cli](https://learn.microsoft.com/cli/azure/authenticate-azure-cli)
3. **Create a resource group to contain all bot resources.** `az group create --name <rg-name> --location <region>`. Use a region close to your users (e.g., `eastus`, `westeurope`). All subsequent resources go in this group. [learn.microsoft.com/azure/azure-resource-manager/management/manage-resource-groups-cli](https://learn.microsoft.com/azure/azure-resource-manager/management/manage-resource-groups-cli)
4. **Register an Entra ID App Registration.** This is the bot's identity — required for both Teams and Slack bots on Azure. `az ad app create --display-name <bot-name>` returns an `appId` (client ID). Then create a secret: `az ad app credential reset --id <appId>`. Save the `password` — it's the CLIENT_SECRET and is only shown once. [learn.microsoft.com/entra/identity-platform/quickstart-register-app](https://learn.microsoft.com/entra/identity-platform/quickstart-register-app)
5. **Create an Azure Bot Service resource (Teams bots).** `az bot create --resource-group <rg> --name <bot-name> --app-type SingleTenant --appid <appId> --tenant-id <tenantId>`. Set the messaging endpoint to `https://<app-name>.azurewebsites.net/api/messages`. [learn.microsoft.com/azure/bot-service/bot-service-quickstart-registration](https://learn.microsoft.com/azure/bot-service/bot-service-quickstart-registration)
6. **Connect the Bot Service to Teams.** `az bot msteams create --resource-group <rg> --name <bot-name>`. Without this, Teams cannot reach your bot even if it's deployed and running. [learn.microsoft.com/azure/bot-service/channel-connect-teams](https://learn.microsoft.com/azure/bot-service/channel-connect-teams)
7. **For Slack bots on Azure, skip Bot Service.** Deploy as a plain web app with the Bolt HTTP receiver. Configure the Slack app's Event Subscriptions Request URL and Interactivity URL to `https://<app-name>.azurewebsites.net/slack/events`.
8. **Choose your compute target.** App Service (recommended — always-on, simple), Azure Functions Premium (serverless with warm instances), or Container Apps (containerized workloads with scale-to-zero). Avoid Functions Consumption plan for bots — cold starts exceed Slack's 3-second ack deadline and Teams' response expectations. [learn.microsoft.com/azure/app-service/overview](https://learn.microsoft.com/azure/app-service/overview)
9. **Provision the compute resource with Node.js 20 LTS.** For App Service: `az webapp create --resource-group <rg> --plan <plan-name> --name <app-name> --runtime "NODE:20-lts"`. For Functions: `az functionapp create ... --runtime node --runtime-version 20`. [learn.microsoft.com/azure/app-service/quickstart-nodejs](https://learn.microsoft.com/azure/app-service/quickstart-nodejs)
10. **Configure App Settings with all required environment variables.** `az webapp config appsettings set --resource-group <rg> --name <app-name> --settings MicrosoftAppId=<appId> MicrosoftAppPassword=<secret> MicrosoftAppTenantId=<tenantId> PORT=3978`. For Slack, add `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `SLACK_APP_TOKEN`. [learn.microsoft.com/azure/app-service/configure-common](https://learn.microsoft.com/azure/app-service/configure-common)
11. **Build and deploy.** Run `npm run build` locally, then zip deploy: `az webapp deploy --resource-group <rg> --name <app-name> --src-path <zip-path> --type zip`. For Functions: `func azure functionapp publish <app-name>`. [learn.microsoft.com/azure/app-service/deploy-zip](https://learn.microsoft.com/azure/app-service/deploy-zip)
12. **Enable Always On for App Service.** `az webapp config set --resource-group <rg> --name <app-name> --always-on true`. Without this, the app goes idle after 20 minutes and the next request cold-starts. For Functions Premium, configure Always Ready instances instead. [learn.microsoft.com/azure/app-service/configure-common](https://learn.microsoft.com/azure/app-service/configure-common)
13. **Verify the deployment.** Check the health endpoint: `curl https://<app-name>.azurewebsites.net/api/health`. Then send a test message in Teams or Slack. Check App Service logs: `az webapp log tail --resource-group <rg> --name <app-name>`. [learn.microsoft.com/azure/app-service/troubleshoot-diagnostic-logs](https://learn.microsoft.com/azure/app-service/troubleshoot-diagnostic-logs)
14. **Agents Toolkit fast path (Teams bots).** Instead of steps 3-12, run `atk provision` (creates App Registration, Bot Service, App Service, and all config) then `atk deploy` (builds and deploys). Two commands replace the entire manual process. Requires an `m365agents.yml` in your project. [learn.microsoft.com/microsoftteams/platform/toolkit/toolkit-cli](https://learn.microsoft.com/microsoftteams/platform/toolkit/microsoft-365-agents-toolkit-cli)

## interview

### Q1 — Compute Target
```
question: "Which Azure compute target do you want to deploy to?"
header: "Compute"
options:
  - label: "App Service (Recommended)"
    description: "Always-on web app. Simplest deployment, good for most bots. ~$13/month for B1 plan."
  - label: "Azure Functions Premium"
    description: "Serverless with warm instances. Auto-scales, pay-per-execution + base cost. Good for variable traffic."
  - label: "Container Apps"
    description: "Containerized deployment with Dapr support. Scale-to-zero. Good for microservice architectures."
  - label: "You Decide Everything"
    description: "Use App Service (recommended default) and skip remaining questions."
multiSelect: false
```

### Q2 — Deployment Method
```
question: "How do you want to deploy?"
header: "Method"
options:
  - label: "Agents Toolkit CLI (Recommended)"
    description: "atk provision + atk deploy — automates App Registration, Bot Service, App Service, and manifest sideloading in two commands."
  - label: "Manual az CLI"
    description: "Full control, step-by-step. Learn exactly what resources are created and how they connect."
  - label: "You Decide Everything"
    description: "Use Agents Toolkit CLI (recommended default) and skip remaining questions."
multiSelect: false
```

### defaults table

| Question | Default |
|---|---|
| Q1 | App Service |
| Q2 | Agents Toolkit CLI |

## patterns

### End-to-end manual Azure deployment (Teams bot)

```bash
# 1. Prerequisites
az --version          # Verify Azure CLI installed
node --version        # Verify Node.js 20+

# 2. Authenticate
az login
az account set --subscription "My Subscription"

# 3. Create resource group
az group create --name rg-mybot --location eastus

# 4. App Registration (bot identity)
APP_ID=$(az ad app create --display-name "MyBot" --query appId -o tsv)
APP_SECRET=$(az ad app credential reset --id $APP_ID --query password -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "Save these values:"
echo "  APP_ID=$APP_ID"
echo "  APP_SECRET=$APP_SECRET"
echo "  TENANT_ID=$TENANT_ID"

# 5. Create Azure Bot Service
az bot create \
  --resource-group rg-mybot \
  --name mybot-bot \
  --app-type SingleTenant \
  --appid $APP_ID \
  --tenant-id $TENANT_ID

# 6. Connect Teams channel
az bot msteams create --resource-group rg-mybot --name mybot-bot

# 7. Create App Service plan + web app
az appservice plan create \
  --resource-group rg-mybot \
  --name mybot-plan \
  --sku B1 \
  --is-linux

az webapp create \
  --resource-group rg-mybot \
  --plan mybot-plan \
  --name mybot-app \
  --runtime "NODE:20-lts"

# 8. Configure environment variables
az webapp config appsettings set \
  --resource-group rg-mybot \
  --name mybot-app \
  --settings \
    MicrosoftAppId=$APP_ID \
    MicrosoftAppPassword=$APP_SECRET \
    MicrosoftAppTenantId=$TENANT_ID \
    PORT=3978

# 9. Enable Always On
az webapp config set --resource-group rg-mybot --name mybot-app --always-on true

# 10. Update Bot Service messaging endpoint
az bot update \
  --resource-group rg-mybot \
  --name mybot-bot \
  --endpoint "https://mybot-app.azurewebsites.net/api/messages"

# 11. Build and deploy
npm run build
cd dist && zip -r ../deploy.zip . && cd ..
az webapp deploy --resource-group rg-mybot --name mybot-app --src-path deploy.zip --type zip

# 12. Verify
curl https://mybot-app.azurewebsites.net/api/health
az webapp log tail --resource-group rg-mybot --name mybot-app
```

### Agents Toolkit fast path (Teams bot)

```bash
# 1. Install Agents Toolkit CLI
npm install -g @microsoft/m365agentstoolkit-cli@beta

# 2. Provision all Azure resources (App Registration, Bot Service, App Service)
atk provision --env dev --resource-group <rg> --region <region> -i false

# 3. Build and deploy
atk deploy --env dev -i false

# 4. Sideload to Teams for testing
# Get TEAMS_APP_ID from env/.env.dev, open:
# https://teams.microsoft.com/l/app/$TEAMS_APP_ID?installAppPackage=true&webjoin=true

# That's it — two commands from zero to running bot in Teams.
# m365agents.yml in your project defines the resource topology.
```

### Slack bot on Azure App Service

```bash
# 1. Create resource group + App Service (no Bot Service needed)
az group create --name rg-slackbot --location eastus

az appservice plan create \
  --resource-group rg-slackbot \
  --name slackbot-plan \
  --sku B1 \
  --is-linux

az webapp create \
  --resource-group rg-slackbot \
  --plan slackbot-plan \
  --name slackbot-app \
  --runtime "NODE:20-lts"

# 2. Configure Slack credentials
az webapp config appsettings set \
  --resource-group rg-slackbot \
  --name slackbot-app \
  --settings \
    SLACK_BOT_TOKEN=xoxb-your-token \
    SLACK_SIGNING_SECRET=your-signing-secret \
    SLACK_APP_TOKEN=xapp-your-app-token \
    PORT=3000

# 3. Enable Always On + deploy
az webapp config set --resource-group rg-slackbot --name slackbot-app --always-on true
npm run build && cd dist && zip -r ../deploy.zip . && cd ..
az webapp deploy --resource-group rg-slackbot --name slackbot-app --src-path deploy.zip --type zip

# 4. Configure Slack app URLs at api.slack.com:
#    Event Subscriptions Request URL: https://slackbot-app.azurewebsites.net/slack/events
#    Interactivity Request URL:       https://slackbot-app.azurewebsites.net/slack/events
#    Slash Command Request URL:       https://slackbot-app.azurewebsites.net/slack/events
```

### Dual bot on Azure (Slack + Teams on shared Express)

```bash
# Follow the Teams bot manual deployment (pattern 1), then add Slack config:
az webapp config appsettings set \
  --resource-group rg-mybot \
  --name mybot-app \
  --settings \
    SLACK_BOT_TOKEN=xoxb-your-token \
    SLACK_SIGNING_SECRET=your-signing-secret \
    SLACK_APP_TOKEN=xapp-your-app-token

# The shared Express server mounts:
#   Teams: POST /api/messages
#   Slack: POST /slack/events
# Both work on the same App Service instance.

# Configure Slack app URLs at api.slack.com:
#   Event Subscriptions: https://mybot-app.azurewebsites.net/slack/events
#   Interactivity:       https://mybot-app.azurewebsites.net/slack/events
```

## pitfalls

- **Forgetting to set the Bot Service messaging endpoint.** After creating the App Service, you must update the Bot Service with `az bot update --endpoint`. Without this, Teams messages never reach your code. The endpoint format is `https://<app-name>.azurewebsites.net/api/messages`.
- **Using Consumption plan for bots.** Azure Functions Consumption plan has cold starts of 5-15 seconds. This exceeds Slack's 3-second ack deadline and causes Teams timeout errors. Use App Service (Always On) or Functions Premium (Always Ready) instead.
- **CLIENT_SECRET expiration.** Entra ID app secrets expire by default after 6 months. Set a calendar reminder. Rotate by creating a new secret (`az ad app credential reset`) and updating the App Setting before the old one expires.
- **Port mismatch.** App Service injects the `PORT` environment variable (usually 8080). Your bot code must listen on `process.env.PORT`. If you hardcode port 3978, the app starts but App Service can't route traffic to it.
- **Deploying without building.** `az webapp deploy --type zip` deploys whatever is in the zip. If you skip `npm run build`, you're deploying source TypeScript, not compiled JavaScript. The app crashes with syntax errors.
- **Forgetting Always On.** Without `--always-on true`, App Service idles after 20 minutes. The first request after idle takes 10-30 seconds to cold-start, causing timeout errors in both Slack and Teams.
- **Missing Teams channel on Bot Service.** Running `az bot create` creates the Bot Service but doesn't connect it to Teams. You must also run `az bot msteams create`. Without it, Teams shows "This app is not responding."
- **Slack Request URL verification failure.** When you enter the Request URL in the Slack app dashboard, Slack immediately sends a verification challenge. Your app must already be deployed and running. Configure the URL after deployment, not before.

## references

- https://learn.microsoft.com/cli/azure/install-azure-cli
- https://learn.microsoft.com/entra/identity-platform/quickstart-register-app
- https://learn.microsoft.com/azure/bot-service/bot-service-quickstart-registration
- https://learn.microsoft.com/azure/bot-service/channel-connect-teams
- https://learn.microsoft.com/azure/app-service/quickstart-nodejs
- https://learn.microsoft.com/azure/app-service/deploy-zip
- https://learn.microsoft.com/azure/app-service/configure-common
- https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/microsoft-365-agents-toolkit-cli
- https://learn.microsoft.com/azure/app-service/troubleshoot-diagnostic-logs

## instructions

This expert walks through deploying a bot to Azure from scratch — from installing the CLI to verifying a test message. Use it when a developer says "deploy my bot to Azure", "set up Azure hosting", or "get my bot running in production on Azure". Covers Teams bots (with Bot Service + App Registration), Slack bots (plain App Service), and dual bots (shared Express).

Pair with: `../teams/project.scaffold-files-ts.md` (project structure before deployment), `../teams/runtime.manifest-ts.md` (Teams manifest for sideloading after deployment), `../security/secrets-ts.md` (secrets best practices), `../bridge/infra-compute-ts.md` (if comparing Azure compute options with AWS equivalents).

## research

Deep Research prompt:

"Write a micro expert on deploying a Slack Bolt.js or Microsoft Teams bot to Azure. Cover: Azure CLI installation, az login, resource group creation, Entra ID App Registration (client ID + secret), Azure Bot Service creation and Teams channel connection, App Service provisioning with Node.js 20 LTS, environment variable configuration via App Settings, zip deployment, Always On configuration, Agents Toolkit CLI (atk provision + atk deploy) as a fast path, Slack-on-Azure configuration (Event Subscriptions URL), dual bot deployment on shared Express, and common deployment verification steps. Provide 3-4 canonical bash script examples and 6-8 common pitfalls."
