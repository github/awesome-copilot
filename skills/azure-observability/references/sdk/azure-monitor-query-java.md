# Azure Monitor Query — Java SDK Quick Reference

> Condensed from **azure-monitor-query-java**. Full patterns (batch queries,
> model mapping, multi-workspace queries, sovereign clouds)
> in the **azure-monitor-query-java** plugin skill if installed.

## Install
```xml
<dependency><groupId>com.azure</groupId><artifactId>azure-monitor-query</artifactId></dependency>
<dependency><groupId>com.azure</groupId><artifactId>azure-identity</artifactId></dependency>
```

## Quick Start
> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```java
import com.azure.monitor.query.LogsQueryClient;
import com.azure.monitor.query.LogsQueryClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;
LogsQueryClient client = new LogsQueryClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build()).buildClient();
```

## Best Practices
- Use batch queries to combine multiple queries into a single request
- Set appropriate timeouts for long-running queries
- Limit result size with `top` or `take` in Kusto queries
- Use projections (`project`) to select only needed columns
- Check query status and handle PARTIAL_FAILURE gracefully
- Cache metrics results when appropriate
- Migrate to `azure-monitor-query-logs` and `azure-monitor-query-metrics` (this package is deprecated)
