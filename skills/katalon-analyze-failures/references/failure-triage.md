# Failure triage reference

## Classification signals

| Bucket | Typical signals | Action |
|---|---|---|
| Product defect | assertion on real app behavior failed; unexpected app error/state; reproducible across runs and environments | file defect (with failed result ID) |
| Automation defect | element-not-found / locator error; timing / wait failure; stale test data; step no longer matches UI; passes on re-run without app change | route to `katalon-test-maintenance` |
| Environment / data | infra/network error; account/permission; missing fixture; wrong AUT state; TestCloud/agent issue | fix environment, then re-run |

Reproducibility is the strongest signal: a failure that repeats across environments and runs leans product; one that vanishes on re-run leans automation/environment.

## Clustering

Group by the tuple `(failing step, error message, object/locator)`. One cluster = one candidate root cause = at most one defect. Report the cluster size so a single bug is not filed N times.

## Defect filing rules

- Only for **product defects**, only when the user asked (or explicitly pre-approved failure filing).
- Requires a **failed test result ID** — get it from `read_test_result` / `read_execution_test_results`.
- `find_alm_integration_projects` first if the ALM project/integration IDs are unknown.
- `fetch_defect_data` to check for an existing defect before creating a duplicate.
- Never invent a stack trace, defect ID, or ALM project. If the ID or integration is missing, report blocked with the exact missing input.

## Report template

```text
Cluster 1 — <signature>   (N cases)
  Classification: product | automation | environment
  Likely cause:   <one line from result data>
  Cases:          <ids>
  Action:         file DEF-xxx | repair (maintenance) | re-run after <fix>
```
