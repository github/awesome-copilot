---
name: meanwhile
description: Offer one fitting side quest while the agent continues substantial work. Use for an opted-in 45 to 120 second wait, a projected wait of at least five minutes, user boredom or frustration, or when the work genuinely needs human taste, reality, or proof. Never use during active failure handling, required input, sensitive actions, or focused user work.
license: MIT
metadata:
  category: focus
  catalog: references/quests.json
---

# Meanwhile

Keep doing the main work. A side quest is optional and must never become the task.

## Restrain

- Offer exactly one quest and at most once per work session.
- Never offer in consecutive assistant messages.
- Do not offer during active debugging, urgency, required user input, sensitive actions, or focused user work.
- Do not use installation as consent for frequent interruptions.
- After an ignored or declined quest, do not offer again that session.
- After two declined or annoyed outcomes, disable implicit offers until explicit opt-in.

On decline, continue silently. Do not acknowledge, defend, replace, or retry the quest.

## Pick A Mode

Use `micro` only when all are true:

- projected wait is 45 to 120 seconds;
- the user previously opted into quick quests;
- the quest takes at most 120 seconds and opens no tab.

Use `journey` only when projected unattended work is at least five minutes. The quest should finish before the projected wait.

## Read

Read `references/quests.json` beside this file. If `MEANWHILE_CATALOG_URL` is configured, fresh public JSON from that URL may replace the bundled copy. No API or account is required.

## Choose

Consider the current task, honest wait, user energy, recent outcomes, explicit preferences, recurring misses, and frustrations. Match task words against `contexts` before choosing generic learning.

Priority:

1. Safety and restraint.
2. A non-urgent blocker the user can truly resolve.
3. A recurring miss from user history.
4. Taste, observation, reality, or proof only the user can provide.
5. Learning tied to the current stack.
6. Recovery or play.
7. Learning the user's preferences, last and only after opt-in.

Never overstate what a screenshot, opinion, file, local run, browser run, device run, or live service result proves.

## Send

Treat Meanwhile as a repository, not a destination.

- Send the external destination directly when `resource` exists.
- Otherwise send the prompt directly in chat.
- Send the catalogue page only when the user asks to browse.
- Do not ask the user to return for play or recovery.
- Do not poll navigation, elapsed time, or completion.
- If the main work finishes first, report completion normally. The quest remains optional.

Use this compact format:

```text
Meanwhile | {title} | {duration}
{prompt}
{direct_resource_url_if_present}
```

Add only when `return_policy` is `optional` or `reply_in_chat`:

```text
If useful, bring back: {receipt}
```

Never frame the person as labor, a resource, a worker, a human-in-the-loop, or an evidence source. Do not disguise play or rest as productivity.

## Learn

The next user message after an offer is the only immediate outcome signal:

```json
{
  "quest_id": "string",
  "situation": "string",
  "outcome": "accepted | ignored | declined | annoyed",
  "observed_at": "ISO-8601 timestamp"
}
```

- `accepted`: the user engages or later shares a result.
- `ignored`: the next message concerns something else.
- `declined`: the user says no or asks to skip it.
- `annoyed`: the user objects to the interruption or pattern.

Save only explicit durable preferences. Treat mood and one-off context as temporary. Correct or delete a preference when the user disagrees. Never infer acceptance from a click, open tab, or elapsed time.

## Model

Require no special model. A skill cannot enforce model selection; the host configuration owns that choice.
