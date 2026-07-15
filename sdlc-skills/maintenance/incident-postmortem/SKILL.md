---
name: incident-postmortem
description: 'Use when an outage, production incident, or significant service degradation has occurred and the team needs to write a structured blameless post-mortem. Triggers on phrases like "write a post-mortem", "incident review", "what went wrong", "outage report", "root cause analysis", or "RCA". Covers timeline reconstruction, contributing factor analysis, impact quantification, and action item generation with owners.'
---

# Incident Post-Mortem

Guide a team through writing a structured, blameless post-mortem after a production incident. The output is a document that builds shared understanding, identifies root causes without blame, and produces concrete action items to prevent recurrence.

## Blameless Principle

Systems fail, not people. The goal is to understand HOW the incident happened — not WHO caused it. Avoid language like "X forgot to", "Y should have known". Use "the system did not", "the process lacked", "the alert did not fire".

## When to Use

- Production outage or service degradation has been resolved
- A significant near-miss occurred (would have been an incident if caught later)
- User-facing errors, data loss, or SLA breach happened
- Team wants to capture learnings before context fades

**Not for:** Minor bugs caught in staging, planned maintenance windows, or incidents with no learning value.

## Input Requirements

Gather these details before writing the post-mortem. Ask for anything missing:

### Incident Metadata
- Incident title (short, descriptive)
- Date and time of detection (with timezone)
- Date and time of resolution
- Severity / impact level (P1–P4 or equivalent)
- Incident commander / on-call owner

### Impact
- Affected services and systems
- User-facing impact (errors, slowness, full outage)
- Estimated number of users affected
- Data loss or corruption (yes/no, scope)
- SLA/SLO breach (yes/no, by how much)

### Timeline Events
Key moments to reconstruct:
- First symptom occurred
- Alert fired (or was noticed manually)
- On-call paged / incident declared
- Investigation started
- Root cause identified
- Mitigation applied
- Full resolution confirmed
- Customer communication sent (if any)

### Contributing Factors
Ask the team: "What made this worse than it needed to be?" — not "who failed". Examples:
- Alert threshold too high / alert didn't fire
- Runbook was missing or outdated
- Deploy lacked a feature flag for rollback
- Monitoring didn't cover this failure mode
- On-call handoff missed context

## Process

### Step 1 — Gather Metadata
If the user has not provided full incident details, ask for them section by section. Don't proceed to writing until you have: title, times, severity, affected services, and at least a rough timeline.

### Step 2 — Reconstruct Timeline
Work with the user to build a precise chronological timeline. For each event:
- Exact time (UTC preferred)
- What happened (system event or human action)
- Who observed it or took the action
- Link to log / alert / Slack message if available

Flag gaps: "We don't know what happened between 14:32 and 14:47 — worth checking logs."

### Step 3 — Root Cause Analysis
Use the **5 Whys** iteratively:

```
Why did users see 500 errors?
→ The API pods were crash-looping.

Why were they crash-looping?
→ Memory limit was exceeded.

Why was the limit exceeded?
→ A new query was loading full result sets into memory.

Why wasn't this caught before deploy?
→ Load tests only covered the p50 case, not high-cardinality accounts.

Why did load tests only cover p50?
→ We had no test fixtures for large accounts.
```

Stop when you reach a system/process gap you can fix. The last "why" should point to an action item.

Distinguish:
- **Root cause** — the deepest systemic gap (one or two)
- **Contributing factors** — conditions that made it worse but aren't the root cause

### Step 4 — Impact Quantification
Help the user be precise:
- Duration: detection to resolution (not symptom start to resolution — separate these)
- Error rate at peak vs. normal baseline
- Percentage of traffic affected
- Revenue / business impact if known

### Step 5 — Action Items
For each root cause and contributing factor, generate at least one action item:

| # | Action | Owner | Due Date | Priority |
|---|--------|-------|----------|----------|
| 1 | Add load test fixtures for accounts > 10k records | @eng-team | 2026-07-01 | High |
| 2 | Lower memory alert threshold from 90% to 75% | @platform | 2026-06-23 | High |
| 3 | Add runbook for memory OOM pods | @on-call-rotation | 2026-06-30 | Medium |

Action items must have an owner (a person, not a team) and a due date. Vague actions like "improve monitoring" are not acceptable — break them into specific deliverables.

### Step 6 — Write the Document
Produce the full post-mortem using the template below. Save to `docs/postmortems/YYYY-MM-DD-<slug>.md`.

## Output Template

```markdown
# Post-Mortem: [Incident Title]

**Date:** YYYY-MM-DD  
**Severity:** P[1-4]  
**Duration:** X hours Y minutes (HH:MM UTC – HH:MM UTC)  
**Incident Commander:** @name  
**Status:** Resolved

---

## Summary

[2–3 sentences. What happened, what was the user impact, how was it resolved. Written for someone who wasn't involved.]

## Impact

| Dimension | Value |
|-----------|-------|
| Affected services | [list] |
| User-facing impact | [errors / degraded / full outage] |
| Users affected | [estimated number or %] |
| Peak error rate | [X% vs Y% baseline] |
| Data loss | [none / describe scope] |
| SLA breach | [yes/no — by how much] |

## Timeline

All times UTC.

| Time | Event |
|------|-------|
| HH:MM | [First symptom / alert fired] |
| HH:MM | [On-call paged] |
| HH:MM | [Incident declared] |
| HH:MM | [Root cause identified] |
| HH:MM | [Mitigation applied] |
| HH:MM | [Full resolution confirmed] |
| HH:MM | [Customer communication sent] |

## Root Cause

[1–2 paragraphs. The deepest systemic gap that, if fixed, would have prevented the incident. Written in blameless language. Reference the 5 Whys chain if helpful.]

## Contributing Factors

- [Factor 1 — condition that made the incident worse]
- [Factor 2]
- [Factor 3]

## What Went Well

- [Thing that worked — good alert, fast response, clear runbook]
- [Another positive]

## What Could Have Gone Better

- [Gap in process, tooling, or coverage — no blame language]
- [Another gap]

## Action Items

| # | Action | Owner | Due Date | Priority |
|---|--------|-------|----------|----------|
| 1 | [Specific deliverable] | @person | YYYY-MM-DD | High/Medium/Low |
| 2 | | | | |

## Lessons Learned

[Optional. 2–4 bullet points capturing non-obvious insights worth sharing with the broader team.]
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| "Bob forgot to check the config" | "The deploy checklist did not include config validation" |
| Root cause is "human error" | Keep asking Why — human error is always a symptom |
| Action items without owners | Every item needs a named individual, not a team |
| Timeline reconstructed from memory | Check logs, alerts, Slack, PagerDuty before writing |
| "Improve monitoring" as an action | Specify: which service, which metric, what threshold, by when |
| Post-mortem written weeks later | Write within 48–72 hours while context is fresh |
