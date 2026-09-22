# Dynamic workflow derivation

Derive a new flow for every request. Examples may clarify a method, but must never become reusable stage lists.

## Anti-template rule

Do not start from a domain lifecycle such as research -> create -> publish -> analyze. Start from the user's final result and current starting point. Add only the intermediate conditions that must actually exist for this result.

Two requests containing the same domain word may need completely different flows. “Learn about a platform,” “publish once,” “run an account every week,” and “build a tool for creators” are not variants of one fixed template.

## Derive backward, validate forward

Ask internally:

1. What observable result would make the user say this is done?
2. What must be true immediately before that result can exist?
3. What input, decision, permission, or transformation makes that condition possible?
4. Repeat until reaching something the user already has or can provide.
5. Walk forward once to confirm that every step produces the next step's input.

Do not ask the user every internal question. Ask only when different answers would change the stack, cost, permissions, or deliverable.

## Detect the shape instead of choosing a template

Infer properties independently:

- one-off or recurring;
- creation, decision, transformation, coordination, or monitoring;
- local-only, external read, or external write;
- human-led, agent-assisted, or automated;
- single system or multi-system;
- reversible or hard to undo;
- low or high consequence when wrong.

These properties guide decomposition without imposing a predetermined list of stages.

## Split and stop rules

Split a step when it contains:

- two independently replaceable actions;
- both reading and external writing;
- different accounts or permissions;
- an approval decision and the action after approval;
- outputs with different success conditions;
- a risky action mixed with a safe action.

Stop splitting when the step has:

- one action a non-technical user can understand;
- one main result;
- one access or side-effect boundary;
- one observable success condition.

## Internal capability card

Keep this technical representation internal unless the user asks for details:

```yaml
goal: user-visible result
input: what is available before the step
operation: one normalized action
output: what the step produces
constraints: []
frequency: one-off|recurring|event-driven
access: local|read-external|write-external
approval: none|before-access|before-spend|before-external-write
success: observable pass condition
fallback: alternative when unavailable
predecessors: []
successors: []
```

Present the same information to a novice as a simple sentence: `先用已有资料确认需求，再生成可审核的结果；只有你确认后才会写入外部系统。`

## Cross-cutting needs

For each derived step, consider only the helpers that matter:

| Need | Ask internally | Possible capability terms |
|---|---|---|
| Quality/style | Does the result need a particular voice or finish? | humanizer, brand voice, proofreading |
| Accuracy | Could unsupported facts or numbers cause harm? | fact check, grounded research, citation verification |
| Compliance | Do platform, copyright, advertising, or industry rules apply? | compliance, policy audit, copyright |
| Privacy/security | Are private data, cookies, keys, or accounts involved? | secret handling, PII redaction, permission audit |
| Localization | Must language, terminology, or culture be adapted? | localization, translation QA |
| Data quality | Can records duplicate or use inconsistent formats? | dedupe, validation, schema mapping |
| Coordination | Are handoffs, schedules, retries, or approvals needed? | workflow, scheduler, human approval |
| Visibility | Must failures or outcomes be observed? | logging, analytics, monitoring |

Match helpers through their capability signature. A Skill that transforms a rough draft into natural writing may support any writing outcome without naming the user's domain.

## Sufficiency check

The flow is detailed enough when every required step has:

- a clear result;
- at least one meaningful search formulation;
- an access and approval classification;
- a yes/no success condition;
- a reason to use an existing Skill, a new Skill, another tool, or no extra capability.

If the generated flow looks suspiciously similar to a prior example, discard it and derive again from the current outcome.
