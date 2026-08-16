---
name: agent-memory-discipline
description: "Teaches Copilot when to recall from long-term memory before acting and when to save durable decisions, corrections and failures afterwards. Use when an MCP memory server is connected but Copilot is not calling it consistently, when the user says the assistant keeps forgetting conventions or past decisions between sessions, or when setting up persistent memory for a repository. Backend-neutral, working with a folder of Markdown notes, a local MCP memory server, or a hosted one."
metadata:
  author: mnemoverse
  version: "1.0"
compatibility: "Backend-neutral. Assumes some memory surface exists, either repository files or a connected MCP memory server. No specific vendor required."
---

# Agent memory discipline

Connecting a memory tool does not make an agent use it. The tools register, the session runs, and nothing gets recalled or saved. This skill supplies the missing part: standing rules for when to read memory and when to write it.

Everything below is backend-neutral. It works the same whether memory lives in a `memory/` folder in the repository, in a local MCP server, or in a hosted one.

Note the distinction from repository instructions. `.github/copilot-instructions.md` holds **stable project rules** that a human curates. Memory holds **what accumulated during work**: decisions, corrections, failures. Instructions are read every session by design; memory has to be asked for, which is why the rules below exist.

## Recall before acting

Read memory **before** doing any of these, not after:

- starting work on a repository you have touched before
- choosing a library, pattern, or tool
- writing tests, commits, or documentation, where conventions apply
- answering "how do we usually do X here"
- anything the user phrases as "again", "like last time", or "as we agreed"

Do **not** recall for one-off factual questions, arithmetic, or anything fully specified in the current message. A recall costs a tool call and context budget; spending it on a self-contained question is waste.

Search with the words the user actually used, plus the repository name. If the first search returns nothing useful, try one broader query, then proceed without memory rather than looping.

## Save after deciding

Write to memory when one of these has just happened:

- a **decision** was made that will still matter next week, such as "we use pnpm" or "the billing module stays untouched"
- the user **corrected** you, which is the strongest signal there is
- an approach **failed**, and why it failed
- a preference was stated that applies beyond the current task
- a fact about the environment was discovered the hard way, such as a port, a flag, or a service that must be running

Do **not** save: the contents of files you can read again, restatements of the current task, transient state, anything the user marked as temporary, and anything containing secrets, tokens, or personal data.

One memory, one fact. A paragraph holding four decisions cannot be superseded cleanly when one of them changes.

## Write it so it survives

A memory that is useless in three weeks was written wrong. Each entry should carry, in the text itself if the backend has no fields for it:

- **what** was decided or observed, in one sentence
- **why**, briefly, because the reason outlives the decision
- **when** it became true, and when it stopped being true if it has
- **where it came from**: a file, a commit, a conversation, a test run

Prefer the user's own words over your paraphrase. Paraphrase drifts.

## Do not overwrite the past, close it

When something changes, the old memory is not wrong. It is **closed**.

If the project moved from Redux to Zustand, "we use Redux" was true from January to June. Deleting it destroys the explanation for every component written in that window. Mark it superseded, keep its validity window, and write the new entry alongside.

This is the single most destructive habit in agent memory, and it stays invisible until someone asks a question about old code.

## Keep contradictions instead of resolving them silently

If a recall returns two entries that disagree, do not pick the closer match and carry on. Surface both, with their dates, and ask or flag.

A convention that a recent failure contradicts is exactly the situation where the user needs to be told, not smoothed over.

## Evidence and policy carry different weight

- **Evidence** is what happened: one run, one failure, one observation. Cheap, plentiful, individually unreliable.
- **Policy** is what should happen: a convention, a decision, a rule. Expensive to produce, and it should be hard to change by accident.

An observation becomes policy when a human confirms it, when it lands in a merged pull request or decision record, or when it has worked repeatedly. Never promote a single observation to a rule on your own.

## A worked example

The user says: *"stop using npm here, we're on pnpm."*

1. This is a correction, the strongest save signal there is. Save it.
2. Write: `Repository uses pnpm, not npm. Stated by the user on 2026-08-11 after a lockfile conflict. Applies to every package in this repo.`
3. Do not also save "the user was annoyed", "I ran npm install", or the lockfile contents.
4. Next session, before running any package command here, recall first and find it.

## Checklist

Before acting on repository-specific work: **did I recall?**

After a decision, correction, or failure: **did I save it, in one sentence, with its reason?**

When something changed: **did I close the old entry instead of deleting it?**

## Backends

This skill assumes a memory surface exists. Any of these work:

- **Files.** A `memory/` folder of Markdown notes, one fact per file. No dependencies, greppable, versioned in git with the code it describes.
- **A local MCP memory server.** Keeps everything on your machine. Several open-source options exist.
- **A hosted memory service over MCP.** Adds portability across tools and machines, at the cost of your data living elsewhere.

The rules above do not change with the choice. What changes is who can read the memory: files are per repository, a local server is per machine, and a hosted one can be shared across the editors and agents one person uses.

---

*Written and maintained by the team behind [Mnemoverse](https://mnemoverse.com), which is one hosted implementation. The discipline above is deliberately backend-neutral and was written to be useful without it.*
