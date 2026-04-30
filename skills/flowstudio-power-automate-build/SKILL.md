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
metadata:
  openclaw:
    requires:
      env:
        - FLOWSTUDIO_MCP_TOKEN
    primaryEnv: FLOWSTUDIO_MCP_TOKEN
    homepage: https://mcp.flowstudio.app
---

# Build & Deploy Power Automate Flows with FlowStudio MCP

Step-by-step guide for constructing and deploying Power Automate cloud flows
programmatically through the FlowStudio MCP server.

**Prerequisite**: A FlowStudio MCP server must be reachable with a valid JWT.
See the `power-automate-mcp` skill for connection setup.  
Subscribe at https://mcp.flowstudio.app

---

## Source of Truth

> **Always call `tools/list` first** to confirm available tool names and their
> parameter schemas. Tool names and parameters may change between server versions.
> This skill covers response shapes, behavioral notes, and build patterns —
> things `tools/list` cannot tell you. If this document disagrees with `tools/list`
> or a real API response, the API wins.

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

## Step 1 — Safety Check: Does the Flow Already Exist?

Always look before you build to avoid duplicates:

```python
results = mcp("list_live_flows", environmentName=ENV)

# list_live_flows returns { "flows": [...] }
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

---

## Step 2 — Obtain Connection References

Every connector action needs a `connectionName` that points to a key in the
flow's `connectionReferences` map. That key links to an authenticated connection
in the environment.

> **MANDATORY**: You MUST call `list_live_connections` first — do NOT ask the
> user for connection names or GUIDs. The API returns the exact values you need.
> Only prompt the user if the API confirms that required connections are missing.

### 2a — Always call `list_live_connections` first

```python
conns = mcp("list_live_connections", environmentName=ENV)

# Filter to connected (authenticated) connections only
active = [c for c in conns["connections"]
          if c["statuses"][0]["status"] == "Connected"]

# Build a lookup: connectorName → connectionName (id)
conn_map = {}
for c in active:
    conn_map[c["connectorName"]] = c["id"]

print(f"Found {len(active)} active connections")
print("Available connectors:", list(conn_map.keys()))
```

### 2b — Determine which connectors the flow needs

Based on the flow you are building, identify which connectors are required.
Common connector API names:

| Connector | API name |
|---|---|
| SharePoint | `shared_sharepointonline` |
| Outlook / Office 365 | `shared_office365` |
| Teams | `shared_teams` |
| Approvals | `shared_approvals` |
| OneDrive for Business | `shared_onedriveforbusiness` |
| Excel Online (Business) | `shared_excelonlinebusiness` |
| Dataverse | `shared_commondataserviceforapps` |
| Microsoft Forms | `shared_microsoftforms` |

> **Flows that need NO connections** (e.g. Recurrence + Compose + HTTP only)
> can skip the rest of Step 2 — omit `connectionReferences` from the deploy call.

### 2c — If connections are missing, guide the user

```python
connectors_needed = ["shared_sharepointonline", "shared_office365"]  # adjust per flow

missing = [c for c in connectors_needed if c not in conn_map]

if not missing:
    print("✅ All required connections are available — proceeding to build")
else:
    # ── STOP: connections must be created interactively ──
    # Connections require OAuth consent in a browser — no API can create them.
    print("⚠️  The following connectors have no active connection in this environment:")
    for c in missing:
        friendly = c.replace("shared_", "").replace("onlinebusiness", " Online (Business)")
        print(f"   • {friendly}  (API name: {c})")
    print()
    print("Please create the missing connections:")
    print("  1. Open https://make.powerautomate.com/connections")
    print("  2. Select the correct environment from the top-right picker")
    print("  3. Click '+ New connection' for each missing connector listed above")
    print("  4. Sign in and authorize when prompted")
    print("  5. Tell me when done — I will re-check and continue building")
    # DO NOT proceed to Step 3 until the user confirms.
    # After user confirms, re-run Step 2a to refresh conn_map.
```

### 2d — Build the connectionReferences block

Only execute this after 2c confirms no missing connectors:

```python
connection_references = {}
for connector in connectors_needed:
    connection_references[connector] = {
        "connectionName": conn_map[connector],   # the GUID from list_live_connections
        "source": "Invoker",
        "id": f"/providers/Microsoft.PowerApps/apis/{connector}"
    }
```

> **IMPORTANT — `host.connectionName` in actions**: When building actions in
> Step 3, set `host.connectionName` to the **key** from this map (e.g.
> `shared_teams`), NOT the connection GUID. The GUID only goes inside the
> `connectionReferences` entry. The engine matches the action's
> `host.connectionName` to the key to find the right connection.

> **Alternative** — if you already have a flow using the same connectors,
> you can extract `connectionReferences` from its definition:
> ```python
> ref_flow = mcp("get_live_flow", environmentName=ENV, flowName="<existing-flow-id>")
> connection_references = ref_flow["properties"]["connectionReferences"]
> ```

See the `power-automate-mcp` skill's **connection-references.md** reference
for the full connection reference structure.

---

## Step 3 — Build the Flow Definition

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

---

## Step 3a — Resolving Dynamic Connector Values

When an action input needs a value picked from a connector dropdown (e.g. a
SharePoint list ID, a Dataverse table name, a user's Azure AD UPN), use
`get_live_dynamic_options` to resolve it via MCP rather than hardcoding GUIDs.

```python
# Resolve a SharePoint list by site
opts = mcp("get_live_dynamic_options",
    environmentName=ENV,
    connectorName="shared_sharepointonline",
    operationId="GetTables",
    parameters={"dataset": "https://contoso.sharepoint.com/sites/HR"})
# opts["value"] → [{"Name": "<list-guid>", "DisplayName": "Employees"}, ...]
```

> **Outer-parameter auto-bridge** (server v1.1.6+): you can pass arbitrary outer
> parameters directly in `parameters` — the server now synthesizes the
> `parameterReference` mapping that PA's listEnum requires. Before 1.1.6 you had
> to declare `dynamicMetadata.parameters: {paramName: {parameterReference: "name"}}`
> manually or get `IncorrectDynamicInvokeParameter`. This makes it practical to
> invoke arbitrary connector operations through the dynamic-options pipeline
> (e.g. `shared_office365users.SearchUserV2` for AAD user lookup).

### AadGraph user-picker fallback

For Outlook actions like `GetEmailsV3` (parameters `mailboxAddress`, `to`, `cc`,
`from`), PA's listEnum uses `builtInOperation:AadGraph.GetUsers` — which is
broken and returns `DynamicListValuesUndefinedOrInvalid` for every call.

`describe_live_connector` (v1.1.6+) detects these parameters and returns a
structured `fallback` field on each affected parameter pointing at a working
alternative. **Use `shared_office365users.SearchUserV2`** to resolve the same
AAD user shape `{value: [{id, displayName, mail, userPrincipalName, ...}]}`:

```python
# Borrow a shared_office365users connection (any active one will do)
conn = next(c for c in conn_map if "office365users" in c)

users = mcp("get_live_dynamic_options",
    environmentName=ENV,
    connectorName="shared_office365users",
    connectionName=conn_map[conn],   # see Step 2a
    operationId="SearchUserV2",
    parameters={"searchTerm": "john", "top": 10})
# users["value"] → [{"Id": "...", "DisplayName": "John Smith", "Mail": "..."}, ...]
```

Then plug the resolved `Mail` value into the Outlook action's parameter — no
need to call `AadGraph.GetUsers` directly.

---

## Step 4 — Deploy (Create or Update)

`update_live_flow` handles both creation and updates in a single tool.

### Create a new flow (no existing flow)

Omit `flowName` — the server generates a new GUID and creates via PUT:

```python
result = mcp("update_live_flow",
    environmentName=ENV,
    # flowName omitted → creates a new flow
    definition=definition,
    connectionReferences=connection_references,
    displayName="Overdue Invoice Notifications",
    description="Weekly SharePoint → Teams notification flow, built by agent"
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
result = mcp("update_live_flow",
    environmentName=ENV,
    flowName=FLOW_ID,
    definition=definition,
    connectionReferences=connection_references,
    displayName="My Updated Flow",
    description="Updated by agent on " + __import__('datetime').datetime.utcnow().isoformat()
)

if result.get("error") is not None:
    print("Update failed:", result["error"])
else:
    print("Update succeeded:", result)
```

> ⚠️ `update_live_flow` always returns an `error` key.
> `null` (Python `None`) means success — do not treat the presence of the key as failure.
>
> ⚠️ `description` is required for both create and update.

### Common deployment errors

| Error message (contains) | Cause | Fix |
|---|---|---|
| `missing from connectionReferences` | An action's `host.connectionName` references a key that doesn't exist in the `connectionReferences` map | Ensure `host.connectionName` uses the **key** from `connectionReferences` (e.g. `shared_teams`), not the raw GUID |
| `ConnectionAuthorizationFailed` / 403 | The connection GUID belongs to another user or is not authorized | Re-run Step 2a and use a connection owned by the current `x-api-key` user |
| `InvalidTemplate` / `InvalidDefinition` | Syntax error in the definition JSON | Check `runAfter` chains, expression syntax, and action type spelling |
| `ConnectionNotConfigured` | A connector action exists but the connection GUID is invalid or expired | Re-check `list_live_connections` for a fresh GUID |

---

## Step 5 — Verify the Deployment

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

## Step 6 — Test the Flow

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
schema = mcp("get_live_flow_http_schema",
    environmentName=ENV, flowName=FLOW_ID)
print("Expected body:", schema.get("requestSchema"))

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

#### 7a — Save the real trigger, deploy with a temporary HTTP trigger

```python
# Save the production trigger you built in Step 3
production_trigger = definition["triggers"]

# Replace with a temporary HTTP trigger
definition["triggers"] = {
    "manual": {
        "type": "Request",
        "kind": "Http",
        "inputs": {
            "schema": {}
        }
    }
}

# Deploy (create or update) with the temp trigger
result = mcp("update_live_flow",
    environmentName=ENV,
    flowName=FLOW_ID,       # omit if creating new
    definition=definition,
    connectionReferences=connection_references,
    displayName="Overdue Invoice Notifications",
    description="Deployed with temp HTTP trigger for testing")

if result.get("error") is not None:
    print("Deploy failed:", result["error"])
else:
    if not FLOW_ID:
        FLOW_ID = result["created"]
    print(f"✅ Deployed with temp HTTP trigger: {FLOW_ID}")
```

#### 7b — Fire the flow and check the result

```python
# Trigger the flow
test = mcp("trigger_live_flow",
    environmentName=ENV, flowName=FLOW_ID)
print(f"Trigger response status: {test['status']}")

# Wait for the run to complete
import time; time.sleep(15)

# Check the run result
runs = mcp("get_live_flow_runs",
    environmentName=ENV, flowName=FLOW_ID, top=1)
run = runs[0]
print(f"Run {run['name']}: {run['status']}")

if run["status"] == "Failed":
    err = mcp("get_live_flow_run_error",
        environmentName=ENV, flowName=FLOW_ID, runName=run["name"])
    root = err["failedActions"][-1]
    print(f"Root cause: {root['actionName']} → {root.get('code')}")
    # Debug and fix the definition before proceeding
    # See power-automate-debug skill for full diagnosis workflow
```

#### 7c — Swap to the production trigger

Once the test run succeeds, replace the temporary HTTP trigger with the real one:

```python
# Restore the production trigger
definition["triggers"] = production_trigger

result = mcp("update_live_flow",
    environmentName=ENV,
    flowName=FLOW_ID,
    definition=definition,
    connectionReferences=connection_references,
    description="Swapped to production trigger after successful test")

if result.get("error") is not None:
    print("Trigger swap failed:", result["error"])
else:
    print("✅ Production trigger deployed — flow is live")
```

> **Why this works**: The trigger is just the entry point — the actions are
> identical regardless of how the flow starts. Testing via HTTP trigger
> exercises all the same Compose, SharePoint, Teams, etc. actions.
>
> **Connector triggers** (e.g. "When an item is created in SharePoint"):
> If actions reference `triggerBody()` or `triggerOutputs()`, pass a
> representative test payload in `trigger_live_flow`'s `body` parameter
> that matches the shape the connector trigger would produce.

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

- `power-automate-mcp` — Foundation skill: connection setup, MCP helper, tool discovery
- `power-automate-debug` — Debug failing flows after deployment
