---
name: qdrant-scaling
description: "Guides Qdrant scaling decisions. Use when someone asks 'how many nodes do I need', 'data doesn't fit on one node', 'need more throughput', 'cluster is slow', 'too many tenants', 'vertical or horizontal', 'how to shard', or 'need to add capacity'."
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Qdrant Scaling

First determine what you're scaling for:

- data volume
- query throughput (QPS)
- query latency
- query volume

After determining the scaling goal, we can choose scaling strategy based on tradeoffs and assumptions.
Each pulls toward different strategies. Scaling for throughput and latency are opposite tuning directions.


## Scaling Data Volume

This becomes relevant when volume of the dataset exceeds the capacity of a single node.
Read more about scaling for data volume in [Scaling Data Volume](scaling-data-volume/SKILL.md)


## Scaling for Query Throughput

If your system needs to handle more parallel queries than a single node can handle,
 then you need to scale for query throughput.

Read more about scaling for query throughput in [Scaling for Query Throughput](scaling-qps/SKILL.md)

## Scaling for Query Latency

Latency of a single query is determined by the slowest component in the query execution path.
It is in sometimes correlated with throughput, but not always. It might require different strategies for scaling.

Read more about scaling for query latency in [Scaling for Query Latency](minimize-latency/SKILL.md)


## Scaling for Query Volume

By query volume we understand the amount of results that a single query returns. 
If the query volume is too high, it can cause performance issues and increase latency.

Tuning for query volume is opposite might require special strategies. 

Read more about scaling for query volume in [Scaling for Query Volume](scaling-query-volume/SKILL.md)
