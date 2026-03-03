# Customize Guides — Selection Guides & Advanced Topics

> Reference for: `models/deploy-model/customize/SKILL.md`

## Selection Guides

### How to Choose SKU

| SKU | Best For | Cost | Availability |
|-----|----------|------|--------------|
| **GlobalStandard** | Production, high availability | Medium | Multi-region |
| **Standard** | Development, testing | Low | Single region |
| **ProvisionedManaged** | High-volume, predictable workloads | Fixed (PTU) | Reserved capacity |
| **DataZoneStandard** | Data residency requirements | Medium | Specific zones |

**Decision Tree:**
```
Do you need guaranteed throughput?
├─ Yes → ProvisionedManaged (PTU)
└─ No → Do you need high availability?
        ├─ Yes → GlobalStandard
        └─ No → Standard
```

### How to Choose Capacity

**For TPM-based SKUs (GlobalStandard, Standard):**

| Workload | Recommended Capacity |
|----------|---------------------|
| Development/Testing | 1K - 5K TPM |
| Small Production | 5K - 20K TPM |
| Medium Production | 20K - 100K TPM |
| Large Production | 100K+ TPM |

**For PTU-based SKUs (ProvisionedManaged):**

Use the PTU calculator based on:
- Input tokens per minute
- Output tokens per minute
- Requests per minute

**Capacity Planning Tips:**
- Start with recommended capacity
- Monitor usage and adjust
- Enable dynamic quota for flexibility
- Consider spillover for peak loads

### How to Choose RAI Policy

| Policy | Filtering Level | Use Case |
|--------|----------------|----------|
| **Microsoft.DefaultV2** | Balanced | Most applications |
| **Microsoft.Prompt-Shield** | Enhanced | Security-sensitive apps |
| **Custom** | Configurable | Specific requirements |

**Recommendation:** Start with `Microsoft.DefaultV2` and adjust based on application needs.

---

## Advanced Topics

### PTU (Provisioned Throughput Units) Deployments

**What is PTU?**
- Reserved capacity with guaranteed throughput
- Measured in PTU units, not TPM
- Fixed cost regardless of usage
- Best for high-volume, predictable workloads

**PTU Calculator:**

```
Estimated PTU = (Input TPM × 0.001) + (Output TPM × 0.002) + (Requests/min × 0.1)

Example:
- Input: 10,000 tokens/min
- Output: 5,000 tokens/min
- Requests: 100/min

PTU = (10,000 × 0.001) + (5,000 × 0.002) + (100 × 0.1)
    = 10 + 10 + 10
    = 30 PTU
```

**PTU Deployment:**
```bash
az cognitiveservices account deployment create \
  --name <account-name> \
  --resource-group <resource-group> \
  --deployment-name <deployment-name> \
  --model-name <model-name> \
  --model-version <version> \
  --model-format "OpenAI" \
  --sku-name "ProvisionedManaged" \
  --sku-capacity 100  # PTU units
```

### Spillover Configuration

**Spillover Workflow:**
1. Primary deployment receives requests
2. When capacity reached, requests overflow to spillover target
3. Spillover target must be same model or compatible
4. Configure via deployment properties

**Best Practices:**
- Use spillover for peak load handling
- Spillover target should have sufficient capacity
- Monitor both deployments
- Test failover behavior

### Priority Processing

**What is Priority Processing?**
- Prioritizes your requests during high load
- Available for ProvisionedManaged SKU
- Additional charges apply
- Ensures consistent performance

**When to Use:**
- Mission-critical applications
- SLA requirements
- High-concurrency scenarios
