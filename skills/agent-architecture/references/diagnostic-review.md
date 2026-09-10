# Failure Diagnosis and Fix Review

Apply to observed failures and regressions. For an unimplemented architecture, use the same questions as a paper scenario check: a risk forecast, not reproduction. This procedure refines the audit; it does not authorize agent changes or external actions. Perform available safe reads yourself; express unavailable tests as a concrete plan with expected outcomes.

## 1. Record the case and knowledge boundary

Build a brief card: task/acceptance criterion → expected result → actual result → input/material state → versions/recent changes → available events/artifacts → impact. Identify provenance: user report, inspected code, trace, executed check. Do not call a retold trace your own observation.

A brief retelling or prompt fragment does not prove the full instruction, skill, or another component lacks a domain method. Do not make its incompleteness a separate Important finding without confirming the real execution path. It is a hypothesis to check; record a demonstrated output/validator defect independently.

Record known failure count and total examined cases; do not extrapolate available traces to others. Separately check that “successful” cases really meet the domain criterion. No trace means cause unknown; it does not yet prove system-wide absence of logging.

Build a short chain from externally observable data: input → selected method and actually loaded context → tool request/response → transformations → saved output → check → user response. Find the first **observable** discrepancy. Error origin may be earlier; downstream emptiness and the validator that missed it may be separate defects. Do not require hidden model chain of thought.

Minimize the example while preserving failure conditions: context length, event order, tenant/rights, versions, concurrency, retry/resume, external-service state. Failure disappearing after shortening is trigger evidence, not proof of poor task definition. Do not dismiss a single critical failure as noise; two repetitions do not prove cause. Plan probabilistic repeats proportionately to risk and available budget.

## 2. Select the layer and competing explanations

The table gives search directions, not ready-made diagnoses. A symptom can span layers; the model may also be a cause or interaction participant.

| Layer | Discriminating check |
|---|---|
| Goal and domain method | Do user requirement, acceptance criterion, and actually selected procedure agree? Does it cover the needed capability? |
| Instructions and context | What was available, found, selected, truncated, and actually sent to the model? Compare before/after assembly, including version/access scope |
| State and continuation | Which checkpoint was read, what restored, did decisions/version/rights change; what happens after crash/redelivery? |
| Tools and environment | Do parameters match the task, access/data match expectations, raw response match adapter output; are emptiness, pagination, and domain errors inside HTTP 200 handled? |
| Model and orchestration | With correct input, is the output contract violated; do routing, stopping, retries, and quality change in controlled comparison? |
| Validation and success reporting | Is the domain output/external effect checked, does the real path traverse control, can it reject a plausible wrong answer? |
| Observability | Can versions, events, and output be linked to one run without secrets; where exactly does evidence break? |
| Metric and incentives | Does useful output improve or only score/self-assessment; are there hidden errors, rework, failures on independent cases? |
| Measurement system | How many tasks executed/evaluated; were difficult cases lost through runner, judge/parser, or reducer; do dataset/grader versions match? |
| Delegation and integration | Did the recipient see goal, constraints, versions, and total remaining budget; does received artifact match integrated output, preserving grounds/conflicts? |
| Accumulation and cost | What grows between sessions: loaded context, stale rules, rework, history/caches; does measurement confirm the growth source? |

For a significant unclear cause, usually choose 2–4 plausible hypotheses, not every table row. Format: `hypothesis → evidence for/against → remaining unknown → minimal discriminating check → outcome supporting or weakening it`. A demonstrated defect needs no artificial alternatives. Choose the next read/test by explanatory discrimination, risk, and cost, not a familiar stack.

For context loss, check cold start or resume: from **actually available and loaded** materials, the agent reconstructs goal/user, work/validation method, current progress/next step, current decisions, and completion criterion. Adapt specifics to the domain: linter commands matter for a coding agent, not every agent. Compare source → addressability/access → loader selection → assembled context → observed answer. A file's existence does not prove loading; a wrong answer does not prove the file absent. The fix may be in reading path, freshness, or model.

## 3. Check the check itself

Use [validation-loop.md](validation-loop.md) for completion/checker contracts; [execution-continuity.md](execution-continuity.md) for consistent snapshots/handoff. Select additional discriminating cases by observed symptom:

| Symptom | Comparison and permissible conclusion |
|---|---|
| All stages done, no benefit | Requirement fulfillment, initial value hypothesis, baseline, measurement window. Bad framing, absent effect, and insufficient data are different outcomes |
| Human exhausted or agent waits forever | Labeled necessary/unnecessary requests, completeness of decision materials, human availability, input flow. Distinguish agent behavior from queue overload |
| Complete document package gives false success | Output/check versions and content, effect state, missing/error/unknown handling. Manifest completeness does not prove relevant evidence |
| Long session degrades | Fresh session, accumulated history, compaction, handoff, and crash separately; ensure minimization retained the trigger |
| Progress files exist, continuation is wrong | Authoritative records → checkpoint identity/integrity → loader → actually supplied context → next step. Distinguish partial writes, bad loading, and bad decisions |
| Controller denies after writing | Verdict timing relative to effect, reachable pre-action controls, controller unavailability handling; do not credit an observer with prevention |
| Rights change after recovery | Exact action, current principal/tenant/resource/parameters/approval; a new session does not inherit permission from a summary |
| Disabled agent keeps acting | Trigger source: endpoint/cron/queue/retry/worker; effect start versus disable timing. Distinguish a late receipt for an old action from a new prohibited action |
| Archival makes continuation slow/wrong | Rehydration latency, migration IDs/versions/integrity, current ACL/deletions, fast recovery kit. Do not confuse unavailable archive with model error |
| Process restarted, promised recovery absent | Claimed RTO/RPO scope/start point, detection/queue/load/reconciliation time, actual durable-progress loss; checkpoint interval is not RPO measurement |
| Restarts spend money or exceed total limit | task/session/horizon linkage, reservations/late costs at window boundaries, concurrent admission, restart bounds, breaker state |
| Chat is fast, background tasks never finish | Load/priority configuration, tenant quotas, queue age, deadline, starvation, safe preemption; separate resource waiting from a stuck agent |
| Batch decision lost or overauthorizes | Event ID, exact version/action list, changed items, expiry/redelivery; human waiting must not occupy a worker or grant authority automatically |

For a fix review, reproduce the affected transition and a permitted control case. Correcting “done” reporting does not close the wrong-result cause; successfully stopping new tasks does not prove the fate of sent operations.

Storage, supervisor, budget, asynchronous-decision, and scheduling contracts are in sections 5–9 of [execution-continuity.md](execution-continuity.md). No separate service is not a finding when another component demonstrably performs the function. Diagnose mechanisms using actual configurations/traces; “environment matters more than model” does not exclude a model or interaction defect.

Trace `requirement → checked result → source of truth → real validator/gate → negative-result handling → user status/response`. Distinguish: no check; check not run; run on another path; unable to distinguish right/wrong; result ignored; stale artifact checked. A CI file, hook, or lint command proves neither execution nor substantive coverage.

For quality claims, apply [evaluation-design.md](evaluation-design.md): mandatory admission, valid alternative trajectories, measurement failures, coverage, comparability. A rising score with falling coverage does not prove agent improvement. For execution controls, check timing and covered paths under section 3 of [architecture-contract.md](architecture-contract.md): a check may run correctly but too late; a checkpoint may save state while permitting a repeated external action. Diagnosis names the violated obligation and mechanism, not just a missing component.

For a material criterion, provide a correct example and a plausible wrong one: wrong period, empty data, another tenant, nonexistent link, incomplete output with `done=true`. The check must distinguish them on independent grounds. A negative control must traverse the same gate/path under investigation; running a separate linter against an artificial error does not prove the production gate works. Intentional defects belong only in an authorized isolated copy/fixture; otherwise propose the test without executing it.

Model self-assessment and HTTP 200 do not certify outcomes. Programmatic postconditions check formalizable properties; a human may assess meaning/domain usefulness against an explicit rubric and source data. An LLM judge likewise needs validation on labeled good/bad cases and false-accept/reject measurement. A separate judge, E2E, or one overall score does not replace every evidence type. Check whether the agent can substitute criteria, test data, or final status to obtain green checks.

## 4. Design comparison and minimal correction

First separate cause localization from containing already demonstrated harm. Preventing false success is needed even while the reason for empty analytics remains unknown. It does not close data-loss cause. Correct the established mechanism; new memory, graph, judge agent, or model needs a testable benefit hypothesis and comparison with a simpler option.

For comparison, fix baseline version, tasks, state/data/tool responses, criteria, settings, and limits. Change one factor; when model and context assembler change together, compare all four combinations where possible to expose interaction. Stubbed tool responses localize downstream behavior but do not test correct request construction or live integration. Record that limit. Without the old baseline, do not confidently attribute regression to a component.

Disabling a component is a supporting hypothesis experiment. No change may mean redundancy, nonuse, or a weak sample; deterioration shows contribution under those conditions, not automatically the system's main bottleneck. Do not disable real ACLs, approvals, cost limits, or other mandatory controls for diagnosis. Do not propose removing them based on a few ordinary successful tasks; an accepted contract and relevant-boundary checks are needed.

Compare domain correctness, false success/refusal, user effort, time, and completed-task cost. Retain previously successful regression cases and independent cases outside tuning. Do not impose a universal run count or mandatory model replacement as the final step: evidence, impact, and check cost determine order.

## 5. Change review and completion

For each significant correction, check: does it close the established causal link → on every affected path including bypass/resume → without weakening mandatory controls → what proves closure → which result requires rollback. Separate cause removal, consequence containment, and additional observability. Label owners and numerical thresholds proposed until agreed.

The report must enable action now: a confirmed defect/minimal correction or the next discriminating check with expected outcomes. Statuses: `confirmed / refuted under checked conditions / hypothesis / check unavailable`. For fix reviews distinguish `designed / implemented according to code / behavior-verified`; an experiment plan is not its result. Do not promise the whole regression resolved when only false success reporting was closed.

Stop when significant findings have evidence, a closure plan, or a precise gap with the minimum next check. Do not visit every layer for completeness or keep experimenting without a new discriminating question. Limit follow-up review to prior findings and changed paths; broader reconsideration requires new material evidence, not leftover checklist items.
