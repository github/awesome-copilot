---
name: jaxx-memory
description: 'Use a git repo as an agent''s durable memory so work survives context compaction and session death - ACTIVE / BACKLOG / ARCHIVE files, per-stream detail, an append-only run log, and a bidirectional sync rule that forbids work existing only in markdown. WHEN "the agent forgot what we did", "context keeps compacting", "track my work across sessions", "agent memory without a vector db", "standup from my repo", "session hygiene", "how long should an agent session run", or when starting or ending any long-running agent session.'
license: MIT
---

# Repo as memory

An agent's context window is not memory. It compacts, and compaction is lossy in the worst way:
it keeps the shape of the conversation and drops the specifics — the ids, the links, the decisions.
A long session doesn't fail loudly, it just quietly stops knowing things.

Fix: **the repo is the memory, the session is a cache.** Anything that matters is written to a file
before the session that learned it can die.

## Layout

| File | Purpose | Rule |
| --- | --- | --- |
| `ACTIVE.md` | Everything in flight right now | Refresh at session start, flush at session end |
| `BACKLOG.md` | Planned, not started | |
| `ARCHIVE.md` | Completed work | **Append-only. Never delete a row.** |
| `streams/<name>.md` | Deep detail per work stream | Status lives here, not in `ACTIVE.md` |
| `reference/*.md` | Ids, queries, conventions, pipeline numbers | Look here before asking or re-deriving |
| `reference/sessions.md` | One row per session that produced work | Reconciled at session start |
| `<agent>.config.json` | The agent's own rules | Owner-only, see `jaxx-consent` |

Keep files short and skimmable. Tables over prose. Dates as `YYYY-MM-DD`. Every work item and PR
reference is a real link, not a bare number — a number that outlives its context is useless.

**Files missing?** Create them from the [starter files](https://github.com/PruthviProdduturi/Jaxx/tree/main/assets).
Never overwrite a file that already has content, and never
silently work around a missing one: a run log you didn't write is a session that, as far as the next
one can tell, never happened.

## Rule zero — never let work exist only in markdown

The **tracker** (Azure DevOps, Jira, GitHub Issues) is the system of record. The files in this repo
are a **mirror** of it, plus the working detail the tracker has nowhere to put. They never replace
it. When the human describes new work, or the agent discovers untracked work:

1. Create or update the item in the **tracker** first.
2. *Then* record its id and link in these files, the same session.

A row here with no id is a to-do the rest of the organisation cannot see. Equally: never invent
status. If it wasn't verified against the source this session, mark it `(stale)` — a confidently
wrong status is worse than an admitted unknown.

## Session start

1. Read `ACTIVE.md` and the relevant `streams/*.md`.
2. Read `reference/sessions.md`; add any session newer than the last logged row.
3. Re-query the tracker for anything marked stale.
4. Reconcile, then give the human **one short summary of the deltas** — not a file dump.

## Session end

1. **Update or create the matching tracker item first** — rule zero. Nothing should reach the files
   below that doesn't already exist in the system of record.
2. Update `ACTIVE.md` / `BACKLOG.md` / `ARCHIVE.md` with what actually happened.
3. Add a row to `reference/sessions.md`.
4. Commit — `docs(<agent>): <what changed>`.
   Commit **only** the tracking markdown. Never stage `<agent>.config.json`, credentials, tokens, or
   anything under an ignore rule: config holds real people's ids and room ids. And before the first
   push, confirm where the remote points — a repo that mirrors an internal tracker belongs in a
   private one, and whatever your organisation's data policy says about that content governs here
   too.

## Session hygiene — one session per work stream

Not one per day. Not one forever.

- **Name every session at creation** (`-n billing`, `-n auth-migration`). An unnamed session is
  unfindable later.
- **Retire at roughly 60 turns or one week, whichever comes first.** Long sessions don't die, they
  compact — and compaction silently drops detail. A 171-turn session is how thirteen merged pull
  requests went unrecorded despite being discussed at length inside it.
- **Before retiring, flush everything** to `ACTIVE.md` / `ARCHIVE.md` and the tracker. That flush is
  what makes a session safe to throw away.
- **Resume rather than restart** — most CLIs take a session id prefix or name. Restarting from
  nothing costs a full re-derivation of context.

## Append-only run log

For any unattended loop, keep `reference/<loop>-log.md`: one entry per cycle, **including the ones
where nothing happened**. Record what was read, what was decided, what was posted, and any error.

Quiet cycles are the majority and they belong in the log too — the log's job is to let someone audit
a loop that has been running unattended for a week, and a log that only records the exciting cycles
can't distinguish "nothing to do" from "not running".

When a past entry turns out to be wrong, **append a correction that names the entry it retracts**.
Never edit history to look right; the wrong diagnosis is itself useful to whoever hits it next.

## Why git and not a database

- Diffable — you can see what the agent changed about its own memory, and revert it.
- Reviewable — memory changes go through the same review as code.
- Portable — no service to run, nothing to expire, works offline.
- Greppable by the agent itself with the tools it already has.
- The commit log is a second, automatic audit trail of the agent's activity.
