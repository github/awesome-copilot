---
name: flowstudio-power-automate-debug
description: >-
  Debug failing Power Automate cloud flows using the FlowStudio MCP server.
<<<<<<< HEAD
  The Graph API only shows top-level status codes. This skill gives your agent
  action-level inputs and outputs to find the actual root cause.
=======
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
  Load this skill when asked to: debug a flow, investigate a failed run, why is
  this flow failing, inspect action outputs, find the root cause of a flow error,
  fix a broken Power Automate flow, diagnose a timeout, trace a DynamicOperationRequestFailure,
  check connector auth errors, read error details from a run, or troubleshoot
  expression failures. Requires a FlowStudio MCP subscription — see https://mcp.flowstudio.app
<<<<<<< HEAD
metadata:
  openclaw:
    requires:
      env:
        - FLOWSTUDIO_MCP_TOKEN
    primaryEnv: FLOWSTUDIO_MCP_TOKEN
    homepage: https://mcp.flowstudio.app
=======
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
---

# Power Automate Debugging with FlowStudio MCP

A step-by-step diagnostic process for investigating failing Power Automate
cloud flows through the FlowStudio MCP server.

<<<<<<< HEAD
> **Real debugging examples**: [Expression error in child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/fix-expression-error.md) |
> [Data entry, not a flow bug](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/data-not-flow.md) |
> [Null value crashes child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/null-child-flow.md)

=======
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
**Prerequisite**: A FlowStudio MCP server must be reachable with a valid JWT.
See the `flowstudio-power-automate-mcp` skill for connection setup.  
Subscribe at https://mcp.flowstudio.app

---

## Source of Truth

> **Always call `tools/list` first** to confirm available tool names and their
> parameter schemas. Tool names and parameters may change between server versions.
> This skill covers response shapes, behavioral notes, and diagnostic patterns —
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

ENV = "<environment-id>"   # e.g. Default-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

<<<<<<< HEAD
=======
## FlowStudio for Teams: Fast-Path Diagnosis (Skip Steps 2–4)

If you have a FlowStudio for Teams subscription, `get_store_flow_errors`
returns per-run failure data including action names and remediation hints
in a single call — no need to walk through live API steps.

```python
# Quick failure summary
summary = mcp("get_store_flow_summary", environmentName=ENV, flowName=FLOW_ID)
# {"totalRuns": 100, "failRuns": 10, "failRate": 0.1,
#  "averageDurationSeconds": 29.4, "maxDurationSeconds": 158.9,
#  "firstFailRunRemediation": "<hint or null>"}
print(f"Fail rate: {summary['failRate']:.0%} over {summary['totalRuns']} runs")

# Per-run error details (requires active monitoring to be configured)
errors = mcp("get_store_flow_errors", environmentName=ENV, flowName=FLOW_ID)
if errors:
    for r in errors[:3]:
        print(r["startTime"], "|", r.get("failedActions"), "|", r.get("remediationHint"))
    # If errors confirms the failing action → jump to Step 6 (apply fix)
else:
    # Store doesn't have run-level detail for this flow — use live tools (Steps 2–5)
    pass
```

For the full governance record (description, complexity, tier, connector list):
```python
record = mcp("get_store_flow", environmentName=ENV, flowName=FLOW_ID)
# {"displayName": "My Flow", "state": "Started",
#  "runPeriodTotal": 100, "runPeriodFailRate": 0.1, "runPeriodFails": 10,
#  "runPeriodDurationAverage": 29410.8,   ← milliseconds
#  "runError": "{\"code\": \"EACCES\", ...}",  ← JSON string, parse it
#  "description": "...", "tier": "Premium", "complexity": "{...}"}
if record.get("runError"):
    last_err = json.loads(record["runError"])
    print("Last run error:", last_err)
```

---

>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
## Step 1 — Locate the Flow

```python
result = mcp("list_live_flows", environmentName=ENV)
# Returns a wrapper object: {mode, flows, totalCount, error}
target = next(f for f in result["flows"] if "My Flow Name" in f["displayName"])
FLOW_ID = target["id"]   # plain UUID — use directly as flowName
print(FLOW_ID)
```

---

## Step 2 — Find the Failing Run

```python
runs = mcp("get_live_flow_runs", environmentName=ENV, flowName=FLOW_ID, top=5)
# Returns direct array (newest first):
# [{"name": "08584296068667933411438594643CU15",
#   "status": "Failed",
#   "startTime": "2026-02-25T06:13:38.6910688Z",
#   "endTime": "2026-02-25T06:15:24.1995008Z",
#   "triggerName": "manual",
#   "error": {"code": "ActionFailed", "message": "An action failed..."}},
#  {"name": "...", "status": "Succeeded", "error": null, ...}]

for r in runs:
    print(r["name"], r["status"], r["startTime"])

RUN_ID = next(r["name"] for r in runs if r["status"] == "Failed")
```

---

## Step 3 — Get the Top-Level Error

<<<<<<< HEAD
> **CRITICAL**: `get_live_flow_run_error` tells you **which** action failed.
> `get_live_flow_run_action_outputs` tells you **why**. You must call BOTH.
> Never stop at the error alone — error codes like `ActionFailed`,
> `NotSpecified`, and `InternalServerError` are generic wrappers. The actual
> root cause (wrong field, null value, HTTP 500 body, stack trace) is only
> visible in the action's inputs and outputs.

=======
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
```python
err = mcp("get_live_flow_run_error",
    environmentName=ENV, flowName=FLOW_ID, runName=RUN_ID)
# Returns:
# {
#   "runName": "08584296068667933411438594643CU15",
#   "failedActions": [
#     {"actionName": "Apply_to_each_prepare_workers", "status": "Failed",
#      "error": {"code": "ActionFailed", "message": "An action failed..."},
#      "startTime": "...", "endTime": "..."},
#     {"actionName": "HTTP_find_AD_User_by_Name", "status": "Failed",
#      "code": "NotSpecified", "startTime": "...", "endTime": "..."}
#   ],
#   "allActions": [
#     {"actionName": "Apply_to_each", "status": "Skipped"},
#     {"actionName": "Compose_WeekEnd", "status": "Succeeded"},
#     ...
#   ]
# }

# failedActions is ordered outer-to-inner. The ROOT cause is the LAST entry:
root = err["failedActions"][-1]
print(f"Root action: {root['actionName']} → code: {root.get('code')}")

# allActions shows every action's status — useful for spotting what was Skipped
# See common-errors.md to decode the error code.
```

---

<<<<<<< HEAD
## Step 4 — Inspect the Failing Action's Inputs and Outputs

> **This is the most important step.** `get_live_flow_run_error` only gives
> you a generic error code. The actual error detail — HTTP status codes,
> response bodies, stack traces, null values — lives in the action's runtime
> inputs and outputs. **Always inspect the failing action immediately after
> identifying it.**

```python
# Get the root failing action's full inputs and outputs
root_action = err["failedActions"][-1]["actionName"]
detail = mcp("get_live_flow_run_action_outputs",
    environmentName=ENV,
    flowName=FLOW_ID,
    runName=RUN_ID,
    actionName=root_action)

out = detail[0] if detail else {}
print(f"Action: {out.get('actionName')}")
print(f"Status: {out.get('status')}")

# For HTTP actions, the real error is in outputs.body
if isinstance(out.get("outputs"), dict):
    status_code = out["outputs"].get("statusCode")
    body = out["outputs"].get("body", {})
    print(f"HTTP {status_code}")
    print(json.dumps(body, indent=2)[:500])

    # Error bodies are often nested JSON strings — parse them
    if isinstance(body, dict) and "error" in body:
        err_detail = body["error"]
        if isinstance(err_detail, str):
            err_detail = json.loads(err_detail)
        print(f"Error: {err_detail.get('message', err_detail)}")

# For expression errors, the error is in the error field
if out.get("error"):
    print(f"Error: {out['error']}")

# Also check inputs — they show what expression/URL/body was used
if out.get("inputs"):
    print(f"Inputs: {json.dumps(out['inputs'], indent=2)[:500]}")
```

### What the action outputs reveal (that error codes don't)

| Error code from `get_live_flow_run_error` | What `get_live_flow_run_action_outputs` reveals |
|---|---|
| `ActionFailed` | Which nested action actually failed and its HTTP response |
| `NotSpecified` | The HTTP status code + response body with the real error |
| `InternalServerError` | The server's error message, stack trace, or API error JSON |
| `InvalidTemplate` | The exact expression that failed and the null/wrong-type value |
| `BadRequest` | The request body that was sent and why the server rejected it |

### Example: HTTP action returning 500

```
Error code: "InternalServerError" ← this tells you nothing

Action outputs reveal:
  HTTP 500
  body: {"error": "Cannot read properties of undefined (reading 'toLowerCase')
    at getClientParamsFromConnectionString (storage.js:20)"}
  ← THIS tells you the Azure Function crashed because a connection string is undefined
```

### Example: Expression error on null

```
Error code: "BadRequest" ← generic

Action outputs reveal:
  inputs: "body('HTTP_GetTokenFromStore')?['token']?['access_token']"
  outputs: ""   ← empty string, the path resolved to null
  ← THIS tells you the response shape changed — token is at body.access_token, not body.token.access_token
```

---

## Step 5 — Read the Flow Definition
=======
## Step 4 — Read the Flow Definition
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df

```python
defn = mcp("get_live_flow", environmentName=ENV, flowName=FLOW_ID)
actions = defn["properties"]["definition"]["actions"]
print(list(actions.keys()))
```

Find the failing action in the definition. Inspect its `inputs` expression
to understand what data it expects.

---

<<<<<<< HEAD
## Step 6 — Walk Back from the Failure

When the failing action's inputs reference upstream actions, inspect those
too. Walk backward through the chain until you find the source of the
bad data:

```python
# Inspect multiple actions leading up to the failure
for action_name in [root_action, "Compose_WeekEnd", "HTTP_Get_Data"]:
=======
## Step 5 — Inspect Action Outputs (Walk Back from Failure)

For each action **leading up to** the failure, inspect its runtime output:

```python
for action_name in ["Compose_WeekEnd", "HTTP_Get_Data", "Parse_JSON"]:
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
    result = mcp("get_live_flow_run_action_outputs",
        environmentName=ENV,
        flowName=FLOW_ID,
        runName=RUN_ID,
        actionName=action_name)
<<<<<<< HEAD
    out = result[0] if result else {}
    print(f"\n--- {action_name} ({out.get('status')}) ---")
    print(f"Inputs:  {json.dumps(out.get('inputs', ''), indent=2)[:300]}")
    print(f"Outputs: {json.dumps(out.get('outputs', ''), indent=2)[:300]}")
=======
    # Returns an array — single-element when actionName is provided
    out = result[0] if result else {}
    print(action_name, out.get("status"))
    print(json.dumps(out.get("outputs", {}), indent=2)[:500])
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
```

> ⚠️ Output payloads from array-processing actions can be very large.
> Always slice (e.g. `[:500]`) before printing.

<<<<<<< HEAD
> **Tip**: Omit `actionName` to get ALL actions in a single call.
> This returns every action's inputs/outputs — useful when you're not sure
> which upstream action produced the bad data. But use 120s+ timeout as
> the response can be very large.

---

## Step 7 — Pinpoint the Root Cause
=======
---

## Step 6 — Pinpoint the Root Cause
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df

### Expression Errors (e.g. `split` on null)
If the error mentions `InvalidTemplate` or a function name:
1. Find the action in the definition
2. Check what upstream action/expression it reads
<<<<<<< HEAD
3. **Inspect that upstream action's output** for null / missing fields
=======
3. Inspect that upstream action's output for null / missing fields
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df

```python
# Example: action uses split(item()?['Name'], ' ')
# → null Name in the source data
result = mcp("get_live_flow_run_action_outputs", ..., actionName="Compose_Names")
<<<<<<< HEAD
=======
# Returns a single-element array; index [0] to get the action object
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
if not result:
    print("No outputs returned for Compose_Names")
    names = []
else:
    names = result[0].get("outputs", {}).get("body") or []
nulls = [x for x in names if x.get("Name") is None]
print(f"{len(nulls)} records with null Name")
```

### Wrong Field Path
Expression `triggerBody()?['fieldName']` returns null → `fieldName` is wrong.
<<<<<<< HEAD
**Inspect the trigger output** to see the actual field names:
```python
result = mcp("get_live_flow_run_action_outputs", ..., actionName="<trigger-action-name>")
print(json.dumps(result[0].get("outputs"), indent=2)[:500])
```

### HTTP Actions Returning Errors
The error code says `InternalServerError` or `NotSpecified` — **always inspect
the action outputs** to get the actual HTTP status and response body:
```python
result = mcp("get_live_flow_run_action_outputs", ..., actionName="HTTP_Get_Data")
out = result[0]
print(f"HTTP {out['outputs']['statusCode']}")
print(json.dumps(out['outputs']['body'], indent=2)[:500])
=======
Check the trigger output shape with:
```python
mcp("get_live_flow_run_action_outputs", ..., actionName="<trigger-action-name>")
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
```

### Connection / Auth Failures
Look for `ConnectionAuthorizationFailed` — the connection owner must match the
service account running the flow. Cannot fix via API; fix in PA designer.

---

<<<<<<< HEAD
## Step 8 — Apply the Fix
=======
## Step 7 — Apply the Fix
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df

**For expression/data issues**:
```python
defn = mcp("get_live_flow", environmentName=ENV, flowName=FLOW_ID)
acts = defn["properties"]["definition"]["actions"]

# Example: fix split on potentially-null Name
acts["Compose_Names"]["inputs"] = \
    "@coalesce(item()?['Name'], 'Unknown')"

conn_refs = defn["properties"]["connectionReferences"]
result = mcp("update_live_flow",
    environmentName=ENV,
    flowName=FLOW_ID,
    definition=defn["properties"]["definition"],
    connectionReferences=conn_refs)

print(result.get("error"))  # None = success
```

> ⚠️ `update_live_flow` always returns an `error` key.
> A value of `null` (Python `None`) means success.

---

<<<<<<< HEAD
## Step 9 — Verify the Fix

> **Use `resubmit_live_flow_run` to test ANY flow — not just HTTP triggers.**
> `resubmit_live_flow_run` replays a previous run using its original trigger
> payload. This works for **every trigger type**: Recurrence, SharePoint
> "When an item is created", connector webhooks, Button triggers, and HTTP
> triggers. You do NOT need to ask the user to manually trigger the flow or
> wait for the next scheduled run.
>
> The only case where `resubmit` is not available is a **brand-new flow that
> has never run** — it has no prior run to replay.

```python
# Resubmit the failed run — works for ANY trigger type
resubmit = mcp("resubmit_live_flow_run",
    environmentName=ENV, flowName=FLOW_ID, runName=RUN_ID)
print(resubmit)   # {"resubmitted": true, "triggerName": "..."}
=======
## Step 8 — Verify the Fix

```python
# Resubmit the failed run
resubmit = mcp("resubmit_live_flow_run",
    environmentName=ENV, flowName=FLOW_ID, runName=RUN_ID)
print(resubmit)
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df

# Wait ~30 s then check
import time; time.sleep(30)
new_runs = mcp("get_live_flow_runs", environmentName=ENV, flowName=FLOW_ID, top=3)
print(new_runs[0]["status"])   # Succeeded = done
```

<<<<<<< HEAD
### When to use resubmit vs trigger

| Scenario | Use | Why |
|---|---|---|
| **Testing a fix** on any flow | `resubmit_live_flow_run` | Replays the exact trigger payload that caused the failure — best way to verify |
| Recurrence / scheduled flow | `resubmit_live_flow_run` | Cannot be triggered on demand any other way |
| SharePoint / connector trigger | `resubmit_live_flow_run` | Cannot be triggered without creating a real SP item |
| HTTP trigger with **custom** test payload | `trigger_live_flow` | When you need to send different data than the original run |
| Brand-new flow, never run | `trigger_live_flow` (HTTP only) | No prior run exists to resubmit |

### Testing HTTP-Triggered Flows with custom payloads

For flows with a `Request` (HTTP) trigger, use `trigger_live_flow` when you
need to send a **different** payload than the original run:
=======
### Testing HTTP-Triggered Flows

For flows with a `Request` (HTTP) trigger, use `trigger_live_flow` instead
of `resubmit_live_flow_run` to test with custom payloads:
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df

```python
# First inspect what the trigger expects
schema = mcp("get_live_flow_http_schema",
    environmentName=ENV, flowName=FLOW_ID)
<<<<<<< HEAD
print("Expected body schema:", schema.get("requestSchema"))
=======
print("Expected body schema:", schema.get("triggerSchema"))
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
print("Response schemas:", schema.get("responseSchemas"))

# Trigger with a test payload
result = mcp("trigger_live_flow",
    environmentName=ENV,
    flowName=FLOW_ID,
    body={"name": "Test User", "value": 42})
<<<<<<< HEAD
print(f"Status: {result['responseStatus']}, Body: {result.get('responseBody')}")
=======
print(f"Status: {result['status']}, Body: {result.get('body')}")
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df
```

> `trigger_live_flow` handles AAD-authenticated triggers automatically.
> Only works for flows with a `Request` (HTTP) trigger type.

---

## Quick-Reference Diagnostic Decision Tree

<<<<<<< HEAD
| Symptom | First Tool | Then ALWAYS Call | What to Look For |
|---|---|---|---|
| Flow shows as Failed | `get_live_flow_run_error` | `get_live_flow_run_action_outputs` on the failing action | HTTP status + response body in `outputs` |
| Error code is generic (`ActionFailed`, `NotSpecified`) | — | `get_live_flow_run_action_outputs` | The `outputs.body` contains the real error message, stack trace, or API error |
| HTTP action returns 500 | — | `get_live_flow_run_action_outputs` | `outputs.statusCode` + `outputs.body` with server error detail |
| Expression crash | — | `get_live_flow_run_action_outputs` on prior action | null / wrong-type fields in output body |
| Flow never starts | `get_live_flow` | — | check `properties.state` = "Started" |
| Action returns wrong data | `get_live_flow_run_action_outputs` | — | actual output body vs expected |
| Fix applied but still fails | `get_live_flow_runs` after resubmit | — | new run `status` field |

> **Rule: never diagnose from error codes alone.** `get_live_flow_run_error`
> identifies the failing action. `get_live_flow_run_action_outputs` reveals
> the actual cause. Always call both.
=======
| Symptom | First Tool to Call | What to Look For |
|---|---|---|
| Flow shows as Failed | `get_live_flow_run_error` | `failedActions[-1]["actionName"]` = root cause |
| Expression crash | `get_live_flow_run_action_outputs` on prior action | null / wrong-type fields in output body |
| Flow never starts | `get_live_flow` | check `properties.state` = "Started" |
| Action returns wrong data | `get_live_flow_run_action_outputs` | actual output body vs expected |
| Fix applied but still fails | `get_live_flow_runs` after resubmit | new run `status` field |
>>>>>>> fcdf1a87ad66f2ab69e296e7fe6149be18fe85df

---

## Reference Files

- [common-errors.md](references/common-errors.md) — Error codes, likely causes, and fixes
- [debug-workflow.md](references/debug-workflow.md) — Full decision tree for complex failures

## Related Skills

- `flowstudio-power-automate-mcp` — Core connection setup and operation reference
- `flowstudio-power-automate-build` — Build and deploy new flows
