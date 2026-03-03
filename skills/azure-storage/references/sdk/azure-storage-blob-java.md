# Blob Storage — Java SDK Quick Reference

> Condensed from **azure-storage-blob-java**. Full patterns (SAS tokens,
> streaming, lease management, parallel uploads, proxy config)
> in the **azure-storage-blob-java** plugin skill if installed.

## Install
```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-storage-blob</artifactId>
    <version>12.33.0</version>
</dependency>
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
</dependency>
```

## Quick Start
```java
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;
var serviceClient = new BlobServiceClientBuilder()
    .endpoint("<storage-account-url>")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
```

## Best Practices
- Use DefaultAzureCredential for **local development only** — in production, use ManagedIdentityCredential. See [auth-best-practices.md](../auth-best-practices.md)
- Use `BinaryData.fromString()` for string uploads
- Use `createIfNotExists()` for idempotent container creation
- Use `BlobParallelUploadOptions` for large file uploads with headers/metadata
- Use `BlobInputStream`/`BlobOutputStream` for streaming large blobs
- Handle `BlobStorageException` — check `getStatusCode()` and `getErrorCode()`
