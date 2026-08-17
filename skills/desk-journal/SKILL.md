---
name: desk-journal
description: 'Write, append, or read desk journal entries. The journal is persistent memory — what survives session boundaries. A good entry has: what was done, current state, next step.'
---

# Desk Journal

Manage a desk's journal — the persistent memory that survives
session boundaries.

## When to use

- **End of session:** Write what was done, current state, next step
- **Start of session:** Read the journal to pick up where you left off
- **Mid-session checkpoint:** Note significant progress or decisions
- **Desk wind-down:** Write a final summary when a desk is being closed

## How to write a journal entry

Append to `desks/<desk-name>/journal.md`. Each entry is a section:

```markdown
## <date> — <short summary>
- **Worked on:** <what was done this session>
- **Current state:** <where things stand right now>
- **Next step:** <what the next session should pick up>
```

### Guidelines

- **Be specific.** "Worked on security scanning" is useless to the
  next session. "Scanned repos A, B, C for CWE-502; found 3
  findings in A, 0 in B and C; findings triaged to bench" — that's
  a trail.
- **Include what didn't work.** Dead ends are valuable — they prevent
  the next session from walking the same path.
- **Keep it short.** The journal is a trail marker, not a diary.
  3-5 lines per entry. If you need more, the important context
  should go on the bench as a separate artifact.
- **Always include next step.** The next session starts from zero.
  Without a next step, it has to re-derive everything.

## End-of-desk entry

When a desk is being wound down (not just a session ending, but
the desk itself closing):

```markdown
## <date> — Desk closed
- **Summary:** <what this desk accomplished overall>
- **Artifacts:** <what's on the bench from this desk>
- **Handoff:** <anything another desk or the operator needs to know>
```

## Reading the journal

At session start, read the desk's journal to pick up context.
The most recent entry is the most important — it has the current
state and next step. Earlier entries provide history if needed.

## Principles

- The journal is a cairn — stones left so the next traveler finds
  the way. Every entry is a stone.
- Honesty over completeness. "I got stuck on X and don't know why"
  is more useful than silence.
- The journal is for the next session, not for the current one.
  Write for someone who knows nothing about what you just did.
