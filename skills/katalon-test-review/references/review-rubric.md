# Review rubric reference

## Three review lenses (all MCP-backed)

| Lens | Tools | What to flag |
|---|---|---|
| Coverage | `fetch_requirement_data`, `find_test_cases_by_requirement`, `fetch_test_configuration_data` | orphan requirements; under-covered browsers/platforms/OS |
| Quality | `fetch_test_case_data`, `read_test_case` | non-atomic cases; missing negative/boundary variants; vague or non-observable expected results; duplicate coverage |
| Reliability | `fetch_test_stability_data`, `find_test_results` | probabilistically flaky cases; cases with erratic recent history; long-broken cases |

## Verdict decision table

| Coverage | Flaky in critical path | Verdict |
|---|---|---|
| meets plan | none | Approve |
| meets plan | some non-critical | Approve with fixes |
| minor gaps | none | Approve with fixes |
| critical orphan reqs | any | Reject for pipeline |
| any | flaky in smoke/regression core | Reject for pipeline |

## Output template

```text
Verdict:        Approve | Approve with fixes | Reject for pipeline
Coverage:       reqs covered X/Y; configs covered A/B; orphans: <list>
Quality flags:  <case: reason>
Reliability:    flaky: <case: stability signal>
Fix list:       <case -> action -> owner hint>
Risk if shipped as-is: <one line>
```

## Boundaries

- Case code, locators, and object maintainability are Studio-side — say so; do not claim to have reviewed script internals via MCP.
- "Probabilistic flakiness" is a platform signal read through `fetch_test_stability_data`; report it, do not recompute it.
