# Tables — Java SDK Quick Reference

> Condensed from **azure-data-tables-java**. Full patterns (typed entities,
> batch transactions, OData filters, Cosmos DB Table API)
> in the **azure-data-tables-java** plugin skill if installed.

## Install
```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-data-tables</artifactId>
    <version>12.6.0-beta.1</version>
</dependency>
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
</dependency>
```

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```java
import com.azure.data.tables.TableServiceClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;
var serviceClient = new TableServiceClientBuilder()
    .endpoint("<table-account-url>")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
```

## Best Practices
- Partition Key Design: choose keys that distribute load evenly
- Batch Operations: use transactions for atomic multi-entity updates
- Query Optimization: always filter by PartitionKey when possible
- Select Projection: only select needed properties for performance
- Entity Size: keep entities under 1MB (Storage) or 2MB (Cosmos)
