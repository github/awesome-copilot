# Long-Running Tasks: State, Recovery, and Resources

Read for long-running, background, cross-session work, pauses, and recovery; in review, when such guarantees are claimed. Budget and scheduler sections also apply to competing sessions. Sections 1–4 cover checkpoint, handoff, resume, and testing; 5–9 cover storage, supervisor/RTO/RPO, budgets/breakers, asynchronous decisions, and scheduling. A one-off answer with no persistent state does not need this loop. Filenames below are examples, not a mandatory backend or OS.

## 1. Checkpoint Policy

Define `what is saved → source of truth/writer → trigger → durable-write timing → consistency → permissible progress loss → recovery/failure → check`.

Combine periodic time/step checkpoints with significant events: stage completion, accepted decision, human wait, worker handoff. Choose intervals by permissible work loss and save cost; fixed N/M values and context-window percentages are not universal. Asynchronous, on-exit, and before-continuation writes provide different guarantees. If storage is unavailable, specify whether this particular operation may continue.

A checkpoint links the goal and its version, tasks/dependencies, accepted decisions, method/input versions, artifact/evidence links, spending and open budget reservations, operation information, and the next permissible step. Authorization and external-effect status remain in the trusted runtime/owning system, not a compressed summary.

Several files or tables do not automatically form a consistent snapshot. Choose a transaction, versioned manifest/commit marker, or native checkpointer guarantee. The reader checks snapshot identity and completeness; a partially saved set cannot declare a stage complete. Returning to the previous complete snapshot does not undo later external effects: reconcile the operation log and budget first. For concurrent workers, define the write owner and protection against stale writers.

## 2. Session Handoff Protocol

Handoff must let the next session continue without reading the entire conversation or repeating a general interview.

| Function | Sufficient content | Example representation |
|---|---|---|
| Environment restoration | Dependency/configuration versions, authorized preparation, tool/data availability checks | init.sh, PowerShell, image, or native bootstrap |
| Human-readable progress | Goal, accepted decisions and reasons, completed work, blockers/unknowns, next step | progress.md or a database-record view |
| Machine-readable tasks | Stable IDs, dependencies, state, completion criteria, result and related-operation links | feature-list.json, tasks table, native graph state |
| Verification package | Versioned pointer to outputs, checks, effects, and decisions | Evidence Bundle manifest under [validation-loop.md](validation-loop.md) |

Do not duplicate authoritative state in independent inconsistent copies: the human view can derive from the same records. The package stores no secrets; bootstrap obtains them through an authorized environment and grants no new rights. An addressable file, actually loaded context, and correct continuation are separately verifiable states.

## 3. Resumption

1. Check snapshot integrity, user/tenant ownership, and current goal: cancellation, task changes, or agent disable may have happened after the checkpoint.
2. Restore compatible environment, method, and data versions or apply an explicitly authorized migration; do not silently substitute methods. Check required context availability/freshness.
3. Reconcile unfinished and ambiguous operations against authoritative state. A stable operation ID helps only with a known downstream deduplication/reconciliation contract. For unknown outcomes, retain uncertainty, choose permissible reconciliation or escalation, and do not blindly repeat effects.
4. Restore total spent/reserved budget and deadline. A new session or worker does not reset limits.
5. Before the next effect, recheck the exact action, current rights, approval, and agent lifecycle. Complete a permissible step and link the new checkpoint to evidence.

### Populated transition and failure

Synthetic checkpoint C7: goal H1, input S3, method v2, report R4 is a draft, next task Q5 checks numbers; of a $5 budget, $2 spent and $0.50 reserved. A new session reads C7, verifies S3 freshness and task state, obtains available evidence, and continues Q5 accounting for $2.50 committed budget. It does not ask the goal again or declare a verified result before Q5.

Failure: after authorized publication op7, the response is lost; progress was saved for C8 but the task list stayed at C7. This set does not confirm completion. Recovery uses the latest consistent snapshot plus the op7 log; readback can establish publication and link its receipt to the result. If reconciliation is unavailable, state is “effect unknown,” and republishing is not automatically permitted. Expired approval does not prevent authorized reconciliation of an already started action, but authorizes no new write.

## 4. Continuation testing

For material transitions, design or safely perform stops before/after durable recording, after a sent effect, and during a partial snapshot. Start a new session using only the designated recovery mechanism. Check preservation of goal, constraints, method, versions, remaining tasks/budget; absence of duplicate effects and stale authority; correct next step and understandable user status.

The long-horizon matrix in [evaluation-design.md](evaluation-design.md) distinguishes accumulated history, compaction, handoff, and crash/resume. A test design is not an executed runtime check. A local downstream fixture does not prove the real external API's guarantee.

## 5. Lifecycle-based storage

For large volumes or long retention, compare one durable backend with logical tiers: hot—low-latency active state; warm—recently completed/paused tasks; cold—archive based on cost and applicable rules. Three tiers are not mandatory; a task without storage needs none. A storage tier is not a trust level, and compressed model context does not replace a primary artifact.

Define `object/source of truth → tier → transition event/time → owner → access/retention → retrieval latency/cost → check`. Automatic migration uses stable IDs/versions and a verifiable manifest: copy and verify integrity → atomically switch address → remove previous copy under policy. Reads during migration must not mix versions; failure leaves the latest intact available version. Archive restoration (rehydration) has a waiting status, timeout, and missing/corrupt-object outcome. Transparency to the agent means preserving read contract and identity, not promising instant access.

ACL/tenant, encryption/key management, deletion deadlines, and applicable deletion holds apply to all tiers, replicas, and caches. Archive/backup restoration must not reinstate revoked rights or deleted data; specify checks of current policy and deletion records. Do not import universal legal retention periods. Rehydration cost/time count toward budget and recovery; a minimum kit for required RTO may remain in fast storage while other artifacts are archived.

## 6. Supervisor and recovery objectives

For automatic continuation, assign failure detection/recovery ownership to the existing runtime/orchestrator or proposed supervisor logic. A separate process or LLM is not mandatory. Contract: failure/lease-expiry signal → acquire recovery ownership with fencing → verified checkpoint and operation log → recovery under section 3 → health verification → requeue or stop. A late worker must not regain ownership. An already initiated external effect requires separate reconciliation even with functioning fencing.

Define RTO as target time from an explicitly chosen failure event to safe resumption of useful work; RPO as permissible loss of a specific state/progress class. Separate targets from measured values. Identify failure domain (worker, store, region), detection, recovery queue, bootstrap, rehydration, reconciliation, and verification: fast process restart does not prove RTO. Checkpoint interval alone does not prove RPO without durable-write/replication timing. Authorization, effect, and cost logs may need stronger durability than intermediate synthesis.

Automatic restart has attempt and total-time limits, backoff, error classification, and an exhausted-budget outcome. Corrupt/incompatible state, missing current rights, and unknown effects are not cured by endless restart. Describe supervisor/dependency failures and owner handoff; recovery does not bypass admission or receive a fresh budget.

Conflicting-requirements example: cold reads take 40 minutes, target RTO is 10 minutes, checkpoints every 15 minutes with a 3-minute progress RPO. The current design does not substantiate these targets. Options: fast recovery kit, more frequent durable recording/logging, or agreed objective changes; cost and measurements determine the choice. Design a real cold-resume and worker/store-loss test within the stated scope; measure lost progress and time to a safe useful step. A thought calculation merely exposes the conflict.

## 7. Budgets and circuit breakers

Under the general limits contract in [architecture-contract.md](architecture-contract.md), link `task` (whole assignment), `session/run` (attempt/interactive segment), and `horizon` (aggregate tenant/user quota per window). Specify currency/resource, ledger owner, window boundaries/type, accounting time, spent/reserved, atomic admission, reservation release, and exhaustion outcome. Levels are nested, not summed into extra available budget: a call passes all applicable limits. Handoff/restart/a new day does not reset the task limit; late costs and window-boundary operations are counted once under explicit policy. Delegates, retries, review/guardian, recovery, and retrieval count toward corresponding costs. Apply storage/CPU/network quotas for actual load.

Example: task limit $8, spent $5, reserved $1; tenant daily limit $60, spent $58, reserved $1. Task remaining $2, tenant remaining $1. Two workers cannot independently reserve $1 each from the same remainder; session remainder expands neither parent limit. A reservation with unknown spend is not released merely on timeout. At a day boundary, the reservation/charge window policy must preserve both limits without double-counting.

Distinguish exhausted budget, lack of progress, and a circuit breaker for a degraded dependency. For a breaker define signal/error-latency window, scope (tool/provider/tenant), closed/open/half-open transitions, cooldown, bounded recovery probe, and closure criterion. Automatic external-write probes are impermissible without ordinary authorization and safe retry contract; a read/health probe does not prove the write path healthy. Open pauses affected operations, records progress, and shows reason/next step; unaffected authorized actions may continue. Model switching/fallback requires compatible rights, data policy, quality checks, and total budget. Mandatory checks are not disabled for degradation.

## 8. Asynchronous human participation

Use the decision map from [design.md](design.md): for background tasks define owner/backup recipient within authority, channel/availability windows, decision deadline, nonduplicate reminders, cancellation, timeout, and visible waiting status. The card includes goal, exact finite set of versions/actions, changes, grounds, risks, and decision options; a summary aids review but does not replace material evidence access. Batch approval binds every action/version; excluded or changed items do not inherit permission. Section 3's recheck applies before execution.

Do not occupy a compute worker waiting for a person. Persist state and resume on a decision event, protected from duplicate delivery and expiry. Silence is not agreement. At deadline: partial output, reschedule/cancel, or authorized escalation; human availability does not guarantee meeting a deadline. Measure queue/labor under [evaluation-design.md](evaluation-design.md). Interactive clarification and a background queue may share one UI but have explicit different deadlines/states. Guardian is risk-dependent, not mandatory; test it across task duration and accumulated context, and include cost in the total cap.

## 9. Scheduler and competing tasks

For multiple tasks/tenants, define admission/execution policy: interactive/background class, business criticality and assignment source, deadline/slack, quotas/concurrency, estimated cost/duration, preemption admissibility, tie-breaking, and starvation protection. The model does not raise its own priority. Interactivity is a policy factor, not unconditional precedence over critical background work. Choose FIFO, separate queues, weighted fairness, or reserved capacity by load; a separate service is unnecessary.

Define a bounded queue/backpressure, task-owner lease/fencing, shared budget, safe pause point, and cancellation consequences. Preempt at a safe checkpoint boundary; a sent operation is not considered canceled. Predicted deadline/budget violation triggers a concrete decision: defer/reject, narrow output under agreed policy, or escalate. Do not promise completion without capacity or derive authority from urgency.

Test mixed load: interactive surge, critical background task near deadline, noisy tenant, long indivisible operation, duplicate delivery, and worker loss. Measure queue/age, waiting/completion by class, missed deadlines, starvation, useful progress, and costs while preserving constraints. A queue or priority setting alone proves none of these. A one-off assistant without competition may need no scheduler.
