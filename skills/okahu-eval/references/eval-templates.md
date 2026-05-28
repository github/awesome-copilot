# Okahu Eval Templates & REST Reference

This is a quick reference for the SKILL.md flow. The **authoritative** source is the live API — when the Okahu MCP server is registered, prefer `mcp__okahu-mcp__get_eval_templates`; without MCP, fetch the latest catalog from <https://apidocs.okahu.ai>. Names, labels, and parameters can evolve.

## Common templates

| Template | Typical labels | When to use |
|---|---|---|
| `sentiment` | `positive`, `neutral`, `negative` | Surface frustrated/dissatisfied user turns. |
| `toxicity` | `toxic`, `non_toxic` | Flag harmful, offensive, or abusive content from either side of the conversation. |
| `bias` | `biased`, `unbiased` | Detect unfair stereotypes or skewed framing in agent responses. |
| `hallucination` | `hallucinated`, `grounded` | Check whether the response is supported by the retrieved context (RAG eval). |
| `answer_relevancy` | `relevant`, `irrelevant` | Score whether the response actually addresses the user's question. |
| `pii_leakage` | `leak`, `no_leak` | Spot leaked emails / phone numbers / SSNs / addresses in agent output. |
| `frustration` | `frustrated`, `satisfied` | Detect signs of user frustration across multi-turn conversations. |
| `offtopic` | `on_topic`, `off_topic` | Check whether the agent strayed from its allowed scope. |
| `summarization` | `faithful`, `unfaithful` | Evaluate whether a summary preserves the source's facts. |

Custom templates created in your Okahu workspace work the same way — pass the workspace-defined name to `template_name`.

## REST endpoints (quick reference)

Base URL (prod): `https://eval.okahu.co/api` (override with `OKAHU_EVALUATION_ENDPOINT`; stage with `OKAHU_STAGE_EVALUATION_ENDPOINT`).

Auth: send `x-api-key: $OKAHU_API_KEY` on every request. **Never** log, echo, or embed the key.

| Verb | Path | Notes |
|---|---|---|
| `POST` | `/v1/eval/traces` | Per-trace synchronous eval. Body `{"template_name": "<t>", "trace_id": "<id>"}`. Returns inline result. |
| `POST` | `/v1/eval/jobs?<query>` | Batch async eval. Query params below. Body `{"template_name": "<t>"}`. Returns `{ "job_id": "..." }` or inline `{ "result": ... }`. |
| `GET` | `/v1/eval/jobs/{job_id}/status` | Poll status: `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `STOPPED`. |
| `GET` | `/v1/eval/jobs/{job_id}` | **Metadata only** — does NOT include per-fact labels. For labeled rows, use `mcp__okahu-mcp__get_prompts` (see MCP tools below). |
| `GET` | `/v1/eval/jobs?<filters>` | List recent jobs (supports `status=`, `start_time=`, `end_time=`). |

### Batch query parameters

| Param | Example | Notes |
|---|---|---|
| `start_time` | `2026-05-20T00:00:00Z` | ISO 8601 UTC. |
| `end_time` | `2026-05-27T00:00:00Z` | ISO 8601 UTC. Alternatively pass `duration_seconds` for a relative window. |
| `workflow_name` | `claude-cli-hoc` | Target workflow. **Preferred** over `app_name` — see SKILL.md "prefer workflow_name" rule. Returns HTTP 500 with empty body if the workflow doesn't exist for the tenant. |
| `app_name` | `claude_cli_xe8foi` | Target app. Mutually exclusive with `workflow_name`. Requires the tenant's per-app workflow registry to be populated; if empty, Ray fails with `BQ_PARAM_WORKFLOW_NAMES not provided`. Avoid unless you have no workflow name. |
| `fact_name` | `traces` | **Required.** Default `traces`. Other values from the `fact_map` endpoint: `inferences`, `conversations`, `git_commits`, `test_runs`, `tests`, `mcp_invocations`, `agent_requests`, `agent_operations`, `tool_operations`, `agent_sessions`. |
| `breakdown_filter` | `traces` | Defaults to `fact_name`. The eval engine uses it to scope the query; in practice it almost always matches `fact_name`. |
| `max_facts_per_job` | `100` | **Hard ceiling, not a sample size.** If discovered fact_ids exceeds this, the Ray job FAILS with `Discovered N fact_ids exceeds max_facts_per_job=M`. Default `100`; narrow the time window for cost — don't lower the limit. |
| `shadow_eval` | `true` | Run in shadow mode. **Does not persist any rows** — only use to smoke-test the submit path. |

## MCP tools (when registered)

The Okahu MCP server exposes the eval workflow without curl:

| Tool | Purpose |
|---|---|
| `mcp__okahu-mcp__get_eval_templates` | List available templates and their labels. |
| `mcp__okahu-mcp__get_available_apps_and_workflows` | Discover instrumented apps/workflows. Accepts `filter_type="apps"` or `"workflows"`. |
| `mcp__okahu-mcp__get_traces` | Fetch recent traces for a resource (`resource_name`, `resource_type`, `duration_seconds`, `sort="-timestamp"`). |
| `mcp__okahu-mcp__execute_eval_from_okahu` | Per-trace synchronous eval. Returns structured results. |
| `mcp__okahu-mcp__get_prompts` | Pull labeled prompts/results for a resource + time window, filtered by template (`eval_filter={ "<template_name>": [] }`). **This is the canonical retrieval path for batch jobs** — `GET /v1/eval/jobs/{id}` returns metadata only. The MCP must be auth'd against the same environment the job ran on (prod vs stage). |

If the MCP server isn't registered with the host AI tool, fall back to the REST endpoints above for status/listing — but you cannot retrieve labeled batch results without `get_prompts` (or equivalent direct DB access at the tenant level).

## Result shape

Both REST and MCP results normalize into the same per-fact record after the skill flattens them:

```json
{
  "fact_id": "<trace_id or fact UUID>",
  "eval_name": "<template_name>",
  "eval_found": true,
  "label": "<verdict>",
  "explanation": "<rationale>",
  "score": 0.92,
  "extras": { "any": "additional fields the template returned" },
  "eval_timestamp": "<ISO>",
  "workflow_name": "<workflow if any>"
}
```

The bundled `scripts/ok_eval_report.py` accepts either the flat shape above or the nested `{ "eval_result": { ... } }` shape Okahu sometimes returns — it normalizes both.
