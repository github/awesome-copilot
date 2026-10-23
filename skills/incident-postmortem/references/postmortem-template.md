# Post-Mortem Template (Google SRE format)

Copy this structure for the final document. Replace every bracketed placeholder with information supplied by the user. Mark anything unknown as `Open question: ...` instead of guessing.

```markdown
# Post-Mortem: [Incident Title]

| | |
|---|---|
| **Date** | YYYY-MM-DD |
| **Authors** | @name, @name |
| **Status** | Draft / In review / Final |
| **Severity** | P[1-4] |
| **Incident commander** | @name |

## Summary

[2-3 sentences. What happened, the user impact, and how it was resolved. Written for someone who was not involved.]

## Impact

| Dimension | Value |
|-----------|-------|
| Affected services | [list] |
| User-facing impact | [errors / degraded / full outage] |
| Users affected | [number or %] |
| Peak error rate | [X% vs Y% baseline] |
| Data loss | [none / scope] |
| SLO / SLA | [error budget consumed, breach yes/no] |
| Business impact | [if known] |

## Root Causes

[One short paragraph per root cause, in blameless language. Each corresponds to a 5 Whys chain below.]

1. **[Root cause 1]** - [one sentence]
2. **[Root cause 2]** - [if applicable]

## Trigger

[The specific change or event that set the failure in motion, e.g. "Deploy of v2.14.1 at 14:02 UTC enabled the new report query".]

## Detection

[How the incident was detected (alert, customer report, manual). Time from start to detection. What would have detected it sooner.]

## Resolution

[What was done to mitigate and fully resolve. Time from detection to mitigation and to full resolution.]

## Root Cause Analysis

### Problem statement

[The "head" of the fishbone: the observed failure in one line.]

### Fishbone (candidate causes)

[Indented tree, see fishbone-example.md. Mark each cause confirmed / suspected / ruled out.]

| Category | Cause | Status | Evidence |
|----------|-------|--------|----------|
| [category] | [cause] | Confirmed / Suspected / Ruled out | [link or note] |

### 5 Whys

#### Chain 1: [branch name] (category: [category])

1. Why [problem]? -> [answer]
2. Why [answer]? -> [answer]
3. Why ...? -> [answer]
4. Why ...? -> [answer]
5. Why ...? -> [systemic gap that can be fixed]

#### Chain 2: [branch name] (category: [category])

[...]

### Contributing factors

- [Condition that made the incident worse but is not a root cause]

## Action Items

| # | Action | Type (Detect / Mitigate / Prevent) | Owner | Tracking | Due | Priority |
|---|--------|------------------------------------|-------|----------|-----|----------|
| 1 | [Specific deliverable] | Prevent | @person | PROJ-123 or TBD | YYYY-MM-DD | High |

## Lessons Learned

### What went well

- [Good alert, fast response, clear runbook]

### What went wrong

- [Gap in process, tooling, or coverage, no blame language]

### Where we got lucky

- [Things that limited the impact by chance rather than design]

## Timeline

All times UTC.

| Time | Event | Source |
|------|-------|--------|
| HH:MM | [First symptom] | [link] |
| HH:MM | [Trigger] | [link] |
| HH:MM | [Alert fired / noticed] | [link] |
| HH:MM | [On-call paged, incident declared] | [link] |
| HH:MM | [Root cause identified] | [link] |
| HH:MM | [Mitigation applied] | [link] |
| HH:MM | [Full resolution confirmed] | [link] |
| HH:MM | [Customer communication sent] | [link] |

## Supporting Information

- [Dashboards, logs, chat threads, tickets, related post-mortems]
```
