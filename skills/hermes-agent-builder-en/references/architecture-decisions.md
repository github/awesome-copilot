# Architecture decision rules

Apply these rules only after discovery gates `D1–D4` pass. One business area may
contain deterministic processes, tools, and skills while still belonging to one
profile.

## 1. Define functions before roles

Create a card for every function. Each `yes`, `no`, or `unknown` must be backed by
a user requirement, document, system observation, or explicit assumption.

| Field | Required question |
|---|---|
| Function ID | What stable name identifies this unit of work? |
| Outcome | What observable result does it produce? |
| Recipient | Who or what uses the result? |
| Inputs | What information is required? |
| Completion rule | What artifact or change counts as done? |
| Trigger | Who, when, or what event starts the work? |
| Method variability | Is the sequence fixed, or does it require judgment? |
| Persistent state | What must survive between runs? |
| State owner | Who owns the backlog, decision history, and current state? |
| Decision authority | What may this component decide alone? |
| Account | Whose identity and accounts are used? |
| External effects | What can it read, modify, publish, send, or purchase? |
| Lifecycle | How is it started, paused, retried, recovered, and completed? |
| Cadence and deadline | Does it have its own schedule, queue, or service level? |
| Dependencies | Whose input does it need, and who receives its output? |
| Shared resources | Does it share a budget, quota, or people? |
| Failure boundary | Can it be stopped and recovered independently? |

If outcome, persistent state, state owner, or decision authority is unknown, do
not create a new profile or orchestrator. Record the gap and use a simpler
temporary form.

## 2. Classify the execution form

Test options from simplest to most complex. They may be combined: a skill can
call a tool inside a deterministic workflow.

### 2.1 Deterministic process

Use it only when all are true:

- steps and transitions are known before execution;
- the next step is selected by rules over structured data;
- result acceptance is objectively testable;
- a language model does not make an open-ended business decision.

A language-model call inside one step does not turn the whole process into an
agent when branching, retries, and transitions are controlled by the runtime.

### 2.2 Hermes tool

Use a `tool` only when all are true:

- it is one bounded operation on a system or dataset;
- input and output requirements are stable;
- it owns no business goal, backlog, or persistent state;
- the caller decides why and when to invoke it.

Separate read, write, and destructive operations when they require different
credentials, approvals, idempotency, or recovery. Risk requires a safety policy,
but does not turn a tool into an agent.

### 2.3 Hermes skill

Use a `skill` only when all are true:

- it is a repeatable reasoning or artifact-production method;
- trigger, inputs, and completed output are defined;
- the calling profile retains the goal and final decision;
- it has no own account, independent backlog, or state between calls;
- control returns to the caller after the result.

Different methods, API schemas, platform terminology, or platform rules justify
separate skills. They do not by themselves justify separate profiles.

### 2.4 Temporary subagent

Use a `subagent` only when all are true:

- the task has bounded inputs, output, and a completion condition;
- the parent owns the overall goal, external authority, and integration;
- the subagent needs no persistent memory, queue, or enduring identity;
- isolated context, parallel execution, or permission isolation provides a
  concrete benefit for this task.

If the last condition fails, use a skill or deterministic step. If the component
develops its own state and lifecycle, test the profile criteria.

## 3. When to create a Hermes profile

A profile is not a job title. It is a durable owner of an outcome, state, and
execution boundary.

### 3.1 All three profile conditions are mandatory

- `P1 Outcome ownership`: an enduring responsibility, measurable result, or
  class of decisions exists.
- `P2 State ownership`: it owns a backlog, decision history, working state, or
  memory across independent runs.
- `P3 Independent lifecycle`: it can be started, paused, completed, retried, or
  recovered independently; trigger and terminal states are defined.

### 3.2 At least one isolation condition is mandatory

- `I1 Account`: separate credentials, advertising account, organization, or
  account scope.
- `I2 Authority`: materially different tools, write permissions, approvals, or
  spending limits.
- `I3 Data`: separate privacy, memory, or retention requirements.
- `I4 Operations`: its own cadence, service level, queue, recovery, or failure
  boundary.
- `I5 Context`: a sufficiently independent domain where isolation measurably
  improves quality, cost, or safety.
- `I6 Persistent parallel load`: a durable independent queue, not a one-off
  opportunity to delegate.

Formal rule:

```text
profile = P1 AND P2 AND P3 AND (I1 OR I2 OR I3 OR I4 OR I5 OR I6)
```

`unknown` counts as `no` for profile creation. If accounts or data require
isolation but `P1–P3` fail, create a separate service, tool, or execution policy,
not an artificial language-model profile.

The following are insufficient on their own: a job title, platform, API, system
prompt, large instruction set, different model, one-time parallel task, or human
organization chart.

## 4. When an orchestrator is justified

First justify at least two profiles. Then require all four conditions:

- `O1 Multiple profiles`: at least two profiles pass `P1–P3` and isolation.
- `O2 Shared outcome`: the profiles contribute to one composite user or business
  outcome.
- `O3 Integration duty`: someone must allocate shared resources, manage
  dependencies, resolve conflicts, or assemble one decision.
- `O4 Semantic coordination`: allocation or conflict resolution requires
  contextual judgment and cannot be reduced to stable structured-data rules.

```text
model_orchestrator = O1 AND O2 AND O3 AND O4
deterministic_router = O1 AND O2 AND O3 AND NOT O4
no_orchestrator = NOT O1 OR NOT O2 OR NOT O3
```

The orchestrator owns only the shared plan, handoffs, resource conflicts, and
integrated decision. Domain backlogs and evidence remain with the profiles.

Do not create an orchestrator when the user routes independent profiles, they
share no outcome, or integration is a simple fixed sequence.

## 5. Use two passes

Pass A assigns each function one or more execution forms:

`deterministic process | tool | skill | subagent`.

Pass B groups functions that share outcome, state owner, account, and lifecycle.
Test each group against the profile formula, then test the whole system against
the orchestrator formula.

Do not decide whether “SEO is a skill or an agent” before separating auditing,
backlog ownership, brief creation, publication, and measurement.

## 6. Required decision table

| ID | Function or group | P1 | P2 | P3 | I1–I6 | O1–O4 | Decision | Evidence | Rejected | Review trigger |
|---|---|---:|---:|---:|---|---|---|---|---|---|

Allowed values: `yes`, `no`, `unknown`, `not applicable`.

For every skill, subagent, profile, router, and orchestrator, write one testable
sentence: “Selected X because …; rejected Y because …”.

## 7. Split and merge triggers

Promote a skill to a profile only when new evidence makes `P1–P3` and an
isolation condition pass—for example: a separately owned backlog, separate
account or authority, independent schedule or recovery, durable parallel queue,
or measured degradation caused by shared context.

Merge a profile back when it loses its own outcome, state, or lifecycle, or when
coordination cost exceeds the value of isolation.

## 8. Marketing calibration example

| Function | Decision | Reason |
|---|---|---|
| Fetch a Yandex Direct report | Tool | One API operation with no goal or backlog. |
| Design campaign semantics and structure | Skill | Platform-specific method; the paid-acquisition owner keeps the goal. |
| Operate paid acquisition weekly | Profile only if profile and isolation gates pass | It may own metrics, a backlog, campaign state, cadence, and credentials. |
| Run a one-off competitor audit in parallel | Subagent | Bounded output and isolated context; the parent integrates it. |
| Perform a technical SEO audit | Skill | Repeatable method and artifact, without independent state ownership. |
| Own an enduring SEO backlog and experiments | Profile only if profile and isolation gates pass | The boundary comes from state and lifecycle, not the word SEO. |
| Allocate a shared budget between SEO and paid acquisition | Orchestrator only if `O1–O4` pass | Requires contextual trade-offs between justified profiles. |
| Route a task using its `channel` field | Deterministic router | The rule is known in advance. |

A common starting point is one marketer profile with SEO and paid-acquisition
skills. Split it only when the areas develop separate state owners and lifecycles.
Yandex Direct and Google Ads normally remain tools and skills inside a paid
acquisition profile; they become profiles only if each independently passes the
same formula.
