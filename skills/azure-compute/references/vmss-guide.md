# VMSS Guide

Determine when to recommend a Virtual Machine Scale Set (VMSS) over a single VM, and which VMSS configuration to suggest.

> **Note:** This reference provides quick guidance but may become stale. Always verify VMSS features, limitations, and orchestration mode capabilities by fetching the latest documentation from:
> - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/overview
> - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-autoscale-overview
> - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/orchestration-modes-api-comparison

## What Is a VM Scale Set?

A VMSS creates and manages a group of load-balanced, identically configured VM instances. Key capabilities:

- **Autoscale** — automatically add/remove instances based on metrics or schedules
- **High availability** — spread instances across fault domains and Availability Zones
- **Load balancing** — integrate with Azure Load Balancer (L4) or Application Gateway (L7)
- **Large scale** — up to 1,000 instances per scale set (marketplace images)
- **No extra cost** — you pay only for the underlying VM instances, storage, and networking

## When to Recommend VMSS vs Single VM

| Scenario                                              | Recommend | Reasoning                                   |
| ----------------------------------------------------- | --------- | ------------------------------------------- |
| Stateless web/API behind a load balancer              | VMSS      | Homogeneous fleet, autoscale on demand      |
| Batch or parallel compute jobs                        | VMSS      | Scale out for jobs, scale to zero when idle |
| Autoscale needed (CPU, queue depth, schedule)         | VMSS      | Built-in autoscale rules                    |
| Microservices with identical replicas                 | VMSS      | Consistent config, rolling updates          |
| High availability across zones (many instances)       | VMSS      | Automatic zone distribution                 |
| Single long-lived server (jumpbox, domain controller) | VM        | No scaling benefit; simpler config          |
| Unique per-instance configuration                     | VM        | Scale sets assume identical instances       |
| Quick proof of concept or dev/test                    | VM        | Faster to stand up, lower complexity        |

## Orchestration Modes

VMSS supports two orchestration modes. **Flexible** is recommended for all new workloads.

| Feature                  | Flexible (recommended) | Uniform (legacy) |
| ------------------------ | ---------------------- | ---------------- |
| Mix VM sizes in one set  | ✅ Yes                  | ❌ No             |
| Add existing VMs to set  | ✅ Yes                  | ❌ No             |
| Availability Zone spread | ✅ Automatic            | ✅ Automatic      |
| Fault domain control     | ✅ Fine-grained         | ⚠️ Limited        |
| Max instances            | 1,000                  | 1,000            |
| Spot + on-demand mix     | ✅ Yes                  | ⚠️ Limited        |
| Single-instance VMSS     | ✅ Yes                  | ❌ No             |
| VM model updates         | Manual or automatic    | Automatic        |

> **Warning:** Orchestration mode cannot be changed after creation. Always recommend Flexible unless the user has a specific Uniform requirement.

## Autoscale Patterns

| Pattern            | Trigger                                  | Example                                                      |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| **Metric-based**   | CPU, memory, queue length, custom metric | Scale out when avg CPU > 70% for 5 min                       |
| **Schedule-based** | Time of day, day of week                 | Scale to 10 instances Mon–Fri 8 AM; scale down to 2 at night |
| **Combined**       | Metric + schedule together               | Baseline schedule with metric burst capacity                 |
| **Predictive**     | ML-forecasted demand (preview)           | Pre-scale before expected traffic spike                      |

### Autoscale Best Practices

- Set a **minimum instance count ≥ 2** for production HA
- Use a **cool-down period** (default 5 min) to avoid flapping
- Scale out aggressively, scale in conservatively (asymmetric rules)
- Monitor with [Azure Monitor autoscale diagnostics](https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-best-practices)

## Networking

| Component               | When to Use                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| **Azure Load Balancer** | Layer-4 (TCP/UDP) traffic distribution; most common for backend services |
| **Application Gateway** | Layer-7 (HTTP/HTTPS) with TLS termination, URL routing, WAF              |
| **No load balancer**    | Batch/HPC jobs where instances pull work from a queue                    |

## Cost Estimation Tips

- VMSS itself is **free** — cost is the sum of per-instance VM pricing
- Estimate at **min** and **max** instance counts for autoscale budgets
- Use **Spot instances** in VMSS for up to 90% savings on interruptible workloads
- Combine with **Reservations** or **Savings Plans** on the baseline instance count

## Key VMSS Limits

| Limit                                  | Value                              |
| -------------------------------------- | ---------------------------------- |
| Max instances per scale set            | 1,000 (marketplace/gallery images) |
| Max instances (managed image)          | 600                                |
| Scale sets per subscription per region | 2,500                              |
| Scale operations concurrency           | Up to 1,000 VMs in a single batch  |

## Further Reading

- [VMSS orchestration modes](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-orchestration-modes)
- [Autoscale best practices](https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-best-practices)
- [VMSS networking](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-networking)
- [VMSS Flexible portal quickstart](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/flexible-virtual-machine-scale-sets-portal)
