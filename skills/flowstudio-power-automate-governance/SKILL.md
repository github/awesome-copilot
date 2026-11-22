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
  governance metadata to flows. Requires an MCP Pro+
  subscription — see https://mcp.flowstudio.app
---

# Power Automate Governance with FlowStudio MCP

Classify, tag, and govern Power Automate flows at scale through the FlowStudio
MCP **cached store** — without Dataverse, without the CoE Starter Kit, and
without the Power Automate portal.

This skill uses the same `store_*` tool family as `flowstudio-power-automate-monitoring`,
but with a different *intent*: governance writes metadata (`update_store_flow`)
and reads for *audit and classification* outcomes. Monitoring reads the same
tools for *operational health* outcomes. Don't try to memorize which skill
"owns" which tool — pick by what the user is doing. For health checks and
failure-rate dashboards, load `flowstudio-power-automate-monitoring` instead.

> **⚠️ Pro+ subscription required.** This skill calls `store_*` tools that
> only work for MCP Pro+ subscribers, and not in Microsoft 365 Copilot (Copilot Chat or Cowork),
> even on Pro+.
>
> **If the store tools are missing or refused:** `tool_search` with
> `query: "skill:governance"` returns no tools, or a `store_*` tool call returns
> the error "This tool requires a Flow Studio MCP Pro+ plan" (in Microsoft 365
> Copilot it says the store isn't available over single sign-on). When that happens:
> 1. STOP calling store tools
> 2. If it mentions single sign-on, or you are in Microsoft 365 Copilot: tell the
>    user store tools don't work there on any plan; with Pro+ they work from an
>    agent connected with an API key or the `https://mcp.flowstudio.app/mcp/oauth` sign-in
> 3. Otherwise, tell the user governance features require a Pro+ subscription
>    and link them to https://mcp.flowstudio.app/pricing
>
> **Discovery:** load tool schemas via the meta-tools rather than `tools/list` —
> `query: "skill:governance"` loads `list_store_flows`, `get_store_flow`,
> `update_store_flow`, `list_store_makers` and `get_store_maker`. Load the rest
> by name: `query: "select:list_store_power_apps,list_store_environments,list_store_connections"`.
> This skill covers workflow patterns and field semantics — things `tool_search`
> cannot tell you. If this document disagrees with a real API response, the API wins.

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

`update_store_flow` writes governance metadata to the **FlowStudio cache
only** — it does NOT modify the flow in Power Automate. These fields are
not visible via `get_live_flow` or the PA portal. They exist only in the
FlowStudio store and are used by FlowStudio's scanning pipeline and
notification rules.

This means:
- `ownerTeam` / `supportEmail` — sets who FlowStudio considers the
  governance contact. Does NOT change the actual PA flow owner.
- `rule_notify_email` — sets who receives FlowStudio failure/missing-run
  notifications. Does NOT change Microsoft's built-in flow failure alerts.
- `monitor` / `critical` / `businessImpact` — FlowStudio classification
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

Identify flows missing required governance metadata.

```
1. Ask the user which compliance fields they require
2. list_store_flows
3. For each active flow: split id, call get_store_flow, check required fields
4. Report non-compliant flows with missing fields listed
5. For updates: ask for values, then update_store_flow(...provided fields)
```

Common compliance fields: `description`, `businessImpact`,
`businessJustification`, `ownerTeam`, `supportEmail`, `monitor`,
`rule_notify_onfail`, `critical`. Ask for the user's policy before flagging.

### 2. Orphaned Resource Detection

Find flows owned by deleted or disabled Azure AD accounts.

```
1. list_store_makers
2. Filter where deleted=true AND ownerFlowCount > 0
3. list_store_flows → collect all flows
4. For each active flow: split id, get_store_flow, parse owners JSON
5. Match owner principalId against orphaned maker id
6. Reassign governance contact or stop/tag for decommission
```

`update_store_flow` does not transfer actual PA ownership; use the admin center
or PowerShell for that. Some orphaned-looking flows are system-generated; tag
them instead of reassigning when appropriate. Store coverage is only as fresh as
the latest scan.

### 3. Archive Score Calculation

Compute an inactivity score (0-7) per flow to identify cleanup candidates.

```
1. list_store_flows
2. For each active flow: split id, get_store_flow
3. Add 1 point each: created≈modified, test/demo/temp/copy name, age >12mo,
   stopped/suspended, no owners, no recent runs, complexity.actions < 5
4. Score 5-7: recommend archive; 3-4: tag #archive-review; 0-2: active
5. For confirmed archive: set_live_flow_state(..., "Stopped") and append #archived
```

Archive via MCP means stop the flow and tag it. `delete_live_flow` can delete,
but it is refused while the person's Delete Lock is on (the default; only they
can turn it off, on the dashboard). Stopping and tagging can be undone.

### 4. Connector Audit

Audit which connectors are in use across monitored flows. Useful for DLP
impact analysis and premium license planning.

```
1. list_store_flows(monitor=true)
2. For each active flow: split id, get_store_flow, parse connections JSON
3. Group by apiName; flag Premium tier, HTTP connectors, custom connectors
4. Report inventory to user
```

Scope to monitored flows where possible; each `get_store_flow` call costs time.
`list_store_connections` lists connection instances, not connector usage per
flow. DLP policies are not exposed; ask the user for connector classifications.

### 5. Notification Rule Management

Configure monitoring and alerting for flows at scale.

```
Enable failure alerts on all critical flows:
1. list_store_flows(monitor=true)
2. For each active flow: split id, get_store_flow
3. If critical=true and rule_notify_onfail is false, update_store_flow(...,
   rule_notify_onfail=true, rule_notify_email="oncall@contoso.com")

Enable missing-run detection for scheduled flows:
1. list_store_flows(monitor=true)
2. For active Recurrence flows: get_store_flow
3. If rule_notify_onmissingdays is 0/missing, update_store_flow(...,
   rule_notify_onmissingdays=2)
```

Check monitoring limits before bulk-enabling `monitor=true`. If no flows have
`critical=true`, report that as a governance gap before configuring alerts.

### 6. Classification and Tagging

Bulk-classify flows by connector type, business function, or risk level.

```
Auto-tag by connector:
1. list_store_flows
2. For each active flow: split id, get_store_flow, parse connections JSON
3. Map apiName values to tags (#sharepoint, #teams, #email, #custom-connector)
4. Read existing store tags, append new tags, update_store_flow(tags=...)
```

Store tags and description hashtags are separate systems. `tags=` overwrites
store tags, so read/append/write. Avoid overriding computed `tier` unless asked.

### 7. Maker Offboarding

When an employee leaves, identify their flows and apps, and reassign
FlowStudio governance contacts and notification recipients.

```
1. get_store_maker(makerKey="<departing-user-aad-oid>")
   → check ownerFlowCount, ownerAppCount, deleted status
2. list_store_flows → collect all flows
3. For each active flow: split id, get_store_flow, parse owners JSON
4. Flag flows whose owner principalId matches the departing user's OID
5. list_store_power_apps → filter ownerId
6. For kept flows: update ownerTeam/supportEmail/rule_notify_email; consider
   add_to_solution(flowName, solution) before account deletion
7. For retired flows: set_live_flow_state(..., "Stopped") and tag #decommissioned
8. Report: flows reassigned, flows migrated to solutions, flows stopped,
   apps needing manual reassignment
```

This changes FlowStudio governance contacts, not actual PA ownership. Power
Apps ownership changes are manual/admin-center work.

### 8. Security Review

Review flows for potential security concerns using cached store data.

```
1. list_store_flows(monitor=true)
2. For each active flow: split id, get_store_flow
3. Parse security/connections/referencedResources JSON; read sharingType top-level
4. Report findings; for reviewed flows append #security-reviewed tag
```

Security signals: `security.triggerRequestAuthenticationType`, `sharingType`,
`connections`, `referencedResources`, `tier`. Never overwrite the structured
`security` field; tag reviewed flows instead.

### 9. Environment Governance

Audit environments for compliance and sprawl.

```
1. list_store_environments
   Skip entries without displayName (tenant-level metadata rows)
2. Flag:
   - Developer environments
   - Non-managed environments
   - Environments where service account lacks admin access (isAdmin=false)
3. list_store_flows → group by environmentName
4. list_store_connections → group by environmentName
```

### 10. Governance Dashboard

Generate a tenant-wide governance summary.

```
Efficient metrics (list calls only):
1. total_flows = len(list_store_flows())
2. monitored = len(list_store_flows(monitor=true))
3. with_onfail = len(list_store_flows(rule_notify_onfail=true))
4. makers/apps/envs/conns = list_store_makers/list_store_power_apps/list_store_environments/list_store_connections
5. Compute monitoring %, notification %, orphan count, high-failure count

Detailed metrics (require get_store_flow per flow — expensive for large tenants):
- Compliance %: flows with businessImpact set / total active flows
- Undocumented count: flows without description
- Tier breakdown: group by tier field
```

### 11. Change Audit

See what changed in a flow and when. These are live tools (`flow-versions`
bundle), not store tools.

```
1. get_live_flow_versions(environmentName, flowName)
   → versions, newest first: version, source, current, savedAt; a flow in a
     solution adds by and operation, any other flow firstRan, lastRan, runCount
2. diff_live_flow(from=<older version or a date>) — to defaults to the current flow
   → actions added, removed and changed, with field-level before/after
3. Report the changes; tag reviewed flows #change-reviewed
```

A flow in a solution lists every published version; any other flow lists only
versions that ran, while their runs are kept. A version with `source: "draft"`
is an unpublished portal draft, and it blocks saves until published or discarded.

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
- `flowstudio-power-automate-mcp` — Foundation skill: connection setup, MCP helper, tool discovery
- `flowstudio-power-automate-debug` — Deep diagnosis with action-level inputs/outputs
- `flowstudio-power-automate-build` — Build and deploy flow definitions
