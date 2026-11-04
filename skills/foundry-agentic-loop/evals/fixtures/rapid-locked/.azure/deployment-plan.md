# Azure deployment plan

## Target

| Field | Value |
| --- | --- |
| Solution | `hr-proto` |
| Mode | `rapid` |
| Foundry project | `/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-example/providers/Microsoft.CognitiveServices/accounts/example-ai/projects/hr-proto` |
| Subscription | `Example` (`00000000-0000-0000-0000-000000000000`) |
| Resource groups | `rg-example` (the project's group) |
| Region | The project's region, `swedencentral` |

## Resources

| Resource | Layer | Purpose | SKU | Identity | Est. monthly cost |
| --- | --- | --- | --- | --- | --- |
| Foundry account and project | — | Agent, model, toolbox (reused) | S0 | system | usage |
| Container Apps environment `cae-hr-proto` | — | `hr-mcp` (deployed); backend and frontend (not deployed) | Consumption | user-assigned | estimate: low |

## RBAC

Verdict: `READY`.
