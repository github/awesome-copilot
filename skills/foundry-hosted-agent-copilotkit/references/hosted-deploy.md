# Hosted deploy — publish the agent as a Foundry hosted agent (azd)

The `build_hosted_agent()` that backs the deployed brain (FoundryChatClient,
Responses) is published as an **Azure AI Foundry hosted agent**. This runs from
`hosted/` and needs an Azure subscription + a Foundry-enabled tenant. The SAME
`build_hosted_agent()` runs locally for development via `azd ai agent run`.

## Bootstrap `hosted/` — use the real scaffolder, don't hand-write it

```bash
azd ai agent sample list                  # discover starter manifests
azd ai agent init -m <manifest-url>       # scaffolds hosted/: main.py, agent.yaml,
                                           # azure.yaml, requirements.txt, Dockerfile, infra/
```

Read the generated files rather than assuming package/class names from memory:
- `ResponsesHostServer` may live in a package separate from `agent-framework-foundry`
  (e.g. an `agent-framework-foundry-hosting`-style package) — check the generated
  `requirements.txt` and `main.py`'s imports.
- `FoundryChatClient` may be importable from `agent_framework.foundry` or from
  `agent_framework_foundry` depending on version — match whichever the generated
  scaffold uses.
- The generated `requirements.txt` may need an explicit `mcp` package pin (the
  hosting package can import `from mcp import McpError` without pulling `mcp`
  in transitively on a remote build) — verify by actually building/running, not
  by assumption.

## Prerequisites

- `az login` into the **tenant that owns the Foundry project** (a 403 on
  `Microsoft.MachineLearningServices/workspaces/agents/action` means the wrong
  tenant — and in a shared/sandboxed environment, re-check `az account show`
  before assuming this is a code bug, since the default subscription can drift
  mid-session).
- The azd `azure.ai.agents` extension:
  `azd extension install azure.ai.agents` (pin a version compatible with your
  scaffold).
- An `azd` environment with a region/model selected.

## Deploy

```bash
cd hosted
azd env new <env-name>            # first time
azd env set AZURE_LOCATION <region>
# (model deployment name comes from hosted/azure.yaml `deployments` + agent.yaml)
azd up             # provision + remote-build the image + publish the agent
```

`azd up` builds the image with **remote build** (so no local Docker needed) from
the appropriate build context — if you keep `agent.py` next to `main.py`
inside `hosted/responses/` (the recommended, flatter layout — see
`architecture.md`), the default context (`.`) already includes it, and there
is nothing extra to configure. Only widen the context if you have a genuine
reason to import shared code from outside `hosted/`. `azd up` also
provisions the model deployment declared in `hosted/azure.yaml`, and
publishes the hosted agent described by `agent.yaml` / `agent.manifest.yaml`.

## Gotchas (also in troubleshooting.md)

- **Docker Hub rate limit** on build → use `mcr.microsoft.com` base images in
  every Dockerfile.
- **helloworld placeholder deployed** → you ran `azd provision` only; run
  `azd up` (provision + deploy).
- **401 "audience is incorrect"** at runtime → the agent must request the
  `https://ai.azure.com/.default` audience.
- **`ModuleNotFoundError: No module named 'mcp'`** on a hosted container that
  crashes at boot (surfaces as HTTP 424 `session_not_ready` on invoke) → pin
  `mcp` explicitly in `requirements.txt`, since it can be an undeclared
  transitive dependency of the hosting package.

## Prove the hosted agent (live)

Deployment SUCCESS is not proof. Run the agent (e.g. via the VS Code Foundry
toolkit `azd ai agent run`, or the Foundry portal playground) and confirm that
**one consequential action pauses for human approval** before executing — the
same HITL contract you verified locally with your smoke test.

## Connecting a frontend to the hosted agent (the light bridge)

In production the chat UI does NOT run the agent — it talks to the deployed Foundry
hosted agent through the **light bridge** you wrote (`backend/`, a
`mcr.microsoft.com`-based Dockerfile). Deploy the bridge as a Container App and
point the CopilotKit runtime's backend URL at it; set whatever settings your
bridge needs to reach the deployed agent keyless (e.g. a Foundry project
endpoint + the hosted agent's name) so it can forward turns and
`mcp_approval_response`s without a stored key. Run a single replica if your
bridge keeps any per-thread cache in-memory, or externalise that cache.

For the local dev loop, run the SAME agent locally via `azd ai agent run` and
point your bridge at its local URL — no mock.
