---
name: aws-well-architected-review
description: 'Perform an AWS Well-Architected Framework review of the current workload IaC and architecture, generating findings and GitHub issues for improvements.'
---

# AWS Well-Architected Review

This workflow performs a structured AWS Well-Architected Framework (WAF) review against your workload's IaC files and deployed infrastructure. It identifies risks across all 6 WAF pillars and creates GitHub issues to track remediation.

## Prerequisites
- AWS CLI configured and authenticated
- IaC files present in the repository (Terraform, CloudFormation, CDK, or SAM)
- GitHub MCP server configured and authenticated

## Workflow Steps

### Step 1: Load Well-Architected Framework Reference
Fetch current AWS WAF best practices:
- `https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html`
- Pillar-specific lenses relevant to the workload type (Serverless, SaaS, etc.)

### Step 2: Discover IaC & Architecture
Scan the repository for IaC files:
- Terraform: `**/*.tf`
- CloudFormation/SAM: `**/*.yaml`, `**/*.json` (CFn templates)
- CDK: `lib/**/*.ts`, `bin/**/*.ts`, `cdk.json`

Identify key AWS services in use (compute, data, networking, security, observability) and generate a Mermaid architecture diagram.

### Step 3: Pillar-by-Pillar Review

#### Pillar 1: Operational Excellence
- [ ] All infrastructure defined as IaC (no manual console changes)
- [ ] Consistent tagging strategy applied across all resources
- [ ] CloudWatch alarms defined for key metrics
- [ ] Automated deployment pipeline present (no manual deployments)
- [ ] CloudTrail enabled for audit logging
- [ ] Runbooks or operational documentation present

#### Pillar 2: Security
- [ ] IAM roles use least-privilege policies (no `*` actions without justification)
- [ ] No hardcoded credentials in IaC or code
- [ ] Secrets managed via Secrets Manager or SSM Parameter Store
- [ ] S3 buckets have public access blocked and server-side encryption enabled
- [ ] Sensitive resources placed in private subnets
- [ ] Security groups restrict inbound to minimum required ports/CIDRs
- [ ] KMS encryption enabled for sensitive data stores (RDS, EBS, S3, SQS, DynamoDB)
- [ ] SSL/TLS enforced on all endpoints (`enforceSSL: true`)
- [ ] GuardDuty enabled (`aws guardduty list-detectors`)
- [ ] AWS WAF configured on public-facing APIs and CloudFront distributions
- [ ] MFA delete enabled on critical S3 buckets

#### Pillar 3: Reliability
- [ ] Multi-AZ deployments for production databases (RDS Multi-AZ, DynamoDB Global Tables)
- [ ] Auto Scaling configured with appropriate policies for EC2/ECS
- [ ] S3 versioning and lifecycle policies configured
- [ ] RDS automated backups enabled with appropriate retention period
- [ ] DynamoDB Point-in-Time Recovery (PITR) enabled
- [ ] Dead Letter Queues (DLQ) configured for Lambda, SQS, SNS
- [ ] Route 53 health checks configured for DNS failover
- [ ] Lambda reserved concurrency set to prevent noisy-neighbor throttling

#### Pillar 4: Performance Efficiency
- [ ] Right-sized instance types (Lambda memory, EC2 type, RDS class)
- [ ] Graviton/ARM instances used where available (Lambda `arm64`, EC2 Graviton)
- [ ] Caching implemented (ElastiCache, DAX, CloudFront, API Gateway caching)
- [ ] CloudFront used for global static content delivery
- [ ] Aurora Serverless or DynamoDB On-Demand for variable load patterns
- [ ] Lambda Provisioned Concurrency for latency-critical synchronous paths

#### Pillar 5: Cost Optimization
- [ ] EC2 Reserved Instances or Savings Plans for steady-state workloads
- [ ] S3 lifecycle policies moving data to cheaper storage tiers
- [ ] Lambda `arm64` architecture adopted (20% cost reduction)
- [ ] VPC Endpoints for S3/DynamoDB to avoid NAT Gateway charges
- [ ] gp2 EBS volumes migrated to gp3 (same performance, 20% cheaper)
- [ ] Development/test environments have auto-shutdown schedules
- [ ] AWS Budgets and Cost Anomaly Detection configured
- [ ] Unattached EBS volumes and idle EC2 instances identified

#### Pillar 6: Sustainability
- [ ] Graviton/ARM instances selected where available
- [ ] Serverless/managed services preferred over always-on EC2
- [ ] S3 lifecycle policies reduce unnecessary long-term data storage
- [ ] Auto Scaling configured to avoid over-provisioning
- [ ] Region selection considers AWS renewable energy commitments

### Step 4: Risk Classification
For each finding, classify:
- **High Risk**: Security vulnerability, single point of failure, no backup/recovery
- **Medium Risk**: Suboptimal reliability, cost inefficiency, performance concern
- **Low Risk**: Best practice deviation, minor optimization opportunity

### Step 5: User Confirmation

```
🏗️ AWS Well-Architected Review Summary

📊 Review Results:
• IaC Files Analyzed: X
• AWS Services Identified: Y
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

### Step 6: Create Individual Finding Issues
Label with "well-architected" and the pillar name (e.g., "security", "reliability").

**Title**: `[WAF-<PILLAR>] [Brief Finding] — [Risk Level]`

**Body**:
```markdown
## 🏗️ Well-Architected Finding: [Brief Title]

**Pillar**: [Name] | **Risk Level**: [High/Medium/Low] | **Effort**: [Low/Medium/High]

### 📋 Description
[Clear explanation of the finding and why it matters]

### 🔧 Remediation

**IaC Fix** (preferred):
```hcl
# Terraform example
resource "aws_s3_bucket_server_side_encryption_configuration" "example" {
  bucket = aws_s3_bucket.example.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}
```

**AWS CLI fallback**:
```bash
aws s3api put-bucket-encryption --bucket <name> \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}'
```

### 📚 AWS Reference
- [WAF Best Practice Link]
- [AWS Documentation Link]

### ✅ Validation
- [ ] Change implemented in IaC and deployed
- [ ] AWS Config rule passes (if applicable)
- [ ] Security Hub finding resolved (if applicable)

**Well-Architected Question**: [WAF question this maps to]
```

### Step 7: Create EPIC Tracking Issue
Label with "well-architected" and "epic".

**Title**: `[EPIC] AWS Well-Architected Review — X findings across 6 pillars`

**Body**: Executive summary with pillar breakdown table (finding counts by pillar and risk level), Mermaid architecture diagram, prioritized checklist linking all individual issues (High → Medium → Low), and success criteria:
- All High-risk findings resolved
- Medium findings have accepted mitigation plans
- No regression in existing CloudWatch alarms or Config rules

## Error Handling
- **No IaC Files Found**: Limit review to live resource discovery via AWS CLI and note the gap
- **Insufficient AWS Permissions**: List required read-only permissions for the review
- **GitHub Creation Failure**: Output all findings as formatted markdown to console

## Success Criteria
- ✅ All 6 WAF pillars reviewed against IaC and live infrastructure
- ✅ All findings classified by risk level and pillar
- ✅ Actionable remediation steps with IaC examples for each finding
- ✅ GitHub issues created for team tracking
- ✅ Architecture diagram generated for EPIC context
- ✅ AWS documentation references included
