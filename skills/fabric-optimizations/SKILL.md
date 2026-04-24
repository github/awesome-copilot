---
name: fabric-optimizations
description: 'End-to-end Microsoft Fabric performance and cost optimization guidance across Delta layout (VORDER, ZORDER, OPTIMIZE, VACUUM), Spark and workspace settings, pipelines, SQL serving, and observability. Use when reducing runtime, latency, or spend across Fabric data workloads.'
metadata:
  author: nielsvdc
  version: "1.0"
---

# Fabric optimization on Microsoft Fabric

This skill provides practical optimization guidance across Fabric workloads, including Delta layout, Spark and notebooks, orchestration, SQL serving, and observability.

For layer boundaries, silver staging, gold naming, and architectural decisions, use `fabric-medallion-architecture`.

## Quick triage

Use this sequence to avoid tuning the wrong layer first:

1. Identify the bottleneck category: storage layout, compute, orchestration, SQL serving, or semantic-model consumption.
2. Capture a baseline metric: runtime, data scanned, cost, or end-user latency.
3. Apply one optimization family at a time and compare against baseline.
4. Keep only changes with measurable improvement.

## Delta optimization per layer (VORDER, ZORDER, and VACUUM)

Use these defaults for **Lakehouse Delta tables**. `OPTIMIZEDWRITE` is enabled by default and applies to every Delta layer, so it is not listed here.


| Layer       | VORDER             | ZORDER                               | Run VACUUM?                 | Why                                                                                                               |
| ----------- | ------------------ | ------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Landing** | N/A                | N/A                                  | No                          | Landing stores files in `Files/`, not Delta tables                                                                |
| **Bronze**  | Disabled           | Disabled                             | Yes, conservative retention | Bronze is append-heavy and replay/audit focused; avoid layout-heavy optimization, but clean obsolete files safely |
| **Silver**  | Disabled (default) | Selective (query-hot tables only)    | Yes                         | Silver has frequent MERGE/SCD activity; optimize only where predicates are stable and repeated                    |
| **Gold**    | Enabled            | Enabled on high-value filter columns | Yes                         | Gold is read-heavy for BI/analytics; layout optimizations improve scan performance                                |


## Guardrails

- **VORDER**: enable primarily in gold. In silver, enable only for stable, query-hot tables with clear read gains. Measure before flipping on a whole layer.
- **ZORDER**: use columns commonly used in filters and joins; do not ZORDER on high-cardinality/noisy columns without measured benefit. Re-evaluate after schema or query-pattern changes.
- **VACUUM**: always respect retention and recovery requirements. Keep longer retention in bronze (audit/replay); tighter retention is usually acceptable in gold after validation. Never VACUUM below the retention needed for time-travel guarantees your team depends on.
- **OPTIMIZE cadence**: run after large MERGE / backfill operations in silver and gold. Avoid running on every pipeline — batch it on a schedule proportionate to write volume.

## Spark and notebook optimization

- Prefer narrow transformations before wide shuffles (join/aggregate) to reduce spill and shuffle volume.
- Filter early, project only required columns, and avoid repeated scans of the same large source in one notebook.
- Cache only reused intermediate dataframes; unpersist when done.
- Tune partitioning intentionally: too few partitions underutilize compute; too many increase task overhead.
- For skewed joins, detect hot keys and apply skew-handling patterns before scaling compute blindly.
- Keep notebook stages idempotent so failed runs can restart safely without expensive full reruns.

### Workspace Spark settings optimization

- Set autoscale minimums and maximums per workload class (ETL, ad-hoc analysis, data science) so short jobs are not over-provisioned and long jobs are not starved.
- Standardize default executor sizing and dynamic allocation behavior at workspace level to reduce per-notebook drift.
- Tune default shuffle/partition settings based on typical dataset size and join patterns; validate with runtime and spill metrics.
- Define environment defaults by persona (engineering vs analytics) instead of one global profile for all workloads.
- Review concurrency and session timeout settings to balance interactive responsiveness against cluster churn and cost.
- Revisit workspace defaults quarterly or after major workload changes; stale defaults are a common source of gradual cost creep.

## Pipeline and orchestration optimization

- Optimize end-to-end critical path, not isolated activity durations.
- Parallelize independent branches; serialize only true dependencies.
- Use incremental processing and watermarking where possible to avoid repeated full-load work.
- Add retry policies with bounded backoff for transient failures, then alert on persistent failures.
- Push expensive reusable logic into shared tables/views instead of repeating transformations in many pipelines.

## Warehouse and SQL endpoint optimization

- Design for query patterns: partitioning, clustering, and indexing choices should match dominant filters/joins.
- Reduce repeated complex joins in BI by publishing curated serving tables for frequent access patterns.
- Review query plans for top slow queries and remove anti-patterns (unbounded scans, unnecessary cross joins, broad select star usage in serving queries).
- Apply workload isolation and scheduling so heavy refresh jobs do not starve interactive consumers.

## Consumption and semantic-model optimization (non-DAX)

- Keep gold tables at analysis-ready grain to minimize report-time transformations.
- Prefer stable, reusable serving tables over many report-specific table variants.
- Align refresh cadence to business need; over-refreshing is a common hidden cost driver.
- Use Direct Lake or import mode intentionally based on latency, scale, and concurrency behavior.

## Observability and optimization loop

- Track a small optimization scoreboard per workload: runtime, cost, data scanned, refresh SLA, and failure rate.
- Tag optimization changes to correlate deployments with metric shifts.
- Regressions should trigger rollback or reassessment, not additional blind tuning.
- Revalidate periodically because workload shape changes over time.

## When this skill does NOT apply

- Layer boundaries, silver staging, gold naming → use `fabric-medallion-architecture`.
- Detailed Power BI DAX formula design and model semantics (calc groups, RLS policy design).
- Deep engine-specific troubleshooting requiring product support traces.
- Real-time streaming architecture design beyond the listed optimization guardrails.

## Related Skills

- `fabric-medallion-architecture` — Use for medallion layer boundaries, silver staging strategy, and gold naming and contract decisions.
- `fabric-lakehouse` — Lakehouse concepts, OneLake, shortcuts, access control.
