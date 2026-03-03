# AI Gateway Configuration Patterns

Step-by-step patterns for configuring Azure API Management as an AI Gateway.

---

## Pattern 1: Add AI Model Backend

Connect Azure OpenAI or AI Foundry models to your APIM instance.

### Prerequisites

- APIM instance deployed (use **azure-prepare** skill to deploy APIM — see [APIM deployment guide](https://learn.microsoft.com/azure/api-management/get-started-create-service-instance))
- Azure OpenAI or AI Foundry resource provisioned
- System-assigned or user-assigned managed identity enabled on APIM

### Steps

#### 1. Discover AI Resources

```bash
# Find Azure OpenAI resources
az cognitiveservices account list --query "[?kind=='OpenAI'].{name:name, rg:resourceGroup, endpoint:properties.endpoint}" -o table

# Find AI Foundry resources (if using)
az cognitiveservices account list --query "[?kind=='AIServices'].{name:name, rg:resourceGroup}" -o table
```

#### 2. Enable Managed Identity on APIM

```bash
# Enable system-assigned identity
az apim update --name <apim-name> --resource-group <rg> --set identity.type=SystemAssigned

# Get principal ID
PRINCIPAL_ID=$(az apim show --name <apim-name> --resource-group <rg> --query "identity.principalId" -o tsv)
```

#### 3. Grant RBAC Access

```bash
AOAI_ID=$(az cognitiveservices account show --name <aoai-name> --resource-group <rg> --query id -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Cognitive Services User" \
  --scope "$AOAI_ID"
```

#### 4. Create Backend

```bash
az apim backend create \
  --service-name <apim-name> \
  --resource-group <rg> \
  --backend-id openai-backend \
  --protocol http \
  --url "https://<aoai-name>.openai.azure.com/openai"
```

#### 5. Import API (OpenAPI Spec)

```bash
# Import the Azure OpenAI API specification
az apim api import \
  --service-name <apim-name> \
  --resource-group <rg> \
  --api-id azure-openai-api \
  --path "openai" \
  --specification-format OpenApi \
  --specification-url "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable/2024-02-01/inference.json" \
  --service-url "https://<aoai-name>.openai.azure.com/openai"
```

#### 6. Set Backend Policy

Add managed identity authentication in `<inbound>`:

```xml
<inbound>
    <base />
    <set-backend-service backend-id="openai-backend" />
    <authentication-managed-identity resource="https://cognitiveservices.azure.com" />
</inbound>
```

---

## Pattern 2: Load Balance Across Multiple AI Backends

Distribute requests across multiple Azure OpenAI instances for higher throughput.

### Steps

#### 1. Create Multiple Backends

```bash
# Primary region
az apim backend create --service-name <apim> --resource-group <rg> \
  --backend-id openai-eastus --protocol http \
  --url "https://<aoai-eastus>.openai.azure.com/openai"

# Secondary region
az apim backend create --service-name <apim> --resource-group <rg> \
  --backend-id openai-westus --protocol http \
  --url "https://<aoai-westus>.openai.azure.com/openai"
```

#### 2. Create Backend Pool

Using APIM backend pool (preview) or policy-based load balancing:

```xml
<inbound>
    <base />
    <set-variable name="backendUrl" value="@{
        var backends = new [] {
            "https://aoai-eastus.openai.azure.com",
            "https://aoai-westus.openai.azure.com"
        };
        var hash = Math.Abs(context.RequestId.GetHashCode());
        var index = hash % backends.Length;
        return backends[index];
    }" />
    <set-backend-service base-url="@((string)context.Variables["backendUrl"] + "/openai")" />
    <authentication-managed-identity resource="https://cognitiveservices.azure.com" />
</inbound>
```

#### 3. Add Circuit Breaker (Retry on 429)

```xml
<retry condition="@(context.Response.StatusCode == 429)" count="3" interval="10" delta="5" max-interval="30" first-fast-retry="false">
    <set-variable name="backendUrl" value="@{
        var backends = new [] {
            "https://aoai-eastus.openai.azure.com",
            "https://aoai-westus.openai.azure.com"
        };
        var currentIndex = Array.IndexOf(backends, (string)context.Variables["backendUrl"]);
        return backends[(currentIndex + 1) % backends.Length];
    }" />
    <set-backend-service base-url="@((string)context.Variables["backendUrl"] + "/openai")" />
    <forward-request />
</retry>
```

---

## Pattern 3: Convert API to MCP Tool

Expose an existing API through APIM as an MCP-compatible tool for AI agents.

### Steps

1. **Import API** into APIM using OpenAPI spec
2. **Add rate limiting** to protect the tool endpoint
3. **Add content safety** to filter harmful inputs
4. **Generate MCP manifest** pointing to the APIM endpoint

```xml
<!-- Rate limit MCP tool calls -->
<inbound>
    <base />
    <rate-limit-by-key calls="10" renewal-period="60"
        counter-key="@(context.Request.Headers.GetValueOrDefault("X-Agent-Id", "anonymous"))" />
</inbound>
```

---

## Pattern 4: Add Streaming Support

Configure APIM to properly handle Server-Sent Events (SSE) for streaming AI responses.

```xml
<inbound>
    <base />
    <set-backend-service backend-id="openai-backend" />
    <authentication-managed-identity resource="https://cognitiveservices.azure.com" />
</inbound>
<outbound>
    <base />
    <set-header name="Content-Type" exists-action="override">
        <value>@(context.Request.Body.As<JObject>()["stream"]?.Value<bool>() == true
            ? "text/event-stream" : "application/json")</value>
    </set-header>
</outbound>
```

> **Note**: Semantic caching and token metrics policies are NOT compatible with streaming responses. Use non-streaming for cost control scenarios.

---

## Pattern 5: Multi-Tenant AI Gateway

Isolate tenants with per-client rate limiting and tracking.

```xml
<inbound>
    <base />
    <!-- Extract tenant from subscription or header -->
    <set-variable name="tenantId" value="@(context.Subscription.Id)" />

    <!-- Per-tenant token limit -->
    <azure-openai-token-limit
        tokens-per-minute="10000"
        counter-key="@((string)context.Variables["tenantId"])"
        estimate-prompt-tokens="true" />

    <!-- Per-tenant metrics -->
    <azure-openai-emit-token-metric namespace="ai-gateway">
        <dimension name="Tenant" value="@((string)context.Variables["tenantId"])" />
        <dimension name="API" value="@(context.Api.Name)" />
    </azure-openai-emit-token-metric>

    <set-backend-service backend-id="openai-backend" />
    <authentication-managed-identity resource="https://cognitiveservices.azure.com" />
</inbound>
```

---

## Next Steps

- Apply [governance policies](policies.md) to your configured backends
- Review [troubleshooting](troubleshooting.md) for common configuration issues
