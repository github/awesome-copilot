---
name: qdrant-indexing-performance-optimization
description: "Diagnoses and fixes slow Qdrant indexing and data ingestion. Use when someone reports 'uploads are slow', 'indexing takes forever', 'optimizer is stuck', 'HNSW build time too long', or 'data uploaded but search is bad'. Also use when optimizer status shows errors, segments won't merge, or indexing threshold questions arise."
---

# What to Do When Qdrant Indexing Is Too Slow

Qdrant does NOT build HNSW indexes immediately. Small segments use brute-force until they exceed `indexing_threshold_kb` (default: 20 MB). Search during this window is slower by design, not a bug.

- Understand the indexing optimizer [Indexing optimizer](https://search.qdrant.tech/md/documentation/operations/optimizer/?s=indexing-optimizer)


## Uploads/Ingestion Too Slow

Use when: upload or upsert API calls are slow.
Identify bottleneck: client-side (network, batching) vs server-side (CPU, disk I/O)

For client-side, optimize batching and parallelism:

- Use batch upserts (64-256 points per request) [Points API](https://search.qdrant.tech/md/documentation/manage-data/points/?s=upload-points)
- Use 2-4 parallel upload streams

For server-side, optimize Qdrant configuration and indexing strategy:

- Create more shards (3-12), each shard has an independent update worker [Sharding](https://search.qdrant.tech/md/documentation/operations/distributed_deployment/?s=sharding)
- Create payload indexes before HNSW builds (needed for filterable vector index) [Payload index](https://search.qdrant.tech/md/documentation/manage-data/indexing/?s=payload-index)

Suitable for initial bulk load of large datasets:

- Disable HNSW during bulk load (set `indexing_threshold_kb` very high, restore after) [Collection params](https://search.qdrant.tech/md/documentation/manage-data/collections/?s=update-collection-parameters)
- Setting `m=0` to disable HNSW is legacy, use high `indexing_threshold_kb` instead

Careful, fast unindexed upload might temporarily use more RAM and degrade search performance until optimizer catches up.

See https://search.qdrant.tech/md/documentation/tutorials-develop/bulk-upload/


## Optimizer Stuck or Taking Too Long

Use when: optimizer running for hours, not finishing.

- Check actual progress via optimizations endpoint (v1.17+) [Optimization monitoring](https://search.qdrant.tech/md/documentation/operations/optimizer/?s=optimization-monitoring)
- Large merges and HNSW rebuilds legitimately take hours on big datasets
- Check CPU and disk I/O (HNSW is CPU-bound, merging is I/O-bound, HDD is not viable)
- If `optimizer_status` shows an error, check logs for disk full or corrupted segments


## HNSW Build Time Too High

Use when: HNSW index build dominates total indexing time.

- Reduce `m` (default 16, good for most cases, 32+ rarely needed) [HNSW params](https://search.qdrant.tech/md/documentation/manage-data/indexing/?s=vector-index)
- Reduce `ef_construct` (100-200 sufficient) [HNSW config](https://search.qdrant.tech/md/documentation/manage-data/collections/?s=indexing-vectors-in-hnsw)
- Keep `max_indexing_threads` proportional to CPU cores [Configuration](https://search.qdrant.tech/md/documentation/operations/configuration/)
- Use GPU for indexing [GPU indexing](https://search.qdrant.tech/md/documentation/operations/running-with-gpu/)

## HNSW index for multi-tenant collections

If you have a multi-tenant use case where all data is split by some payload field (e.g. `tenant_id`), you can avoid building a global HNSW index and instead rely on `payload_m` to build HNSW index only for subsets of data.
Skipping global HNSW index can significantly reduce indexing time.

See [Multi-tenant collections](https://search.qdrant.tech/md/documentation/manage-data/multitenancy/) for details.

## Additional Payload Indexes Are Too Slow

Qdrant builds extra HNSW links for all payload indexes to ensure that quality of filtered vector search does not degrade.
Some payload indexes (e.g. `text` fields with long texts) can have a very high number of unique values per point, which can lead to long HNSW build time.

You can disable building extra HNSW links for specific payload index and instead rely on slightly slower query-time strategies like ACORN.

Read more about disabling extra HNSW links in [documentation](https://search.qdrant.tech/md/documentation/manage-data/indexing/?s=disable-the-creation-of-extra-edges-for-payload-fields)

Read more about ACORN in [documentation](https://search.qdrant.tech/md/documentation/search/search/?s=acorn-search-algorithm)


## What NOT to Do

- Do not create payload indexes AFTER HNSW is built (breaks filterable vector index)
- Do not use `m=0` for bulk uploads into an existing collection, it might drop the existing HNSW and cause long reindexing 
- Do not upload one point at a time (per-request overhead dominates)
