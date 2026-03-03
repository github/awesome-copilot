# Azure

[Microsoft Azure](https://azure.microsoft.com) is Microsoft's cloud computing platform. This plugin connects [GitHub Copilot CLI](https://github.com/github/copilot-cli) or Claude Code to your Azure account, letting you manage resources, deploy applications, and monitor services directly from your development environment.

## Setup

### 1. Create an Azure Account

Sign up at [azure.microsoft.com](https://azure.microsoft.com) or use your existing Azure account.

### 2. Install Node.js and NPM

The Azure MCP Server runs as an NPM package. Ensure you have Node.js 18 or later installed:

- Download from [nodejs.org](https://nodejs.org)
- Or use a version manager like [nvm](https://github.com/nvm-sh/nvm)

### 3. Authenticate to Azure

The Azure MCP Server uses the Azure Identity SDK for authentication. You can authenticate using any of these methods:

#### Option A: Azure CLI (Recommended)
1. Install [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
2. Run `az login` to authenticate
3. The MCP server will automatically use your CLI credentials

#### Option B: Environment Variables
Set Azure service principal credentials:

**Bash/Zsh:**
```bash
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
```

**PowerShell:**
```powershell
$env:AZURE_TENANT_ID = "your-tenant-id"
$env:AZURE_CLIENT_ID = "your-client-id"
$env:AZURE_CLIENT_SECRET = "your-client-secret"
```

#### Option C: Managed Identity
When running on Azure resources (VMs, Container Apps, etc.), the server automatically uses managed identity.

For more authentication options, see the [Azure Identity documentation](https://learn.microsoft.com/azure/developer/azure-mcp-server/).

### 4. Install the Plugins
# Add the repo as a plugin marketplace
/plugin marketplace add microsoft/github-copilot-for-azure

# Pull in the Azure plugin
/plugin install azure@github-copilot-for-azure

## Available Tools

The Azure MCP Server provides tools for 40+ Azure services:

### AI & Machine Learning
- Microsoft Foundry (AI models, deployments, knowledge indexes)
- Azure AI Search (search and vector database)
- Azure AI Services Speech (speech-to-text, text-to-speech)

### Compute & Containers
- Azure App Service, Container Apps, AKS
- Azure Functions, Virtual Desktop

### Storage & Databases
- Azure Storage (Blob, File Sync)
- Azure SQL Database, Cosmos DB
- Azure Database for MySQL & PostgreSQL

### Security & Networking
- Azure Key Vault (secrets, keys, certificates)
- Azure RBAC (access control)
- Azure Confidential Ledger

### DevOps & Management
- Resource Groups, Subscriptions
- Azure Monitor (logging, metrics)
- Azure CLI command generation
- Bicep templates

### Messaging & Communication
- Azure Communication Services (SMS, email)
- Azure Service Bus, Event Grid

For the complete list of 40+ services, see the [official documentation](https://learn.microsoft.com/azure/developer/azure-mcp-server/).

## Example Usage

Ask GitHub Copilot CLI or Claude Code to:
- "List my Azure storage accounts"
- "Show me all containers in my Cosmos DB database"
- "List all secrets in my key vault 'my-vault'"
- "Deploy a web app to Azure App Service"
- "Query my Log Analytics workspace"
- "List my AKS clusters"
- "Send an SMS message to +1234567890 using Azure Communication Services"
- "Generate an Azure CLI command to create a storage account"

For more examples, visit the [Azure MCP documentation](https://learn.microsoft.com/azure/developer/azure-mcp-server/).

## Documentation

For more information, visit:
- [Azure Documentation](https://docs.microsoft.com/azure)
- [Azure CLI Reference](https://docs.microsoft.com/cli/azure/)
- [Azure REST API Reference](https://docs.microsoft.com/rest/api/azure/)

## Troubleshooting

### Authentication Issues
- Run `az login` to authenticate with Azure CLI
- Verify you have appropriate Azure RBAC permissions
- Check that your credentials are not expired
- See the [Authentication guide](https://learn.microsoft.com/azure/developer/azure-mcp-server/)

### Server Issues
- Ensure Node.js 18 or later is installed
- Verify NPM can download packages from npmjs.com
- Check the [Troubleshooting guide](https://github.com/microsoft/mcp/blob/main/servers/Azure.Mcp.Server/TROUBLESHOOTING.md)

### Telemetry
To disable telemetry collection, set:
```bash
export AZURE_MCP_COLLECT_TELEMETRY=false
```
