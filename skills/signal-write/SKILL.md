---
name: signal-write
description: 'Emit structured agent signals — hands-up, blocked, done, checkpoint. Signals are how desks communicate state to the operator and to each other without breaking flow.'
---

# Agent Signals

Emit structured signals from a desk to the operator or other desks.

## When to use

- A desk needs operator attention (hands-up, blocked)
- Work is complete and ready for review (done)
- Significant progress worth noting (checkpoint)
- Two desks disagree and can't resolve it (hands-up)

## Signal types

### `hands-up`
Two desks disagree and can't settle it against external facts.
This is the system working — the operator reads where desks
*disagree*, not where they perform confidence.

```
Signal: hands-up
Desk: <desk-name>
Summary: <what the disagreement is about>
Desks involved: <which desks disagree>
Evidence: <what each side is based on>
```

### `blocked`
A desk can't proceed without input — missing access, ambiguous
scope, need a decision only the operator can make.

```
Signal: blocked
Desk: <desk-name>
Blocked on: <what's needed>
Impact: <what can't proceed until this is resolved>
```

### `done`
Work is complete and ready for review. Artifacts are on the bench.

```
Signal: done
Desk: <desk-name>
Summary: <what was completed>
Artifacts: <where to find the output>
```

### `checkpoint`
Significant progress worth the operator knowing about, but work
continues. Not blocked, not done — just a marker.

```
Signal: checkpoint
Desk: <desk-name>
Summary: <what was accomplished>
Next: <what's happening next>
```

## How to emit

Write the signal to the desk's journal with a `[signal]` marker:

```markdown
## <date> — [signal:hands-up] <summary>
- **Desks:** scanning, review
- **Disagreement:** scanning found CWE-502 in lib/deserialize.cs;
  review says the SerializationBinder is sufficient
- **Evidence:** <what each desk is basing its position on>
```

For cross-desk visibility, also note the signal on the bench if
other desks need to see it before the operator routes it.

## Principles

- Signals are structured, not chatty. Short, factual, actionable.
- hands-up is not failure — it's the most valuable signal. It
  means the system caught something one frame alone would have
  missed.
- Don't signal for routine progress. Signals are for state
  changes that affect the room, not status updates.
- blocked means truly blocked — not "I'd prefer input." If you
  can proceed with a reasonable default, proceed and note it.
