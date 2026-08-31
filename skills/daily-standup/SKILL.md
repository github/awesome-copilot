---
name: daily-standup
description: Summarize what actually happened today (or a given date range) across every git repo in WORKSTATION -- commits plus uncommitted in-progress work. Use when the user asks for a standup summary, daily recap, "what did I do today", or end-of-day log.
trigger: /daily-standup
---

# daily-standup

Produce a short "what happened" summary across the WORKSTATION workspace,
for standups or a personal log.

## Process

1. Resolve the date range: default to "since local midnight today" unless
   the user names a relative range (yesterday, this week) — resolve that to
   actual dates before running anything.
2. For each repo listed in `WORKSTATION/CLAUDE.md`'s workspace table, run
   `git log --since=<range> --oneline --all` and `git status --short` to
   catch uncommitted work.
3. Skip any repo with zero commits and zero uncommitted changes in range —
   don't pad the summary with "no activity" lines for every repo.
4. Group output by repo: one line per commit (message only, no hashes
   unless asked), uncommitted changes called out separately as
   "in progress, not committed."

## Rules

- This is a status report, not a changelog — terse, factual, no marketing
  language ("significant improvements," "major refactor").
- Don't editorialize about whether the work was good; report what changed.
- If nothing happened anywhere in range, say so in one line — no apology,
  no over-explaining.
