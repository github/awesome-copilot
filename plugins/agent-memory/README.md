# Agent Memory

Connecting a memory tool does not make an agent use it. The tools register, the session runs, and nothing is recalled or saved. This plugin supplies the missing half: the standing rules that turn an available memory tool into a habit.

## What it does

- **Recall before acting** on repository-specific work, and skip the recall on self-contained questions where it would only cost context.
- **Save after deciding**: decisions that outlive the week, user corrections, approaches that failed and why. One memory, one fact.
- **Close facts instead of deleting them.** "We use Redux" was true from January to June; deleting it destroys the explanation for the code written in that window.
- **Surface contradictions** rather than silently returning whichever entry sits closer in embedding space.

## What it does not do

It does not ship a memory backend and does not require any particular one. The rules read the same whether memory is a `memory/` folder in the repository, a local MCP server, or a hosted one. Nothing here fails without a specific vendor.

## How it differs from repository instructions

`.github/copilot-instructions.md` carries stable project rules that a human curates. Memory carries what accumulates during work: decisions, corrections, failures. Instructions are read every session by design; memory has to be asked for, which is exactly why these rules exist.

## Contents

| Skill | Purpose |
|---|---|
| `agent-memory-discipline` | When to recall, when to save, how to write an entry that is still useful in three weeks |

## Author

Maintained by the team behind [Mnemoverse](https://mnemoverse.com), a hosted memory service reachable over MCP. The discipline is deliberately backend-neutral and was written to be useful without it.
