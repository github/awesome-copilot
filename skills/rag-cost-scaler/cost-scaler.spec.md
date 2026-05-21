# SPEC: RAG Cost Scaler

**GitHub Spec Kit Enterprise Compliance**

---

## 1. Overview

| Attribute | Value |
|-----------|-------|
| **Name** | rag-cost-scaler |
| **Purpose** | Manage Azure RAG infrastructure costs dynamically post-deployment |
| **Type** | Infrastructure Management Skill |
| **Tier** | 1 (Critical — other teams depend on this) |
| **Input** | Action + Parameters (CLI or Agent) |
| **Output** | JSON with current config + cost impact + success/error |
| **Responsibility** | Cost stability, zero downtime during tier changes |

---

## 2. Input/Output Contract

### 2.1 Input Schema

```json
{
  "action": "ListTiers|ShowCurrent|ChangeTo|CreateAlerts",
  "tier": "minimal|standard|premium",
  "budget": 30,
  "resource_group": "rag-defensa-rg",
  "subscription_id": "8e6ace56-e0f2-4071-825a-a20363df34f8",
  "dry_run": false,
  "verbose": false
}
```

**Required Fields:**
- `action`: Action to execute (enum, required)
- `resource_group`: Azure RG where Search service resides (required)

**Conditional Fields:**
- `tier`: Required if action = `ChangeTo`
- `budget`: Optional, for CreateAlerts (EUR)
- `dry_run`: Optional, preview changes without applying (boolean, default: false)

**Optional Fields:**
- `subscription_id`: Override default (default: from `.env`)
- `verbose`: Enable debug output (boolean, default: false)

---

### 2.2 Output Schema

```json
{
  "timestamp": "2026-05-15T14:30:00Z",
  "action": "ListTiers",
  "status": "success|error",
  "duration_seconds": 2.5,
  "result": {
    "current_tier": "minimal",
    "current_config": {
      "search_service": "rag-defensa-search-basic",
      "search_sku": "basic",
      "search_replicas": 1,
      "logs_retention_days": 30,
      "estimated_monthly_cost_eur": 30
    },
    "available_tiers": [
      {
        "name": "minimal",
        "search_sku": "basic",
        "search_replicas": 1,
        "logs_retention_days": 30,
        "estimated_monthly_cost_eur": 30,
        "max_documents": 1000000,
        "use_case": "Dev/Testing"
      },
      {
        "name": "standard",
        "search_sku": "standard",
        "search_replicas": 2,
        "logs_retention_days": 90,
        "estimated_monthly_cost_eur": 75,
        "max_documents": 50000000,
        "use_case": "Production"
      },
      {
        "name": "premium",
        "search_sku": "premium",
        "search_replicas": 3,
        "logs_retention_days": 365,
        "estimated_monthly_cost_eur": 250,
        "max_documents": 500000000,
        "use_case": "Enterprise"
      }
    ]
  },
  "metadata": {
    "resource_group": "rag-defensa-rg",
    "subscription_id": "8e6ace56-e0f2-4071-825a-a20363df34f8",
    "region": "eastus",
    "dry_run": false,
    "action_applied": true
  },
  "error": null
}
```

**Error Response Example:**
```json
{
  "timestamp": "2026-05-15T14:30:00Z",
  "action": "ChangeTo",
  "status": "error",
  "duration_seconds": 1.2,
  "result": null,
  "error": {
    "code": "SEARCH_SERVICE_NOT_FOUND",
    "message": "Azure Search service not found in resource group 'rag-defensa-rg'",
    "remediation": "Run 'rag-azure-setup' agent first to deploy infrastructure",
    "details": {
      "searched_rg": "rag-defensa-rg",
      "subscription_id": "8e6ace56-e0f2-4071-825a-a20363df34f8"
    }
  },
  "metadata": {}
}
```

---

## 3. Success Criteria

### 3.1 Functional Requirements

| Requirement | Success Metric | Validation |
|-------------|---|---|
| **Auto-detect config** | Finds Search service in < 5 seconds | Timed, repeatable |
| **List tiers** | Returns 3 tiers with costs ± 5% | Cost validation vs Azure pricing |
| **Change tier (dry-run)** | Shows impact without applying | No Azure changes made |
| **Change tier (apply)** | Deletes old service + creates new in < 10 min | Zero downtime verified |
| **Create alerts** | Budget alerts active in < 2 min | Verified in Azure Cost Management |
| **Error handling** | All errors include remediation suggestions | Tester validates suggestions work |
| **JSON output** | Valid JSON, parseable by agents | Schema validation |

### 3.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|---|---|---|
| **Latency** | < 10 seconds for ListTiers/ShowCurrent | Timer in logs |
| **Latency** | < 5 minutes for ChangeTo | Timer in logs |
| **Error recovery** | All transient errors retry 3x | Logs show retry attempt |
| **Cost accuracy** | ± 5% vs manual Azure calculation | Cost comparison test case |
| **Logging** | All operations logged with context | Structured logs in Application Insights |

---

## 4. Error Handling Table

| Error Code | Condition | Recovery | Retry? |
|---|---|---|---|
| `SEARCH_SERVICE_NOT_FOUND` | No Search service in RG | Deploy via rag-azure-setup | No |
| `INVALID_TIER_NAME` | Tier not in {minimal, standard, premium} | Suggest valid values | No |
| `INSUFFICIENT_QUOTA` | Azure quota exceeded | Suggest different region | No |
| `TIMEOUT_AZURE_API` | Azure API slow | Retry 3x with backoff | Yes |
| `AUTHENTICATION_FAILED` | Invalid Azure credentials | Check `.env` / `az login` | No |
| `PERMISSION_DENIED` | No RBAC permission | Request role (Contributor) | No |
| `SERVICE_DELETION_FAILED` | Can't delete old Search service | Manual cleanup required | No |
| `SERVICE_CREATION_FAILED` | Can't create new Search service | Check capacity + retry | Yes |

---

## 5. Integration Points

### 5.1 Called By (Dependencies)

- **rag-onboarding.agent.md** — Phase 9 (Scale optimization) — Optional
- **Manual CLI** — Post-deployment cost management
- **rag-validate-deployment.agent.md** — Cost validation (read-only ShowCurrent)

### 5.2 Calls (Dependents)

- **Azure CLI** (`az` commands)
- **Azure Cost Management API**
- **Application Insights** (logging)

### 5.3 Output Consumed By

- **rag-onboarding.agent.md** — Displays available tiers to user
- **Cost tracking systems** — JSON stored for audit trail
- **Billing alerts** — Auto-configured budget alerts

---

## 6. Release Gates (Pre-Production)

Before deploying to production, MUST pass:

- [ ] **Functional Tests** — All 4 actions (ListTiers, ShowCurrent, ChangeTo, CreateAlerts) succeed
- [ ] **Error Handling Tests** — Invalid inputs produce correct error codes + remediation
- [ ] **Cost Accuracy Test** — Costs match ± 5% vs manual Azure calculation
- [ ] **Dry-Run Test** — dry_run=true makes NO Azure changes
- [ ] **Integration Test** — rag-onboarding.agent.md can call and parse output
- [ ] **Logging Test** — All operations logged to Application Insights (structured JSON)
- [ ] **Latency Test** — ListTiers < 10s, ChangeTo < 5 min
- [ ] **Quota Test** — Handles quota exceeded gracefully
- [ ] **RBAC Test** — Suggests correct permission if denied
- [ ] **Rollback Test** — Manual rollback from Standard → Minimal works

---

## 7. Testing Strategy

### Unit Tests
```powershell
# Auto-detection
.\cost-scaler.ps1 -Action ShowCurrent -Verbose

# Dry-run (no changes)
.\cost-scaler.ps1 -Action ChangeTo -Tier standard -DryRun $true

# Error cases
.\cost-scaler.ps1 -Action ChangeTo -Tier invalid_tier  # Expect error code
```

### Integration Tests
```python
# Python wrapper validates JSON output schema
python cost-scaler-wrapper.py --action ListTiers --validate-schema

# JSON parseable by agents
python -m json.tool outputs/cost-scaler-result.json
```

### Manual Validation
- [ ] Dry-run shows correct cost difference
- [ ] Apply ChangeTo: old service deleted, new created
- [ ] Azure alert received for budget threshold
- [ ] Application Insights has structured logs

---

## 8. Version & Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-05-15 | Initial Spec Kit release |

---

## 9. Support & Escalation

**Issues/Questions?**
- Check `.github/skills/rag-cost-scaler/README.md` for troubleshooting
- Review SKILL.md for detailed documentation
- Error messages include remediation suggestions
- For Azure-specific issues, refer to [Azure Search pricing](https://azure.microsoft.com/en-us/pricing/details/search/)

---

**Status:** ENTERPRISE READY — Spec Kit Compliant
**Maintained By:** RAG Builder Team
**Last Updated:** 2026-05-15
