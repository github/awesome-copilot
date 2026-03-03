# Azure Monitor Ingestion — Java SDK Quick Reference

> Condensed from **azure-monitor-ingestion-java**. Full patterns (async
> Reactor upload, concurrency, error consumers, log entry models)
> in the **azure-monitor-ingestion-java** plugin skill if installed.

## Install
```xml
<dependency><groupId>com.azure</groupId><artifactId>azure-monitor-ingestion</artifactId></dependency>
<dependency><groupId>com.azure</groupId><artifactId>azure-identity</artifactId></dependency>
```

## Quick Start
```java
import com.azure.monitor.ingestion.LogsIngestionClient;
import com.azure.monitor.ingestion.LogsIngestionClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;
LogsIngestionClient client = new LogsIngestionClientBuilder()
    .endpoint("<data-collection-endpoint>")
    .credential(new DefaultAzureCredentialBuilder().build()).buildClient();
client.upload("<dcr-rule-id>", "<stream-name>", logs);
```

## Best Practices
- Batch logs rather than uploading one at a time
- Set maxConcurrency via LogsUploadOptions for large uploads
- Handle partial failures with setLogsUploadErrorConsumer
- Log entry fields must match DCR transformation expectations
- Include TimeGenerated timestamp field in entries
- Reuse client instance throughout application
- Use LogsIngestionAsyncClient for reactive/high-throughput patterns
