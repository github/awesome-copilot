---
description: 'Configure Azure API Management as an AI (GenAI) gateway in front of Microsoft Foundry and other LLM APIs: token-limit and token-metric policies, managed-identity auth, backend load balancing with circuit breakers, semantic caching, and content safety — plus the policy mistakes Copilot makes by default.'
applyTo: "**/*.xml, **/policies/**, **/*.bicep"
---

# Azure API Management as an AI Gateway Instructions

Guidance for putting **Azure API Management (APIM)** in front of **Microsoft Foundry** model deployments (Azure OpenAI and other providers) and any OpenAI-compatible LLM API, using APIM's **AI gateway** policy set. When this guidance conflicts with your training data, **follow this file** and verify against Microsoft Learn: https://learn.microsoft.com/azure/api-management/genai-gateway-capabilities

> **Field note (why this file exists):** In Copilot-assisted APIM work, the default behavior is to (1) reach for the older provider-specific `azure-openai-*` policies instead of the current provider-agnostic `llm-*` ones, (2) throttle LLM traffic with request-count policies (`rate-limit-by-key`) that don't understand tokens, (3) authenticate to the model backend with an `api-key` header pulled from a named value instead of a managed identity, and (4) emit policy elements in an arbitrary order — which APIM rejects, because **AI gateway policy elements are order-sensitive**. These instructions front-load those corrections so Copilot produces a valid, secure gateway policy on the first pass. When in doubt, ground against Microsoft Learn or the Microsoft Docs MCP server — the AI gateway policy surface changes frequently.

## Core rules

- **Prefer the provider-agnostic `llm-*` policies** (`llm-token-limit`, `llm-emit-token-metric`, `llm-semantic-cache-lookup`/`-store`, `llm-content-safety`). They work across OpenAI Chat Completions/Responses, Anthropic Messages (v2 tiers), and Google Vertex AI. Only use the `azure-openai-*` variants when the API is exclusively Azure OpenAI and you have a reason to.
- **Throttle by tokens, not by call count**, for LLM APIs. `rate-limit-by-key` counts requests and is blind to token cost; use `llm-token-limit`.
- **Authenticate to Foundry with a managed identity**, never a stored key. Give APIM's identity the **Cognitive Services OpenAI User** role on the Foundry resource.
- **Respect policy element order.** Set elements and child elements in the order documented for each policy, and keep `<base />` in each section (`inbound`, `backend`, `outbound`, `on-error`).
- **The `llm-*` and `azure-openai-*` metric/token policies are not available on the Consumption tier.** Check tier support before recommending them.
- Prefer configuring an APIM **backend** resource (with managed-identity credentials) over inline `authentication-managed-identity` + `set-header`; importing a Foundry API wires this up automatically.

## Token rate limiting and quotas — `llm-token-limit`

Enforce a tokens-per-minute (TPM) rate limit, a token quota over a fixed window, or both, keyed off any counter (subscription id, IP, JWT claim, custom header). Set `estimate-prompt-tokens="true"` to reject over-limit prompts **before** they hit the backend.

```xml
<!-- inbound -->
<llm-token-limit
    counter-key="@(context.Subscription.Id)"
    tokens-per-minute="500"
    token-quota="500000"
    token-quota-period="Monthly"
    estimate-prompt-tokens="true"
    remaining-tokens-variable-name="remainingTokens" />
```

- Exceeding **`tokens-per-minute`** returns `429 Too Many Requests`; exceeding **`token-quota`** returns `403 Forbidden`. Handle both distinctly in clients — a 403 here is a quota exhaustion signal, not an auth failure.
- `token-quota-period` must be one of `Hourly`, `Daily`, `Weekly`, `Monthly`, `Yearly`.
- At least one of `tokens-per-minute` or (`token-quota` + `token-quota-period`) is required; `counter-key` is always required.
- Use a policy expression for `counter-key` to limit per app/team/tenant, e.g. `@(context.Request.Headers.GetValueOrDefault("x-team-id","anon"))`.

## Observability — `llm-emit-token-metric`

Emit prompt/completion/total token metrics to **Application Insights** so you can attribute spend per consumer. Add dimensions to slice the metric later in Azure Monitor.

```xml
<!-- inbound -->
<llm-emit-token-metric namespace="llm-metrics">
    <dimension name="Client IP" value="@(context.Request.IpAddress)" />
    <dimension name="API ID" value="@(context.Api.Id)" />
    <dimension name="User ID" value="@(context.Request.Headers.GetValueOrDefault("x-user-id", "N/A"))" />
</llm-emit-token-metric>
```

- Requires an Application Insights logger wired to the APIM instance. Also enable LLM request logging to capture prompts/completions for auditing.
- Not available on the Consumption tier.

## Authentication — managed identity, not keys

Give APIM's managed identity the **Cognitive Services OpenAI User** role on the Foundry resource, then authenticate at the gateway. Inline form:

```xml
<!-- inbound -->
<authentication-managed-identity
    resource="https://cognitiveservices.azure.com"
    output-token-variable-name="managed-id-access-token"
    ignore-error="false" />
<set-header name="Authorization" exists-action="override">
    <value>@("Bearer " + (string)context.Variables["managed-id-access-token"])</value>
</set-header>
```

Preferred form: configure a **backend** with managed-identity credentials to `https://cognitiveservices.azure.com/` and reference it with `<set-backend-service backend-id="..." />`. This is what APIM sets up when you import a Foundry API directly.

## Resiliency — backend pools, load balancing, and circuit breakers

Do **not** hand-roll retry/failover across multiple Foundry endpoints in application code. Define an APIM **backend pool** and let the gateway load-balance (round-robin, weighted, priority, session-aware) with a **circuit breaker** that honors the backend `Retry-After` header. Use `priority` to prefer PTU endpoints and fall back to pay-as-you-go.

```bicep
resource pool 'Microsoft.ApiManagement/service/backends@2023-09-01-preview' = {
  name: '${apimName}/foundry-pool'
  properties: {
    description: 'Load-balanced Foundry endpoints'
    type: 'Pool'
    pool: {
      services: [
        { id: backend1.id, priority: 1, weight: 1 } // PTU — preferred
        { id: backend2.id, priority: 2, weight: 1 } // PayGo — fallback
      ]
    }
  }
}

resource backend1 'Microsoft.ApiManagement/service/backends@2023-09-01-preview' = {
  name: '${apimName}/foundry-ptu'
  properties: {
    url: 'https://<foundry-1>.openai.azure.com/openai'
    protocol: 'http'
    circuitBreaker: {
      rules: [
        {
          name: 'trip-on-5xx'
          failureCondition: {
            count: 3
            interval: 'PT1H'
            statusCodeRanges: [ { min: 500, max: 599 } ]
            errorReasons: [ 'Server errors' ]
          }
          tripDuration: 'PT1H'
          acceptRetryAfter: true
        }
      ]
    }
  }
}
```

## Semantic caching — `llm-semantic-cache-lookup` / `-store`

Cache completions by vector proximity of the prompt to reduce token spend and latency. This is **not** in-memory caching: it requires an external **RediSearch-compatible cache** (e.g., Azure Managed Redis) onboarded to APIM and an **embeddings backend**. Lookup goes in `inbound`, store in `outbound`.

```xml
<!-- inbound -->
<llm-semantic-cache-lookup
    score-threshold="0.15"
    embeddings-backend-id="embeddings-backend"
    embeddings-backend-auth="system-assigned"
    ignore-system-messages="true"
    max-message-count="10">
    <vary-by>@(context.Subscription.Id)</vary-by>
</llm-semantic-cache-lookup>
```

```xml
<!-- outbound -->
<llm-semantic-cache-store duration="60" />
```

- Lower `score-threshold` = stricter match (fewer cache hits, higher fidelity). Tune per use case; start around `0.05`–`0.15`.
- Partition the cache per tenant/consumer with `<vary-by>` so users never receive another consumer's cached completion.

## Content safety — `llm-content-safety`

Screen prompts (and optionally responses) through **Azure AI Content Safety** before they reach the model. Configure a content-safety backend and set severity thresholds; `shield-prompt="true"` adds jailbreak/prompt-injection detection.

```xml
<!-- inbound -->
<llm-content-safety backend-id="content-safety-backend" shield-prompt="true">
    <categories output-type="EightSeverityLevels">
        <category name="Hate" threshold="4" />
        <category name="Violence" threshold="4" />
    </categories>
</llm-content-safety>
```

- Thresholds use 0–7 severity: a `threshold="4"` allows 0–3 and blocks 4–7. Raise to be more permissive, lower to be stricter.

## Policy skeleton and ordering

Keep AI gateway policies in the correct sections and preserve `<base />`:

```xml
<policies>
  <inbound>
    <base />
    <set-backend-service backend-id="foundry-pool" />
    <authentication-managed-identity resource="https://cognitiveservices.azure.com" output-token-variable-name="mi" />
    <set-header name="Authorization" exists-action="override">
      <value>@("Bearer " + (string)context.Variables["mi"])</value>
    </set-header>
    <llm-content-safety backend-id="content-safety-backend" shield-prompt="true">
      <categories output-type="EightSeverityLevels">
        <category name="Hate" threshold="4" />
      </categories>
    </llm-content-safety>
    <llm-token-limit counter-key="@(context.Subscription.Id)" tokens-per-minute="500" estimate-prompt-tokens="true" />
    <llm-emit-token-metric namespace="llm-metrics">
      <dimension name="API ID" value="@(context.Api.Id)" />
    </llm-emit-token-metric>
    <llm-semantic-cache-lookup score-threshold="0.1" embeddings-backend-id="embeddings-backend" embeddings-backend-auth="system-assigned" />
  </inbound>
  <backend><base /></backend>
  <outbound>
    <base />
    <llm-semantic-cache-store duration="60" />
  </outbound>
  <on-error><base /></on-error>
</policies>
```

## Foundry-native AI gateway

Foundry has **built-in integration** with APIM: from the Foundry portal you can create or attach an APIM instance as an AI gateway and set per-deployment TPM limits and quotas from **Operate → Admin → AI Gateway → Token management** — these map directly to `llm-token-limit`. The gateway can also govern registered **agents** (running anywhere) and **MCP tools**, surfacing them in the Foundry inventory with policy enforcement and telemetry. When a repo uses this integration, keep custom policies compatible with the Foundry-managed configuration rather than overriding it. Prefer importing the API as a **Language Model API** or **Azure AI Foundry API** in APIM, which auto-creates the backend, `set-backend-service`, and optional token/caching/safety policies.

## Grounding

The AI gateway policy set evolves quickly. Before finalizing policy XML, verify element names, attributes, and ordering against Microsoft Learn (`genai-gateway-capabilities`, the per-policy reference pages) or the Microsoft Docs MCP server rather than relying on training data.
