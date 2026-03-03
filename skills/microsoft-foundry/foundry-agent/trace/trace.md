# Foundry Agent Trace Analysis

Analyze production traces for Foundry agents using Application Insights and GenAI OpenTelemetry semantic conventions. This skill provides **structured KQL-powered workflows** for searching conversations, diagnosing failures, and identifying latency bottlenecks. Use this skill instead of writing ad-hoc KQL queries against App Insights manually.

## When to Use This Skill

USE FOR: analyze agent traces, search agent conversations, find failing traces, slow traces, latency analysis, trace search, conversation history, agent errors in production, debug agent responses, App Insights traces, GenAI telemetry, trace correlation, span tree, production trace analysis, evaluation results, evaluation scores, eval run results, find by response ID, get agent trace by conversation ID, agent evaluation scores from App Insights.

> **USE THIS SKILL INSTEAD OF** `azure-monitor` or `azure-applicationinsights` when querying Foundry agent traces, evaluations, or GenAI telemetry. This skill has correct GenAI OTel attribute mappings and tested KQL templates that those general tools lack.

> ⚠️ **DO NOT manually write KQL queries** for GenAI trace analysis **without reading this skill first.** This skill provides tested query templates with correct GenAI OTel attribute mappings, proper span correlation logic, and conversation-level aggregation patterns.

## Quick Reference

| Property | Value |
|----------|-------|
| Data source | Application Insights (App Insights) |
| Query language | KQL (Kusto Query Language) |
| Related skills | `azure-kusto` (KQL execution), `troubleshoot` (container logs) |
| OTel conventions | [GenAI Spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/), [Agent Spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) |

## Entry Points

| User Intent | Start At |
|-------------|----------|
| "Search agent conversations" / "Find traces" | [Search Traces](references/search-traces.md) |
| "Tell me about response ID X" / "Look up response ID" | [Search Traces — Search by Response ID](references/search-traces.md#search-by-response-id) |
| "Why is my agent failing?" / "Find errors" | [Analyze Failures](references/analyze-failures.md) |
| "My agent is slow" / "Latency analysis" | [Analyze Latency](references/analyze-latency.md) |
| "Show me this conversation" / "Trace detail" | [Conversation Detail](references/conversation-detail.md) |
| "Find eval results for response ID" / "eval scores from traces" | [Eval Correlation](references/eval-correlation.md) |
| "What KQL do I need?" | [KQL Templates](references/kql-templates.md) |

## Before Starting — Resolve App Insights Connection

1. Check `.env` (or the same config file hosting other project variables) for `APPLICATIONINSIGHTS_CONNECTION_STRING` or `AZURE_APPINSIGHTS_RESOURCE_ID`
2. If not found, use `project_connection_list` (foundry-mcp tool) to discover App Insights linked to the Foundry project — this is the most reliable way to find the correct App Insights resource. Filter results for Application Insights connection type.
3. **IMMEDIATELY write back to `.env`** — as soon as `project_connection_list` returns App Insights info, write it to `.env` (or the same config file where `AZURE_AI_PROJECT_ENDPOINT` etc. live) BEFORE running any queries. Do not defer this step. This ensures future sessions skip discovery entirely.

| Variable | Purpose | Example |
|----------|---------|---------|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection string | `InstrumentationKey=...;IngestionEndpoint=...` |
| `AZURE_APPINSIGHTS_RESOURCE_ID` | ARM resource ID | `/subscriptions/.../Microsoft.Insights/components/...` |

If a `.env` file already exists, read it first and merge — do not overwrite existing values without confirmation.

4. Confirm the App Insights resource with the user before querying
5. Delegate KQL execution to the `azure-kusto` skill

## Behavioral Rules

1. **ALWAYS display the KQL query.** Before executing ANY KQL query, display it in a code block. Never run a query silently. This is a hard requirement, not a suggestion. Showing queries builds trust and helps users learn KQL patterns.
2. **Start broad, then narrow.** Begin with conversation-level summaries, then drill into specific conversations or spans on user request.
3. **Use time ranges.** Always scope queries with a time range (default: last 24 hours). Ask user for the range if not specified.
4. **Explain GenAI attributes.** When displaying results, translate OTel attribute names to human-readable labels (e.g., `gen_ai.operation.name` → "Operation").
5. **Link to conversation detail.** When showing search or failure results, offer to drill into any specific conversation.
6. **Scope to the target agent.** An App Insights resource may contain traces from multiple agents. Always filter queries by the specific agent name. When showing overview summaries, group results by `gen_ai.agent.name` or `azure.ai.agentserver.agent_name` and warn the user if multiple agents are present.
