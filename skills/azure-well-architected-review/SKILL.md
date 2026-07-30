---
name: azure-well-architected-review
description: 'Perform an Azure Well-Architected Framework review of the current workload IaC and architecture, generating findings and GitHub issues for improvements.'
---

# Azure Well-Architected Review

This workflow performs a structured Azure Well-Architected Framework (WAF) review against your workload's IaC files and deployed infrastructure. It identifies risks across all 5 WAF pillars and creates GitHub issues to track remediation.

## Prerequisites
- Azure CLI (`az`) configured and authenticated
- IaC files present in the repository (Bicep, Terraform, or ARM templates)
- GitHub MCP server configured and authenticated

## Workflow Steps

### Step 1: Load Well-Architected Framework Reference
Fetch current Azure WAF best practices:
- `https://learn.microsoft.com/en-us/azure/well-architected/`
- Service guides for the Azure services in use (`https://learn.microsoft.com/en-us/azure/well-architected/service-guides/`)
- Workload-specific guidance relevant to the workload type (SaaS, mission-critical, AI, etc.)

If the `microsoft.docs.mcp` MCP server is available, use it to query the latest pillar checklists and service-specific recommendations.

### Step 2: Discover IaC & Architecture
Establish the review scope, then inventory both the code and the live environment:

1. **Confirm the Azure scope**: Ask the user which subscription(s)/resource group(s) are in scope, or infer them from IaC parameters and confirm.
2. **Scan the repository for IaC files**:
   - Bicep: `**/*.bicep`, `bicepconfig.json`
   - Terraform: `**/*.tf` (azurerm/azapi providers)
   - ARM templates: `**/azuredeploy*.json`, `**/*.template.json`, files with `$schema` containing `deploymentTemplate`
3. **Inventory live resources** (always, even when IaC exists): `az resource list --resource-group <rg> --output json` (or subscription-wide), plus targeted `az <service> show` calls for configuration details the pillar checks need.
4. **Compare IaC with live inventory**: Flag drift — resources present in Azure but absent from IaC (portal-created), resources defined in IaC but not deployed, and configuration mismatches. Record drift findings for Step 3 (they typically map to the Operational Excellence pillar).

Identify key Azure services in use (compute, data, networking, security, observability) and generate a Mermaid architecture diagram.

### Step 3: Pillar-by-Pillar Review

#### Pillar 1: Reliability
- [ ] Availability zones enabled for zonal services (VMs, VMSS, AKS node pools, App Service, SQL, Storage ZRS)
- [ ] Production SKUs support the required SLA (no Basic/Free tiers on critical paths)
- [ ] Azure SQL / Cosmos DB backup and point-in-time restore configured with appropriate retention
- [ ] Geo-redundancy configured where RPO requires it (GRS/RA-GRS storage, SQL failover groups, Cosmos DB multi-region)
- [ ] Autoscale rules configured for App Service plans, VMSS, AKS (no fixed single instance for production)
- [ ] Health probes configured on Load Balancer / Application Gateway / Front Door backends
- [ ] Dead-lettering enabled for Service Bus queues/subscriptions and Event Grid subscriptions
- [ ] Retry policies with exponential backoff implemented for transient fault handling
- [ ] Disaster recovery plan defined (documented RTO/RPO, tested failover)

#### Pillar 2: Security
- [ ] Managed identities used instead of service principals with secrets or connection strings
- [ ] No hardcoded credentials, keys, or connection strings in IaC or code
- [ ] Secrets stored in Azure Key Vault with RBAC authorization (not access policies)
- [ ] Storage accounts deny public blob access and disallow shared key access where possible
- [ ] Private endpoints (or at minimum service endpoints + firewall rules) for PaaS data services
- [ ] NSGs restrict inbound traffic to minimum required ports/CIDRs (no `*` → `*` allow rules)
- [ ] TLS 1.2+ enforced on all endpoints (`minimumTlsVersion`, `httpsOnly`)
- [ ] Azure RBAC follows least privilege (no Owner/Contributor at subscription scope for workload identities)
- [ ] Microsoft Defender for Cloud enabled on relevant resource types (`az security pricing list`)
- [ ] Azure WAF (Application Gateway or Front Door) configured for public-facing web endpoints
- [ ] Diagnostic settings send security logs to Log Analytics / Microsoft Sentinel

#### Pillar 3: Cost Optimization
- [ ] Reservations or savings plans evaluated for steady-state compute (VMs, App Service, SQL)
- [ ] Storage lifecycle management policies move blobs to cool/archive tiers
- [ ] Right-sized SKUs based on actual utilization (no oversized VMs/App Service plans)
- [ ] Dev/test environments use auto-shutdown schedules and Dev/Test pricing where eligible
- [ ] Azure Budgets and cost alerts configured (`az consumption budget list`)
- [ ] Unattached managed disks and orphaned public IPs identified and removed
- [ ] Consumption/serverless tiers used for spiky or low-volume workloads (Functions, Container Apps, SQL serverless)
- [ ] Log Analytics retention and data-cap settings tuned to avoid ingestion overruns

#### Pillar 4: Operational Excellence
- [ ] All infrastructure defined as IaC (no manual portal changes; deny assignments or policy where feasible)
- [ ] Consistent tagging strategy applied across all resources (owner, environment, cost center)
- [ ] Azure Monitor alerts defined for key metrics and service health
- [ ] Automated deployment pipeline present (GitHub Actions / Azure Pipelines, no manual deployments)
- [ ] Azure Activity Log and resource diagnostic settings routed to Log Analytics
- [ ] Application Insights (or OpenTelemetry equivalent) instrumented for application workloads
- [ ] Azure Policy assignments enforce organizational standards (allowed locations, SKUs, tags)
- [ ] Runbooks or operational documentation present

#### Pillar 5: Performance Efficiency
- [ ] Right-sized compute SKUs validated against load requirements
- [ ] Caching implemented where beneficial (Azure Cache for Redis, CDN/Front Door caching)
- [ ] Azure Front Door or CDN used for global static content delivery
- [ ] Autoscale based on load metrics rather than fixed instance counts
- [ ] Database performance tier appropriate (DTU vs vCore, elastic pools, Cosmos DB RU autoscale)
- [ ] Premium/zone-redundant storage used for latency-sensitive disk workloads
- [ ] Connection pooling and async patterns used for database and HTTP clients

### Step 4: Risk Classification
For each finding, classify:
- **High Risk**: Security vulnerability, single point of failure, no backup/recovery
- **Medium Risk**: Suboptimal reliability, cost inefficiency, performance concern
- **Low Risk**: Best practice deviation, minor optimization opportunity

### Step 5: User Confirmation

```
🏗️ Azure Well-Architected Review Summary

📊 Review Results:
• IaC Files Analyzed: X
• Azure Services Identified: Y
• Total Findings: Z
  • High Risk: A (immediate action required)
  • Medium Risk: B (should address soon)
  • Low Risk: C (nice to have)

🔴 Top High Risk Findings:
1. [Pillar]: [Finding] — [Why it matters]
2. [Pillar]: [Finding] — [Why it matters]

💡 This will create Z individual GitHub issues + 1 EPIC issue.

❓ Proceed with creating GitHub issues? (y/n)
```

**Gate**: Only proceed to Steps 6–7 if the user gives an explicit affirmative response (e.g. "y", "yes"). On a negative, ambiguous, or missing response, do **not** create any GitHub issues — output the full findings as formatted markdown to the console and stop.

### Step 6: Create Individual Finding Issues
Label with "well-architected" and the pillar name (e.g., "security", "reliability").

**Title**: `[WAF-<PILLAR>] [Brief Finding] — [Risk Level]`

**Body**:
````markdown
## 🏗️ Well-Architected Finding: [Brief Title]

**Pillar**: [Name] | **Risk Level**: [High/Medium/Low] | **Effort**: [Low/Medium/High]

### 📋 Description
[Clear explanation of the finding and why it matters]

### 🔧 Remediation

**IaC Fix** (preferred):
```bicep
// Bicep example
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: { name: 'Standard_ZRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}
```

**Azure CLI fallback**:
```bash
az storage account update --name <name> --resource-group <rg> \
  --min-tls-version TLS1_2 --allow-blob-public-access false --https-only true
```

### 📚 Azure Reference
- [WAF Best Practice Link]
- [Microsoft Learn Documentation Link]

### ✅ Validation
- [ ] Change implemented in IaC and deployed
- [ ] Azure Policy compliance passes (if applicable)
- [ ] Microsoft Defender for Cloud recommendation resolved (if applicable)

**Well-Architected Recommendation**: [WAF checklist item this maps to]
````

### Step 7: Create EPIC Tracking Issue
Label with "well-architected" and "epic".

**Title**: `[EPIC] Azure Well-Architected Review — X findings across 5 pillars`

**Body**: Executive summary with pillar breakdown table (finding counts by pillar and risk level), Mermaid architecture diagram, prioritized checklist linking all individual issues (High → Medium → Low), and success criteria:
- All High-risk findings resolved
- Medium findings have accepted mitigation plans
- No regression in existing Azure Monitor alerts or Azure Policy compliance

## Error Handling
- **No IaC Files Found**: Limit review to live resource discovery via Azure CLI (`az resource list`) and note the gap
- **Insufficient Azure Permissions**: List required read-only roles for the review (Reader, Security Reader)
- **GitHub Creation Failure**: Output all findings as formatted markdown to console

## Success Criteria
- ✅ All 5 WAF pillars reviewed against IaC and live infrastructure
- ✅ All findings classified by risk level and pillar
- ✅ Actionable remediation steps with IaC examples for each finding
- ✅ GitHub issues created for team tracking
- ✅ Architecture diagram generated for EPIC context
- ✅ Microsoft Learn documentation references included
