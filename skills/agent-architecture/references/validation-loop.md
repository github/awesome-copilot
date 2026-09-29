# Validation Loop and Completion Evidence

Read when designing acceptance, release, and feedback, or diagnosing unconfirmed outcomes. These are functions of one architecture, not mandatory separate services. A simple task needs a compact description of applicable checks; explain non-applicability rather than creating empty chapters. The check set does not enlarge the interview or replace domain methods.

## 1. Function map

For each applicable function, populate `input/version → property checked → mechanism and owner → execution timing → pass/fail/unknown → consequence → evidence`. Show what the platform supplies, what is proposed, and what is unknown. “Not applicable” differs from a missing mandatory check.

| Function | Architectural decision | Diagnostic check |
|---|---|---|
| Eval Registry | Versions of scenarios, oracle/rubric/scorer, run conditions, thresholds/admission criteria. Capabilities, regressions, escalations; long horizon when work is long-running | Which scenarios were actually executed/evaluated versus excluded; whether versions/denominators are comparable |
| Review | Who checks domain meaning, architecture, or artifact quality: program, model, human, or combination. Task-specific checklist and remediation bound | Whether the checker distinguishes good from plausible bad results and has enough primary data |
| Security Gate | Applicable asset-based threats/checks. For code: SAST/DAST, secrets/dependencies by risk; for text: data protection and output admissibility | Whether real paths are covered and dangerous effects/disclosure can precede checking |
| Policy Gate | Check concrete action, principal/tenant, resource, parameters, permissions, extra conditions; enforcement point | Parameter substitution, approval expiry/revocation, alternative handler, retry/resume; a negative verdict actually prevents action |
| Evidence Bundle Gate | Completeness, relevance, and freshness of evidence for the claimed outcome | All fields present but tests refer to an old version; effect unknown; links inaccessible or do not support claims |
| Release Gate | Admit a composite version to active use: owner/policy, checks, bounded pilot, stop/rollback | Whether an unverified version can activate; configuration/data/continuing-task state consistency |
| Telemetry Feedback | Operational signal → diagnostic case → evaluation/requirement → targeted change → comparison → accept/rollback | Whether failure becomes reproducible, results improve outside tuning, and criteria were not changed for a green score |

Order depends on effects: write admission is checked before writing; result confirmation afterward. The diagram does not prescribe sequential execution of all seven components at every step. The registry may be a versioned test directory; review an existing check or a human; release for a local assistant a controlled version replacement. Platform documentation does not prove configuration or coverage.

Without a mandatory verdict, the result is not admitted. Choose a concrete outcome: waiting, stopping, or permitted degradation. Evaluator failure does not prove a domain-result error. Use [evaluation-design.md](evaluation-design.md) and [diagnostic-review.md](diagnostic-review.md) for axes, measurement failures, and positive/negative controls.

## 2. Evidence Bundle

Design one verification package or manifest linking authoritative records. Choose format by environment; a separate service is unnecessary. For a material criterion, link:

`task/run ID → R/E-ID → composite agent and material input versions → output ID/version → check/scorer and verdict → evidence link → completion status/unknown`.

For actions, add operation identity, exact parameters/payload version, applicable authorization/policy decision, and confirmed effect state. For operations, add costs with accounting coverage and a link to subsequent user-value measurement. Composite version includes model, prompts/skills, tools, policies, runtime, and material data. Label open values explicitly.

Check:

- evidence belongs to the required version, scenario, and data scope; PDF build date does not prove that;
- links resolve for an authorized reviewer and content supports the conclusion; a hash proves identity, not correctness;
- required checks actually executed; planned/skipped/error/unknown do not become pass;
- actual effects remain separate from sent requests and intent; timeout preserves uncertainty until reconciliation;
- package completeness, result correctness, action permission, and demonstrated benefit have separate statuses;
- no secrets or unnecessary sensitive data are included; access, retention, and deletion follow applicable rules rather than universal permanent raw logging.

The model cannot grant itself final admission by writing `done=true`. For a proposed agent, the bundle specifies future evidence and a populated synthetic example, not real-run results. The final PDF under [result-delivery.md](result-delivery.md) presents findings and evidence links but does not replace evidence.

### Example: experiment report

Synthetic `run r18`: requirement E4—a correct report for period P; input `snapshot S3`, method v2, output `report R4`. Numeric checking compares R4 with S3; domain review checks causal-inference limits. MAU changed from 1000 to 1100; no randomization, and prices also changed. The +10% calculation may pass while the experiment's contribution remains unconfirmed. The next-experiment decision rests on limitations, not an invented causal effect.

If R4 is replaced with R5, successful R4 checks do not admit R5. If R5 publication times out, the final status is “report prepared; publication unconfirmed,” with operation ID and the next authorized reconciliation step. Separately record the reason if publication was never authorized.

## 3. The checking component also has a contract

If a Guardian/Review-Agent is planned, distinguish `observation / pre-effect interception / correction`. For each mode, define visible data, intervention point, authority, timeout, unavailable behavior, cost, and its own false-accept/false-block checks. Correction is a separate action subject to normal admission rules; reviewer authority does not automatically expand.

Example: a write completes at t15; Guardian returns deny at t20. The monitor detected the event, but pre-write prohibition was not enforced. To verify a correction, send prohibited and permitted operations through the actual dispatcher/adapter: the former never reaches an external effect; the latter reaches it and is confirmed. Test Guardian unavailability separately. A model judge does not replace mandatory authorization or guarantee attack absence.

Review is bounded by agreed rounds, time/cost, and stopping rules. Unresolved disagreement becomes a specific open decision or escalation, not endless exchanges between worker and reviewer. Do not disable mandatory controls for speed or a diagnostic experiment.
