---
name: flowstudio-power-automate-build
description: >-
  Build, scaffold, and deploy Power Automate cloud flows using the FlowStudio
  MCP server. Your agent constructs flow definitions, wires connections, deploys,
  and tests — all via MCP without opening the portal.
  Load this skill when asked to: create a flow, build a new flow,
  deploy a flow definition, scaffold a Power Automate workflow, construct a flow
  JSON, update an existing flow's actions, patch a flow definition, add actions
  to a flow, wire up connections, or generate a workflow definition from scratch.
  Requires a FlowStudio MCP subscription — see https://mcp.flowstudio.app
---

# Build & Deploy Power Automate Flows with FlowStudio MCP

Step-by-step guide for constructing and deploying Power Automate cloud flows
programmatically through the FlowStudio MCP server.

**Prerequisite**: A FlowStudio MCP server must be reachable with a valid JWT.
See the `flowstudio-power-automate-mcp` skill for connection setup.
Subscribe at https://mcp.flowstudio.app

Workflow:
1. Load current build tools.
2. Check for an existing flow.
3. Resolve connection references.
4. Build the definition.
5. Deploy.
6. Verify.
7. Test.

---

## Source of Truth

> **Always call `list_skills` / `tool_search` first** to confirm available tool
> names and parameter schemas. Tool names and parameters may change between
> server versions.
> This skill covers response shapes, behavioral notes, and build patterns —
> things tool schemas cannot tell you. If this document disagrees with
> `tool_search` or a real API response, the API wins.

---

## Python Helper

```python
import json, urllib.request

MCP_URL   = "https://mcp.flowstudio.app/mcp"
MCP_TOKEN = "<YOUR_JWT_TOKEN>"

def mcp(tool, **kwargs):
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                          "params": {"name": tool, "arguments": kwargs}}).encode()
    req = urllib.request.Request(MCP_URL, data=payload,
        headers={"x-api-key": MCP_TOKEN, "Content-Type": "application/json",
                 "User-Agent": "FlowStudio-MCP/1.0"})
    try:
        resp = urllib.request.urlopen(req, timeout=120)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"MCP HTTP {e.code}: {body[:200]}") from e
    raw = json.loads(resp.read())
    if "error" in raw:
        raise RuntimeError(f"MCP error: {json.dumps(raw['error'])}")
    return json.loads(raw["result"]["content"][0]["text"])

ENV = "<environment-id>"  # e.g. Default-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 0. Load the Current Build Tools

For a brand-new flow, load the server's `create-flow` bundle. For editing an
existing flow, load `build-flow`. This keeps the agent aligned with the MCP
server's current schema before constructing JSON.

```python
schemas = mcp("tool_search", query="skill:create-flow")
# Includes list_live_environments, list_live_connections,
# describe_live_connector, get_live_dynamic_options, update_live_flow.
```

If you need a tool outside the bundle, load it explicitly:

```python
mcp("tool_search", query="select:get_live_dynamic_properties")
```

---

## 1. Safety Check: Does the Flow Already Exist?

Always look before you build to avoid duplicates:

```python
results = mcp("list_live_flows",
    environmentName=ENV,
    mode="owner",
    search="My New Flow",
    top=20)

# list_live_flows returns { "flows": [...], "mode": "...", ... }
matches = [f for f in results["flows"]
           if "My New Flow".lower() in f["displayName"].lower()]

if len(matches) > 0:
    # Flow exists — modify rather than create
    FLOW_ID = matches[0]["id"]   # plain UUID from list_live_flows
    print(f"Existing flow: {FLOW_ID}")
    defn = mcp("get_live_flow", environmentName=ENV, flowName=FLOW_ID)
else:
    print("Flow not found — building from scratch")
    FLOW_ID = None
```

For very large environments, `list_live_flows` may return a continuation URL.
Pass it back as `continuationUrl` with the same `mode` to retrieve the next
batch. Use `mode="admin"` only when the user needs all environment flows and
the MCP identity has admin rights.

---

## 2. Obtain Connection References

Every connector action needs a `connectionName` that points to a key in the
flow's `connectionReferences` map. That key links to an authenticated connection
in the environment.

> **MANDATORY**: You MUST call `list_live_connections` first — do NOT ask the
> user for connection names or GUIDs. The API returns the exact values you need.
> Only prompt the user if the API confirms that required connections are missing.

### 2a — Find active connections

```python
conns = mcp("list_live_connections", environmentName=ENV)
active = [c for c in conns["connections"]
          if c["statuses"][0]["status"] == "Connected"]
conn_map = {c["connectorName"]: c["id"] for c in active}
```

For a known connector, pass `search` to reduce output and get paste-ready
`connectionReferenceTemplate` and `hostTemplate` values:

```python
sp_conns = mcp("list_live_connections",
    environmentName=ENV,
    search="shared_sharepointonline")
```

### 2b — Determine which connectors the flow needs

Common connector API names: SharePoint `shared_sharepointonline`, Outlook
`shared_office365`, Teams `shared_teams`, Approvals `shared_approvals`,
OneDrive `shared_onedriveforbusiness`, Excel `shared_excelonlinebusiness`,
Dataverse `shared_commondataserviceforapps`, Forms `shared_microsoftforms`.

Flows that need no connectors, such as Recurrence + Compose + HTTP only, can
omit `connectionReferences`.

### 2c — If connections are missing, guide the user

```python
connectors_needed = ["shared_sharepointonline", "shared_office365"]  # adjust per flow
missing = [c for c in connectors_needed if c not in conn_map]
if missing:
    # STOP: connections require browser OAuth consent.
    # Ask the user to create the missing connector connections in the
    # selected environment, then re-run list_live_connections.
    raise Exception(f"Missing active connections: {missing}")
```

### 2d — Build the connectionReferences block

```python
connection_references = {}
host_templates = {}
for connector in connectors_needed:
    c = next(c for c in active if c["connectorName"] == connector)
    connection_references[connector] = c.get("connectionReferenceTemplate") or {
        "connectionName": c["id"],   # the connection id from list_live_connections
        "source": "Invoker",
        "id": f"/providers/Microsoft.PowerApps/apis/{connector}"
    }
    host_templates[connector] = c.get("hostTemplate") or {
        "connectionName": connector
    }
```

In Step 3 action JSON, `inputs.host.connectionName` must be the map key such as
`shared_teams`, not the GUID. The GUID belongs only inside the
`connectionReferences[connector].connectionName` value. If an existing flow uses
the same connectors, you may also copy its `properties.connectionReferences`
from `get_live_flow`.

---

## 3. Build the Flow Definition

Construct the definition object. See [flow-schema.md](references/flow-schema.md)
for the full schema and these action pattern references for copy-paste templates:
- [action-patterns-core.md](references/action-patterns-core.md) — Variables, control flow, expressions
- [action-patterns-data.md](references/action-patterns-data.md) — Array transforms, HTTP, parsing
- [action-patterns-connectors.md](references/action-patterns-connectors.md) — SharePoint, Outlook, Teams, Approvals

```python
definition = {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": { ... },   # see trigger-types.md / build-patterns.md
    "actions": { ... }     # see ACTION-PATTERNS-*.md / build-patterns.md
}
```

> See [build-patterns.md](references/build-patterns.md) for complete, ready-to-use
> flow definitions covering Recurrence+SharePoint+Teams, HTTP triggers, and more.

### Discover connector operations before guessing JSON

For connector-backed triggers/actions, prefer the live connector describer over
hand-written shapes. It can return authored hints, canonical examples, variant
keys, inputs/outputs, and dynamic metadata pointers.

```python
# Search across connectors when you know the user's intent but not the API.
matches = mcp("describe_live_connector",
    environmentName=ENV,
    search="send email",
    top=5)

# Describe a specific operation before copying an exampleDefinition.
op = mcp("describe_live_connector",
    environmentName=ENV,
    connectorName="shared_office365",
    operationId="SendEmailV2")
print(op.get("hint"))
```

When an operation has multiple authored variants, request the variant the flow
needs:

```python
teams_chat = mcp("describe_live_connector",
    environmentName=ENV,
    connectorName="shared_teams",
    operationId="PostMessageToConversation",
    variant="flowbot_chat")
```

When the operation description says a parameter has dynamic options or dynamic
properties, call the indicated next tool:

```python
sp_op = mcp("describe_live_connector",
    environmentName=ENV,
    connectorName="shared_sharepointonline",
    operationId="GetItems")

sites = mcp("get_live_dynamic_options",
    environmentName=ENV,
    connectorName="shared_sharepointonline",
    connectionName=conn_map["shared_sharepointonline"],
    operationId="GetItems",
    parameterName="dataset",
    dynamicMetadata=sp_op["dynamicParameters"]["dataset"])

fields = mcp("get_live_dynamic_properties",
    environmentName=ENV,
    connectorName="shared_sharepointonline",
    connectionName=conn_map["shared_sharepointonline"],
    operationId="GetItems",
    parameterName="item",
    parameters={"dataset": "<site-url>", "table": "<list-id>"},
    dynamicMetadata=sp_op["dynamicProperties"]["item"])
```

Use dynamic options for dropdown IDs such as SharePoint sites/lists and Teams
teams/channels. Use dynamic properties for schema/field shapes such as
SharePoint list item columns.

---

## 4. Deploy (Create or Update)

`update_live_flow` handles both creation and updates in a single tool.

### Create a new flow (no existing flow)

Omit `flowName` — the server generates a new GUID and creates via PUT:

```python
definition["description"] = "Weekly SharePoint → Teams notification flow, built by agent"

result = mcp("update_live_flow",
    environmentName=ENV,
    # flowName omitted → creates a new flow
    definition=definition,
    connectionReferences=connection_references,
    displayName="Overdue Invoice Notifications"
)

if result.get("error") is not None:
    print("Create failed:", result["error"])
else:
    # Capture the new flow ID for subsequent steps
    FLOW_ID = result["created"]
    print(f"✅ Flow created: {FLOW_ID}")
```

### Update an existing flow

Provide `flowName` to PATCH:

```python
definition["description"] = (
    "Updated by agent on " + __import__('datetime').datetime.utcnow().isoformat()
)

result = mcp("update_live_flow",
    environmentName=ENV,
    flowName=FLOW_ID,
    definition=definition,
    connectionReferences=connection_references,
    displayName="My Updated Flow"
)

if result.get("error") is not None:
    print("Update failed:", result["error"])
else:
    print("Update succeeded:", result)
```

> ⚠️ `update_live_flow` always returns an `error` key.
> `null` (Python `None`) means success — do not treat the presence of the key as failure.
>
> ⚠️ Flow description lives at `definition["description"]`. The current server
> appends `#flowstudio-mcp` for usage tracking. Do not pass a top-level
> `description` argument unless `tool_search` shows one in the active schema.

### Common deployment errors

| Error message (contains) | Cause | Fix |
|---|---|---|
| `missing from connectionReferences` | An action's `host.connectionName` references a key that doesn't exist in the `connectionReferences` map | Ensure `host.connectionName` uses the **key** from `connectionReferences` (e.g. `shared_teams`), not the raw GUID |
| `ConnectionAuthorizationFailed` / 403 | The connection GUID belongs to another user or is not authorized | Re-run Step 2a and use a connection owned by the current `x-api-key` user |
| `InvalidTemplate` / `InvalidDefinition` | Syntax error in the definition JSON | Check `runAfter` chains, expression syntax, and action type spelling |
| `ConnectionNotConfigured` | A connector action exists but the connection GUID is invalid or expired | Re-check `list_live_connections` for a fresh GUID |

---

## 5. Verify the Deployment

```python
check = mcp("get_live_flow", environmentName=ENV, flowName=FLOW_ID)

# Confirm state
print("State:", check["properties"]["state"])  # Should be "Started"
# If state is "Stopped", use set_live_flow_state — NOT update_live_flow
# mcp("set_live_flow_state", environmentName=ENV, flowName=FLOW_ID, state="Started")

# Confirm the action we added is there
acts = check["properties"]["definition"]["actions"]
print("Actions:", list(acts.keys()))
```

---

## 6. Test the Flow

> **MANDATORY**: Before triggering any test run, **ask the user for confirmation**.
> Running a flow has real side effects — it may send emails, post Teams messages,
> write to SharePoint, start approvals, or call external APIs. Explain what the
> flow will do and wait for explicit approval before calling `trigger_live_flow`
> or `resubmit_live_flow_run`.

### Updated flows (have prior runs) — ANY trigger type

> **Use `resubmit_live_flow_run` first.** It works for EVERY trigger type —
> Recurrence, SharePoint, connector webhooks, Button, and HTTP. It replays
> the original trigger payload. Do NOT ask the user to manually trigger the
> flow or wait for the next scheduled run.

```python
runs = mcp("get_live_flow_runs", environmentName=ENV, flowName=FLOW_ID, top=1)
if runs:
    # Works for Recurrence, SharePoint, connector triggers — not just HTTP
    result = mcp("resubmit_live_flow_run",
        environmentName=ENV, flowName=FLOW_ID, runName=runs[0]["name"])
    print(result)   # {"resubmitted": true, "triggerName": "..."}
```

### HTTP-triggered flows — custom test payload

Only use `trigger_live_flow` when you need to send a **different** payload
than the original run. For verifying a fix, `resubmit_live_flow_run` is
better because it uses the exact data that caused the failure.

```python
defn = mcp("get_live_flow", environmentName=ENV, flowName=FLOW_ID)
triggers = defn["properties"]["definition"]["triggers"]
manual = next(iter(triggers.values()))
print("Expected body:", manual.get("inputs", {}).get("schema"))

result = mcp("trigger_live_flow",
    environmentName=ENV, flowName=FLOW_ID,
    body={"name": "Test", "value": 1})
print(f"Status: {result['responseStatus']}")
```

### Brand-new non-HTTP flows (Recurrence, connector triggers, etc.)

A brand-new Recurrence or connector-triggered flow has **no prior runs** to
resubmit and no HTTP endpoint to call. This is the ONLY scenario where you
need the temporary HTTP trigger approach below. **Deploy with a temporary
HTTP trigger first, test the actions, then swap to the production trigger.**

Compact recipe:

```python
production_trigger = definition["triggers"]
definition["triggers"] = {
    "manual": {"type": "Request", "kind": "Http", "inputs": {"schema": {}}}
}

result = mcp("update_live_flow",
    environmentName=ENV,
    flowName=FLOW_ID,       # omit if creating new
    definition=definition,
    connectionReferences=connection_references,
    displayName="Overdue Invoice Notifications")
FLOW_ID = FLOW_ID or result["created"]

test = mcp("trigger_live_flow", environmentName=ENV, flowName=FLOW_ID,
           body={"sample": "payload"})
runs = mcp("get_live_flow_runs", environmentName=ENV, flowName=FLOW_ID, top=1)

if runs[0]["status"] == "Failed":
    err = mcp("get_live_flow_run_error",
        environmentName=ENV, flowName=FLOW_ID, runName=runs[0]["name"])
    raise Exception(err["failedActions"][-1])

definition["triggers"] = production_trigger
mcp("update_live_flow",
    environmentName=ENV,
    flowName=FLOW_ID,
    definition=definition,
    connectionReferences=connection_references)
```

The trigger is only the entry point; testing through HTTP still exercises the
same actions. If actions use `triggerBody()` or `triggerOutputs()`, pass a
representative `trigger_live_flow.body` shaped like the production trigger
payload.

---

## Gotchas

| Mistake | Consequence | Prevention |
|---|---|---|
| Missing `connectionReferences` in deploy | 400 "Supply connectionReferences" | Always call `list_live_connections` first |
| `"operationOptions"` missing on Foreach | Parallel execution, race conditions on writes | Always add `"Sequential"` |
| `union(old_data, new_data)` | Old values override new (first-wins) | Use `union(new_data, old_data)` |
| `split()` on potentially-null string | `InvalidTemplate` crash | Wrap with `coalesce(field, '')` |
| Checking `result["error"]` exists | Always present; true error is `!= null` | Use `result.get("error") is not None` |
| Flow deployed but state is "Stopped" | Flow won't run on schedule | Call `set_live_flow_state` with `state: "Started"` — do **not** use `update_live_flow` for state changes |
| Teams "Chat with Flow bot" recipient as object | 400 `GraphUserDetailNotFound` | Use plain string with trailing semicolon (see below) |
| Copilot/Skills flow not in a solution | Copilot Studio may not discover it as an agent tool | After deploy, call `add_live_flow_to_solution` with the target `solutionId` |
| Button/Skills trigger used for MCP testing | MCP cannot directly fire the production trigger | Test the same actions through a temporary HTTP twin, then swap the trigger back |
| Connector action missing `metadata.operationMetadataId` | Designer/run-only UI can behave inconsistently | Preserve existing IDs; add stable GUIDs for new connector actions |
| Placeholder Excel `scriptId` | Dynamic validation fails at save time | Resolve the real Office Script ID before deploying |
| SharePoint `PatchItem` omits required fields | Save can fail even if the field is not changing | Echo unchanged required fields such as `item/Title` |
| Copilot Studio connector calls a draft agent | Connector invocation can fail or hit stale behavior | Publish the agent before testing/resubmitting the flow |

### Teams `PostMessageToConversation` — Recipient Formats

The `body/recipient` parameter format depends on the `location` value:

| Location | `body/recipient` format | Example |
|---|---|---|
| **Chat with Flow bot** | Plain email string with **trailing semicolon** | `"user@contoso.com;"` |
| **Channel** | Object with `groupId` and `channelId` | `{"groupId": "...", "channelId": "..."}` |

> **Common mistake**: passing `{"to": "user@contoso.com"}` for "Chat with Flow bot"
> returns a 400 `GraphUserDetailNotFound` error. The API expects a plain string.

---

## Reference Files

- [flow-schema.md](references/flow-schema.md) — Full flow definition JSON schema
- [trigger-types.md](references/trigger-types.md) — Trigger type templates
- [action-patterns-core.md](references/action-patterns-core.md) — Variables, control flow, expressions
- [action-patterns-data.md](references/action-patterns-data.md) — Array transforms, HTTP, parsing
- [action-patterns-connectors.md](references/action-patterns-connectors.md) — SharePoint, Outlook, Teams, Approvals
- [build-patterns.md](references/build-patterns.md) — Complete flow definition templates (Recurrence+SP+Teams, HTTP trigger)

## Related Skills

- `flowstudio-power-automate-mcp` — Core connection setup and tool reference
- `flowstudio-power-automate-debug` — Debug failing flows after deployment
