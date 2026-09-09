---
name: katalon-test-estimation
description: Estimate testing effort, duration, and resourcing for a Katalon True Platform/TestOps cycle. Use when the question is how long testing will take, how many testers it needs, whether the scope fits the sprint window, or what a scope change costs in person-hours. Sizes design, manual execution, automated execution and triage, and rework separately, counts the countable part from platform data (case counts, automation split, historical pass and stability rates, configuration matrix), calibrates the rest against a rate the team supplies, and returns a three-point range with a confidence label instead of a single number. Splits resourcing across the manual and automated lanes and names the assumptions that would move the number most. For what to test and in what order, use katalon-test-plan; for a verdict on a cycle that has already run, use katalon-release-analyze. Written for the test lead sizing a cycle before it starts and the test manager who has to fund it.
---

# Katalon Test Estimation

Use this skill for the **estimation** half of the planning stage: turn a scoped cycle into person-hours, a date, and a headcount. The output is a **range with a confidence label**, never a single number. `katalon-test-plan` decides what gets tested; this skill decides what that costs.

## Availability Boundary

State this before producing any number.

**The Katalon MCP can count the work. It cannot measure the effort.**

- **Available via MCP:** case and suite counts (`find_test_cases`, `read_test_suite`, `find_test_cases_by_requirement`), uncovered requirements (`fetch_requirement_data`), automated/manual split when exposed (`fetch_test_case_data`), failure and flake rates (`fetch_test_stability_data`, `find_test_results`), the configuration matrix (`fetch_test_configuration_data`), the cycle window (`find_iterations`), and a past execution's machine-recorded elapsed time (`read_execution`, `read_execution_test_results`).
- **Not available at all:** how long a person takes. No tool books effort against a case, a run, or a person. A manual run's open and close timestamps are calendar elapsed, not work.
- **Also not available:** team roster, capacity, PTO, or working calendar; any cost or rate model; a field to write the estimate back into; any cross-cycle aggregate such as average cycle duration.
- **Looks like MCP data but is not:** session concurrency. `list_test_cloud_environments` and `find_execution_profiles` list environments and profiles, not the number of parallel sessions the plan allows. Tag it team-supplied.
- **Field-level rule:** read one record with `read_execution` and confirm the elapsed-time field is present before modelling on it. If it is absent, ask for the figure and label it team-supplied. Never let a missing field become a zero.

The consequence: **every per-unit rate is team-supplied and must be tagged as such in the output.** Read `references/mcp-evidence-map.md` for the full signal-to-tool map and the human-input checklist.

## Estimation Workflow

```text
+------------------+     +---------------------+     +----------------------+
| Fix the scope    | --> | Count from platform | --> | Get the rates (human)|
+------------------+     +---------------------+     +----------------------+
        |                          |                            |
        v                          v                            v
+------------------+     +---------------------+     +----------------------+
| Size five buckets| --> | Three-point + band  | --> | Resource the lanes   |
+------------------+     +---------------------+     +----------------------+
                                                                |
                                                                v
                                                     +----------------------+
                                                     | State the uncertainty|
                                                     +----------------------+
```

## Steps and tool rules

1. **Fix the scope, or refuse.** An estimate of an unfixed scope is theatre. Resolve project and repository (`list_projects`, `list_repositories`), bind the cycle window with `find_iterations`, and get the release, sprint, folder, or suite in writing. If scope is still moving, produce the model with the scope stated as an assumption and force confidence to Low.
2. **Count the countable part.** Never estimate what the platform can count. `fetch_requirement_data` for uncovered requirements, `find_test_cases` and `read_test_suite` for case counts, `fetch_test_case_data` for the automated/manual split when available, `fetch_test_configuration_data` for the matrix multiplier, `fetch_test_stability_data` for the flake burden. If a result set is paginated or truncated, say so rather than reporting a partial count as a total.
3. **Read one comparable execution.** Pick the closest finished cycle with the human, then `read_execution` and `read_execution_test_results` on it. Extract pass rate and, if the field is present, automated elapsed time. This is your only platform-side calibration, and it is n=1. Say so.
4. **Get the rates from the human.** Manual execution minutes per case, design minutes per new case, triage minutes per failing result, automation authoring hours per case, productive hours per tester per day, fixed-overhead percentage, session concurrency. Rank the sources: measured in this project on a recent comparable cycle beats team declaration beats an industry default. Tag each with its source and the date it was last measured.
5. **Size five buckets separately.** Design, manual execution, automated execution and triage, automation authoring, fixed overhead. A bucket deliberately out of scope is recorded as zero **with the reason**, never dropped.
6. **Three-point every bucket.** Optimistic, most likely, pessimistic. PERT mean is `(O + 4M + P) / 6`; standard deviation is `(P - O) / 6`. Combine independent buckets by summing the means and root-sum-squaring the deviations. Report the 80 percent band as `mean +/- 1.28 SD`, rounded outward.
7. **Resource both lanes, and keep the units apart.** Manual work is person-hours. Automated execution is **wall clock**, bounded by session concurrency, and its human cost is triage rather than running. Run-with-AI is wall clock plus review time. Never add wall clock to person-hours.
8. **Answer the question that was asked.** Fixed date gives headcount. Fixed team gives a date. Show both directions and name the serialized part that no extra person can shorten - usually triage and reporting, which cannot start before execution ends.
9. **State the uncertainty honestly.** Confidence label, the two or three assumptions that move the number most with their sensitivity in hours, what is excluded, and the one measurement that would raise confidence a level. Read `references/estimation-model.md` for the confidence rubric before choosing the label.

## The five buckets

Most people say "estimate the test cycle" and mean bucket B alone. Sizing only B is the most common way a test estimate comes in low.

- **A. Design** new coverage - person-hours, driven by uncovered requirements x cases per requirement.
- **B. Manual execution** - person-hours, driven by manual case count x configurations in the manual matrix.
- **C. Automated execution and triage** - wall clock for the run, person-hours for the triage of what fails.
- **D. Automation authoring** - person-hours, driven by the cases selected for automation.
- **E. Fixed overhead** - a percentage of A+B+C+D, typically 10 to 20 percent.

Three rules govern them:

- A bucket that is out of scope is **recorded as zero with the reason**. Silence reads as forgetting.
- **Rework is not a sixth bucket.** Retest of failures lives inside B, triage of failures inside C. Modelling it separately double-counts.
- Exploratory or session-based testing, when the cycle includes it, is **timeboxed rather than estimated**. Add the timebox as a stated line, not as a derived figure.

Read `references/estimation-model.md` for the arithmetic, the rework multiplier, and the resourcing corrections before sizing any bucket.

## Output format

```text
Estimate: <scope name>
Confidence: High | Medium | Low     Basis: <where the rate came from, when measured>

Person-hours (PERT mean, with O / M / P):
  A Design new coverage        <h>   (<O> / <M> / <P>)
  B Manual execution           <h>   (<O> / <M> / <P>)
  C Automated triage           <h>   (<O> / <M> / <P>)
  D Automation authoring       <h>   or 0 - <reason for exclusion>
  E Fixed overhead (<n>%)      <h>
  ---------------------------------------------------
  Total                        <h>   80% band <low> - <high> h

Wall clock (not effort):
  <n> h for a full automated pass at <k> parallel sessions x <c> configurations

Resourcing:
  Fixed window <d> working days  -> <n> testers at the mean, <n> at P80
  Fixed team   <n> testers       -> <d> working days at the mean
  Serialized   <what cannot be parallelized, and how much of the window it needs>

Assumptions that move the number most:
  1. <driver> - a <n>% miss moves the total by <h> h
  2. ...

Excluded from this estimate:
  - <bucket or scope> - <reason>

Evidence:
  MCP   <tool> -> <figure>
  Team  <figure> -> <who supplied it, when last measured>
```

## Never do

- Never emit a single number. Mean, band, and confidence label, always.
- Never quote more precision than the inputs carry. A rate of "about 20 minutes" produces "about 80 hours", not 81.1.
- Never turn person-hours into a date without stating productive hours per day and the serialized portion.
- Never treat automated elapsed time as person-effort, or a manual run's open duration as work.
- Never let missing platform data become zero. A bucket with no data is an unknown with a stated range.
- Never re-estimate to hit a date. If the number does not fit, cut scope or add people, re-run the model, and say which lever was pulled.
- Never invent production traffic, change frequency, defect rates, or team velocity the MCP does not return. If the human supplies them, use them and cite the source.

## Worked example

**Input, verbatim from the user**

> How long will it take us to test release 3.2 of Cellphone Shop, and how many testers do I need?

**Step 1, inputs with provenance.** Every line is tagged. Nothing untagged enters the model.

| Input | Value | Source |
|---|---|---|
| Cycle window | 2026-08-17 to 2026-08-28, 10 working days | MCP `find_iterations` |
| In-scope requirements | 34, of which 26 have coverage and 8 have none | MCP `fetch_requirement_data` |
| Cases linked to covered requirements | 187 | MCP `find_test_cases_by_requirement` |
| Cases in the release folder | 214 (187 linked + 27 unlinked regression) | MCP `find_test_cases`, full page, not truncated |
| Automated / manual split | 96 / 118 | MCP `fetch_test_case_data` |
| Unstable cases, last 30 days | 11 | MCP `fetch_test_stability_data` |
| Automated pass rate, sprint 3.1 | 91% | MCP `read_execution_test_results` on the sprint 3.1 execution |
| Target configuration matrix | Chrome, Safari, Android Chrome. Automated covers all 3, manual covers Chrome only | MCP `fetch_test_configuration_data` |
| Sprint 3.1 automated elapsed | 41 min for 96 results | MCP `read_execution`, elapsed field confirmed present on the record |
| Session concurrency | 4 parallel TestCloud sessions | **Team-supplied.** TestCloud plan, not an MCP field |
| Manual execution rate | 18 min per case, median | **Team-supplied.** Measured on sprint 3.1 |
| Manual design rate | 25 min per new case | **Team-supplied.** Team declaration |
| New cases per uncovered requirement | 4 | **Team-supplied.** Team's own historical ratio |
| Triage rate | 20 min per failing result | **Team-supplied.** Team declaration |
| Productive hours per tester per day | 6 | **Team-supplied** |
| Fixed overhead | 15% | **Team-supplied** |
| Automation authoring this cycle | deferred | **Team decision** |

**Step 2, the arithmetic, reproducible.**

**A. Design new coverage.** 8 uncovered x 4 new cases = 32 cases. 32 x 25 min = 800 min = **13.3 h** most likely. O 10.0, P 22.0.
PERT = (10.0 + 4 x 13.3 + 22.0) / 6 = 85.2 / 6 = **14.2 h**. SD = (22.0 - 10.0) / 6 = **2.00 h**.

**B. Manual execution, one pass, Chrome only.** 118 existing manual + 32 new = 150 cases. 150 x 18 min = 2700 min = **45.0 h** most likely. O 37.0, P 63.0.
PERT = (37.0 + 180.0 + 63.0) / 6 = 280.0 / 6 = **46.7 h**. SD = (63.0 - 37.0) / 6 = **4.33 h**.

**C. Automated execution and triage.** 96 automated x 3 configurations = 288 results. At 91% pass, about 26 fail. 26 x 20 min = 520 min = **8.7 h** most likely. O 5.0, P 18.0 - the pessimistic branch is wide because the 11 unstable cases run on all 3 configurations and are the likeliest contributors.
PERT = (5.0 + 34.8 + 18.0) / 6 = 57.8 / 6 = **9.6 h**. SD = (18.0 - 5.0) / 6 = **2.17 h**.
Wall clock, tracked separately and never added to person-hours: 3 x 41 min = 123 min = **2.1 h** at 4 parallel sessions.

**D. Automation authoring.** **0 h**, excluded by team decision this cycle. Recorded, not dropped.

**E. Fixed overhead.** 15% of (14.2 + 46.7 + 9.6 = 70.5) = **10.6 h**.

**Total.** 70.5 + 10.6 = **81.1 h**.
Combined SD = sqrt(2.00^2 + 4.33^2 + 2.17^2) = sqrt(27.46) = 5.24 h, scaled by the 15% overhead = **6.03 h**.
80 percent band = 81.1 +/- 1.28 x 6.03 = 81.1 +/- 7.7, rounded outward = **73 to 89 person-hours**.

**Expected output**

```text
Estimate: Cellphone Shop, release 3.2 test cycle
Confidence: Medium     Basis: manual rate measured on sprint 3.1 in this project, n=1

Person-hours (PERT mean, with O / M / P):
  A Design new coverage       14.2 h   (10.0 / 13.3 / 22.0)
  B Manual execution          46.7 h   (37.0 / 45.0 / 63.0)
  C Automated triage           9.6 h   ( 5.0 /  8.7 / 18.0)
  D Automation authoring       0.0 h   excluded - team deferred authoring this cycle
  E Fixed overhead (15%)      10.6 h
  ---------------------------------------------------
  Total                       81.1 h   80% band 73 - 89 h

Wall clock (not effort):
  2.1 h for a full automated pass at 4 parallel sessions x 3 configurations

Resourcing:
  Fixed window 10 working days -> 1.4 testers at the mean, 1.5 at P80
  Fixed team   2 manual testers -> 7 working days at the mean
  Serialized   triage cannot start before execution ends - reserve the last 2 days

Assumptions that move the number most:
  1. Manual execution rate, 18 min per case - a 25% miss moves the total by 11.7 h,
     which is wider than the entire design bucket's 80% band
  2. New cases per uncovered requirement, 4 - a 50% miss moves the total by 7.1 h
  3. Session concurrency, 4 - halving it doubles wall clock but changes person-hours by 0

Excluded from this estimate:
  - Automation authoring - team deferred it this cycle
  - Manual execution on Safari and Android Chrome - matrix currently Chrome only
  - Any money figure - the platform holds no rate

Evidence:
  MCP   fetch_requirement_data -> 34 in scope, 8 uncovered
  MCP   find_test_cases -> 214 cases in the release folder
  MCP   fetch_test_case_data -> 96 automated / 118 manual
  MCP   fetch_test_stability_data -> 11 unstable in 30 days
  MCP   read_execution_test_results -> 91% pass on sprint 3.1
  MCP   fetch_test_configuration_data -> 3 target configurations
  Team  18 min per manual case -> measured by the team on sprint 3.1
  Team  4 parallel sessions -> TestCloud plan, not an MCP field
```

**What the reader should take from it.** The listed scope needs **2 manual testers, not 3**. The third tester is not funding the listed scope; the exposure sits in the two exclusions. Sizing the first one on request - adding Safari to the manual lane at a team-supplied 0.7 repeat-pass factor is 150 x 18 min x 0.7 = 31.5 h, which with overhead takes the total from 81 h to about 117 h. That is 19.6 person-days instead of 13.5, so sustained headcount goes from 1.4 to 2.0 and the cycle costs **about 6 extra person-days**. Android Chrome and the P80 branch are what the third tester actually covers. The point is not the number, it is that the third seat is now a decision with a price on it rather than a habit.

## Prompt recipes

- `How long will it take us to test release 3.2, and how many people do I need?`
- `If we add the Safari and Android configurations, what does that cost us in tester days?`
- `We have 2 testers and the sprint ends on the 28th. Does the release 3.2 scope fit, and what would I have to cut?`
- `Size the testing effort for the 8 uncovered requirements in Cellphone Shop, and tell me which assumption you are least sure about.`

## Hand-offs

- Scope not yet fixed or ranked -> `katalon-test-plan`. Estimate only what that skill has already scoped.
- The plan of record for the estimated scope -> `katalon-test-plan`, whose folder + suite is where the estimate should be recorded, since the platform has no field for it.
- The uncovered requirements this estimate sized -> `katalon-create-test-cases`.
- Automation authoring effort, when it is in scope -> `katalon-test-case-to-playwright` for the per-case shape.
- Flake burden behind the triage bucket -> `katalon-test-maintenance`, and `katalon-analyze-failures` for a specific red run.
- The verdict once the estimated cycle has run -> `katalon-release-analyze`.

Read `references/estimation-model.md` before sizing any bucket, and `references/mcp-evidence-map.md` before claiming any figure came from the platform. Read the orchestrator `katalon-true-platform-testing/references/unavailable-capabilities.md` when the user asks whether Katalon can hold the estimate itself.
