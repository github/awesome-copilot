---
name: flowstudio-power-automate-debug
description: >-
  Debug failing Power Automate cloud flows using the FlowStudio MCP server.
  The Graph API only shows top-level status codes. This skill gives your agent
  action-level inputs and outputs to find the actual root cause.
  Load this skill when asked to: debug a flow, investigate a failed run, why is
  this flow failing, inspect action outputs, find the root cause of a flow error,
  fix a broken Power Automate flow, diagnose a timeout, trace a DynamicOperationRequestFailure,
  check connector auth errors, read error details from a run, or troubleshoot
  expression failures. Requires a FlowStudio MCP subscription — see https://mcp.flowstudio.app
---

# Power Automate Debugging with FlowStudio MCP

A step-by-step diagnostic process for investigating failing Power Automate
cloud flows through the FlowStudio MCP server.

> **Real debugging examples**: [Expression error in child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/fix-expression-error.md) |
> [Data entry, not a flow bug](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/data-not-flow.md) |
> [Null value crashes child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/null-child-flow.md)

**Prerequisite**: A FlowStudio MCP server must be reachable with a valid API key or sign-in.
See the `flowstudio-power-automate-mcp` skill for connection setup.
Subscribe at https://mcp.flowstudio.app

---

## Source of Truth

> **Always call `tool_search` first** (`skill:debug-flow`, then `select:` each
> other tool used below; most sit in other bundles) to confirm tool names and
> parameter schemas.
> This skill covers response shapes, behavioral notes, and diagnostic patterns —
> things tool schemas cannot tell you. If this document disagrees with
> `tool_search` or a real API response, the API wins.

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
    if res.get("isError"):   # refusals and failed calls: may not be JSON
        raise RuntimeError(res["content"][0]["text"][:500])
    return json.loads(res["content"][0]["text"])

ENV = "<environment-id>"   # e.g. Default-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Step 1 — Locate the Flow

```python
result = mcp("list_live_flows", environmentName=ENV, search="My Flow Name")
# Returns a wrapper object: {mode, flows, totalCount, error}
target = result["flows"][0]
FLOW_ID = target["id"]   # plain UUID — use directly as flowName
print(FLOW_ID)
```

---

## Step 2 — Find the Failing Run

```python
res = mcp("get_live_flow_runs", environmentName=ENV, flowName=FLOW_ID,
          status="Failed", top=5)   # also startedAfter / startedBefore (date-times)
runs = res["runs"]   # newest first, filtered by Power Automate across pages
# res: {"runs": [{"name": "08584296...CU15", "status": "Failed",
#   "startTime": "...", "endTime": "...", "triggerName": "manual",
#   "error": {"code": "ActionFailed", ...}}, ...],
#  "runCount": 5, "runFilter": "status eq 'Failed'", "triggerChecks": null}
# NO RUNS does not mean healthy: a trigger can fail or skip every poll
# and never run. Unfiltered, zero runs fills res["triggerChecks"]: read
# byStatus, then pass a failed check's checkId to the outputs tool.

RUN_ID = runs[0]["name"]   # runName="latest" also picks the newest run
```

---

## Step 3 — Get the Top-Level Error

> **CRITICAL**: `get_live_flow_run_error` tells you **which** action failed.
> `get_live_flow_run_action_outputs` tells you **why**. You must call BOTH.
> Never stop at the error alone — error codes like `ActionFailed`,
> `NotSpecified`, and `InternalServerError` are generic wrappers. The actual
> root cause (wrong field, null value, HTTP 500 body, stack trace) is only
> visible in the action's inputs and outputs.

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

# failedActions is in name order, not run order. Containers (Foreach, Scope,
# Condition) fail with ActionFailed; the ROOT is the entry that does not:
fa = err["failedActions"]
root = next((a for a in fa if a.get("code") != "ActionFailed"), fa[-1])
print(f"Root action: {root['actionName']} → code: {root.get('code')}")

# allActions shows every action's status — useful for spotting what was Skipped
# See common-errors.md to decode the error code.
```

---

## Step 4 — Inspect the Failing Action's Inputs and Outputs

> **This is the most important step.** The real error detail — HTTP status,
> response body, stack trace, null value — lives in the action's inputs and outputs.

```python
# Get the root failing action's full inputs and outputs
root_action = root["actionName"]
detail = mcp("get_live_flow_run_action_outputs",
    environmentName=ENV,
    flowName=FLOW_ID,
    runName=RUN_ID,
    actionName=root_action)

reps = detail.get("actions") or detail.get("repetitions", [])
if len(reps) > 1:
    print(f"{root_action} returned {len(reps)} repetitions; inspect iteration indexes")
out = reps[0] if reps else {}
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

### Foreach iterations

When `actionName` refers to an action inside a foreach, the output tool can
return every repetition of that action. Each item may include
`repetitionIndexes` with the loop name and zero-based `itemIndex`. Use
`iterationIndex` to inspect one iteration after you find the suspicious item:

```python
all_reps = mcp("get_live_flow_run_action_outputs",
    environmentName=ENV, flowName=FLOW_ID,
    runName=RUN_ID,
    actionName=root_action)

for rep in all_reps["repetitions"][:10]:
    print(rep.get("repetitionIndexes"), rep.get("status"), rep.get("error"))

one_rep = mcp("get_live_flow_run_action_outputs",
    environmentName=ENV,
    flowName=FLOW_ID,
    runName=RUN_ID,
    actionName=root_action,
    iterationIndex=3)
```

### Evidence Compose Bookends

For uncertain connector work, add a `Compose_*_Request` before the risky action
and a `Compose_*_Result` after it, with the result action allowed on both
`Succeeded` and `Failed`. This gives future debugging a clean payload snapshot
without requiring another deploy. Do not include secrets or long binary payloads
in these bookends.

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

```python
# summary: the action tree (name, type, runAfter, nesting), no inputs
tree = mcp("get_live_flow", environmentName=ENV, flowName=FLOW_ID, depth="summary")
print(tree["properties"]["definition"]["actionTree"])
# actions: just these, at any depth. Never save this back as a whole definition
defn = mcp("get_live_flow", environmentName=ENV, flowName=FLOW_ID, actions=[root_action])

# What changed since it last worked? A run name works as a version
# ("from" is a Python keyword, so pass it through **{})
ok = mcp("get_live_flow_runs", environmentName=ENV, flowName=FLOW_ID,
         status="Succeeded", top=1)["runs"]
if ok:
    print(mcp("diff_live_flow", environmentName=ENV, flowName=FLOW_ID,
              **{"from": ok[0]["name"]}))   # {added, removed, changed, triggers}
```

Inspect the failing action's `inputs` expression to see what data it expects.

---

## Step 6 — Walk Back from the Failure

When the failing action's inputs reference upstream actions, inspect those
too. Walk backward through the chain until you find the source of the
bad data:

```python
# No actionName: every action, any depth, one call; payloads capped at
# 4,000 chars ({truncated, preview}); the list is not in run order
survey = mcp("get_live_flow_run_action_outputs",
    environmentName=ENV, flowName=FLOW_ID, runName=RUN_ID)
for out in sorted(survey["actions"], key=lambda a: a.get("startTime") or ""):
    print(f"\n--- {out['actionName']} ({out.get('status')}) ---")
    print(f"Inputs:  {json.dumps(out.get('inputs', ''), indent=2)[:300]}")
    print(f"Outputs: {json.dumps(out.get('outputs', ''), indent=2)[:300]}")
```

> ⚠️ A payload over 1 MB comes back as `{tooLarge, bytes, link, linkExpiresAt, note}`
> instead of the data: `link` downloads it with a plain GET, no sign-in, until it
> expires. Inside a foreach, pass `iterationIndex` to avoid every repetition.

---

## Step 7 — Pinpoint the Root Cause

### Expression Errors (e.g. `split` on null)
If the error mentions `InvalidTemplate` or a function name:
1. Find the action in the definition
2. Check what upstream action/expression it reads
3. **Inspect that upstream action's output** for null / missing fields

```python
# Example: action uses split(item()?['Name'], ' ')
# → null Name in the source data. A Compose's outputs IS the value;
#   Select and Filter array put it in outputs.body
reps = mcp("get_live_flow_run_action_outputs", ..., actionName="Compose_Names")["actions"]
names = (reps[0].get("outputs") or []) if reps else []
nulls = [x for x in names if x.get("Name") is None]
print(f"{len(nulls)} records with null Name")
```

### Wrong Field Path
Expression `triggerBody()?['fieldName']` returns null → `fieldName` is wrong.
**Inspect the trigger output** to see the actual field names:
```python
trig = mcp("get_live_flow_run_action_outputs", ..., trigger=True)  # not actionName
print(json.dumps(trig.get("outputs"), indent=2)[:500])
```

### HTTP Actions Returning Errors
The error code says `InternalServerError` or `NotSpecified` — **always inspect
the action outputs** to get the actual HTTP status and response body:
```python
out = mcp("get_live_flow_run_action_outputs", ..., actionName="HTTP_Get_Data")["actions"][0]
print(f"HTTP {out['outputs']['statusCode']}")
print(json.dumps(out['outputs']['body'], indent=2)[:500])
```

### Connection / Auth Failures
`ConnectionAuthorizationFailed` / `InvalidConnectionCredentials`: check it with
`test_live_connection`. `create_live_connection` with `connectionName` signs it in
again: give the person `signInLink` (you never sign in for them). Or bind a working
connection (`list_live_connections` `search` → template, then `update_live_flow`).

### Outlook user-picker failures (`DynamicListValuesUndefinedOrInvalid`)
Outlook `To`/`Cc`/`From`/`mailboxAddress` pickers use `AadGraph.GetUsers`, which
Power Automate's own lookup refuses. `resolve_live_parameters` searches people the
way the designer does: pass `search` or `match` (a name or email). An email address
typed directly also works.

---

## Step 8 — Apply the Fix

**For expression/data issues**:
```python
# Surgical edit; inside a loop the path is ["actions", "<Loop>", "actions", ...]
ops = [{"op": "set", "path": ["actions", "Compose_Names", "inputs"],
        "value": "@coalesce(item()?['Name'], 'Unknown')"}]
print(mcp("update_live_flow", environmentName=ENV, flowName=FLOW_ID,
          operations=ops, dryRun=True)["changes"])   # preview, writes nothing
result = mcp("update_live_flow", environmentName=ENV, flowName=FLOW_ID, operations=ops)

# Still saving after 25 s → {taskId, status: "working", pollIntervalMs}.
# NEVER call update_live_flow again (duplicates) — poll get_task:
while result.get("status") == "working":
    time.sleep(result["pollIntervalMs"] / 1000)
    result = mcp("get_task", taskId=result["taskId"])
if "taskId" in result:   # the save's own reply is in result
    if result["status"] == "failed" or result.get("isError"):
        raise RuntimeError(result.get("statusMessage") or result.get("result"))
    result = result["result"]
print(result.get("error"))  # None = success
```

> ⚠️ A refused save raises (`isError`). If an unpublished portal draft blocks it
> (`XrmApiServerError`), call again with `discardDraft=True`.

---

## Step 9 — Verify the Fix

> **Use `resubmit_live_flow_run` to test ANY flow.** It replays a past run with
> its original trigger payload — Recurrence, SharePoint, connector webhooks,
> Button and HTTP alike — so there is no wait for the next real event. It cannot
> help a **brand-new flow that has never run**.

```python
# Resubmit the failed run — works for ANY trigger type
resubmit = mcp("resubmit_live_flow_run",
    environmentName=ENV, flowName=FLOW_ID, runName=RUN_ID)
print(resubmit)   # {"resubmitted": true, "triggerName": "..."}

# Wait ~30 s then check
time.sleep(30)
new_runs = mcp("get_live_flow_runs", environmentName=ENV, flowName=FLOW_ID, top=3)["runs"]
print(new_runs[0]["status"])   # Succeeded = done
```

### When to use resubmit vs trigger

| Scenario | Use | Why |
|---|---|---|
| **Testing a fix** on any flow | `resubmit_live_flow_run` | Replays the exact trigger payload that caused the failure — best way to verify |
| Recurrence / scheduled flow | `trigger_live_flow` (no `body`) | Runs it now, like the portal's "Run flow" button; resubmit replays a past run's data |
| SharePoint / connector trigger | `resubmit_live_flow_run` | Cannot be triggered without creating a real SP item |
| HTTP, Button, PowerApps or Skills trigger, **custom** payload | `trigger_live_flow` | When you need to send different data than the original run |
| Brand-new Request or Recurrence flow | `trigger_live_flow` | No prior run to resubmit |

### Testing HTTP, Button, PowerApps and Skills flows with custom payloads

For flows with a `Request` trigger (HTTP request, manual Button, PowerApps or Skills),
use `trigger_live_flow` when you need to send a **different** payload than the
original run. Pass trigger inputs as `body` for every kind:

```python
# First inspect what the trigger expects (summary keeps triggers whole)
defn = mcp("get_live_flow", environmentName=ENV, flowName=FLOW_ID, depth="summary")
manual = next(iter(defn["properties"]["definition"]["triggers"].values()))
print("Expected body schema:", manual.get("inputs", {}).get("schema"))

# Trigger with a test payload
result = mcp("trigger_live_flow",
    environmentName=ENV,
    flowName=FLOW_ID,
    body={"name": "Test User", "value": 42})
print(f"Status: {result['responseStatus']}, Body: {result.get('responseBody')}")
print(f"Kind: {result['triggerKind']}, via: {result['invocation']}, run: {result.get('runName')}")
if result.get("warning"):
    print(result["warning"])   # required trigger inputs you left out
```

> `trigger_live_flow` handles AAD-authenticated triggers. A scheduled flow runs
> now with no `body` (a body is refused); automated connector triggers only fire
> from their source event.
>
> Power Automate does not enforce a trigger's `required` inputs. If you leave
> one out the run still starts, with that input null, and the result carries a
> `warning` naming the missing keys. Cancel the run and call again with the
> full body if that matters.
>
> `runName` comes back only when a `body` went through the connector runtime
> (Button, PowerApps, Skills). Otherwise find the run with `get_live_flow_runs`.
>
> A browser-extension key sends inputs too, through the extension (1.0.19 or later).

---

## Quick-Reference Diagnostic Decision Tree

| Symptom | First Tool | Then ALWAYS Call | What to Look For |
|---|---|---|---|
| Flow shows as Failed | `get_live_flow_run_error` | `get_live_flow_run_action_outputs` on the failing action | HTTP status + response body in `outputs` |
| Error code is generic (`ActionFailed`, `NotSpecified`) | — | `get_live_flow_run_action_outputs` | The `outputs.body` contains the real error message, stack trace, or API error |
| HTTP action returns 500 | — | `get_live_flow_run_action_outputs` | `outputs.statusCode` + `outputs.body` with server error detail |
| Expression crash | — | `get_live_flow_run_action_outputs` on prior action | null / wrong-type fields in output body |
| Flow never starts | `get_live_flow_runs` | outputs tool with a failed `checkId` | `triggerChecks.byStatus`; `properties.state` |
| Worked before, fails now | `get_live_flow_versions` | `diff_live_flow` | actions added, removed or changed |
| Action returns wrong data | `get_live_flow_run_action_outputs` | — | actual output body vs expected |
| Fix applied but still fails | `get_live_flow_runs` after resubmit | — | new run `status` field |

---

## Reference Files

- [common-errors.md](references/common-errors.md) — Error codes, likely causes, and fixes
- [debug-workflow.md](references/debug-workflow.md) — Full decision tree for complex failures

## Related Skills

- `flowstudio-power-automate-mcp` — Foundation skill: connection setup, MCP helper, tool discovery
- `flowstudio-power-automate-build` — Build and deploy new flows
