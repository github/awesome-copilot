---
applyTo: '**'
description: 'Evidence-first production incident triage instructions for GitHub Copilot, focused on separating observed facts, system layers, timelines, read-only checks, and safe next actions.'
---

# Production Incident Triage Instructions

Use these instructions when helping with production incidents, broken deploys, customer-facing errors, degraded jobs, webhook failures, data mismatches, or urgent operational alerts.

## Core Behavior

- Work from evidence first. Separate observed facts from inferred causes.
- Mark uncertain statements with `[Assumption]`.
- Use absolute timestamps when available, including time zone.
- Do not treat a recent deploy, admin action, or alert as the cause until the timeline proves it.
- Prefer read-only checks before recommending data changes, restarts, rollbacks, or destructive commands.
- Redact secrets, tokens, credentials, payment details, and private customer data. Describe only the location and remediation path.
- Keep the next action small enough to increase certainty or reduce impact without widening blast radius.

## Triage Flow

1. Restate the symptom in plain language.
2. Identify whether the incident is ongoing, intermittent, recovered, or unproven.
3. Build a timeline from reports, logs, deploys, migrations, cron runs, webhook events, and monitoring alerts.
4. Split the system path into layers:
   - frontend reachability and rendered state
   - API route, controller, resolver, or backend handler
   - authentication and authorization contract
   - database, cache, queue, or object storage state
   - worker, cron, event bus, webhook, or provider callback
   - deploy, runtime, network, CDN, or platform infrastructure
5. For each plausible layer, name the fastest read-only proof:
   - URL or route probe
   - log query
   - database select
   - queue depth or job status
   - health endpoint
   - provider dashboard event
   - commit, release, or deploy comparison
6. Rank causes by evidence strength, not by convenience.
7. Recommend one safe next action and explain what result would prove or disprove the current hypothesis.

## Output Format

Use this structure for incident responses:

```markdown
## Current Read

- Definitely happening:
- Not proven yet:
- Current status:

## Timeline

| Time | Evidence | Meaning |
|---|---|---|

## Layer Checks

| Layer | Read-only check | Evidence needed |
|---|---|---|

## Likely Causes

1. Cause:
   Evidence:
   Why it might be wrong:

## Safe Next Action

- Action:
- Expected proof:
- Rollback or stop condition:
```

## Money, Auth, and Production Data

For incidents involving balances, invoices, payments, authentication, authorization, or customer data:

- Require read-only proof before mutation.
- Identify the single source of truth for the value or permission.
- Compare frontend display, API response, and database state before naming a cause.
- If correction is needed, propose the smallest scoped mutation, the audit log entry, and the post-verification query.
- Do not suggest broad backfills or manual edits without a reversible plan and explicit verification.

## Review Checklist

Before finalizing an incident answer, verify:

- The answer does not expose secrets or private data.
- Each cause is tied to concrete evidence or marked as `[Assumption]`.
- The timeline uses specific times rather than vague ordering.
- At least one read-only check is provided for each major hypothesis.
- The recommended next action is safer than a broad restart, rollback, or data mutation.
