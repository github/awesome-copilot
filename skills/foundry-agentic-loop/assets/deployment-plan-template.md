# Azure deployment plan

> The single home for this workspace's Azure settings, in both modes. Written by Specify (SDD) or the rapid preflight, then kept current as resources change; Implement and Deploy read it. Rapid fills only the rows that apply and skips those marked SDD. Contains no secrets.

## Target

| Field | Value |
| --- | --- |
| Solution | `{solution}` |
| Mode | `sdd` or `rapid`, matching the root `AGENTS.md` lock |
| Foundry project | SDD: created by the `foundry` layer, ARM ID recorded after provisioning. Rapid: the existing project's ARM ID and endpoint |
| azd environment (SDD) | `{solution}-{stage}` (at most 20 characters) |
| Subscription | `{name}` (`{id}`), tenant `{tenantId}` |
| Signed-in principal | `{upn or appId}` (`{objectId}`) |
| Resource groups | SDD app: `rg-{environment}` (new; `az group exists` returned false). Foundry: {the provider's group, recorded after provisioning; rapid: the project's group} |
| Region | Preferred `{region}` → chosen `{region}`, because {placement evidence}. Rapid: the project's region |
| Agent scaffold (SDD) | `azd ai agent init .` with the Basic sample manifest `{manifestUrl}`, in an empty `.scaffold` folder, then moved into place |
| Infra (SDD) | `azure.yaml` layers: `foundry` (`microsoft.foundry`) → `app` (Bicep with AVM, `infra/app`) |

## Models

| Deployment | Model and version | SKU | Capacity | Quota evidence |
| --- | --- | --- | --- | --- |
| `gpt-5.4-mini` | `gpt-5.4-mini` {version} | GlobalStandard | {TPM} (~{c} concurrent E2E cases at {tokens} per case) | {free quota in region} |

## Resources

Rapid lists only the resources it reuses or creates, with `—` as the layer.

| Resource | Layer | Purpose | SKU | Identity | Est. monthly cost |
| --- | --- | --- | --- | --- | --- |
| Foundry account and project | foundry | Agents, models, toolbox | S0 | system | usage |
| Container Apps environment and apps | app | Frontend, backend, MCP | Consumption | user-assigned | {estimate} |
| Container Registry | app | Images (remote build) | Basic | AcrPull by identity | {estimate} |
| Log Analytics and Application Insights | app | Telemetry, connected to the project | Pay-as-you-go | — | {estimate} |

## RBAC

Verdict from the foundry-agentic-loop RBAC preflight: `READY` or `BLOCKED`.

| Principal | Role | Scope | Created by |
| --- | --- | --- | --- |
| {identity} | {role} | {scope} | app layer |
| {deployer} (`AZURE_PRINCIPAL_ID`) | Monitoring Metrics Publisher | Application Insights | app layer |

{When BLOCKED: the ready-to-run grant block for an owner.}

## Environment variables (SDD)

Implement sets these with `azd env set`, `AZURE_RESOURCE_GROUP` first, one command per variable.

| Variable | Value |
| --- | --- |
| `AZURE_RESOURCE_GROUP` | `rg-{environment}` |
| `AZURE_SUBSCRIPTION_ID` | `{id}` |
| `AZURE_LOCATION` | `{region}` |
| `AZURE_TENANT_ID` | `{tenantId}` |
| `AZD_AGENT_SKIP_ACR` | `false` only when agents deploy as containers |

## Risks and decisions

| Item | Decision | Evidence |
| --- | --- | --- |
| {cost, quota, security or compliance item} | {decision} | {source} |
