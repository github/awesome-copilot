---
name: azure-aigateway
description: "Configure Azure API Management as an AI Gateway for AI models, MCP tools, and agents. USE FOR: semantic caching, token limit, content safety, load balancing, AI model governance, MCP rate limiting, jailbreak detection, add Azure OpenAI backend, add AI Foundry model, test AI gateway, LLM policies, configure AI backend, token metrics, AI cost control, convert API to MCP, import OpenAPI to gateway. DO NOT USE FOR: deploying APIM (use azure-prepare), general API policies (use azure-deploy), creating new APIM instance (use azure-prepare)."
license: MIT
metadata:
  author: Microsoft
  version: "3.0.0"
compatibility: Requires Azure CLI (az) for configuration and testing
---

# Azure AI Gateway

Configure Azure API Management (APIM) as an AI Gateway for governing AI models, MCP tools, and agents.

> **To deploy APIM**, use the **azure-prepare** skill. See [APIM deployment guide](https://learn.microsoft.com/azure/api-management/get-started-create-service-instance).

## When to Use This Skill

| Category | Triggers |
|----------|----------|
| **Model Governance** | "semantic caching", "token limits", "load balance AI", "track token usage" |
| **Tool Governance** | "rate limit MCP", "protect my tools", "configure my tool", "convert API to MCP" |
| **Agent Governance** | "content safety", "jailbreak detection", "filter harmful content" |
| **Configuration** | "add Azure OpenAI backend", "configure my model", "add AI Foundry model" |
| **Testing** | "test AI gateway", "call OpenAI through gateway" |

---

## Quick Reference

| Policy | Purpose | Details |
|--------|---------|---------|
| `azure-openai-token-limit` | Cost control | [Model Policies](references/policies.md#token-rate-limiting) |
| `azure-openai-semantic-cache-lookup/store` | 60-80% cost savings | [Model Policies](references/policies.md#semantic-caching) |
| `azure-openai-emit-token-metric` | Observability | [Model Policies](references/policies.md#token-metrics) |
| `llm-content-safety` | Safety & compliance | [Agent Policies](references/policies.md#content-safety) |
| `rate-limit-by-key` | MCP/tool protection | [Tool Policies](references/policies.md#request-rate-limiting) |

---

## Get Gateway Details

```bash
# Get gateway URL
az apim show --name <apim-name> --resource-group <rg> --query "gatewayUrl" -o tsv

# List backends (AI models)
az apim backend list --service-name <apim-name> --resource-group <rg> \
  --query "[].{id:name, url:url}" -o table

# Get subscription key
az apim subscription keys list \
  --service-name <apim-name> --resource-group <rg> --subscription-id <sub-id>
```

---

## Test AI Endpoint

```bash
GATEWAY_URL=$(az apim show --name <apim-name> --resource-group <rg> --query "gatewayUrl" -o tsv)

curl -X POST "${GATEWAY_URL}/openai/deployments/<deployment>/chat/completions?api-version=2024-02-01" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: <key>" \
  -d '{"messages": [{"role": "user", "content": "Hello"}], "max_tokens": 100}'
```

---

## Common Tasks

### Add AI Backend

See [references/patterns.md](references/patterns.md#pattern-1-add-ai-model-backend) for full steps.

```bash
# Discover AI resources
az cognitiveservices account list --query "[?kind=='OpenAI']" -o table

# Create backend
az apim backend create --service-name <apim> --resource-group <rg> \
  --backend-id openai-backend --protocol http --url "https://<aoai>.openai.azure.com/openai"

# Grant access (managed identity)
az role assignment create --assignee <apim-principal-id> \
  --role "Cognitive Services User" --scope <aoai-resource-id>
```

### Apply AI Governance Policy

Recommended policy order in `<inbound>`:

1. **Authentication** - Managed identity to backend
2. **Semantic Cache Lookup** - Check cache before calling AI
3. **Token Limits** - Cost control
4. **Content Safety** - Filter harmful content
5. **Backend Selection** - Load balancing
6. **Metrics** - Token usage tracking

See [references/policies.md](references/policies.md#combining-policies) for complete example.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Token limit 429 | Increase `tokens-per-minute` or add load balancing |
| No cache hits | Lower `score-threshold` to 0.7 |
| Content false positives | Increase category thresholds (5-6) |
| Backend auth 401 | Grant APIM "Cognitive Services User" role |

See [references/troubleshooting.md](references/troubleshooting.md) for details.

---

## References

- [**Detailed Policies**](references/policies.md) - Full policy examples
- [**Configuration Patterns**](references/patterns.md) - Step-by-step patterns
- [**Troubleshooting**](references/troubleshooting.md) - Common issues
- [AI-Gateway Samples](https://github.com/Azure-Samples/AI-Gateway)
- [GenAI Gateway Docs](https://learn.microsoft.com/azure/api-management/genai-gateway-capabilities)

## SDK Quick References

- **Content Safety**: [Python](references/sdk/azure-ai-contentsafety-py.md) | [TypeScript](references/sdk/azure-ai-contentsafety-ts.md)
- **API Management**: [Python](references/sdk/azure-mgmt-apimanagement-py.md) | [.NET](references/sdk/azure-mgmt-apimanagement-dotnet.md)
