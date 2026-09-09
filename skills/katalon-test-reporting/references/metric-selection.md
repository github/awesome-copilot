# Metric selection reference

The point of this file is subtraction. Every metric below is available; almost none of them belong in any single report.

## The four questions

Almost every request that reaches this skill is one of four questions wearing different clothes. Identify which one before choosing anything.

| Question | What the asker will do with the answer | Metrics that answer it | Metrics that do not |
|---|---|---|---|
| **Is quality getting better or worse** | decide whether the current approach continues | pass-rate trend, open critical defect trend, flaky-case trend | requirement coverage (measures effort, not outcome), case counts |
| **Are we testing the right things** | decide where testers go next | requirement coverage percent, uncovered critical requirements by key, configuration coverage vs the target matrix | pass rate (a suite testing the wrong things passes beautifully) |
| **Can we trust the results** | decide whether to believe the last report | flaky-case count and trend, cases with erratic history, share of failures triaged to a defect | total test count, pass rate |
| **Where should the next investment go** | allocate people or budget | gap and flakiness and defect concentration, each by area or suite | anything aggregate; concentration is the whole point |

If the request is genuinely two questions, write two reports or ask which one matters on Thursday. A report that answers two questions answers neither.

## Metric definitions, and exactly what each can claim

| Metric | Derived from | Claims | Does **not** claim |
|---|---|---|---|
| **Pass rate** | `find_test_results` over a date range; passed / total | how the suite behaved in that window | that the product is good. A narrow suite passes easily |
| **Requirement coverage** | `fetch_requirement_data`; covered / in-scope. Confirm with `find_test_cases_by_requirement` before naming a requirement uncovered | that a linked case exists | that the case is good, or that it passed. Link is not evidence |
| **Uncovered critical requirements** | the uncovered set from `fetch_requirement_data`, filtered by the requirement's own priority | the specific keys nobody is testing | completeness, if requirement priority is not maintained in the ALM |
| **Open critical defects** | `fetch_defect_data`, filtered to critical and high | current standing risk | escape to production. There is no such field |
| **Flaky cases** | `fetch_test_stability_data`, cases below the platform's stability threshold | that the platform's own signal flags them | a computed flake rate. Report the platform's signal; never recompute it |
| **Erratic history** | `find_test_results` per case across periods; alternating outcomes with no code change | a case whose result is not information | a cause. Hand to `katalon-test-maintenance` |
| **Configuration coverage** | `fetch_test_configuration_data` vs a target matrix the user supplies | which combinations were exercised | which combinations matter. The target matrix is an input, not a platform fact |
| **Triage share** | failures from `find_test_results` that have a linked defect in `fetch_defect_data` | how much of the red is understood | that the untriaged remainder is benign |
| **Concentration** | any metric above, grouped by suite via `read_test_suite` or by folder via `find_test_folders` | where the problem lives | a root cause |

## Anti-patterns

Each of these has appeared in a real QA status report and each one is a dump wearing a suit.

- **Total test count.** Grows with copy-paste. Correlates with nothing a stakeholder cares about. If someone asks for it, give it and say what it does not mean.
- **Automation percentage without a denominator.** 60 percent of what, and did the manual 40 percent get run.
- **Pass rate with no scope.** A pass rate over "all results" mixes a smoke run with a full regression and means nothing.
- **A coverage percentage with no uncovered list.** The percentage is the least useful part; the names are the report.
- **Defect counts with no severity split.** Twenty cosmetic defects and three criticals are not comparable, and summing them hides the three.
- **Any metric presented without a date.** Current-state fetches are read at report time, not at period end. Say when.
- **A trend line with no named cause.** This is the specific failure `katalon-test-review` calls a metric dump. If the cause cannot be named, report the number as unexplained.

## The subtraction test

Before a metric goes in the report, answer: *if this number were removed, would the reader make a different decision?* If no, cut it. Applied honestly this usually leaves two or three metrics, which is the right size for a slide someone reads out loud.
