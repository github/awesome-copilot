# HR policy assistant (rapid prototype)

A hosted `hr-assistant` agent answers HR policy questions from synthetic sample policies through one toolbox MCP tool. React + Vite frontend and FastAPI backend run locally.

## Implementation contract

| Item | Value |
| --- | --- |
| Services | `frontend` (React + Vite, port 5173), `backend` (FastAPI, port 8000), `hr-mcp` (FastMCP, streamable HTTP) |
| Agent | `hr-assistant`, Microsoft Agent Framework, Responses API, the Basic sample's model deployment |
| Backend API | `POST /api/chat` → `{ answer, citations[] }`; errors `{ code, message }` |
| Environment | `FOUNDRY_PROJECT_ENDPOINT_URL`, `HOSTED_RESPONSES_ENDPOINT`, `TOOLBOX_ENDPOINT` |

## Hosted checkpoint

Passed: `hr-assistant` v3 returned `response.completed` with schema-valid output, the `lookup_policy` MCP call ran and the correlated trace reached Application Insights. Runtime skills: N/A (none required).

## Local acceptance

Contract, E2E and telemetry tests pass against `LOCAL_FRONTEND`.
