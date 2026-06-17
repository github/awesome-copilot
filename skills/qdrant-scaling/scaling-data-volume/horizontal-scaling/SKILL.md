---
name: qdrant-horizontal-scaling
description: "Diagnoses and guides Qdrant horizontal scaling decisions. Use when someone asks 'vertical or horizontal?', 'how many nodes?', 'how many shards?', 'how to add nodes', 'resharding', 'data doesn't fit', or 'need more capacity'. Also use when data growth outpaces current deployment."
---

# What to Do When Qdrant Needs More Capacity

Vertical first: simpler operations, no network overhead, good up to ~100M vectors per node depending on dimensions and quantization. Horizontal when: data exceeds single node capacity, need fault tolerance, need to isolate tenants, or IOPS-bound (more nodes = more independent IOPS).

## Most basic distributed configuration

- 3 nodes, 3 shards with `replication_factor: 2` for zero-downtime scaling

Minimum of 3 nodes is important for consensus and fault tolerance. With 3 nodes, you can lose 1 node without downtime. With 2 nodes, losing 1 node causes downtime for collection operations.
Replication factor of 2 means each shard has 1 replica, so you have 2 copies of data. This allows for zero-downtime scaling and maintenance. With `replication_factor: 1`, zero-downtime is not guaranteed even for point-level operations, and cluster maintenance requires downtime.

## Choosing number of shards

Shards are the unit of data distribution. 
More shards allows more nodes and better distribution, but adds overhead. Fewer shards reduces overhead but limits horizontal scaling.

For cluster of 3-6 nodes the recommended shard count is 6-12. 
This allows for 2-4 shards per node, which balances distribution and overhead. 

## Changing number of shards

Use when: shard count isn't evenly divisible by node count, causing uneven distribution, or need to rebalance.

Resharding is expensive and time-consuming, it should be used as a last resort if regular data distribution is not possible.
Resharding is designed to be transparent for user operations, updates and searches should still work during resharding with some small performance impact.

But resharding operation itself is time-consuming and requires to move large amounts of data between nodes.

- Available in Qdrant Cloud [Resharding](https://search.qdrant.tech/md/documentation/operations/distributed_deployment/?s=resharding)
- Resharding is not available for self-hosted deployments.

Better alternatives: over-provision shards initially, or spin up new cluster with correct config and migrate data.


## What NOT to Do

- Do not jump to horizontal before exhausting vertical (adds complexity for no gain)
- Do not set `shard_number` that isn't a multiple of node count (uneven distribution)
- Do not use `replication_factor: 1` in production if you need fault tolerance
- Do not add nodes without rebalancing shards (use shard move API to redistribute)
- Do not scale down RAM without load testing (cache eviction causes days-long latency incidents)
- Do not hit the collection limit by using one collection per tenant (use payload partitioning)
