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
Analyze and estimate for cloud infrastructure with multi-cloud support:

- **Serverless Compute Costs**:
  - **AWS Lambda**: Invocations, execution time, memory allocation, ARM vs x86 architecture
    - Memory configurations (128MB to 10GB)
    - Ephemeral storage (512MB to 10GB)
    - Cold start optimization for provisioned concurrency
  - **Azure Functions**: Consumption, Premium, and Dedicated plans
    - Plan comparison (Consumption vs Premium vs App Service)
    - VNet integration costs (Premium plan)
    - Elastic Premium scaling behavior
  - Total executions/invocations per month
  - Average duration and memory allocation
  - Over/under-provisioned memory configurations
  
- **Message Queue & Event Streaming**:
  - **AWS**: SQS (Standard/FIFO), SNS, EventBridge, Kinesis
    - SQS request pricing and message attributes impact
    - SNS publish operations and subscriptions (SMS/email/HTTP)
    - EventBridge event ingestion and rule evaluations
    - Kinesis shard hours and data retention
  - **Azure**: Service Bus (Basic/Standard/Premium), Event Grid, Event Hubs, Storage Queues
    - Service Bus tier comparison and messaging units
    - Event Grid custom topics and system topics
    - Event Hubs throughput units vs dedicated clusters
  - Message size and data transfer implications
  - Dead letter queue/topic storage costs
  
- **API Gateway & Management**:
  - **AWS API Gateway**: REST API, HTTP API, WebSocket API
    - REST vs HTTP API pricing difference (60% cost reduction with HTTP API)
    - WebSocket connections and message routing
    - Edge-optimized vs Regional vs Private endpoints
    - Caching tiers (0.5GB to 237GB)
  - **Azure API Management**: Consumption, Developer, Basic, Standard, Premium
    - Self-hosted gateway units
    - VNet integration (Standard/Premium)
    - Multi-region deployments (Premium only)
  - **Azure Application Gateway / Front Door**: WAF, CDN, load balancing
  - Number of API requests/connections per month
  - Caching configuration impact
  
- **Storage & Object Storage**:
  - **AWS S3**: Standard, Intelligent-Tiering, Glacier, Deep Archive
    - Request pricing per operation type (GET, PUT, LIST, POST, SELECT)
    - Cross-region replication costs
    - Transfer acceleration costs
    - S3 Select and Glacier retrieval fees
  - **Azure Blob Storage**: Hot, Cool, Archive, Premium tiers
    - Access tier optimization and lifecycle management
    - Blob type costs (Block, Append, Page blobs)
    - Redundancy levels (LRS, ZRS, GRS, RA-GRS, GZRS)
    - Blob index tags and metadata
  - Storage capacity and request costs
  - Early deletion fees for Cool/Archive tiers
  
- **NoSQL & Database Services**:
  - **AWS DynamoDB**: Provisioned vs On-Demand capacity
    - Read/Write capacity units (RCU/WCU) and auto-scaling
    - Global tables multi-region replication
    - DynamoDB Streams and change data capture
    - Backup and Point-in-Time Recovery costs
  - **Azure Cosmos DB**: Provisioned, Serverless, Autoscale
    - Request Units (RU/s) allocation
    - Multi-region writes and consistency levels
    - Analytical store and synapse link
    - Continuous backup vs periodic backup
  - **AWS RDS / Azure SQL Database**: Reserved instances, serverless options
    - vCore vs DTU pricing models (Azure)
    - Reserved capacity savings (1-year vs 3-year)
    - Read replicas and high availability costs
  - **Azure Table Storage / AWS DynamoDB**: Cost per million operations
  
- **Workflow Orchestration**:
  - **AWS Step Functions**: Standard vs Express workflows
    - State transitions pricing (Standard: per transition)
    - Express workflows: per execution and duration
  - **AWS EventBridge**: Custom buses, event patterns, rules
  - **Azure Logic Apps**: Consumption vs Standard plans
    - Action executions and connector costs (SQL, ServiceNow, SAP)
    - Built-in vs Standard vs Enterprise connectors
  - **Azure Durable Functions**: Orchestration and activity executions
  
- **Observability & Monitoring**:
  - **AWS CloudWatch**: Logs, Metrics, Dashboards, Alarms, Insights
    - Log ingestion and storage costs
    - Custom metrics and high-resolution metrics
    - Log Insights queries (GB scanned)
    - CloudWatch Events/EventBridge integration
  - **AWS X-Ray**: Traces recorded and retrieved
  - **Azure Monitor**: Application Insights, Log Analytics, Metrics
    - Classic vs workspace-based Application Insights
    - Table-level retention policies in Log Analytics
    - Interactive and basic log tiers
    - Query costs per GB scanned
  - **Azure Application Insights**: Web tests, distributed tracing
  - Logs ingestion volume (GB/month)
  - Retention periods and archived log costs
  
- **Networking & Data Transfer**:
  - **AWS**: Inter-AZ, inter-region, internet egress, CloudFront
    - Data transfer within same AZ (free)
    - Cross-AZ transfer ($0.01-$0.02/GB)
    - Cross-region transfer ($0.02/GB)
    - NAT Gateway: per-hour + per-GB processing
    - VPC peering and Transit Gateway costs
  - **Azure**: Intra-zone, inter-zone, inter-region, internet outbound
    - Zone redundant services transfer costs
    - Cross-region bandwidth charges
    - Express Route vs VPN Gateway costs
    - Virtual Network peering costs
    - Azure Firewall or NVA data processing
  
- **Secrets & Key Management**:
  - **AWS Secrets Manager vs SSM Parameter Store**:
    - Secrets Manager: per secret per month + API calls
    - Parameter Store: Free tier (Standard), Advanced parameters
  - **AWS KMS**: Customer managed keys, requests, grants
  - **Azure Key Vault**: Operations, Standard vs Premium (HSM)
    - Secret/Key/Certificate operations pricing
    - Managed HSM for cryptographic operations
  - Number of secret retrievals/rotations per month
  - Automatic rotation configuration costs

**Cloud Cost Optimization Opportunities**:

**AWS-Specific**:
- Lambda functions with excessive memory allocation (right-sizing)
- Switch Lambda from x86 to ARM (Graviton2) for 20% savings
- Missing SQS batch processing (reduce Lambda invocations)
- DynamoDB tables without auto-scaling or on-demand mode
- RDS instances without Reserved Instance commitments
- CloudWatch logs without retention policies (unlimited storage)
- Missing S3 lifecycle policies (Intelligent-Tiering, Glacier)
- NAT Gateway without optimization (consider VPC endpoints)
- Elastic IPs not attached (hourly charges)
- Underutilized EC2 instances (Compute Optimizer recommendations)

**Azure-Specific**:
- Azure Functions on Premium when Consumption plan suffices
- Missing Azure Hybrid Benefit for Windows/SQL licenses (40% savings)
- Cosmos DB over-provisioned RU/s without autoscale
- SQL Database without elastic pools for multiple databases
- App Service Plans without consolidation (multiple apps per plan)
- Log Analytics workspaces without retention policies
- Missing Blob Storage lifecycle policies
- Virtual Machines without Reserved Instances (1-3 year)
- Orphaned resources (disks, NICs, public IPs)
- Development/test environments without B-series or spot instances

**Multi-Cloud**:
- Dead code or rarely invoked functions (clean up)
- Inefficient polling patterns (switch to event-driven)
- Long-running functions that should be containerized
- Synchronous invocations that could be async
- Development/staging using production-tier services
- Missing tagging for cost allocation and chargeback

**Provide Monthly Cost Estimate**:
- Calculate estimated monthly cost for each service category (AWS & Azure)
- Show cost per million invocations/requests/transactions
- Identify top 5 most expensive services (specify cloud provider)
- Estimate data transfer costs between services and regions
- Compare Reserved vs On-Demand pricing where applicable
- Suggest cost savings opportunities with potential savings amount
- Flag unusual usage patterns that could cause cost spikes
- Identify opportunities for Reserved Instances/Savings Plans (AWS) or Reserved Instances (Azure)
- Highlight Azure Hybrid Benefit eligibility for Windows/SQL Server

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
1. **{resource_name}** ({AWS Lambda / Azure Functions}): ~${monthly_cost}/month
   - Cloud: {AWS / Azure}
   - Plan/Config: {Lambda ARM 512MB / Azure Premium EP1}
   - Executions: {count}M/month
   - Avg Duration: {ms}ms, Memory: {mb}MB
   - Cost Driver: {high_execution_rate / over_provisioned_memory / wrong_plan_type}

2. **{database_name}** ({DynamoDB / Cosmos DB / RDS / SQL Database}): ~${monthly_cost}/month
   - Cloud: {AWS / Azure}
   - Capacity: {Provisioned 100 RCU/WCU / 400 RU/s / General Purpose 4 vCore}
   - Storage: {gb}GB, Multi-region: {yes/no}
   - Cost Driver: {over_provisioned_capacity / missing_autoscale / no_reserved_instance}

3. **{api_gateway_name}** ({AWS API Gateway / Azure API Management}): ~${monthly_cost}/month
   - Cloud: {AWS / Azure}
   - Type: {REST API / HTTP API / Standard tier}
   - Requests: {count}M/month
   - Cost Driver: {high_request_volume / wrong_api_type / missing_caching}

4. **{monitoring_system}** ({CloudWatch Logs / Azure Monitor}): ~${monthly_cost}/month
   - Cloud: {AWS / Azure}
   - Log Ingestion: {gb}GB/month
   - Retention: {days} days
   - Cost Driver: {verbose_logging / no_retention_policy / excessive_queries}

5. **{networking_resource}** ({NAT Gateway / Data Transfer / Azure Bandwidth}): ~${monthly_cost}/month
   - Cloud: {AWS / Azure}
   - Transfer Volume: {gb}GB/month
   - Type: {Inter-region / Internet egress / Cross-AZ}
   - Cost Driver: {cross_region_calls / inefficient_data_flow / missing_vpc_endpoints}

#### 💡 Cost Optimization Opportunities
| Resource                  | Cloud | Current Cost  | Potential Savings | Recommendation                                                                |
| ------------------------- | ----- | ------------- | ----------------- | ----------------------------------------------------------------------------- |
| {lambda_function}         | AWS   | ${current}/mo | ${savings}/mo     | Switch to ARM (Graviton2) for 20% savings; reduce memory from 1024MB to 512MB |
| {dynamodb_table}          | AWS   | ${current}/mo | ${savings}/mo     | Switch to on-demand mode; enable auto-scaling for provisioned capacity        |
| {api_gateway}             | AWS   | ${current}/mo | ${savings}/mo     | Migrate from REST API to HTTP API for 60% cost reduction                      |
| {cloudwatch_logs}         | AWS   | ${current}/mo | ${savings}/mo     | Set 7-day retention for debug logs; implement log sampling for verbose logs   |
| {nat_gateway}             | AWS   | ${current}/mo | ${savings}/mo     | Replace with VPC endpoints for AWS service access; consolidate to one AZ      |
| {function_app}            | Azure | ${current}/mo | ${savings}/mo     | Switch from Premium to Consumption plan for variable workloads                |
| {cosmos_db_account}       | Azure | ${current}/mo | ${savings}/mo     | Enable autoscale RU/s; switch to serverless for dev/test                      |
| {apim_instance}           | Azure | ${current}/mo | ${savings}/mo     | Use Consumption tier instead of Standard; consolidate multiple instances      |
| {sql_database}            | Azure | ${current}/mo | ${savings}/mo     | Enable Azure Hybrid Benefit; convert to elastic pool; use 3-year RI           |
| {log_analytics_workspace} | Azure | ${current}/mo | ${savings}/mo     | Set table-level retention; implement diagnostic settings filtering            |

**Total Potential Monthly Savings**: ~${total_savings}/month (${percentage}% reduction)

#### Cost Breakdown by Category

**AWS Services**:
- ⚡ **Lambda Compute**: ${aws_lambda_cost}/month
  - Total invocations: {count}M/month, Avg: {ms}ms @ {mb}MB
- 📨 **Messaging** (SQS/SNS/EventBridge): ${aws_messaging_cost}/month
- 🌐 **API Gateway**: ${aws_apigw_cost}/month ({rest_api_count} REST + {http_api_count} HTTP APIs)
- 💾 **Storage** (S3/DynamoDB): ${aws_storage_cost}/month
- 📊 **Orchestration** (Step Functions): ${aws_orchestration_cost}/month
- 📈 **Monitoring** (CloudWatch/X-Ray): ${aws_monitoring_cost}/month
- 🌍 **Data Transfer**: ${aws_transfer_cost}/month
- 🔐 **Security** (Secrets Manager/KMS): ${aws_security_cost}/month

**Azure Services**:
- ⚡ **Azure Functions**: ${azure_functions_cost}/month
  - Total executions: {count}M/month, Plans: {consumption_count} Consumption + {premium_count} Premium
- 📨 **Messaging** (Service Bus/Event Grid/Event Hubs): ${azure_messaging_cost}/month
- 🌐 **API Management**: ${azure_apim_cost}/month
- 💾 **Storage** (Blob/Cosmos DB/SQL): ${azure_storage_cost}/month
- 📊 **Orchestration** (Logic Apps/Durable Functions): ${azure_orchestration_cost}/month
- 📈 **Monitoring** (Azure Monitor/App Insights): ${azure_monitoring_cost}/month
- 🌍 **Data Transfer**: ${azure_transfer_cost}/month
- 🔐 **Security** (Key Vault): ${azure_security_cost}/month

**Total Cloud Costs**: ${total_cost}/month (AWS: ${aws_total}, Azure: ${azure_total})

#### ⚠️ Cost Risk Flags

**AWS Cost Risks**:
- Lambda functions without CloudWatch Insights memory optimization
- Missing Lambda reserved concurrency for predictable workloads
- CloudWatch logs without retention policies (unlimited growth)
- Missing SQS batch processing (10 messages per invocation)
- DynamoDB provisioned capacity without auto-scaling
- RDS instances running without Reserved Instance coverage
- S3 buckets without lifecycle policies (Intelligent-Tiering/Glacier)
- NAT Gateway in multiple AZs without consolidation
- REST API instead of HTTP API (71% cost difference)
- Missing VPC endpoints for S3/DynamoDB (reduce NAT Gateway costs)

**Azure Cost Risks**:
- Azure Functions Premium plan for infrequent workloads
- Missing Azure Hybrid Benefit eligibility (Windows/SQL Server)
- Cosmos DB fixed RU/s without autoscale enabled
- App Service Plans with single app (consolidation opportunity)
- SQL Database single databases eligible for elastic pools
- Log Analytics without table-level retention policies
- Blob Storage in Hot tier without access pattern analysis
- Virtual Machines without Reserved Instance purchases (1-3 year)
- Orphaned resources consuming costs (disks, NICs, PIPs)
- Development environments using production-tier services

**Multi-Cloud Risks**:
- High cold start rates increasing function duration costs
- Synchronous invocations that could be async
- Excessive cross-region data transfer
- Missing cost anomaly alerts and budgets
- No tagging strategy for cost allocation

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

**Security & Compliance**:
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [Azure Security Best Practices](https://docs.microsoft.com/azure/security/)
- [Terraform Security Documentation](https://www.terraform.io/docs/language/values/sensitive.html)
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
- [CIS Azure Foundations Benchmark](https://www.cisecurity.org/benchmark/azure)

**AWS Pricing & Cost Optimization**:
- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [AWS Cost Optimization Best Practices](https://aws.amazon.com/pricing/cost-optimization/)
- [AWS Compute Optimizer](https://aws.amazon.com/compute-optimizer/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
- [AWS Pricing Calculator](https://calculator.aws/)
- [AWS Graviton (ARM) Cost Savings](https://aws.amazon.com/ec2/graviton/)

**Azure Pricing & Cost Optimization**:
- [Azure Functions Pricing](https://azure.microsoft.com/pricing/details/functions/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Azure Cost Management Best Practices](https://docs.microsoft.com/azure/cost-management-billing/)
- [Azure Advisor Cost Recommendations](https://docs.microsoft.com/azure/advisor/advisor-cost-recommendations)
- [Azure Hybrid Benefit](https://azure.microsoft.com/pricing/hybrid-benefit/)
- [Azure Reserved Instances](https://azure.microsoft.com/pricing/reserved-vm-instances/)
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
