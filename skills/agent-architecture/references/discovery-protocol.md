# Guided Interview and Evidence Sufficiency

This protocol determines investigation depth, not a fixed number of questions. Two rounds can cover a simple case with a ready specification; twenty answers do not close an unknown external-effect contract. Track time to the first useful design, requirements coverage, and readiness for implementation handoff separately.

## 1. Visible route

Initially show the current stage and nearest result briefly: **task and real cases → working boundaries → architectural decisions → completeness check and delivery**. For diagnosis: **object and symptom → actual path → discriminating checks → conclusion and closure plan**. Begin at the stage matching available context. This is orientation, not four mandatory sequential questionnaires.

An early design enables feedback. Deliver it immediately when context suffices, otherwise no later than the third answer. This limit concerns only the wait for the first design: it neither ends the interview nor confirms completeness. If even the goal is unclear, show a map of understanding and conditional options with one key gap instead of an invented topology. Unresolved material questions, not a counter, determine subsequent rounds.

After a substantive block, show a brief checkpoint: what was learned, which decision changed, which material topics remain open, and what will be ready after the next block. Do not promise “one last question” while material gaps remain. Do not invent a readiness percentage from filled rows. Moving to the next stage needs no separate permission.

## 2. One turn—one clear task for the interlocutor

Choose the question whose answer most affects boundaries, output, safety, cost, or feasibility. Briefly connect it to the previous answer: **what I understood → what remains unknown → which decision depends on the answer → question**. Do not turn this into four repeated headings.

- By default, ask about one decision or working episode. A related clarification is acceptable; multiple questions are acceptable by user preference or when answers naturally come together. Do not bundle deadline, server, budget, and on-call owner into one numbered item.
- Count independent information requests, not numbers or question marks. To evaluate the interview, retain counts of turns, separate topics, repetitions of known facts, and questions with no decision impact.
- Ask for the latest real case. If none exists, work through an explicitly simulated case and identify who will verify it before implementation and how. Do not force invented statistics.
- Offer optional answer examples if starting is difficult. “In your own words / I don't know yet” is acceptable; selecting a suggestion does not prove an architectural decision.
- Do not ask a customer about frameworks, database schemas, or fencing when they need to describe desired behavior. The architect proposes technical mechanisms, verifies API facts through authorized sources, or addresses the technical owner.
- “I don't know” moves the question to the register with an owner and verification method. Repeat it after a new source or contradiction emerges, not merely to fill a template.

Connected example: “A corrected file must not run automatically. How does the manager identify the version to check again?” After the answer, record the exact signal and version; do not add hosting and hiring questions in the same turn.

## 3. Design coverage

Maintain one compact map; documents and previous answers populate it without repeated questioning. For a material row: **basis → decision/constraint → knowledge status → who closes the gap and with what**. Do not replace SKILL.md knowledge statuses with a generic “discussed.” “Not applicable” needs a reason. There is no one-question-per-row requirement.

| Area | Sufficient basis for a decision |
|---|---|
| Change and first scope | Current work, required result and recipient, why start now, included/deferred scope; observable success criterion |
| Working cases and method | For material task classes: trigger, concrete input, substantive decisions, actions, handoff, output, and validation; ordinary case and significant exceptions |
| Data and authority | Sources of truth, access and prohibitions, whose identity acts, exact confirmation subject; unknown rights are not permission |
| State and failure | What survives a run, state owner, retry/cancel/effect reconciliation, recovery and problem owner; as applicable |
| Human work | Where tasks are assigned, queues/errors viewed, confirmation or correction and resumption occur; response deadlines and no-response behavior |
| Feasibility | Desired pilot deadline, available implementers/support, existing environment, budget/load constraints; unknowns affecting first scope |
| Selection and acceptance | Justified execution approach, capability/output contracts, significant alternatives, success/unacceptable-result checks, acceptance owner |

One typical example does not cover different authority, user, or external-effect classes. Select additional cases by risk and diversity, explaining the selection. Do not design the entire deferred backlog for a “complete interview.”

At a checkpoint, separate remaining items:

- **Blocks a decision/implementation:** the answer changes a mandatory capability, data/authority boundary, operational ownership, or deadline feasibility. Continue specific clarification or explicitly limit the relevant part's readiness.
- **Requires engineer verification:** for example, the Pipeline rerun contract. Identify owner/role, exact material, and criterion; without access, do not portray verification as completed.
- **Can be proposed and calibrated:** internal timeout or pool size. Show consequences and tuning method; do not call it agreed.
- **Deferred/not applicable:** reason and revisit trigger where needed.

Finish investigation when material areas have sufficient grounds for the declared scope, when further progress requires an unavailable source/owner, or when the user stops questions. In the latter two cases, deliver a substantive conditional result and exact remaining verification now. Do not continue repetitive questions, wait indefinitely, or declare a gap closed. SKILL.md stopping instructions take precedence.

## 4. Diagnosis: path coverage, not questionnaire coverage

Ask only for what available materials cannot provide. Initially formulate **expectation → observed discrepancy → object/version/environment → available evidence**. For a general audit, select representative paths by mandatory scenarios and risk; do not invent a symptom.

Verification map: `obligation/path | versioned evidence | what was actually checked and how | conclusion/unknown | next discriminating check and owner`. As applicable include normal, failure, retry/resume, concurrency, alternative entry, and external-effect boundary. An unchecked path does not inherit a neighboring path's success.

Distinguish **owner assertion / static evidence / execution observation / reproduced result**. An interview reconstructs expectations and finds sources; it does not replace traces, downstream contracts, or tests. README content does not confirm enforcement.

After each significant check, update hypothesis status and coverage. If the next check distinguishes causes and is available within authorized scope, perform it; two rounds of questions are not a reason to stop. Without the source or permission, deliver a partial conclusion with an exact boundary instead of a categorical cause. Use [diagnostic-review.md](diagnostic-review.md) for hypothesis and closure methods.

## 5. Readiness and handoff

State three independent statuses:

1. **Knowledge:** confirmed, proposed, and unknown in the coverage map.
2. **Agreement:** conditional design / architecture for approval / user-approved. The last requires actual confirmation of a specific version or decisions.
3. **Handoff:** sketch / detailed with blockers / sufficient for implementing the stated scope. The last is allowed only with no critical unknowns, no need for the developer to invent the main method, and defined authority/responsibility, interfaces, result validation, and feasibility constraints. Approval does not prove technical readiness; technical detail does not imply approval.

An open question with an owner remains open. A detailed isolated part may be handed off with an explicit boundary; that does not make the whole project ready. Operational quality is confirmed separately by tests of the implemented system.

For audits, state **complete within declared scope / partial**, checked paths, and undetermined causes. A complete audit does not mean no defects or proven safety outside its scope. Do not calculate a universal “ideality” score from filled fields.
