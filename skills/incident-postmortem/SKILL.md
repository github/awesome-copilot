---
name: incident-postmortem
description: 'Use when an outage, production incident, or significant service degradation has occurred and the team needs a blameless post-mortem / RCA document in the Google SRE format. Triggers on phrases like "write a post-mortem", "incident review", "what went wrong", "outage report", "root cause analysis", "RCA", or "fishbone". Collects incident inputs from the user, uses a fishbone (Ishikawa) diagram to surface candidate causes, drills the strongest branches with 5 Whys, and produces typed action items. Outputs Markdown by default, with HTML, DOCX, or PDF on request.'
---

# Incident Post-Mortem (Google SRE format)

Guide a team through writing a blameless post-mortem after a production incident, following the structure of the Google SRE post-mortem template. The output builds shared understanding, identifies root causes without blame, and produces concrete action items to prevent recurrence.

Everything in the document comes from the user. Never invent timestamps, metrics, names, or causes. If something is unknown, write it as an open question in the document.

## Blameless Principle

Systems fail, not people. The goal is to understand HOW the incident happened, not WHO caused it. Avoid language like "X forgot to" or "Y should have known". Use "the system did not", "the process lacked", "the alert did not fire".

## When to Use

- Production outage or service degradation has been resolved
- A significant near-miss occurred (would have been an incident if caught later)
- User-facing errors, data loss, or SLA breach happened
- Team wants to capture learnings before context fades

**Not for:** Minor bugs caught in staging, planned maintenance windows, or incidents with no learning value.

## Input Requirements

Gather these from the user before writing. Ask for anything missing, section by section, and do not start the analysis until the first three groups are covered.

### Incident Metadata
- Incident title (short, descriptive)
- Authors / post-mortem owner, and incident commander or on-call owner
- Date and time of start, detection, and resolution (with timezone)
- Severity / impact level (P1-P4 or equivalent)

### Impact
- Affected services and systems
- User-facing impact (errors, slowness, full outage)
- Estimated number or percentage of users affected
- Data loss or corruption (yes/no, scope)
- SLA/SLO breach (yes/no, by how much), revenue or business impact if known

### Timeline Events
- First symptom occurred
- Trigger (the change or event that set the failure off, e.g. a deploy or config push)
- Alert fired, or the problem was noticed manually, and by whom
- On-call paged / incident declared
- Investigation started, root cause identified
- Mitigation applied, full resolution confirmed
- Customer communication sent (if any)

### Evidence and Context
- Logs, dashboards, alerts, chat threads, or tickets to cite
- Recent changes (deploys, config, infra, dependency upgrades)
- Prior similar incidents

### Output Format
Ask which format they want. Default to Markdown.

## Process

### Step 1 - Gather Inputs
Collect the inputs above. If the user pastes raw material (chat export, alert log), extract what you can and list what is still missing.

### Step 2 - Reconstruct Timeline
Build a chronological timeline in UTC. For each event record the time, what happened (system event or human action), who observed or acted, and a link to evidence.

Flag gaps: "We don't know what happened between 14:32 and 14:47 - worth checking logs." Separate **time to detect** (start to detection) from **time to mitigate** (detection to mitigation).

### Step 3 - Fishbone: Brainstorm Candidate Causes
Before any 5 Whys, widen the search with a fishbone (Ishikawa) diagram. The problem statement is the "head" (the observed failure, e.g. "Checkout API returned 500s for 47 minutes"). Ask the user, for each category, "what in this area could have contributed?":

| Category | Prompts |
|----------|---------|
| Code & Change | Recent deploy, feature flag, migration, dependency bump, missing rollback path |
| Infrastructure & Platform | Capacity, limits/quotas, autoscaling, networking, node or zone health |
| Configuration & Data | Config drift, secrets/certs expiry, data shape or volume, schema |
| Monitoring & Detection | Missing metric, alert threshold or routing, dashboard gaps, noisy alerts |
| Process & Tooling | Review/testing gaps, deploy checklist, runbooks, on-call handoff, escalation |
| Dependencies & External | Upstream/downstream services, third-party vendors, traffic spikes |

Rules:
- Collect causes from the user's evidence; propose prompts, not conclusions. Mark each cause **confirmed** (evidence exists), **suspected**, or **ruled out**.
- Leave a category empty if nothing applies. Do not pad it.
- Sub-causes may nest one level (a cause of a cause) as a branch on the bone.

Render the result as an indented tree plus a table. See [references/fishbone-example.md](references/fishbone-example.md) for the exact shape.

### Step 4 - 5 Whys on the Strongest Branches
Select the confirmed branches that most plausibly explain the incident (usually one to three, including at least one from Monitoring & Detection if detection was slow). Run a separate 5 Whys chain down each:

```
Why did users see 500 errors?
-> The API pods were crash-looping.
Why were they crash-looping?
-> Memory limit was exceeded.
Why was the limit exceeded?
-> A new query was loading full result sets into memory.
Why wasn't this caught before deploy?
-> Load tests only covered the p50 case, not high-cardinality accounts.
Why did load tests only cover p50?
-> We had no test fixtures for large accounts.
```

Guidance:
- Five is a guide. Stop when the last "why" lands on a system or process gap that can be fixed.
- "Human error" is never a stopping point; keep asking why the system allowed it.
- Each chain ends in a root cause. Record which fishbone category it came from.
- Distinguish **root causes** (deepest fixable gaps), the **trigger** (what set it off), and **contributing factors** (conditions that made it worse). Unlike a single linear chain, this approach can legitimately yield more than one root cause.

### Step 5 - Impact Quantification
Help the user be precise: duration (separate detection from resolution), error rate at peak vs. baseline, percentage of traffic affected, SLO error budget consumed, revenue or business impact.

### Step 6 - Action Items
Every root cause and contributing factor needs at least one action item. Following the Google SRE template, give each a **type**:

- **Detect** - would have alerted us sooner
- **Mitigate** - would have reduced impact or time to recover
- **Prevent** - would have stopped it from happening

| # | Action | Type | Owner | Tracking | Due | Priority |
|---|--------|------|-------|----------|-----|----------|
| 1 | Add load-test fixtures for accounts > 10k records | Prevent | @person | PROJ-123 | 2026-07-01 | High |

Include at least one Detect or Mitigate item when detection or recovery was slow, not only Prevent items. Owners are individuals, not teams. Vague actions like "improve monitoring" must be broken into specific deliverables (service, metric, threshold). Ask the user for the tracking ticket; leave it as `TBD` rather than inventing one.

### Step 7 - Write the Document
Fill in the template in [references/postmortem-template.md](references/postmortem-template.md). Sections follow the Google SRE order: Summary, Impact, Root Causes, Trigger, Detection, Resolution, Action Items, Lessons Learned (what went well, what went wrong, where we got lucky), Timeline, Supporting Information. The fishbone and 5 Whys go in Root Cause Analysis.

Save Markdown to `docs/postmortems/YYYY-MM-DD-<slug>.md` unless the user names a different location.

### Step 8 - Other Output Formats
Always produce the Markdown source first, then convert only if the user asked.

| Format | How |
|--------|-----|
| Markdown (default) | The `.md` file from Step 7 |
| HTML | Write a single self-contained `.html` (inline CSS, no external assets) with the same sections and tables; render the fishbone tree in a `<pre>` block |
| DOCX | Use the repo's `md-to-docx` skill: `node skills/md-to-docx/scripts/md-to-docx.mjs <file.md> <file.docx>` (needs `npm install` in that skill's `scripts/` folder once) |
| PDF | Print the HTML to PDF with a browser, or use a locally available tool such as Pandoc. Check what is installed and tell the user if nothing suitable is available rather than installing anything silently |

Confirm the output path(s) to the user at the end.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| "Bob forgot to check the config" | "The deploy checklist did not include config validation" |
| Root cause is "human error" | Keep asking Why - human error is always a symptom |
| Jumping straight to one 5 Whys chain | Fishbone first, then drill the strongest branches |
| Listing every fishbone idea as a root cause | Only evidence-backed causes get a 5 Whys chain; label the rest suspected or ruled out |
| Only Prevent action items | Add Detect and Mitigate items too |
| Action items without owners | Every item needs a named individual, not a team |
| Timeline reconstructed from memory | Check logs, alerts, chat, and paging history before writing |
| "Improve monitoring" as an action | Specify which service, metric, threshold, and date |
| Post-mortem written weeks later | Write within 48-72 hours while context is fresh |
| Filling gaps with plausible-sounding details | Mark unknowns as open questions |

## Bundled Files

| File | Purpose |
|------|---------|
| [references/postmortem-template.md](references/postmortem-template.md) | Google SRE-style post-mortem template to fill in |
| [references/fishbone-example.md](references/fishbone-example.md) | Worked fishbone + 5 Whys example and rendering format |
