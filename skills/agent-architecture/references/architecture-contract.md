# Architecture Deliverable Contract

These are views of a single design and may be combined into one Markdown document. Scale depth to the task: do not create empty sections or separate files without a reason. Each applicable item must have a decision, evidence, or an explicitly labeled open question. “Not applicable” requires a brief reason.

## 1. Task and criteria

Users, value, scenarios, output format, exceptions, existing alternative, and owners. Table: `R-ID | requirement | source and status | decision D-ID | check E-ID`. Identify critical unknowns and the chosen tradeoff among quality, time, cost, and autonomy.

Use section 3 of [design.md](design.md) for the value card and human decision map. Show what change the agent provides, how the hypothesis is tested, and how much human involvement the entire process requires; successful execution and demonstrated impact are distinct.

## 2. Structure and boundaries

System type and reasons for choosing it. Components and responsibilities: interface, runtime/orchestration, model, domain rules, tools, sources and stores, checks, and observability. Do not draw nonexistent components. Show trust and data ownership boundaries. A simple Mermaid component diagram suffices when it helps explain relationships.

Use the applicable sections of [architecture-selection.md](architecture-selection.md) for topology justification and delegation and temporal interaction contracts. Agent count does not replace a responsibility map.

Domain substance is mandatory: map main capabilities, their methods, and outputs using [capability-design.md](capability-design.md). For selected skills, provide populated specifications and the material structure; for an existing platform, explain what is reused, configured, built, and still unverified. A simple topology does not reduce behavioral completeness. Rules may live in one instruction when separate skills are unnecessary.

## 3. Execution, state, and stopping

Describe the sequence: input → checks → context gathering → model/workflow decision → action validation → tool → result observation → state recording → response. Allocate the environment's four functions to existing or proposed owners:

| Function | What must be defined and verifiable |
|---|---|
| Translation | How intent, constraints, and sources become a task and actually loaded context; what happens if a condition conflicts or is lost |
| Execution | Who converts the model's proposal into a typed call and enforces permissions, quotas, and isolation |
| Observation | How tool responses and external state become a verifiable result, event, and subsequent context; how error, success, and unknown are distinguished |
| Correction | Who chooses continuation, bounded retry, stopping, recovery, or escalation; what evidence and authority are required |

This is a responsibility map, not four new services. For each function, show input/output, owner, failure, and check; a small assistant needs only a compact populated path. Deterministic boundaries do not make the model's domain answer deterministic or correct.

Separate **integration** (available capabilities, schemas, and adapters from which a tool is selected) from **enforcement** (mandatory admissibility checks for every reachable call). These are logical responsibilities and may live in one process. An MCP/tool catalog does not itself enforce policy; the model does not choose whether to pass admission. Domain extensions do not weaken baseline restrictions without their owner's decision. Check bypasses through new tools/handlers, direct calls, and resumption; control details follow below.

For tasks with pauses and effects, describe states, permitted transitions, the transition owner, persisted data, and resumption. Distinguish result proposed, action authorized, sent, confirmed, effect unknown, error, and canceled. “Canceled” does not mean an already completed effect has been rolled back.

**A limits table is mandatory for loops or retries:**

| Field | Record |
|---|---|
| Iterations and nesting | Whole-task and child-task limits; who enforces counting |
| Time | Overall deadline, individual call timeout, human wait, cancellation |
| Tokens and money | Task budget including reasoning, retries, and workers; user/tenant quotas where needed |
| Tools | Frequency/count limits; repeated identical arguments and lack of progress |
| Stop outcome | Partial result, explanation, human queue, or managed continuation |
| Calibration | Value/range, status “proposed/measured/agreed,” scenarios used to select the threshold |

The runtime enforces limits. A prompt instruction may aid behavior but is not a limiting mechanism. Even a fixed workflow needs a timeout, bounded retries, and an error outcome; absence of an agent loop makes only the corresponding fields inapplicable.

For a significant control, populate: `requirement → enforcement point → covered paths/tool classes → timing relative to effect → failure/timeout → replay/resume → cancellation/concurrency → check`. A guardrail name or SDK setting does not prove coverage of shell, hosted tools, and alternative handlers. A parallel check that finishes after an action does not enforce a mandatory pre-effect prohibition. Identify the mechanism closing each required path.

Distinguish target spending, a limit allowing overshoot from an already started call, and hard admission of the next operation. Checking accumulated cost before a request can allow overshoot after completion. For a hard total limit, specify the admission/reservation owner, an upper-bound cost estimate, and coordination of remaining budget among concurrent workers; if an upper bound is unavailable, a hard cap is unproven. Do not allocate the same full budget to every worker.

Recover state from a verifiable store, not conversational promises. A failure between an external action and local recording requires a reconciliation path; a checkpoint alone does not ensure a single external effect.

Clarify when a write becomes durable: before continuation, asynchronously, or at completion; what progress a crash loses and which steps replay. Checkpoint properties and external API guarantees are different contracts. Test the “effect completed, local write incomplete” gap and stale permissions during recovery.

For long-running tasks, pauses, and work across sessions, use [execution-continuity.md](execution-continuity.md): checkpoint/handoff, storage tiers, supervisor with recovery objectives, budgets across horizons, asynchronous human participation, and competing-task scheduling. Show a populated normal transition and material failure, applicability, and existing platform mechanisms. These are environment responsibilities, not a requirement for separate services or files.

## 4. Context, knowledge, and memory

- Source of each context portion, reader permissions, freshness, link/version, and behavior on conflict or absence.
- Budgets: system instructions, history, tool definitions, results, retrieval, reserve for the response and required reasoning. Strategies for selection, moving large data out of context, compression, and on-demand loading; measurements on real formats and languages.
- Compaction preserves goals, constraints, primary-source links, confirmations, and effect identifiers. Authorization and effect state remain in the runtime outside compressed text. Test continuation after compaction.
- If RAG is needed: corpus preparation and updates, structure-aware chunking, search methods, reranking conditions, generation context, citations, empty results, and stale documents. Check ACLs before data reaches the model; indexes and caches account for deletion and revoked access.
- If memory is needed: working, episodic, semantic, procedural—purpose, user/tenant scope, source, timestamp/lifetime, reads/writes, concurrency, correction/deletion, and fact verification. Do not require all four types.
- Separate authoritative state, raw evidence, and derived summaries. Verify summaries against sources; an existing authored wiki does not automatically become “just a cache.” Mandatory recording of a financial/business effect is not deferred as optional background memory.

If the agent changes memory or procedures, describe `observation → candidate → verified version → active procedure`: source, applicability, freshness, conflict resolution, change authority, validation, and rollback. Saved, indexed, available for selection, actually loaded, and behavior-verified are different states. Untrusted experience or one successful run does not automatically become a rule. Admission may be performed by a human or a previously agreed policy within its scope; universal manual approval of every memory is not required. Behavioral change criteria are in [evaluation-design.md](evaluation-design.md).

## 5. Tool contracts and authority

For each significant tool: purpose and when to use it, input/output schema and field meanings, preconditions, domain restrictions, effect type, principal/tenant permissions, errors, timeout, retry admissibility, result limits, and effect confirmation.

Check the selection interface: can neighboring tools be distinguished by names/descriptions, are IDs, units, and argument values unambiguous, and are errors and allowed next steps clear? Show a populated call and response for a significant tool, a positive selection example, and a case where it must not be selected. A separate wrapper for every API endpoint is not mandatory; a domain-level aggregate operation is acceptable if it does not hide effects and required checks. Results support filtering/pagination/truncation indicators and preserve required identifiers, provenance, and completeness. Concision must not make partial data appear complete.

For writes, also specify: operation identifier, receiving system's idempotency guarantee and validity period, retry and ambiguous-response semantics, readback/reconciliation, compensation or irreversibility. “There is an idempotency key” is insufficient without a server processing contract. Identical parameters for two deliberately distinct operations do not make them one request.

For human confirmation: exact action, target, parameters, principal, and authorization expiry; behavior on changed parameters, revoked rights, reuse, and resumption. Without permission, a significant action is not executed. An agreed autonomy policy may allow certain action classes; the model does not extend it itself.

Represent contextual admission as `action → resource/environment → principal/tenant → permissions and conditions → checking mechanism → allow/deny/escalate`. Test changes of resource, tenant, parameters, and operation scale within a task. An autonomy level does not replace this table: rights are not calculated by subtracting abstract points and do not increase with model confidence. Automatic transitions are possible only within a previously accepted policy.

## 6. Threats and failures

Brief table: `scenario/asset → trust boundary → control mechanism → check → residual risk/owner`.

Check untrusted instructions in messages, documents, tool metadata, and results; cross-tenant access; leaks through responses/logs/tools; excessive privileges; parameter substitution after approval; memory poisoning; invalid model output. An injection classifier does not replace authorization and isolation or prove attacks absent.

If code execution, shell, browser, or untrusted extensions exist, show the actual isolation boundary: agent process, tools inside/outside, network, filesystem, credentials, tenants, and artifact return. A container for one tool does not isolate host tools; a virtual filesystem and import filter do not prove a security sandbox. Compare restricted local execution, a remote environment, or whole-process isolation according to required risk, without demanding a container for a text assistant. The owning API retains its own authorization. Unknown configuration is an evidence gap, not a demonstrated exploit.

For every dependency: failure, timeout, rate limit, invalid/empty response, retry, and recovery. Choose blocking, acceptable degradation, or escalation per operation. “Read-only” does not permit exposing someone else's data if ACL checks fail. Fallback does not bypass access, confirmation, or data residency requirements.

For long-running and concurrent tasks: duplicate delivery, two handlers for one task, backpressure, user stop, approval expiry, and crash after an external effect. Queues, circuit breakers, and regional redundancy are needed where requirements justify their cost.

## 7. Quality verification, economics, and operations

For a significant failure scenario, analyze using [diagnostic-review.md](diagnostic-review.md): where failure becomes visible, which causes must be distinguished, and which signal prevents false success. In a new design, this tests an architectural hypothesis; reviewing a running agent requires actual evidence. Do not label a design behavior-verified from a thought experiment.

Evaluation plan: real authorized/de-identified scenarios, domain-owner labels, ordinary and difficult cases, no answer, conflicting sources, unsafe input, failures, and resumption. Separate tuning data from independent validation. Measure correctness of outputs and actions, groundedness/retrieval quality where applicable, false blocks, escalation rate, latency, and cost per accepted task. A model judge is a measurement instrument with errors, not proof.

Develop the evaluation contract, mandatory gates, coverage, and measurement errors using [evaluation-design.md](evaluation-design.md). Do not collapse separate quality axes into an average that hides mandatory constraint violations.

Use [validation-loop.md](validation-loop.md) for the validation loop and Evidence Bundle. Define applicability, placement, and verdict consequences for the seven functions; separate services are not mandatory. For a material conclusion, link the requirement, output version, executed check, and evidence. If a Guardian/Reviewer exists, describe its own contract and errors; post-effect observation is not a pre-effect prohibition.

Record model, prompt, tool schema, corpus, and surrounding runtime versions for comparable runs. A change in one layer requires retesting affected scenarios. Do not require the model's internal chain of thought: investigations need available events, inputs/outputs with secrets redacted, policy decisions, and action results.

Cost calculations include every LLM call and retry, separately billed tokens without double-counting, retrieval and external APIs, infrastructure, and support. State assumptions and a range by task length/branching; do not present one-call cost as completed-task cost.

Observability: correlated task/run/tool/action IDs, stages and durations, budgets and stop reasons, tool-selection quality, successful/empty/failed results, source versions, and actual action outcome. Exclude secrets; define trace access, retention, and deletion. For each important metric, say what decision or response it triggers.

Operational plan: owner, controlled pilot, admission and rollback criteria, stopping new actions, recovery, and incident analysis. This is a proposed plan, not a completed release.

**Composite version and lifecycle.** Link model, prompts/skills, tools, policies, runtime, and material data into an identifiable agent version. For a change, identify affected scenarios, admission, compatibility of continuing tasks, and rollback. Reverting code/prompts does not undo external effects or guarantee compatibility of new state with an old version. Diagnose drift first; do not automatically prescribe fine-tuning.

For an agent with persistent state/background actions, define retirement: owner and trigger → prohibit new runs, schedules, and redeliveries → finish/cancel/transfer active tasks → reconcile initiated effects → revoke access → handle memory, artifacts, and logs under applicable rules → replacement process and evidence of shutdown. Disabling an HTTP endpoint does not stop cron, queues, or running workers. Access revocation order must preserve authorized reconciliation without permitting new effects; if safe reconciliation is impossible, explicitly hand it to an owner. Test a late event after disable. A one-off local assistant needs only applicable update and stop rules.

Use [evaluation-design.md](evaluation-design.md) for the improvement cycle, protected invariants, comparison budget, and accept/rollback rule. For skills, test selection of the right procedure and cases where it is unnecessary. Structural file validation does not replace behavioral testing.

## 8. Decisions and readiness

Coverage and independent statuses of knowledge, agreement, and handoff are defined in [discovery-protocol.md](discovery-protocol.md). Before assigning “for implementation,” check the first-scope deadline, build/support availability, budget constraints, and technical dependencies. An unknown with an assigned owner is not closed. A proposed implementation can be substantive despite blockers, but they limit readiness.

### Human path and significant settings

Include a populated user/operator path: **event → where the person learns about it → what they see → available action and rights → what changes → how to continue → what happens without a response**. For asynchronous work, show concrete queue rows, owners, and a notification/response example, not just internal statuses. An existing interface suffices; a new dashboard requires justification.

For example, in a synthetic Jira process: `CAT-42 | awaiting file | manager | reason: two CSVs | select the exact attachment with a comment command | after checking authority and version, requeue`. Separately for a technical failure: `CAT-43 | validation failed | Pipeline owner | safe-log link | fix the cause and explicitly retry`; for a closed Jira issue, define an accessible summary surface rather than promising an invisible internal queue. An unassigned owner or unavailable channel is an open question. Do not present this example as a confirmed requirement of another project.

For significant numerical decisions, provide `value/range | status and basis | user consequence | alternative | calibration method and decision owner`. Do not tabulate every internal constant. For example, “10 retries per day” with 50 failures means at least five days to clear the backlog even without new failures; compare that with the deadline. Consider a shared budget prioritizing corrected tasks or another mode instead of choosing a number without consequences. Unknown duration/cost requires measurement, not a throughput promise. Pilot timeframe and available people are constraints separate from the runtime budget.

Key decisions: `D-ID | context | choice | alternatives | consequences | reconsideration trigger`.

Check substantive readiness before completion:

- Each main scenario has a capability, concrete method, required data, and output contract; selected skills are described substantively, not merely named.
- Instruction/material structure explains what loads and why; platform contribution is separate from proposed additions.
- One ordinary and one significant failure case are worked through with populated data through the user response; result evidence and required human judgment are visible.
- Requirements are traceable, execution/failure paths agree, and critical boundaries/contracts, limits, and checks are defined.
- A developer can implement the agreed behavior without new domain design. A component list, empty templates, or “the LLM analyzes” without a method leaves the result a sketch.

Open numerical settings or experiments are acceptable when their impact and closure method are clear. An unknown core method, authority, or basic topology is a specific readiness gap; deliver the completed package with that limitation rather than automatically restarting a questionnaire. Separately state result depth (sketch / package with limitations / package for implementation), user agreement, and what was actually measured. Package completeness, its approval, and operational quality are distinct properties.

## 9. Final delivery format

Check substantive architecture readiness and export readiness separately. Standard final delivery is a PDF with a rendered Mermaid/C4 diagram, editable text, and diagram source under [result-delivery.md](result-delivery.md). That file also defines user-requested exceptions and unavailable-export behavior. The report preserves actual architectural status and does not turn a design into a confirmed implementation.
