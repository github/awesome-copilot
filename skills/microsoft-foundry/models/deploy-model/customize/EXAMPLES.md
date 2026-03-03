# customize Examples

## Example 1: Basic Deployment with Defaults

**Scenario:** Deploy gpt-4o accepting all defaults for quick setup.
**Config:** gpt-4o / GlobalStandard / 10K TPM / Dynamic Quota enabled
**Result:** Deployment `gpt-4o` created in ~2-3 min with auto-upgrade enabled.

## Example 2: Production Deployment with Custom Capacity

**Scenario:** Deploy gpt-4o for production with high throughput.
**Config:** gpt-4o / GlobalStandard / 50K TPM / Dynamic Quota / Name: `gpt-4o-production`
**Result:** 50K TPM (500 req/10s). Suitable for moderate-to-high traffic production apps.

## Example 3: PTU Deployment for High-Volume Workload

**Scenario:** Deploy gpt-4o with reserved capacity (PTU) for predictable workload.
**Config:** gpt-4o / ProvisionedManaged / 200 PTU (min 50, max 1000) / Priority Processing enabled
**PTU sizing:** 40K input + 20K output tokens/min → ~100 PTU estimated → 200 PTU recommended (2x headroom)
**Result:** Guaranteed throughput, fixed monthly cost. Use case: customer service bots, document pipelines.

## Example 4: Development Deployment with Standard SKU

**Scenario:** Deploy gpt-4o-mini for dev/testing with minimal cost.
**Config:** gpt-4o-mini / Standard / 1K TPM / Name: `gpt-4o-mini-dev`
**Result:** 1K TPM, 10 req/10s. Minimal pay-per-use cost for development and prototyping.

## Example 5: Spillover Configuration

**Scenario:** Deploy gpt-4o with spillover to handle peak load overflow.
**Config:** gpt-4o / GlobalStandard / 20K TPM / Dynamic Quota / Spillover → `gpt-4o-backup`
**Result:** Primary handles up to 20K TPM; overflow auto-redirects to backup deployment.

## Example 6: Anthropic Model Deployment (claude-sonnet-4-6)

**Scenario:** Deploy claude-sonnet-4-6 with customized settings.
**Config:** claude-sonnet-4-6 / GlobalStandard / capacity 1 (MaaS) / Industry: Healthcare / No RAI policy (Anthropic manages content filtering)
**Result:** User selected "Healthcare" as industry → tenant country code (US) and org name fetched automatically → deployed via ARM REST API with `modelProviderData` in ~2 min.

---

## Comparison Matrix

| Scenario | Model | SKU | Capacity | Dynamic Quota | Priority | Spillover | Use Case |
|----------|-------|-----|----------|:---:|:---:|:---:|----------|
| Ex 1 | gpt-4o | GlobalStandard | 10K TPM | ✓ | - | - | Quick setup |
| Ex 2 | gpt-4o | GlobalStandard | 50K TPM | ✓ | - | - | Production |
| Ex 3 | gpt-4o | ProvisionedManaged | 200 PTU | - | ✓ | - | Predictable workload |
| Ex 4 | gpt-4o-mini | Standard | 1K TPM | - | - | - | Dev/testing |
| Ex 5 | gpt-4o | GlobalStandard | 20K TPM | ✓ | - | ✓ | Peak load |
| Ex 6 | claude-sonnet-4-6 | GlobalStandard | 1 (MaaS) | - | - | - | Anthropic model |

## Common Patterns

### Dev → Staging → Production

| Stage | Model | SKU | Capacity | Extras |
|-------|-------|-----|----------|--------|
| Dev | gpt-4o-mini | Standard | 1K TPM | — |
| Staging | gpt-4o | GlobalStandard | 10K TPM | — |
| Production | gpt-4o | GlobalStandard | 50K TPM | Dynamic Quota + Spillover |

### Cost Optimization

- **High priority:** gpt-4o, ProvisionedManaged, 100 PTU, Priority Processing
- **Low priority:** gpt-4o-mini, Standard, 5K TPM

---

## Tips and Best Practices

**Capacity:** Start conservative → monitor with Azure Monitor → scale gradually → use spillover for peaks.

**SKU Selection:** Standard for dev → GlobalStandard + dynamic quota for variable production → ProvisionedManaged (PTU) for predictable load.

**Cost:** Right-size capacity; use gpt-4o-mini where possible (80-90% accuracy at lower cost); enable dynamic quota; consider PTU for consistent high-volume.

**Versions:** Auto-upgrade recommended; test new versions in staging first; pin only if compatibility requires it.

**Content Filtering:** Start with DefaultV2; use custom policies only for specific needs; monitor filtered requests.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `QuotaExceeded` | Check usage with `az cognitiveservices usage list`, reduce capacity, try different SKU, check other regions, or use the [quota skill](../../../quota/quota.md) to request an increase |
| Version not available for SKU | Check `az cognitiveservices account list-models --query "[?name=='gpt-4o'].version"`, use latest |
| Deployment name exists | Skill auto-generates unique name (e.g., `gpt-4o-2`), or specify custom name |
