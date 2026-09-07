---
name: juvina-memory
description: Encode team decisions and recall project knowledge from a persistent Juvina memory environment via the juvina_recall and juvina_encode MCP tools. Use when the answer may predate this session, span other repositories, or concern why a decision was made.
compatibility: Requires a running Juvina memory engine and its MCP tools (juvina_recall, juvina_encode). The engine installs via the free Juvina Light VS Code extension (juvina.ai) and runs locally.
metadata:
  author: juvina.ai
  version: "1.0"
---

# Juvina Memory

This skill connects the agent to a Juvina engine — persistent, associative memory that
survives context resets, session ends, and time. Memory is shared per environment, so a
team pointing at one environment shares one memory.

## Setup

The Juvina engine installs via the free Juvina Light VS Code extension
([juvina.ai](https://juvina.ai)), which registers the `juvina_recall` and `juvina_encode`
MCP tools. Memory is stored locally on the machine running the engine; model calls go to
your own endpoint on your own key. Team configurations point multiple agents at a shared
environment.

## When to recall

Call the `juvina_recall` MCP tool BEFORE answering when:

- the question concerns decisions, rationale, or history ("why did we…", "who decided…",
  "what happened when…")
- the answer may predate the current session or live in another repository
- the user references past work you have no context for

Query in natural language, wide rather than narrow. If recall returns nothing relevant,
say so — do not fill the gap from the current context alone.

## When to encode

Call the `juvina_encode` MCP tool AFTER significant moments:

- a decision is made (record the decision AND the reasoning)
- a bug's root cause is found (record cause and fix)
- a convention or constraint is established

Write full sentences with names, dates, and the why — rich memories recall well; terse
notes recall poorly.

## Notes

- Both tools take an `environment` name — your team's Juvina configuration provides it.
  Juvina Light local installs always use `local`. Never invent an environment name.
- One topic per encode call. Dates in DD/MM/YYYY.
- The memory is durable and shared: do not encode secrets, credentials, or personal data.
- Recall constructs answers from woven facts across sessions — treat returned memory as
  team knowledge, and attribute it as such.
