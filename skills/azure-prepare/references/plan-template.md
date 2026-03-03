# Plan Template

Create `.azure/plan.md` using this template. This file is **mandatory** and serves as the source of truth for the entire workflow.

## ⛔ BLOCKING REQUIREMENT

You **MUST** create this plan file BEFORE generating any code, infrastructure, or configuration. Present the plan to the user and get approval before proceeding to execution.

---

## Template

```markdown
# Azure Deployment Plan

> **Status:** Planning | Approved | Executing | Ready for Validation | Validated | Deployed

Generated: {timestamp}

---

## 1. Project Overview

**Goal:** {what the user wants to build/deploy}

**Path:** New Project | Add Components | Modernize Existing

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | POC / Development / Production |
| Scale | Small / Medium / Large |
| Budget | Cost-Optimized / Balanced / Performance |
| **Subscription** | {subscription-name-or-id} ⚠️ MUST confirm with user |
| **Location** | {azure-region} ⚠️ MUST confirm with user |

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| {name} | Frontend / API / Worker | {stack} | {path} |

---

## 4. Recipe Selection

**Selected:** AZD / AZCLI / Bicep / Terraform

**Rationale:** {why this recipe was chosen}

---

## 5. Architecture

**Stack:** Containers / Serverless / App Service

### Service Mapping

| Component | Azure Service | SKU |
|-----------|---------------|-----|
| {component} | {azure-service} | {sku} |

### Supporting Services

| Service | Purpose |
|---------|---------|
| Log Analytics | Centralized logging |
| Application Insights | Monitoring & APM |
| Key Vault | Secrets management |
| Managed Identity | Service-to-service auth |

---

## 6. Execution Checklist

### Phase 1: Planning
- [ ] Analyze workspace
- [ ] Gather requirements
- [ ] Confirm subscription and location with user
- [ ] Scan codebase
- [ ] Select recipe
- [ ] Plan architecture
- [ ] **User approved this plan**

### Phase 2: Execution
- [ ] Research components (load references, invoke skills)
- [ ] **⛔ For Azure Functions: Load composition rules** (`services/functions/templates/selection.md` → `services/functions/templates/recipes/composition.md`) and use `azd init -t <template>` — NEVER hand-write Bicep/Terraform
- [ ] For other services: Generate infrastructure files following service-specific guidance
- [ ] Apply recipes for integrations (if needed)
- [ ] Generate application configuration
- [ ] Generate Dockerfiles (if containerized)
- [ ] Update plan status to "Ready for Validation"

### Phase 3: Validation
- [ ] Invoke azure-validate skill
- [ ] All validation checks pass
- [ ] Update plan status to "Validated"
- [ ] Record validation proof below

### Phase 4: Deployment
- [ ] Invoke azure-deploy skill
- [ ] Deployment successful
- [ ] Update plan status to "Deployed"

---

## 7. Validation Proof

> **⛔ REQUIRED**: The azure-validate skill MUST populate this section before setting status to `Validated`. If this section is empty and status is `Validated`, the validation was bypassed improperly.

| Check | Command Run | Result | Timestamp |
|-------|-------------|--------|-----------|
| {check-name} | {actual command executed} | ✅ Pass / ❌ Fail | {timestamp} |

**Validated by:** azure-validate skill
**Validation timestamp:** {timestamp}

---

## 8. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/plan.md` | This plan | ✅ |
| `azure.yaml` | AZD configuration | ⏳ |
| `infra/main.bicep` | Infrastructure | ⏳ |
| `src/{component}/Dockerfile` | Container build | ⏳ |

---

## 9. Next Steps

> Current: {current phase}

1. {next action}
2. {following action}
```

---

## Instructions

1. **Create the plan first** — Fill in all sections based on analysis
2. **Present to user** — Show the plan and ask for approval
3. **Update as you go** — Check off items in the execution checklist
4. **Track status** — Update the Status field at the top as you progress

The plan is the **single source of truth** for azure-validate and azure-deploy skills.
