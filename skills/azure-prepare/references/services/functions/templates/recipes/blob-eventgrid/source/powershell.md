# PowerShell Blob Trigger with Event Grid

## Dependencies

**host.json:**
```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

## Source Code

**ProcessBlobUpload/function.json:**
```json
{
  "bindings": [
    {
      "name": "InputBlob",
      "type": "blobTrigger",
      "direction": "in",
      "path": "unprocessed-pdf/{name}",
      "connection": "PDFProcessorSTORAGE",
      "source": "EventGrid"
    },
    {
      "name": "ProcessedContainer",
      "type": "blob",
      "direction": "in",
      "path": "processed-pdf",
      "connection": "PDFProcessorSTORAGE"
    }
  ]
}
```

**ProcessBlobUpload/run.ps1:**
```powershell
param([byte[]] $InputBlob, $TriggerMetadata, $ProcessedContainer)

$name = $TriggerMetadata.Name
$size = $InputBlob.Length

Write-Host "Blob Trigger (Event Grid) processed blob"
Write-Host " Name: $name"
Write-Host " Size: $size bytes"

$processedBlobName = "processed-$name"

# Check if already exists
$existingBlob = Get-AzStorageBlob -Container "processed-pdf" -Blob $processedBlobName -Context $ProcessedContainer.Context -ErrorAction SilentlyContinue

if ($existingBlob) {
    Write-Host "Blob $processedBlobName already exists. Skipping."
    return
}

try {
    # Upload to processed container
    $stream = [System.IO.MemoryStream]::new($InputBlob)
    Set-AzStorageBlobContent -Container "processed-pdf" -Blob $processedBlobName -BlobType Block -Context $ProcessedContainer.Context -Stream $stream -Force
    Write-Host "Processing complete for $name. Copied to $processedBlobName."
}
catch {
    Write-Error "Error processing blob $name : $_"
    throw
}
```

**health/function.json:**
```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "Request",
      "methods": ["get"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "Response"
    }
  ]
}
```

**health/run.ps1:**
```powershell
param($Request, $TriggerMetadata)

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = '{"status":"healthy","trigger":"blob-eventgrid"}'
    ContentType = 'application/json'
})
```

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
