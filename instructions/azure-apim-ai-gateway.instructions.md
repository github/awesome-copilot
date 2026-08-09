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
- **Authenticate to Foundry with a managed identity**, never a stored key. The exact role and token audience depend on the model type (see [Authentication](#authentication--managed-identity-not-keys)) — Azure OpenAI uses **Cognitive Services OpenAI User** (`https://cognitiveservices.azure.com`); other Foundry models use **Cognitive Services User** (`https://ai.azure.com`).
- **Respect policy element order.** Set elements and child elements in the order documented for each policy, and keep `<base />` in each section (`inbound`, `backend`, `outbound`, `on-error`).
- **Check tier support per policy — it varies.** `llm-token-limit` and `llm-content-safety` are not available on the Consumption tier; `llm-emit-token-metric` and `llm-semantic-cache-*` apply to all tiers (including Consumption). Verify each policy's "Applies to" line rather than assuming.
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
    <dimension name="API ID" />
    <dimension name="Subscription ID" />
</llm-emit-token-metric>
```

- Prerequisites for the metric — all three are required or the policy emits nothing usable: an Application Insights logger connected to the APIM instance; **Application Insights logging enabled for the LLM API**; and **custom metrics with dimensions enabled in Application Insights**.
- Emitting token metrics does **not** require logging message content. Full prompt/completion logging is a separate, **opt-in** step — enable it only with a clear need, because it can persist PII, secrets, and other sensitive content. If you do, apply field redaction, restrict who can read the logs, set a short retention window, and run it past your compliance/privacy review.
- Metrics come from the `usage` section of the model response. Some OpenAI models — **especially when streaming** — omit token counts unless the request sets `include_usage: true` (`stream_options`), and an interrupted stream yields inaccurate counts. Ensure clients enable usage reporting or the metric will be silently incomplete.
- Applies to all API Management tiers (including Consumption). Max 5 custom dimensions per policy.
- **Keep dimension cardinality low.** Azure Monitor caps custom metrics at 50,000 active time series per region per subscription (12-hour window), and the series count is the product of each dimension's distinct values. Avoid high-cardinality dimensions like client IP or per-user IDs — at normal user scale they blow past the cap and metrics get dropped. Prefer stable built-in dimensions (e.g. `API ID`, `Subscription ID`); use per-user attribution through logs/queries instead.

## Authentication — managed identity, not keys

The RBAC role **and the token audience depend on the model type** — this trips people up because the OpenAI role and audience don't work for other Foundry models:

- **Azure OpenAI deployments** → assign **Cognitive Services OpenAI User**; token audience `https://cognitiveservices.azure.com`.
- **Non-OpenAI Foundry Models** (DeepSeek, Llama, Grok, and other models sold by Azure) → assign **Cognitive Services User** (the OpenAI role does **not** grant access to these); token audience `https://ai.azure.com`.

Assign the role to APIM's managed identity on the Foundry resource, then authenticate at the gateway. Inline form (Azure OpenAI shown — swap `resource` to `https://ai.azure.com` for non-OpenAI Foundry models):

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

Preferred form: configure a **backend** with managed-identity credentials to the matching audience (`https://cognitiveservices.azure.com/` for Azure OpenAI, `https://ai.azure.com/` for other Foundry models) and reference it with `<set-backend-service backend-id="..." />`. This is what APIM sets up when you import a Foundry API directly.

> **Important — the `Authorization` header gets overwritten.** The `set-header` above (and the backend form) replaces the caller's `Authorization` with APIM's managed-identity token *before* the request reaches the backend. If you need the caller's identity downstream (e.g. to partition the semantic cache per user), capture it **first** with `<validate-jwt ... output-token-variable-name="callerJwt" />` and read it from that variable — after the overwrite, `Authorization` holds the backend identity, not the caller's.

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
        {
          // PTU — preferred
          id: backend1.id
          priority: 1
          weight: 1
        }
        {
          // PayGo — fallback
          id: backend2.id
          priority: 2
          weight: 1
        }
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
          name: 'trip-on-backend-failures'
          failureCondition: {
            count: 3
            interval: 'PT1H'
            // 429 = PTU/TPM saturation (honors Retry-After), 5xx = backend failure
            statusCodeRanges: [
              {
                min: 429
                max: 429
              }
              {
                min: 500
                max: 599
              }
            ]
            errorReasons: [
              'Server errors'
            ]
          }
          tripDuration: 'PT1H'
          acceptRetryAfter: true
        }
      ]
    }
  }
}

resource backend2 'Microsoft.ApiManagement/service/backends@2023-09-01-preview' = {
  name: '${apimName}/foundry-paygo'
  properties: {
    url: 'https://<foundry-2>.openai.azure.com/openai'
    protocol: 'http'
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
    <!-- Subscription id alone shares one partition across all users on that subscription.
         For user-specific responses, vary by the authenticated caller's subject. Key off the
         caller JWT saved by validate-jwt (output-token-variable-name="callerJwt") earlier in
         inbound — do NOT read Authorization here; it is overwritten with APIM's managed-identity
         token before lookup. A cast is used because a generic (Jwt) would put a raw '<' in the
         XML, which is invalid: -->
    <vary-by>@(context.Variables.ContainsKey("callerJwt") ? ((Jwt)context.Variables["callerJwt"]).Subject : context.Subscription.Id)</vary-by>
</llm-semantic-cache-lookup>
```

```xml
<!-- outbound -->
<llm-semantic-cache-store duration="60" />
```

- Lower `score-threshold` = stricter match (fewer cache hits, higher fidelity). Tune per use case; start around `0.05`–`0.15`.
- Partition the cache on the **actual confidentiality boundary** with `<vary-by>`. Keying only on the APIM subscription id means every user sharing that subscription shares one cache partition and can receive each other's cached completions — a data-exposure risk. When responses are user-specific, add the authenticated caller's subject to `<vary-by>`. Capture the caller's token early in `inbound` with `<validate-jwt output-token-variable-name="callerJwt" ... />` (before the managed-identity step overwrites `Authorization`), then key off the saved variable with a cast (a generic `<Jwt>` would put a raw `<` into the XML): `@(context.Variables.ContainsKey("callerJwt") ? ((Jwt)context.Variables["callerJwt"]).Subject : context.Subscription.Id)`. Do not re-read `Authorization` at lookup time — by then it holds APIM's backend token, which would collapse all callers into one partition.

## Content safety — `llm-content-safety`

Screen prompts through **Azure AI Content Safety** **before they reach the model** and, optionally, screen the model's responses (completions) **after it replies**. Configure a content-safety backend and set severity thresholds. Mind the defaults: both `shield-prompt` (jailbreak/prompt-injection detection) and `enforce-on-completions` default to `false`, so an inbound policy screens **prompts only** — set `enforce-on-completions="true"` to also screen the model's completions (or place the policy in the `outbound` section to screen responses).

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
    <!-- Authenticate the caller and SAVE their token before Authorization is overwritten below.
         Required to partition the semantic cache per user. Fill in your issuer/audience. -->
    <validate-jwt header-name="Authorization" output-token-variable-name="callerJwt" failed-validation-httpcode="401">
      <openid-config url="https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration" />
      <audiences>
        <audience>api://your-api-client-id</audience>
      </audiences>
    </validate-jwt>
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
    <!-- Cache lookup BEFORE token-limit/metric: a cache hit short-circuits the pipeline,
         so a cached request must not consume the caller's TPM/quota. Content safety stays
         above the lookup so every prompt is still screened. -->
    <llm-semantic-cache-lookup score-threshold="0.1" embeddings-backend-id="embeddings-backend" embeddings-backend-auth="system-assigned">
      <!-- Partition per authenticated caller (from the saved token) to prevent cross-user cache
           leakage. Cast, not a generic, so no raw '<' appears in the XML. -->
      <vary-by>@(context.Variables.ContainsKey("callerJwt") ? ((Jwt)context.Variables["callerJwt"]).Subject : context.Subscription.Id)</vary-by>
    </llm-semantic-cache-lookup>
    <llm-token-limit counter-key="@(context.Subscription.Id)" tokens-per-minute="500" estimate-prompt-tokens="true" />
    <llm-emit-token-metric namespace="llm-metrics">
      <dimension name="API ID" value="@(context.Api.Id)" />
    </llm-emit-token-metric>
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

Foundry has **built-in integration** with APIM: from the Foundry portal you can create a new APIM instance or attach an existing one as an AI gateway, then set per-deployment TPM limits and quotas from **Operate → Admin → AI Gateway → Token management** — these map directly to `llm-token-limit`. Attaching an **existing** APIM instance has hard requirements: it must be in the **same Microsoft Entra tenant and subscription** as the Foundry resource, be a **v2 tier** (Basic v2 / Standard v2 / Premium v2), and you need at least the **API Management Service Contributor** (or Owner) role on it — otherwise it won't appear as selectable. If the Foundry resource has **public network access disabled**, the APIM instance must also be privately reachable — use Standard v2 or Premium v2 with a private endpoint, or Premium v2 injected into a virtual network. The gateway can also govern registered **agents** (running anywhere) and, in **preview**, **MCP tools** (only new MCP tools that don't use managed OAuth are routed; policies are applied in the Azure portal, not the Foundry portal). When a repo uses this integration, keep custom policies compatible with the Foundry-managed configuration rather than overriding it. Prefer importing the API as a **Language Model API** or **Azure AI Foundry API** in APIM, which auto-creates the backend, `set-backend-service`, and optional token/caching/safety policies.

## Grounding

The AI gateway policy set evolves quickly. Before finalizing policy XML, verify element names, attributes, and ordering against Microsoft Learn (`genai-gateway-capabilities`, the per-policy reference pages) or the Microsoft Docs MCP server rather than relying on training data.
