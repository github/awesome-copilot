---
name: flowstudio-power-automate-mcp
description: >-
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

> **Real debugging examples**: [Expression error in child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/fix-expression-error.md) |
> [Data entry, not a flow bug](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/data-not-flow.md) |
> [Null value crashes child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/null-child-flow.md)

> **Requires:** A [FlowStudio](https://mcp.flowstudio.app) MCP subscription (or
> compatible Power Automate MCP server). You will need:
> - MCP endpoint: `https://mcp.flowstudio.app/mcp` (same for all subscribers)
> - API key (`x-api-key` header; `Authorization: Bearer <key>` also works)
> - No key is needed in apps that support MCP sign-in (ChatGPT, claude.ai, Claude
>   desktop, Claude Code, Cursor, VS Code for the web, Gemini): add
>   `https://mcp.flowstudio.app/mcp/oauth` as a connector and sign in with
>   Microsoft — see the [ChatGPT walkthrough](https://learn.flowstudio.app/chatgpt-power-automate)
> - Power Platform environment name (e.g. `Default-<tenant-guid>`)

---

## Which Skill to Use When

Skills are organized by **use-case intent**, not by which tools they call.
Multiple skills reuse the same underlying tools — pick by what the user is
trying to accomplish.

| The user wants to… | Load this skill |
|---|---|
| Make or change a flow (build new, modify existing, fix a bug, deploy) | **`flowstudio-power-automate-build`** |
| Diagnose why a flow failed (root cause analysis on a failing run) | **`flowstudio-power-automate-debug`** |
| See what changed in a flow, or put an earlier version back | **`flowstudio-power-automate-debug`** (what changed) or **`flowstudio-power-automate-build`** (put it back) |
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

## Source of Truth

| Priority | Source | Covers |
|----------|--------|--------|
| 1 | **Real API response** | Always trust what the server actually returns |
| 2 | **`tool_search`** (`list_skills` gives bundle names only) | Authoritative tool schemas, parameter names, types, required flags |
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

**What costs a call:** `tool_search`, `list_skills`, `get_task`, `report_bug`,
`score_canvas_app` and `grant_flow_studio_access` never cost a call. Neither
does a dry run (`dryRun: true` on `update_live_flow` or `update_canvas_app`).
A failed call is free, except when Microsoft refused the definition or
parameters you sent, or the flow, run, environment or connection doesn't exist
or you don't have access to it. Those can cost a call. Timeouts, Microsoft
outages and errors on FlowStudio's side are free.

When a plan runs out of calls, or the free trial ends, those six tools still
work. Every other call is refused, dry runs included, and the reply says what
to do next. Canvas tools are free and keep working while they are in preview.

| Meta-tool | When to call |
|---|---|
| `list_skills` | Cold start — each bundle's `name` and one-line `description` (no tool names); pick one |
| `tool_search` with `query: "skill:<name>"` | Load one bundle's tool schemas plus its step-by-step guidance in `skills_hint` (e.g. `skill:debug-flow`) |
| `tool_search` with `query: "select:tool1,tool2"` | Load specific tools by name (e.g. when chaining across bundles) |
| `tool_search` with `query: "<keywords>"` | Free-text search when the user request is ambiguous (e.g. `"cancel run"`) |

The server's `tool_search` bundles are intentionally **narrower than this
skill family** — they're starter packs of the most-likely-needed tools per
intent. A workflow skill (e.g. `flowstudio-power-automate-debug`) may pull a bundle and
then call `tool_search` again for additional tools as the workflow progresses.

```python
# Cold start — pick a bundle by intent
skills = mcp("list_skills", {})
# [{"name": "debug-flow", "description": "Investigate why a flow is failing: ..."}, ...]

# Load the bundle's schemas, plus its step-by-step guidance in skills_hint
debug = mcp("tool_search", {"query": "skill:debug-flow"})
tool_names = [m["name"] for m in debug["matches"]]
guidance = debug.get("skills_hint")
```

Flow bundles on production (`list_skills`, 2026-11-20):

| Bundle | Use when |
|---|---|
| `discover` | Enumerating environments, flows, and connections |
| `create-flow` | Creating a brand-new flow: connections, connector examples, live input values, and `update_live_flow` |
| `build-flow` | Reading or modifying an existing flow, including an action's live dropdown and column values |
| `flow-versions` | Seeing earlier versions of a flow, comparing them, and putting one back |
| `debug-flow` | Investigating failed runs and action-level inputs/outputs |
| `monitor-flow` | Starting/stopping, triggering, cancelling, or resubmitting runs |
| `diagnose-connection-references` | Connection-reference problems on flows in solutions |
| `dataverse` / `sharepoint` / `excel` / `sql` | Finding tables, lists, columns and choice values, and reading rows |
| `governance` | Pro+ cached-store tagging, maker audit, and metadata updates — listed only for Pro+ callers |

`canvas-app` and `canvas-layout` cover Power Apps canvas apps, not flows.

---

## Recommended Language: Python or Node.js

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

> **TL;DR — use the Core MCP Helper (Python or Node.js) below.** Both handle
> JSON-RPC framing, auth, and response parsing in a single reusable function.

---

## Core MCP Helper (Python)

Use this helper throughout all subsequent operations:

```python
import json, urllib.request

TOKEN = "<YOUR_API_KEY>"
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
    result = raw["result"]
    text = result["content"][0]["text"]
    if result.get("isError"):
        # A failed call's text may be prose or JSON; raise either way
        raise RuntimeError(f"Tool error: {text[:2000]}")
    return json.loads(text)
```

> **Common auth errors:**
> - HTTP 401/403 → key is missing, expired, or malformed. Get a fresh key from [mcp.flowstudio.app](https://mcp.flowstudio.app).
> - HTTP 403 with a library's default `User-Agent` (for example `Python-urllib`) → Cloudflare blocked the request. Send `User-Agent: FlowStudio-MCP/1.0`.
> - HTTP 400 → malformed JSON-RPC payload. Check `Content-Type: application/json` and body structure.
> - `MCP error: {"code": -32602, ...}` → unknown tool name. Call `tool_search` to find the right one.
> - `MCP error: {"code": -32042, ...}` → the person must open a sign-in page; the address is in `error.data.elicitations[0].url`. Show it to them.
> - `Tool error: ...` → the tool ran and refused or failed; wrong or missing arguments land here too, with the reason. Read it before retrying.
> - `Tool error:` naming `grant_flow_studio_access`, or saying to sign in or reconnect at the dashboard → the person's Microsoft sign-in expired, was revoked (for example by a password change), or was never granted. Call `grant_flow_studio_access` to show a sign-in card, or send them to https://mcp.flowstudio.app/dashboard. Don't retry until they have.

---

## Core MCP Helper (Node.js)

Equivalent helper for Node.js 18+ (built-in `fetch` — no packages required):

```js
const TOKEN = "<YOUR_API_KEY>";
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
  const text = raw.result.content[0].text;
  // A failed call's text may be prose or JSON; raise either way
  if (raw.result.isError) throw new Error(`Tool error: ${text.slice(0, 2000)}`);
  return JSON.parse(text);
}
```

> Requires Node.js 18+. For older Node, replace `fetch` with `https.request`
> from the stdlib or install `node-fetch`.

---

## Verify the Connection

A 3-line smoke test that confirms the token, endpoint, and helper all work:

```python
skills = mcp("list_skills", {})
print(f"Connected — {len(skills)} skill bundles available:",
      [s["name"] for s in skills])
```

Expected output (production, 2026-11-20; the list grows as the server adds bundles):

```text
Connected — 13 skill bundles available: ['diagnose-connection-references', 'canvas-app', 'canvas-layout', 'dataverse', 'sharepoint', 'excel', 'sql', 'build-flow', 'flow-versions', 'create-flow', 'debug-flow', 'monitor-flow', 'discover']
```

Pro+ callers also see `governance`, except in Microsoft 365 Copilot (Copilot Chat or Cowork). Any non-empty list means the connection works.

If this fails, see the **Common auth errors** note above. If it succeeds, hand
off to the workflow skill matching the user's intent.

---

## Long-Running Saves

A real `update_live_flow` save (anything without `dryRun: true`) runs as a task.
If it is still running after about 25 seconds, the reply is the task, not the
result:

```json
{"taskId": "...", "status": "working", "statusMessage": "The operation is now in progress.", "pollIntervalMs": 30000}
```

**Do not call `update_live_flow` again** — that is how duplicate flows happen.
Poll `get_task` until `status` is `completed` or `failed`. The finished save's
reply is in `result`; `isError: true` means the save itself failed.

```python
import time

def save_flow(args):
    res = mcp("update_live_flow", args)
    while res.get("status") == "working" and "taskId" in res:
        time.sleep(res.get("pollIntervalMs", 30000) / 1000)
        res = mcp("get_task", {"taskId": res["taskId"]})
    if "taskId" not in res:
        return res                      # finished inside 25 s
    if res["status"] == "failed" or res.get("isError"):
        raise RuntimeError(res.get("statusMessage") or res.get("result"))
    return res["result"]
```

A task reply has no `error` key, so `result.get("error") is None` alone reads it
as a success with no `flowName`.

---

## Handling Oversized Responses

Some MCP tool responses are large enough to overflow the agent's context window:

| Tool | Typical size | Cause |
|---|---|---|
| `describe_live_connector` with `depth: "full"` | 100-600 KB | Raw OpenAPI metadata — the default `depth: "summary"` is a compact catalog |
| `resolve_live_parameters` with `detail: "full"` | Grows with the columns | Every column of a wide list or table — narrow with `parameterName` or `search` |
| `get_live_flow_run_action_outputs` (no `actionName`) | Up to 4,000 characters each for an action's inputs and outputs | Survey view: each payload capped, most headers dropped — call again with `actionName` for one action in full |
| `get_live_flow` (large flows) | 50-500 KB | Deeply nested branches — use `depth: "summary"`, then `actions: [...]` |
| `list_live_flows` (large tenants) | 50-200 KB | Hundreds of flow records — use `search` or `top` |

The server helps you narrow. A JSON-object reply over 40,000 characters opens with a
`responseSize` key; for the flow, run, connection and connector read tools it says how to ask for less. A single run payload
over 1 MB is not downloaded: you get `{tooLarge, bytes, link, linkExpiresAt, note}`
instead, and `link` downloads it with a plain GET, no sign-in, until it expires —
treat it like a password.

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
2. **Pass `actionName` to `get_live_flow_run_action_outputs` once you know the action.** Without it you get a survey view: every action in the run, nested ones included, each payload capped at 4,000 characters and most headers dropped (`note` says so). For actions inside a foreach, passing `actionName` without `iterationIndex` can return every repetition of that action.
3. **Reuse the spill file within a session.** Refetching the same `depth: "full"` connector metadata costs 30+ seconds and produces another spill — cache the path.
4. **Don't grep the spill file for JSON keys directly.** Strings are JSON-escaped inside the file (`\"OperationId\":`), so a plain grep for `"OperationId":` will not match. Parse first, then filter.
5. **Summarize tool output to the user.** Echo `name + state + trigger` for flow lists and `actionName + status + code` for run errors — not raw JSON, unless asked.

```python
# Good — ask for one operation, not the whole connector
op = mcp("describe_live_connector", {"environmentName": ENV,
         "connectorName": "shared_sharepointonline", "operationId": "GetItems"})["operation"]
print(op["name"], "—", op["summary"], [i["name"] for i in op["inputs"] if i["required"]])

# Good — a large flow: the action tree first, then only the actions you need
tree = mcp("get_live_flow", {"environmentName": ENV, "flowName": FLOW_ID, "depth": "summary"})
acts = mcp("get_live_flow", {"environmentName": ENV, "flowName": FLOW_ID, "actions": ["Get_items"]})

# Bad — depth "full" pulls the whole 500 KB swagger into context
conn = mcp("describe_live_connector", {"environmentName": ENV,
           "connectorName": "shared_sharepointonline", "depth": "full"})   # don't do this
```

---

## Auth & Connection Notes

| Field | Value |
|---|---|
| Auth header | `x-api-key: <key>` (recommended). `Authorization: Bearer <key>` also works with the same key |
| Token format | Paste the key exactly as issued (an `fsk_…` key from the dashboard, or an older legacy JWT key) — do not strip, alter, or prefix it |
| Timeout | Use ≥ 120 s. `update_live_flow` saves answer within about 25 s, with a `taskId` if still running (see **Long-Running Saves**) |
| Environment name | The `id` from `list_live_environments` — `Default-<tenant-guid>` or a plain GUID. A whole display name or `"Default"` is swapped for the id with a hint; anything else is refused |

---

## Reference Files

- [MCP-BOOTSTRAP.md](references/MCP-BOOTSTRAP.md) — endpoint, auth, request/response format (read this first)
- [tool-reference.md](references/tool-reference.md) — response shapes and behavioral notes (parameters are in `tool_search`)
- [action-types.md](references/action-types.md) — Power Automate action type patterns
- [connection-references.md](references/connection-references.md) — connector reference guide
