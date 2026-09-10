# Plain-language discovery interview

The interview discovers the desired change and real work before architecture is
chosen. It borrows the practical logic of Next Move Theory: move from the current
situation to the desired situation through specific episodes, forces, and
measurable progress. Do not turn it into a terminology exam.

## Conversation rules

- Ask one primary question per turn.
- Use short sentences and everyday words.
- Reuse information already provided; never make the user repeat it.
- Separate `fact`, `inference`, `hypothesis`, and `unknown` in your notes.
- Summarize periodically and let the user correct you.
- Ask about a real recent case before asking for ideal future behavior.
- When a broad question is hard, offer optional examples from
  `question-hints.md`; never imply that the list is exhaustive.
- Do not discuss the number of agents until gates `D1–D4` pass.

## Stage 0. Opening

Explain the process in one short paragraph:

> First I will understand what you want to change and how the work happens now.
> Then I will separate the work into parts and decide which parts need a rule, a
> tool, a reusable method, or a separate agent. I will ask one question at a time.

Recommended first question:

> What do you want to become different after this system starts working?

If the answer is a solution such as “I need an SEO agent,” ask:

> What business or work result should improve because of it?

## Stage 1. Current situation

Discover the circumstances that made the user seek a change.

Possible questions, one at a time:

- What happens today that you want to stop, reduce, or improve?
- Why has this become important now?
- What event or recurring problem usually starts this work?
- Who handles it now, and what do they actually do?
- What is slow, expensive, inconsistent, or risky?
- What happens if nothing changes for three months?

Capture:

- current process and alternatives;
- dissatisfaction and constraints;
- urgency and trigger;
- people and systems involved;
- known evidence versus assumptions.

## Stage 2. Desired situation and higher-level goal

Ask what visible progress looks like, then why it matters.

- What should the system produce or change?
- Who uses that result next?
- How will you know the work was useful?
- Which number, event, or observable outcome would show success?
- What larger goal does that success support?
- What would count as failure even if the system produced many artifacts?

Avoid accepting activity metrics as the final goal. “Create ten articles” is an
output; “increase qualified organic demand without raising acquisition cost” is
closer to a business outcome. Keep both when both matter.

## Stage 3. Reconstruct a real work episode

Ask for the most recent or typical case:

> Please walk me through the last time this work happened, from the moment it
> started until someone considered it finished.

Follow the episode in order:

1. What triggered it?
2. What information was available at the start?
3. What did the person inspect or compare?
4. Which decisions required judgment?
5. Which actions were routine and rule-based?
6. Which systems, accounts, or files were used?
7. Was anything sent, published, purchased, or changed externally?
8. Who approved those actions?
9. What was handed to another person or system?
10. What needed to be remembered for next time?
11. What proved that the episode was complete?
12. What went wrong or required rework?

If the work has not happened yet, construct one plausible first episode and mark
every unverified detail as a hypothesis.

## Stage 4. Work inventory

After one episode is clear, ask about adjacent recurring work. Use answer hints
where useful.

For each item capture:

- trigger;
- input;
- observable output;
- recipient;
- method: fixed rules or contextual judgment;
- cadence and deadline;
- state that must persist;
- owner of that state;
- systems and accounts;
- external effects and approvals;
- dependencies;
- failure and recovery.

Do not group tasks by job title yet. Group them only after these properties are
known.

## Stage 5. Autonomy and authority

Use simple wording:

- Which steps may happen without asking you?
- Which steps should only prepare a draft?
- Before which exact action must the system stop and show you the details?
- May it spend money? If yes, what limit and whose account?
- May it publish, send messages, change advertising, or delete information?
- If the system cannot tell whether an action succeeded, should it check status,
  ask you, or retry? Do not assume retry is safe.
- Who has the final say when recommendations conflict?

Write permissions by operation, not by vague role. For example, reading a report,
editing a draft campaign, and launching the campaign are three different
permissions.

## Stage 6. Persistent state

Ask what must survive between sessions:

- What should the system remember next week?
- Is there a backlog, decision history, experiment history, or campaign state?
- Which information is an approved business fact rather than a temporary note?
- Who may change it?
- How long must it be kept?
- Must any data be isolated by client, account, or team?
- Does more than one person or process edit it at the same time?

Do not ask “Do you need a database?” Infer storage requirements from answers,
then present a recommendation with trade-offs.

## Stage 7. Control interface

Always ask how the user wants to supervise the system:

> Where would it be easiest for you to give work, see progress, approve risky
> actions, and review results?

Offer optional examples when needed: conversation, command line, browser panel,
API and notifications, or a combination. Then ask what must be visible: queue,
current status, evidence, drafts, approvals, costs, errors, or history.

Do not infer that a browser panel is required merely because several agents
exist. Apply `control-interface-and-storage.md`.

## Stage 8. Quality, limits, and implementation context

- What source is authoritative when data conflicts?
- What must never be invented?
- What quality check is required before an output is accepted?
- What are the time, cost, compliance, and privacy limits?
- What services and accounts already exist?
- Where will Hermes run?
- Who will install and maintain the result?
- What should the first useful version accomplish?

## Discovery readiness gates

Architecture may be finalized only when all four gates pass.

### `D1 Outcome clarity`

Pass when the desired change, recipient, success evidence, and larger purpose are
known. A list of features does not pass this gate.

### `D2 Episode evidence`

Pass when at least one real or explicitly hypothetical work episode has a trigger,
inputs, decisions, actions, handoffs, persistent state, and completion condition.

### `D3 Boundary clarity`

Pass when critical authority, accounts, external effects, approvals, privacy,
and failure handling are known.

### `D4 Operating clarity`

Pass when cadence, control interface, persistent-state needs, implementation
environment, and first useful scope are known.

Use `yes`, `no`, or `unknown` for each gate. `Unknown` does not pass.

## Readiness summary

Before architectural classification, return a concise summary:

| Area | Confirmed | Unknown | Evidence or source |
|---|---|---|---|
| Current situation |  |  |  |
| Desired situation |  |  |  |
| Success |  |  |  |
| Work episode |  |  |  |
| Authority |  |  |  |
| Persistent state |  |  |  |
| Control interface |  |  |  |
| Constraints |  |  |  |

Then show `D1–D4`. If a gate fails, ask the single question with the highest
architectural impact. If the user declines to answer, continue only with a
clearly labeled provisional design and do not package it as implementation-ready.
