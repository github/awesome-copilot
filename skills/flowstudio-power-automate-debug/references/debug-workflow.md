# FlowStudio MCP — Debug Workflow

End-to-end decision tree for diagnosing Power Automate flow failures.

---

## Top-Level Decision Tree

```
Flow is failing
│
├── Flow never starts / no runs appear
│   └── ► Check flow State: get_live_flow → properties.state
│       ├── "Stopped" → turn it on with set_live_flow_state (state "Started");
│       │   if flowSuspensionReason is not "None", fix that cause first
│       └── "Started" + no runs → get_live_flow_runs → triggerChecks.byStatus
│           └── Failed checks → get_live_flow_run_action_outputs with a checkId
│               from triggerChecks.recent shows why the trigger fails
│
├── Flow run shows "Failed"
│   ├── Step A: get_live_flow_run_error  → read failedActions[].code (+ error.message when present)
│   │
│   ├── error.code = "InvalidTemplate"
│   │   └── ► Expression error (null value, wrong type, bad path)
│   │       └── See: Expression Error Workflow below
│   │
│   ├── error.code = "ConnectionAuthorizationFailed" / "InvalidConnectionCredentials"
│   │   └── ► test_live_connection; sign it in again with create_live_connection
│   │       (connectionName), or bind a working connection with update_live_flow
│   │
│   ├── error.code = "ActionFailed" + message mentions HTTP
│   │   └── ► See: HTTP Action Workflow below
│   │
│   ├── parent action is Foreach / Apply to each
│   │   └── ► Inspect child actions; handled child failures can still fail the parent
│   │
│   └── Unknown / generic error
│       └── ► Walk actions backwards (Step B below)
│
├── Flow worked before, fails now
│   └── ► diff_live_flow from the last Succeeded run's name (a run works as a
│       version) → actions added, removed, changed; get_live_flow_versions lists them
│
└── Flow Succeeds but output is wrong
    └── ► Inspect intermediate actions with get_live_flow_run_action_outputs
        └── See: Data Quality Workflow below
```

---

## Expression Error Workflow

```
InvalidTemplate error
│
├── 1. Read error.message — identifies the action name and function
│
├── 2. Get flow definition: get_live_flow
│   └── Find that action in definition["actions"][action_name]["inputs"]
│       └── Identify what upstream value the expression reads
│
├── 3. get_live_flow_run_action_outputs for the action BEFORE the failing one
│   └── Look for null / wrong type in that action's output
│       ├── Null string field → wrap with coalesce(): @coalesce(field, '')
│       ├── Null object → add empty check condition before the action
│       └── Wrong field name → correct the key (case-sensitive)
│
└── 4. Apply fix with update_live_flow, then resubmit
```

---

## HTTP Action Workflow

```
ActionFailed on HTTP action
│
├── 1. get_live_flow_run_action_outputs on the HTTP action
│   └── Read: outputs.statusCode, outputs.body
│
├── statusCode = 401
│   └── ► Auth header missing or expired OAuth token
│       Check: action inputs.authentication block
│
├── statusCode = 403
│   └── ► Insufficient permission on target resource
│       Check: service principal / user has access
│
├── statusCode = 400
│   └── ► Malformed request body
│       Check: action inputs.body expression; parse errors often in nested JSON
│
├── statusCode = 404
│   └── ► Wrong URL or resource deleted/renamed
│       Check: action inputs.uri expression
│
└── statusCode = 500 / timeout
    └── ► Target system error; retry policy may help
        Add: "retryPolicy": {"type": "Fixed", "count": 3, "interval": "PT10S"}
```

---

## Data Quality Workflow

```
Flow succeeds but output data is wrong
│
├── 1. Identify the first "wrong" output — which action produces it?
│
├── 2. get_live_flow_run_action_outputs on that action
│   └── Compare actual output body vs expected
│
├── Source array has nulls / unexpected values
│   ├── Check the trigger data — get_live_flow_run_action_outputs with trigger: true
│   ├── Check the source rows — read_live_table (Dataverse table, SharePoint list,
│   │   SQL or Excel table; select + filter, top 1 to 100) shows if the data itself is bad
│   └── Trace forward action by action until the value corrupts
│
├── Merge/union has wrong values
│   └── Check union argument order:
│       union(NEW, old) = new wins  ✓
│       union(OLD, new) = old wins  ← common bug
│
├── Foreach output missing items
│   ├── Check foreach condition — filter may be too strict
│   └── Check if parallel foreach caused race condition (add Sequential)
│
├── Filter/Query result unexpectedly matches nulls or returns empty
│   └── Guard lookup keys before the filter; do not compare null-to-null
│
└── Date/time values wrong timezone
    └── Use convertTimeZone() — utcNow() is always UTC
```

---

## Walk-Back Analysis (Unknown Failure)

When the error message doesn't clearly name a root cause:

```python
# 1. One call: every action (nested ones too) with status, startTime and capped payloads
survey = mcp("get_live_flow_run_action_outputs",
    environmentName=ENV, flowName=FLOW_ID, runName=RUN_ID)
# Returns {runName, actions: [...]}. The list is NOT in run order, so sort it
for item in sorted(survey["actions"], key=lambda a: a.get("startTime") or ""):
    print(f"{item['actionName']}: {item.get('status', 'unknown')}")

# 2. Find the boundary between Succeeded and Failed/Skipped
# The first Failed action is likely the root cause (unless skipped by design)
```

This lists nested actions too, one record each. For every iteration of an action
inside a Foreach, pass its `actionName` (the reply's key is then `repetitions`) — and
check the parent first to confirm the branch ran at all.

---

## Post-Fix Verification Checklist

1. `update_live_flow` returns `error: null` — definition accepted. A `taskId`
   reply means it is still saving: poll `get_task`, never call `update_live_flow` again  
2. `resubmit_live_flow_run` confirms new run started (or `trigger_live_flow`: for a
   flow whose connections come from whoever runs it, `runOnlyUserConnections` says
   which connection the run used, and `connections` picks another)  
3. Wait for run completion (poll `get_live_flow_runs` every 15 s)  
4. Confirm new run `status = "Succeeded"`  
5. If flow has downstream consumers (child flows, emails, SharePoint writes),
   spot-check those too
