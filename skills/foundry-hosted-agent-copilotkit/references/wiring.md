# Wiring reference

Package names below are current as of late 2026. Always install the **latest** releases and verify names against the installed packages: Python via `python -c "import agent_framework_ag_ui as m; print(m.__all__)"`, TypeScript via the `.d.ts` files.

## 1. Hosted agent

Scaffold the agent non-interactively against an existing Foundry project, in a **fresh directory** with a new environment:

```bash
azd ai agent init --no-prompt -e <env> -p <project-arm-id> -d <model-deployment> \
  --agent-name my-agent --protocol responses --deploy-mode code \
  --runtime python_3_13 --entry-point main.py --src src/my-agent
azd env get-values -e <env>   # FOUNDRY_PROJECT_ENDPOINT, AZURE_AI_MODEL_DEPLOYMENT_NAME and
                              # AZURE_LOCATION (= the project's region) must all be set
```

- Running `init` in a directory that already has `azure.yaml` or another azd env can leave `FOUNDRY_PROJECT_ENDPOINT` empty, so `azd deploy` fails with `Foundry dependencies are not ready: ... FOUNDRY_PROJECT_ENDPOINT is not set`. Start over in a clean directory rather than patching the env.
- An existing project needs **no** `azd provision` and no `--infra`. `init` then `azd deploy` is the whole flow.

Everything is declared in `azure.yaml` (camelCase). The old separate `agent.yaml`/`agent.manifest.yaml` files are obsolete. The agent service looks like this:

```yaml
services:
  my-agent:
    project: src/my-agent
    host: azure.ai.agent
    language: python
    uses: [ai-project]
    env:
      AZURE_AI_MODEL_DEPLOYMENT_NAME: ${AZURE_AI_MODEL_DEPLOYMENT_NAME}
    codeConfiguration: { runtime: python_3_13, entryPoint: main.py }
    protocols:
      - protocol: responses
        version: 2.0.0
```

`main.py` must use a Responses-based chat client. `FoundryChatClient` is required for approval resume; a Chat Completions client fails with `No tool output found for function call`.

```python
import asyncio, os
from agent_framework import Agent, tool
from agent_framework.foundry import FoundryChatClient
from agent_framework_foundry_hosting import ResponsesHostServer
from azure.identity import DefaultAzureCredential

@tool
def get_balance(account: str) -> str:
    """Read-only lookup of an account balance."""
    ...

@tool(approval_mode="always_require")
def transfer(from_account: str, to_account: str, amount: float) -> str:
    """Move money. Side-effecting, so a human must approve it first."""
    ...

async def main() -> None:
    client = FoundryChatClient(
        project_endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],  # injected when hosted
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        credential=DefaultAzureCredential(),
    )
    agent = Agent(client=client, instructions="...", tools=[get_balance, transfer],
                  default_options={"store": False})  # the hosting layer owns history
    await ResponsesHostServer(agent).run_async()

if __name__ == "__main__":
    asyncio.run(main())
```

Dependencies (`requirements.txt`): `agent-framework-foundry`, `agent-framework-foundry-hosting`, and `azure-identity`. Pin each one to the latest release with `==`. The hosting package exists only as pre-releases, and remote builds resolve dependencies on their own. Depend on these specific packages, not on the `agent-framework` meta-package.

`ResponsesHostServer` persists conversation state and pending approvals in Foundry by default (`FoundryAgentSessionStore`, `FoundryFunctionApprovalStore`). Don't build your own stores for these.

**Fail soft at startup.** If `main()` raises before serving, `/readiness` never answers and Foundry reports only HTTP 424 `session_not_ready`. Catch configuration errors and serve a stub agent that explains what is missing.

## 2. AG-UI gateway (wiring A)

The gateway is a small FastAPI app. MAF does the Responses↔AG-UI translation and the approval forwarding.

**The AG-UI thread ID is a Foundry conversation ID.** The UI creates the conversation first (see §3), then the gateway passes the thread ID straight through as the Foundry conversation (`use_service_session=True, service_session_id_from_thread_id=True`). Foundry owns the history, so the gateway keeps no thread state and needs no snapshot store.

Conversation continuity is **required for hosted approvals**. Without it, every run reaches the hosted agent as a new conversation, the stored approval request can't be matched, and approving just produces a second approval request.

```python
# gateway/app.py — run: uvicorn app:app --port 8000
import os
from ag_ui.core import EventType
from agent_framework.foundry import FoundryAgent
from agent_framework_ag_ui import AgentFrameworkAgent, add_agent_framework_fastapi_endpoint
from azure.identity.aio import DefaultAzureCredential
from fastapi import FastAPI


class HostedApprovalSafeAgent(AgentFrameworkAgent):
    """Interop fixes verified with agent-framework-ag-ui 1.4.0 + CopilotKit 1.76 / @ag-ui/client 1.0.1.

    1. CopilotKit sends an interrupt decision twice: as `resume` AND as a tool message keyed by
       the interrupt id. The duplicate makes the adapter skip the model's reply and leaves the
       Foundry conversation returning empty runs. Keep only `resume`.
    2. The adapter emits TOOL_CALL_END for the hosted approval id (`mcpr_...`) without a
       TOOL_CALL_START; @ag-ui/client aborts the run with INCOMPLETE_STREAM. Drop it.
    Delete this class when a release fixes both and the HITL regression test passes without it.
    """

    async def run(self, input_data, **kwargs):
        # The endpoint passes snake_case keys (interrupt_id, tool_call_id) by the time run() is called.
        resumed = {r.get("interrupt_id") or r.get("interruptId") or r.get("id")
                   for r in (input_data.get("resume") or []) if isinstance(r, dict)}
        if resumed:
            input_data = {**input_data, "messages": [
                m for m in input_data.get("messages", [])
                if not (m.get("role") == "tool" and (m.get("tool_call_id") or m.get("toolCallId")) in resumed)]}
        started: set[str] = set()
        async for event in super().run(input_data, **kwargs):
            if event.type == EventType.TOOL_CALL_START:
                started.add(event.tool_call_id)
            elif event.type == EventType.TOOL_CALL_END and event.tool_call_id not in started:
                continue
            yield event


hosted = FoundryAgent(
    project_endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
    agent_name=os.environ["FOUNDRY_AGENT_NAME"],   # same name as in azure.yaml
    credential=DefaultAzureCredential(),
    allow_preview=True,                             # hosted-agent session APIs are preview
)
app = FastAPI()
add_agent_framework_fastapi_endpoint(
    app,
    HostedApprovalSafeAgent(agent=hosted, use_service_session=True,
                            service_session_id_from_thread_id=True),  # threadId == Foundry conv_ id
    "/",
)
```

Dependencies: `agent-framework-ag-ui`, `agent-framework-foundry`, `azure-identity`, `aiohttp` (needed by the async credential), `uvicorn`.

- **Thread IDs must be real `conv_…` IDs.** An arbitrary UUID makes Foundry return HTTP 500. Without `service_session_id_from_thread_id=True`, `use_service_session=True` instead requires a `snapshot_store` + `snapshot_scope_resolver` that maps thread IDs to conversations, which puts state back in the gateway.
- **What the gateway still holds: in-flight approvals only.** `agent-framework-ag-ui` keeps pending approvals in a process-local `InMemoryAGUIApprovalStateStore`, which can't be replaced. If the gateway restarts while an approval is pending:
  - The resume fails with `RUN_ERROR` "No pending approval interrupt found for resume interruptId 'mcpr_…'".
  - The tool does **not** run.
  - The same conversation keeps working, so the user simply asks again.

  Everything else survives restarts. For more than one replica, use session affinity so a resume reaches the replica that issued the approval.
- **Authorization:** the gateway trusts the thread ID it receives. In a multi-user app, record which user created each conversation (in the §3 route) and reject other users' thread IDs. This mapping is written once per conversation, not on every turn.
- Resume shape, for curl tests: `"resume": [{"interruptId": "<mcpr_ id from RUN_FINISHED.outcome.interrupts>", "status": "resolved", "payload": {"approved": true}}]`. Send it with the previous `MESSAGES_SNAPSHOT` as `messages`.

## 3. CopilotKit runtime and React

The runtime runs server-side. In Next.js, use an App Router route at `app/api/copilotkit/[[...slug]]/route.ts`. The v2 runtime is multi-route (`/info`, `/agent/:id/run`, …), so the catch-all segment is required.

```ts
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";

const runtime = new CopilotRuntime({
  agents: { default: new HttpAgent({ url: process.env.AGUI_URL! }) }, // gateway URL
});
const handler = createCopilotRuntimeHandler({ runtime, basePath: "/api/copilotkit" });
export const GET = handler;
export const POST = handler;
```

For Hono or Express servers, use `createCopilotHonoHandler` / `createCopilotExpressHandler` from `@copilotkit/runtime/v2`.

Create the Foundry conversation server-side. Its ID becomes the AG-UI thread ID. Put this in `app/api/thread/route.ts` (needs `@azure/identity`, plus `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_AGENT_NAME` in the Next.js server env):

```ts
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();

export async function POST() {
  const { token } = await credential.getToken("https://ai.azure.com/.default");
  const url = `${process.env.FOUNDRY_PROJECT_ENDPOINT}/agents/${process.env.FOUNDRY_AGENT_NAME}` +
    `/endpoint/protocols/openai/conversations?api-version=v1`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) return Response.json({ error: `Foundry ${res.status}` }, { status: 502 });
  const { id } = (await res.json()) as { id: string };   // conv_...
  return Response.json({ threadId: id });                 // multi-user: record (user, id) here
}
```

The React side, in `app/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { CopilotKitProvider, CopilotChat, useDefaultRenderTool } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import { ApprovalUI } from "./approval";   // useInterrupt, see hitl.md

function ToolRows() {
  // Hosted tools run remotely; without a renderer their results are invisible in the chat.
  useDefaultRenderTool({
    render: ({ name, result }) => name === "confirm_changes" ? null :
      <div>{name}: {typeof result === "string" ? result : JSON.stringify(result ?? "")}</div>,
  });
  return null;
}

export default function Page() {
  const [threadId, setThreadId] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    fetch("/api/thread", { method: "POST" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok || typeof d.threadId !== "string" || !d.threadId.startsWith("conv_")) {
          throw new Error(d.error ?? `Could not start a conversation (HTTP ${r.status})`);
        }
        setThreadId(d.threadId);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!threadId) return <p>Starting conversation…</p>;
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit">
      <ToolRows />
      <ApprovalUI />
      <CopilotChat agentId="default" threadId={threadId} />
    </CopilotKitProvider>
  );
}
```

Passing a stored `conv_…` ID back as `threadId` continues that conversation on the agent side, because Foundry holds the history. Re-displaying the earlier transcript in the chat UI is a separate concern, and this setup doesn't cover it.

Version rules:
- Install `next`, `@copilotkit/react-core`, and `@copilotkit/runtime` at `@latest`.
- `@copilotkit/runtime` pins an exact `@ag-ui/client` version. Read it from the installed runtime with `npm view @copilotkit/runtime@<installed version> dependencies`, then install that exact version: `npm i @ag-ui/client@<pinned version>`.
- Keep all `@copilotkit/*` packages on one version.

Names must agree in three places: the runtime `agents` key, `agentId` on `CopilotChat`/`useAgent`, and the hosted agent name the gateway is given. Use one constant.

## 4. In-process AG-UI (wiring B)

Same as §2, but wrap a local `Agent(client=FoundryChatClient(...), tools=[...])` in a plain `AgentFrameworkAgent` instead of `FoundryAgent`; `use_service_session` and the §2 shim aren't needed. All state patterns work natively. Approval state is process-local, so a restart while an approval is pending leaves that approval unresolvable. Use this wiring for prototypes, or put durable approvals behind a hosted agent instead.

## 5. Background-runs gateway (wiring C) {#background-runs-gateway}

Use this when runs must continue after the browser disconnects and users must be able to reopen conversations. It is a custom `AbstractAgent` (from `@ag-ui/client`) in a Node gateway that drives Foundry's REST API directly. Derive the URLs from the agent's Responses endpoint `E = {project}/agents/{name}/endpoint/protocols/openai/responses`:
- `openai = E` minus `/responses`
- `agentEndpoint = openai` minus `/protocols/openai`

| Step | Call |
| --- | --- |
| New thread | `POST {openai}/conversations` → `conversation.id`; `POST {agentEndpoint}/sessions` → `agent_session_id`; store `{threadId → conversationId, sessionId, owner}` |
| Start a turn | `POST {openai}/responses` `{input, conversation, agent_session_id, background: true, store: true, stream: false}` → save `response.id` |
| Stream to the UI | Poll `GET {openai}/responses/{id}` about once a second while `status ∈ {queued, in_progress}`. Emit `MESSAGES_SNAPSHOT` built from `GET {openai}/conversations/{id}/items` (paginate with `after` until `has_more` is false) merged with `response.output`. Finish with `RUN_FINISHED`, or `RUN_ERROR` carrying `response.error` |
| Reconnect | Same poll loop starting from the saved `response.id`. Disconnecting must **not** cancel the run |
| Cancel | `POST {openai}/responses/{id}/cancel` |

Every call uses `?api-version=v1` and a bearer token for `https://ai.azure.com/.default`.

- Register a custom `AgentRunner` with `CopilotSseRuntime({ agents, runner })` so Foundry is the only replay store. The default `InMemoryAgentRunner` keeps a process-global thread cache that disagrees with Foundry after a restart.
- Derive each turn's input from the latest user message only. Replaying the whole AG-UI transcript into `/responses` fails with 400 errors about orphaned tool calls.
- Return 409 if a thread already has an active response.

## 6. Invocations workflow agent (wiring D)

Use this for plan → approve → execute flows where an irreversible step must not run twice, even across container restarts:
- Declare `protocol: invocations` (version `2.0.0`) in `azure.yaml`.
- In the agent, use `@multi_turn_task` from `azure.ai.agentserver.core.tasks`, with application checkpoints in `FoundryStateStore` (`azure.ai.agentserver.core.storage`).
- Each POST to `/invocations?agent_session_id=<id>` returns 202 with an `invocation_id`. Poll `GET /invocations/{id}` for `status` and `output`.
- Gate each irreversible step with a server-issued token (invocation ID + step index + a random value, compared with `hmac.compare_digest`).
- A watermark recorded before the side effect gives **at-most-once**: a crash between the watermark and the action skips the action. For **exactly-once** effects, send a stable per-step idempotency key that the destination enforces, or commit the effect and the completion checkpoint in one transaction.
- On recovery (`ctx.entry_mode == "recovered"`), the same turn is re-invoked with the same input. Reconcile any step that was started but not checkpointed using that idempotency key (ask the destination whether it happened) instead of treating the watermark as proof of completion.

The browser reaches this agent through a server-side REST proxy that checks session ownership. It does not go through AG-UI.

## 7. Auth and identity

- Token audience is `https://ai.azure.com/.default`. The `cognitiveservices` scope returns 401 "audience is incorrect".
- Never send `x-ms-user-isolation-key` to a deployed agent. Isolation comes from the Entra identity, and the header causes a 400.
- The gateway's identity, and the Next.js server identity that creates conversations, need the **Azure AI User** role on the Foundry project. That's a managed identity in Azure, or your `az login` locally.
- The gateway is the authorization boundary:
  - Validate the user's Entra token (issuer, audience, tenant, scope).
  - Keep a user → thread/session ownership index.
  - Check ownership before every Foundry call.
- The Foundry Memory Store calls models as the **project's** managed identity. Grant that identity the Foundry User role on the parent account, or memory writes fail with 401.
- Each hosted agent gets its own Entra identity. Model and session-storage access are granted in-project, but any other Azure resource needs an explicit RBAC assignment.

## 8. Local loop and deploy

```bash
azd ai agent run                       # the real agent on http://localhost:8088, using your az login
azd ai agent invoke --local "hi"       # smoke-test the local agent
azd deploy                             # code deploy; each deploy creates a new agent version
azd ai agent invoke "hi"               # call the deployed agent
azd ai agent show / monitor            # status and logs
```

- The §2 gateway targets a deployed agent by name, so deploy before you test the gateway. Iterate on agent logic locally with `azd ai agent run`.
- Update azd and the `azure.ai.agents` extension first (`azd update`, `azd extension upgrade --all`). An "Incompatible" extension status blocks every `azd ai agent` command.
- If the agent's traffic routing has been pinned explicitly (FixedRatio on a version), `azd deploy` does not move traffic to the new version. Check with `azd ai agent show`.
- Remote builds resolve dependencies independently. A local success does not prove the deployed image builds, so pin versions.
- Restart the local runtime between verification passes if tools keep in-memory state.
