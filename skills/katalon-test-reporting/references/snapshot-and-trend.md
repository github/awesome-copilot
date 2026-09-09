# Snapshot and trend reference

The Katalon MCP has **no trend tool, no aggregation tool, and no point-in-time read**. Every `fetch_*_data` tool returns current state. This file is how a trend gets built anyway, honestly.

## Two classes of data

| Class | Metrics | Why |
|---|---|---|
| **Execution-dated** | pass rate, failure counts, run counts, results per suite | `find_test_results` and `read_execution` return records that carry their own timestamps, so history is already there. Trendable on the first run |
| **Current-state** | requirement coverage, stability, configuration coverage, defect standing, case-quality signals | the `fetch_*_data` tools take no date parameter and return only now. History exists only if this skill wrote it down |

Never mix the two in one trend line without saying so. A four-sprint pass-rate trend beside a one-week coverage delta is two different claims sharing a bullet.

## The snapshot file

Written on every run, to `.katalon-reporting/<project-slug>.json` in the user's workspace. Plain JSON, appended to, never rewritten. Ask before creating the directory the first time.

```json
{
  "project": "Cellphone Shop",
  "project_id": 41207,
  "repository_id": 8891,
  "snapshots": [
    {
      "taken_at": "2026-06-16",
      "period_label": "Sprint 14 start",
      "requirement_coverage": { "covered": 44, "in_scope": 61 },
      "uncovered_critical": ["CEL-88", "CEL-102"],
      "defects": { "open": 22, "critical": 7, "high": 9, "reopened": 4 },
      "flaky_cases": 11,
      "configuration_coverage": { "tested": 6, "target": 9 },
      "source_tools": ["fetch_requirement_data", "fetch_defect_data",
                       "fetch_test_stability_data", "fetch_test_configuration_data"]
    }
  ]
}
```

Rules:

- **Write the snapshot before writing the brief.** A run that dies mid-report should still have improved the next one.
- **Record `taken_at` as the date the fetch happened**, never the period it is being attributed to. They are different, and pretending otherwise is how a report acquires history it never had.
- **Record `source_tools`.** A later reader has to be able to tell which numbers came from where.
- **Never edit a past snapshot.** If one was wrong, add a new entry with a note. Rewriting history in a file whose only job is history defeats the file.

## The period loop

1. `find_iterations(project_id)` for the spine. If the team does not use iterations, take explicit date ranges from the user.
2. For each period, call the execution-dated tools with that period's range.
3. Call each current-state tool **once**, not per period. They have no period parameter and repeated calls return the same answer.
4. Read the snapshot file and align its entries to the spine by `taken_at`.
5. Append the new snapshot.

Three to six periods. Fewer than three cannot show a direction; more than six is a chart, and this skill writes prose.

## Noise floors

A metric that moved less than its noise floor did not move. These are working defaults; if the team has its own, use theirs and say so.

| Metric | Treat as flat when |
|---|---|
| Pass rate | the change is under 2 percentage points, or the run count changed by more than 20 percent between periods |
| Flaky-case count | the change is 2 cases or fewer |
| Open defect count | the change is under 15 percent, or is fully explained by a triage sweep rather than by fixes |
| Requirement coverage | the change is under 2 percentage points, or the in-scope denominator changed |

**The denominator rule outranks all of them.** If the denominator moved — requirements added, suite re-scoped, a repository split — the metric is not comparable across that boundary. Say the denominator changed and report the periods separately. This is the single most common way a quality trend lies.

## Language for what you actually have

| What you have | Say |
|---|---|
| one reading | "baseline established, no trend yet" |
| two readings | "changed from X to Y" — a change, not a direction |
| three or more, same denominator | "improving / degrading / flat across N periods" |
| three or more, denominator moved | "not comparable across <boundary>; here is each side" |
| a move inside the noise floor | "flat" |
| a move with no identifiable cause | "moved from X to Y, cause not identified in the platform data" |
