# Step-by-Step Design

## 1. Understand the task

Read supplied documents and available context. First record:

- who uses the system, what work they do today, and what should improve;
- known constraints, accepted decisions, and the business-rule owner;
- what already exists, what data is available, and where the source of truth is;
- unknowns that change safety, boundaries, cost, or execution approach.

If almost no request detail exists, start with one real case: “Who comes to the agent, with what, and what result do they consider successfully completed work?” Do not start by choosing a database, model, or tool list.

## 2. Conduct an adaptive interview

Follow [discovery-protocol.md](discovery-protocol.md): visible stages, one substantive question, a coverage map, and separate readiness statuses. The following table is a reference for choosing the next material gap, not a queue of mandatory questions. Begin with the desired change and latest real case; an early design does not end investigation. A topic may be “not applicable” with a reason.

| Topic | What to discover and helpful questions | Decision depending on the answer |
|---|---|---|
| User and value | Who is the user, customer, and rule owner? How is the task solved now? Where are losses? What changes after adoption? | Whether AI is needed at all, product boundaries, baseline |
| Scenarios and output | Work through real ordinary, difficult, and prohibited cases. What is the input? What is a good output? Who accepts it? | Output contract and acceptance scenarios |
| Errors and priorities | Which errors are unpleasant versus unacceptable? In conflict, what matters more: accuracy, completeness, speed, cost, autonomy? | Quality criteria, escalation, control level |
| Domain and boundaries | Terms, entities, lifecycle, rules, legitimate exceptions. Which neighboring tasks are excluded? Who changes rules? | Domain invariants, owners, dependencies |
| Authority | Read, propose, save a draft, or execute? On whose behalf? Which actions need a human, and what exactly do they confirm? | Action matrix and authorization policy |
| Human participation | Who is available, when, how quickly? How to cancel, correct, reject, continue? What happens overnight or on approval expiry? | Real rather than nominal escalation |
| Context and knowledge | Which data is mandatory for a decision? Where is it, who owns it, how often does it change? Which sources take precedence and how are conflicts handled? | Direct API, search, RAG, context assembly |
| Examples and data rights | Are authorized examples of inputs, answers, and wrong answers available? Labels, de-identification, languages, formats, volume, access restrictions? | Testable hypotheses, corpus, evaluation set |
| Memory | What must be remembered within a task, across sessions, across users? Who may write, correct, delete? How to distinguish opinion from fact? | Need and lifecycle of each memory type |
| Tools | Which systems/operations are actually needed? API contracts, owners, errors, limits, permissible retries, effect verification? | Adapter and tool boundaries |
| Load and interaction | Chat, event, schedule, batch? Peak concurrency, task duration, streaming, waits, redelivery? | Sync/async, queue, state, backpressure |
| Nonfunctional requirements | Target latency/availability, budget per accepted task and period, quotas, expected growth? What can be simplified? | Limits, capacity, economics |
| Confidentiality and trust | Whose data, which tenants, who can see what? External documents, files, personal data, allowed providers/regions, retention/deletion? | Trust boundaries, isolation, secrets, leaks |
| Operations | Who supports, investigates, rolls back? Team skills and existing stack? How to change model, rules, tools, sources? | Solution size, observability, release |
| First-scope feasibility | Pilot deadline, people actually available to build/support, permissible spending? Clarify separately by impact; route “unknown” to an owner | Pilot scope, available dependencies, resource-validation plan, handoff blockers |

After an answer, first determine whether to deliver or update the design under SKILL.md. If interviewing is still needed, briefly state what is now known and which decision the next question unlocks. Do not require technical terminology from the user: learn desired behavior and translate it into architecture. Do not transfer internal mechanism selection to the customer when the architect can make a justified proposal.

Requirements register: `ID | statement | source/example | priority | acceptance criterion | status`. For an open question, add impact, answer owner, and verification method. Do not make every question a separate document.

## 3. Form testable requirements

This and subsequent sections describe the architect's work on the deliverable. Do not make the user fill them in for you. Clarify material gaps using discovery-protocol.md; independently develop technical proposals and verify available sources.

Separate mandatory from desirable. A small agent needs a few end-to-end criteria; a complex project needs a compact set with measurable outcomes.

Develop the acceptance contract using [evaluation-design.md](evaluation-design.md), including mandatory gates and measurement coverage.

Populate a value card: `problem → baseline → expected change → measurement → observation period → owner → reconsideration condition`. Value may be nonfinancial. Link it to domain capabilities; correctly completed work, demonstrated benefit, and insufficient evidence to evaluate benefit are different outcomes. State what would falsify the hypothesis and which decision follows under the accepted policy; unconfirmed benefit does not require automatic rollback. Do not turn the card into another questionnaire or mandatory PRFAQ.

Example: the agent prepared a correct report, MAU grew 10%, but prices and acquisition channels also changed. The calculation is confirmed; the experiment's causal contribution is not established. A suitable comparison method and observation period are needed; a negative or inconclusive research result can be a useful task outcome.

For significant human decisions, map: `decision → owner → evidence/options → exact confirmation → wait deadline → no-response behavior`. Estimate queue volume and available human time. If the agent prepares 100 items and the owner has 30 minutes, propose prioritization, incoming-flow limits, or permissible batch review of specific versions; faster generation does not imply a faster whole process. Evaluate necessary and unnecessary escalation quality under evaluation-design.md.

Decompose “99% quality”: success definition, denominator, allowable errors, categories/languages, automation proportion, labeler, dataset, and measurement period. Accuracy on answered requests alone can hide widespread refusal. Model confidence self-assessment does not replace a calibrated criterion.

Separate:

- domain rules checked against authoritative state, with explicit exceptions;
- heuristics and quality judgments requiring examples, measurements, and error tolerance;
- unconfirmed targets that remain proposals.

Do not portray a proposed metric, budget, or SLA as a user requirement. When information is insufficient, explain what can be designed conditionally and what cannot be considered implementation-ready.

## 4. Compare architectural options

Read [architecture-selection.md](architecture-selection.md) and populate a task-proportionate selection card: baseline, plausible alternatives, benefit/cost, validation, reconsideration condition. Develop delegation and long-running interaction contracts only when present.

Specific branches:

- **Knowledge:** request data, direct API, full-text search, RAG; behavioral fine-tuning does not replace fresh authoritative facts. A vector database is not an admission requirement.
- **Memory:** task state and conversation history are not long-term knowledge. “Unnecessary” is valid for each type.
- **MCP:** useful as an integration boundary for appropriate clients/systems; a few stable functions may need only ordinary calls. The protocol grants no authority itself.
- **Service topology:** separate a process/service for an actual responsibility, isolation, or scaling boundary. Agent count does not determine microservice count.
- **Model:** first capability, data, format, cost, latency, and fallback requirements. Then a shortlist with current sources and a comparison plan using identical scenarios and surrounding runtime.

## 5. Design domain capabilities

Read [capability-design.md](capability-design.md). Convert main user scenarios into a capability map, responsibility allocation, and specifications of needed skills. Describe the work method, context-selection rules, and output examples. This is the architect's work from gathered requirements, not another customer questionnaire.

For the chosen platform, separate confirmed existing mechanisms from configuration, new skills/integrations, and unverified capabilities. If the method requires domain expertise, propose it with explicit status and domain-owner validation; do not replace missing knowledge with a confident prompt.

## 6. Describe and check the design

Use [architecture-contract.md](architecture-contract.md) to populate and validate the design. An early sketch permits open details; a completed package must meet that contract's substantive readiness criteria. Show one populated ordinary scenario from input to output and one material failure: intermediate data, capability selection, capability output, control, and user outcome. Without real data, use an explicitly synthetic example; do not call a tabletop walkthrough an executed run. Ensure components, diagrams, and contracts describe one system.

Check traceability both ways: each requirement has a decision and acceptance method; each component has a need or mandatory control. Remove unused proposed components and retain accepted tradeoffs.

At the end, separately state knowledge, agreement, and handoff status under discovery-protocol.md. Do not automatically proceed to code or promise future-system quality before measurement.

Format the completed result under [result-delivery.md](result-delivery.md): architecture PDF, rendered diagram of the proposed agent, editable text, and diagram source. This is part of design delivery; no separate export request is needed.
