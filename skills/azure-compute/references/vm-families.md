# VM Family Guide

Select a VM family by matching the user's workload to the right category. Families describe hardware intent — not individual SKUs.

> **Source**: [Azure VM sizes overview](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview)
>
> **Note:** This reference may become stale. Before making final recommendations, verify critical specifications (especially Spot VM support, newer series availability, and specific family capabilities) by fetching the relevant learn.microsoft.com documentation.

## Family Selection Table

| Workload                             | Family                | Series                             | Why                                                   |
| ------------------------------------ | --------------------- | ---------------------------------- | ----------------------------------------------------- |
| Web servers, dev/test, microservices | **General Purpose**   | D-series (Dsv5, Ddsv5, Dasv5)      | Balanced CPU:memory ratio                             |
| Burstable / intermittent loads       | **General Purpose**   | B-series (Bsv2, Basv2)             | Low baseline CPU, credits for bursts; cheapest option |
| CI/CD, batch, gaming servers         | **Compute Optimized** | F-series (Fsv2, Fasv6)             | High CPU:memory ratio                                 |
| Relational DBs, in-memory caches     | **Memory Optimized**  | E-series (Esv5, Edsv5, Easv5)      | High memory:CPU ratio                                 |
| SAP HANA, very large DBs             | **Memory Optimized**  | M-series (Msv3, Mdsv3)             | Extreme memory (up to 4 TB)                           |
| Big Data, NoSQL, data warehousing    | **Storage Optimized** | L-series (Lsv3, Lasv3)             | High disk throughput and IOPS                         |
| ML training, inference, rendering    | **GPU**               | NC-series (NCadsH100v5, NCasT4v3)  | NVIDIA GPU compute                                    |
| Large-scale AI/ML training           | **GPU**               | ND-series (ND_MI300X_v5, NDH100v5) | Multi-GPU, high memory                                |
| Virtual desktop, cloud gaming        | **GPU**               | NV-series (NVadsA10v5)             | GPU graphics/visualization                            |
| Cloud gaming, VDI (AMD GPU)          | **GPU**               | NG-series (NGadsV620v1)            | AMD Radeon GPU; cost-effective graphics               |
| Confidential workloads               | **Confidential**      | DC-series (DCasv5, DCadsv5)        | Hardware-based TEE isolation                          |
| Confidential + encrypted memory      | **Confidential**      | EC-series (ECasv5, ECadsv5)        | TEE isolation with memory encryption                  |
| CFD, weather simulation, FEA         | **HPC**               | HB/HC-series (HBv4, HBv5)          | InfiniBand, high memory bandwidth                     |
| EDA, large memory HPC                | **HPC**               | HX-series                          | Very large memory capacity                            |

## Decision Tree

```text
Workload needs GPU?
├─ Yes → training/inference? → NC/ND-series
│        visualization/VDI?  → NV/NG-series
├─ No
│  ├─ Confidential computing? → DC/EC-series
│  ├─ HPC (MPI, InfiniBand)? → HB/HC/HX-series
│  ├─ High disk I/O (NoSQL, warehousing)? → L-series
│  ├─ Memory-heavy (DB, cache, SAP)?
│  │  ├─ Extreme (>1 TB RAM) → M-series
│  │  └─ Standard → E-series
│  ├─ CPU-heavy (batch, CI/CD)? → F-series
│  ├─ Burstable / dev-test? → B-series
│  └─ Balanced / general web → D-series
```

## Key Trade-offs

| Choice                    | Pro                              | Con                                            |
| ------------------------- | -------------------------------- | ---------------------------------------------- |
| B-series (burstable)      | Lowest cost                      | Throttled when credits exhausted               |
| AMD (`a` suffix) vs Intel | ~5–15% cheaper                   | Some workloads assume Intel extensions         |
| ARM (`p` suffix, Cobalt)  | Best price-performance for Linux | Windows not supported; check app compatibility |
| Previous-gen (v4, v3)     | Sometimes cheaper                | Not recommended for new deployments            |
| Spot VMs                  | Up to 90% discount               | Can be evicted with 30s notice                 |

## Naming Convention

`Standard_<Family><Subfamily?><vCPUs><Features>_<Version>`

| Letter | Meaning                   |
| ------ | ------------------------- |
| `a`    | AMD CPU                   |
| `p`    | ARM (Cobalt/Ampere) CPU   |
| `d`    | Local temp disk           |
| `s`    | Premium SSD capable       |
| `l`    | Low memory per core       |
| `i`    | Isolated (dedicated host) |
| `b`    | Block storage perf        |

Example: `Standard_D4as_v5` → D-family, AMD, 4 vCPUs, premium SSD, version 5.
