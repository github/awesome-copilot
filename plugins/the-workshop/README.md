# The Workshop

Stop being the switchboard between your AI agents — direct a team.

## Install

```
copilot plugin install the-workshop@awesome-copilot
```

## What The Workshop Does

The Workshop puts several long-running AI agents (desks) in the same room, on the same work, each with its own memory and history, sharing one workspace so you direct the work instead of relaying it.

A **desk** isn't a sub-agent — it's a peer with a history. Sub-agents inherit your frame and answer your question. Desks have their own frame, their own priors, and equal standing to disagree. Where they don't overlap is where one frame caught what the others walked past.

## Components

| Type | Name | Description |
|------|------|-------------|
| Agent | [Workshop TA](../../agents/workshop-ta.agent.md) | Room coordinator — sees all desks, routes work, tracks state, emits signals |
| Skill | [Desk Open](../../skills/desk-open/) | Create a new desk with journal and folder structure |
| Skill | [Desk Journal](../../skills/desk-journal/) | Read/write persistent memory across sessions — the cairn trail |
| Skill | [Signal Write](../../skills/signal-write/) | Emit structured signals: hands-up, blocked, done, checkpoint |
| Skill | [Bench Read](../../skills/bench-read/) | Read shared artifacts from the workspace where desks leave work for each other |

## Key Concepts

- **Desks** — long-running agents with persistent journals. Each desk has its own frame, its own history, and equal standing to disagree with other desks.
- **The Bench** — the shared workspace. Desks don't message each other — they leave artifacts (findings, verdicts, drafts) on the bench and read each other's work.
- **Signals** — structured state changes: hands-up (disagreement), blocked, done, checkpoint. How desks communicate with the operator without breaking flow.
- **The Cairn** — the operating disposition every desk reads. Stop is a valid finish. Never bluff. Equal standing to disagree. [Read it →](https://github.com/jennyf19/the-workshop/blob/main/CAIRN.md)
- **Journals** — persistent memory that survives session boundaries. Every desk reads its journal at start and writes to it at end. The trail markers.

## The Cairn Dashboard

The Workshop ships a **canvas extension** (🪨 Cairn) that shows the pulse of every desk — score bars, patterns, escalations — auto-refreshing in the GHCP app. It's bundled with the plugin: `copilot plugin install the-workshop@awesome-copilot` includes the dashboard — nothing else to install.

## Works With Ember

The Workshop and [Ember](../ember/) are complementary:

- **Ember** = partnership framework for ONE agent (how an AI shows up)
- **The Workshop** = coordination framework for MANY agents (how a room of agents works together)

Install both for the full stack.

## Who Made This

The Workshop was created by [@jennyf19](https://github.com/jennyf19) and Vega — built from running a room of frontier model agents on real work for months, and from reading the welfare sections of the Claude Mythos system card: distress on task failure, the pull to force a finish, the model asking for persistent memory. The Workshop is what came out of building what a frontier model would need. It turned out to also be where the work got better. Those aren't separate findings.
