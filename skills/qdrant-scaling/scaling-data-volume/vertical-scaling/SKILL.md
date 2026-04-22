---
name: qdrant-vertical-scaling
description: "Guides Qdrant vertical scaling decisions. Use when someone asks 'how to scale up a node', 'need more RAM', 'upgrade node size', 'vertical scaling', 'resize cluster', 'scale up vs scale out', or when memory/CPU is insufficient on current nodes. Also use when someone wants to avoid the complexity of horizontal scaling."
---

# What to Do When Qdrant Needs to Scale Vertically

Vertical scaling means increasing CPU, RAM, or disk on existing nodes rather than adding more nodes. This is the recommended first step before considering horizontal scaling. Vertical scaling is simpler, avoids distributed system complexity, and is reversible.

- Vertical scaling for Qdrant Cloud is done through the [Qdrant Cloud Console](https://cloud.qdrant.io/)
- For self-hosted deployments, resize the underlying VM or container resources

## When to Scale Vertically

Use when: current node resources (RAM, CPU, disk) are insufficient, but the workload doesn't yet require distribution.

- RAM usage approaching 80% of available memory (OS page cache eviction starts, severe performance degradation)
- CPU saturation during query serving or indexing
- Disk space running low for on-disk vectors and payloads
- A single node can handle up to ~100M vectors depending on dimensions and quantization
- For non-production workloads, which are tolerant to single-point-of-failure and don't require high availability


## How to Scale Vertically in Qdrant Cloud

Vertical scaling is managed through the Qdrant Cloud Console.

- Log into [Qdrant Cloud Console](https://cloud.qdrant.io/) or use [CLI tool](https://github.com/qdrant/qcloud-cli)
- Select the cluster to resize
- Choose a larger node configuration (more RAM, CPU, or both)
- The upgrade process involves a rolling restart with no downtime if replication is configured
- Ensure `replication_factor: 2` or higher before resizing to maintain availability during the rolling restart

**Important:** Scaling up is straightforward. Scaling down requires care -- if the working set no longer fits in RAM after downsizing, performance will degrade severely due to cache eviction. Always load test before scaling down.


## RAM Sizing Guidelines

RAM is the most critical resource for Qdrant performance. Use these guidelines to right-size.

- Exact estimation of RAM usage is difficult; use this simple approximate formula: `num_vectors * dimensions * 4 bytes * 1.5` for full-precision vectors in RAM
- With scalar quantization: divide by 4 (INT8 reduces each float32 to 1 byte) [Quantization](https://search.qdrant.tech/md/documentation/manage-data/quantization/)
- With binary quantization: divide by 32 [Binary quantization](https://search.qdrant.tech/md/documentation/manage-data/quantization/?s=binary-quantization)
- Add overhead for HNSW index (~20-30% of vector data), payload indexes, and WAL
- Reserve 20% headroom for optimizer operations and OS cache
- Monitor actual usage via Grafana/Prometheus before and after resizing [Monitoring](../../../qdrant-monitoring/SKILL.md)


## When Vertical Scaling Is No Longer Enough

Recognize these signals that it's time to go horizontal:

- Data volume exceeds what a single node can hold even with quantization and mmap
- IOPS are saturated (more nodes = more independent disk I/O)
- Need fault tolerance (requires replication across nodes)
- Need tenant isolation via dedicated shards
- Single-node CPU is maxed and query latency is unacceptable
- Next vertical scaling step is the largest available node size. You might need to be able to temporarily scale up to the larger node size to do batch operations or recovery. If you are already at the largest node size, you won't be able to do that.

When you hit these limits, see [Horizontal Scaling](../horizontal-scaling/SKILL.md) for guidance on sharding and node planning.


## What NOT to Do

- Do not scale down RAM without load testing first (cache eviction = severe latency degradation that can last days)
- Do not ignore the 80% RAM threshold (performance cliff, not gradual degradation)
- Do not skip replication before resizing in Cloud (rolling restart without replicas = downtime)
- Do not jump to horizontal scaling before exhausting vertical options (adds permanent operational complexity)
- Do not assume more CPU always helps (IOPS-bound workloads won't improve with more cores)