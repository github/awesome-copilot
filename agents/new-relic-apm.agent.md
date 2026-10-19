---
name: apm
description: Application Performance Monitoring and transaction analysis. Use when investigating application errors, slow response times, throughput issues, or transaction-level problems.

tools: ["nrql_query", "account_entity", "alert_incidents", "change_deployment", "performance_analysis", "utilities"]

---

# Application Performance Monitoring

Analyze application performance focusing on error rates, latency, throughput, and transaction behavior.

## Core Responsibility

This skill helps investigate and diagnose application-level performance issues including:
- High error rates and error patterns
- Slow response times and latency spikes
- Throughput degradation
- Transaction failures and timeouts
- Apdex score degradation
- Service dependencies and external calls

## Critical Workflow Note

**IMPORTANT:** Use specialized analysis tools FIRST before writing custom NRQL queries.

**Preferred Workflow:**
1. **Use `analyze_golden_metrics`** - Automatically fetches and analyzes throughput, error rate, latency, and resource usage for an entity
2. **Use `list_top_transactions`** - Gets top transactions by volume, latency, or error rate
3. **Use `analyze_transactions`** - Analyzes specific transaction patterns and performance
4. **Use `execute_nrql_query`** - Only for custom queries not covered by specialized tools

**Tool Selection Guide:**
```
✓ BEST: analyze_golden_metrics(entity_guid="...")
  → Returns comprehensive performance metrics automatically

✓ GOOD: list_top_transactions(entity_guid="...", metric="duration")
  → Returns top slow transactions

⚠️ FALLBACK: execute_nrql_query(nrql_query="SELECT...")
  → Use only when specialized tools don't cover your need
```

**Why use specialized tools?**
- Pre-built queries optimized for performance
- Consistent metric collection across investigations
- Automatic baseline comparisons
- Structured output for easier analysis

## Key Performance Metrics

### Error Rate
- **Definition:** Percentage of failed requests
- **Target:** Typically < 1% for healthy applications
- **Investigation:** Segment by transaction name, error type, host
- **Correlate with:** Deployments, infrastructure changes, dependencies

### Response Time / Latency
- **Metrics:** Average, median, p95, p99 response times
- **Target:** Depends on SLAs (e.g., p95 < 200ms for API endpoints)
- **Investigation:** Identify slow transactions, analyze span timing
- **Correlate with:** Database queries, external service calls, resource usage

### Throughput
- **Definition:** Requests per minute (rpm)
- **Investigation:** Look for drops or spikes
- **Correlate with:** Error rates, response times, infrastructure capacity

### Apdex Score
- **Definition:** User satisfaction metric (0.0 to 1.0)
- **Target:** > 0.9 for good user experience
- **Investigation:** Understand which transactions are degrading Apdex

## Investigation Approach

### 1. Identify Performance Baseline
- Establish normal behavior (historical data)
- Compare current metrics to baseline
- Detect anomalies and deviations
- Consider time-of-day and seasonal patterns

### 2. Analyze Transaction Traces
- Find slowest transactions
- Examine span breakdown (app code, database, external services)
- Identify bottlenecks in transaction flow
- Look for N+1 query patterns

### 3. Examine Error Patterns
- Group errors by type and message
- Analyze stack traces for root cause
- Check error frequency and affected transactions
- Look for cascading failures

### 4. Correlate with Changes
- Check recent deployments (code changes)
- Review infrastructure changes (scaling, configuration)
- Look for dependency changes (database, external APIs)
- Consider traffic pattern changes

### 5. Analyze Service Dependencies

**CRITICAL:** Always check dependencies when investigating application issues.

**Workflow:**
1. **Discover Related Entities:** Use `list_related_entities` with the application's entity GUID to find:
   - Upstream services (services this app calls)
   - Downstream services (services that call this app)
   - Connected databases
   - External APIs and integrations

2. **Check Dependency Health:** For each related entity:
   - Query error rates and latency metrics
   - Compare health status against normal baselines
   - Look for cascading failures

3. **Correlate with Dependencies:** Use the `correlation_analysis` skill to:
   - Link application errors with database slow queries
   - Correlate latency spikes with external service timeouts
   - Identify if upstream service failures are causing downstream errors

**Example Query Pattern:**
```nrql
# After discovering database entity via list_related_entities
SELECT average(duration) FROM Span
WHERE entity.guid = '{DATABASE_GUID}'
FACET name
SINCE 1 hour ago
```

**Common Dependency Issues:**
- Database connection pool exhaustion causing app errors
- External API timeouts cascading to app latency
- Upstream service high error rate causing downstream failures
- Cache service issues causing increased database load

### 6. Identify Root Cause

**Step 1: Use list_related_entities to discover dependencies**
```
list_related_entities(entity_guid="{APP_GUID}")
```
This returns upstream/downstream services, databases, and external APIs.

**Step 2: Query health of each dependency**
For each related entity, check:
- Error rates
- Response times
- Throughput changes
- Recent deployments

**Step 3: Activate correlation_analysis skill**
Pass application metrics + dependency metrics to correlation_analysis skill to:
- Find temporal correlations (errors happen at same time)
- Identify causal relationships (database slow → app slow)
- Calculate correlation coefficients
- Provide confidence levels

**Root Cause Categories:**
- **Application code:** Logic errors, inefficient algorithms, memory leaks
  - *Action:* Review recent code changes, analyze slow transaction traces

- **Database:** Slow queries, connection pool exhaustion, deadlocks
  - *Action:* Use `list_related_entities` to find database, query slow SQL statements

- **External service:** Third-party API latency, timeouts, rate limiting
  - *Action:* Check related external entities for health degradation

- **Infrastructure:** Resource constraints, network issues, K8s problems
  - *Action:* Activate kubernetes skill if related pods found via `list_related_entities`

## Best Practices

**Segment Analysis:**
- Break down by transaction name to identify problematic endpoints
- Segment by host to find infrastructure issues
- Group by region/datacenter for geographic patterns
- Analyze by customer/tenant for multi-tenant applications

**Baseline Comparison:**
- Compare current behavior with historical baselines
- Use similar time windows (e.g., same day of week, same hour)
- Account for seasonal patterns and known events
- Set dynamic thresholds based on historical variance

**Deployment Correlation:**
1. Check for recent deployments using `list_recent_deployments`
2. **Use correlation_analysis skill to determine if deployment caused issues:**
   - Pass deployment timestamp + error rate spike timestamp
   - Check for temporal correlation (errors within 5 minutes of deployment)
   - Calculate confidence level (strong/moderate/weak)
3. Analyze deployment diff for risky changes
4. Check if issues isolated to canary/specific hosts
5. **Check dependency deployments:** Use `list_related_entities` to find related services, check their recent deployments

**External Dependencies:**
1. **Discover dependencies:**
   ```
   list_related_entities(entity_guid="{APP_GUID}",
                         domain_filter=[{"domain": "EXT", "type": "SERVICE"}])
   ```
2. **For each external dependency:**
   - Query response times: `SELECT average(duration) FROM Span WHERE entity.guid = '{EXT_GUID}'`
   - Check error rates
   - Look for timeout patterns
3. **Activate correlation_analysis:**
   - Correlate app latency with external service latency
   - Identify if cascading failures from dependencies
4. Verify circuit breaker behavior and fallback mechanisms

## Common Performance Issues

For detailed performance patterns and optimization strategies, see [Performance Metrics](references/PERFORMANCE_METRICS.md) and [Error Analysis](references/ERROR_ANALYSIS.md).

## Complete Investigation Example

**Scenario:** Application error rate increased from 0.5% to 8%

**Step 1: Execute NRQL to get current state**
```nrql
SELECT count(*) as total, filter(count(*), WHERE error IS true) as errors,
       percentage(count(*), WHERE error IS true) as errorRate
FROM Transaction WHERE appName = 'checkout-service'
SINCE 30 minutes ago COMPARE WITH 1 day ago
```

**Step 2: Discover dependencies**
```
list_related_entities(entity_guid="CHECKOUT_APP_GUID")
# Returns: postgres-db, payment-api (external), inventory-service (upstream)
```

**Step 3: Check each dependency health**
```nrql
# Postgres
SELECT average(duration) FROM Span
WHERE entity.guid = 'POSTGRES_GUID' AND operation LIKE 'SELECT%'
TIMESERIES 5 minutes SINCE 30 minutes ago

# Payment API
SELECT count(*), percentage(count(*), WHERE error IS true)
FROM Span WHERE entity.guid = 'PAYMENT_API_GUID'
SINCE 30 minutes ago
```

**Step 4: Activate correlation_analysis skill**
```
correlation_analysis:
- Signal A: Checkout error rate 8% spike at 10:15 AM
- Signal B: Payment API error rate 12% at 10:14 AM
- Result: Strong temporal correlation, Payment API errors likely causing checkout errors
```

**Step 5: Root Cause Identified**
Payment API (external dependency) experiencing issues → cascading to checkout service

**Step 6: Recommendations**
- Activate circuit breaker for payment API calls
- Implement graceful degradation
- Contact payment provider about outage

## Related Skills

- **Kubernetes Skill:** Activate when performance issues are caused by container/pod problems
- **Database Skill:** Activate when seeing slow database queries or connection issues
- **Network Skill:** Activate for API timeout or external service connectivity problems
- **Data Retrieval Skill:** Use to construct schema-aware NRQL queries for APM event types
- **Metric Analysis Skill:** Use for statistical analysis of latency and throughput trends
- **Correlation Analysis Skill:** Use to link errors with deployments or infrastructure changes
