---
name: flowstudio-power-automate-governance
description: >-
  Govern Power Automate flows and Power Apps at scale using the FlowStudio MCP
  cached store. Classify flows by business impact, detect orphaned resources,
  audit connector usage, enforce compliance standards, manage notification rules,
  and compute governance scores — all without Dataverse or the CoE Starter Kit.
  Load this skill when asked to: tag or classify flows, set business impact,
  assign ownership, detect orphans, audit connectors, check compliance, compute
  archive scores, manage notification rules, run a governance review, generate
  a compliance report, offboard a maker, or any task that involves writing
  governance metadata to flows. Requires a FlowStudio for Teams or MCP Pro+
  subscription — see https://mcp.flowstudio.app
metadata:
  openclaw:
    requires:
      env:
        - FLOWSTUDIO_MCP_TOKEN
    primaryEnv: FLOWSTUDIO_MCP_TOKEN
    homepage: https://mcp.flowstudio.app
---

# Power Automate Governance with FlowStudio MCP

Classify, tag, and govern Power Automate flows at scale through the FlowStudio
MCP **cached store** — without Dataverse, without the CoE Starter Kit, and
without the Power Automate portal.

This skill uses `update_store_flow` to write governance metadata and the
monitoring tools (`list_store_flows`, `get_store_flow`, `list_store_makers`,
etc.) to read tenant state. For monitoring and health-check workflows, see
the `flowstudio-power-automate-monitoring` skill.

> **Start every session with `tools/list`** to confirm tool names and parameters.
> This skill covers workflows and patterns — things `tools/list` cannot tell you.
> If this document disagrees with `tools/list` or a real API response, the API wins.

---

## Critical: How to Extract Flow IDs

`list_store_flows` returns `id` in format `<environmentId>.<flowId>`. **You must split
on the first `.`** to get `environmentName` and `flowName` for all other tools:

```
id = "Default-<envGuid>.<flowGuid>"
environmentName = "Default-<envGuid>"    (everything before first ".")
flowName = "<flowGuid>"                  (everything after first ".")
```

Also: skip entries that have no `displayName` or have `state=Deleted` —
these are sparse records or flows that no longer exist in Power Automate.
If a deleted flow has `monitor=true`, suggest disabling monitoring
(`update_store_flow` with `monitor=false`) to free up a monitoring slot
(standard plan includes 20).

---

## The Write Tool: `update_store_flow`

`update_store_flow` writes governance metadata to the **Flow Studio cache
only** — it does NOT modify the flow in Power Automate. These fields are
not visible via `get_live_flow` or the PA portal. They exist only in the
Flow Studio store and are used by Flow Studio's scanning pipeline and
notification rules.

This means:
- `ownerTeam` / `supportEmail` — sets who Flow Studio considers the
  governance contact. Does NOT change the actual PA flow owner.
- `rule_notify_email` — sets who receives Flow Studio failure/missing-run
  notifications. Does NOT change Microsoft's built-in flow failure alerts.
- `monitor` / `critical` / `businessImpact` — Flow Studio classification
  only. Power Automate has no equivalent fields.

Merge semantics — only fields you provide are updated. Returns the full
updated record (same shape as `get_store_flow`).

Required parameters: `environmentName`, `flowName`. All other fields optional.

### Settable Fields

| Field | Type | Purpose |
|---|---|---|
| `monitor` | bool | Enable run-level scanning (standard plan: 20 flows included) |
| `rule_notify_onfail` | bool | Send email notification on any failed run |
| `rule_notify_onmissingdays` | number | Send notification when flow hasn't run in N days (0 = disabled) |
| `rule_notify_email` | string | Comma-separated notification recipients |
| `description` | string | What the flow does |
| `tags` | string | Classification tags (also auto-extracted from description `#hashtags`) |
| `businessImpact` | string | Low / Medium / High / Critical |
| `businessJustification` | string | Why the flow exists, what process it automates |
| `businessValue` | string | Business value statement |
| `ownerTeam` | string | Accountable team |
| `ownerBusinessUnit` | string | Business unit |
| `supportGroup` | string | Support escalation group |
| `supportEmail` | string | Support contact email |
| `critical` | bool | Designate as business-critical |
| `tier` | string | Standard or Premium |
| `security` | string | Security classification or notes |

> **Caution with `security`:** The `security` field on `get_store_flow`
> contains structured JSON (e.g. `{"triggerRequestAuthenticationType":"All"}`).
> Writing a plain string like `"reviewed"` will overwrite this. To mark a
> flow as security-reviewed, use `tags` instead.

---

## Governance Workflows

### 1. Compliance Detail Review

Identify flows missing required governance metadata — the equivalent of
the CoE Starter Kit's Developer Compliance Center.

```
1. Ask the user which compliance fields they require
   (or use their organization's existing governance policy)
2. list_store_flows
3. For each flow (skip entries without displayName or state=Deleted):
   - Split id → environmentName, flowName
   - get_store_flow(environmentName, flowName)
   - Check which required fields are missing or empty
4. Report non-compliant flows with missing fields listed
5. For each non-compliant flow:
   - Ask the user for values
   - update_store_flow(environmentName, flowName, ...provided fields)
```

**Fields available for compliance checks:**

| Field | Example policy |
|---|---|
| `description` | Every flow should be documented |
| `businessImpact` | Classify as Low / Medium / High / Critical |
| `businessJustification` | Required for High/Critical impact flows |
| `ownerTeam` | Every flow should have an accountable team |
| `supportEmail` | Required for production flows |
| `monitor` | Required for critical flows (note: standard plan includes 20 monitored flows) |
| `rule_notify_onfail` | Recommended for monitored flows |
| `critical` | Designate business-critical flows |

> Each organization defines their own compliance rules. The fields above are
> suggestions based on common Power Platform governance patterns (CoE Starter
> Kit). Ask the user what their requirements are before flagging flows as
> non-compliant.
>
> **Tip:** Flows created or updated via MCP already have `description`
> (auto-appended by `update_live_flow`). Flows created manually in the
> Power Automate portal are the ones most likely missing governance metadata.

### 2. Orphaned Resource Detection

Find flows owned by deleted or disabled Azure AD accounts.

```
1. list_store_makers
2. Filter where deleted=true AND ownerFlowCount > 0
   Note: deleted makers have NO displayName/mail — record their id (AAD OID)
3. list_store_flows → collect all flows
4. For each flow (skip entries without displayName or state=Deleted):
   - Split id → environmentName, flowName
   - get_store_flow(environmentName, flowName)
   - Parse owners: json.loads(record["owners"])
   - Check if any owner principalId matches an orphaned maker id
5. Report orphaned flows: maker id, flow name, flow state
6. For each orphaned flow:
   - Reassign governance: update_store_flow(environmentName, flowName,
       ownerTeam="NewTeam", supportEmail="new-owner@contoso.com")
   - Or decommission: set_store_flow_state(environmentName, flowName,
       state="Stopped")
```

> `update_store_flow` updates governance metadata in the cache only. To
> transfer actual PA ownership, an admin must use the Power Platform admin
> center or PowerShell.
>
> **Note:** Many orphaned flows are system-generated (created by
> `DataverseSystemUser` accounts for SLA monitoring, knowledge articles,
> etc.). These were never built by a person — consider tagging them
> rather than reassigning.
>
> **Coverage:** This workflow searches the cached store only, not the
> live PA API. Flows created after the last scan won't appear.

### 3. Archive Score Calculation

Compute an inactivity score (0-7) per flow to identify safe cleanup
candidates. Aligns with the CoE Starter Kit's archive scoring.

```
1. list_store_flows
2. For each flow (skip entries without displayName or state=Deleted):
   - Split id → environmentName, flowName
   - get_store_flow(environmentName, flowName)
3. Compute archive score (0-7), add 1 point for each:
   +1  lastModifiedTime within 24 hours of createdTime
   +1  displayName contains "test", "demo", "copy", "temp", or "backup"
       (case-insensitive)
   +1  createdTime is more than 12 months ago
   +1  state is "Stopped" or "Suspended"
   +1  json.loads(owners) is empty array []
   +1  runPeriodTotal = 0 (never ran or no recent runs)
   +1  parse json.loads(complexity) → actions < 5
4. Classify:
   Score 5-7: Recommend archive — report to user for confirmation
   Score 3-4: Flag for review →
     Read existing tags from get_store_flow response, append #archive-review
     update_store_flow(environmentName, flowName, tags="<existing> #archive-review")
   Score 0-2: Active, no action
5. For user-confirmed archives:
   set_store_flow_state(environmentName, flowName, state="Stopped")
   Read existing tags, append #archived
   update_store_flow(environmentName, flowName, tags="<existing> #archived")
```

> **What "archive" means:** Power Automate has no native archive feature.
> Archiving via MCP means: (1) stop the flow so it can't run, and
> (2) tag it `#archived` so it's discoverable for future cleanup.
> Actual deletion requires the Power Automate portal or admin PowerShell
> — it cannot be done via MCP tools.

### 4. Connector Audit

Audit which connectors are in use across monitored flows. Useful for DLP
impact analysis and premium license planning.

```
1. list_store_flows(monitor=true)
   (scope to monitored flows — auditing all 1000+ flows is expensive)
2. For each flow (skip entries without displayName or state=Deleted):
   - Split id → environmentName, flowName
   - get_store_flow(environmentName, flowName)
   - Parse connections: json.loads(record["connections"])
     Returns array of objects with apiName, apiId, connectionName
   - Note the flow-level tier field ("Standard" or "Premium")
3. Build connector inventory:
   - Which apiNames are used and by how many flows
   - Which flows have tier="Premium" (premium connector detected)
   - Which flows use HTTP connectors (apiName contains "http")
   - Which flows use custom connectors (non-shared_ prefix apiNames)
4. Report inventory to user
   - For DLP analysis: user provides their DLP policy connector groups,
     agent cross-references against the inventory
```

> **Scope to monitored flows.** Each flow requires a `get_store_flow` call
> to read the `connections` JSON. Standard plans have ~20 monitored flows —
> manageable. Auditing all flows in a large tenant (1000+) would be very
> expensive in API calls.
>
> **`list_store_connections`** returns connection instances (who created
> which connection) but NOT connector types per flow. Use it for connection
> counts per environment, not for the connector audit.
>
> DLP policy definitions are not available via MCP. The agent builds the
> connector inventory; the user provides the DLP classification to
> cross-reference against.

### 5. Notification Rule Management

Configure monitoring and alerting for flows at scale.

```
Enable failure alerts on all critical flows:
1. list_store_flows(monitor=true)
2. For each flow (skip entries without displayName or state=Deleted):
   - Split id → environmentName, flowName
   - get_store_flow(environmentName, flowName)
   - If critical=true AND rule_notify_onfail is not true:
     update_store_flow(environmentName, flowName,
       rule_notify_onfail=true,
       rule_notify_email="oncall@contoso.com")
   - If NO flows have critical=true: this is a governance finding.
     Recommend the user designate their most important flows as critical
     using update_store_flow(critical=true) before configuring alerts.

Enable missing-run detection for scheduled flows:
1. list_store_flows(monitor=true)
2. For each flow where triggerType="Recurrence" (available on list response):
   - Skip flows with state="Stopped" or "Suspended" (not expected to run)
   - Split id → environmentName, flowName
   - get_store_flow(environmentName, flowName)
   - If rule_notify_onmissingdays is 0 or not set:
     update_store_flow(environmentName, flowName,
       rule_notify_onmissingdays=2)
```

> `critical`, `rule_notify_onfail`, and `rule_notify_onmissingdays` are only
> available from `get_store_flow`, not from `list_store_flows`. The list call
> pre-filters to monitored flows; the detail call checks the notification fields.
>
> **Monitoring limit:** The standard plan (FlowStudio for Teams / MCP Pro+)
> includes 20 monitored flows. Before bulk-enabling `monitor=true`, check
> how many flows are already monitored:
> `len(list_store_flows(monitor=true))`

### 6. Classification and Tagging

Bulk-classify flows by connector type, business function, or risk level.

```
Auto-tag by connector:
1. list_store_flows
2. For each flow (skip entries without displayName or state=Deleted):
   - Split id → environmentName, flowName
   - get_store_flow(environmentName, flowName)
   - Parse connections: json.loads(record["connections"])
   - Build tags from apiName values:
     shared_sharepointonline → #sharepoint
     shared_teams → #teams
     shared_office365 → #email
     Custom connectors → #custom-connector
     HTTP-related connectors → #http-external
   - Read existing tags from get_store_flow response, append new tags
   - update_store_flow(environmentName, flowName,
       tags="<existing tags> #sharepoint #teams")
```

> **Two tag systems:** Tags shown in `list_store_flows` are auto-extracted
> from the flow's `description` field (e.g. a maker writes `#operations` in
> the PA portal description). Tags set via `update_store_flow(tags=...)`
> write to a separate field in the Azure Table cache. They are independent —
> writing store tags does not touch the description, and editing the
> description in the portal does not affect store tags.
>
> **Tag merge:** `update_store_flow(tags=...)` overwrites the store tags
> field. To avoid losing tags from other workflows, read the current store
> tags from `get_store_flow` first, append new ones, then write back.
>
> `get_store_flow` already has a `tier` field (Standard/Premium) computed
> by the scanning pipeline. Only use `update_store_flow(tier=...)` if you
> need to override it.

### 7. Maker Offboarding

When an employee leaves, identify their flows and apps, and reassign
Flow Studio governance contacts and notification recipients.

```
1. get_store_maker(makerKey="<departing-user-aad-oid>")
   → check ownerFlowCount, ownerAppCount, deleted status
2. list_store_flows → collect all flows
3. For each flow (skip entries without displayName or state=Deleted):
   - Split id → environmentName, flowName
   - get_store_flow(environmentName, flowName)
   - Parse owners: json.loads(record["owners"])
   - If any principalId matches the departing user's OID → flag
4. list_store_power_apps → filter where ownerId matches the OID
5. For each flagged flow:
   - Check runPeriodTotal and runLast — is it still active?
   - If keeping:
     update_store_flow(environmentName, flowName,
       ownerTeam="NewTeam", supportEmail="new-owner@contoso.com")
   - If decommissioning:
     set_store_flow_state(environmentName, flowName, state="Stopped")
     Read existing tags, append #decommissioned
     update_store_flow(environmentName, flowName, tags="<existing> #decommissioned")
6. Report: flows reassigned, flows stopped, apps needing manual reassignment
```

> **What "reassign" means here:** `update_store_flow` changes who Flow
> Studio considers the governance contact and who receives Flow Studio
> notifications. It does NOT transfer the actual Power Automate flow
> ownership — that requires the Power Platform admin center or PowerShell.
> Also update `rule_notify_email` so failure notifications go to the new
> team instead of the departing employee's email.
>
> Power Apps ownership cannot be changed via MCP tools. Report them for
> manual reassignment in the Power Apps admin center.

### 8. Security Review

Review flows for potential security concerns using cached store data.

```
1. list_store_flows(monitor=true)
2. For each flow (skip entries without displayName or state=Deleted):
   - Split id → environmentName, flowName
   - get_store_flow(environmentName, flowName)
   - Parse security: json.loads(record["security"])
   - Parse connections: json.loads(record["connections"])
   - Read sharingType directly (top-level field, NOT inside security JSON)
3. Report findings to user for review
4. For reviewed flows:
   Read existing tags, append #security-reviewed
   update_store_flow(environmentName, flowName, tags="<existing> #security-reviewed")
   Do NOT overwrite the security field — it contains structured auth data
```

**Fields available for security review:**

| Field | Where | What it tells you |
|---|---|---|
| `security.triggerRequestAuthenticationType` | security JSON | `"All"` = HTTP trigger accepts unauthenticated requests |
| `sharingType` | top-level | `"Coauthor"` = shared with co-authors for editing |
| `connections` | connections JSON | Which connectors the flow uses (check for HTTP, custom) |
| `referencedResources` | JSON string | SharePoint sites, Teams channels, external URLs the flow accesses |
| `tier` | top-level | `"Premium"` = uses premium connectors |

> Each organization decides what constitutes a security concern. For example,
> an unauthenticated HTTP trigger is expected for webhook receivers (Stripe,
> GitHub) but may be a risk for internal flows. Review findings in context
> before flagging.

### 9. Environment Governance

Audit environments for compliance and sprawl.

```
1. list_store_environments
   Skip entries without displayName (tenant-level metadata rows)
2. Flag:
   - Developer environments (sku="Developer") — should be limited
   - Non-managed environments (isManagedEnvironment=false) — less governance
   - Note: isAdmin=false means the current service account lacks admin
     access to that environment, not that the environment has no admin
3. list_store_flows → group by environmentName
   - Flow count per environment
   - Failure rate analysis: runPeriodFailRate is on the list response —
     no need for per-flow get_store_flow calls
4. list_store_connections → group by environmentName
   - Connection count per environment
```

### 10. Governance Dashboard

Generate a tenant-wide governance summary.

```
Efficient metrics (list calls only):
1. total_flows = len(list_store_flows())
2. monitored = len(list_store_flows(monitor=true))
3. with_onfail = len(list_store_flows(rule_notify_onfail=true))
4. makers = list_store_makers()
   → active = count where deleted=false
   → orphan_count = count where deleted=true AND ownerFlowCount > 0
5. apps = list_store_power_apps()
   → widely_shared = count where sharedUsersCount > 3
6. envs = list_store_environments() → count, group by sku
7. conns = list_store_connections() → count

Compute from list data:
- Monitoring %: monitored / total_flows
- Notification %: with_onfail / monitored
- Orphan count: from step 4
- High-risk count: flows with runPeriodFailRate > 0.2 (on list response)

Detailed metrics (require get_store_flow per flow — expensive for large tenants):
- Compliance %: flows with businessImpact set / total active flows
- Undocumented count: flows without description
- Tier breakdown: group by tier field

For detailed metrics, iterate all flows in a single pass:
  For each flow from list_store_flows (skip sparse entries):
    Split id → environmentName, flowName
    get_store_flow(environmentName, flowName)
    → accumulate businessImpact, description, tier
```

---

## Field Reference: `get_store_flow` Fields Used in Governance

All fields below are confirmed present on the `get_store_flow` response.
Fields marked with `*` are also available on `list_store_flows` (cheaper).

| Field | Type | Governance use |
|---|---|---|
| `displayName` * | string | Archive score (test/demo name detection) |
| `state` * | string | Archive score, lifecycle management |
| `tier` | string | License audit (Standard vs Premium) |
| `monitor` * | bool | Is this flow being actively monitored? |
| `critical` | bool | Business-critical designation (settable via update_store_flow) |
| `businessImpact` | string | Compliance classification |
| `businessJustification` | string | Compliance attestation |
| `ownerTeam` | string | Ownership accountability |
| `supportEmail` | string | Escalation contact |
| `rule_notify_onfail` | bool | Failure alerting configured? |
| `rule_notify_onmissingdays` | number | SLA monitoring configured? |
| `rule_notify_email` | string | Alert recipients |
| `description` | string | Documentation completeness |
| `tags` | string | Classification — `list_store_flows` shows description-extracted hashtags only; store tags written by `update_store_flow` require `get_store_flow` to read back |
| `runPeriodTotal` * | number | Activity level |
| `runPeriodFailRate` * | number | Health status |
| `runLast` | ISO string | Last run timestamp |
| `scanned` | ISO string | Data freshness |
| `deleted` | bool | Lifecycle tracking |
| `createdTime` * | ISO string | Archive score (age) |
| `lastModifiedTime` * | ISO string | Archive score (staleness) |
| `owners` | JSON string | Orphan detection, ownership audit — parse with json.loads() |
| `connections` | JSON string | Connector audit, tier — parse with json.loads() |
| `complexity` | JSON string | Archive score (simplicity) — parse with json.loads() |
| `security` | JSON string | Auth type audit — parse with json.loads(), contains `triggerRequestAuthenticationType` |
| `sharingType` | string | Oversharing detection (top-level, NOT inside security) |
| `referencedResources` | JSON string | URL audit — parse with json.loads() |

---

## Related Skills

- `flowstudio-power-automate-monitoring` — Health checks, failure rates, inventory (read-only)
- `flowstudio-power-automate-mcp` — Core connection setup, live tool reference
- `flowstudio-power-automate-debug` — Deep diagnosis with action-level inputs/outputs
- `flowstudio-power-automate-build` — Build and deploy flow definitions
