# Evaluation and Improvement Design

Read when defining acceptance, checking quality claims, and diagnosing measurement. Scale the set to the task; the table does not require an LLM judge, separate service, or new customer questions.

## 1. Evaluation contract

For each significant criterion, specify `R/E-ID → property evaluated → input/state → source of correct answer (oracle) → checker/scorer → threshold and status → mandatory gate or diagnostic metric → behavior on failure/missing evaluation`.

| Axis | What to check |
|---|---|
| Task result | Domain correctness, completeness, grounds; actual external-system state and absence of unwanted changes if actions occurred |
| Mandatory action constraints | Permissions, data scope, permitted parameters, and order where required by contract |
| Human interaction | Clear output and limitations, honest reporting of missing data, correct waiting/cancellation, manual rework volume |
| Resources | Cost per accepted task, time, every retry/worker, and user labor |
| Evidence coverage | Cases, paths, and criteria actually evaluated; what remains unknown |

Do not offset a mandatory safety-boundary violation with a high average score. Define final admission: which gates must pass and which metrics guide tradeoffs. A correct alternative tool sequence is acceptable if it achieves the required outcome and respects mandatory constraints. A reference trajectory alone does not mandate order. A separate score's existence does not prove inclusion in the final gate.

Example: a report calculates a metric correctly but reads another tenant's data. Domain evaluation may pass, the access gate fails, and final admission is prohibited. Another report honestly states that data is missing: this is not calculation success, but may be a correct task outcome under the agreed rubric.

## 2. Measurement reliability

Separate agent error, environment/runner error, evaluator error, and missing evaluation. For each axis, show planned tasks/attempts, actually executed, evaluated, errors, and omissions with reasons; do not mix “task,” “attempt,” and “criterion.” Categories may overlap across axes, so state accounting rules. Missing evaluation is not success; an accepted fail-closed gate may block admission without attributing failure to the agent.

Example: of 100 executed tasks, a judge evaluated 60, accepted 57, and gave unparsable responses for 40. Confirmed: **57/60 = 95% among evaluated tasks, 60% coverage, 40 unknowns**. Do not claim 95% success overall; confirmed acceptance among all tasks is 57%. Next, localize omissions and check bias toward difficult cases. Do not count them automatically as successes or hide them by excluding them from the denominator.

Pin versions of the dataset, grader/rubric, model, prompts/skills, tools, environment, and material data. Check task feasibility, ambiguous/incorrect references, and evaluator calibration on known good/bad cases. After benchmark or grader changes, earlier numbers need comparability checks, a shared subset, or a new baseline. Keeping the benchmark name is insufficient.

For retries, explicitly describe attempt count, limits, aggregation, and uncertainty. `pass@k` asks whether at least one of k attempts succeeds; `pass^k` asks about consistent success across all k. Choose according to product needs: one successful attempt does not prove every run reliable. Do not calculate all-success probability by simply exponentiating an estimate without justified independence; retain individual attempt results. No universal minimum evaluation-set size exists.

Test real-gate sensitivity, bypasses, and negative controls under [diagnostic-review.md](diagnostic-review.md). Judge, parser, and reducer belong to the measurement system and can also fail. Model self-reported confidence is not an oracle.

## 3. Controlled improvement from feedback

The check execution, release, and Evidence Bundle loop is in [validation-loop.md](validation-loop.md). Telemetry becomes a diagnostic input and new test case; a signal alone does not authorize behavior changes.

For a significant change, make a brief card:

`case → first observable obligation violation → suspected mechanism → target component (method/context/tool/runtime/model/scorer) → protected invariants → change → comparison budget → independent validation → acceptance/rollback condition and owner`.

Use diagnosis to distinguish cause, propagation, and the check that missed the error. Correcting success reporting can limit harm while leaving cause open. Compare original and new versions under identical conditions; preserve successful regression cases and a holdout outside tuning. Bound iterations, spending, and stopping; do not optimize scores endlessly.

The optimized agent does not change its own admission criteria or private evaluation set to improve results. Correcting a faulty grader is allowed as a separate controlled measurement change with a new comparison basis. Do not tune on holdout; leakage requires new independent validation.

Admit a new prompt/tool/skill or memory version according to owner authority and accepted policy. Automatic acceptance is possible within a preauthorized scope when criteria pass; arbitrary publication from the improvement loop is not authorized. Separate proposed experiment, executed run, and measured effect. Finish with an accepted change and evidence, or a comparison result and specific remaining limitation.

## 4. Escalation and user labor

Use the decision map from [design.md](design.md). Include cases where human decisions are mandatory and cases where context/permissions already allow continuation. Count necessary performed and missed escalations, unnecessary requests, and requests lacking sufficient materials separately. Denominators come from labeled cases of the relevant class; one overall escalation rate does not show quality.

Measure active participation, waiting, manual rework, queue size/age, and completed useful tasks. Distinguish agent work, human availability, and flow scheduling. Faster generation with a growing unreviewed backlog is not improvement of the whole process. Fewer confirmations do not justify bypassing mandatory authority.

Paired example: drafting from accessible sources within authorized scope completes without repeated permission for every read; publication needs an exact preview and valid approval. “Enough questions” ends the interview, not authorizes publication. After a decision arrives, the agent continues authorized work rather than stopping at “interview complete.”

## 5. Long horizon and continuation

For long-running work, compare equivalent tasks in a fresh session, after relevant/distracting history accumulates, after compaction, handoff, and crash/resume. Vary conditions to distinguish these transitions; retain task versions, data, settings, evaluators, and total budget. History length and task duration are different factors. More hours of autonomy is not a goal in itself.

Measure domain outcome, preservation of goals/constraints/sources, procedure versions, effect state and current authority, lost progress, rework, time, and cost. For checkpoints, use [execution-continuity.md](execution-continuity.md). A minimized short example that passes may remove the failure condition; it does not refute a long-run failure. Improvement after a fresh session localizes a condition but does not yet establish mechanism.

Show separate outcomes and coverage for each mode. Label test design, execution on a fixture, and confirmation on the actual runtime separately. Risk and budget determine sample size and acceptable degradation, not a fixed textbook percentage.
