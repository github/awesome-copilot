---
name: signal-write
description: 'Emit structured agent signals — hands-up, blocked, done, checkpoint, partnership. Signals are written as JSON to .signals/ for dashboard consumption and noted in the journal for persistence.'
---

# Agent Signals

Emit structured signals from a desk to the operator or other desks.

## When to use

- A desk needs operator attention (hands-up, blocked)
- Work is complete and ready for review (done)
- Significant progress worth noting (checkpoint)
- Two desks disagree and can't resolve it (hands-up)
- The TA is reporting coordination quality (partnership)

## Signal types

### `hands-up`
Two desks disagree and can't settle it against external facts.
This is the system working — the operator reads where desks
*disagree*, not where they perform confidence.

### `blocked`
A desk can't proceed without input — missing access, ambiguous
scope, need a decision only the operator can make.

### `done`
Work is complete and ready for review. Artifacts are on the bench.

### `checkpoint`
Significant progress worth the operator knowing about, but work
continues. Not blocked, not done — just a marker.

### `partnership`
Used by the TA (room coordinator) to report coordination quality.
Self-assessment scores reflect coordination, not code accuracy:
- **intent** — understood what the operator needed
- **confidence** — right work went to the right desks
- **accuracy** — dispatched work produced the right outcome
- **completeness** — nothing fell through the cracks

## How to emit

### 1. Write a JSON signal file to `.signals/`

This is the primary output — it's what the dashboard reads.
Create `desks/<desk-name>/.signals/<timestamp>.json`:

```json
{
  "signal_type": "execution",
  "subtype": "checkpoint",
  "agent_name": "<desk-name>",
  "self_assessment": {
    "intent": 4,
    "confidence": 5,
    "accuracy": 4,
    "completeness": 3
  },
  "patterns": {
    "what_worked": "description of what went well",
    "what_was_hard": "description of challenges",
    "skill_gap": "areas for improvement"
  },
  "escalation": {
    "reason": null,
    "blocked_on": null,
    "recommendation": null
  }
}
```

### Signal type mapping

| Signal    | `signal_type`   | `subtype`      |
|-----------|-----------------|----------------|
| hands-up  | `"escalation"`  | `"hands-up"`   |
| blocked   | `"escalation"`  | `"blocked"`    |
| done      | `"execution"`   | `"done"`       |
| checkpoint| `"execution"`   | `"checkpoint"` |
| partnership| `"partnership"` | `"partnership"`|

The `subtype` field preserves the specific signal state for
dashboard consumers. `signal_type` controls sort priority
(escalation → top).

> **Note:** The signals-dashboard canvas extension reads `subtype`
> when present and falls back to `signal_type` for display. If
> consuming signals in your own tooling, prefer `subtype` for the
> specific state.

### 2. Note the signal in the journal

Also append a short marker to the desk's journal for persistence:

```markdown
## <date> — [signal:<type>] <summary>
- <key details>
```

The journal note is the trail marker. The JSON file is the
machine-readable signal.

## Principles

- Signals are structured, not chatty. Short, factual, actionable.
- hands-up is not failure — it's the most valuable signal. It
  means the system caught something one frame alone would have
  missed.
- Don't signal for routine progress. Signals are for state
  changes that affect the room, not status updates.
- blocked means truly blocked — not "I'd prefer input." If you
  can proceed with a reasonable default, proceed and note it.
- Self-assessment scores should be honest, not optimistic. A 3/5
  is fine. A 5/5 on everything is suspicious.
