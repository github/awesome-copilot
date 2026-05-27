---
name: flowstudio-power-automate-monitoring
description: >-
  Pro+ subscription required. Tenant-wide Power Automate monitoring using the
  FlowStudio MCP cached store: failure rates, run-health trends, maker/app
  inventory, inactive owners, and compliance/health reports. Use only for
  aggregated tenant views. For one environment, one flow, run control, or
  root-cause debugging, use flowstudio-power-automate-mcp, flowstudio-power-automate-debug, or the
  server monitor-flow bundle. Requires FlowStudio for Teams or MCP Pro+.
---

# Power Automate Monitoring with FlowStudio MCP

Monitor flow health, track failure rates, and inventory tenant assets through
the FlowStudio MCP **cached store** — fast reads, no PA API rate limits, and
enriched with governance metadata and remediation hints.

> **⚠️ Pro+ subscription required.** This skill calls `store_*` tools that
> only work for FlowStudio for Teams or MCP Pro+ subscribers.
>
> **If the user does not have Pro+ access:** the first `store_*` tool call
> will return a 403/404 error. When that happens:
> 1. STOP calling store tools
> 2. Tell the user this feature requires a Pro+ subscription
> 3. Link them to https://mcp.flowstudio.app/pricing
> 4. If their question can be answered with live tools (e.g. "list flows in
>    one environment"), offer to use the `flowstudio-power-automate-mcp` skill instead
>
> **Discovery:** load tool schemas via `tool_search` rather than `tools/list` —
> call with `query: "select:list_store_flows,get_store_flow_summary"` for the
> common monitoring tools, or load the full set with `query: "skill:governance"`
> (the server's governance bundle covers most monitoring reads too — this skill
> and `flowstudio-power-automate-governance` share the underlying tool family). This skill
> covers response shapes, behavioral notes, and workflow patterns — things
> `tool_search` cannot tell you. If this document disagrees with a real API
> response, the API wins.

---

## How Monitoring Works

Flow Studio scans the Power Automate API daily for each subscriber and caches
the results. There are two levels:

- **All flows** get metadata scanned: definition, connections, owners, trigger
  type, and aggregate run statistics (`runPeriodTotal`, `runPeriodFailRate`,
  etc.). Environments, apps, connections, and makers are also scanned.
- **Monitored flows** (`monitor: true`) additionally get per-run detail:
  individual run records with status, duration, failed action names, and
  remediation hints. This is what populates `get_store_flow_runs` and
  `get_store_flow_summary`.

**Data freshness:** Check the `scanned` field on `get_store_flow` to see when
a flow was last scanned. If stale, the scanning pipeline may not be running.

**Enabling monitoring:** Set `monitor: true` via `update_store_flow` or the
Flow Studio for Teams app
([how to select flows](https://learn.flowstudio.app/teams-monitoring)).

**Designating critical flows:** Use `update_store_flow` with `critical=true`
on business-critical flows. This enables the governance skill's notification
rule management to auto-configure failure alerts on critical flows.

---

## Tools

| Tool | Purpose |
|---|---|
| `list_store_flows` | List flows with failure rates and monitoring filters |
| `get_store_flow` | Full cached record: run stats, owners, tier, connections, definition (`triggerUrl` field included) |
| `get_store_flow_summary` | Aggregated run stats: success/fail rate, avg/max duration |
| `get_store_flow_runs` | Per-run history with duration, status, failed actions, remediation (filter `status="Failed"` for errors-only view) |
| `update_store_flow` | Set monitor flag, notification rules, tags, governance metadata |
| `list_store_environments` | All Power Platform environments |
| `list_store_connections` | All connections |
| `list_store_makers` | All makers (citizen developers) |
| `get_store_maker` | Maker detail: flow/app counts, licenses, account status |
| `list_store_power_apps` | All Power Apps canvas apps |

> For start/stop, use `set_live_flow_state` from the `monitor-flow` bundle
> (`tool_search query: "select:set_live_flow_state"`) — the cache resyncs on
> the next scan. The previous `set_store_flow_state` convenience wrapper is
> deprecated.

---

## Store vs Live

| Question | Use Store | Use Live |
|---|---|---|
| How many flows are failing? | `list_store_flows` | — |
| What's the fail rate over 30 days? | `get_store_flow_summary` | — |
| Show error history for a flow | `get_store_flow_runs` (filter `status="Failed"`) | — |
| Who built this flow? | `get_store_flow` → parse `owners` | — |
| Read the full flow definition | `get_store_flow` has it (JSON string) | `get_live_flow` (structured) |
| Inspect action inputs/outputs from a run | — | `get_live_flow_run_action_outputs` |
| Resubmit a failed run | — | `resubmit_live_flow_run` |

> Store tools answer "what happened?" and "how healthy is it?"
> Live tools answer "what exactly went wrong?" and "fix it now."

> If `get_store_flow_runs` or `get_store_flow_summary` return empty results,
> check: (1) is `monitor: true` on the flow? and (2) is the `scanned` field
> recent? Use `get_store_flow` to verify both.

---

## Response Shapes

### `list_store_flows`

Direct array. Filters: `monitor` (bool), `rule_notify_onfail` (bool),
`rule_notify_onmissingdays` (bool).

```json
[
  {
    "id": "Default-<envGuid>.<flowGuid>",
    "displayName": "Stripe subscription updated",
    "state": "Started",
    "triggerType": "Request",
    "triggerUrl": "https://...",
    "tags": ["#operations", "#sensitive"],
    "environmentName": "Default-aaaaaaaa-...",
    "monitor": true,
    "runPeriodFailRate": 0.012,
    "runPeriodTotal": 82,
    "createdTime": "2025-06-24T01:20:53Z",
    "lastModifiedTime": "2025-06-24T03:51:03Z"
  }
]
```

> `id` format: `Default-<envGuid>.<flowGuid>`. Split on first `.` to get
> `environmentName` and `flowName`.
>
> `triggerUrl` and `tags` are optional. Some entries are sparse (just `id` +
> `monitor`) — skip entries without `displayName`.
>
> Tags on `list_store_flows` are auto-extracted from the flow's `description`
> field (maker hashtags like `#operations`). Tags written via
> `update_store_flow(tags=...)` are stored separately and only visible on
> `get_store_flow` — they do NOT appear in the list response.

### `get_store_flow`

Full cached record. Key fields:

| Category | Fields |
|---|---|
| Identity | `name`, `displayName`, `environmentName`, `state`, `triggerType`, `triggerKind`, `tier`, `sharingType` |
| Run stats | `runPeriodTotal`, `runPeriodFails`, `runPeriodSuccess`, `runPeriodFailRate`, `runPeriodSuccessRate`, `runPeriodDurationAverage`/`Max`/`Min` (milliseconds), `runTotal`, `runFails`, `runFirst`, `runLast`, `runToday` |
| Governance | `monitor` (bool), `rule_notify_onfail` (bool), `rule_notify_onmissingdays` (number), `rule_notify_email` (string), `log_notify_onfail` (ISO), `description`, `tags` |
| Freshness | `scanned` (ISO), `nextScan` (ISO) |
| Lifecycle | `deleted` (bool), `deletedTime` (ISO) |
| JSON strings | `actions`, `connections`, `owners`, `complexity`, `definition`, `createdBy`, `security`, `triggers`, `referencedResources`, `runError` — all require `json.loads()` to parse |

> Duration fields (`runPeriodDurationAverage`, `Max`, `Min`) are in
> **milliseconds**. Divide by 1000 for seconds.
>
> `runError` contains the last run error as a JSON string. Parse it:
> `json.loads(record["runError"])` — returns `{}` when no error.

### `get_store_flow_summary`

Aggregated stats over a time window (default: last 7 days).

```json
{
  "flowKey": "Default-<envGuid>.<flowGuid>",
  "windowStart": null,
  "windowEnd": null,
  "totalRuns": 82,
  "successRuns": 81,
  "failRuns": 1,
  "successRate": 0.988,
  "failRate": 0.012,
  "averageDurationSeconds": 2.877,
  "maxDurationSeconds": 9.433,
  "firstFailRunRemediation": null,
  "firstFailRunUrl": null
}
```

> Returns all zeros when no run data exists for this flow in the window.
> Use `startTime` and `endTime` (ISO 8601) parameters to change the window.

### `get_store_flow_runs`

Direct array of cached run records. Parameters: `startTime`, `endTime`,
`status` (array — pass `["Failed"]` for an errors-only view, `["Succeeded"]`,
or omit for all).

> Returns `[]` when no run data exists in the window.

### Trigger URL

Read the `triggerUrl` field directly from `get_store_flow` (cached) or
`get_live_flow` (live). It is `null` for non-HTTP triggers.

### Starting / stopping a flow

Use `set_live_flow_state` from the `monitor-flow` server bundle. The cache
catches up on the next daily scan; if you need cache freshness sooner, call
`get_live_flow` after the state change to confirm and let the next scan sync.

### `update_store_flow`

Updates governance metadata. Only provided fields are updated (merge).
Returns the full updated record (same shape as `get_store_flow`).

Settable fields: `monitor` (bool), `rule_notify_onfail` (bool),
`rule_notify_onmissingdays` (number, 0=disabled),
`rule_notify_email` (comma-separated), `description`, `tags`,
`businessImpact`, `businessJustification`, `businessValue`,
`ownerTeam`, `ownerBusinessUnit`, `supportGroup`, `supportEmail`,
`critical` (bool), `tier`, `security`.

### `list_store_environments`

Direct array.

```json
[
  {
    "id": "Default-aaaaaaaa-...",
    "displayName": "Flow Studio (default)",
    "sku": "Default",
    "type": "NotSpecified",
    "location": "australia",
    "isDefault": true,
    "isAdmin": true,
    "isManagedEnvironment": false,
    "createdTime": "2017-01-18T01:06:46Z"
  }
]
```

> `sku` values: `Default`, `Production`, `Developer`, `Sandbox`, `Teams`.

### `list_store_connections`

Direct array. Can be very large (1500+ items).

```json
[
  {
    "id": "<environmentId>.<connectionId>",
    "displayName": "user@contoso.com",
    "createdBy": "{\"id\":\"...\",\"displayName\":\"...\",\"email\":\"...\"}",
    "environmentName": "...",
    "statuses": "[{\"status\":\"Connected\"}]"
  }
]
```

> `createdBy` and `statuses` are **JSON strings** — parse with `json.loads()`.

### `list_store_makers`

Direct array.

```json
[
  {
    "id": "09dbe02f-...",
    "displayName": "Sample Maker",
    "mail": "maker@contoso.com",
    "deleted": false,
    "ownerFlowCount": 199,
    "ownerAppCount": 209,
    "userIsServicePrinciple": false
  }
]
```

> Deleted makers have `deleted: true` and no `displayName`/`mail` fields.

### `get_store_maker`

Full maker record. Key fields: `displayName`, `mail`, `userPrincipalName`,
`ownerFlowCount`, `ownerAppCount`, `accountEnabled`, `deleted`, `country`,
`firstFlow`, `firstFlowCreatedTime`, `lastFlowCreatedTime`,
`firstPowerApp`, `lastPowerAppCreatedTime`,
`licenses` (JSON string of M365 SKUs).

### `list_store_power_apps`

Direct array.

```json
[
  {
    "id": "<environmentId>.<appId>",
    "displayName": "My App",
    "environmentName": "...",
    "ownerId": "09dbe02f-...",
    "ownerName": "Catherine Han",
    "appType": "Canvas",
    "sharedUsersCount": 0,
    "createdTime": "2023-08-18T01:06:22Z",
    "lastModifiedTime": "2023-08-18T01:06:22Z",
    "lastPublishTime": "2023-08-18T01:06:22Z"
  }
]
```

---

## Common Workflows

### Find unhealthy flows

```
1. list_store_flows
2. Filter where runPeriodFailRate > 0.1 and runPeriodTotal >= 5
3. Sort by runPeriodFailRate descending
4. For each: get_store_flow for full detail
```

### Check a specific flow's health

```
1. get_store_flow → check scanned (freshness), runPeriodFailRate, runPeriodTotal
2. get_store_flow_summary → aggregated stats with optional time window
3. get_store_flow_runs(status=["Failed"]) → per-run failure detail with remediation hints
4. If deeper diagnosis needed → switch to live tools:
   get_live_flow_runs → get_live_flow_run_action_outputs
```

### Enable monitoring on a flow

```
1. update_store_flow with monitor=true
2. Optionally set rule_notify_onfail=true, rule_notify_email="user@domain.com"
3. Run data will appear after the next daily scan
```

### Daily health check

```
1. list_store_flows
2. Flag flows with runPeriodFailRate > 0.2 and runPeriodTotal >= 3
3. Flag monitored flows with state="Stopped" (may indicate auto-suspension)
4. For critical failures → get_store_flow_runs(status=["Failed"]) for remediation hints
```

### Maker audit

```
1. list_store_makers
2. Identify deleted accounts still owning flows (deleted=true, ownerFlowCount > 0)
3. get_store_maker for full detail on specific users
```

### Inventory

```
1. list_store_environments → environment count, SKUs, locations
2. list_store_flows → flow count by state, trigger type, fail rate
3. list_store_power_apps → app count, owners, sharing
4. list_store_connections → connection count per environment
```

---

## Related Skills

- `flowstudio-power-automate-mcp` — Foundation skill: connection setup, MCP helper, tool discovery
- `flowstudio-power-automate-debug` — Deep diagnosis with action-level inputs/outputs (live API)
- `flowstudio-power-automate-build` — Build and deploy flow definitions
- `flowstudio-power-automate-governance` — Governance metadata, tagging, notification rules, CoE patterns
