---
name: aws-cost-optimize
description: 'Analyze AWS resources used in the app (IaC files and/or resources in a target account/region) and optimize costs - creating GitHub issues for identified optimizations.'
---

# AWS Cost Optimize

This workflow analyzes Infrastructure-as-Code (IaC) files and AWS resources to generate cost optimization recommendations. It creates individual GitHub issues for each optimization opportunity plus one EPIC issue to coordinate implementation, enabling efficient tracking and execution of cost savings initiatives.

## Prerequisites
- AWS CLI configured and authenticated (`aws sts get-caller-identity` succeeds)
- GitHub MCP server configured and authenticated
- Target GitHub repository identified
- AWS resources deployed (IaC files optional but helpful)

## Workflow Steps

### Step 1: Get AWS Cost Optimization Best Practices
**Action**: Retrieve cost optimization best practices before analysis
**Tools**: `fetch` to retrieve AWS documentation
**Process**:
1. **Load Best Practices**:
   - Fetch `https://docs.aws.amazon.com/cost-management/latest/userguide/cost-optimization-best-practices.html`
   - Fetch the AWS Well-Architected Cost Optimization pillar summary
   - Use these practices to inform subsequent analysis and recommendations

### Step 2: Discover AWS Infrastructure
**Action**: Dynamically discover and analyze AWS resources and configurations
**Tools**: AWS CLI + Local file system access
**Process**:
1. **Account & Region Discovery**:
   - Execute `aws sts get-caller-identity` to confirm account
   - Execute `aws configure get region` to determine default region

2. **Resource Discovery** (per region):
   - EC2 instances: `aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name,Tags]'`
   - RDS instances: `aws rds describe-db-instances --query 'DBInstances[].[DBInstanceIdentifier,DBInstanceClass,Engine,MultiAZ]'`
   - Lambda functions: `aws lambda list-functions --query 'Functions[].[FunctionName,Runtime,MemorySize,Architectures]'`
   - ECS clusters/services: `aws ecs list-clusters` then `aws ecs describe-services`
   - S3 buckets: `aws s3api list-buckets --query 'Buckets[].Name'`
   - ElastiCache clusters: `aws elasticache describe-cache-clusters`
   - NAT Gateways: `aws ec2 describe-nat-gateways`
   - Load Balancers: `aws elbv2 describe-load-balancers`

3. **IaC Detection**:
   - Scan for IaC files: `**/*.tf`, `**/*.yaml` (CloudFormation/SAM), `**/*.json` (CloudFormation), `**/cdk.json`, `lib/**/*.ts` (CDK)
   - Parse resource definitions to understand intended configurations
   - Do NOT use application code files — only IaC files as the source of truth
   - If no IaC files found: STOP and report to user

### Step 3: Collect Usage Metrics & Validate Current Costs
**Action**: Gather utilization data and verify actual resource costs
**Tools**: AWS CLI (CloudWatch, Cost Explorer)
**Process**:
1. **CloudWatch Metrics** (last 7 days):
   ```bash
   # EC2 CPU utilization
   aws cloudwatch get-metric-statistics \
     --namespace AWS/EC2 --metric-name CPUUtilization \
     --dimensions Name=InstanceId,Value=<id> \
     --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 3600 --statistics Average

   # Lambda duration
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda --metric-name Duration \
     --dimensions Name=FunctionName,Value=<name> \
     --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 86400 --statistics Average,Maximum
   ```

2. **AWS Cost Explorer**:
   ```bash
   aws ce get-cost-and-usage \
     --time-period Start=$(date -u -d '30 days ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
     --granularity MONTHLY --metrics BlendedCost \
     --group-by Type=DIMENSION,Key=SERVICE
   ```

3. **Calculate Baseline Metrics**: CPU/Memory averages, Lambda invocation rates, data transfer patterns, and a realistic current monthly total.

### Step 4: Generate Cost Optimization Recommendations
**Action**: Analyze resources to identify optimization opportunities
**Process**:
1. **Apply Optimization Patterns**:

   **Compute**:
   - EC2: Right-size based on CPU/memory (<20% average → downsize), convert On-Demand to Savings Plans, migrate to Graviton/ARM (up to 40% cheaper)
   - Lambda: Reduce memory for idle functions, switch to `arm64` (20% cheaper)
   - ECS/EKS: Use Fargate Spot for dev/batch workloads

   **Database**:
   - RDS: Right-size instance class, convert single-AZ for dev, use Aurora Serverless v2 for variable load
   - DynamoDB: Switch Provisioned → On-Demand for unpredictable traffic
   - ElastiCache: Right-size node type based on memory utilization

   **Storage**:
   - S3: Lifecycle policies (Standard → Standard-IA after 30d → Glacier after 90d), enable Intelligent-Tiering
   - EBS: Delete unattached volumes, convert gp2 → gp3 (same performance, 20% cheaper)

   **Network**:
   - Consolidate NAT Gateways for non-production environments
   - Use VPC endpoints for S3/DynamoDB to avoid NAT Gateway charges

2. **Calculate Priority Score**:
   ```
   Priority Score = (Value Score × Monthly Savings) / (Risk Score × Implementation Days)
   High: Score > 20 | Medium: Score 5-20 | Low: Score < 5
   ```

### Step 5: User Confirmation
**Action**: Present summary and get approval before creating GitHub issues

```
🎯 AWS Cost Optimization Summary

📊 Analysis Results:
• Total Resources Analyzed: X
• Current Monthly Cost: $X
• Potential Monthly Savings: $Y
• Optimization Opportunities: Z
• High Priority Items: N

🏆 Recommendations:
1. [Resource]: [Current] → [Target] = $X/month savings - [Risk] | [Effort]
...

💡 This will create Y individual GitHub issues + 1 EPIC issue.

❓ Proceed with creating GitHub issues? (y/n)
```

Wait for user confirmation before proceeding.

### Step 6: Create Individual Optimization Issues
**Action**: Create separate GitHub issues for each optimization. Label with "cost-optimization" (green) and "aws" (orange).

**Title**: `[COST-OPT] [Resource Type] - [Brief Description] - $X/month savings`

**Body**:
```markdown
## 💰 Cost Optimization: [Brief Title]

**Monthly Savings**: $X | **Risk Level**: [Low/Medium/High] | **Effort**: X days

### 📋 Description
[Clear explanation of the optimization and why it's needed]

### 🔧 Implementation

**IaC Files Detected**: [Yes/No]

```bash
# IaC modification (preferred) or AWS CLI fallback
```

### 📊 Evidence
- Current Configuration: [details]
- Usage Pattern: [evidence from CloudWatch]
- Cost Impact: $X/month → $Y/month

### ✅ Validation Steps
- [ ] Test in non-production environment
- [ ] Verify no performance degradation via CloudWatch
- [ ] Confirm cost reduction in AWS Cost Explorer

### ⚠️ Risks & Considerations
- [Risk and mitigation]

**Priority Score**: X | **Value**: X/10 | **Risk**: X/10
```

### Step 7: Create EPIC Coordinating Issue
**Action**: Create master tracking issue. Label with "cost-optimization" (green), "aws" (orange), "epic" (purple).

**Title**: `[EPIC] AWS Cost Optimization Initiative - $X/month potential savings`

**Body**: Executive summary with account/region details, Mermaid architecture diagram of current resources, prioritized checklist linking all individual issues (High → Medium → Low), progress tracking, and success criteria (>80% of estimated savings realized, no performance degradation).

## Error Handling
- **AWS Authentication Failure**: Guide through `aws configure`
- **No Resources Found**: Create informational issue about AWS resource deployment
- **Insufficient Permissions**: List required IAM read-only permissions
- **GitHub Creation Failure**: Output formatted recommendations to console
- **Cost Explorer Not Enabled**: Guide user to enable in AWS Console

## Success Criteria
- ✅ All cost estimates verified against actual configurations and AWS pricing
- ✅ Individual GitHub issues created for each optimization
- ✅ EPIC issue provides comprehensive coordination and tracking
- ✅ All recommendations include specific AWS CLI or IaC commands
- ✅ User confirmation obtained before creating issues
