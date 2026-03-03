# AI Gateway Policies

Complete reference for Azure API Management AI governance policies.

---

## Policy Placement Order

Recommended order in `<inbound>` section:

```
1. Authentication (managed identity)
2. Semantic Cache Lookup
3. Token Rate Limiting
4. Content Safety
5. Backend Selection / Load Balancing
6. Token Metrics
```

---

## Model Policies

### Token Rate Limiting

Control costs by limiting token consumption per minute.

```xml
<azure-openai-token-limit
    tokens-per-minute="50000"
    counter-key="@(context.Subscription.Id)"
    estimate-prompt-tokens="true"
    tokens-consumed-header-name="x-tokens-consumed"
    remaining-tokens-header-name="x-tokens-remaining" />
```

| Attribute | Purpose | Default |
|-----------|---------|---------|
| `tokens-per-minute` | Max tokens per counter window | Required |
| `counter-key` | Grouping key (subscription, IP, custom) | Required |
| `estimate-prompt-tokens` | Count prompt tokens toward limit | `true` |
| `tokens-consumed-header-name` | Response header with consumed count | — |
| `remaining-tokens-header-name` | Response header with remaining count | — |

**Usage tiers example:**

```xml
<!-- Free tier: 5K TPM -->
<azure-openai-token-limit tokens-per-minute="5000"
    counter-key="@("free-" + context.Subscription.Id)"
    estimate-prompt-tokens="true" />

<!-- Premium tier: 100K TPM -->
<azure-openai-token-limit tokens-per-minute="100000"
    counter-key="@("premium-" + context.Subscription.Id)"
    estimate-prompt-tokens="true" />
```

---

### Semantic Caching

Cache AI responses for semantically similar prompts. Saves 60-80% on repeated queries.

**Lookup** (in `<inbound>`):

```xml
<azure-openai-semantic-cache-lookup
    score-threshold="0.8"
    embeddings-backend-id="embeddings-backend"
    embeddings-backend-auth="system-assigned" />
```

**Store** (in `<outbound>`):

```xml
<azure-openai-semantic-cache-store duration="3600" />
```

| Attribute | Purpose | Recommended |
|-----------|---------|-------------|
| `score-threshold` | Similarity threshold (0-1) | 0.8 (lower = more cache hits) |
| `embeddings-backend-id` | Backend for embedding generation | Required |
| `embeddings-backend-auth` | Auth to embeddings backend | `system-assigned` |
| `duration` | Cache TTL in seconds | 3600 (1 hour) |

**Prerequisites:**
- An embeddings model deployed (e.g., `text-embedding-ada-002`)
- A separate backend pointing to the embeddings endpoint
- Azure Cache for Redis Enterprise with RediSearch module (for vector storage)

```bash
# Create embeddings backend
az apim backend create --service-name <apim> --resource-group <rg> \
  --backend-id embeddings-backend --protocol http \
  --url "https://<aoai>.openai.azure.com/openai"
```

> **Note**: Semantic caching is NOT compatible with streaming responses (`"stream": true`).

---

### Token Metrics

Emit token usage metrics for monitoring and chargeback.

```xml
<azure-openai-emit-token-metric namespace="ai-gateway">
    <dimension name="Subscription" value="@(context.Subscription.Id)" />
    <dimension name="API" value="@(context.Api.Name)" />
    <dimension name="Model" value="@(context.Request.Headers.GetValueOrDefault("x-model", "unknown"))" />
    <dimension name="Operation" value="@(context.Operation.Id)" />
</azure-openai-emit-token-metric>
```

Emits to Azure Monitor with these metrics:
- `Total Tokens` — prompt + completion combined
- `Prompt Tokens` — input tokens
- `Completion Tokens` — output tokens

**Query token usage (KQL):**

```kql
customMetrics
| where name == "Total Tokens"
| extend Subscription = tostring(customDimensions["Subscription"])
| summarize TotalTokens = sum(value) by Subscription, bin(timestamp, 1h)
| order by TotalTokens desc
```

---

## Agent Policies

### Content Safety

Filter harmful, violent, or inappropriate content from AI inputs and outputs.

```xml
<!-- In <inbound> -->
<llm-content-safety backend-id="contentsafety-backend">
    <category name="Hate" threshold="4" />
    <category name="Sexual" threshold="4" />
    <category name="SelfHarm" threshold="4" />
    <category name="Violence" threshold="4" />
</llm-content-safety>
```

| Category | Description | Threshold Range |
|----------|-------------|-----------------|
| Hate | Discrimination, slurs | 0 (block all) - 6 (allow most) |
| Sexual | Explicit content | 0-6 |
| SelfHarm | Self-injury content | 0-6 |
| Violence | Violent content | 0-6 |

**Prerequisites:**
- Azure AI Content Safety resource deployed
- Backend configured for the Content Safety endpoint:

```bash
az apim backend create --service-name <apim> --resource-group <rg> \
  --backend-id contentsafety-backend --protocol http \
  --url "https://<contentsafety>.cognitiveservices.azure.com"
```

---

### Jailbreak Detection

Block prompt injection attacks that attempt to bypass AI safety guardrails.

```xml
<llm-content-safety backend-id="contentsafety-backend">
    <category name="Hate" threshold="4" />
    <category name="Sexual" threshold="4" />
    <category name="SelfHarm" threshold="4" />
    <category name="Violence" threshold="4" />
    <!-- Jailbreak detection is automatic when content safety is enabled -->
</llm-content-safety>
```

Custom response for blocked content:

```xml
<on-error>
    <base />
    <choose>
        <when condition="@(context.LastError.Source == "llm-content-safety")">
            <return-response>
                <set-status code="400" reason="Content Filtered" />
                <set-body>{"error": "Request blocked by content safety policy"}</set-body>
            </return-response>
        </when>
    </choose>
</on-error>
```

---

## Tool Policies

### Request Rate Limiting

Protect MCP tools and API endpoints from excessive requests.

```xml
<!-- Per-agent rate limiting -->
<rate-limit-by-key calls="30" renewal-period="60"
    counter-key="@(context.Request.Headers.GetValueOrDefault("X-Agent-Id", "anonymous"))"
    remaining-calls-header-name="x-ratelimit-remaining"
    retry-after-header-name="Retry-After" />
```

```xml
<!-- Per-subscription rate limiting -->
<rate-limit-by-key calls="100" renewal-period="60"
    counter-key="@(context.Subscription.Id)" />
```

---

## Combining Policies

Complete inbound policy example with all governance layers:

```xml
<policies>
    <inbound>
        <base />

        <!-- 1. Authentication -->
        <authentication-managed-identity resource="https://cognitiveservices.azure.com" />

        <!-- 2. Semantic Cache Lookup -->
        <azure-openai-semantic-cache-lookup
            score-threshold="0.8"
            embeddings-backend-id="embeddings-backend"
            embeddings-backend-auth="system-assigned" />

        <!-- 3. Token Rate Limiting -->
        <azure-openai-token-limit
            tokens-per-minute="50000"
            counter-key="@(context.Subscription.Id)"
            estimate-prompt-tokens="true" />

        <!-- 4. Content Safety -->
        <llm-content-safety backend-id="contentsafety-backend">
            <category name="Hate" threshold="4" />
            <category name="Sexual" threshold="4" />
            <category name="SelfHarm" threshold="4" />
            <category name="Violence" threshold="4" />
        </llm-content-safety>

        <!-- 5. Backend Selection -->
        <set-backend-service backend-id="openai-backend" />

        <!-- 6. Token Metrics -->
        <azure-openai-emit-token-metric namespace="ai-gateway">
            <dimension name="Subscription" value="@(context.Subscription.Id)" />
            <dimension name="API" value="@(context.Api.Name)" />
        </azure-openai-emit-token-metric>
    </inbound>

    <backend>
        <forward-request timeout="120" />
    </backend>

    <outbound>
        <base />
        <!-- Cache store (after successful response) -->
        <azure-openai-semantic-cache-store duration="3600" />
    </outbound>

    <on-error>
        <base />
        <choose>
            <when condition="@(context.LastError.Source == "azure-openai-token-limit")">
                <return-response>
                    <set-status code="429" reason="Token Limit Exceeded" />
                    <set-header name="Retry-After" exists-action="override">
                        <value>60</value>
                    </set-header>
                    <set-body>{"error": "Token rate limit exceeded. Try again later."}</set-body>
                </return-response>
            </when>
        </choose>
    </on-error>
</policies>
```

---

## Policy Quick-Decision Table

| Need | Policy | Section |
|------|--------|---------|
| Control token spend | `azure-openai-token-limit` | `<inbound>` |
| Cache similar prompts | `azure-openai-semantic-cache-lookup/store` | `<inbound>` / `<outbound>` |
| Track token usage | `azure-openai-emit-token-metric` | `<inbound>` |
| Block harmful content | `llm-content-safety` | `<inbound>` |
| Rate limit API calls | `rate-limit-by-key` | `<inbound>` |
| Authenticate to backend | `authentication-managed-identity` | `<inbound>` |
| Load balance backends | `set-backend-service` + retry | `<inbound>` |

---

## References

- [GenAI Gateway Capabilities](https://learn.microsoft.com/azure/api-management/genai-gateway-capabilities)
- [APIM Policy Reference](https://learn.microsoft.com/azure/api-management/api-management-policies)
- [AI-Gateway Samples](https://github.com/Azure-Samples/AI-Gateway)
