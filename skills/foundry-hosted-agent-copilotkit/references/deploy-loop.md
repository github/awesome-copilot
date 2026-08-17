# The hosted-agent development and deploy loop

Foundry hosted agents are defined by `agent.yaml` (identity: `kind: hosted`, model, protocols, environment variables, resources — schema at microsoft.github.io/AgentSchema/), optionally an `agent.manifest.yaml` (parameterized template), and `azure.yaml` (azd provisioning + service config). `${VAR}` in these files is an azd environment variable; `{{ param }}` is an init-time template parameter.

## Inner loop: develop against the REAL agent locally

There is no mock. The `azure.ai.agents` azd extension runs the actual hosted agent locally:

1. `az login` into the tenant that owns the Foundry project (see the 403 trap below).
2. `azd ai agent run` — starts the agent locally (default port 8088) against the provisioned project.
3. `azd ai agent invoke --local "<message>"` — one-shot test (`-p responses|invocations` selects protocol, `-f payload.json` for structured input).
4. Point the rest of the stack (AG-UI endpoint or bridge) at the local agent URL via whatever environment variable the codebase uses for direct/local mode, and exercise features through the real UI.

Inner-loop discipline:

- **Restart the agent between independent verification passes** if it seeds in-memory data — every approve/reject mutates shared state, so a second test run against a dirty process passes or fails for the wrong reason.
- A stale agent process holding the port produces a confusing hypercorn "Address already in use" traceback on the next `azd ai agent run` — kill it first.
- A freshly started agent can 404 with `DeploymentNotFound` on the first request even though the model deployment exists (warm-up flake) — retry once before investigating.

## Outer loop: deploy an update

1. `azd deploy` (or `azd up` for provision + deploy). Code-deploy (ZIP) vs container-deploy is selected by fields in `agent.yaml`; container builds default to remote ACR builds — no local Docker needed.
2. **Each deploy creates a new agent version.** `azd ai agent show` confirms what's live. Clients pinned to a specific version won't see the update; clients using "latest" will.
3. Verify the deployed agent behaviorally: send a read query AND confirm a consequential action still pauses for approval. Deployment success output proves packaging worked, nothing more.

## Deploy gotchas

| Gotcha | Detail |
| --- | --- |
| `azd provision` alone deploys a placeholder | Provision creates infrastructure only; without a deploy step you get a hello-world agent. Use `azd up` or follow provision with `azd deploy` |
| Base images must come from MCR | `az acr build` pulling from Docker Hub anonymously hits `toomanyrequests` rate limits. Use `mcr.microsoft.com/...` base images |
| Shared code missing from the image | If agent code imports modules outside the agent directory, the docker build context in `azure.yaml` must reach them — and azd versions have differed in whether they accept a parent-directory `project:`/context path (a 1.27.0-era regression rejected `..`). Test packaging after azd upgrades |
| Hosted container env | `FOUNDRY_PROJECT_ENDPOINT` and `APPLICATIONINSIGHTS_CONNECTION_STRING` are injected automatically in hosted containers; don't hardcode them |
| Compute idles out | Hosted agent compute deprovisions after ~15 minutes idle; first request after idle is slow — not a bug |
| History duplication (Responses protocol) | The platform stores conversation history; if the agent's own chat client also stores (`store=True`), turns duplicate. Set the client/host options to not store |
| Bridge/front-door scaling | Any service holding per-thread response-id or conversation caches in memory must run a single replica or externalize the cache |
| Tenant-mismatch 403 | `Microsoft.MachineLearningServices/workspaces/agents/action` denied despite correct RBAC usually means the az CLI's active subscription/tenant isn't the project's. Fix with `az account set` / `az login --tenant`; no code change |

## Production frontend wiring

Deploy the AG-UI endpoint (Architecture A/C service, or rely on the hosted invocations endpoint for B) where the CopilotKit runtime can reach it server-side; set the runtime's agent URL env var accordingly. Keep auth keyless (Entra) with the `https://ai.azure.com/.default` audience. The browser talks only to the CopilotKit runtime route — never expose Foundry endpoints or credentials to the client.
