# Architecture Selection and Interaction Contract

Read when choosing or revisiting the execution approach. Apply delegation and long-running interaction sections only to relevant tasks. Build the decision card from available context; resolve material unknowns under [discovery-protocol.md](discovery-protocol.md) without turning it into a questionnaire.

## 1. Choose by task properties

| Property | Selection consequence |
|---|---|
| Inputs and rules are defined | Ordinary automation may suffice; an LLM is needed only for ambiguous interpretation |
| All data is available before answering | Consider one call with output validation |
| Order and permitted transitions are known | A predefined workflow with necessary LLM steps |
| New observations determine the next step | A bounded agent loop; identify the uncertainty it resolves |
| Independent workstreams or required context/permission isolation exist | Compare one agent with delegation; sequential dependencies limit parallelism's benefit |
| Shared mutable state and external effects exist | Assign change and integration owners; more workers increase coordination cost |
| Long work, pauses, events, or streams | An interaction and recovery contract is needed, not automatically another agent |
| Team, environment, or model capabilities are constrained | Account for the existing runtime, available tools, and support; demonstrate model suitability on the task |

For a material decision, compare the baseline and one or two plausible alternatives: `option → requirements covered → expected benefit → cost/risks → why selected or rejected → check → reconsideration trigger`. An obvious small task needs only a brief rationale, without an artificial table. If the user specified a topology as a requirement, preserve it and show tradeoffs.

Compare topologies on the same tasks, data access, criteria, and **aggregate** budget for every worker, retry, and integration step. An equal per-worker limit does not mean an equal system budget. Account for final output quality, latency, cost per accepted task, and human labor. Without measurements, benefit remains a hypothesis; deliver a conditional architecture and comparison plan now. An experiment is not a prerequisite for the first design. Do not import scaling thresholds from someone else's benchmark.

### From functions to agent boundaries

First derive functions from working cases, with input, output, method, state, owner, and permissions. Then choose an execution form, and only afterward boundaries of persistent components. A profession name or separate API does not itself create an agent boundary.

| Form | Sufficient selection rationale |
|---|---|
| Deterministic process | Rules define transitions; an individual LLM step does not require model control of the whole process |
| Tool | A bounded operation with a contract and permissions; its caller owns the goal and result acceptance |
| Skill/instruction | A repeatable domain method with specified input, context, steps, and verifiable result; an instruction alone does not require a separate runtime |
| Temporary subagent | A bounded subtask; separate context, parallelism, or permissions provide a verifiable benefit; the parent accepts and integrates the result |
| Persistent agent/profile | Independent responsibility and a justified execution boundary; explicit state and lifecycle owners, reason for isolation, and coordination cost |

For a persistent component, check a stable output/decision class, state between runs, independent start/pause/recovery, and separation rationale: permissions, data, context, load, or failure domain. These are decision factors, not a universal formula: isolation or scaling can justify a stateless worker, and a shared owning service may own state. Unknowns do not prove complexity necessary. Identify a simpler alternative and a condition for merging components again.

Coordination is a separate decision: who owns the overall result, dependencies, resources, and conflicts? An ordinary scheduler/router handles fixed transitions. Justify a model coordinator by an actual need for contextual selection and validation of its decisions. Multiple profiles do not automatically need an orchestrator; an agent planner may select tools without persistent child profiles. Do not generalize platform definitions into universal prohibitions.

Select the management interface and storage separately, based on human work and data. First check capabilities of the existing chat, Jira, CLI, or API. Justify a new dashboard by a concrete need for a shared queue, structured confirmations, search/comparison, or different permissions. Choose storage for durability, concurrent writes, transactions, search, retention, and available support; files/SQLite/PostgreSQL are options, not a mandatory ladder. Semantic search needs its own task, not merely the presence of agents.

## 2. If delegation exists

Populate one real handoff contract, then identify other roles' differences:

`owner/recipient → goal and boundaries → inputs, versions, and permitted sources → required artifact and readiness criterion → permissions → share of total budget/deadline → stopping and partial output → evidence/provenance → validation and integration`.

Separately identify the owner of the final decision and shared resources. Define who resolves conflicting results, prevents duplicate effects, and accepts partial results. Delegating specific work and unrestricted peer-to-peer messaging have different coordination rules; do not substitute one for the other. A2A, a queue, a graph, and a supervisor service are not mandatory.

Check transfer of constraints, recursion and nested budgets, lost/duplicate delivery, conflicting shared writes, expiry, and late results after cancellation. Trace `assigned → accepted → completed/partial/rejected → verified → integrated` in one example. Child authority does not exceed what the parent was granted. Several identical model conclusions from shared context are not independent evidence; the integrator checks grounds and contradictions, not just vote counts.

## 3. If interaction continues over time

Choose according to need: synchronous response, background task, event/schedule, streaming, or voice. Describe observable behavior: task acceptance, progress, waiting, partial result, error, cancellation, and final result. Without background work, the corresponding states are inapplicable.

Link task, conversation, individual run, and external action identities. Resume may create a new run while retaining links to the task and prior effects; verify specific SDK fields in current documentation. Define handling of late and duplicate events.

When the user changes the goal, mark the boundary between old and new intent: which unstarted actions stop, which were already sent and require reconciliation, what partial result is retained, and which parameters/permissions must be recalculated. Cancellation does not undo completed actions and must not allow new effects under an obsolete goal. Do not request still-valid permission again without a scope change.

Streamed text before validation is provisional. If a requirement prohibits disclosing certain data, a final post-streaming validator is too late: control is required before releasing those fragments. Show normal completion and one cancellation/correction scenario, not merely a state list.
