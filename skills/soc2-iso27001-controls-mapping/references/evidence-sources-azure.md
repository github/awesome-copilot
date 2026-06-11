# Audit Evidence Sources — Azure Stack

Per-source reference for pulling audit evidence in an Azure estate. For each: what it contains, how long it's retained, how to query it, and what audit artifact to produce.

## Source 1 — Entra ID Sign-in & Audit Logs

**What it gives you:** authentication events (success / failure), Conditional Access decisions, password resets, MFA enforcement, app consents, admin operations.

**Default retention:** 30 days (free tier) or 90 days (P1 / P2). Export to Log Analytics for longer retention — required for Type II audits.

**KQL queries for common controls:**

```kusto
// CC6.1 — Sign-in audit for the report period
SigninLogs
| where TimeGenerated between (datetime(2026-01-01) .. datetime(2026-06-30))
| project TimeGenerated, UserPrincipalName, AppDisplayName, IPAddress, ResultType, ConditionalAccessStatus
| order by TimeGenerated desc

// CC6.2 — MFA enforcement effectiveness
SigninLogs
| where TimeGenerated > ago(90d)
| where AuthenticationRequirement == "multiFactorAuthentication"
| summarize count() by ResultType, UserPrincipalName

// CC6.5 — Privileged role activations (PIM)
AuditLogs
| where TimeGenerated > ago(90d)
| where OperationName == "Add member to role completed (PIM activation)"
| project TimeGenerated, InitiatedBy, TargetResources

// CC6.3 — User termination / access removal
AuditLogs
| where TimeGenerated > ago(90d)
| where OperationName in ("Delete user", "Remove member from role")
| project TimeGenerated, InitiatedBy, TargetResources
```

**Audit artifact:** save the query and a results-extract per period. CSV export of the query is the typical deliverable. Mask `IPAddress` if privacy scope demands.

**Configuration to verify:**

```hcl
# Diagnostic settings export Entra ID logs to Log Analytics for retention
resource "azurerm_monitor_aad_diagnostic_setting" "entra" {
  name                       = "entra-to-loganalytics"
  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.audit.id

  enabled_log { category = "SignInLogs" }
  enabled_log { category = "AuditLogs" }
  enabled_log { category = "NonInteractiveUserSignInLogs" }
  enabled_log { category = "ServicePrincipalSignInLogs" }
  enabled_log { category = "ManagedIdentitySignInLogs" }
}
```

## Source 2 — Azure Activity Log

**What it gives you:** subscription-level operations: resource creation / modification / deletion, role assignments, policy changes, alerts fired.

**Default retention:** 90 days. Export to Log Analytics for longer.

**KQL queries:**

```kusto
// CC8.1 — Resource changes (audit period)
AzureActivity
| where TimeGenerated > ago(90d)
| where ActivityStatusValue == "Success"
| where OperationNameValue startswith "MICROSOFT.RESOURCES/"
   or OperationNameValue contains "/WRITE"
| project TimeGenerated, Caller, OperationNameValue, ResourceGroup, _ResourceId
| order by TimeGenerated desc

// CC6.5 — Role assignments granted / revoked
AzureActivity
| where OperationNameValue == "Microsoft.Authorization/roleAssignments/write"
   or OperationNameValue == "Microsoft.Authorization/roleAssignments/delete"
| project TimeGenerated, Caller, ResourceGroup, OperationNameValue
```

**Configuration:**

```hcl
resource "azurerm_monitor_diagnostic_setting" "activity_log" {
  name                       = "activity-to-loganalytics"
  target_resource_id         = "/subscriptions/${var.subscription_id}"
  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.audit.id

  enabled_log { category = "Administrative" }
  enabled_log { category = "Security" }
  enabled_log { category = "Alert" }
  enabled_log { category = "Policy" }
}
```

## Source 3 — Azure Monitor / Log Analytics

**What it gives you:** application logs, custom queries, alert history, metric-based queries.

**Default retention:** workspace-configurable (90 days standard, up to 730 days; archive tier extends to 7 years).

**KQL queries:**

```kusto
// CC7.2 — Alert history for the report period
AzureMetricsV2
| where MetricName == "ResultCount"   // depends on the alert query
| where TimeGenerated > ago(90d)
| summarize count() by AlertName, Severity, bin(TimeGenerated, 1d)

// CC7.5 — Incident response times (when integrated via webhook)
AzureMonitorAlertHistory
| where TimeGenerated > ago(90d)
| project TimeGenerated, AlertName, FiredAt, ResolvedAt, Severity, AcknowledgedBy
```

For per-application application logs, the table name is `<service-name>_CL` (custom log) or auto-ingested via Application Insights. Check that:
- Each service writes structured JSON
- Each service's resource attributes (`service.name`, `service.namespace`) flow into Log Analytics
- Alert configurations are committed to IaC (`infra/observability/`)

**Configuration:**

```hcl
resource "azurerm_log_analytics_workspace" "audit" {
  name                       = "log-audit"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.audit.name
  sku                        = "PerGB2018"
  retention_in_days          = 365     # 1 year for SOC 2 / ISO 27001 audit period
  daily_quota_gb             = 50

  internet_ingestion_enabled = false
  internet_query_enabled     = false
}
```

For data older than `retention_in_days`, move to **Storage account archive tier** via export rules:

```hcl
resource "azurerm_log_analytics_data_export_rule" "archive" {
  name                    = "audit-archive"
  resource_group_name     = azurerm_resource_group.audit.name
  workspace_resource_id   = azurerm_log_analytics_workspace.audit.id
  destination_resource_id = azurerm_storage_account.audit_archive.id
  enabled                 = true
  table_names             = ["SigninLogs", "AuditLogs", "AzureActivity"]
}
```

## Source 4 — Microsoft Defender for Cloud

**What it gives you:** security posture (Secure Score), regulatory compliance dashboard (SOC 2, ISO 27001, PCI, NIST, CIS, etc.), recommendation list, vulnerability findings.

**Retention:** posture is live; recommendations have current state but no history by default. Export to Log Analytics for historical trending.

**Key artifacts:**

1. **Secure Score over time** — `Recommendation Score` table in Log Analytics, trended quarterly.
2. **Regulatory compliance dashboard** — Defender → Regulatory compliance → SOC 2 / ISO 27001. Each control shows green / yellow / red with the failing resources listed.
3. **Vulnerability findings** — `SecurityRecommendation` / `SecurityIncident` tables.

**KQL queries:**

```kusto
// Secure Score trend
SecureScores
| where TimeGenerated > ago(180d)
| summarize avg(CurrentScore) by bin(TimeGenerated, 1d)

// Compliance state per control
RegulatoryComplianceState
| where ComplianceStandard == "SOC2"   // or "ISO27001"
| project ComplianceStandard, ComplianceControl, ComplianceState, FailedResources

// Critical findings open longer than 7 days
SecurityRecommendation
| where Severity == "High"
| where RecommendationState != "Resolved"
| where TimeGenerated < ago(7d)
| project RecommendationName, ResourceId, Severity, RecommendationState
```

**Configuration:**

- Enable Defender for Cloud at the subscription level (free tier provides basic CSPM; "Defender CSPM" plan gives the regulatory compliance dashboard for relevant standards)
- Enable Defender for Servers, Defender for Containers, Defender for Key Vault, Defender for SQL — per the services you run
- Enable Defender for Cloud → Regulatory compliance → add SOC 2 Type 2 and ISO 27001 standards

**Audit artifact:** quarterly export of the regulatory compliance dashboard. Defender has built-in PDF / CSV export from the portal.

## Source 5 — Microsoft Sentinel (if in use)

**What it gives you:** SIEM correlation, incident records with workflow (assignment, status, resolution), threat-hunting queries.

**Sentinel is built on Log Analytics**, so all KQL works the same; Sentinel adds the incident management and analytics-rule infrastructure on top.

For SOC 2 / ISO 27001, Sentinel is most useful for:

- **CC7.3 — Anomaly detection** — Sentinel analytics rules + UEBA
- **CC7.5 — Incident response** — Sentinel incidents with assignment + resolution timestamps
- **A.5.24–A.5.27 — Incident management** — same

**KQL queries:**

```kusto
// CC7.5 — Incident response times
SecurityIncident
| where TimeGenerated > ago(90d)
| project IncidentName, Severity, Status, CreatedTime, ClosedTime,
          MeanTimeToResolution = ClosedTime - CreatedTime
| where Status == "Closed"
```

Sentinel is optional; small estates can satisfy SOC 2 / ISO 27001 with Defender + Log Analytics alone. Reach for Sentinel when the volume of alerts and need for cross-source correlation warrants it.

## Source 6 — Terraform State + Git History

**What it gives you:** point-in-time configuration of every resource; commit history showing change-over-time.

**Retention:** git history is permanent (assuming you don't rewrite); Terraform state files are kept indefinitely in the Storage backend (with soft-delete / versioning).

**Audit artifacts:**

```bash
# Current resource configuration
terraform show -json > tf-state-current.json

# Filter for specific compliance evidence: encryption at rest on data resources
jq '.values.root_module.resources[] | select(.type | startswith("azurerm_postgresql") or startswith("azurerm_storage_account")) | {name: .name, type: .type, encrypted: .values.encryption // .values.infrastructure_encryption_enabled}' tf-state-current.json

# Commit history for compliance-relevant files
git log --since="1 year ago" --oneline -- infra/

# Per-file blame to identify ownership of compliance config
git blame infra/main.tf | grep "encryption\|public_network_access"
```

The git history of `infra/` is the strongest evidence chain for IaC-driven controls — every change is timestamped, authored, code-reviewed, and reproducible.

**Configuration:** Terraform state in Azure Storage with versioning enabled:

```hcl
resource "azurerm_storage_account" "tfstate" {
  name                     = "sttfstateprod"
  ...
  blob_properties {
    versioning_enabled = true
    delete_retention_policy { days = 90 }
    container_delete_retention_policy { days = 90 }
  }
}
```

## Putting it together — the audit-evidence pack structure

```
compliance/
├── soc2-scope.md                         # In-scope services, environments, audit period
├── soc2-tsc-mapping/
│   ├── cc1.1-control-environment.md
│   ├── cc6.1-logical-access.md           # Implementation + KQL query + sample artifact
│   ├── cc6.6-encryption-at-rest.md
│   ├── cc7.2-monitoring-alerting.md
│   ├── cc8.1-change-management.md
│   └── ...                                # One file per applicable CC
├── iso27001-soa.md                        # Statement of Applicability
├── iso27001-annex-a/
│   ├── a.5.15-access-control.md          # (often pointers to soc2-tsc-mapping/)
│   └── ...
├── policies/
│   ├── information-security-policy.md
│   ├── acceptable-use.md
│   ├── data-classification.md
│   ├── incident-response.md
│   └── change-management.md
├── evidence/
│   ├── 2026-q1-defender-compliance-export.pdf
│   ├── 2026-q1-secure-score.csv
│   ├── 2026-q1-pr-merge-export.csv
│   ├── 2026-q1-incident-records.csv
│   └── ...                                # Quarterly snapshots
└── runbooks/
    ├── defender-finding-triage.md
    ├── incident-response.md
    └── restore-test-procedure.md
```

This structure is the auditor's mental model: scope → controls → evidence per control → standing policies → quarterly artifacts. Keep it; update quarterly; the third audit takes a third of the time of the first because the structure is already correct.

## Anti-pattern — manually-collected evidence at audit time

**Bad:** "We have an audit next week. Let me go pull the Entra ID logs, screenshot the Defender dashboard, count the PRs from the last quarter…"

**Why it fails:** point-in-time evidence collection makes the audit a sprint instead of a process. Quality drops (rushed exports, missing artifacts), the auditor finds gaps, and the next audit starts the same scramble.

**Fix:** automate the quarterly evidence pull. A workflow that runs the KQL queries, exports Defender compliance, snapshots Terraform state, and drops everything into `compliance/evidence/<quarter>/` runs on the first day of each quarter. The audit-time work shrinks to "review what's already there."

## Re-verification

Evidence sources, retention defaults, KQL table names, and Defender feature names change. Re-verify against the current Microsoft Learn documentation quarterly — stale queries discovered during an audit are themselves a finding.
