---
name: katalon-test-reporting
description: Report Katalon True Platform/TestOps quality metrics to people outside QA. Use when you need to answer a stakeholder question with testing data, choose the few metrics that actually answer it, trend coverage, execution health, defect risk and stability across several releases, sprints, or iterations rather than inside one, and write the summary a manager presents upward at a steering committee, an exec review, or a quality business review. Produces a headline answer with the named specifics behind it, never a metric dump. The MCP returns current state with no history tool, so trends are built from execution dates plus snapshots this skill stores per period. For the ship or no-ship call on a single release, use katalon-release-analyze; for a pre-pipeline suite verdict, use katalon-test-review. Written for the test manager who has to present quality upward and the test lead who assembles the numbers.
---

# Katalon Test Reporting

Use this skill when someone outside QA asks a question about quality and the answer has to survive being asked where it came from. It reads the **analyze** stage and feeds the **plan** stage. The output is an **answer with the named specifics behind it**, never a metric dump. `katalon-release-analyze` judges one release; this skill reports the direction across several and writes what a manager says out loud.

## Availability Boundary

State the boundary before promising a report, because most of what "reporting" normally means is not an MCP call.

- **Available via MCP.** The metric surface: `fetch_requirement_data` (coverage status), `fetch_test_case_data` (case quality signals), `fetch_test_stability_data` (flakiness), `fetch_test_configuration_data` (configuration coverage), `fetch_defect_data` (defect status and context), `find_test_results` / `read_execution` / `read_execution_test_results` (execution history, and the only data that carries its own dates), `find_iterations` (the period spine), and `list_projects` / `list_repositories` / `find_test_suites` / `read_test_suite` / `find_test_cases` to establish what each number is counted over.
- **Not directly available, and no tool exists to add.**
  - **No trend or aggregation tool.** Nothing in the MCP returns a series, an average, or a delta. Every trend here is assembled by looping periods yourself.
  - **No point-in-time read.** Every `fetch_*_data` tool returns *current* state. You cannot ask what requirement coverage was at release 3.0. Only execution records carry dates.
  - **No dashboard, chart, or report entity.** Dashboards are a TestOps UI surface. This skill writes text and a snapshot file, nothing else.
  - **No publishing surface.** The MCP cannot post to Slack, Confluence, email, or a deck. Hand the written brief back to the user and let them place it.
  - **No Release or Build entity.** Bind periods to iterations via `find_iterations`, or to explicit date ranges. Never to a release object.
  - **No escaped-defect flag.** `fetch_defect_data` returns status and context, not whether a defect reached production. Ask the user which ALM field classifies it. If there is none, report "defects opened after the release run" and label it as a proxy.
  - **No effort, cost, headcount, or cycle-time data.** That is the `katalon-test-estimation` gap. Say so and stop. Never estimate effort from test counts.
  - **No custom fields or tags.** Any team dimension (component, squad, product line) has to come from folder or suite structure, or from the user.
- **The workaround that makes trending real.** A **snapshot file** written on every run, plus the execution-dated series that needs no snapshot. See `references/snapshot-and-trend.md`. The first run establishes a baseline and says so instead of inferring a direction.

## Reporting Workflow

```text
+----------------------+     +----------------------+     +----------------------+
| Get the question     | --> | Choose <= 5 metrics  | --> | Pull per period      |
| and the audience     |     | that answer it       |     | iterations or dates  |
+----------------------+     +----------------------+     +----------------------+
                                                                     |
                                                                     v
+----------------------+     +----------------------+     +----------------------+
| Write the brief      | <-- | Name what moved it   | <-- | Compare to snapshot  |
| answer + specifics   |     | reqs, suites, defects|     | then write a new one |
+----------------------+     +----------------------+     +----------------------+
```

## Steps and tool rules

1. **Get the question and the audience before calling a tool.** Who is asking, what decision are they making, and what will they do differently depending on the answer. If the user says only "a status report", ask which of the four questions in `references/metric-selection.md` they are actually being asked. A report written without a question is a metric dump by construction, and no amount of formatting fixes it later.
2. **Choose at most five metrics.** Pick from `references/metric-selection.md` against the question, and justify each in one clause. Everything the question does not need is cut, however cheap it is to fetch. Five is a hard cap, not a target.
3. **Fix the period spine.** `find_iterations` gives sprints and iterations with dates. Otherwise use explicit date ranges. Three to six periods; fewer than three cannot show a direction. State the spine in the report, because two different spines produce two different trends from the same data.
4. **Pull per period.** Resolve scope with `list_projects` then `list_repositories`. For execution-dated metrics, call `find_test_results` and `read_execution` once per period. For current-state metrics, call each `fetch_*_data` tool **once**, they have no period parameter, and calling them repeatedly returns the same answer.
5. **Compare against the snapshot, then write a new one.** Read the prior snapshot for this project and question. Current-state metrics can only be trended against it. If none exists, this run is the baseline. Write the new snapshot before writing the brief so a crash mid-report still leaves the next run better off.
6. **Name what moved the number.** Every trend line gets a named cause: a requirement key, a suite name, a defect id, a configuration. If you cannot name one, report the number as unexplained and say so. A trend with no named cause is not an answer to anything.
7. **Write the brief in the format below**, and hand it back as text. Do not claim to have published it anywhere.

## Choosing the few metrics

The question decides the metrics. Short map here; full definitions, exact derivation from each MCP return, and the anti-patterns are in `references/metric-selection.md`.

| The stakeholder actually asked | Report these, nothing else | From |
|---|---|---|
| Is quality getting better or worse | pass-rate trend, open critical defect trend, flaky-case count trend | `find_test_results`, `read_execution`, `fetch_defect_data`, `fetch_test_stability_data` |
| Are we testing the right things | requirement coverage percent, uncovered critical requirements **by key**, configuration coverage against the target matrix | `fetch_requirement_data`, `find_test_cases_by_requirement`, `fetch_test_configuration_data` |
| Can we trust the results we are being shown | flaky-case count and trend, cases with erratic recent history, share of failures already triaged to a defect | `fetch_test_stability_data`, `find_test_results`, `fetch_defect_data` |
| Where should the next investment go | coverage gap by area, flakiness concentration by suite, defect concentration by area | `fetch_requirement_data`, `fetch_test_stability_data`, `fetch_defect_data`, `read_test_suite` |

Three rules that keep this from becoming a dump:

- **Five metrics, hard cap.** If a metric would not change the decision, it does not go in. Offer it as available on request instead.
- **Every number carries its denominator and its date.** "82 percent" is not a metric. "50 of 61 in-scope requirements, as of the 2026-08-08 run" is.
- **A metric with no decision attached is deleted, not demoted to an appendix.** An appendix is where a dump hides.

## Trending without a history tool

Two classes of data, and they are not equally trendable. Confusing them is how a report invents history it never had.

| Data class | Metrics | Trendable how | Honesty rule |
|---|---|---|---|
| **Execution-dated** | pass rate, failure counts, run counts, results per suite | directly, from `find_test_results` and `read_execution` over per-period date ranges | trendable on the very first run |
| **Current-state** | requirement coverage, stability, configuration coverage, defect standing, case quality | only against snapshots written by earlier runs of this skill | first run reports **baseline established, no trend yet**. Never infer a direction from one reading |

Rules:

- **Never present a two-point difference as a trend.** Two points are a change. Three or more are a direction. Say which one you have.
- **Never backfill a snapshot you did not take.** If the user wants four sprints of coverage history and the first snapshot is from last week, report execution-dated metrics across all four and coverage from the snapshot date forward, and state the split.
- **A metric that moved less than its own noise did not move.** `references/snapshot-and-trend.md` gives the noise floor per metric.

## Report format

```text
Answer:        <one sentence answering the question that was actually asked>
Direction:     Improving | Flat | Degrading | Baseline only
Period spine:  <what the periods are, how many, and their dates>
Confidence:    High | Medium | Low  (<the one thing that limits it>)

What moved it:
- <metric, from X to Y across N periods> because <named requirement, suite, or defect>

Named specifics:
- <requirement key / suite name / defect id> -> <what it is doing to the number>

Not in this report:
- <the boundary that matters to this audience, in their words>

The ask:
- <the single decision or resource this report is requesting>
```

Rules on the format:

- **`Answer` comes first and is one sentence.** If it needs two, the question was two questions; split the report or pick one.
- **`The ask` is mandatory.** A report to a steering committee with nothing to decide wastes the slot. If there is genuinely no ask, write "no decision needed, informational" and mean it.
- **`Not in this report` is where the boundary lands in the audience's language**, not in MCP tool names. "We do not track how long a fix takes" beats "no cycle-time tool".
- **Every named specific is a real key returned by the platform.** Never invent a requirement key, suite name, or defect id to make a sentence land.

## Worked example

**Input, verbatim from the user**

> I present to the steering committee on Thursday. Project Cellphone Shop, last four sprints. Are we getting better or worse, and what do I tell them?

**Step 1, question and audience.** Question is *is quality getting better or worse*. Audience is a steering committee, so the report needs a direction and an ask, not a table.

**Step 2, metrics chosen.** Three, not five: pass-rate trend, open critical defect trend, flaky-case count. Requirement coverage is deliberately cut, it answers a different question and the user did not ask it. Configuration coverage is cut for the same reason.

**Step 3, period spine.**

```text
list_projects            -> Cellphone Shop (id 41207)
list_repositories        -> Cellphone Shop Web (id 8891)
find_iterations(41207)   -> Sprint 12  2026-05-19 .. 2026-06-01
                            Sprint 13  2026-06-02 .. 2026-06-15
                            Sprint 14  2026-06-16 .. 2026-06-29
                            Sprint 15  2026-06-30 .. 2026-07-13
```

Four periods. Enough for a direction.

**Step 4, pull per period.**

```text
find_test_results(repo 8891, 2026-05-19..2026-06-01) -> 214 results, 176 passed, 38 failed
find_test_results(repo 8891, 2026-06-02..2026-06-15) -> 221 results, 189 passed, 32 failed
find_test_results(repo 8891, 2026-06-16..2026-06-29) -> 218 results, 194 passed, 24 failed
find_test_results(repo 8891, 2026-06-30..2026-07-13) -> 226 results, 208 passed, 18 failed
fetch_defect_data(repo 8891)          -> open 14, of which critical 3, high 6; reopened 2
fetch_test_stability_data(repo 8891)  -> 9 cases below the stability threshold,
                                         6 of them in "Checkout Regression"
```

**Step 5, compare against the snapshot.** `.katalon-reporting/cellphone-shop.json` exists from the run of 2026-06-16 and holds `open_critical_defects: 7`, `flaky_cases: 11`. Pass rate needs no snapshot because the results carry their own dates.

**Step 6, name the causes.** `read_test_suite` on the six flaky cases resolves them to **Checkout Regression**. `fetch_defect_data` names the three open criticals as **CEL-241**, **CEL-258**, **CEL-263**, all in checkout.

**Expected output**

```text
Answer:        Quality is improving on every metric we track, but the entire remaining
               risk is concentrated in checkout.
Direction:     Improving
Period spine:  Sprints 12-15, 2026-05-19 to 2026-07-13, four periods from find_iterations
Confidence:    Medium (defect and flakiness history starts 2026-06-16, the date of our
               first snapshot; pass rate covers all four sprints)

What moved it:
- Pass rate 82.2% -> 92.0% across four sprints (176/214 -> 208/226) because the checkout
  failures that dominated Sprint 12 were fixed in Sprint 14
- Open critical defects 7 -> 3 since 2026-06-16, two points not four, so a change and not
  yet a direction
- Flaky cases 11 -> 9 since 2026-06-16, which is inside the noise floor and should be read
  as flat, not improving

Named specifics:
- Checkout Regression suite -> holds 6 of the 9 flaky cases, so the suite most people
  watch is the one they can trust least
- CEL-241, CEL-258, CEL-263 -> all three remaining open criticals, all in checkout
- Sprint 15 -> 18 failures, the lowest of the four, and none in the smoke core

Not in this report:
- Whether any of these defects reached a customer. We do not have that classification
  in the platform and nobody has told us which field carries it
- How much effort the improvement cost. We do not track effort

The ask:
- One sprint of dedicated work on Checkout Regression. It is 6 of our 9 unreliable cases
  and 3 of our 3 open critical defects, and it is the flow the committee cares about.
```

Note what the example does **not** do: it does not report requirement coverage (not asked), it does not call the flaky improvement real (inside the noise floor), it does not claim a direction on defects (two points), and it does not claim any defect escaped to a customer (no such field). Each of those is a place a metric dump would have said more and meant less.

## Prompt recipes

- `Cellphone Shop, last four sprints, is quality getting better or worse? I present to the steering committee Thursday.`
- `Trend requirement coverage and defect risk across the last three releases and tell me where the next tester should go.`
- `Write the quality section of the QBR for this project. One page, and I need an ask at the end.`
- `Can I trust the numbers in our last release report? Show me flakiness and how much of it is untriaged.`

## Hand-offs

- Ship or no-ship on one release -> `katalon-release-analyze`.
- Suite verdict before the pipeline -> `katalon-test-review`.
- Orphan requirements and traceability detail behind a coverage number -> `katalon-test-management`.
- Repairing the flaky cases this report named -> `katalon-test-maintenance`.
- Turning an ask into next cycle's scope -> `katalon-test-plan`.
- Effort, headcount, or duration questions -> not built. Say so and stop.

Read `references/metric-selection.md` before choosing metrics and `references/snapshot-and-trend.md` before claiming any trend. Consult the orchestrator's `katalon-true-platform-testing/references/unavailable-capabilities.md` when the user asks whether the platform can report X.
