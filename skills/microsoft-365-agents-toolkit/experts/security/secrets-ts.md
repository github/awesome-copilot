# secrets-ts

## purpose

Secrets management best practices for Teams bots: environment variables, Key Vault, managed identity, and credential hygiene across development and production environments.

## rules

1. Never commit secrets to source control. Add `.env` to `.gitignore` before the first commit. Create a `.env.example` file with placeholder values and comments documenting each required variable. Scan repositories with tools like `git-secrets` or GitHub secret scanning to catch accidental commits. [OWASP -- Hard-coded credentials](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
2. A Teams bot requires at minimum three secrets for Azure Bot registration: `CLIENT_ID` (Azure AD app registration ID), `CLIENT_SECRET` (app credential), and `TENANT_ID` (Azure AD tenant). These are configured in the `App` constructor via `clientId`, `clientSecret`, and `tenantId` options. [learn.microsoft.com -- Azure Bot registration](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration)
3. Use Azure Key Vault for all secrets in production environments. Store `CLIENT_SECRET`, `OPENAI_API_KEY`, database connection strings, and any other sensitive values in Key Vault. Access them via Key Vault references in App Settings or programmatically with `@azure/keyvault-secrets`. [learn.microsoft.com -- Key Vault overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
4. Use managed identity (system-assigned or user-assigned) for zero-secret production deployments. The Teams SDK supports `managedIdentityClientId: "system"` or a specific client ID, eliminating the need for `CLIENT_SECRET` entirely. This also works for accessing Key Vault, Cosmos DB, and Blob Storage without connection strings. [learn.microsoft.com -- Managed identity](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
5. Apply the least-privilege principle to Azure AD app registrations. Grant only the Microsoft Graph permissions the bot actually needs (e.g., `User.Read` for profile access, not `Directory.ReadWrite.All`). Use delegated permissions where possible (user-level) rather than application permissions (admin-level). Review and remove unused permissions quarterly. [learn.microsoft.com -- Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-overview)
6. Rotate `CLIENT_SECRET` before expiration. Azure AD app credentials can be set with 6-month, 12-month, or 24-month expiration. Create a new credential before the old one expires, update Key Vault, verify the bot works, then remove the old credential. Automate this with Key Vault rotation policies and Event Grid notifications. [learn.microsoft.com -- Credential rotation](https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation)
7. Secure API keys (`OPENAI_API_KEY`, `AZURE_OPENAI_API_KEY`) with the same rigor as bot credentials. Store in Key Vault, access via managed identity or Key Vault references, and set usage limits/quotas on the OpenAI/Azure OpenAI side to limit blast radius if a key is compromised. [learn.microsoft.com -- Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview)
8. Never log secrets or tokens. Implement log scrubbing to redact patterns matching API keys, JWTs, and connection strings. The Teams SDK `ConsoleLogger` does not automatically redact secrets -- wrap or post-process log output if it might contain token values from error stack traces. [OWASP -- Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
9. Use the Teams SDK `token` option for custom credential factories when managed identity does not fit your architecture. The token factory pattern `token: (config) => getToken()` lets you integrate with custom secret stores or token services without hardcoding credentials. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. For local development, use `.env` files loaded via `dotenv` (included in the project template via `node -r dotenv/config .`). Keep local `.env` secrets separate from production secrets. Use Azure CLI login (`az login`) with `DefaultAzureCredential` to access Key Vault and other Azure services locally without storing production secrets on dev machines. [learn.microsoft.com -- DefaultAzureCredential](https://learn.microsoft.com/en-us/azure/developer/javascript/sdk/authentication/credential-chains)

## patterns

### Secure .env setup and gitignore configuration

```shell
# .gitignore — always include these
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json

# .env.example — commit this to document required variables
# Azure Bot Registration (required)
CLIENT_ID=<your-azure-ad-app-id>
CLIENT_SECRET=<your-azure-ad-app-secret>
TENANT_ID=<your-azure-ad-tenant-id>

# OpenAI (required for AI features)
OPENAI_API_KEY=<your-openai-api-key>

# Azure OpenAI (alternative to OpenAI)
# AZURE_OPENAI_API_KEY=<your-azure-openai-key>
# AZURE_OPENAI_ENDPOINT=<https://your-resource.openai.azure.com>
# AZURE_OPENAI_API_VERSION=2024-02-01
# AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=<your-deployment-name>

# Application Insights (optional)
# APPLICATIONINSIGHTS_CONNECTION_STRING=<your-connection-string>

# Port (optional, default 3978)
PORT=3978
```

```typescript
// src/index.ts — Local development with dotenv
// Run with: node -r dotenv/config .
// Or: tsx watch -r dotenv/config src/index.ts
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger("my-bot", { level: "debug" }),
});

app.on("message", async ({ send }) => {
  await send("Bot is running with env-based secrets.");
});

app.start(process.env.PORT || 3978);
```

### Managed identity for zero-secret production

```typescript
// src/index.ts — Production deployment with managed identity
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

// Option 1: Managed identity for bot authentication (no CLIENT_SECRET)
const app = new App({
  clientId: process.env.CLIENT_ID,
  tenantId: process.env.TENANT_ID,
  managedIdentityClientId: "system", // or process.env.MANAGED_IDENTITY_CLIENT_ID
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Option 2: Managed identity for Key Vault access (fetch other secrets)
async function getSecret(name: string): Promise<string> {
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(process.env.KEY_VAULT_URL!, credential);
  const secret = await client.getSecret(name);
  return secret.value!;
}

// Option 3: Custom token factory for advanced scenarios
// const app = new App({
//   clientId: process.env.CLIENT_ID,
//   tenantId: process.env.TENANT_ID,
//   token: async (config) => {
//     // Fetch token from custom secret store or token service
//     const credential = new DefaultAzureCredential();
//     const tokenResponse = await credential.getToken(config.scopes);
//     return tokenResponse.token;
//   },
// });

app.on("message", async ({ send }) => {
  await send("Running with managed identity - zero secrets in config!");
});

app.start(process.env.PORT || 3978);
```

### Log scrubbing to prevent secret leakage

```typescript
// src/utils/log-scrubber.ts
const SECRET_PATTERNS: RegExp[] = [
  // Azure AD client secrets (40+ character base64-like strings)
  /[A-Za-z0-9~._-]{34,}/g,
  // JWT tokens
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  // Connection strings with keys
  /AccountKey=[^;]+/gi,
  // OpenAI API keys
  /sk-[A-Za-z0-9]{20,}/g,
  // Generic key=value patterns for known secret keys
  /(client.?secret|api.?key|password|token|credential)\s*[:=]\s*\S+/gi,
];

export function scrubSecrets(message: string): string {
  let scrubbed = message;
  for (const pattern of SECRET_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, "[REDACTED]");
  }
  return scrubbed;
}

// Usage with a custom logger wrapper:
import { ILogger } from "@microsoft/teams.common";

export class ScrubLogger implements ILogger {
  constructor(private inner: ILogger) {}

  error(message: string, ...args: unknown[]): void {
    this.inner.error(scrubSecrets(message), ...args.map(a => typeof a === "string" ? scrubSecrets(a) : a));
  }
  warn(message: string, ...args: unknown[]): void {
    this.inner.warn(scrubSecrets(message), ...args.map(a => typeof a === "string" ? scrubSecrets(a) : a));
  }
  info(message: string, ...args: unknown[]): void {
    this.inner.info(scrubSecrets(message), ...args.map(a => typeof a === "string" ? scrubSecrets(a) : a));
  }
  debug(message: string, ...args: unknown[]): void {
    this.inner.debug(scrubSecrets(message), ...args.map(a => typeof a === "string" ? scrubSecrets(a) : a));
  }
  log(message: string, ...args: unknown[]): void {
    this.inner.log(scrubSecrets(message), ...args.map(a => typeof a === "string" ? scrubSecrets(a) : a));
  }
  child(name: string): ILogger {
    return new ScrubLogger(this.inner.child(name));
  }
}

// src/index.ts
// import { ScrubLogger } from "./utils/log-scrubber.js";
// import { ConsoleLogger } from "@microsoft/teams.common";
// const app = new App({
//   logger: new ScrubLogger(new ConsoleLogger("my-bot", { level: "debug" })),
// });
```

## pitfalls

- **Committing .env to git history**: Even if `.env` is in `.gitignore`, it may already be in git history from an earlier commit. Use `git rm --cached .env` to remove it from tracking, and consider rotating all secrets that were ever committed. Use `git log --all -- .env` to check.
- **CLIENT_SECRET expiration**: Azure AD app credentials expire. If the bot stops authenticating unexpectedly, check the credential expiration date in Azure Portal > App registrations > Certificates & secrets. Set calendar reminders or automate rotation.
- **Over-permissioned app registration**: Granting broad Graph permissions (e.g., `Directory.ReadWrite.All`) to a bot that only needs to read user profiles (`User.Read`) violates least-privilege. If the bot's credentials are compromised, the blast radius includes all granted permissions.
- **Managed identity not available locally**: `managedIdentityClientId` only works on Azure compute. For local development, fall back to `clientId` + `clientSecret` from `.env`. Use conditional configuration based on `NODE_ENV` or presence of `MANAGED_IDENTITY_CLIENT_ID`.
- **Logging JWT tokens in error messages**: When auth fails, error messages and stack traces may include full JWT tokens. These tokens grant access until they expire (typically 1 hour). Use log scrubbing to redact JWT patterns.
- **Key Vault access denied in new deployments**: After enabling managed identity on App Service, the Key Vault access policy must also be configured. Without it, all Key Vault references resolve to empty strings, and the bot fails silently or crashes at startup.
- **Sharing secrets across environments**: Using the same `CLIENT_SECRET` or `OPENAI_API_KEY` in development, staging, and production means compromising one environment compromises all. Use separate credentials per environment.
- **OpenAI API key without usage limits**: A leaked `OPENAI_API_KEY` without spending limits can result in significant unexpected costs. Set monthly spending caps in the OpenAI dashboard and use project-scoped API keys where available.

## references

- [Azure Key Vault overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
- [Managed identities for Azure resources](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
- [Azure Bot registration](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration)
- [Key Vault references for App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)
- [DefaultAzureCredential documentation](https://learn.microsoft.com/en-us/azure/developer/javascript/sdk/authentication/credential-chains)
- [Key Vault secret rotation](https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-overview)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## instructions

This expert covers secrets management for Microsoft Teams bots built with the Teams AI SDK v2 in TypeScript. Use it when you need to:

- Set up `.env` files and `.gitignore` for safe local development with bot credentials
- Understand the required secrets for Teams bot registration (`CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`)
- Configure Azure Key Vault for production secret storage
- Implement managed identity for zero-secret deployments (eliminating `CLIENT_SECRET` in production)
- Use the Teams SDK `managedIdentityClientId` or `token` factory for secure authentication
- Rotate `CLIENT_SECRET` and other credentials safely
- Secure API keys (`OPENAI_API_KEY`) with usage limits and proper storage
- Prevent secret leakage in logs with scrubbing patterns
- Apply least-privilege to Azure AD app registrations and Key Vault access policies

Pair with `../teams/runtime.app-init-ts.md` for App constructor credential configuration, and `../bridge/infra-secrets-config-ts.md` when bridging secrets between AWS and Azure.

## research

Deep Research prompt:

"Write a micro expert on secrets management for Node/TypeScript Teams bots. Cover local .env handling with dotenv, required bot secrets (CLIENT_ID, CLIENT_SECRET, TENANT_ID), Azure Key Vault for production, managed identity for zero-secret deployments, the Teams SDK managedIdentityClientId and token factory options, CLIENT_SECRET rotation patterns, securing OPENAI_API_KEY, least-privilege Azure AD app registrations, log scrubbing to prevent secret leakage, and a .env.example template. Include code examples for each pattern."
