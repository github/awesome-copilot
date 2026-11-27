# Sizing & Parallelism Reference

## Tier Hardware Specs

| Tier | vCPU | RAM | Bandwidth | Max Parallelism | Kafka Partitions | Use case |
|------|------|-----|-----------|-----------------|------------------|----------|
| SP2  | 0.25 | 512MB | 50 Mbps | 1 | 32 | Minimal filtering, testing |
| SP5  | 0.5 | 1GB | 125 Mbps | 2 | 64 | Simple filtering and routing |
| SP10 | 1 | 2GB | 200 Mbps | 8 | Unlimited | Moderate workloads, joins, grouping |
| SP30 | 2 | 8GB | 750 Mbps | 16 | Unlimited | Windows, JavaScript UDFs, production |
| SP50 | 8 | 32GB | 2500 Mbps | 64 | Unlimited | High throughput, large window state |

**Memory rule:** 20% is reserved for overhead. User state (window accumulation, sort buffers) must stay below 80% of tier RAM. Exceeding this causes OOM failure.

## How Parallelism Works

Every stage in a pipeline runs with default `parallelism: 1`. This base level is included in your tier at no additional cost.

When you need higher throughput for specific stages, increase their parallelism beyond 1. **Only values > 1 count toward your tier's maximum.**

Stages that commonly benefit from parallelism:
- `$merge` — concurrent writes to Atlas
- `$lookup` — concurrent reads for enrichment
- `$https` — concurrent API calls

## Parallelism Calculation

**Formula:** `Total Parallelism = sum of (parallelism - 1) for all stages where parallelism > 1`

### Tier Selection Algorithm

```
If Total Parallelism = 0:   → SP2  (max 1)
If Total Parallelism = 1:   → SP5  (max 2)
If Total Parallelism ≤ 8:   → SP10 (max 8)
If Total Parallelism ≤ 16:  → SP30 (max 16)
If Total Parallelism ≤ 64:  → SP50 (max 64)
```

### Worked Examples

**Simple pipeline (all parallelism = 1):**
```
$source:    parallelism = 1  (does not count)
$match:     parallelism = 1  (does not count)
$merge:     parallelism = 1  (does not count)

Total = 0 → SP2
```

**Medium pipeline:**
```
$source:    parallelism = 1  (does not count)
$match:     parallelism = 1  (does not count)
$lookup:    parallelism = 4  (counts as 3)
$merge:     parallelism = 4  (counts as 3)

Total = 3 + 3 = 6 → SP10 (max 8)
```

**Complex pipeline:**
```
$source:    parallelism = 1  (does not count)
$https:     parallelism = 6  (counts as 5)
$merge:     parallelism = 8  (counts as 7)

Total = 5 + 7 = 12 → SP30 (max 16)
```

### API Error for Parallelism Exceeded

If you specify a tier too small for the pipeline's parallelism, the API returns:
```
"Operator parallelism requested exceeds limit for this tier.
(Requested: X, Limit: Y). Minimum tier for this workload: SPxx or larger."
```

Solution: Use `atlas-streams-manage` → `stop-processor`, then `start-processor` with a higher `tier` value.

## Complexity-Based Tier Selection

When parallelism is all default (1), choose tier based on pipeline complexity:

| Pipeline feature | Complexity weight | Suggested tier (advisory) |
|-----------------|-------------------|--------------|
| Simple `$match` + `$project` only | Low | SP2-SP5 |
| `$addFields` with expressions | Low-Medium | SP5-SP10 |
| `$lookup` or `$https` enrichment | Medium | SP10 |
| `$group` aggregation | Medium | SP10 |
| `$tumblingWindow` or `$hoppingWindow` | Medium-High | SP10-SP30 |
| `$sessionWindow` | High | SP30 |
| `$function` (JavaScript UDFs) | High | SP30+ |
| Large window state (many unique keys) | Very High | SP30-SP50 |
| Multiple windows or chained enrichment | Very High | SP50 |

### Complexity Scoring Heuristic

For automated tier recommendation, score the pipeline:

| Feature | Points |
|---------|--------|
| `$function` (JavaScript) | +40 |
| Window operations (`$tumblingWindow`, `$hoppingWindow`, `$sessionWindow`) | +30 |
| `$lookup` or `$https` enrichment | +20 |
| `$group` aggregation | +15 |
| Kafka source integration | +15 |
| `$sort` operations | +10 |
| Pipeline has 5+ stages | +5 |
| Pipeline has 8+ stages | +10 |
| Pipeline has 12+ stages | +20 |

**Score → Tier mapping:**
- 0-10: SP2
- 11-20: SP5
- 21-40: SP10
- 41-60: SP30
- 61+: SP50

**Tier selection:** the parallelism calculation sets the minimum tier. Use the complexity score only to decide whether to add headroom (usually one tier up); do not go below the parallelism-derived tier.

## Billing

Charges are **per-hour, calculated per-second**, only while the processor is running.

- `start-processor` begins billing
- `stop-processor` stops billing
- Stopped processors retain state for 45 days at no charge

**What's included in the tier price:**
- Compute (vCPU and RAM)
- State storage
- Base parallelism (parallelism = 1 for all stages)

**Additional costs (separate from tier):**
- Data transfer egress (varies by cloud provider and transfer type: intra-region, inter-region, internet)
- VPC Peering (AWS and GCP)
- Private Link connectivity

For current pricing: https://www.mongodb.com/docs/atlas/billing/stream-processing-costs/?utm_source=agent-skills

## Sizing Workflow with MCP Tools

### Phase 1: Pre-deployment estimate

1. Score the pipeline using the complexity heuristic above
2. Calculate parallelism needs using the formula
3. Take the higher recommendation
4. Start with that tier (or one tier lower for cost savings during testing)

### Phase 2: Validation

1. Deploy the processor: `atlas-streams-build` → `resource: "processor"` with `autoStart: true`
2. Let it run for a representative period
3. Check stats: `atlas-streams-discover` → `diagnose-processor`
4. Review `memoryUsageBytes`:
   - Below 50% of tier RAM → over-provisioned, consider downsizing
   - 50-70% → good fit
   - 70-80% → at limit, monitor closely
   - Above 80% → under-provisioned, upgrade before it OOMs

### Phase 3: Optimization

1. Stop processor: `atlas-streams-manage` → `stop-processor`
2. Restart with adjusted tier: `atlas-streams-manage` → `start-processor` with `tier` override
3. Monitor for another period
4. Repeat until right-sized

### Cost Optimization: Time-of-Day Strategy

For workloads with predictable traffic patterns, adjust tiers by time of day:

| Period | Tier | Rationale |
|--------|------|-----------|
| Peak hours (business hours) | SP30-SP50 | Handle full volume |
| Off-peak hours | SP10-SP30 | Reduced volume |
| Maintenance windows | SP2-SP10 | Minimal processing |

To change tiers: `stop-processor` → `start-processor` with new `tier` value. Note: `resumeFromCheckpoint: true` (default) preserves state across tier changes.
