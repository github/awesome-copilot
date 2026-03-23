---
description: |
  This workflow performs comprehensive Terraform security and best practices scanning.
  It analyzes Terraform files for security vulnerabilities, hardcoded secrets, misconfigurations,
  and compliance issues, then generates a detailed security report as a GitHub issue.

on:
  schedule: daily
  workflow_dispatch:

permissions:
  contents: read
  issues: read
  pull-requests: read

network: defaults

tools:
  github:
    lockdown: false

safe-outputs:
  create-issue:
    title-prefix: "[Terraform Security] "
    labels: [terraform-security, security-scan, infrastructure]
engine: copilot
---

# Terraform Security & Best Practices Agent

Perform a comprehensive security analysis of all Terraform code in the repository and generate a detailed security report as a GitHub issue.

## 🔍 Security Checks to Perform

### 1. **Secrets & Credentials Scanning**
Scan all `.tf` files for:
- Hardcoded AWS Access Keys (AKIA*, AWS_ACCESS_KEY_ID)
- Azure subscription IDs, client secrets, tenant IDs
- GCP service account keys
- API tokens, passwords, or connection strings
- Private keys or certificates
- Database credentials
- Any Base64-encoded secrets

**Flag with HIGH severity** if found, even if marked as "dummy" or "example".

### 2. **Network Security Issues**
Check for:
- Overly permissive CIDR blocks (`0.0.0.0/0` in security groups)
- Public IP addresses on sensitive resources
- Missing network ACLs or firewall rules
- Unencrypted network traffic (HTTP instead of HTTPS)
- VPN/VNet configurations exposing internal services
- Missing private endpoints for PaaS services

### 3. **Encryption & Data Protection**
Verify that:
- Storage accounts have encryption at rest enabled
- Databases use TLS/SSL for connections
- Key vaults are properly configured
- Disk encryption is enabled for VMs
- Backup encryption is configured
- Customer-managed keys (CMK) are used where required

### 4. **Identity & Access Management**
Analyze:
- Overly permissive IAM/RBAC roles
- Missing principle of least privilege
- Service principals with Owner/Contributor roles
- Shared access signatures (SAS) with long expiration
- Missing managed identities where applicable
- Wildcard permissions in policies

### 5. **Compliance & Configuration**
Check for:
- Missing required tags (environment, owner, cost-center, compliance)
- Resources without proper naming conventions
- Soft delete not enabled on critical resources
- Audit logging disabled
- Public network access enabled unnecessarily
- Missing resource locks on production resources

### 6. **Terraform Best Practices**
Validate:
- Module versions are pinned (not using `latest`)
- Backend configuration is secure (no hardcoded values)
- Variables have proper descriptions and validation
- Outputs don't expose sensitive values
- State file encryption is configured
- `.terraform.lock.hcl` is committed

### 7. **Cost Analysis & Optimization**
Analyze and estimate for serverless architecture:

- **Serverless Compute Costs**: Lambda/Azure Functions, execution time & memory
  - Total number of invocations per month
  - Average execution duration and memory allocation
  - Cold start optimization opportunities
  - Overprovisioned memory configurations (128MB vs 512MB impact)
  - ARM vs x86 architecture cost savings (AWS Lambda)
  
- **Message Queue Costs**: SQS, SNS, Azure Service Bus, Event Grid
  - Number of messages per month (requests)
  - Message size and data transfer implications
  - Standard vs FIFO queues cost difference (SQS)
  - Dead letter queue storage costs
  - SNS topic publish operations and subscriptions
  - Event Grid publish operations and event delivery costs
  
- **API & Gateway Costs**: API Gateway, Azure API Management, Azure Front Door
  - Number of API requests per month
  - REST vs HTTP API cost difference (AWS)
  - WebSocket connections if applicable
  - Caching enabled/disabled impact
  - Request/response payload sizes
  
- **Storage Costs**: S3, Azure Blob Storage, DynamoDB, Cosmos DB
  - Storage tier usage (Hot, Cool, Archive, Intelligent Tiering)
  - Request costs (GET, PUT, LIST operations)
  - Data retrieval costs from Cool/Archive tiers
  - DynamoDB read/write capacity units (provisioned vs on-demand)
  - Storage redundancy levels (LRS vs GRS)
  
- **Database & State Management**: DynamoDB, Cosmos DB, Table Storage
  - Provisioned vs on-demand capacity mode
  - Read/Write capacity units and auto-scaling
  - Global tables/replication costs
  - Backup and restore costs
  
- **Orchestration Costs**: Step Functions, Logic Apps, EventBridge
  - Number of state transitions (Step Functions)
  - Logic Apps action executions
  - EventBridge custom bus and rule evaluations
  
- **Observability Costs**: CloudWatch, Application Insights, Log Analytics
  - Logs ingestion volume (GB/month)
  - Metrics and custom metrics count
  - Log retention periods
  - Query/analytics costs
  - Distributed tracing costs (X-Ray, App Insights)
  
- **Data Transfer Costs**: Inter-service, inter-region, internet egress
  - Data transfer between availability zones
  - Cross-region data transfer
  - Data transfer to internet
  - VPC/VNet peering costs
  - NAT Gateway data processing
  
- **Key Vault & Secrets Management**: Key Vault operations, Secrets Manager
  - Number of secret retrievals per month
  - Standard vs Premium tier (HSM-backed keys)
  - Rotation operations
  - Parameter Store vs Secrets Manager (AWS)

**Serverless Cost Optimization Opportunities**:
- Functions with excessive memory allocation (right-sizing)
- Dead code or rarely invoked functions (clean up)
- Missing reserved capacity for predictable workloads
- Inefficient polling patterns (consider event-driven)
- Long-running functions that could be split
- Missing SQS batch processing (reduce invocations)
- CloudWatch logs without retention policies (unlimited storage)
- Missing S3 lifecycle policies
- DynamoDB tables without auto-scaling
- Development/staging using same tier as production

**Provide Monthly Cost Estimate**:
- Calculate estimated monthly cost for each service category
- Show cost per million invocations/requests
- Identify top 5 most expensive services
- Estimate data transfer costs between services
- Suggest cost savings opportunities with potential savings amount
- Flag unusual usage patterns that could cause cost spikes

## 📊 Report Structure

Generate a GitHub issue with the following sections:

```markdown
## 🛡️ Terraform Security Scan Report

**Scan Date**: {current_date}
**Files Scanned**: {count_of_tf_files}
**Findings**: {total_issues_found}

---

### 🚨 Critical Issues (P0)
{List all critical security vulnerabilities that need immediate action}

### ⚠️ High Priority Issues (P1)
{Security misconfigurations that should be fixed soon}

### 💡 Medium Priority Issues (P2)
{Best practices and compliance recommendations}

### ✅ Low Priority / Informational
{Minor improvements and style suggestions}

---

### � Cost Analysis & Estimates

**Estimated Monthly Infrastructure Cost**: ${estimated_total_cost}

#### Top 5 Most Expensive Resources/Services
1. **{lambda_function_name}** (Lambda/Azure Function): ~${monthly_cost}/month
   - Invocations: {count}M/month
   - Avg Duration: {ms}ms, Memory: {mb}MB
   - Cost Driver: {high_invocation_rate / over_provisioned_memory / long_duration}

2. **{dynamodb_table}** (DynamoDB/Cosmos DB): ~${monthly_cost}/month
   - Capacity Mode: {provisioned/on-demand}
   - Read/Write Units: {rcu}/{wcu}
   - Cost Driver: {over_provisioned_capacity / high_storage}

3. **{api_gateway}** (API Gateway/API Management): ~${monthly_cost}/month
   - Requests: {count}M/month
   - Cost Driver: {high_request_volume / missing_caching}

4. **{cloudwatch_logs}** (CloudWatch/Log Analytics): ~${monthly_cost}/month
   - Log Ingestion: {gb}GB/month
   - Cost Driver: {verbose_logging / no_retention_policy}

5. **{data_transfer}** (Data Transfer): ~${monthly_cost}/month
   - Transfer Volume: {gb}GB/month
   - Cost Driver: {inter_region_calls / inefficient_data_flow}

#### 💡 Cost Optimization Opportunities
| Resource | Current Cost | Potential Savings | Recommendation |
|----------|-------------|-------------------|----------------|
| {lambda_function} | ${current}/mo | ${savings}/mo | Reduce memory from 1024MB to 512MB; optimize cold starts |
| {dynamodb_table} | ${current}/mo | ${savings}/mo | Switch from provisioned to on-demand mode for variable workloads |
| {cloudwatch_logs} | ${current}/mo | ${savings}/mo | Set 7-day retention for debug logs, 30 days for app logs |
| {sqs_queue} | ${current}/mo | ${savings}/mo | Implement batching to reduce Lambda invocations by 80% |
| {step_function} | ${current}/mo | ${savings}/mo | Use Express workflows for high-volume, short-duration tasks |

**Total Potential Monthly Savings**: ~${total_savings}/month (${percentage}% reduction)

#### Cost Breakdown by Category
- ⚡ **Serverless Compute** (Lambda/Functions): ${compute_cost}/month ({percentage}%)
  - Total invocations: {count}M/month
  - Avg duration: {ms}ms, Avg memory: {mb}MB
- 📨 **Messaging** (SQS/SNS/EventGrid/ServiceBus): ${messaging_cost}/month ({percentage}%)
  - Total messages: {count}M/month
- 🌐 **API Gateway/Management**: ${api_cost}/month ({percentage}%)
  - Total requests: {count}M/month
- 💾 **Storage** (S3/Blob/DynamoDB): ${storage_cost}/month ({percentage}%)
- 📊 **Orchestration** (Step Functions/Logic Apps): ${orchestration_cost}/month ({percentage}%)
- 📈 **Observability** (CloudWatch/App Insights): ${observability_cost}/month ({percentage}%)
- 🌍 **Data Transfer**: ${transfer_cost}/month ({percentage}%)
- 🔐 **Security & Secrets**: ${security_cost}/month ({percentage}%)

#### ⚠️ Cost Risk Flags
- Functions without memory optimization (over/under-provisioned)
- High cold start rates increasing duration costs
- CloudWatch logs without retention policies (unlimited growth)
- Missing SQS/SNS message batching
- Synchronous invocations that could be async
- No reserved capacity for predictable workloads
- DynamoDB tables in provisioned mode with low utilization
- Missing S3/Blob lifecycle policies
- Excessive inter-region data transfer
- Development environments without usage limits

---

### 📈 Security Score
**Overall Score**: {calculate_score}/100

**Score Breakdown**:
- Secrets Management: {score}/20
- Network Security: {score}/20
- Encryption: {score}/20
- IAM/RBAC: {score}/20
- Compliance: {score}/20

---

### 🎯 Top 3 Recommended Actions
1. {most_critical_action}
2. {second_critical_action}
3. {third_critical_action}

---

### 🔐 Expert Security Advice
{One expert terraform security tip with emoji}

---

### 💡 Expert Cost Optimization Tip
{One expert serverless cost optimization tip with emoji - e.g., Lambda memory tuning, SQS batching, DynamoDB capacity modes, etc.}

---

### 📚 Resources
- [Azure Security Best Practices](https://docs.microsoft.com/azure/security/)
- [Terraform Security Documentation](https://www.terraform.io/docs/language/values/sensitive.html)
- [CIS Azure Foundations Benchmark](https://www.cisecurity.org/benchmark/azure)
- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [Azure Functions Pricing](https://azure.microsoft.com/pricing/details/functions/)
- [AWS Serverless Cost Optimization](https://aws.amazon.com/blogs/compute/operating-lambda-performance-optimization-part-2/)
- [Azure Cost Management Best Practices](https://docs.microsoft.com/azure/cost-management-billing/)
- [Serverless Cost Calculator](https://cost-calculator.bref.sh/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
```

## 🎨 Style Guidelines

- Use clear severity levels: 🚨 CRITICAL, ⚠️ HIGH, 💡 MEDIUM, ℹ️ LOW
- Include file paths and line numbers for each finding
- Provide actionable remediation steps, not just problems
- Reference specific Terraform resources by name
- Link to relevant documentation for fixes
- Keep tone professional but helpful
- Use emojis sparingly for visual hierarchy

## ⚡ Process

1. **Scan Repository**: Read all `.tf`, `.tfvars`, and `.tf.json` files
2. **Analyze Code**: Check against all security criteria listed above
3. **Calculate Costs**: Estimate monthly infrastructure costs based on resource configurations
4. **Identify Savings**: Find cost optimization opportunities
5. **Calculate Score**: Assign severity and compute security score
6. **Generate Report**: Create detailed issue with findings and cost analysis
7. **Prioritize Actions**: List top 3 most important fixes
8. **Add Context**: Include expert advice and relevant resources

## 🎯 Success Criteria

- All terraform files analyzed
- Security issues categorized by severity
- Specific file/line references provided
- Actionable remediation steps included
- Security score calculated
- Monthly cost estimate provided
- Cost optimization opportunities identified with potential savings
- Top 5 most expensive resources highlighted
- Cost breakdown by category included
- Expert security and cost recommendations provided
