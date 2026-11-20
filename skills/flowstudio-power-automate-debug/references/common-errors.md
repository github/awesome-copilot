# FlowStudio MCP — Common Power Automate Errors

Reference for error codes, likely causes, and recommended fixes when debugging
Power Automate flows via the FlowStudio MCP server.

---

## Expression / Template Errors

### `InvalidTemplate` — Function Applied to Null

**Full message pattern**: `"Unable to process template language expressions... function 'split' expects its first argument 'text' to be of type string"`

**Root cause**: An expression like `@split(item()?['Name'], ' ')` received a null value.

**Diagnosis**:
1. Note the action name in the error message
2. Call `get_live_flow_run_action_outputs` on the action that produces the array
3. Find items where `Name` (or the referenced field) is `null`

**Fixes**:
```
Before: @split(item()?['Name'], ' ')
After:  @split(coalesce(item()?['Name'], ''), ' ')

Or guard the whole foreach body with a condition:
  expression: "@not(empty(item()?['Name']))"
```

---

### `InvalidTemplate` — Wrong Expression Path

**Full message pattern**: `"Unable to process template language expressions... 'triggerBody()?['FieldName']' is of type 'Null'"`

**Root cause**: The field name in the expression doesn't match the actual payload schema.

**Diagnosis**:
```python
# Check trigger output shape (trigger=True, not actionName="<trigger-name>")
trig = mcp("get_live_flow_run_action_outputs",
    environmentName=ENV, flowName=FLOW_ID, runName=RUN_ID,
    trigger=True)
print(trig["outputs"]["body"])   # compare actual keys vs expression
```

**Fix**: Update expression to use the correct key name. Common mismatches:
- `triggerBody()?['body']` vs `triggerBody()?['Body']` (case-sensitive)
- `triggerBody()?['Subject']` vs `triggerOutputs()?['body/Subject']`

---

### `InvalidTemplate` — Type Mismatch

**Full message pattern**: `"... expected type 'Array' but got type 'Object'"`

**Root cause**: Passing an object where the expression expects an array (e.g. a single item HTTP response vs a list response).

**Fix**:
```
Before: @outputs('HTTP')?['body']
After:  @outputs('HTTP')?['body/value']    ← for OData list responses
        @createArray(outputs('HTTP')?['body'])  ← wrap single object in array
```

---

### `WorkflowOperationParametersRuntimeMissingValue` — Required Parameter Is Null

**Full message pattern**: `"The 'inputs.parameters' of workflow operation 'Get_manager' ... may not be null or empty: 'id'"`

**Root cause**: An expression feeding a required connector parameter resolved to
null or empty at run time — often a trigger field the item did not have.

**Diagnosis**: `get_live_flow_run_action_outputs` with the action name shows the
resolved `inputs.parameters`; read the trigger with `trigger: true`.

**Fix**: Guard the value — `coalesce(...)`, or a Condition that skips the action
when it is empty.

---

## Connection / Auth Errors

### `ConnectionAuthorizationFailed`

**Full message**: `"The API connection ... is not authorized."`

**Root cause**: The connection referenced in the flow belongs to a different
user than the one the flow runs as, or is not shared with them.

**Diagnosis**: `get_live_flow` → `properties.connectionReferences` gives the
`connectionName`. `list_live_connections` with `search` shows its owner
(`createdBy`) and `statuses`; `test_live_connection` checks it.

**Fix options**:
1. Bind a connection the run identity owns: `list_live_connections` with
   `search` returns a paste-ready `connectionReferenceTemplate` and
   `hostTemplate`; save them with `update_live_flow` (`connectionReferences`
   can go with `operations` in the same save)
2. No suitable connection: `create_live_connection` (`connectorName`) creates one;
   the person signs in from the card or `signInLink` — you never sign in for them
3. Share the connection with the run identity in Power Automate

---

### `InvalidConnectionCredentials`

**Root cause**: The underlying OAuth token for the connection has expired or
the user's credentials changed.

**Fix**: `test_live_connection` confirms it. `create_live_connection` with
`connectorName` and `connectionName` signs that connection in again: give its
owner `signInLink` (it expires about 10 minutes after it is made). Then
`test_live_connection` again and resubmit the failed run. Connectors that use a
key or account details are refused: renew those in Power Automate.

---

### "This needs one more sign-in"

**Symptom**: A connector call (`test_live_connection`, `read_live_table`, or a
`resolve_live_parameters` people search) answers "This needs one more sign-in".

**Fix**: Call `grant_flow_studio_access` (no arguments). The person grants access
from its card, then retry. Nothing for an admin to change.

---

## HTTP Action Errors

### `ActionFailed` — HTTP 4xx/5xx

**Full message pattern**: `"An HTTP request to... failed with status code '400'"`

**Diagnosis**:
```python
actions_out = mcp("get_live_flow_run_action_outputs", ..., actionName="HTTP_My_Call")
item = actions_out["actions"][0]   # outside a loop; inside one the key is "repetitions"
print(item["outputs"]["statusCode"])   # 400, 401, 403, 500...
print(item["outputs"]["body"])         # error details from target API
```

**Common causes**:
- 401 — missing or expired auth header
- 403 — permission denied on target resource
- 404 — wrong URL / resource deleted
- 400 — malformed JSON body (check expression that builds the body)

---

### `ActionFailed` — HTTP Timeout

**Root cause**: Target endpoint did not respond within Power Automate's limit
(120 seconds for a synchronous outbound request; an asynchronous pattern can
run up to 30 days).

**Fix**: Add retry policy to the HTTP action, or split the payload into smaller
batches to reduce per-request processing time.

---

## Control Flow Errors

### `ActionSkipped` Instead of Running

**Root cause**: The `runAfter` condition wasn't met. E.g. an action set to
`runAfter: { "Prev": ["Succeeded"] }` won't run if `Prev` failed or was skipped.

**Diagnosis**: Check the preceding action's status. Deliberately skipped
(e.g. inside a false branch) is intentional — unexpected skip is a logic gap.

**Fix**: Add `"Failed"` or `"Skipped"` to the `runAfter` status array if the
action should run on those outcomes too.

---

### Foreach Runs in Wrong Order / Race Condition

**Root cause**: `Foreach` without `operationOptions: "Sequential"` runs
iterations in parallel, causing write conflicts or undefined ordering.

**Fix**: Add `"operationOptions": "Sequential"` to the Foreach action.

---

### Foreach Parent Failed After Handled Inner Failure

**Symptom**: Inner actions have failure handlers, but the parent `Foreach` still
shows `Failed`, and downstream actions such as `Response` are skipped.

**Root cause**: A handled child failure can still mark the loop container as
failed. Downstream `runAfter` that only accepts `Succeeded` will not run.

**Diagnosis**: Inspect the parent foreach with `get_live_flow_run_error`, then
inspect child action outputs for the iteration that failed.

**Fix**: If partial success is acceptable, allow the downstream join/response to
run after `Succeeded` and `Failed`, and include an explicit error summary in the
payload. If the loop must be all-or-nothing, wrap risky inner work in a Scope and
handle success/failure at the Scope boundary.

---

## Update / Deploy Errors

### `update_live_flow` Returns No-Op

**Symptom**: The flow does not change: `result["updated"]` does not list
`definition`, or the save is refused. (`created` is a boolean: `true` only when a
new flow was made.)

**Likely cause**: Passing wrong parameter name. The key is `definition` (object)
or `operations` (list), not `flowDefinition` or `body`. Preview first with
`dryRun: true` — its `wouldUpdate` (and, with `operations`, `changes`) shows what would be saved.

---

### `update_live_flow` — `"no connectionReferences were provided"`

**Root cause**: The definition contains `OpenApiConnection` or
`OpenApiConnectionWebhook` actions but `connectionReferences` was not passed, and
there were none to reuse. On an update the server reuses the flow's stored map
when you leave it out, so this is mostly a create.

**Fix**: Pass `connectionReferences` — from `get_live_flow` for an existing flow,
or `list_live_connections` with `search` (`connectionReferenceTemplate`) for a new one.

---

### `update_live_flow` — Unpublished Draft Blocks the Save

**Symptom**: A solution flow's save fails with `XrmApiServerError` ("there exists
an unpublished active row"). The reply says a draft in the maker portal is locking it.

**Fix**: Call `update_live_flow` again with `discardDraft: true`. The draft is not
lost: it stays in the flow's version history (`get_live_flow_versions`).

---

### `update_live_flow` — Flow Changed Since You Read It

**Symptom**: `"Not written: the flow changed since you read it"`.

**Root cause**: You passed `expectedLastModifiedTime` (from `get_live_flow`'s
`properties.lastModifiedTime`) and someone saved the flow after your read. Pass it
on every whole-definition save so you never overwrite another change.

**Fix**: Read the flow again with `get_live_flow`, reapply your change, and pass the
new `lastModifiedTime`.

---

### `update_live_flow` Replies With a `taskId`

**Symptom**: `{taskId, status: "working", pollIntervalMs}` instead of a result. The
save took over 25 seconds and is still running on the server.

**Fix**: Do NOT call `update_live_flow` again — that is how duplicate flows happen.
Wait `pollIntervalMs`, then call `get_task` with the `taskId` until `status`
is `completed` (`result` holds the save's own reply) or `failed`.

---

## Data Logic Errors

### `union()` Overriding Correct Records with Nulls

**Symptom**: After merging two arrays, some records have null fields that existed
in one of the source arrays.

**Root cause**: `union(old_data, new_data)` — `union()` first-wins, so old_data
values override new_data for matching records.

**Fix**: Swap argument order: `union(new_data, old_data)`

```
Before: @sort(union(outputs('Old_Array'), body('New_Array')), 'Date')
After:  @sort(union(body('New_Array'), outputs('Old_Array')), 'Date')
```

---

### Null Cascade in Filter Array / Query

**Symptom**: A lookup/filter step returns the wrong record or a later expression
fails on null even though the filter action itself succeeded.

**Root cause**: The lookup key is null or empty. A condition such as
`equals(item()?['Email'], outputs('Lookup_Email'))` can accidentally match rows
where both sides are null, or can pass an empty array downstream.

**Diagnosis**: Inspect the action that creates the lookup key and the filter
output length. Confirm the key is non-empty before trusting the filter result.

**Fix**: Add a non-empty guard before the filter, normalize comparison values
with `trim()`/`toLower()`, and branch explicitly when no match is found.
