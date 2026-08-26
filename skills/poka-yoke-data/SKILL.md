---
name: poka-yoke-data
description: >-
  Pipelines, warehouses, dbt models and metrics, where failure is silently wrong numbers rather than a crash. Use when "the dashboard is wrong", "the numbers do not match", "add data quality checks", "safe backfill", or an upstream schema change broke a join. Covers freshness, row-count and null-rate assertions, data contracts, reconciliation. For a crash rather than wrong numbers use audit.
license: MIT
---

# Poka-Yoke for Data

Data systems fail differently from application code, and that difference determines every
device here. An application bug throws an exception, pages someone, and gets fixed. A data bug
produces a number. The number looks fine. Someone makes a decision with it. Three weeks later
a person notices revenue looks odd, and now you have three weeks of decisions to unwind and no
way to know which were wrong.

**In data, silence is the defect.** A pipeline that fails loudly is working correctly. A
pipeline that succeeds while producing garbage is the thing to design against, so most
devices here are about converting silent wrongness into loud failure, which in Shingo's terms
is buying yourself a Warning rung where you currently have nothing at all.

## The four questions

Run these over any table or model. They map onto the standard lenses but the data-specific
phrasing is what finds things.

**Is it there?** *(freshness)*, Did the data arrive at all, and recently enough to be worth
trusting? A stale table is the most dangerous artifact in a warehouse because it looks
completely healthy. Every table needs a max-age assertion, and dashboards should surface
last-updated rather than hiding it.

**Is there the right amount?** *(volume, fixed-value lens)*, Row counts against expectation.
This catches the breakages that leave every individual row looking fine: a partial load, a
filter that silently matched nothing, a join that fanned out 100x. Assert both a floor and a
ceiling, and compare against the same weekday historically rather than against yesterday: most business data is weekly-seasonal and a naive day-over-day check will cry wolf every
Monday.

**Is it shaped right?** *(schema and validity, contact lens)*, Types, nullability, accepted
value sets, ranges. Negative quantities, percentages above 100, timestamps in the future,
currency codes that don't exist, a `status` value nobody has seen before.

**Does it agree?** *(reconciliation)*, Does the warehouse total match the source system?
Does the sum of the parts match the whole? This is the only check that catches a logic error
the data still looks well-shaped after, everything above validates shape, and a wrong `JOIN`
produces perfectly well-shaped, wrong data. It catches what moves a total, not a
mis-attribution that nets out. If you install one device, install this one on your
revenue-critical tables.

## Devices, strongest first

### Constraints at the write, not tests after it

Where the warehouse supports it, `NOT NULL`, `UNIQUE`, `CHECK`, and primary keys are Control:
the bad row cannot be written. A dbt test is Detection: the bad row is already in the table
and possibly already in a dashboard. Prefer the constraint; use the test where the engine
gives you nothing better, which in several columnar warehouses is most of the time, say so
explicitly rather than pretending a test is prevention.

### Data contracts at the boundary

The most common pipeline break is upstream changing a column without telling anyone. A
contract makes that break loud and attributable:

- The producer declares the schema, types, nullability, and semantics; changes go through
  versioning rather than through a surprise.
- The consumer validates on ingest and **quarantines** rather than dropping. Silently dropping
  malformed rows is the data equivalent of `except: pass`: the pipeline goes green while the
  numbers go wrong. Route bad rows to a dead-letter table with the reason, alert on the rate,
  and keep them for inspection.
- Additive changes are safe; renames and type narrowing are breaking. Treat a rename as a drop
  plus an add, because that is what downstream experiences.

### Idempotent, resumable loads

Every incremental job should be safe to re-run over the same window. Pipelines get retried, by the scheduler, by an on-call engineer, by a backfill, and a non-idempotent load
double-counts, which is a silently wrong number of exactly the worst kind.

The device: partition-level replace, or `MERGE` on a real business key, rather than blind
`INSERT`. Then a re-run converges rather than accumulating.

### Backfills that cannot run away

Backfills are the data world's destructive operation. Before running one:

- Bound it explicitly: a date range with both ends, never open-ended.
- Batch it, with progress recorded, so a failure at 80% resumes rather than restarts.
- Write to a staging table and swap atomically, so consumers never see a half-populated table.
- Dry-run first, printing the partitions and row counts it will touch.
- Know the rollback: if the backfill is wrong, what restores the previous state? If the answer
  is "nothing", make a snapshot first. That snapshot *is* the device.

### One definition per metric

If "active user" is defined in the dashboard, the model, and an analyst's spreadsheet, you have
three metrics with one name and they will disagree, usually in a meeting. Define each metric
once, in version-controlled code, and have every consumer reference that definition. A metric
redefined in a BI tool is a copy that will silently drift.

### Assertions in the pipeline, not beside it

The check must be able to **stop the pipeline**, not just report. A test suite that runs after
publication and emails a failure lets bad data reach the dashboard, which is the whole problem.
Assert between load and publish: build to staging, test staging, promote only on pass. That
ordering is the single most valuable structural change in most warehouses, and it costs no new
tooling.

## Auditing a pipeline

Read the DAG or the model files and work outward from what matters:

1. **Which tables feed decisions or money?** Start there; coverage everywhere is not the goal.
2. **For each: freshness, volume, uniqueness on the key, null rate on required columns,
   reconciliation to source.** Which exist? Which can actually block publication?
3. **Where are rows silently dropped?** Inner joins that should be left joins, `WHERE` clauses
   filtering nulls, try/except around row parsing, `on_error='ignore'`. Each is a place the
   count quietly shrinks.
4. **What happens on re-run?** Trace one job. Does it double-count?
5. **What happens when upstream adds or renames a column?** Break, or silently produce nulls?
6. **Is anything in a dashboard that isn't in version control?**

Report with the structure from `audit`, and be explicit about the rung, in data,
most devices you can actually install are Warning or Detection, and claiming Control for a
dbt test overstates the protection.

## The tone that matters here

When numbers have been wrong, the instinct is to find who wrote the bad join. Same rule as
everywhere else in this plugin: the finding is that the pipeline could produce a wrong number
without anyone noticing. That is a missing assertion, not a missing person.
