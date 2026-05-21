---
name: flowstudio-power-automate-mcp
description: >-
<<<<<<< HEAD
  Foundation skill for Power Automate via FlowStudio MCP — auth setup, the
  reusable MCP helper (Python + Node.js), tool discovery via `list_skills` /
  `tool_search`, and oversized-response handling. Load this skill first when
  connecting an agent to Power Automate. For specialized workflows, load
  `flowstudio-power-automate-build`, `flowstudio-power-automate-debug`, `flowstudio-power-automate-monitoring`
  (Pro+), or `flowstudio-power-automate-governance` (Pro+) — each contains the workflow
  narrative, this skill provides the plumbing they all rely on. Requires a
  FlowStudio MCP subscription or compatible server — see https://mcp.flowstudio.app
---

# Power Automate via FlowStudio MCP — Foundation

This skill is the **plumbing layer**. It gives an AI agent a reliable way to
talk to a FlowStudio MCP server, discover what tools are available, and handle
the responses cleanly. The actual workflow narratives live in four specialized
skills that all build on this one.
=======
  Give your AI agent the same visibility you have in the Power Automate portal — plus
  a bit more. The Graph API only returns top-level run status. Flow Studio MCP exposes
  action-level inputs, outputs, loop iterations, and nested child flow failures.
  Use when asked to: list flows, read a flow definition, check run history, inspect
  action outputs, resubmit a run, cancel a running flow, view connections, get a
  trigger URL, validate a definition, monitor flow health, or any task that requires
  talking to the Power Automate API through an MCP tool. Also use for Power Platform
  environment discovery and connection management. Requires a FlowStudio MCP
  subscription or compatible server — see https://mcp.flowstudio.app
metadata:
  openclaw:
    requires:
      env:
        - FLOWSTUDIO_MCP_TOKEN
    primaryEnv: FLOWSTUDIO_MCP_TOKEN
    homepage: https://mcp.flowstudio.app
---

# Power Automate via FlowStudio MCP

This skill lets AI agents read, monitor, and operate Microsoft Power Automate
cloud flows programmatically through a **FlowStudio MCP server** — no browser,
no UI, no manual steps.
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

> **Real debugging examples**: [Expression error in child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/fix-expression-error.md) |
> [Data entry, not a flow bug](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/data-not-flow.md) |
> [Null value crashes child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/null-child-flow.md)

> **Requires:** A [FlowStudio](https://mcp.flowstudio.app) MCP subscription (or
> compatible Power Automate MCP server). You will need:
> - MCP endpoint: `https://mcp.flowstudio.app/mcp` (same for all subscribers)
> - API key / JWT token (`x-api-key` header — NOT Bearer)
> - Power Platform environment name (e.g. `Default-<tenant-guid>`)

---

<<<<<<< HEAD
## Which Skill to Use When

Skills are organized by **use-case intent**, not by which tools they call.
Multiple skills reuse the same underlying tools — pick by what the user is
trying to accomplish.

| The user wants to… | Load this skill |
|---|---|
| Make or change a flow (build new, modify existing, fix a bug, deploy) | **`flowstudio-power-automate-build`** |
| Diagnose why a flow failed (root cause analysis on a failing run) | **`flowstudio-power-automate-debug`** |
| See tenant-wide flow health, failure rates, asset inventory | **`flowstudio-power-automate-monitoring`** *(Pro+)* |
| Tag, audit, classify, score, or offboard flows | **`flowstudio-power-automate-governance`** *(Pro+)* |
| Just connect, set up auth, write the helper, parse responses | this skill (foundation) |

**Same tools, different lenses.** `flowstudio-power-automate-build` and `flowstudio-power-automate-debug`
both call `update_live_flow`, `get_live_flow`, and the run-error tools — they
differ in *direction* (forward vs backward) and *intent* (compose vs diagnose).
`flowstudio-power-automate-monitoring` and `flowstudio-power-automate-governance` both call the Store
tools — they differ in *audience* (ops vs compliance) and *outcome* (read
health vs write metadata). Don't try to memorize "which tools belong to which
skill"; pick the skill by what the user is doing.

---

=======
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
## Source of Truth

| Priority | Source | Covers |
|----------|--------|--------|
| 1 | **Real API response** | Always trust what the server actually returns |
<<<<<<< HEAD
| 2 | **`tool_search` / `list_skills`** | Authoritative tool schemas, parameter names, types, required flags |
| 3 | **SKILL docs & reference files** | Workflow narrative, response shapes, non-obvious behaviors |

If documentation disagrees with a real API response, the API wins. Tool schemas
in this skill (or any other) may lag the server — call `tool_search` to confirm
the current shape before invoking a tool you haven't used recently.

---

## How Agents Discover Tools

The FlowStudio MCP server (v1.1.5+) exposes two **non-billable** meta-tools that
let an agent load only the tools relevant to the current task. Use these in
preference to `tools/list` (which loads all 30+ schemas at once) or guessing
tool names.

| Meta-tool | When to call |
|---|---|
| `list_skills` | Cold start — see the available bundles (`build-flow`, `create-flow`, `debug-flow`, `monitor-flow`, `discover`, `governance`) and pick one |
| `tool_search` with `query: "skill:<name>"` | Load the full schema set for one bundle (e.g. `skill:debug-flow`) |
| `tool_search` with `query: "select:tool1,tool2"` | Load specific tools by name (e.g. when chaining across bundles) |
| `tool_search` with `query: "<keywords>"` | Free-text search when the user request is ambiguous (e.g. `"cancel run"`) |

The server's `tool_search` bundles are intentionally **narrower than this
skill family** — they're starter packs of the most-likely-needed tools per
intent. A workflow skill (e.g. `flowstudio-power-automate-debug`) may pull a bundle and
then call `tool_search` again for additional tools as the workflow progresses.

```python
# Cold start — pick a bundle by intent
skills = mcp("list_skills", {})
# [{"name": "debug-flow", "description": "Investigate why a flow is failing...",
#   "tools": ["get_live_flow_runs", "get_live_flow_run_error", ...]}, ...]

# Load schemas for the bundle
debug_tools = mcp("tool_search", {"query": "skill:debug-flow"})
```

Current common bundles:

| Bundle | Use when |
|---|---|
| `create-flow` | Creating a brand-new flow; includes environment/connection discovery, connector description, dynamic options, and `update_live_flow` |
| `build-flow` | Reading or modifying an existing flow definition |
| `debug-flow` | Investigating failed runs and action-level inputs/outputs |
| `monitor-flow` | Starting/stopping, triggering, cancelling, or resubmitting runs |
| `discover` | Enumerating environments, flows, and connections |
| `governance` | Pro+ cached-store tagging, maker audit, and metadata updates |
=======
| 2 | **`tools/list`** | Tool names, parameter names, types, required flags |
| 3 | **SKILL docs & reference files** | Response shapes, behavioral notes, workflow recipes |

> **Start every new session with `tools/list`.**
> It returns the authoritative, up-to-date schema for every tool — parameter names,
> types, and required flags. The SKILL docs cover what `tools/list` cannot tell you:
> response shapes, non-obvious behaviors, and end-to-end workflow patterns.
>
> If any documentation disagrees with `tools/list` or a real API response,
> the API wins.
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

---

## Recommended Language: Python or Node.js

<<<<<<< HEAD
All examples in this skill family use **Python with `urllib.request`**
(stdlib — no `pip install` needed). **Node.js** is an equally valid choice:
`fetch` is built-in from Node 18+, JSON handling is native, and async/await
maps cleanly onto the request-response pattern of MCP tool calls — making it
a natural fit for teams already working in a JavaScript/TypeScript stack.

| Language | Verdict | Notes |
|---|---|---|
| **Python** | Recommended | Clean JSON handling, no escaping issues, all skill examples use it |
| **Node.js (≥ 18)** | Recommended | Native `fetch` + `JSON.stringify`/`JSON.parse`; no extra packages |
| PowerShell | Avoid for flow operations | `ConvertTo-Json -Depth` silently truncates nested definitions; quoting and escaping break complex payloads. Acceptable for a quick connectivity smoke-test but not for building or updating flows. |
| cURL / Bash | Possible but fragile | Shell-escaping nested JSON is error-prone; no native JSON parser |
=======
All examples in this skill and the companion build / debug skills use **Python
with `urllib.request`** (stdlib — no `pip install` needed). **Node.js** is an
equally valid choice: `fetch` is built-in from Node 18+, JSON handling is
native, and the async/await model maps cleanly onto the request-response pattern
of MCP tool calls — making it a natural fit for teams already working in a
JavaScript/TypeScript stack.

| Language | Verdict | Notes |
|---|---|---|
| **Python** | ✅ Recommended | Clean JSON handling, no escaping issues, all skill examples use it |
| **Node.js (≥ 18)** | ✅ Recommended | Native `fetch` + `JSON.stringify`/`JSON.parse`; async/await fits MCP call patterns well; no extra packages needed |
| PowerShell | ⚠️ Avoid for flow operations | `ConvertTo-Json -Depth` silently truncates nested definitions; quoting and escaping break complex payloads. Acceptable for a quick `tools/list` discovery call but not for building or updating flows. |
| cURL / Bash | ⚠️ Possible but fragile | Shell-escaping nested JSON is error-prone; no native JSON parser |
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

> **TL;DR — use the Core MCP Helper (Python or Node.js) below.** Both handle
> JSON-RPC framing, auth, and response parsing in a single reusable function.

---

<<<<<<< HEAD
=======
## What You Can Do

FlowStudio MCP has two access tiers. **FlowStudio for Teams** subscribers get
both the fast Azure-table store (cached snapshot data + governance metadata) and
full live Power Automate API access. **MCP-only subscribers** get the live tools —
more than enough to build, debug, and operate flows.

### Live Tools — Available to All MCP Subscribers

| Tool | What it does |
|---|---|
| `list_live_flows` | List flows in an environment directly from the PA API (always current) |
| `list_live_environments` | List all Power Platform environments visible to the service account |
| `list_live_connections` | List all connections in an environment from the PA API |
| `get_live_flow` | Fetch the complete flow definition (triggers, actions, parameters) |
| `get_live_flow_http_schema` | Inspect the JSON body schema and response schemas of an HTTP-triggered flow |
| `get_live_flow_trigger_url` | Get the current signed callback URL for an HTTP-triggered flow |
| `trigger_live_flow` | POST to an HTTP-triggered flow's callback URL (AAD auth handled automatically) |
| `update_live_flow` | Create a new flow or patch an existing definition in one call |
| `add_live_flow_to_solution` | Migrate a non-solution flow into a solution |
| `get_live_flow_runs` | List recent run history with status, start/end times, and errors |
| `get_live_flow_run_error` | Get structured error details (per-action) for a failed run |
| `get_live_flow_run_action_outputs` | Inspect inputs/outputs of any action (or every foreach iteration) in a run |
| `resubmit_live_flow_run` | Re-run a failed or cancelled run using its original trigger payload |
| `cancel_live_flow_run` | Cancel a currently running flow execution |

### Store Tools — FlowStudio for Teams Subscribers Only

These tools read from (and write to) the FlowStudio Azure table — a monitored
snapshot of your tenant's flows enriched with governance metadata and run statistics.

| Tool | What it does |
|---|---|
| `list_store_flows` | Search flows from the cache with governance flags, run failure rates, and owner metadata |
| `get_store_flow` | Get full cached details for a single flow including run stats and governance fields |
| `get_store_flow_trigger_url` | Get the trigger URL from the cache (instant, no PA API call) |
| `get_store_flow_runs` | Cached run history for the last N days with duration and remediation hints |
| `get_store_flow_errors` | Cached failed-only runs with failed action names and remediation hints |
| `get_store_flow_summary` | Aggregated stats: success rate, failure count, avg/max duration |
| `set_store_flow_state` | Start or stop a flow via the PA API and sync the result back to the store |
| `update_store_flow` | Update governance metadata (description, tags, monitor flag, notification rules, business impact) |
| `list_store_environments` | List all environments from the cache |
| `list_store_makers` | List all makers (citizen developers) from the cache |
| `get_store_maker` | Get a maker's flow/app counts and account status |
| `list_store_power_apps` | List all Power Apps canvas apps from the cache |
| `list_store_connections` | List all Power Platform connections from the cache |

---

## Which Tool Tier to Call First

| Task | Tool | Notes |
|---|---|---|
| List flows | `list_live_flows` | Always current — calls PA API directly |
| Read a definition | `get_live_flow` | Always fetched live — not cached |
| Debug a failure | `get_live_flow_runs` → `get_live_flow_run_error` | Use live run data |

> ⚠️ **`list_live_flows` returns a wrapper object** with a `flows` array — access via `result["flows"]`.

> Store tools (`list_store_flows`, `get_store_flow`, etc.) are available to **FlowStudio for Teams** subscribers and provide cached governance metadata. Use live tools when in doubt — they work for all subscription tiers.

---

## Step 0 — Discover Available Tools

Always start by calling `tools/list` to confirm the server is reachable and see
exactly which tool names are available (names may vary by server version):

```python
import json, urllib.request

TOKEN = "<YOUR_JWT_TOKEN>"
MCP   = "https://mcp.flowstudio.app/mcp"

def mcp_raw(method, params=None, cid=1):
    payload = {"jsonrpc": "2.0", "method": method, "id": cid}
    if params:
        payload["params"] = params
    req = urllib.request.Request(MCP, data=json.dumps(payload).encode(),
        headers={"x-api-key": TOKEN, "Content-Type": "application/json",
                 "User-Agent": "FlowStudio-MCP/1.0"})
    try:
        resp = urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"MCP HTTP {e.code} — check token and endpoint") from e
    return json.loads(resp.read())

raw = mcp_raw("tools/list")
if "error" in raw:
    print("ERROR:", raw["error"]); raise SystemExit(1)
for t in raw["result"]["tools"]:
    print(t["name"], "—", t["description"][:60])
```

---

>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
## Core MCP Helper (Python)

Use this helper throughout all subsequent operations:

```python
import json, urllib.request

TOKEN = "<YOUR_JWT_TOKEN>"
MCP   = "https://mcp.flowstudio.app/mcp"

def mcp(tool, args, cid=1):
    payload = {"jsonrpc": "2.0", "method": "tools/call", "id": cid,
               "params": {"name": tool, "arguments": args}}
    req = urllib.request.Request(MCP, data=json.dumps(payload).encode(),
        headers={"x-api-key": TOKEN, "Content-Type": "application/json",
                 "User-Agent": "FlowStudio-MCP/1.0"})
    try:
        resp = urllib.request.urlopen(req, timeout=120)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"MCP HTTP {e.code}: {body[:200]}") from e
    raw = json.loads(resp.read())
    if "error" in raw:
        raise RuntimeError(f"MCP error: {json.dumps(raw['error'])}")
    text = raw["result"]["content"][0]["text"]
    return json.loads(text)
```

> **Common auth errors:**
> - HTTP 401/403 → token is missing, expired, or malformed. Get a fresh JWT from [mcp.flowstudio.app](https://mcp.flowstudio.app).
> - HTTP 400 → malformed JSON-RPC payload. Check `Content-Type: application/json` and body structure.
<<<<<<< HEAD
> - `MCP error: {"code": -32602, ...}` → wrong or missing tool arguments. Call `tool_search` with `select:<toolname>` to confirm the schema.
=======
> - `MCP error: {"code": -32602, ...}` → wrong or missing tool arguments.
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c

---

## Core MCP Helper (Node.js)

Equivalent helper for Node.js 18+ (built-in `fetch` — no packages required):

```js
const TOKEN = "<YOUR_JWT_TOKEN>";
const MCP   = "https://mcp.flowstudio.app/mcp";

async function mcp(tool, args, cid = 1) {
  const payload = {
    jsonrpc: "2.0",
    method: "tools/call",
    id: cid,
    params: { name: tool, arguments: args },
  };
  const res = await fetch(MCP, {
    method: "POST",
    headers: {
      "x-api-key": TOKEN,
      "Content-Type": "application/json",
      "User-Agent": "FlowStudio-MCP/1.0",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MCP HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const raw = await res.json();
  if (raw.error) throw new Error(`MCP error: ${JSON.stringify(raw.error)}`);
  return JSON.parse(raw.result.content[0].text);
}
```

> Requires Node.js 18+. For older Node, replace `fetch` with `https.request`
> from the stdlib or install `node-fetch`.

---

<<<<<<< HEAD
## Verify the Connection

A 3-line smoke test that confirms the token, endpoint, and helper all work:

```python
skills = mcp("list_skills", {})
print(f"Connected — {len(skills)} skill bundles available:",
      [s["name"] for s in skills])
```

Expected output:

```text
Connected — 6 skill bundles available: ['build-flow', 'create-flow', 'debug-flow', 'monitor-flow', 'discover', 'governance']
```

If this fails, see the **Common auth errors** note above. If it succeeds, hand
off to the workflow skill matching the user's intent.

---

## Handling Oversized Responses

Some MCP tool responses are large enough to overflow the agent's context window:

| Tool | Typical size | Cause |
|---|---|---|
| `describe_live_connector` | 100-600 KB | Full Swagger spec for a connector |
| `get_live_dynamic_properties` | 50-500 KB | Dynamic connector field schemas such as SharePoint list columns |
| `get_live_flow_run_action_outputs` (no `actionName`) | 50 KB – several MB | Top-level action outputs; with an action in a foreach, every repetition can be returned |
| `get_live_flow` (large flows) | 50-500 KB | Deeply nested branches |
| `list_live_flows` (large tenants) | 50-200 KB | Hundreds of flow records |

### When the harness spills to a file

Agent harnesses (Claude Code, VS Code Copilot, etc.) save oversized responses
to a temp file (e.g. `tool-results/mcp-flowstudio-describe_live_connector-NNNN.txt`)
and return the path instead of the inline JSON. The file is **double-wrapped** —
the outer MCP envelope plus the inner JSON-escaped payload:

```text
[{"type":"text","text":"<JSON-escaped payload>"}]
```

Two parses to reach a usable object:

```python
import json
with open(path) as f:
    raw = json.loads(f.read())
payload = json.loads(raw[0]["text"])
```

```powershell
$payload = ((Get-Content $path -Raw | ConvertFrom-Json)[0].text) | ConvertFrom-Json
```

### Rules of thumb

1. **Extract, don't echo.** Pull the specific field(s) you need (one `operationId`, one action's outputs) and discard the rest before reasoning about it.
2. **Always pass `actionName` to `get_live_flow_run_action_outputs`.** Omitting it fetches all top-level actions. For actions inside a foreach, passing `actionName` without `iterationIndex` can return every repetition of that action.
3. **Reuse the spill file within a session.** Refetching the same connector swagger costs 30+ seconds and produces another spill — cache the path.
4. **Don't grep the spill file for JSON keys directly.** Strings are JSON-escaped inside the file (`\"OperationId\":`), so a plain grep for `"OperationId":` will not match. Parse first, then filter.
5. **Summarize tool output to the user.** Echo `name + state + trigger` for flow lists and `actionName + status + code` for run errors — not raw JSON, unless asked.

```python
# Good — drill into one operation in a connector swagger
conn = mcp("describe_live_connector", {"environmentName": ENV, "connectorName": "shared_sharepointonline"})
op = conn["properties"]["swagger"]["paths"]["/datasets/{dataset}/tables/{table}/items"]["get"]
print(op["operationId"], "—", op.get("summary"))

# Bad — keeping the whole 500 KB swagger in context
print(json.dumps(conn, indent=2))   # don't do this
=======
## List Flows

```python
ENV = "Default-<tenant-guid>"

result = mcp("list_live_flows", {"environmentName": ENV})
# Returns wrapper object:
# {"mode": "owner", "flows": [{"id": "0757041a-...", "displayName": "My Flow",
#   "state": "Started", "triggerType": "Request", ...}], "totalCount": 42, "error": null}
for f in result["flows"]:
    FLOW_ID = f["id"]   # plain UUID — use directly as flowName
    print(FLOW_ID, "|", f["displayName"], "|", f["state"])
```

---

## Read a Flow Definition

```python
FLOW = "<flow-uuid>"

flow = mcp("get_live_flow", {"environmentName": ENV, "flowName": FLOW})

# Display name and state
print(flow["properties"]["displayName"])
print(flow["properties"]["state"])

# List all action names
actions = flow["properties"]["definition"]["actions"]
print("Actions:", list(actions.keys()))

# Inspect one action's expression
print(actions["Compose_Filter"]["inputs"])
```

---

## Check Run History

```python
# Most recent runs (newest first)
runs = mcp("get_live_flow_runs", {"environmentName": ENV, "flowName": FLOW, "top": 5})
# Returns direct array:
# [{"name": "08584296068667933411438594643CU15",
#   "status": "Failed",
#   "startTime": "2026-02-25T06:13:38.6910688Z",
#   "endTime": "2026-02-25T06:15:24.1995008Z",
#   "triggerName": "manual",
#   "error": {"code": "ActionFailed", "message": "An action failed..."}},
#  {"name": "08584296028664130474944675379CU26",
#   "status": "Succeeded", "error": null, ...}]

for r in runs:
    print(r["name"], r["status"])

# Get the name of the first failed run
run_id = next((r["name"] for r in runs if r["status"] == "Failed"), None)
```

---

## Inspect an Action's Output

```python
run_id = runs[0]["name"]

out = mcp("get_live_flow_run_action_outputs", {
    "environmentName": ENV,
    "flowName": FLOW,
    "runName": run_id,
    "actionName": "Get_Customer_Record"   # exact action name from the definition
})
print(json.dumps(out, indent=2))
```

---

## Get a Run's Error

```python
err = mcp("get_live_flow_run_error", {
    "environmentName": ENV,
    "flowName": FLOW,
    "runName": run_id
})
# Returns:
# {"runName": "08584296068...",
#  "failedActions": [
#    {"actionName": "HTTP_find_AD_User_by_Name", "status": "Failed",
#     "code": "NotSpecified", "startTime": "...", "endTime": "..."},
#    {"actionName": "Scope_prepare_workers", "status": "Failed",
#     "error": {"code": "ActionFailed", "message": "An action failed..."}}
#  ],
#  "allActions": [
#    {"actionName": "Apply_to_each", "status": "Skipped"},
#    {"actionName": "Compose_WeekEnd", "status": "Succeeded"},
#    ...
#  ]}

# The ROOT cause is usually the deepest entry in failedActions:
root = err["failedActions"][-1]
print(f"Root failure: {root['actionName']} → {root['code']}")
```

---

## Resubmit a Run

```python
result = mcp("resubmit_live_flow_run", {
    "environmentName": ENV,
    "flowName": FLOW,
    "runName": run_id
})
print(result)   # {"resubmitted": true, "triggerName": "..."}
```

---

## Cancel a Running Run

```python
mcp("cancel_live_flow_run", {
    "environmentName": ENV,
    "flowName": FLOW,
    "runName": run_id
})
```

> ⚠️ **Do NOT cancel a run that shows `Running` because it is waiting for an
> adaptive card response.** That status is normal — the flow is paused waiting
> for a human to respond in Teams. Cancelling it will discard the pending card.

---

## Full Round-Trip Example — Debug and Fix a Failing Flow

```python
# ── 1. Find the flow ─────────────────────────────────────────────────────
result = mcp("list_live_flows", {"environmentName": ENV})
target = next(f for f in result["flows"] if "My Flow Name" in f["displayName"])
FLOW_ID = target["id"]

# ── 2. Get the most recent failed run ────────────────────────────────────
runs = mcp("get_live_flow_runs", {"environmentName": ENV, "flowName": FLOW_ID, "top": 5})
# [{"name": "08584296068...", "status": "Failed", ...}, ...]
RUN_ID = next(r["name"] for r in runs if r["status"] == "Failed")

# ── 3. Get per-action failure breakdown ──────────────────────────────────
err = mcp("get_live_flow_run_error", {"environmentName": ENV, "flowName": FLOW_ID, "runName": RUN_ID})
# {"failedActions": [{"actionName": "HTTP_find_AD_User_by_Name", "code": "NotSpecified",...}], ...}
root_action = err["failedActions"][-1]["actionName"]
print(f"Root failure: {root_action}")

# ── 4. Read the definition and inspect the failing action's expression ───
defn = mcp("get_live_flow", {"environmentName": ENV, "flowName": FLOW_ID})
acts = defn["properties"]["definition"]["actions"]
print("Failing action inputs:", acts[root_action]["inputs"])

# ── 5. Inspect the prior action's output to find the null ────────────────
out = mcp("get_live_flow_run_action_outputs", {
    "environmentName": ENV, "flowName": FLOW_ID,
    "runName": RUN_ID, "actionName": "Compose_Names"
})
nulls = [x for x in out.get("body", []) if x.get("Name") is None]
print(f"{len(nulls)} records with null Name")

# ── 6. Apply the fix ─────────────────────────────────────────────────────
acts[root_action]["inputs"]["parameters"]["searchName"] = \
    "@coalesce(item()?['Name'], '')"

conn_refs = defn["properties"]["connectionReferences"]
result = mcp("update_live_flow", {
    "environmentName": ENV, "flowName": FLOW_ID,
    "definition": defn["properties"]["definition"],
    "connectionReferences": conn_refs
})
assert result.get("error") is None, f"Deploy failed: {result['error']}"
# ⚠️ error key is always present — only fail if it is NOT None

# ── 7. Resubmit and verify ───────────────────────────────────────────────
mcp("resubmit_live_flow_run", {"environmentName": ENV, "flowName": FLOW_ID, "runName": RUN_ID})

import time; time.sleep(30)
new_runs = mcp("get_live_flow_runs", {"environmentName": ENV, "flowName": FLOW_ID, "top": 1})
print(new_runs[0]["status"])   # Succeeded = done
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
```

---

## Auth & Connection Notes

| Field | Value |
|---|---|
| Auth header | `x-api-key: <JWT>` — **not** `Authorization: Bearer` |
| Token format | Plain JWT — do not strip, alter, or prefix it |
| Timeout | Use ≥ 120 s for `get_live_flow_run_action_outputs` (large outputs) |
| Environment name | `Default-<tenant-guid>` (find it via `list_live_environments` or `list_live_flows` response) |

---

## Reference Files

- [MCP-BOOTSTRAP.md](references/MCP-BOOTSTRAP.md) — endpoint, auth, request/response format (read this first)
<<<<<<< HEAD
- [tool-reference.md](references/tool-reference.md) — response shapes and behavioral notes (parameters are in `tool_search`)
- [action-types.md](references/action-types.md) — Power Automate action type patterns
- [connection-references.md](references/connection-references.md) — connector reference guide
=======
- [tool-reference.md](references/tool-reference.md) — response shapes and behavioral notes (parameters are in `tools/list`)
- [action-types.md](references/action-types.md) — Power Automate action type patterns
- [connection-references.md](references/connection-references.md) — connector reference guide

---

## More Capabilities

For **diagnosing failing flows** end-to-end → load the `flowstudio-power-automate-debug` skill.

For **building and deploying new flows** → load the `flowstudio-power-automate-build` skill.
>>>>>>> 8fbf6c4a798df51d1d1d8fd37a1aa7e94203109c
