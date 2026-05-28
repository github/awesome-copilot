---
name: okahu-eval
description: Run Okahu evaluations on AI/LLM agent traces and render a self-contained local HTML report. Use when the user asks to evaluate, score, or grade agent traces with Okahu — e.g. "run sentiment eval on app X", "check hallucination on workflow Y last 24h", "evaluate trace 0x… with Okahu", "list Okahu eval templates", or "poll Okahu eval job <id>". Supports per-trace synchronous mode (one trace, results inline) and batch async mode (time-windowed, polled). Prefers the Okahu MCP server when present and falls back to the REST API otherwise. Never logs or embeds the API key.
metadata:
  author: okahu
  version: "1.0"
compatibility: Works with any project that has at least one Okahu-instrumented AI agent app or workflow. Requires OKAHU_API_KEY. Optionally uses the Okahu MCP server (mcp__okahu-mcp__*) if registered with the host AI tool. See https://docs.okahu.ai and https://apidocs.okahu.ai.
---

# Okahu Eval Skill

Use this skill when the user wants to **run an Okahu evaluation** on instrumented AI agent traces and view the result. The skill produces a self-contained HTML report (works offline, opens in any browser).

Okahu is an AI observability + evaluations platform. The eval API scores facts (traces / inferences / retrievals) using LLM-as-judge templates such as `sentiment`, `toxicity`, `bias`, `hallucination`, `answer_relevancy`, `pii_leakage`, `frustration`, `offtopic`, and `summarization`. Custom templates are also supported.

## Quick start (for the user)

If the user asks something like *"run a sentiment eval"*, *"score this trace with Okahu"*, or *"check toxicity on my agent"*, follow the flow below. The freeform request is parsed first — **only ask questions when something required is genuinely unresolvable**. If the prompt has everything, fire and report.

## Core principles

- **Quiet by default.** One line up front ("Running sentiment eval on `<app>`, last 24h…"), the report path at the end.
- **Never echo `OKAHU_API_KEY`** — not to stdout, not to files, not into the HTML. Pass it only as an HTTP header.
- **Never write reports to git-tracked paths.** Default to `.okahu/reports/`; if it's not already in `.gitignore`, add it before writing.
- **Prefer per-trace sync** when a single `trace_id` is given — faster, no polling.
- **Prefer MCP when present** (`mcp__okahu-mcp__*` tools). Fall back to REST only when MCP is unavailable.
- **Surface mismatches, don't paper over them.** If the user-supplied space/project/app disagrees with what the CLI or collector says, report it as a blocker rather than silently rewriting.

## Phase 0: Sanity checks

Before changing or running anything:

1. Confirm `OKAHU_API_KEY` is reachable. Look for it in this order:
   - The current process environment.
   - A `.env` file at the repo root (load with `set -a; source .env; set +a` — do **not** echo its contents).
   - Tool/agent-specific secret stores if the host AI tool documents them.

   If still missing, **do not prompt the user for the key inline**. Print the fix and stop:
   ```
   OKAHU_API_KEY missing — get it from https://portal.okahu.co (Settings → API keys)
   and set it in .env (OKAHU_API_KEY=<key>). Then re-run.
   ```

2. Resolve the API base URL. Default is prod; honor explicit overrides:
   - `OKAHU_EVALUATION_ENDPOINT` if set.
   - `OKAHU_STAGE_EVALUATION_ENDPOINT` when the user's request contains the word "stage".
   - Otherwise: `https://eval.okahu.co/api`.

   Surface which host was picked in the report header — the host only, never the key.

3. Make sure `.okahu/reports/` exists; create it if not. Add `.okahu/` to `.gitignore` if missing.

## Phase 1: Parse the request

Extract these slots from the user's prompt. Treat this as best-effort NL → structured.

| Slot | How to recognize | Example |
|---|---|---|
| `template_name` | bare word matching a known template | `sentiment` |
| `trace_id` | 32-char hex, optionally `0x`-prefixed | `0x9f20048b3331bb621140ae5efd88cfec` |
| `app_name` | `on app <name>`, `app=<name>` | `claude_cli_xe8foi` |
| `workflow_name` | `workflow <name>`, `wf=<name>` | `claude-cli-hoc` |
| `time window` | `last 24h`, `last 7 days`, `since yesterday`, `from <ISO> to <ISO>` | `last 24h` |
| `shadow_eval` | the word `shadow` appearing anywhere | `shadow` |
| `fact_name` | `fact=<name>` — **required by the eval-api**; defaults to `traces` | `inference` |
| `breakdown_filter` | `breakdown=<name>` — defaults to `fact_name` (the engine uses it to scope the BigQuery query; in practice it almost always matches `fact_name`) | `traces` |
| `max_facts_per_job` | `limit=<n>` — **hard ceiling, not a sample size**. If discovered fact_ids exceeds this, the Ray job FAILS. Default `100`; narrow the time window if you need lower cost rather than lowering the limit. | `limit=100` |
| `eval_filters` | `where <eval>=<label>` | `where toxicity=non_toxic` |

See `references/eval-templates.md` for the canonical template catalog and parameter reference.

### Mode decision

- **per-trace-sync** — `trace_id` is present AND (`app_name` OR `workflow_name`) is present AND `template_name` is present.
- **batch-async** — (`app_name` OR `workflow_name`) is present AND `template_name` is present AND no specific `trace_id`.
- **interactive** — otherwise; ask focused questions for only the missing slots.

If both `app_name` and `workflow_name` are derivable, **prefer `workflow_name`**. The `app_name` form requires the tenant's per-app workflow registry to be populated — if it's empty, the job submits OK but Ray fails with `BQ_PARAM_WORKFLOW_NAMES not provided`. Drop `app_name`, keep `workflow_name`, and tell the user once.

## Phase 2: Resolve missing slots

Only ask the user for what you actually need.

1. **Missing template.** List the catalog from `references/eval-templates.md` or, if the Okahu MCP is available, call `mcp__okahu-mcp__get_eval_templates` for the live list. Present the top options and accept "Other" for a custom name.
2. **Missing app and workflow.** If MCP is available, call `mcp__okahu-mcp__get_available_apps_and_workflows(filter_type="workflows")` first and prefer a workflow target (see the "prefer workflow_name" rule above). Fall back to `filter_type="apps"` only if no workflows are returned. Otherwise prompt the user to specify the workflow (or app) name — it must match what's been instrumented.
3. **Batch-async with no window.** Default to last 24h (`duration_seconds=86400`) and mention the default in the report header so the user can spot if they meant something else.
4. **"the latest" / "pick a recent trace".** If MCP is available, call `mcp__okahu-mcp__get_traces(resource_name=…, resource_type=…, duration_seconds=86400, sort="-timestamp")` and present the top results with `duration_ms` and `start_time` in the label.

## Phase 3a: Per-trace synchronous mode

Prefer the MCP path — it returns structured results without curl:

```text
mcp__okahu-mcp__execute_eval_from_okahu(
  resource_name=<app_or_workflow>,
  resource_type=<"app"|"workflow">,
  template_name=<template>,
  trace_id=<trace_id>
)
```

If MCP is not registered, hit REST instead:

```bash
curl -sS -X POST \
  -H "x-api-key: $OKAHU_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"template_name\":\"$TEMPLATE\",\"trace_id\":\"$TRACE_ID\"}" \
  "${BASE}/v1/eval/traces"
```

Persist the result to `.okahu/reports/eval-<trace_short>-<ts>.json` in the shape below (the bundled renderer expects this shape — see Phase 4):

```json
{
  "mode": "trace-sync",
  "job": {
    "template_name": "<template>",
    "target": { "app": "<...>", "workflow": null, "trace_id": "<...>" },
    "window": null,
    "submitted_at": "<ISO>",
    "duration_s": <wallclock>,
    "status": "INLINE"
  },
  "results": [
    {
      "fact_id": "<trace_id>",
      "eval_name": "<template>",
      "eval_found": true,
      "label": "<verdict>",
      "explanation": "<rationale>",
      "score": 0.92,
      "extras": {},
      "eval_timestamp": "<ISO>",
      "workflow_name": "<workflow or empty>"
    }
  ]
}
```

If the MCP response is nested as `{ "eval_result": { "label", "explanation", ... } }`, flatten it before writing — the renderer accepts either shape but the flat form is canonical.

## Phase 3b: Batch async mode

Submit via REST — it accepts richer query parameters than MCP:

```bash
set -a; source .env 2>/dev/null; set +a   # do not echo $OKAHU_API_KEY
BASE="${OKAHU_EVALUATION_ENDPOINT:-https://eval.okahu.co/api}"

START="$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)"   # macOS form; on Linux use: date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ
END="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# fact_name is REQUIRED by the eval-api (stage rejects without it). Default
# to "traces"; other valid values from the fact_map endpoint include:
# inferences, conversations, git_commits, test_runs, tests, mcp_invocations,
# agent_requests, agent_operations, tool_operations, agent_sessions.
FACT="${FACT:-traces}"

# breakdown_filter must match fact_name in the common case; the eval engine
# uses it to scope the BigQuery query. Default to FACT.
BREAKDOWN="${BREAKDOWN:-$FACT}"

# max_facts_per_job is a HARD CEILING — if discovered fact_ids exceeds it,
# the Ray job FAILS with "Discovered N fact_ids exceeds max_facts_per_job=M".
# Default 100; narrow the window if you need lower cost rather than lower limit.
LIMIT="${LIMIT:-100}"

QS="start_time=${START}&end_time=${END}&fact_name=${FACT}&breakdown_filter=${BREAKDOWN}&max_facts_per_job=${LIMIT}"
# Prefer workflow_name when known — see "prefer workflow_name" rule in the
# Mode decision section. app_name requires the tenant's per-app workflow
# registry to be populated, which it often isn't.
[ -n "$WORKFLOW_NAME" ]                           && QS="${QS}&workflow_name=${WORKFLOW_NAME}"
[ -z "$WORKFLOW_NAME" ] && [ -n "$APP_NAME" ]     && QS="${QS}&app_name=${APP_NAME}"
[ "$SHADOW" = "true" ]                            && QS="${QS}&shadow_eval=true"

SUBMIT_RES="$(curl -sS -X POST \
  -H "x-api-key: $OKAHU_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"template_name\":\"${TEMPLATE}\"}" \
  "${BASE}/v1/eval/jobs?${QS}")"

JOB_ID="$(echo "$SUBMIT_RES" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("job_id",""))')"
INLINE="$(echo "$SUBMIT_RES" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("yes" if "result" in d or "results" in d else "no")')"
```

If `INLINE = yes`, the server returned results inline — skip polling. Otherwise poll up to ~5 minutes:

```bash
for i in $(seq 1 60); do
  STATUS_JSON="$(curl -sS -H "x-api-key: $OKAHU_API_KEY" "${BASE}/v1/eval/jobs/${JOB_ID}/status")"
  STATE="$(echo "$STATUS_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status",""))')"
  case "$STATE" in
    SUCCEEDED|FAILED|STOPPED) break ;;
  esac
  sleep 5
done
DETAILS="$(curl -sS -H "x-api-key: $OKAHU_API_KEY" "${BASE}/v1/eval/jobs/${JOB_ID}")"
```

Tip: don't add a leading long `sleep` — the per-iteration `sleep 5` inside the loop is enough. If the state isn't terminal after the loop ends, emit a partial report and tell the user to re-poll with sub-command `status job=<JOB_ID>` (Phase 5).

### Phase 3b.1: Retrieve result rows

**`GET /v1/eval/jobs/{job_id}` returns metadata only** — no per-fact labels. After polling completes, fetch the labeled rows via the Okahu MCP:

```text
mcp__okahu-mcp__get_prompts(
  resource_name=<app or workflow>,
  resource_type=<"app"|"workflow">,
  eval_filter={ "<template_name>": [] },   # empty list = "any label"
  start_time=<window start>,
  end_time=<window end>
)
```

Map each returned prompt to a results entry:

| MCP field | → | Report field |
|---|---|---|
| `trace_id` | → | `fact_id` |
| `evals.<template>.label` | → | `label` |
| `evals.<template>.explanation` | → | `explanation` |
| `evals.<template>.score` (if present) | → | `score` |
| `workflow_name` | → | `workflow_name` |
| `created_at` or eval ts | → | `eval_timestamp` |

Unknown per-template fields (e.g. `confidence`, scoring sub-keys) go under `extras` so the renderer's expandable rows surface them generically.

Persist the combined JSON (metadata from `$DETAILS` + result rows) to `.okahu/reports/eval-<job_id>-<ts>.json` in the shape of Phase 3a (`mode: "batch-async"`, `job.job_id: "<job_id>"`). If no rows came back, write `results: []` and the renderer will draw the empty state with the exact filters used.

> **MCP/env alignment:** the connected Okahu MCP must be auth'd against the same environment the job ran on. If they're mismatched (e.g. MCP on prod, job on stage), the prompts query will return zero rows even though the job succeeded — refresh the MCP auth against the right env and re-run the `report <job_id>` sub-command to re-fetch.

**Pitfalls observed in real testing:**

- **`shadow_eval=true` does not persist any rows.** Use shadow only when smoke-testing the submit path; never expect to see results back.
- **`app_name` flakiness.** Even when the underlying trace data exists, the job submits OK but Ray fails with `BQ_PARAM_WORKFLOW_NAMES not provided` if the tenant's per-app workflow registry is empty. Prefer `workflow_name` whenever you have one — discover it via `mcp__okahu-mcp__get_traces`.
- **`max_facts_per_job` is a hard ceiling, not a sample size.** Discovered > ceiling ⇒ job FAILS with `Discovered N fact_ids exceeds max_facts_per_job=M`. Default to 100; narrow the time window if cost is the concern, don't lower the ceiling.
- **HTTP 500 with empty body on unknown workflow.** The `workflow_name` form returns 500-empty (not a clean 400) if the workflow doesn't exist for this tenant. Verify the workflow exists first via `get_available_apps_and_workflows` or `get_traces`, and surface a "workflow not found for tenant" message instead of retrying.

## Phase 4: Render the HTML report

Run the bundled renderer:

```bash
python3 scripts/ok_eval_report.py .okahu/reports/eval-<id>-<ts>.json
```

The script writes `eval-<id>-<ts>.html` next to the JSON and prints the absolute path. Then open it:

```bash
# macOS
open .okahu/reports/eval-<id>-<ts>.html
# Linux
xdg-open .okahu/reports/eval-<id>-<ts>.html
# Windows
start .okahu/reports/eval-<id>-<ts>.html
```

Final message to the user: one sentence + the absolute report path. Nothing else.

If the result set is empty (zero facts), still emit the HTML — the renderer shows a "No facts matched" empty state with the exact filters used so the user can correct the query.

## Phase 5: Sub-commands

If the user's prompt starts with one of these verbs, skip Phase 1's slot parsing:

| Verb | Behavior |
|---|---|
| `status job=<id>` | `GET ${BASE}/v1/eval/jobs/<id>/status` once, print state + summary |
| `list` (optionally `status=<S>`, `since <window>`) | `GET ${BASE}/v1/eval/jobs?…` and print a table |
| `templates` | MCP `get_eval_templates` if available, else show `references/eval-templates.md` |
| `report <id>` | Re-run `scripts/ok_eval_report.py` on the existing `.okahu/reports/eval-<id>-*.json` |

## Examples

```
"run sentiment eval on trace 0x9f20048b3331bb621140ae5efd88cfec on app claude_cli_xe8foi"
   → per-trace sync (MCP if available, REST fallback), ~3s, opens HTML

"check toxicity on claude_cli_xe8foi last 24h"
   → batch job, polls until done, opens HTML

"hallucination eval on workflow claude-cli-hoc since yesterday shadow limit=20"
   → batch job (shadow mode, capped at 20 facts), opens HTML

"frustration on app my_assistant from 2026-05-20 to 2026-05-27"
   → batch job over a custom window

"list Okahu eval templates"
   → prints the catalog

"poll Okahu job abc123"
   → status sub-command for a previously submitted job
```

## Bundled assets

- `scripts/ok_eval_report.py` — self-contained Python 3 renderer. Reads the canonical JSON shape above and writes a styled HTML report (light + dark mode, label distribution, expandable per-fact rows). No dependencies outside the standard library.
- `references/eval-templates.md` — catalog of common Okahu eval templates with their typical labels and intended use cases, plus a REST endpoint quick reference.

## Reference links

| Resource | URL |
|---|---|
| Okahu Cloud portal | https://portal.okahu.co |
| Okahu Docs | https://docs.okahu.ai |
| Okahu API Docs | https://apidocs.okahu.ai |
| Monocle SDK (Okahu's open-source instrumentation) | https://github.com/monocle2ai/monocle |
| Postman workspace | https://www.postman.com/okahuai/workspace/okahu-beta2/overview |
