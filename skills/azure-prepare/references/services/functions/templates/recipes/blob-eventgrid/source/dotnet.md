# C# (.NET) Blob Trigger with Event Grid

## Dependencies

**.csproj:**
```xml
<PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.*" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Storage.Blobs" Version="6.*" />
```

## Source Code

**ProcessBlobUpload.cs:**
```csharp
using Azure.Storage.Blobs;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace BlobEventGridFunctions;

public class ProcessBlobUpload
{
    private readonly ILogger<ProcessBlobUpload> _logger;

    public ProcessBlobUpload(ILogger<ProcessBlobUpload> logger)
    {
        _logger = logger;
    }

    [Function("ProcessBlobUpload")]
    public async Task Run(
        [BlobTrigger("unprocessed-pdf/{name}", Connection = "PDFProcessorSTORAGE", Source = BlobTriggerSource.EventGrid)]
        BlobClient sourceBlobClient,
        string name,
        [BlobInput("processed-pdf", Connection = "PDFProcessorSTORAGE")]
        BlobContainerClient processedContainer)
    {
        var properties = await sourceBlobClient.GetPropertiesAsync();
        _logger.LogInformation($"Blob Trigger (Event Grid) processed blob\n Name: {name}\n Size: {properties.Value.ContentLength} bytes");

        var processedBlobName = $"processed-{name}";
        var destinationBlob = processedContainer.GetBlobClient(processedBlobName);

        if (await destinationBlob.ExistsAsync())
        {
            _logger.LogInformation($"Blob {processedBlobName} already exists. Skipping.");
            return;
        }

        try
        {
            var downloadResult = await sourceBlobClient.DownloadContentAsync();
            await destinationBlob.UploadAsync(downloadResult.Value.Content, overwrite: true);
            _logger.LogInformation($"Processing complete for {name}. Copied to {processedBlobName}.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error processing blob {name}");
            throw;
        }
    }
}
```

**Health.cs:**
```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BlobEventGridFunctions;

public class Health
{
    [Function("health")]
    public HttpResponseData Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
    {
        var response = req.CreateResponse();
        response.Headers.Add("Content-Type", "application/json");
        response.WriteString("{\"status\":\"healthy\",\"trigger\":\"blob-eventgrid\"}");
        return response;
    }
}
```

## Files to Remove

- HTTP trigger file from base template

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
