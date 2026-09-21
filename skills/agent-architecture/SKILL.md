---
name: agent-architecture
description: 'Design AI agent architectures through requirements discovery, or audit and diagnose architectural flaws in existing agents. Architecture only; excludes implementation and general code review.'
license: MIT
---

# AI Agent Architecture

Help the user obtain a justified architecture for their task or an evidence-based audit of an existing agent. Deliver architectural decisions and ways to verify them, without implementing the agent. By default, completed work includes a PDF report and a visualization of the results. An “ideal architecture” fits the requirements, cost of failure, and team resources; it does not maximize the number of components.

## Choose a route

| Request | Route | Read |
|---|---|---|
| New agent, requirements are not yet clear | Design: working cases → early design → requirements and decision coverage → delivery | [design.md](references/design.md), [architecture-contract.md](references/architecture-contract.md) |
| Architecture from an existing specification | Design: fill in what is known and clarify only gaps | The same files; do not restart the interview |
| Review an agent already written | Audit: reconstruct actual paths → verify → deliver findings | [audit.md](references/audit.md), and [architecture-contract.md](references/architecture-contract.md) as criteria |
| Agent makes mistakes, has degraded, or falsely reports “done” | Diagnosis within the audit: case → hypotheses → discriminating checks → correction and closure criterion | audit.md and [diagnostic-review.md](references/diagnostic-review.md) |
| Review and redesign | Audit first; its demonstrated problems become design inputs | audit.md first, then design.md |

In either mode, read [source-map.md](references/source-map.md) once: it explains the origins of the principles and the textbook's limitations. The original PDF is not needed for ordinary skill use. [scenarios.md](references/scenarios.md) is needed only to test the skill itself.

When choosing or revisiting the execution approach, use [architecture-selection.md](references/architecture-selection.md); when designing acceptance or reviewing quality claims, use [evaluation-design.md](references/evaluation-design.md). Develop the validation loop and completion evidence using [validation-loop.md](references/validation-loop.md); for long-running/background work, pauses, recovery, and competing sessions, use [execution-continuity.md](references/execution-continuity.md), including storage, RTO/RPO, budgets, the human decision queue, and scheduling. Develop delegation, mutable memory, execution isolation, and long-running/streaming interaction only when the task has these properties. A section's existence does not make its question mandatory: material gaps under discovery-protocol.md determine depth.

## Shared decision rules

- First read the available specification, local instructions, architectural decisions, and relevant materials. Use code to reconstruct architecture, not to make unsolicited fixes. Do not run an application with external effects for an audit.
- Maintain a brief register: **source-confirmed / user requirement / proposal / assumption / open question / not applicable**. Identify where requirements came from. A user decision and an architect's hypothesis have different statuses.
- Corporate contracts and accepted decisions apply only within their own project. The textbook is an engineering reference, not a source of authority or a replacement for local canon. Identify conflicts rather than resolving them silently.
- First consider ordinary automation without an LLM, a single call, and a predefined workflow. Introduce an agent loop, RAG, persistent memory, MCP, or multiple agents only for a concrete need. For each added complexity, identify its benefit, cost, verification method, and simpler alternative.
- Do not select a model or framework before understanding the task. For a concrete selection, check current official documentation and version constraints. A documented capability is not yet demonstrated quality on the user's data.
- Separate probabilistic model decisions from programmatically enforced rules. Describe where permissions, parameters, budget, and action admissibility are checked **before** an external effect, including bypass paths and resumption.
- For a timed-out external write, a readback that finds nothing does not by itself prove that no effect occurred. Permit a retry only under an established downstream idempotency contract or authoritative proof of non-execution; otherwise retain `effect unknown` and reconcile or escalate. Apply this rule in concrete flows and examples as well as in the risk section.
- An audit or design does not authorize writing code, changing agent settings, publishing, or initiating external actions. On a subsequent explicit implementation request, hand the architecture to the appropriate process; this skill does not continue into implementation itself.

## How to work

Before an interview or audit planning, read [discovery-protocol.md](references/discovery-protocol.md). Show a clear route and maintain a coverage map. By default, devote each turn to one decision or working episode; do not hide several independent topics inside one question. Material gaps and evidence determine depth. There is no fixed total round limit.

Deliver the first useful design as soon as context is sufficient, otherwise no later than the third answer; the count does not reset on continuation. This limits the wait for an early result, not the completeness of the interview. If the task is too unclear, show a map of what is understood and conditional options. After the sketch, continue investigating material gaps under the protocol; two or three rounds alone do not justify declaring readiness.

The first design includes the goal and boundaries, main capabilities and their outputs, recommended components, main flow and external actions, key constraints, assumptions, and open decisions. It is a sketch for early feedback. The interview budget limits the wait for a sketch, not design depth: develop it into an architecture package from what is already known, without waiting for a separate instruction to elaborate. If context suffices, deliver the package immediately. If the user explicitly asks only for a sketch, respect and label that depth.

Phrases such as “that's enough,” “let's go with this for now,” “the rest later,” or “enough questions” end requirements gathering: deliver the architecture from accumulated context in the same answer. Do not require a separate “now design it” instruction or end at “interview complete.” If a design has already been delivered, show its current final version or a substantive update. An explicit request to stop all work (“don't continue,” “that's all for today, stop”) means stop, rather than deliver a new design.

If the user does not know an answer, propose a justified option and label its status. Represent unknowns as assumptions and open decisions. Unclear authority blocks the corresponding external action in the proposed architecture, but not delivery of the architecture itself. Silence and ending the interview do not approve proposals.

After a significant answer, update the working summary of requirements and decisions. Save it in an agreed document if artifact creation is within the request; otherwise maintain it in the conversation. On continuation, start with that summary and changed information.

After the first design, clarify specific branches and uncovered material requirements, including real exceptions, human work, and feasibility. Explain which decision the answer will change; propose internal mechanisms yourself. Do not confine gap discovery to components already drawn or restart a questionnaire. Finish when the declared scope has sufficient coverage; if further confirmation is unavailable, deliver a conditional package with owners and checks for gaps.

Complete design with the architecture package from architecture-contract.md: domain capabilities and methods, output contracts, the structure of instructions/skills/materials, allocation between the existing platform and additions, a populated end-to-end example, and checks. Read [capability-design.md](references/capability-design.md) for this part; in an audit, use it to check required capabilities. Describe the agent's main work deeply enough that a developer does not have to invent its method again. A platform name and a list of stages do not accomplish that.

Always cover **limits on iterations, time, tokens/money, and tool calls, stopping rules, and what the user receives on stopping**. Mark unknown values as open or proposed rather than inventing an agreed limit. An architecture package with skill specifications remains a design: it does not imply skill installation, code implementation, or verification of a running agent.

Complete an audit with demonstrated problems, separately identifying unknowns and accepted tradeoffs. Do not claim production readiness from reading code. Architectural readiness for implementation and demonstrated operational quality are different outcomes.

## Final artifacts

When completing design, audit, or diagnosis, read [result-delivery.md](references/result-delivery.md) and create a PDF of the results with a rendered Mermaid or C4 diagram as appropriate; retain editable text and diagram source. Do this as part of completion without a separate user request to “make the PDF now.” An early sketch and intermediate answers do not require repeated export. Explicit user constraints (“chat only,” “no files/PDF”) and a request to stop all work take precedence. Creating the report does not authorize implementing or changing the reviewed agent.

## Package metadata

This package is distributed under the [MIT license](LICENSE.txt). [Optional client metadata](agents/openai.yaml) supports compatible Agent Skills clients; Copilot uses SKILL.md and the linked references.
