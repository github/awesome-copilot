---
name: aws-resource-health-diagnose
description: 'Analyze AWS resource health, diagnose issues from CloudWatch logs and metrics, and create a remediation plan for identified problems.'
---

# AWS Resource Health & Issue Diagnosis

This workflow analyzes a specific AWS resource to assess its health status, diagnose potential issues using CloudWatch logs and metrics, and develop a comprehensive remediation plan for any problems discovered.

## Prerequisites
- AWS CLI configured and authenticated
- Target AWS resource identified (name, type, and optionally region/account)
- CloudWatch logging and metrics enabled on the target resource

## Workflow Steps

### Step 1: Get AWS Diagnostic Best Practices
Fetch `https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/` for monitoring and troubleshooting guidance to inform the diagnostic approach.

### Step 2: Resource Discovery & Identification
Locate the target resource using the appropriate AWS CLI command for its type:

```bash
# EC2
aws ec2 describe-instances --filters "Name=tag:Name,Values=<name>"
# Lambda
aws lambda get-function --function-name <name>
# RDS
aws rds describe-db-instances --db-instance-identifier <name>
# ECS
aws ecs describe-services --cluster <cluster> --services <name>
# ALB
aws elbv2 describe-load-balancers --names <name>
# DynamoDB
aws dynamodb describe-table --table-name <name>
# SQS
aws sqs get-queue-attributes --queue-url <url> --attribute-names All
# API Gateway
aws apigatewayv2 get-apis
```

If multiple matches are found, prompt the user to specify region/account.

### Step 3: Health Status Assessment
Run service-specific health checks:

```bash
# EC2
aws ec2 describe-instance-status --instance-ids <id>

# RDS
aws rds describe-db-instances --db-instance-identifier <name> \
  --query 'DBInstances[0].DBInstanceStatus'

# Lambda - error rate over 24h
aws cloudwatch get-metric-statistics --namespace AWS/Lambda \
  --metric-name Errors --dimensions Name=FunctionName,Value=<name> \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 3600 --statistics Sum

# ECS
aws ecs describe-services --cluster <cluster> --services <name> \
  --query 'services[0].[status,runningCount,desiredCount,pendingCount]'
```

Key health indicators by service type:
- **Lambda**: Error rate, throttle rate, duration P99, concurrent executions
- **RDS**: CPU utilization, FreeStorageSpace, DatabaseConnections, ReadLatency/WriteLatency
- **ECS**: Running vs desired task count, task stop reason
- **ALB**: TargetResponseTime, HTTPCode_ELB_5XX_Count, UnHealthyHostCount
- **SQS**: ApproximateNumberOfMessagesNotVisible, ApproximateAgeOfOldestMessage
- **DynamoDB**: ConsumedReadCapacityUnits, ThrottledRequests, SuccessfulRequestLatency

### Step 4: Log & Metrics Analysis
Find log groups and run CloudWatch Logs Insights queries:

```bash
# Find log groups
aws logs describe-log-groups --log-group-name-prefix /aws/<service>/<name>

# Start a query (last 24h errors)
aws logs start-query \
  --log-group-name /aws/lambda/<name> \
  --start-time $(date -u -d '24 hours ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'filter @message like /ERROR/ | stats count(*) as errorCount by bin(1h)'

# Get results
aws logs get-query-results --query-id <id>

# Lambda cold starts
aws logs start-query \
  --log-group-name /aws/lambda/<name> \
  --start-time $(date -u -d '24 hours ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'filter @type = "REPORT" | filter @initDuration > 0 | stats count() as coldStarts by bin(1h)'

# RDS Performance Insights (if enabled)
aws pi get-resource-metrics \
  --service-type RDS --identifier db:<identifier> \
  --metric-queries '[{"Metric":"db.load.avg"}]' \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period-in-seconds 3600
```

Identify: recurring error patterns, correlation with deployments (CloudTrail), performance trends, dependency failures.

### Step 5: Issue Classification & Root Cause Analysis
**Severity**:
- **Critical**: Service unavailable, data loss, security incidents
- **High**: Performance degradation, error rates >5%, intermittent failures
- **Medium**: Warnings, suboptimal configuration, minor performance issues
- **Low**: Informational alerts, optimization opportunities

**Root Cause Categories**:
- Configuration Issues: wrong settings, missing env vars, IAM permission denials
- Resource Constraints: CPU/memory/disk limits, Lambda throttling, RDS connection exhaustion
- Network Issues: security group rules, VPC routing, DNS, NACLs
- Application Issues: code bugs, memory leaks, unhandled exceptions, slow queries
- Dependency Issues: downstream timeouts, SQS/SNS failures, external API limits
- Security Issues: KMS key issues, certificate expiration

### Step 6: Generate Remediation Plan

**Immediate Actions** (Critical):
```bash
# Lambda throttling — increase reserved concurrency
aws lambda put-reserved-concurrency \
  --function-name <name> --reserved-concurrent-executions 100

# RDS connection exhaustion — reboot to reset connections
aws rds reboot-db-instance --db-instance-identifier <name>
```

**Short-term Fixes** (High/Medium): Configuration adjustments, right-sizing, CloudWatch alarm improvements, IAM corrections.

**Long-term Improvements**: Architectural changes for resilience, preventive monitoring, enable AWS Health Dashboard notifications via EventBridge.

### Step 7: Report & User Confirmation

Present findings:
```
🏥 AWS Resource Health Assessment

📊 Resource Overview:
• Resource: [Name] ([Type])
• Status: [Healthy/Warning/Critical]
• Region: [Region] | Account: [Account ID]

🚨 Issues Identified:
• Critical: X | High: Y | Medium: Z | Low: N

🔍 Top Issues:
1. [Issue]: [Description] — Impact: [High/Medium/Low]
2. [Issue]: [Description] — Impact: [High/Medium/Low]

🛠️ Remediation: X immediate, Y short-term, Z long-term actions

❓ Proceed with detailed remediation plan? (y/n)
```

Then generate a full markdown report covering: health metrics, issues with root cause analysis, phased remediation steps with AWS CLI commands, CloudWatch alarm recommendations, and validation checklist.

## Error Handling
- **Resource Not Found**: Ask user to clarify name/region
- **Authentication Issues**: Guide through `aws configure`
- **Insufficient Permissions**: List required IAM actions (`logs:*`, `cloudwatch:*`, `pi:*`)
- **No Logs Available**: Suggest enabling CloudWatch logging for the resource type
- **Query Timeouts**: Use shorter time windows

## Success Criteria
- ✅ Resource health accurately assessed across all key metrics
- ✅ All significant issues identified and classified by severity
- ✅ Root cause analysis completed for major problems
- ✅ Actionable remediation plan with AWS CLI commands
- ✅ CloudWatch monitoring recommendations included
- ✅ Implementation steps include validation and rollback procedures
