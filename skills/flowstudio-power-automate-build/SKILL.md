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

**Prerequisite**: A FlowStudio MCP server must be reachable with a valid API key or sign-in.
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

> If this file disagrees with `tool_search` or a real response, the server wins.

---

## Python Helper

```python
import json, time, urllib.request

MCP_URL   = "https://mcp.flowstudio.app/mcp"
MCP_TOKEN = "<YOUR_API_KEY>"

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
    res = raw["result"]
    if res.get("isError"):   # refusals and failed saves: may not be JSON
        raise RuntimeError(res["content"][0]["text"][:1000])
    return json.loads(res["content"][0]["text"])

def save(**kwargs):   # update_live_flow that waits out a save past 25 s
    res = mcp("update_live_flow", **kwargs)
    while res.get("status") == "working":   # never call update_live_flow again
        time.sleep(res["pollIntervalMs"] / 1000)
        res = mcp("get_task", taskId=res["taskId"])
    if "taskId" not in res:
        return res
    if res["status"] == "failed" or res.get("isError"):
        raise RuntimeError(res.get("statusMessage") or res.get("result"))
    return res["result"]

ENV = "<environment-id>"  # e.g. Default-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 0. Load the Current Build Tools

For a brand-new flow, load the server's `create-flow` bundle. For editing an
existing flow, load `build-flow`; to put back an earlier version, `flow-versions`.

```python
schemas = mcp("tool_search", query="skill:create-flow")
# Includes list_live_environments, list_live_connections,
# describe_live_connector, resolve_live_parameters, update_live_flow.
```

If you need a tool outside the bundle, load it explicitly:

```python
mcp("tool_search", query="select:get_task,create_live_connection")
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
          if (c.get("statuses") or [{}])[0].get("status") == "Connected"]
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

### 2c — If connections are missing, create them with the user

```python
connectors_needed = ["shared_sharepointonline", "shared_office365"]  # adjust per flow
missing = [c for c in connectors_needed if c not in conn_map]
for connector in missing:
    # Shows the person a sign-in card; they sign in, never you. Give them
    # signInLink too (expires in about 10 minutes), then re-run Step 2a.
    new = mcp("create_live_connection", environmentName=ENV, connectorName=connector)
    print(connector, new.get("signInLink"))
```

Connectors that need a key or account details are refused: the person creates
those in Power Automate.

### 2d — Build the connectionReferences block

```python
connection_references = {}
for connector in connectors_needed:
    c = next(c for c in active if c["connectorName"] == connector)
    connection_references[connector] = {   # map key = inputs.host.connectionName
        "connectionName": c["id"],          # the connection id
        "id": f"/providers/Microsoft.PowerApps/apis/{connector}",
    }
```

In Step 3 action JSON, `inputs.host.connectionName` must be the map key such as
`shared_teams`, not the connection id. Leave out `"source": "Invoker"`: it saves
the connection as "provided by run-only user". `list_live_connections` with
`search` returns templates keyed by the connection id: merge
`connectionReferenceTemplate`; `inputs.host` is `hostTemplate` + `operationId`.
For a flow in a solution, copy `properties.connectionReferences` from
`get_live_flow` and keep `connectionReferenceLogicalName` and `source` exactly.

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
hand-written shapes. It returns authored hints, canonical examples, variant
keys, inputs/outputs, and which inputs need live values. `search="send email"`
without `connectorName` searches across connectors.

```python
op = mcp("describe_live_connector",
    environmentName=ENV,
    connectorName="shared_office365",
    operationId="SendEmailV2")
hints = op.get("hints") or {}
print(hints.get("hint"), hints.get("exampleDefinition"))
```

If an operation has authored variants (Teams `PostMessageToConversation`:
`channel`, `groupchat`, `flowbot_chat`), pass `variant` for that example.

For live values — SharePoint sites, lists and columns, Teams teams and channels,
folders, people — call `resolve_live_parameters`. It resolves every input in one
call, or one with `parameterName`; `match` turns a display name into the value
to write:

```python
vals = mcp("resolve_live_parameters",
    environmentName=ENV,
    connectorName="shared_sharepointonline",
    operationId="GetItems",
    parameters={"dataset": "<site-url>"},
    match={"table": "Invoices"})
print(vals["parameters"])   # values chosen so far, ready for inputs.parameters
for f in vals["fields"]:   # status: ok, given, needs, nomatch, error
    print(f["name"], f.get("status"), f.get("matched") or f.get("values", [])[:5])
```

`include=["outputs"]` returns the fields the action produces. For an action
already in a flow, pass `flowName` + `actionName` instead of the connector.

---

## 4. Deploy (Create or Update)

`update_live_flow` handles both creation and updates in a single tool.

### Create a new flow (no existing flow)

Omit `flowName` — Power Automate creates the flow and assigns its id. Preview
first with `dryRun=True`: it writes nothing and returns the flow it would create.

```python
definition["description"] = "Weekly SharePoint → Teams notification flow, built by agent"

result = save(   # helper above: waits out a long save, raises on refusal
    environmentName=ENV,
    # flowName omitted → creates a new flow
    definition=definition,
    connectionReferences=connection_references,
    displayName="Overdue Invoice Notifications"
)
FLOW_ID = result["flowName"]   # created is just True; the new id is flowName
print(f"✅ Flow created: {FLOW_ID}")
```

### Update an existing flow

To change one action, pass `operations` instead of a whole definition, and
`dryRun=True` first to preview (writes nothing; `changes` shows before/after):

```python
ops = [{"op": "set", "path": ["actions", "Send_Email", "inputs", "parameters",
        "emailMessage/Subject"], "value": "Weekly report"}]
result = save(environmentName=ENV, flowName=FLOW_ID, operations=ops)
```

`path` is a list of literal keys (array items by index); ops are `set`, `add`,
`remove`, `merge`. For a whole definition, pass `expectedLastModifiedTime`
(`get_live_flow`'s `properties.lastModifiedTime`) so the save is refused if the
flow changed in between.

> ⚠️ Read `result.get("hints")`: it names what the server fixed or warns about,
> such as a solution flow saved with a direct connection.
>
> ⚠️ Flow description lives at `definition["description"]` (required on create;
> reused on update when omitted). The server appends `#flowstudio-mcp`.

### Common deployment errors

| Error message (contains) | Cause | Fix |
|---|---|---|
| `missing from connectionReferences` | An action's `host.connectionName` references a key that doesn't exist in the `connectionReferences` map | Ensure `host.connectionName` uses the **key** from `connectionReferences` (e.g. `shared_teams`), not the raw GUID |
| `ConnectionAuthorizationFailed` / 403 | The connection GUID belongs to another user or is not authorized | Re-run Step 2a and use a connection owned by the current `x-api-key` user |
| `InvalidTemplate` / `InvalidDefinition` | Syntax error in the definition JSON | Check `runAfter` chains, expression syntax, and action type spelling |
| `ConnectionNotConfigured` | A connector action exists but the connection GUID is invalid or expired | Re-check `list_live_connections` for a fresh GUID |
| `XrmApiServerError` (unpublished draft) | A portal draft locks the solution flow | Ask the person: publish the draft, or approve `discardDraft=True` |

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

If the person will call an HTTP-triggered flow by its address, read it with
`includeTriggerUrl=True` (`triggerUrls`); it is a credential. To put back an
earlier version, follow `tool_search` `skill:flow-versions`.

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
runs = mcp("get_live_flow_runs", environmentName=ENV, flowName=FLOW_ID, top=1)["runs"]
if runs:
    # Works for Recurrence, SharePoint, connector triggers — not just HTTP
    result = mcp("resubmit_live_flow_run",
        environmentName=ENV, flowName=FLOW_ID, runName=runs[0]["name"])
    print(result)   # {"resubmitted": true, "triggerName": "..."}
```

### HTTP, Button, PowerApps and Skills flows — custom test payload

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
print(f"Status: {result['responseStatus']}, via: {result['invocation']}")
print(result.get("warning"))   # set when a required input was missing: the run still ran, with null
```

### Brand-new non-HTTP flows

A brand-new **Recurrence** flow needs no workaround: deploy it, then run it
immediately with `trigger_live_flow` and no `body` — same as the portal's
"Run flow" button. A body is refused; scheduled triggers take no inputs.

A brand-new **connector-triggered** flow (SharePoint, webhooks) has no prior
runs and cannot fire without a real source event. Deploy with a temporary
HTTP trigger, test the actions, then swap to the production trigger:

```python
production_trigger = definition["triggers"]
definition["triggers"] = {
    "manual": {"type": "Request", "kind": "Http", "inputs": {"schema": {}}}
}
result = save(environmentName=ENV,
    flowName=FLOW_ID,       # omit if creating new
    definition=definition, connectionReferences=connection_references,
    displayName="Overdue Invoice Notifications")
FLOW_ID = FLOW_ID or result["flowName"]

mcp("trigger_live_flow", environmentName=ENV, flowName=FLOW_ID,
    body={"sample": "payload"})
runs = mcp("get_live_flow_runs", environmentName=ENV, flowName=FLOW_ID, top=1)["runs"]
if runs[0]["status"] == "Failed":
    err = mcp("get_live_flow_run_error",
        environmentName=ENV, flowName=FLOW_ID, runName=runs[0]["name"])
    raise Exception(err["failedActions"])   # name order, not run order

definition["triggers"] = production_trigger
save(environmentName=ENV, flowName=FLOW_ID,
    definition=definition, connectionReferences=connection_references)
```

The trigger is only the entry point; testing through HTTP still exercises the
same actions. If actions use `triggerBody()` or `triggerOutputs()`, pass a
representative `body` shaped like the production trigger payload.

---

## Gotchas

| Mistake | Consequence | Prevention |
|---|---|---|
| Missing `connectionReferences` on create | "no connectionReferences were provided" | Always call `list_live_connections` first |
| `"operationOptions"` missing on Foreach | Parallel execution, race conditions on writes | Always add `"Sequential"` |
| `union(old_data, new_data)` | Old values override new (first-wins) | Use `union(new_data, old_data)` |
| `split()` on potentially-null string | `InvalidTemplate` crash | Wrap with `coalesce(field, '')` |
| Calling `update_live_flow` again after a `taskId` reply | Duplicate flows | Poll `get_task` until `completed` or `failed` (the `save` helper does) |
| Flow deployed but state is "Stopped" | Flow won't run on schedule | Call `set_live_flow_state` with `state: "Started"` — do **not** use `update_live_flow` for state changes |
| Teams "Chat with Flow bot" recipient as object | 400 `GraphUserDetailNotFound` | Use `"user@contoso.com;"` (string, trailing semicolon) |
| Copilot/Skills flow not in a solution | Copilot Studio may not discover it as an agent tool | After deploy, call `add_to_solution` with `flowName` and `solution` |
| Button/PowerApps/Skills trigger used for MCP testing | Runs even when a required input is missing (null) | Pass inputs in `trigger_live_flow` `body`; on `warning`, cancel and retry with the full body |
| Connector action missing `metadata.operationMetadataId` | Designer/run-only UI can behave inconsistently | Preserve existing IDs; add stable GUIDs for new connector actions |
| Placeholder Excel `scriptId` | Dynamic validation fails at save time | Resolve the real Office Script ID before deploying |
| SharePoint `PatchItem` omits required fields | Save can fail even if the field is not changing | Echo unchanged required fields such as `item/Title` |
| Copilot Studio connector calls a draft agent | Connector invocation can fail or hit stale behavior | Publish the agent before testing/resubmitting the flow |

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
