# Azure deployment plan

## Target

| Field | Value |
| --- | --- |
| Solution | `claims` |
| Mode | `sdd` |
| Foundry project | Created by the `foundry` layer: `/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-claims-dev-foundry/providers/Microsoft.CognitiveServices/accounts/claims-dev-ai/projects/claims` |
| azd environment (SDD) | `claims-dev` |
| Subscription | `Example` (`00000000-0000-0000-0000-000000000000`), tenant `00000000-0000-0000-0000-000000000000` |
| Resource groups | App: `rg-claims-dev`. Foundry: `rg-claims-dev-foundry` |
| Region | Preferred `swedencentral` → chosen `swedencentral`, because the joint placement check passed |
| Infra (SDD) | `azure.yaml` layers: `foundry` (`microsoft.foundry`) → `app` (Bicep with AVM, `infra/app`) |

## Models

| Deployment | Model and version | SKU | Capacity | Quota evidence |
| --- | --- | --- | --- | --- |
| `gpt-5.4-mini` | `gpt-5.4-mini` | GlobalStandard | 100K TPM (~4 concurrent E2E cases at 60K tokens per case) | free quota checked |

## Resources

| Resource | Layer | Purpose | SKU | Identity | Est. monthly cost |
| --- | --- | --- | --- | --- | --- |
| Foundry account and project | foundry | Agents, models, toolbox | S0 | system | usage |
| Container Apps environment and apps | app | Frontend (external), backend (internal), MCP | Consumption | user-assigned | estimate: low |
| Container Registry | app | Images (remote build) | Basic | AcrPull by identity | estimate: low |
| Log Analytics and Application Insights | app | Telemetry, connected to the project | Pay-as-you-go | — | estimate: low |

## RBAC

Verdict: `READY`.
