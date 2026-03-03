# Java Blob Trigger with Event Grid

## Dependencies

**pom.xml:**
```xml
<dependency>
    <groupId>com.microsoft.azure.functions</groupId>
    <artifactId>azure-functions-java-library</artifactId>
    <version>3.0.0</version>
</dependency>
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-storage-blob</artifactId>
    <version>12.25.0</version>
</dependency>
```

## Source Code

**src/main/java/com/function/BlobEventGridFunctions.java:**
```java
package com.function;

import com.microsoft.azure.functions.*;
import com.microsoft.azure.functions.annotation.*;
import com.azure.storage.blob.*;

import java.util.Optional;

public class BlobEventGridFunctions {

    @FunctionName("ProcessBlobUpload")
    public void processBlobUpload(
            @BlobTrigger(
                name = "content",
                path = "unprocessed-pdf/{name}",
                connection = "PDFProcessorSTORAGE",
                source = "EventGrid")
            byte[] content,
            @BindingName("name") String name,
            @BlobInput(
                name = "processedContainer",
                path = "processed-pdf",
                connection = "PDFProcessorSTORAGE")
            BlobContainerClient processedContainer,
            final ExecutionContext context) {
        
        context.getLogger().info(String.format(
            "Blob Trigger (Event Grid) processed blob%n Name: %s%n Size: %d bytes",
            name, content.length));
        
        String processedBlobName = "processed-" + name;
        BlobClient destinationBlob = processedContainer.getBlobClient(processedBlobName);
        
        if (destinationBlob.exists()) {
            context.getLogger().info("Blob " + processedBlobName + " already exists. Skipping.");
            return;
        }
        
        try {
            destinationBlob.upload(new java.io.ByteArrayInputStream(content), content.length, true);
            context.getLogger().info("Processing complete for " + name + ". Copied to " + processedBlobName);
        } catch (Exception e) {
            context.getLogger().severe("Error processing blob " + name + ": " + e.getMessage());
            throw e;
        }
    }

    @FunctionName("health")
    public HttpResponseMessage health(
            @HttpTrigger(name = "req", methods = {HttpMethod.GET}, authLevel = AuthorizationLevel.ANONYMOUS)
            HttpRequestMessage<Optional<String>> request,
            final ExecutionContext context) {
        
        return request.createResponseBuilder(HttpStatus.OK)
                .header("Content-Type", "application/json")
                .body("{\"status\":\"healthy\",\"trigger\":\"blob-eventgrid\"}")
                .build();
    }
}
```

## Files to Remove

- Default HTTP trigger Java file

## App Settings Required

```
PDFProcessorSTORAGE__blobServiceUri=https://<storage>.blob.core.windows.net/
PDFProcessorSTORAGE__credential=managedidentity
PDFProcessorSTORAGE__clientId=<uami-client-id>
```

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
