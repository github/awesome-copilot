---
name: qdrant-minimize-latency
description: "Guides Qdrant query latency optimization. Use when someone asks 'search is slow', 'how to reduce latency', 'p99 is too high', 'tail latency', 'single query too slow', 'how to make search faster', or 'latency spikes'."
---

# Scaling for Query Latency

Latency of a single query is determined by the slowest component in the query execution path. It is sometimes correlated with throughput, but not always — throughput and latency are opposite tuning directions.

Low latency optimization is aimed at utilising maximum resource saturation for a single query, while throughput optimization is aimed at minimizing per-query resource usage to allow more parallel queries.

## Performance Tuning for Lower Latency

- Increase segment count to match CPU cores (`default_segment_number: 16`) [Minimizing latency](https://search.qdrant.tech/md/documentation/operations/optimize/?s=minimizing-latency)
- Keep quantized vectors and HNSW in RAM (`always_ram=true`)
- Reduce `hnsw_ef` at query time (trade recall for speed) [Search params](https://search.qdrant.tech/md/documentation/operations/optimize/?s=fine-tuning-search-parameters)
- Use local NVMe, avoid network-attached storage

## Memory Pressure and Latency

RAM is the most critical resource for latency. If working set exceeds available RAM, OS cache eviction causes severe, sustained latency degradation.

- Vertical scale RAM first. Critical if working set >80%.
- Use quantization: scalar (4x reduction) or binary (16x reduction) [Quantization](https://search.qdrant.tech/md/documentation/manage-data/quantization/)
- Move payload indexes to disk if filtering is infrequent [On-disk payload index](https://search.qdrant.tech/md/documentation/manage-data/indexing/?s=on-disk-payload-index)
- Set `optimizer_cpu_budget` to limit background optimization CPUs
- Schedule indexing: set high `indexing_threshold` during peak hours


## Vertical Scaling for Latency

More RAM and faster CPU directly reduce latency. See [Vertical Scaling](../scaling-data-volume/vertical-scaling/SKILL.md) for node sizing guidelines.


## What NOT to Do

- Do not expect to optimize latency and throughput simultaneously on the same node
- Do not use few large segments for latency-sensitive workloads (each segment takes longer to search)
- Do not run at >90% RAM (cache eviction causes severe latency degradation that can last days)
- Do not ignore optimizer status during performance debugging
- Do not scale down RAM without load testing (cache eviction causes days-long latency incidents)
