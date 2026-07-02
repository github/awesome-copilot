# infra-secrets-config-ts

## purpose

Bridges AWS and Azure secrets/configuration management for cross-platform bot deployments. Covers Secrets Manager/SSM to Key Vault/App Configuration (and the reverse). The common direction is AWS → Azure, but the service mappings apply bidirectionally.

> **Note:** AWS → Azure is the most common direction for this expert. For Azure → AWS, reverse the mappings: Key Vault → Secrets Manager, App Configuration → SSM Parameter Store, managed identity → IAM roles.

## rules

1. Map AWS Secrets Manager to Azure Key Vault for storing sensitive credentials (CLIENT_SECRET, OPENAI_API_KEY, database passwords). Key Vault provides versioning, soft-delete, access policies, and audit logging, similar to Secrets Manager. Use `@azure/keyvault-secrets` for programmatic access. [learn.microsoft.com -- Key Vault overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
2. Map AWS SSM Parameter Store to Azure App Configuration for non-secret configuration values (feature flags, endpoint URLs, tuning parameters). App Configuration supports key-value pairs, labels for environments, and feature management. Use `@azure/app-configuration` for programmatic access. [learn.microsoft.com -- App Configuration overview](https://learn.microsoft.com/en-us/azure/azure-app-configuration/overview)
3. Use managed identity (system-assigned or user-assigned) to access Key Vault from Azure compute, eliminating the need for Key Vault credentials in code. This replaces IAM role-based access patterns used with AWS Secrets Manager. Configure with `@azure/identity` DefaultAzureCredential. [learn.microsoft.com -- Managed identity](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
4. For App Service deployments, use Key Vault references in App Settings instead of direct secret values. The syntax `@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/MySecret/)` resolves secrets at runtime without application code changes. This is the simplest migration path from `.env` files. [learn.microsoft.com -- Key Vault references](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)
5. Migrate all Teams bot environment variables from `.env` files to Azure App Settings for production. Required variables: `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`. Common additions: `OPENAI_API_KEY` or `AZURE_OPENAI_*`, `APPLICATIONINSIGHTS_CONNECTION_STRING`, `PORT`. Keep `.env` for local development only. [learn.microsoft.com -- App Settings](https://learn.microsoft.com/en-us/azure/app-service/configure-common#configure-app-settings)
6. Never commit secrets to source control. Add `.env` to `.gitignore`. Use `.env.example` or `.env.template` with placeholder values to document required variables. This applies equally to AWS and Azure workflows. [OWASP -- Secrets in source code](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
7. Configure secret rotation for `CLIENT_SECRET` using Key Vault rotation policies or Azure AD app credential rotation. AWS Secrets Manager automatic rotation maps to Key Vault auto-rotation with Event Grid notifications. Plan for multi-credential overlap during rotation windows. [learn.microsoft.com -- Key Vault rotation](https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation)
8. Use the Teams SDK `managedIdentityClientId` option for zero-secret bot authentication in production. Set to `"system"` for system-assigned managed identity or the client ID string for user-assigned identity. This eliminates the need for `CLIENT_SECRET` in production entirely. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Apply least-privilege access policies to Key Vault. Grant only "Get" and "List" secret permissions to the bot's managed identity. Do not grant "Set", "Delete", or management permissions to runtime identities. Use separate access policies for deployment pipelines vs. runtime. [learn.microsoft.com -- Key Vault access policy](https://learn.microsoft.com/en-us/azure/key-vault/general/assign-access-policy)
10. For local development, use `DefaultAzureCredential` from `@azure/identity` which chains multiple credential sources: environment variables, managed identity, Azure CLI login, and VS Code credentials. This provides a unified auth pattern that works locally and in production without code changes. [learn.microsoft.com -- DefaultAzureCredential](https://learn.microsoft.com/en-us/azure/developer/javascript/sdk/authentication/credential-chains#use-defaultazurecredential-for-flexibility)

## patterns

### Accessing Key Vault secrets from a Teams bot

```typescript
// src/config.ts
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

interface BotConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  openaiApiKey: string;
}

export async function loadConfig(): Promise<BotConfig> {
  const vaultUrl = process.env.KEY_VAULT_URL;

  // In production: uses managed identity automatically
  // Locally: uses Azure CLI credentials or env vars
  if (vaultUrl) {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(vaultUrl, credential);

    const [clientId, clientSecret, tenantId, openaiKey] = await Promise.all([
      client.getSecret("bot-client-id"),
      client.getSecret("bot-client-secret"),
      client.getSecret("bot-tenant-id"),
      client.getSecret("openai-api-key"),
    ]);

    return {
      clientId: clientId.value!,
      clientSecret: clientSecret.value!,
      tenantId: tenantId.value!,
      openaiApiKey: openaiKey.value!,
    };
  }

  // Fallback to environment variables for local development
  return {
    clientId: process.env.CLIENT_ID ?? "",
    clientSecret: process.env.CLIENT_SECRET ?? "",
    tenantId: process.env.TENANT_ID ?? "",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  };
}

// src/index.ts
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import { loadConfig } from "./config.js";

const config = await loadConfig();

const app = new App({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  tenantId: config.tenantId,
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

app.on("message", async ({ send }) => {
  await send("Bot is running with Key Vault secrets!");
});

app.start(process.env.PORT || 3978);
```

### App Service Key Vault references (zero-code secret injection)

```shell
# Create Key Vault
az keyvault create \
  --name my-bot-vault \
  --resource-group my-bot-rg \
  --location eastus

# Store secrets in Key Vault
az keyvault secret set --vault-name my-bot-vault --name "BotClientId" --value "your-client-id"
az keyvault secret set --vault-name my-bot-vault --name "BotClientSecret" --value "your-client-secret"
az keyvault secret set --vault-name my-bot-vault --name "BotTenantId" --value "your-tenant-id"
az keyvault secret set --vault-name my-bot-vault --name "OpenAiApiKey" --value "your-openai-key"

# Enable system-assigned managed identity on App Service
az webapp identity assign \
  --name my-teams-bot \
  --resource-group my-bot-rg

# Grant the managed identity access to Key Vault secrets
PRINCIPAL_ID=$(az webapp identity show --name my-teams-bot --resource-group my-bot-rg --query principalId -o tsv)
az keyvault set-policy \
  --name my-bot-vault \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list

# Set App Settings with Key Vault references (no secrets in App Settings!)
az webapp config appsettings set \
  --name my-teams-bot \
  --resource-group my-bot-rg \
  --settings \
    CLIENT_ID="@Microsoft.KeyVault(SecretUri=https://my-bot-vault.vault.azure.net/secrets/BotClientId/)" \
    CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://my-bot-vault.vault.azure.net/secrets/BotClientSecret/)" \
    TENANT_ID="@Microsoft.KeyVault(SecretUri=https://my-bot-vault.vault.azure.net/secrets/BotTenantId/)" \
    OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=https://my-bot-vault.vault.azure.net/secrets/OpenAiApiKey/)"
```

### Managed identity bot configuration (zero-secret production)

```typescript
// src/index.ts — Production: no CLIENT_SECRET needed at all
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  clientId: process.env.CLIENT_ID,
  tenantId: process.env.TENANT_ID,
  // Use managed identity instead of CLIENT_SECRET
  // "system" for system-assigned, or a specific client ID for user-assigned
  managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID ?? "system",
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

app.on("message", async ({ send }) => {
  await send("Running with managed identity - no secrets in config!");
});

app.start(process.env.PORT || 3978);
```

## pitfalls

- **Key Vault references showing raw `@Microsoft.KeyVault(...)` string**: If the App Service cannot resolve Key Vault references, the raw reference string is used as the value instead of the secret. This happens when managed identity lacks "Get" permission on the vault or when the secret URI is malformed. Check the App Service "Configuration" blade for a green checkmark next to each reference.
- **DefaultAzureCredential slow locally**: `DefaultAzureCredential` tries multiple credential sources in sequence. If early sources timeout (e.g., managed identity endpoint on a dev machine), it can take 10+ seconds. For local development, use `AzureCliCredential` directly or set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` environment variables.
- **Forgetting to restart after App Settings change**: Azure App Service caches environment variables at startup. After updating App Settings or Key Vault references, restart the App Service to pick up the new values.
- **SSM Parameter Store hierarchical paths not mapped**: AWS SSM supports hierarchical parameter paths (`/myapp/prod/db-password`). Azure App Configuration uses flat key-value pairs with optional labels. Flatten the hierarchy or use labels (`key=db-password, label=prod`) during migration.
- **Secret rotation breaking the bot**: When rotating `CLIENT_SECRET` in Azure AD, both the old and new credentials must be valid simultaneously during the transition. Add the new credential first, update Key Vault, then remove the old credential after confirming the bot works.
- **Mixing .env and App Settings**: In production, App Settings override `.env` values. If both are present with different values, the App Settings value wins. Remove `.env` from deployment packages to avoid confusion.
- **Key Vault soft-delete blocking recreation**: Key Vault has soft-delete enabled by default. If you delete and recreate a vault with the same name, the operation fails. Purge the soft-deleted vault first or use a different name.

## references

- [Azure Key Vault overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
- [Azure App Configuration overview](https://learn.microsoft.com/en-us/azure/azure-app-configuration/overview)
- [Key Vault references for App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)
- [Managed identities overview](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
- [@azure/identity -- DefaultAzureCredential](https://learn.microsoft.com/en-us/azure/developer/javascript/sdk/authentication/credential-chains)
- [@azure/keyvault-secrets npm](https://www.npmjs.com/package/@azure/keyvault-secrets)
- [Key Vault secret rotation tutorial](https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation)
- [AWS to Azure services comparison -- Security](https://learn.microsoft.com/en-us/azure/architecture/aws-professional/services#security-identity-and-access)

## instructions

This expert bridges secrets and configuration management between AWS and Azure for cross-platform bot hosting. Use it when adding cross-platform support in either direction and you need to:

- Map secrets services between clouds (Secrets Manager ↔ Key Vault, SSM ↔ App Configuration)
- Set up Key Vault references in App Service App Settings for zero-code secret injection
- Configure managed identity for passwordless access to Key Vault and other Azure services
- Bridge `.env` files to production-ready App Settings on either cloud
- Implement the `managedIdentityClientId` option in the Teams SDK for zero-secret bot authentication
- Plan secret rotation for CLIENT_SECRET and other credentials

For Azure → AWS (less common): reverse the mappings. Key Vault maps to Secrets Manager, App Configuration maps to SSM Parameter Store, managed identity maps to IAM roles.

Pair with `../security/secrets-ts.md` for general secrets management best practices, and `../teams/runtime.app-init-ts.md` for the Teams bot credentials that need to be stored.

## research

Deep Research prompt:

"Write a micro expert for bridging secrets/config between AWS and Azure for cross-platform bots. Cover Secrets Manager ↔ Key Vault mapping, SSM ↔ App Configuration, Key Vault references in App Service, managed identity ↔ IAM roles, @azure/keyvault-secrets and @azure/identity SDK usage, .env to App Settings migration, and secret rotation patterns bidirectionally. Include code examples and CLI commands."
