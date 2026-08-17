---
name: aws-cloudwatch-investigation
description: >
  Reusable investigation patterns for AWS CloudWatch: Logs Insights query templates,
  alarm-to-deployment correlation, blast-radius narrowing decision tree, and
  PromQL-style metric query patterns for structured incident triage.
---

# AWS CloudWatch Investigation Skill

Reusable patterns for investigating production incidents using CloudWatch Logs, Metrics, and Alarms. These patterns are designed to be composed together during incident triage.

---

## Pattern 1: Logs Insights Query Templates

### Error Spike Detection

Find the top errors in a time window, grouped by error type:

```
fields @timestamp, @message, @logStream
| filter @message like /(?i)(error|exception|fatal|critical)/
| stats count(*) as errorCount by bin(5m), @logStream
| sort errorCount desc
| limit 20
```

### P99 Latency Breakdown by Operation

Identify which operations are driving latency spikes:

```
fields @timestamp, @duration, operation
| filter ispresent(@duration)
| stats avg(@duration) as avgMs,
        pct(@duration, 50) as p50Ms,
        pct(@duration, 95) as p95Ms,
        pct(@duration, 99) as p99Ms,
        count(*) as invocations
  by operation
| sort p99Ms desc
| limit 15
```

### Lambda Cold Start Detection

Quantify cold start impact during an incident:

```
fields @timestamp, @duration, @initDuration, @memorySize, @maxMemoryUsed
| filter ispresent(@initDuration)
| stats count(*) as coldStarts,
        avg(@initDuration) as avgInitMs,
        max(@initDuration) as maxInitMs,
        avg(@duration) as avgDurationMs
  by bin(5m)
| sort @timestamp desc
```

### Out-of-Memory (OOM) Detection

Find Lambda functions or containers killed by memory pressure:

```
fields @timestamp, @message, @logStream, @memorySize, @maxMemoryUsed
| filter @message like /Runtime exited|out of memory|OOMKilled|Cannot allocate memory|MemoryError/
| stats count(*) as oomEvents by @logStream, bin(10m)
| sort oomEvents desc
| limit 10
```

For memory utilization trending before OOM:

```
fields @timestamp, @maxMemoryUsed, @memorySize
| filter ispresent(@maxMemoryUsed)
| stats max(@maxMemoryUsed / @memorySize * 100) as peakMemPct,
        avg(@maxMemoryUsed / @memorySize * 100) as avgMemPct
  by bin(5m)
| sort @timestamp desc
```

### Timeout Detection

Find invocations that hit the configured timeout:

```
fields @timestamp, @duration, @logStream, @requestId
| filter @message like /Task timed out/ or @duration > 28000
| stats count(*) as timeouts by @logStream, bin(5m)
| sort timeouts desc
```

---

## Pattern 2: Alarm History to Deploy-Event Correlation

### Process

1. **Get alarm transition time** — note the exact timestamp when the alarm entered ALARM state.
2. **Query CloudTrail** for deployment-related events in a window of [alarm_time - 30min, alarm_time]:

```
# CloudTrail Lake query for deployment events
SELECT eventTime, eventName, userIdentity.arn, requestParameters
FROM <event-data-store-id>
WHERE eventTime > '<alarm_time_minus_30m>'
  AND eventTime < '<alarm_time>'
  AND eventName IN (
    'UpdateFunctionCode', 'UpdateFunctionConfiguration',
    'UpdateService', 'CreateDeployment', 'RegisterTaskDefinition',
    'CreateChangeSet', 'ExecuteChangeSet',
    'StartPipelineExecution', 'PutImage'
  )
ORDER BY eventTime DESC
```

3. **Correlation criteria** — a deploy is "correlated" if:
   - It targets the same service/resource as the alarm
   - It completed within 15 minutes before the alarm transition
   - The deployer identity matches a CI/CD role (not a human applying a hotfix)

4. **Strengthening the correlation:**
   - Check if the same alarm was healthy in the previous deployment cycle
   - Verify no other environmental changes (scaling events, config changes) in the same window
   - Look for canary/synthetic monitor failures that started at the same time

### Output Format

```
Deploy Correlation:
  Event: UpdateFunctionCode
  Time: 2024-03-15T14:23:07Z (12 min before alarm)
  Actor: arn:aws:sts::123456789012:assumed-role/github-actions-deploy/session
  Resource: arn:aws:lambda:us-east-1:123456789012:function:payment-processor
  Correlation: STRONG — same resource, CI/CD actor, alarm was OK prior cycle
```

---

## Pattern 3: Narrow the Blast Radius Decision Tree

Use this tree to systematically scope an incident from broadest to most specific:

```
START
  |
  v
[1] ACCOUNT — Which account(s) show the alarm?
  |  - Check: Are alarms firing in multiple accounts?
  |  - If yes → suspect shared service (SSO, networking, shared deployment pipeline)
  |  - If no → proceed to Region
  v
[2] REGION — Which region(s) are affected?
  |  - Check: Same alarm in other regions?
  |  - If multi-region → suspect global service (IAM, Route53, S3 global)
  |  - If single-region → proceed to Service
  v
[3] SERVICE — Which service namespace shows degradation?
  |  - Check CloudWatch namespace: AWS/Lambda, AWS/ECS, AWS/ApiGateway, etc.
  |  - If multiple services → suspect shared dependency (VPC, NAT, DNS, IAM)
  |  - If single service → proceed to Operation
  v
[4] OPERATION — Which API action or function is failing?
  |  - For Lambda: which function name?
  |  - For ECS: which service/task definition?
  |  - For API GW: which stage/resource/method?
  |  - If all operations → suspect service-level issue (throttling, quota)
  |  - If specific operation → proceed to Resource
  v
[5] RESOURCE — Which specific resource instance?
     - Function ARN, Task ID, DB instance identifier
     - This is your investigation target
     - Proceed to log and trace analysis scoped to this resource
```

### Shared Dependency Investigation

When blast radius spans multiple services, investigate in this order:

1. **VPC/Networking** — NAT Gateway ErrorPortAllocation, packet drops, DNS resolution failures
2. **IAM/STS** — ThrottlingException on AssumeRole, token vending latency
3. **Downstream dependency** — shared database, cache, or external API
4. **Deployment pipeline** — simultaneous deploys across services from same pipeline run
5. **AWS service event** — check AWS Health Dashboard and Service Health for the region

---

## Pattern 4: PromQL-Style Metric Query Patterns

These patterns use CloudWatch metric math and GetMetricData to build composite signals. Express them as metric queries for dashboards or programmatic retrieval.

### Error Rate as Percentage

```
MetricDataQueries:
  - Id: errors
    MetricStat:
      Metric:
        Namespace: AWS/Lambda
        MetricName: Errors
        Dimensions: [{Name: FunctionName, Value: TARGET}]
      Period: 60
      Stat: Sum
  - Id: invocations
    MetricStat:
      Metric:
        Namespace: AWS/Lambda
        MetricName: Invocations
        Dimensions: [{Name: FunctionName, Value: TARGET}]
      Period: 60
      Stat: Sum
  - Id: error_rate
    Expression: "errors / invocations * 100"
    Label: "Error Rate %"
```

### Latency Anomaly Detection (Compare to Baseline)

```
MetricDataQueries:
  - Id: current_p99
    MetricStat:
      Metric:
        Namespace: AWS/Lambda
        MetricName: Duration
        Dimensions: [{Name: FunctionName, Value: TARGET}]
      Period: 300
      Stat: p99
  - Id: baseline_p99
    MetricStat:
      Metric:
        Namespace: AWS/Lambda
        MetricName: Duration
        Dimensions: [{Name: FunctionName, Value: TARGET}]
      Period: 300
      Stat: p99
    # Use StartTime/EndTime set to same window last week
  - Id: anomaly_ratio
    Expression: "current_p99 / baseline_p99"
    Label: "Latency vs Baseline (ratio > 2 = anomaly)"
```

### Throttling Pressure Score

Combine multiple throttling signals into a single pressure metric:

```
MetricDataQueries:
  - Id: lambda_throttles
    MetricStat:
      Metric: {Namespace: AWS/Lambda, MetricName: Throttles}
      Period: 60
      Stat: Sum
  - Id: api_gw_429s
    MetricStat:
      Metric: {Namespace: AWS/ApiGateway, MetricName: 4XXError, Dimensions: [{Name: ApiName, Value: TARGET}]}
      Period: 60
      Stat: Sum
  - Id: dynamo_throttles
    MetricStat:
      Metric: {Namespace: AWS/DynamoDB, MetricName: ThrottledRequests, Dimensions: [{Name: TableName, Value: TARGET}]}
      Period: 60
      Stat: Sum
  - Id: throttle_pressure
    Expression: "lambda_throttles + api_gw_429s + dynamo_throttles"
    Label: "Combined Throttle Pressure"
```

### Concurrent Execution Headroom

```
MetricDataQueries:
  - Id: concurrent
    MetricStat:
      Metric: {Namespace: AWS/Lambda, MetricName: ConcurrentExecutions}
      Period: 60
      Stat: Maximum
  - Id: headroom
    Expression: "1000 - concurrent"
    Label: "Remaining Concurrency (account limit 1000)"
```

---

## Pattern 5: Incident Timeline Reconstruction

### Process

Reconstruct a precise timeline by merging data from multiple sources:

1. **Collect timestamps:**

| Source | Query | Yields |
|--------|-------|--------|
| CloudWatch Alarms | Alarm history API | State transition times |
| CloudWatch Metrics | GetMetricData with 1-min period | First anomaly point |
| CloudWatch Logs | Logs Insights with `earliest(@timestamp)` | First error occurrence |
| CloudTrail | LookupEvents filtered by time | Deployment/change events |
| AWS Health | DescribeEvents | AWS-side incidents |

2. **Build the timeline:**

```
fields @timestamp, @message
| filter @message like /ERROR|WARN|timeout|refused|denied/
| stats earliest(@timestamp) as firstSeen, latest(@timestamp) as lastSeen, count(*) as occurrences
  by @message
| sort firstSeen asc
| limit 20
```

3. **Identify the sequence:**

```
Timeline:
  T-15m: CloudTrail — UpdateFunctionCode by CI/CD role
  T-12m: Logs — first error "Connection refused to payments-api.internal"
  T-10m: Metrics — Error count crosses 5/min threshold
  T-8m:  Alarm — PaymentProcessorErrors enters ALARM
  T-5m:  Metrics — p99 latency spikes to 28s (timeout)
  T-0:   Current — error rate at 45%, alarm still firing
```

4. **Determine root event** — the earliest change that preceded all symptoms. Walk backward from the first symptom to the most recent mutation (deploy, config change, scaling event, or external dependency shift).

### Gotchas

- CloudWatch metric timestamps are end-of-period. A 1-minute datapoint at 14:05 covers 14:04-14:05.
- CloudTrail events can have up to 15-minute delivery delay. Use `eventTime`, not ingestion time.
- Log group timestamps depend on the agent/SDK flush interval. Allow for 30-60s of clock skew.
- Alarm state changes have a built-in evaluation delay (periods x evaluation periods). The actual anomaly started earlier.
