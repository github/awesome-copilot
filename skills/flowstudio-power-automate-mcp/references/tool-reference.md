# FlowStudio MCP — Tool Response Catalog

Response shapes and behavioral notes for the FlowStudio Power Automate MCP server.

> **For tool names and parameters**: Prefer `list_skills` and `tool_search`.
> They return focused, up-to-date schemas without loading every MCP tool at once.
> Use `tools/list` only as a low-level fallback when the meta-tools are not available.
> This document covers what tool schemas do NOT tell you: **response shapes**
> and **non-obvious behaviors** discovered through real usage.

---

## Source of Truth

| Priority | Source | Covers |
|----------|--------|--------|
| 1 | **Real API response** | Always trust what the server actually returns |
| 2 | **`tool_search`** (`list_skills` gives bundle names only) | Tool names, parameter names, types, required flags |
| 3 | **This document** | Response shapes, behavioral notes, gotchas |

> If this document disagrees with `tool_search`, `tools/list`, or real API
> behavior, the API wins. Update this document accordingly.

---

## Environment & Tenant Discovery

### `list_live_environments`

Response: direct array of environments.
```json
[
  {
    "id": "Default-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "displayName": "Contoso (default)",
    "sku": "Production",
    "location": "australia",
    "state": "Succeeded",
    "isDefault": true,
    "isAdmin": true,
    "isMember": true,
    "createdTime": "2023-08-18T00:41:05Z"
  }
]
```

> Use the `id` value as `environmentName` in all other tools — a display name is
> refused unless it matches one environment's whole name. `state` is the
> environment's provisioning state (`Succeeded` when ready). `isAdmin` is `null`,
> not `false`, when the platform did not say. `mode: "admin"` returns only the
> environments where you can list every flow.

### `list_store_environments`

Same shape as `list_live_environments` but read from cache (faster).

---

## Connection Discovery

### `list_live_connections`

Response: wrapper object with `connections` array.
```json
{
  "connections": [
    {
      "id": "shared-office365-ffffffff-ffff-ffff-ffff-ffffffffffff",
      "displayName": "user@contoso.com",
      "connectorName": "shared_office365",
      "environment": "Default-aaaaaaaa-...",
      "createdBy": {"id": "<aad-object-id>", "displayName": "User Name", "email": "user@contoso.com", "type": "User"},
      "statuses": [{"status": "Connected"}],
      "createdTime": "2024-03-12T21:23:55.206815Z",
      "connectionParameters": {},
      "accountName": "user@contoso.com",
      "expirationTime": "2026-11-11T18:48:46.5637835Z",
      "connectionReferenceTemplate": {
        "shared-office365-ffffffff-ffff-ffff-ffff-ffffffffffff": {
          "connectionName": "shared-office365-ffffffff-ffff-ffff-ffff-ffffffffffff",
          "id": "/providers/Microsoft.PowerApps/apis/shared_office365"
        }
      },
      "hostTemplate": {
        "connectionName": "shared-office365-ffffffff-ffff-ffff-ffff-ffffffffffff",
        "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
      },
      "usageHint": "Add connectionReferenceTemplate to update_live_flow's connectionReferences map. ..."
    }
  ],
  "totalCount": 5,
  "search": "office365",
  "truncated": true,
  "matchedCount": 19,
  "permissionsIncluded": true,
  "fallbackUsed": false,
  "error": null
}
```

> **Key field**: `id` is the `connectionName` value used in `connectionReferences`.
>
> **Key field**: `connectorName` maps to apiId:
> `"/providers/Microsoft.PowerApps/apis/" + connectorName`
>
> Filter by status with `statuses[0].status == "Connected"`. The reply has no
> `overallStatus` or `authenticatedUser`, even though the tool description lists
> them; the signed-in account is `accountName`.
>
> `connectionReferenceTemplate` is already a map **keyed by the connection id** —
> merge it into `connectionReferences` as-is; do not nest it under another key.
> `hostTemplate.connectionName` is that same id, so actions that use
> `hostTemplate` match the map key. Do not add `"source": "Invoker"`: it saves
> the connection as "provided by run-only user".
>
> `environmentName` is required — the platform cannot list connections across
> environments (omitting it answers 400 MissingEnvironmentFilter). Get one from
> `list_live_environments`.
>
> Pass `search=<connector or account>` to narrow output and receive
> `connectionReferenceTemplate` plus `hostTemplate` values that can be copied
> directly into `update_live_flow`.

### `list_store_connections`

Same connection data from cache.

---

## Flow Discovery & Listing

### `list_live_flows`

Response: wrapper object with `flows` array.
```json
{
  "mode": "owner",
  "flows": [
    {
      "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "displayName": "My Flow",
      "state": "Started",
      "triggerType": "Request",
      "triggerKind": "Http",
      "createdTime": "2023-08-18T01:18:17Z",
      "lastModifiedTime": "2023-08-18T12:47:42Z",
      "owners": ["<aad-object-id>"],
      "definitionAvailable": true
    }
  ],
  "totalCount": 100,
  "nextLink": null,
  "error": null
}
```

> Access via `result["flows"]`. `id` is a plain UUID --- use directly as `flowName`.
>
> `mode` indicates the access scope used (`"owner"` or `"admin"`). `owners` is
> an array (often empty). `nextLink` appears only when paging stopped early.
>
> Parameters added in newer server versions:
> - `search`: filter by display name server-side.
> - `mode`: `owner` (default) for flows you own plus flows shared with you;
>   `admin` for every flow in the environment (needs an admin account).
> - `includeDeleted: true` (with `mode: "admin"`): also returns soft-deleted
>   flows (`state: "Deleted"`) — the only listing that shows them.
> - `timeoutSeconds`: return partial results with `nextLink` instead of waiting
>   on very large environments.
> - `continuationUrl`: pass the previous `nextLink` to continue the same query.

### `list_store_flows`

Response: **direct array** (no wrapper).
```json
[
  {
    "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.cccccccc-cccc-cccc-cccc-cccccccccccc",
    "displayName": "Admin | Sync Template v3 (Solutions)",
    "state": "Started",
    "triggerType": "OpenApiConnectionWebhook",
    "environmentName": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "runPeriodTotal": 100,
    "createdTime": "2023-08-18T01:18:17Z",
    "lastModifiedTime": "2023-08-18T12:47:42Z"
  }
]
```

> **`id` format**: `<environmentId>.<flowId>` --- split on the first `.` to extract the flow UUID:
> `flow_id = item["id"].split(".", 1)[1]`

### `get_store_flow`

Response: single flow metadata from cache (selected fields).
```json
{
  "id": "<environmentId>.<flowId>",
  "displayName": "My Flow",
  "state": "Started",
  "triggerType": "Recurrence",
  "runPeriodTotal": 100,
  "runPeriodFailRate": 0.1,
  "runPeriodSuccessRate": 0.9,
  "runPeriodFails": 10,
  "runPeriodSuccess": 90,
  "runPeriodDurationAverage": 29410.8,
  "runPeriodDurationMax": 158900.0,
  "runError": "{\"code\": \"EACCES\", ...}",
  "description": "Flow description",
  "tier": "Premium",
  "complexity": "{...}",
  "actions": 42,
  "connections": ["sharepointonline", "office365"],
  "owners": ["user@contoso.com"],
  "createdBy": "user@contoso.com"
}
```

> `runPeriodDurationAverage` / `runPeriodDurationMax` are in **milliseconds** (divide by 1000).
> `runError` is a **JSON string** --- parse with `json.loads()`.

---

## Flow Definition (Live API)

### `get_live_flow`

Response: full flow definition from PA API.
```json
{
  "name": "<flow-guid>",
  "properties": {
    "displayName": "My Flow",
    "state": "Started",
    "lastModifiedTime": "2026-11-04T01:06:46.3052874Z",
    "definition": {
      "triggers": { "..." },
      "actions": { "..." },
      "parameters": { "..." }
    },
    "connectionReferences": { "..." }
  },
  "retrievedAsAdmin": false,
  "definitionAvailable": true
}
```

> Narrow a large flow: `depth: "summary"` replaces `definition.actions` with
> `definition.actionTree` (name, type, operationId, connection, runAfter, nesting —
> no inputs) and adds a `narrowed` note. `actions: ["Name", …]` returns just those
> actions, found at any depth. Never save a narrowed definition back whole.
>
> `version` reads an earlier version (an id from `get_live_flow_versions`, or a
> date). `includeTriggerUrl: true` adds `triggerUrls: [{trigger, method, url}]`
> for HTTP request triggers.
>
> `retrievedAsAdmin: true` with `definitionAvailable: false` means only the admin
> endpoint could read the flow: there is no definition to edit.
>
> Keep `properties.lastModifiedTime` — pass it to `update_live_flow` as
> `expectedLastModifiedTime` so a save is refused if someone changed the flow in
> between.

### `get_live_flow_versions`

Response:
```json
{
  "versions": [
    {"version": "08584296068667933411438594643CU15", "source": "run", "current": true,
     "savedAt": "2026-11-02T09:31:33Z", "firstRan": "2026-11-02T09:31:37Z",
     "lastRan": "2026-11-02T09:31:37Z", "runCount": 1}
  ],
  "runsRead": 2,
  "more": false
}
```

> Newest first. A flow in a solution lists every published version; any other
> flow lists only versions that ran, while their runs are kept. A version with
> `source: "draft"` locks the flow — `update_live_flow` is refused until the draft
> is published in the portal or discarded with `discardDraft: true`.

### `diff_live_flow`

`from` (a version, a run name, or a date) and optional `to` (default: the current
flow).

Response: `{from, to, identical, added: [...], removed: [...], changed: [{action, fields: [{field, from, to}]}]}`
— action names, with field-level before/after for changed actions. Use it to
answer "what changed since it last worked".

To put an earlier version back, follow `tool_search` `skill:flow-versions`: diff,
get the person's yes, read the old actions with `get_live_flow` `version` +
`actions`, save only those with `update_live_flow`, then diff again.

### `update_live_flow`

**Create mode**: Omit `flowName` --- creates a new flow. `definition` and `displayName` required.

**Update mode**: Provide `flowName` --- PATCHes existing flow.

Response:
```json
{
  "created": false,
  "flowKey": "<environmentId>.<flowId>",
  "updated": ["definition", "connectionReferences"],
  "displayName": "My Flow",
  "state": "Started",
  "definition": { "...full definition..." },
  "error": null
}
```

> On create: `created` is `true` and the new flow GUID is in **`flowName`**
> (`flowKey` = `<environmentId>.<flowName>`). On update: `created` is `false`.
>
> `error` is `null` on a finished save. A dry run and a still-running task have no
> `error` key — check for `status: "working"` (then poll `get_task`) before reading
> a missing `error` as success. A refused save comes back with `isError: true`.
>
> **Surgical edit** — pass `operations` instead of `definition` to change one action:
> `[{"op": "set", "path": ["actions", "Send_Email", "inputs", "parameters", "subject"], "value": "Weekly report"}]`.
> `path` is an array of literal keys (array items by index); a `/` inside an
> element is literal, so `["actions", "Update_item", "inputs", "parameters", "item/Title"]`
> works. Ops: `set`, `add` (fails if the key exists), `remove`, `merge`. The reply
> has `mode: "applied"`, `operationsApplied`, and per-path before/after in
> `changes` — not the whole definition.
>
> `dryRun: true` previews either kind of save and writes nothing. The reply has
> `dryRun: true`, `mode: "preview"`, and `wouldCreate` or `wouldUpdate`.
>
> `expectedLastModifiedTime` (from `get_live_flow`'s `properties.lastModifiedTime`)
> refuses a whole-definition save if the flow changed since you read it.
> `discardDraft: true` discards an unpublished portal draft that blocks the save
> of a solution flow; the draft stays in version history.
>
> `hints` (when present) lists what the server fixed or warns about — for example
> a solution flow saved with a direct connection. Read it.
>
> `definition.description` is required on create. On update the server reuses the
> flow's existing description when you leave it out. ` #flowstudio-mcp` is
> appended to it.

### `add_to_solution`

Adds a flow (`flowName`) or a canvas app (`app`) to a solution. `solution` is the
solution's unique name or its `solutionid` GUID.

- A flow not yet in a solution moves into `solution`, or into the default
  solution when `solution` is omitted. Prefer an explicit unmanaged solution for
  production ALM.
- A flow already in a solution is also added to `solution` and stays in its
  current one; `solution` is required then.
- It never changes a flow's connections.

Use this after creating a Copilot Studio Skills-triggered flow that must be
discoverable as an agent tool.

`add_live_flow_to_solution` (with `solutionId`) is hidden. It still runs when
called by exact name and its reply names `add_to_solution`.

This tool changes solution membership only. It does not validate the trigger
schema, publish a Copilot Studio agent, or prove that the flow is callable by the
agent.

---

## Connector Operation Discovery

### `describe_live_connector`

Describes a connector/API and its operations. Use it before creating connector
actions instead of guessing operation JSON.

Common modes:

| Call shape | Use |
|---|---|
| `search="send email"` without `connectorName` | Search operations across connectors |
| `connectorName="shared_sharepointonline"` | Compact operation catalog for one connector (`depth: "summary"`, the default) |
| `operationId="GetItems"` | Expanded schema for one operation — `{connectorName, mode: "operation", operation: {name, summary, inputs, ...}, hints, nextStepHint}` |
| `variant="flowbot_chat"` | Authored example for one operation variant |
| `type="Trigger"` | List trigger operations instead of actions |
| `depth: "full"` | Raw OpenAPI metadata (100-600 KB) — only when nothing else works |

The operation detail can include:
- `hints.hint`: authored guidance from the connector hints table.
- `hints.exampleDefinition`: copy-ready action/trigger shape when available.
- Dynamic inputs with `nextTool: "resolve_live_parameters"` and a `hint` naming
  the `parameterName` to resolve.

`mode` is the old name for `depth` and still works, with a hint.

### `resolve_live_parameters`

Resolves an action's live inputs the way the flow designer does: dropdown
options, list and table columns, folder and file pickers, people. Reads only.

- `connectorName` + `operationId`: every input in one call, or one with
  `parameterName`. Or `flowName` + `actionName` for an action already in a flow.
- `parameters`: values already chosen, e.g. `{"dataset": "<site url>"}`. An input
  whose parent is not known yet comes back with `status: "needs"`.
- `match`: a display name per input (`{"table": "Roster"}`). A match answers
  `status: "ok"` with `matched: {value, displayName}` and adds the value to the
  reply's `parameters`; no match answers `status: "nomatch"` with the options.
- `search`, `top` (default 200), `skip` (use `nextSkip`), `detail`
  (`compact` | `full`), `include: ["outputs"]` for the fields the action returns.
- `connectionName` is optional: one is chosen and reported in `connection`.

Response: `{connectorName, operationId, connection: {connectionName, reason, candidates}, parameters, fields: [{name, title, required, kind, status, values: [{value, displayName}], totalCount}]}`.

`get_live_dynamic_options` and `get_live_dynamic_properties` are hidden. They
still run when called by exact name and their replies name
`resolve_live_parameters`.

---

## Data and Connection Tools

### `read_live_table`

Reads rows from a Dataverse table, SharePoint list, SQL table or Excel table.
Read-only.

| Source | `connector` | `table` | `dataset` |
|---|---|---|---|
| Dataverse | omit | set name, e.g. `accounts` | — |
| SharePoint | `sharepoint` | list title or id | site URL |
| SQL | `sql` | table | `server,database` |
| Excel | `excel` | table | `drive,file` |

Also: `select` (comma-separated), `filter` (OData), `top` (1-100, default 20),
`skip` (SQL and Excel), `continuationUrl` (the previous `nextLink`). Pass
`connection` when you have more than one connection for that connector and not
exactly one is Connected — the call is refused, with the list, until you do. Note the name: `connection`, not
`connectionName`.

Response: `{connector, table, connectionName, rowCount, columns, rows, nextLink, next}`.
If the rows would pass 20,000 characters, only the rows that fit are returned and
`note` says so — name fewer columns with `select`.

### `test_live_connection`

Without `operationId`: runs the connector's own connection test — the quick way
to tell a broken connection from a broken flow. With `operationId`: runs one read
operation (or a lookup the connector declares) and returns the raw reply. Needs
`connectorName` and `connectionName` (from `list_live_connections`). Over the
`/mcp/oauth` route only the connection test is offered.

### `create_live_connection`

Creates a connection, or signs an existing one in again when given
`connectionName`. Shows a sign-in card; the person signs in — you never sign in
for them. Always give them `signInLink` as well (the card may not show); it
expires about 10 minutes after it is made (`signInLinkExpires`). Connectors that
need a key or account details are refused: create those in Power Automate.
Check the result with `list_live_connections` or `test_live_connection`.

### `grant_flow_studio_access`

No arguments. Shows a sign-in card so the person grants FlowStudio access, or
grants it again when it expired or was revoked. Call it when a tool error says
"This needs one more sign-in" and names it.

---

## Run History & Monitoring

### `get_live_flow_runs`

Response: `{ runs, runCount, triggerChecks }` — runs newest first.
```json
{
  "runs": [{
    "name": "<run-id>",
    "status": "Succeeded|Failed|Running|Cancelled",
    "startTime": "2026-02-25T06:13:38Z",
    "endTime": "2026-02-25T06:14:02Z",
    "triggerName": "Recurrence",
    "error": null
  }],
  "runCount": 1,
  "triggerChecks": null
}
```

> `top` defaults to **30** and auto-paginates for higher values. Set `top: 300`
> for 24-hour coverage on flows running every 5 minutes.
>
> Filter on Microsoft's side instead of in code: `status` (`Succeeded`, `Failed`,
> `Cancelled`, `Running`), `startedAfter` / `startedBefore` (date-times like
> `2026-10-01T00:00:00Z`), and `triggerCheckStatus` (`Succeeded`, `Failed`,
> `Skipped`). Filters hold across pages. The reply echoes `runFilter` (e.g.
> `"status eq 'Failed'"`) and adds a `note` when nothing matched. Each run also
> carries `triggerCode`.
>
> Run ID field is **`name`** (not `runName`). Use this value as the `runName`
> parameter in other tools.
>
> **An empty `runs` list does not mean the flow is healthy.** A connector
> trigger that fails to evaluate, or evaluates to nothing, records a TRIGGER
> CHECK and never becomes a run. When `runs` is empty the response fills
> `triggerChecks` (history + `byStatus` counts) automatically; pass
> `includeTriggerChecks: true` to get it even when runs exist (two extra API
> calls). Read a single check's payload — the only place its failure reason
> lives — with `get_live_flow_run_action_outputs` and `checkId`.

### `get_live_flow_run_error`

Response: structured error breakdown for a failed run.
```json
{
  "runName": "08584296068667933411438594643CU15",
  "failedActions": [
    {
      "actionName": "Apply_to_each_prepare_workers",
      "status": "Failed",
      "error": {"code": "ActionFailed", "message": "An action failed."},
      "code": "ActionFailed",
      "startTime": "2026-02-25T06:13:52Z",
      "endTime": "2026-02-25T06:15:24Z"
    },
    {
      "actionName": "HTTP_find_AD_User_by_Name",
      "status": "Failed",
      "code": "NotSpecified",
      "startTime": "2026-02-25T06:14:01Z",
      "endTime": "2026-02-25T06:14:05Z"
    }
  ],
  "allActions": [
    {"actionName": "Apply_to_each", "status": "Skipped"},
    {"actionName": "Compose_WeekEnd", "status": "Succeeded"},
    {"actionName": "HTTP_find_AD_User_by_Name", "status": "Failed"}
  ]
}
```

> `failedActions` comes back in the order Power Automate lists actions —
> **alphabetical by name**, not by nesting or run order — so the last entry is
> not necessarily the root cause. A failed container (Scope, Foreach, Condition,
> Switch) usually has `code: "ActionFailed"` ("An action failed"); the root cause
> is normally the failed action with any other code. Not every entry has an
> `error` object — use `code`, then read the full message with
> `get_live_flow_run_action_outputs` and that `actionName`. Check nesting with
> `get_live_flow` `depth: "summary"`.
>
> `runName` is required. `runName: "latest"` picks the most recent run on purpose.

### `get_live_flow_run_action_outputs`

Response: wrapper object with an `actions` array.
```json
{
  "runName": "08584296068667933411438594643CU15",
  "actionName": "Compose_WeekEnd_now",
  "actions": [
    {
      "actionName": "Compose_WeekEnd_now",
      "status": "Succeeded",
      "startTime": "2026-02-25T06:13:52Z",
      "endTime": "2026-02-25T06:13:52Z",
      "error": null,
      "inputs": "Mon, 25 Feb 2026 06:13:52 GMT",
      "outputs": "Mon, 25 Feb 2026 06:13:52 GMT"
    }
  ]
}
```

> Index `res["actions"]` — the reply is not a bare list. For an action inside a
> foreach the list is `res["repetitions"]` (`res["repetition"]` with `iterationIndex`).
>
> `runName` is required (the `name` from `get_live_flow_runs`, or `"latest"`);
> a call without it is refused. Leave it out only when you pass `checkId`.
>
> **`actionName` is optional**: omit it for a survey of every action in the run, nested ones included —
> each payload capped at 4,000 characters (`{truncated, chars, preview, readInFull}`),
> most headers dropped, and a `note` saying so. Provide it for one action in full.
> If that action runs inside a foreach, the tool can return every repetition of
> that action across iterations; pass `iterationIndex` to pin to one zero-based
> iteration. For the trigger, pass `trigger: true` — `actionName` set to the
> trigger's name returns `actions: []`.
>
> A payload over 1 MB is not downloaded. It comes back as
> `{tooLarge: true, bytes, maxBytes, link, linkExpiresAt, note}`; `link` downloads
> it with a plain GET and no sign-in until `linkExpiresAt`, so treat it like a
> password. Keep a 120s+ timeout: up to 4 payloads are read at a time.

---

## Run Control

### `resubmit_live_flow_run`

Response: `{ flowKey, resubmitted: true, runName, triggerName }`

> `runName` is required. `"latest"` resubmits the most recent run — confirm it is
> the run you mean first.

### `cancel_live_flow_run`

Cancels a `Running` flow run. Response: `{ flowKey, cancelled: true, runName }`.

> `runName` is required and must be a real run name — `"latest"` is refused.

> Do NOT cancel runs waiting for an adaptive card response --- status `Running`
> is normal while a Teams card is awaiting user input.

---

## HTTP Trigger Tools

### Trigger URL and Request Schema

`get_live_flow` with `includeTriggerUrl: true` returns
`triggerUrls: [{trigger, method, url}]` for HTTP request triggers. The URL is a
credential — anyone holding it can run the flow — so ask for it only when the
person needs to call the flow by its address, and share it only where it is meant
to go. A stopped flow returns no URL; turning it on brings the same URL back.
Without the flag, an HTTP-triggered flow's reply carries `triggerUrlHint`.

The request body schema is the `Request` trigger's `inputs.schema` in the
definition; response schemas are on the `Response` actions.

`get_live_flow_trigger_url`, `get_store_flow_trigger_url` and
`get_live_flow_http_schema` are hidden. They still run when called by exact name
(their replies name the replacement), but `tool_search` no longer returns them.
To run a flow, use `trigger_live_flow`.

### `trigger_live_flow`

Response keys: `flowKey`, `triggerName`, `triggerType`, `triggerKind`, `invocation`,
`triggerUrl`, `requiresAadAuth`, `authType`, `responseStatus`, `responseBody`,
`runName`, `warning` when a required trigger input was not supplied, and
`runOnlyUserConnections` + `hints` for flows whose connections are provided by
whoever runs them.

> **Works for `Request` triggers (HTTP request, Button, PowerApps, Copilot Studio Skills) and for
> scheduled (Recurrence) flows.** A scheduled flow runs immediately, like the
> portal's "Run flow" button, and takes no `body` — one is refused. Automated
> connector triggers only fire from their source event and return an error.
>
> HTTP triggers go through the signed callback URL (`invocation: callbackUrl`).
> Button, PowerApps and Skills triggers have no callback URL; with a `body` they run
> through the Power Platform connector runtime (`connectorFlowToken` or
> `connectorApihubToken`), which is the only route that delivers the inputs.
> With no body they use the cheaper direct run (`directRun`).
>
> `runName` is returned only for connector-runtime runs. Otherwise look the run
> up with `get_live_flow_runs`.
>
> Power Automate does not enforce a trigger's `required` list. A missing input
> still starts the run with a null value; `warning` names the missing keys and
> the body shape to retry with.
>
> Browser-extension keys run Button, PowerApps and Skills triggers with inputs too: the
> connector call runs inside the extension (version 1.0.19 or later).
>
> `connections` is only for a flow whose connections are provided by whoever runs
> it ("run-only user"): a map of connection-reference name to connection id, e.g.
> `{"shared_office365users": "shared-office365user-…"}`. By default the run uses
> the connection already bound to the flow; the reply's `runOnlyUserConnections`
> and `hints` say which one was used. Pass `connections` only when that pick was
> wrong.
>
> `responseStatus` + `responseBody` contain the flow's Response action output.
> AAD-authenticated triggers are handled automatically.
>
> **Content type**: `body` is sent as `application/json`, so `triggerBody()` and
> the trigger schema see the object you passed. Verified 2026-08-27 on server 1.2.43
> against Button, PowerAppV2, and Skills triggers with `required` schemas.

---

## Flow State Management

### `set_live_flow_state`

Start or stop a Power Automate flow in any environment you have access to.
Reads the current state first and only issues the start/stop call if a change is
actually needed.

Parameters: `environmentName`, `flowName`, `state` (`"Started"` | `"Stopped"`) — all required.

Response:
```json
{
  "flowName": "dddddddd-dddd-dddd-dddd-dddddddddddd",
  "environmentName": "Default-aaaaaaaa-...",
  "requestedState": "Started",
  "previousState": "Stopped",
  "currentState": "Started",
  "changed": true
}
```

> When every endpoint fails and Microsoft gave a message, the error reads
> `Microsoft error: <code>: <Microsoft's message>` followed by any hints. `Invalid flowName` means both endpoints
> answered 404.

> **Use this tool** — not `update_live_flow` — to start or stop a flow.
> `update_live_flow` only changes displayName/definition; the PA API ignores
> state passed through that endpoint.

### `set_store_flow_state`

Hidden — use `set_live_flow_state`. It still runs when called by exact name and
its reply names the replacement.

---

## Store Tools --- Pro+ Only

MCP Pro+ only, and not in Microsoft 365 Copilot (Copilot Chat or Cowork), even on Pro+. Without them,
`tool_search` `skill:governance` returns no tools and `list_skills` leaves
`governance` out.

### `get_store_flow_summary`

Response: aggregated run statistics.
```json
{
  "totalRuns": 100,
  "failRuns": 10,
  "failRate": 0.1,
  "averageDurationSeconds": 29.4,
  "maxDurationSeconds": 158.9,
  "firstFailRunRemediation": "<hint or null>"
}
```

### `get_store_flow_runs`

Cached run history (default: the last 7 days) with duration, failed actions and
remediation hints. For failed runs only, pass `status: ["Failed"]` — this
replaces the hidden `get_store_flow_errors`.

`get_store_flow_trigger_url` is hidden too: use `get_live_flow` with
`includeTriggerUrl: true`.

### `update_store_flow`

Update governance metadata (description, tags, monitor flag, notification rules, business impact).

### `list_store_makers` / `get_store_maker`

Maker (citizen developer) discovery and detail.

### `list_store_power_apps`

List all Power Apps canvas apps from the cache.

---

## Behavioral Notes

Non-obvious behaviors discovered through real API usage. These are things
tool schemas cannot tell you.

### `get_live_flow_run_action_outputs`
- **`actionName` is optional**: omit for a survey of every action in the run
  (nested ones included), provide to get one action. For actions inside foreach
  loops, a named action returns `repetitions`; use `iterationIndex` to pin to one
  iteration.
- `trigger: true` returns the run's own trigger inputs/outputs (e.g. the full
  inbound mail item). `checkId` reads a trigger check that never became a run —
  the only place its failure reason lives; `runName` is not needed with it.
- A payload over 1 MB comes back as `tooLarge` with a download `link` instead of
  the data. `runName` is required (or `"latest"`). Keep a 120s+ timeout.

### `delete_live_flow` / `restore_live_flow`
- Both are offered to every agent. `delete_live_flow` is refused while the
  person's **Delete Lock** is on — the default. Only they can turn it off, at
  https://mcp.flowstudio.app/dashboard; no workspace owner is involved. Do not
  tell users deletion is impossible — say Delete Lock is on. To stop a flow
  without deleting it, use `set_live_flow_state` with `state: "Stopped"`.
- `restore_live_flow` can always be called, Delete Lock or not.
- Delete requires `confirmDisplayName` (read it with `get_live_flow` first) and
  a `reason`. Keep the returned id: a deleted flow appears only in
  `list_live_flows` with `mode: "admin"` and `includeDeleted: true`, and
  restore can complete asynchronously — confirm with `get_live_flow`.

### `update_live_flow`
- Required fields can vary by server version; confirm with `tool_search`
  (`select:update_live_flow`) before create/update. If `description` is required,
  preserve the existing description when patching.
- `error` is `null` on a finished save. A dry run and a still-running task have
  no `error` key — check `res.get("status") == "working"` (then poll `get_task`)
  before treating a missing error as success.
- On create, `created` = `true` and the new GUID is in `flowName`. On update,
  `created` = `false`.
- A real save still running after about 25 seconds replies with a `taskId`. Do
  not save again — poll `get_task`. A repeated create with the same name joins the
  running task, but a retry under a new name creates a second flow.
- **Cannot change flow state.** Only updates displayName, definition, and
  connectionReferences. Use `set_live_flow_state` to start/stop a flow.

### `trigger_live_flow`
- **Works for HTTP, Button, PowerApps, Skills, and scheduled (Recurrence) triggers.**
  A scheduled flow runs with no `body`. Automated connector triggers error.
- Pass trigger inputs as `body`. A `warning` in the result means a required input
  was missing and the run started with it null.
- AAD-authenticated triggers are handled automatically (Bearer token attached).

### `get_live_flow_runs`
- Response is `{ runs, runCount, triggerChecks }` — index `["runs"]`, newest first.
- `top` defaults to **30** with automatic pagination for higher values. Filter
  with `status`, `startedAfter`, `startedBefore` and `triggerCheckStatus` rather
  than fetching and filtering in code.
- Run ID field is `name`, not `runName`. Use this value as `runName` in other tools.
- Empty `runs` + non-null `triggerChecks` = the trigger is firing and failing
  or skipping, not a healthy idle flow.

### Teams `PostMessageToConversation` (via `update_live_flow`)
- **"Chat with Flow bot"**: `body/recipient` = `"user@domain.com;"` (string with trailing semicolon).
- **"Channel"**: `body/recipient` = `{"groupId": "...", "channelId": "..."}` (object).
- `poster`: `"Flow bot"` for Workflows bot identity, `"User"` for user identity.

### `list_live_connections`
- `environmentName` is required; the platform cannot list connections across
  environments. `top` is applied after `search` and the result carries
  `truncated` + `matchedCount` when the cap drops matches.
- Use `search=<connector/account>` to get smaller output and paste-ready
  `connectionReferenceTemplate` / `hostTemplate` values. The template is a map
  keyed by the connection id — merge it as-is; `hostTemplate.connectionName` is
  the same id.
- `id` is the value you need for `connectionName` in `connectionReferences`.
- `connectorName` maps to apiId: `"/providers/Microsoft.PowerApps/apis/" + connectorName`.
