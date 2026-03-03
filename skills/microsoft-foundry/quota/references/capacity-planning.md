# Capacity Planning Guide

Comprehensive guide for planning Azure AI Foundry capacity, including cost analysis, model selection, and workload calculations.

## Cost Comparison: TPM vs PTU

> **Official Pricing Sources:**
> - [Azure OpenAI Service Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/) - Official pay-per-token rates
> - [PTU Costs and Billing Guide](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/provisioned-throughput-onboarding) - PTU hourly rates and capacity planning

**TPM (Standard) Pricing:**
- Pay-per-token for input/output
- No upfront commitment
- **Rates**: See [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
  - GPT-4o: ~$0.0025-$0.01/1K tokens
  - GPT-4 Turbo: ~$0.01-$0.03/1K
  - GPT-3.5 Turbo: ~$0.0005-$0.0015/1K
- **Best for**: Variable workloads, unpredictable traffic

**PTU (Provisioned) Pricing:**
- Hourly billing: `$/PTU/hr × PTUs × 730 hrs/month`
- Monthly commitment with Reservations discounts
- **Rates**: See [PTU Billing Guide](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/provisioned-throughput-onboarding)
- Use PTU calculator to determine requirements (Microsoft Foundry → Operate → Quota → Provisioned Throughput Unit tab)
- **Best for**: High-volume (>1M tokens/day), predictable traffic, guaranteed throughput

**Cost Decision Framework** (Analytical Guidance):

```
Step 1: Calculate monthly TPM cost
  Monthly TPM cost = (Daily tokens × 30 days × $price per 1K tokens) / 1000

Step 2: Calculate monthly PTU cost
  Monthly PTU cost = Required PTUs × 730 hours/month × $PTU-hour rate
  (Get Required PTUs from Azure AI Foundry portal: Microsoft Foundry → Operate → Quota → Provisioned Throughput Unit tab)

Step 3: Compare
  Use PTU when: Monthly PTU cost < (Monthly TPM cost × 0.7)
  (Use 70% threshold to account for commitment risk)
```

**Example Calculation** (Analytical):

Scenario: 1M requests/day, average 1,000 tokens per request

- **Daily tokens**: 1,000,000 × 1,000 = 1B tokens/day
- **TPM Cost** (using GPT-4o at $0.005/1K avg): (1B × 30 × $0.005) / 1000 = ~$150,000/month
- **PTU Cost** (estimated 100 PTU at ~$5/PTU-hour): 100 PTU × 730 hours × $5 = ~$365,000/month
- **Decision**: Use TPM (significantly lower cost for this workload)

> **Important**: Always use the official [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) and Azure AI Foundry portal PTU calculator (Microsoft Foundry → Operate → Quota → Provisioned Throughput Unit tab) for exact pricing by model, region, and workload. Prices vary by region and are subject to change.

---

## Production Workload Examples

Real-world production scenarios with capacity calculations for gpt-4, version 0613 (from Azure Foundry Portal calculator):

| Workload Type | Calls/Min | Prompt Tokens | Response Tokens | Cache Hit % | Total Tokens/Min | PTU Required | TPM Equivalent |
|---------------|-----------|---------------|-----------------|-------------|------------------|--------------|----------------|
| **RAG Chat** | 10 | 3,500 | 300 | 20% | 38,000 | 100 | 38K TPM |
| **Basic Chat** | 10 | 500 | 100 | 20% | 6,000 | 100 | 6K TPM |
| **Summarization** | 10 | 5,000 | 300 | 20% | 53,000 | 100 | 53K TPM |
| **Classification** | 10 | 3,800 | 10 | 20% | 38,100 | 100 | 38K TPM |

**How to Calculate Your Needs:**

1. **Determine your peak calls per minute**: Monitor or estimate maximum concurrent requests
2. **Measure token usage**: Average prompt size + response size
3. **Account for cache hits**: Prompt caching can reduce effective token count by 20-50%
4. **Calculate total tokens/min**: (Calls/min × (Prompt tokens + Response tokens)) × (1 - Cache %)
5. **Choose deployment type**:
   - **TPM (Standard)**: Allocate 1.5-2× your calculated tokens/min for headroom
   - **PTU (Provisioned)**: Use Azure AI Foundry portal PTU calculator for exact PTU count (Microsoft Foundry → Operate → Quota → Provisioned Throughput Unit tab)

**Example Calculation (RAG Chat Production):**
- Peak: 10 calls/min
- Prompt: 3,500 tokens (context + question)
- Response: 300 tokens (answer)
- Cache: 20% hit rate (reduces prompt tokens by 20%)
- **Total TPM needed**: (10 × (3,500 × 0.8 + 300)) = 31,000 TPM
- **With 50% headroom**: 46,500 TPM → Round to **50K TPM deployment**

**PTU Recommendation:**
For the combined workload (40 calls/min, 135K tokens/min total), use **200 PTU** (from calculator above).

---

## Model Selection and Deployment Type Guidance

> **Official Documentation:**
> - [Choose the Right AI Model for Your Workload](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/choose-ai-model) - Microsoft Architecture Center
> - [Azure OpenAI Models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models) - Model capabilities, regions, and quotas
> - [Understanding Deployment Types](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/concepts/deployment-types) - Standard vs Provisioned guidance

**Model Characteristics** (from [official Azure OpenAI documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models)):

| Model | Key Characteristics | Best For |
|-------|---------------------|----------|
| **GPT-4o** | Matches GPT-4 Turbo performance in English text/coding, superior in non-English and vision tasks. Cheaper and faster than GPT-4 Turbo. | Multimodal tasks, cost-effective general purpose, high-volume production workloads |
| **GPT-4 Turbo** | Superior reasoning capabilities, larger context window (128K tokens) | Complex reasoning tasks, long-context analysis |
| **GPT-3.5 Turbo** | Most cost-effective, optimized for chat and completions, fast response time | Simple tasks, customer service, high-volume low-cost scenarios |
| **GPT-4o mini** | Fastest response time, low latency | Latency-sensitive applications requiring immediate responses |
| **text-embedding-3-large** | Purpose-built for vector embeddings | RAG applications, semantic search, document similarity |

**Deployment Type Selection** (from [official deployment types guide](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/concepts/deployment-types)):

| Traffic Pattern | Recommended Deployment Type | Reason |
|-----------------|---------------------------|---------|
| **Variable, bursty traffic** | Standard or Global Standard (pay-per-token) | No commitment, pay only for usage |
| **Consistent high volume** | Provisioned types (PTU) | Reserved capacity, predictable costs |
| **Large batch jobs (non-time-sensitive)** | Global Batch or DataZone Batch | 50% cost savings vs Standard |
| **Low latency variance required** | Provisioned types | Guaranteed throughput, no rate limits |
| **No regional restrictions** | Global Standard or Global Provisioned | Access to best available capacity |

**Capacity Planning Approach** (from [PTU onboarding guide](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/provisioned-throughput-onboarding)):

1. **Understand your TPM requirements**: Calculate expected tokens per minute based on workload
2. **Use the built-in capacity planner**: Available in Azure AI Foundry portal (Microsoft Foundry → Operate → Quota → Provisioned Throughput Unit tab)
3. **Input your metrics**: Enter input TPM and output TPM based on your workload characteristics
4. **Get PTU recommendation**: The calculator provides PTU allocation recommendation
5. **Compare costs**: Evaluate Standard (TPM) vs Provisioned (PTU) using the official pricing calculator

> **Note**: Microsoft does not publish specific "X requests/day = Y TPM" recommendations as capacity requirements vary significantly based on prompt size, response length, cache hit rates, and model choice. Use the built-in capacity planner with your actual workload characteristics.
