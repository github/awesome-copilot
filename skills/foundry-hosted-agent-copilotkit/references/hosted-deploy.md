# Hosted deploy — publish the agent as a Foundry hosted agent (azd)

The `build_hosted_agent()` that backs the deployed brain (FoundryChatClient,
Responses) is published as an **Azure AI Foundry hosted agent**. This runs from
`hosted/` and needs an Azure subscription + a Foundry-enabled tenant. The SAME
`build_hosted_agent()` runs locally for development via `azd ai agent run`.

## Prerequisites

- `az login` into the **tenant that owns the Foundry project** (a 403 on
  `Microsoft.MachineLearningServices/workspaces/agents/action` means the wrong
  tenant).
- The azd `azure.ai.agents` extension:
  `azd extension install azure.ai.agents` (the template pins `>=0.1.0-preview`).
- An `azd` environment with a region/model selected.

## Deploy

```bash
cd hosted
azd env new <env-name>            # first time
azd env set AZURE_LOCATION <region>
# (model deployment name comes from hosted/azure.yaml `deployments` + agent.yaml)
make up        # == azd up : provision + remote-build the image + publish the agent
```

`make up` builds the image with **remote build** (so no local Docker needed) from
the template root context (so the shared `src/agent.py` is included), provisions
the model deployment declared in `hosted/azure.yaml`, and publishes the hosted
agent described by `agent.yaml` / `agent.manifest.yaml`.

## Gotchas (also in troubleshooting.md)

- **Docker Hub rate limit** on build → the Dockerfiles use `mcr.microsoft.com`
  base images. Keep it that way.
- **helloworld placeholder deployed** → you ran `azd provision` only; run
  `make up` (provision + deploy).
- **401 "audience is incorrect"** at runtime → the agent must request the
  `https://ai.azure.com/.default` audience (the template's `build_hosted_agent`
  already does).

## Prove the hosted agent (live)

Deployment SUCCESS is not proof. Run the agent (e.g. via the VS Code Foundry
toolkit `azd ai agent run`, or the Foundry portal playground) and confirm that
**one consequential action pauses for human approval** before executing — the
same HITL contract you verified locally with `make smoke`.

## Connecting a frontend to the hosted agent (the light bridge)

In production the chat UI does NOT run the agent — it talks to the deployed Foundry
hosted agent through the **light bridge** (`backend/bridge_app.py`, the
`backend/Dockerfile` default). Deploy the bridge as a Container App and point the
CopilotKit runtime's `AG_UI_BACKEND_URL` at it; set `FOUNDRY_PROJECT_ENDPOINT` +
`HOSTED_AGENT_NAME` (the deployed agent) on the bridge so `HostedProxyAgent` can reach
it keyless. Run a single replica (per-thread conversation/session cache is
in-memory) or externalise the cache. The CopilotKit `route.ts` bridge is unchanged.

For the local dev loop, `make local` runs the SAME agent locally via
`azd ai agent run` and points the bridge (`bridge_app:app`) at it — no mock.
