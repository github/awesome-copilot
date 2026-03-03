---
name: azure-compute
description: "Recommend Azure VM sizes, VM Scale Sets (VMSS), and configurations based on workload requirements, performance needs, and budget constraints. No Azure account required — uses public documentation and the Azure Retail Prices API. USE FOR: recommend VM size, which VM should I use, choose Azure VM, VM for web/database/ML/batch/HPC, GPU VM, compare VM sizes, cheapest VM, best VM for workload, VM pricing, cost estimate, burstable/compute/memory/storage optimized VM, confidential computing, VM trade-offs, VM families, VMSS, scale set recommendation, autoscale VMs, load balanced VMs, VMSS vs VM, scale out, horizontal scaling, flexible orchestration. DO NOT USE FOR: deploying VMs or VMSS, deploying apps (use azure-deploy), looking up existing VMs (use azure-resource-lookup), cost optimization of running VMs (use azure-cost-optimization), non-VM services like App Service or AKS."
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---

# Azure Compute Skill

Recommend Azure VM sizes, VM Scale Sets (VMSS), and configurations by analyzing workload type, performance requirements, scaling needs, and budget. No Azure subscription required — all data comes from public Microsoft documentation and the unauthenticated Retail Prices API.

## When to Use This Skill

- User asks which Azure VM or VMSS to choose for a workload
- User needs VM size recommendations for web, database, ML, batch, HPC, or other workloads
- User wants to compare VM families, sizes, or pricing tiers
- User asks about trade-offs between VM options (cost vs performance)
- User needs a cost estimate for Azure VMs without an Azure account
- User asks whether to use a single VM or a scale set
- User needs autoscaling, high availability, or load-balanced VM recommendations
- User asks about VMSS orchestration modes (Flexible vs Uniform)

## Workflow

> Use reference files for initial filtering

> **CRITICAL: then always verify with live documentation** from learn.microsoft.com before making final recommendations. If `web_fetch` fails, use reference files as fallback but warn the user the information may be stale.

### Step 1: Gather Requirements

Ask the user for (infer when possible):

| Requirement            | Examples                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| **Workload type**      | Web server, relational DB, ML training, batch processing, dev/test |
| **vCPU / RAM needs**   | "4 cores, 16 GB RAM" or "lightweight" / "heavy"                    |
| **GPU needed?**        | Yes → GPU families; No → general/compute/memory                    |
| **Storage needs**      | High IOPS, large temp disk, premium SSD                            |
| **Budget priority**    | Cost-sensitive, performance-first, balanced                        |
| **OS**                 | Linux or Windows (affects pricing)                                 |
| **Region**             | Affects availability and price                                     |
| **Instance count**     | Single instance, fixed count, or variable/dynamic                  |
| **Scaling needs**      | None, manual scaling, autoscale based on metrics or schedule       |
| **Availability needs** | Best-effort, fault-domain isolation, cross-zone HA                 |
| **Load balancing**     | Not needed, Azure Load Balancer (L4), Application Gateway (L7)     |

### Step 2: Determine VM vs VMSS

**Workflow:**

1. Review [VMSS Guide](references/vmss-guide.md) to understand when VMSS vs single VM is appropriate
2. Use the gathered requirements to decide which approach fits best
3. **REQUIRED: If recommending VMSS**, fetch current documentation to verify capabilities:
   ```bash
   web_fetch https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/overview
   web_fetch https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-autoscale-overview
   ```
4. **If `web_fetch` fails**, proceed with reference file guidance but include this warning:
   > Unable to verify against latest Azure documentation. Recommendation based on reference material that may not reflect recent updates.

```text
Needs autoscaling?
├─ Yes → VMSS
├─ No
│  ├─ Multiple identical instances needed?
│  │  ├─ Yes → VMSS
│  │  └─ No
│  │     ├─ High availability across fault domains / zones?
│  │     │  ├─ Yes, many instances → VMSS
│  │     │  └─ Yes, 1-2 instances → VM + Availability Zone
│  │     └─ Single instance sufficient? → VM
```

| Signal                                        | Recommendation                | Why                                                                   |
| --------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| Autoscale on CPU, memory, or schedule         | **VMSS**                      | Built-in autoscale; no custom automation needed                       |
| Stateless web/API tier behind a load balancer | **VMSS**                      | Homogeneous fleet with automatic distribution                         |
| Batch / parallel processing across many nodes | **VMSS**                      | Scale out on demand, scale to zero when idle                          |
| Mixed VM sizes in one group                   | **VMSS (Flexible)**           | Flexible orchestration supports mixed SKUs                            |
| Single long-lived server (jumpbox, AD DC)     | **VM**                        | No scaling benefit; simpler management                                |
| Unique per-instance config required           | **VM**                        | Scale sets assume homogeneous configuration                           |
| Stateful workload, tightly-coupled cluster    | **VM** (or VMSS case-by-case) | Evaluate carefully; VMSS Flexible can work for some stateful patterns |

> **Warning:** If the user is unsure, default to **single VM** for simplicity. Recommend VMSS only when scaling, HA, or fleet management is clearly needed.

### Step 3: Select VM Family

**Workflow:**

1. Review [VM Family Guide](references/vm-families.md) to identify 2-3 candidate VM families that match the workload requirements
2. **REQUIRED: verify specifications** for your chosen candidates by fetching current documentation:
   ```bash
   web_fetch https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/<family-category>/<series-name>
   ```
   
   Examples:
   - B-series: `https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family`
   - D-series: `https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/ddsv5-series`
   - GPU: `https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-family`

3. **If considering Spot VMs**, also fetch:
   ```bash
   web_fetch https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/use-spot
   ```

4. **If `web_fetch` fails**, proceed with reference file guidance but include this warning:
   > Unable to verify against latest Azure documentation. Recommendation based on reference material that may not reflect recent updates or limitations (e.g., Spot VM compatibility).

This step applies to both single VMs and VMSS since scale sets use the same VM SKUs.

### Step 4: Look Up Pricing

Query the Azure Retail Prices API — [Retail Prices API Guide](references/retail-prices-api.md)

> **Tip:** VMSS has no extra charge — pricing is per-VM instance. Use the same VM pricing from the API and multiply by the expected instance count to estimate VMSS cost. For autoscaling workloads, estimate cost at both the minimum and maximum instance count.

### Step 5: Present Recommendations

Provide **2–3 options** with trade-offs:

| Column         | Purpose                                         |
| -------------- | ----------------------------------------------- |
| Hosting Model  | VM or VMSS (with orchestration mode if VMSS)    |
| VM Size        | ARM SKU name (e.g., `Standard_D4s_v5`)          |
| vCPUs / RAM    | Core specs                                      |
| Instance Count | 1 for VM; min–max range for VMSS with autoscale |
| Estimated $/hr | Per-instance pay-as-you-go from API             |
| Why            | Fit for the workload                            |
| Trade-off      | What the user gives up                          |

> **Tip:** Always explain *why* a family fits and what the user trades off (cost vs cores, burstable vs dedicated, single VM simplicity vs VMSS scalability, etc.).

For VMSS recommendations, also mention:
- Recommended orchestration mode (Flexible for most new workloads)
- Autoscale strategy (metric-based, schedule-based, or both)
- Load balancer type (Azure Load Balancer for L4, Application Gateway for L7/TLS)

### Step 6: Offer Next Steps

- Compare reservation / savings plan pricing (query API with `priceType eq 'Reservation'`)
- Suggest [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) for full estimates
- For VMSS: suggest reviewing [autoscale best practices](https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-best-practices) and [VMSS networking](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-networking)

## Error Handling

| Scenario                        | Action                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------ |
| API returns empty results       | Broaden filters — check `armRegionName`, `serviceName`, `armSkuName` spelling  |
| User unsure of workload type    | Ask clarifying questions; default to General Purpose D-series                  |
| Region not specified            | Use `eastus` as default; note prices vary by region                            |
| Unclear if VM or VMSS needed    | Ask about scaling and instance count; default to single VM if unsure           |
| User asks VMSS pricing directly | Use same VM pricing API — VMSS has no extra charge; multiply by instance count |

## References

- [VM Family Guide](references/vm-families.md) — Family-to-workload mapping and selection
- [Retail Prices API Guide](references/retail-prices-api.md) — Query patterns, filters, and examples
- [VMSS Guide](references/vmss-guide.md) — When to use VMSS, orchestration modes, and autoscale patterns
