# AI Gateway Troubleshooting

Common issues when using Azure API Management as an AI Gateway.

---

## Authentication Issues

### 401 Unauthorized from Backend

**Symptom**: APIM returns `401` when calling Azure OpenAI.

**Causes & Solutions**:

| Cause | Fix |
|-------|-----|
| Managed identity not enabled on APIM | `az apim update --name <apim> --resource-group <rg> --set identity.type=SystemAssigned` |
| Missing RBAC role | `az role assignment create --assignee <apim-principal-id> --role "Cognitive Services User" --scope <aoai-resource-id>` |
| Wrong auth resource | Ensure `resource="https://cognitiveservices.azure.com"` (not the endpoint URL) |
| RBAC propagation delay | Wait 5-10 minutes after role assignment |

**Diagnostic**:

```bash
# Verify identity is enabled
az apim show --name <apim> --resource-group <rg> --query "identity" -o json

# Check role assignments
AOAI_ID=$(az cognitiveservices account show --name <aoai> --resource-group <rg> --query id -o tsv)
az role assignment list --scope "$AOAI_ID" --query "[?principalType=='ServicePrincipal'].{role:roleDefinitionName, principal:principalId}" -o table
```

---

## Rate Limiting Issues

### 429 Token Limit Exceeded

**Symptom**: Requests blocked with `429 Too Many Requests` from `azure-openai-token-limit` policy.

**Solutions**:

1. **Increase limit**: Raise `tokens-per-minute` value
2. **Add more backends**: Load balance across regions for higher aggregate TPM
3. **Enable semantic caching**: Reduce actual token consumption by serving cached responses
4. **Switch counter-key**: Use per-user instead of global to prevent one user from exhausting the pool

```xml
<!-- Per-user instead of global -->
<azure-openai-token-limit
    tokens-per-minute="50000"
    counter-key="@(context.Request.Headers.GetValueOrDefault("X-User-Id", context.Subscription.Id))"
    estimate-prompt-tokens="true" />
```

### 429 from Azure OpenAI (Not APIM)

**Symptom**: Backend returns `429` even though APIM token limits are not exceeded.

**Cause**: Azure OpenAI's own TPM quota is exhausted.

**Solutions**:

1. Increase Azure OpenAI deployment TPM quota in the portal
2. Add load balancing across multiple Azure OpenAI instances
3. Use retry with backoff:

```xml
<retry condition="@(context.Response.StatusCode == 429)" count="3" interval="10">
    <forward-request />
</retry>
```

---

## Semantic Caching Issues

### No Cache Hits

**Symptom**: Semantic cache is configured but cache hit rate is 0%.

**Causes & Solutions**:

| Cause | Fix |
|-------|-----|
| `score-threshold` too high | Lower from 0.9 to 0.7 (more matches) |
| Embeddings backend misconfigured | Verify backend URL and auth |
| Redis not configured | Deploy Azure Cache for Redis Enterprise with RediSearch |
| Streaming requests | Semantic caching doesn't work with `"stream": true` |

**Verify caching is working**:

```bash
# Check cache-related headers in response
curl -v -X POST "${GATEWAY_URL}/openai/deployments/<deployment>/chat/completions?api-version=2024-02-01" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: <key>" \
  -d '{"messages": [{"role": "user", "content": "What is Azure?"}], "max_tokens": 100}'

# Look for: x-cache-status header in response
```

### Cache Returns Stale Data

**Solution**: Reduce `duration` in `azure-openai-semantic-cache-store`:

```xml
<!-- Shorter TTL for frequently changing knowledge -->
<azure-openai-semantic-cache-store duration="300" />  <!-- 5 minutes -->
```

---

## Content Safety Issues

### False Positives (Legitimate Content Blocked)

**Symptom**: Normal business content is being blocked by content safety policy.

**Solutions**:

1. **Increase thresholds** (less strict):

```xml
<llm-content-safety backend-id="contentsafety-backend">
    <category name="Hate" threshold="5" />      <!-- Was 4, now less strict -->
    <category name="Sexual" threshold="5" />
    <category name="SelfHarm" threshold="5" />
    <category name="Violence" threshold="5" />
</llm-content-safety>
```

2. **Log blocked content** for review:

```xml
<on-error>
    <choose>
        <when condition="@(context.LastError.Source == "llm-content-safety")">
            <trace source="content-safety" severity="warning">
                @{
                    return new JObject(
                        new JProperty("blocked", true),
                        new JProperty("subscription", context.Subscription.Id),
                        new JProperty("timestamp", DateTime.UtcNow)
                    ).ToString();
                }
            </trace>
            <return-response>
                <set-status code="400" reason="Content Filtered" />
                <set-body>{"error": "Content filtered by safety policy"}</set-body>
            </return-response>
        </when>
    </choose>
</on-error>
```

### Content Safety Backend Error

**Symptom**: `500` error from `llm-content-safety` policy.

**Causes**:

| Cause | Fix |
|-------|-----|
| Content Safety resource not deployed | Deploy Azure AI Content Safety resource |
| Backend URL wrong | Check `contentsafety-backend` URL matches resource endpoint |
| Missing RBAC | Grant APIM "Cognitive Services User" on the Content Safety resource |
| Region mismatch | Content Safety must be in a supported region |

---

## Backend Configuration Issues

### Backend Not Found

**Symptom**: `500` error with "Backend not found" message.

```bash
# Verify backend exists
az apim backend list --service-name <apim> --resource-group <rg> \
  --query "[].{id:name, url:url}" -o table

# Check backend ID matches policy reference
```

### Timeout on AI Requests

**Symptom**: Requests timeout, especially for large context windows or complex prompts.

**Solution**: Increase timeout in `<backend>`:

```xml
<backend>
    <!-- Default is 30s, increase for large AI requests -->
    <forward-request timeout="120" />
</backend>
```

---

## Diagnostic Tools

### APIM Tracing

Enable request tracing for debugging policy flow:

```bash
# Get tracing subscription key
az apim subscription list --service-name <apim> --resource-group <rg> \
  --query "[?displayName=='Built-in all-access subscription'].primaryKey" -o tsv

# Send request with tracing
curl -X POST "${GATEWAY_URL}/..." \
  -H "Ocp-Apim-Trace: true" \
  -H "Ocp-Apim-Subscription-Key: <built-in-key>"
```

### Application Insights

If APIM is connected to Application Insights:

```kql
// Failed AI gateway requests
requests
| where success == false
| where url contains "openai"
| project timestamp, resultCode, duration, url
| order by timestamp desc
| take 20

// Token metrics over time
customMetrics
| where name == "Total Tokens"
| summarize TotalTokens = sum(value) by bin(timestamp, 1h)
| render timechart

// Content safety blocks
traces
| where message contains "content-safety"
| project timestamp, message, customDimensions
| order by timestamp desc
```

### Health Check

Quick validation that the AI Gateway is functioning:

```bash
# 1. Check APIM is running
az apim show --name <apim> --resource-group <rg> --query "provisioningState" -o tsv
# Expected: Succeeded

# 2. Check backends
az apim backend list --service-name <apim> --resource-group <rg> -o table

# 3. Test endpoint
curl -s -o /dev/null -w "%{http_code}" "${GATEWAY_URL}/openai/deployments/<deployment>/chat/completions?api-version=2024-02-01" \
  -H "Ocp-Apim-Subscription-Key: <key>" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "ping"}], "max_tokens": 5}'
# Expected: 200
```

---

## References

- [APIM Diagnostics](https://learn.microsoft.com/azure/api-management/diagnose-solve-problems)
- [AI Gateway Monitoring](https://learn.microsoft.com/azure/api-management/genai-gateway-capabilities#monitoring-and-analytics)
- [APIM Error Handling](https://learn.microsoft.com/azure/api-management/api-management-error-handling-policies)
