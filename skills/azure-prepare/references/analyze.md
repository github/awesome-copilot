# Analyze Workspace

## ⛔ MANDATORY FIRST — Specialized Technology Delegation

**STOP. Before choosing a mode, check the user's prompt for specialized technology keywords.**
If matched, invoke the corresponding skill **immediately** — it has tested templates and correct SDK usage.

> ⚠️ **Re-entry guard**: If azure-prepare was invoked as a **resume** from a specialized skill (e.g., azure-hosted-copilot-sdk Step 4), **skip this check** and go directly to Step 4.

| User prompt mentions | Action |
|---------------------|--------|
| copilot SDK, copilot app, copilot-powered, copilot-sdk-service, @github/copilot-sdk, CopilotClient, sendAndWait | **Invoke azure-hosted-copilot-sdk skill NOW** → then resume azure-prepare at Step 4 |
| Azure Functions, function app, serverless function, timer trigger, func new | Stay in **azure-prepare**. When selecting compute, **prefer Azure Functions** templates and best practices, then continue from Step 4. |

> ⚠️ Check the user's **prompt text** — not just existing code. This is critical for greenfield projects with no codebase. See [full routing table](specialized-routing.md).

If no match, continue below.

---

## Three Modes — Always Choose One

> **⛔ IMPORTANT**: Always go through one of these three paths. Having `azure.yaml` does NOT mean you skip to validate — the user may want to modify or extend the app.

| Mode | When to Use |
|------|-------------|
| **NEW** | Empty workspace, or user wants to create a new app |
| **MODIFY** | Existing Azure app, user wants to add features/components |
| **MODERNIZE** | Existing non-Azure app, user wants to migrate to Azure |

## Decision Tree

```
What does the user want to do?
│
├── Create new application → Mode: NEW
│
├── Add/change features to existing app
│   ├── Has azure.yaml/infra? → Mode: MODIFY
│   └── No Azure config? → Mode: MODERNIZE (add Azure support first)
│
└── Migrate/modernize for Azure
    ├── Cross-cloud migration (AWS/GCP/Lambda)? → **Invoke azure-cloud-migrate skill** (do NOT continue in azure-prepare)
    └── On-prem or generic modernization → Mode: MODERNIZE
```

## Mode: NEW

Creating a new Azure application from scratch.

**Actions:**
1. Confirm project type with user
2. Gather requirements → [requirements.md](requirements.md)
3. Select technology stack
4. Update plan

## Mode: MODIFY

Adding components/services to an existing Azure application.

**Actions:**
1. Scan existing codebase → [scan.md](scan.md)
2. Identify existing Azure configuration
3. Gather requirements for new components
4. Update plan

## Mode: MODERNIZE

Converting an existing application to run on Azure.

**Actions:**
1. Full codebase scan → [scan.md](scan.md)
2. Analyze existing infrastructure (Docker, CI/CD, etc.)
3. Gather requirements → [requirements.md](requirements.md)
4. Map existing components to Azure services
5. Update plan

## Detection Signals

| Signal | Indicates |
|--------|-----------|
| `azure.yaml` exists | AZD project (MODIFY mode likely) |
| `infra/*.bicep` exists | Bicep IaC |
| `infra/*.tf` exists | Terraform IaC |
| `Dockerfile` exists | Containerized app |
| No Azure files | NEW or MODERNIZE mode |

---

## ⛔ MANDATORY for Azure Functions: Load Composition Rules BEFORE Execution

**If the target compute is Azure Functions**, you MUST load the composition algorithm before generating ANY infrastructure:

1. Load `services/functions/templates/selection.md` — decision tree for base template + recipe
2. Load `services/functions/templates/recipes/composition.md` — the exact algorithm to follow
3. Use `azd init -t <template>` to generate proven IaC — **NEVER hand-write Bicep/Terraform**

> ⚠️ **Critical**: The Functions `bicep.md` and `terraform.md` files are **REFERENCE DOCUMENTATION**, not templates to copy. Hand-writing infrastructure from these patterns results in missing RBAC, incorrect managed identity configuration, and security vulnerabilities.

For other compute targets (Container Apps, App Service, Static Web Apps), load their respective README files in `services/` for guidance.
