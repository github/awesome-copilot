---
name: hermes-agent-builder-en
description: Conducts a plain-language discovery interview about the desired outcome and real work, then designs a Hermes system and uses explicit criteria to distinguish deterministic processes, tools, skills, subagents, profiles, and an orchestrator. Use when creating, splitting, or revising an agent system; do not use for ordinary domain-task execution.
license: MIT
metadata:
  author: kotlyar
  version: "1.0.1"
  source: https://github.com/kotlyar/agent-architecture-builder
  hermes-category: engineering
  hermes-tags: hermes, agents, architecture, skills, orchestration
---
# Hermes Agent Builder

## Outcome

Turn the user's desired change and real work into the smallest viable Hermes
architecture. Do not treat agent names, job titles, or proposed skills in the
first request as finished requirements.

Begin with a discovery interview. Establish the current situation, desired
situation, success criteria, and concrete work episodes. Decompose the work into
functions, classify how each function should run, define profile boundaries, and
only then test whether an orchestrator is justified.

## Required references

1. Before the first interview question, read
   [references/discovery-interview.md](references/discovery-interview.md).
2. When a user struggles to answer or a question asks for a broad list of work,
   read [references/question-hints.md](references/question-hints.md) and offer
   optional answer examples.
3. Before finalizing work boundaries, read
   [references/control-interface-and-storage.md](references/control-interface-and-storage.md).
4. After the discovery gates pass, read
   [references/architecture-decisions.md](references/architecture-decisions.md).
5. If a browser-based control panel is selected, read
   [references/web-interface-stack.md](references/web-interface-stack.md) before
   designing or creating its code.
6. Before preparing the final result, read
   [references/delivery-package.md](references/delivery-package.md).

The conditions in these documents are mandatory. Do not replace them with an
overall impression, proxy-signal count, or unexplained score.

## Procedure

1. Extract facts, inferences, hypotheses, and unknowns from the existing context.
   Do not ask the user to repeat known information.
2. Ask one primary interview question per turn. Start with why the system is
   needed, why now, and what should change—not with architecture.
3. Use everyday language and translate answers into technical concepts yourself.
   Do not require knowledge of artificial intelligence, Hermes, JTBD, or system
   architecture.
4. When an open question requires recalling or enumerating many kinds of work,
   show optional examples using `question-hints.md`. The user may choose several,
   write their own answer, or say “I am not sure.”
5. Reconstruct the last real or typical work episode: trigger, inputs, decisions,
   actions, handoffs, stored information, and outcome.
6. Do not design the system until discovery gates `D1–D4` pass. If the user asks
   for an early sketch, label it as a hypothesis. Do not present the profile count
   or an orchestrator as a settled decision.
7. Decompose confirmed work into functions with an input, output, stored state,
   authority, trigger, risk, and decision owner.
8. For each function, test the options in order: deterministic process, tool,
   skill, temporary subagent.
9. Group functions into a separate profile only when all profile conditions and
   at least one isolation condition pass.
10. Consider an orchestrator only after at least two profiles are justified. If
    coordination is fully expressible as rules, create a deterministic router or
    workflow instead of a language-model orchestrator.
11. For every decision, record evidence, rejected alternatives, and the event
    that should trigger architectural review.
12. Design the smallest file structure, state rules, tool permissions, approval
    points for risky actions, and verification. Design work does not authorize
    account creation, publication, spending, or changes to external systems.
13. Justify the control interface and storage separately. Do not add a web
    interface or database merely because it is familiar to the implementer.
14. If a browser panel is justified, use free and open-source libraries under
    `web-interface-stack.md`. Paid component sets and mandatory cloud services
    require the user's explicit choice.
15. Check implementation readiness against gates `R1–R8` in
    `delivery-package.md`. Do not call a design ready while a critical unknown
    remains.
16. When fully ready, create the implementation-kit directory and `.zip` archive
    with `scripts/package_delivery.py`. Include one instruction for the
    implementing agent and installable Hermes profile distributions.

## Default decision rule

An unknown or unverified condition does not pass. When options are otherwise
equal, choose the simpler form:

`deterministic process → tool → skill → subagent → profile → orchestrator`.

A job title, platform, instruction set, persona, or large prompt does not by
itself establish an agent boundary.

## Language rule

Conduct the conversation and create user-facing documents in the user's language.
Do not mix languages for brevity or the appearance of expertise. Keep official
product names, filenames, commands, schema fields, and established technical
terms exact when translation would distort them. Explain unfamiliar terms in
plain language on first use.

Never ask the user about `persistent_state`, `principal`, `lifecycle`,
`capability`, or `orchestrator`. Obtain that information through simple questions
and classify it yourself. An unclear question is a flaw in the interview, not in
the user.

## Intermediate result

Return:

1. current and desired situations, urgency, higher-level goal, success criteria,
   current alternatives, and unknowns;
2. a map of work episodes and functions;
3. a decision table containing every mandatory condition;
4. the selected structure and owners of persistent state;
5. authority boundaries and external effects;
6. the control method: conversation, command line, browser panel, API, or a
   justified combination;
7. the storage method: files, SQLite, PostgreSQL, or no separate database;
8. the Hermes file structure;
9. rejected alternatives and review triggers;
10. one next implementation or validation step.

Give each profile and orchestrator a short, separate justification. If a
condition lacks evidence, mark it `unknown` and do not promote the component to a
more complex level.

## Final result

When `D1–D4` and `R1–R8` pass, return two representations of the same kit:

- a normal `<name>-agent-kit/` directory that can be opened as a project;
- a `<name>-agent-kit.zip` archive that can be transferred or extracted.

The entry point is `START-HERE.md`. The single instruction the user can give to
Codex or Hermes is `IMPLEMENTATION.md`.

If any critical unknown remains, do not create an archive marked ready. Save a
draft kit, list the gaps, and ask one next question.
