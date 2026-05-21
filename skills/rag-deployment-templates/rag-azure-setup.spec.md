# SPEC: RAG Azure Setup

**GitHub Spec Kit Enterprise Compliance**

---

## 1. Overview

| Attribute | Value |
|-----------|-------|
| **Name** | rag-azure-setup |
| **Purpose** | Deploy Azure infrastructure for RAG (OpenAI, Search, AppInsights) |
| **Type** | Infrastructure Deployment Skill |
| **Tier** | 1 (Critical — foundation for all RAG deployments) |
| **Input** | Configuration (CLI args or environment) |
| **Output** | JSON with deployed resource IDs, credentials, connection strings |
| **Responsibility** | Bicep/Terraform template execution, resource validation |

---

## 2. Input/Output Contract

### 2.1 Input Schema

```json
{
  "action": "validate|deploy|destroy",
  "project_name": "rag-pokemon",
  "resource_group": "rag-pokemon-rg",
  "region": "eastus",
  "openai_model": "gpt-4o",
  "openai_capacity": 200,
  "search_sku": "standard",
  "search_replicas": 1,
  "logs_retention_days": 30,
  "subscription_id": "8e6ace56-e0f2-4071-825a-a20363df34f8",
  "dry_run": false
}
```

**Required Fields:**
- `action`: One of {validate, deploy, destroy}
- `project_name`: Name for the RAG project
- `resource_group`: Azure RG name
- `region`: Azure region (eastus, westus2, etc.)

**Optional Fields:**
- `openai_model`: Default gpt-4o
- `openai_capacity`: Default 200 TPM
- `search_sku`: Default standard
- `search_replicas`: Default 1
- `logs_retention_days`: Default 30
- `dry_run`: Default false

### 2.2 Output Schema

```json
{
  "timestamp": "2026-05-15T14:30:00Z",
  "action": "deploy",
  "status": "success|error",
  "duration_seconds": 300,
  "result": {
    "resource_group": "rag-pokemon-rg",
    "resources_created": [
      {
        "type": "Microsoft.CognitiveServices/accounts",
        "name": "rag-pokemon-openai",
        "id": "/subscriptions/.../rag-pokemon-openai",
        "properties": {
          "endpoint": "https://rag-pokemon-openai.openai.azure.com/",
          "model": "gpt-4o"
        }
      },
      {
        "type": "Microsoft.Search/searchServices",
        "name": "rag-pokemon-search",
        "id": "/subscriptions/.../rag-pokemon-search",
        "properties": {
          "sku": "standard",
          "replicas": 1,
          "replicaCount": 1
        }
      },
      {
        "type": "Microsoft.Insights/components",
        "name": "rag-pokemon-insights",
        "id": "/subscriptions/.../rag-pokemon-insights"
      }
    ],
    "connection_strings": {
      "openai_endpoint": "https://rag-pokemon-openai.openai.azure.com/",
      "openai_key": "***REDACTED***",
      "search_endpoint": "https://rag-pokemon-search.search.windows.net/",
      "search_key": "***REDACTED***",
      "insights_key": "***REDACTED***"
    },
    "estimated_monthly_cost_usd": 95
  },
  "error": null,
  "metadata": {
    "deployment_id": "deployment-20260515-143000",
    "template_version": "1.0.0",
    "bicep_file": ".github/skills/rag-deployment-templates/rag-infra.bicep"
  }
}
```

---

## 3. Success Criteria

### 3.1 Functional Requirements

| Requirement | Success Metric | Validation |
|---|---|---|
| **Deploy all 3 services** | OpenAI + Search + AppInsights created | Verify in Azure portal |
| **Validate region support** | Region has all 3 services available | Query SKU availability API |
| **Apply quotas** | Check subscription quotas before deploy | 0 deployment failures due to quota |
| **Generate credentials** | Connection strings saved to `.env` | `.env` file has all 6 keys |
| **Cost estimation** | Monthly cost within ±10% of actual | Verify vs Azure Cost Management |
| **Dry-run support** | dry_run=true shows plan without deploying | No Azure resources created |
| **Error messages** | Failures include remediation steps | User can fix issue independently |
| **JSON output** | Valid JSON, parseable by agents | Schema validation passes |

### 3.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|---|---|---|
| **Deployment time** | < 10 minutes | Timer in logs |
| **Bicep validation** | < 30 seconds | Az bicep lint |
| **Idempotency** | Re-deploy is safe (no duplicates) | Run twice, same result |
| **Rollback support** | Can destroy all resources cleanly | `action=destroy` leaves no orphans |

---

## 4. Error Handling Table

| Error Code | Condition | Recovery | Retry? |
|---|---|---|---|
| `REGION_NOT_SUPPORTED` | Region missing a required service | Suggest alternative regions | No |
| `QUOTA_EXCEEDED` | Subscription quota too low | Request quota increase | No |
| `RESOURCE_EXISTS` | Resource already exists | Reuse existing or delete first | No |
| `INVALID_REGION` | Typo in region name | Show valid regions | No |
| `BICEP_SYNTAX_ERROR` | Template has errors | Fix template, retry | Yes |
| `DEPLOYMENT_TIMEOUT` | Azure takes > 10 min | Retry with same config | Yes |
| `AUTHENTICATION_FAILED` | Invalid Azure credentials | Run `az login` again | No |
| `PERMISSION_DENIED` | No Contributor role | Request RBAC role | No |

---

## 5. Integration Points

### Called By
- **rag-onboarding.agent.md** — Phase 4 (Deploy Infrastructure)
- **Manual deployment** — CLI invocation

### Calls
- **Azure CLI** (`az deployment group create`)
- **Bicep templates** (`.github/skills/rag-deployment-templates/`)

### Output Consumed By
- **rag-indexer-specialist.agent.md** — Reads connection strings
- **rag-chat.agent.md** — Uses deployed services
- **.env configuration** — Stores credentials

---

## 6. Release Gates

- [ ] **Bicep validation** — `az bicep lint` passes
- [ ] **Dry-run test** — No resources created
- [ ] **Quota check** — Handles quota exceeded gracefully
- [ ] **Error messages** — Include remediation
- [ ] **Cost accuracy** — ± 10% of actual
- [ ] **Connection strings** — All 6 keys in `.env`
- [ ] **Idempotency** — Safe to deploy twice
- [ ] **Rollback** — destroy action cleans up

---

## 7. Testing Strategy

```bash
# Unit test: Validate Bicep template
az bicep lint .github/skills/rag-deployment-templates/rag-infra.bicep

# Integration test: Dry-run deployment
python rag-azure-setup.py \
  --action validate \
  --project-name test-pokemon \
  --resource-group test-rg \
  --region eastus \
  --dry-run

# Manual test: Actual deployment (staging)
python rag-azure-setup.py \
  --action deploy \
  --project-name stage-pokemon \
  --resource-group stage-rg \
  --region eastus

# Cleanup: Destroy resources
python rag-azure-setup.py \
  --action destroy \
  --project-name stage-pokemon \
  --resource-group stage-rg
```

---

## 8. Version & Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-05-15 | Initial Spec Kit release |

---

**Status:** ENTERPRISE READY — Spec Kit Compliant
**Last Updated:** 2026-05-15
