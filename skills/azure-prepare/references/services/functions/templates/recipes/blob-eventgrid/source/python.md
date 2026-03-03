# Python Blob Trigger with Event Grid

## Dependencies

**requirements.txt:**
```
azure-functions
azurefunctions-extensions-bindings-blob
```

## Source Code

**function_app.py:**
```python
import logging
import azure.functions as func
import azurefunctions.extensions.bindings.blob as blob

app = func.FunctionApp()

@app.blob_trigger(
    arg_name="source_blob_client", 
    path="unprocessed-pdf/{name}",
    connection="PDFProcessorSTORAGE",
    source=func.BlobSource.EVENT_GRID
)
@app.blob_input(
    arg_name="processed_container",
    path="processed-pdf",
    connection="PDFProcessorSTORAGE"
)
def process_blob_upload(
    source_blob_client: blob.BlobClient, 
    processed_container: blob.ContainerClient
) -> None:
    """
    Process blob upload event from Event Grid.
    
    Triggers when a new blob is created in the unprocessed-pdf container.
    Copies the blob to the processed-pdf container with a "processed-" prefix.
    """
    
    blob_name = source_blob_client.get_blob_properties().name
    file_size = source_blob_client.get_blob_properties().size

    logging.info(f'Blob Trigger (Event Grid) processed blob\n Name: {blob_name} \n Size: {file_size} bytes')

    processed_blob_name = f"processed-{blob_name}"
    
    # Idempotency check - skip if already processed
    if processed_container.get_blob_client(processed_blob_name).exists():
        logging.info(f'Blob {processed_blob_name} already exists. Skipping.')
        return

    try:
        # Download and upload to processed container
        blob_data = source_blob_client.download_blob()
        processed_container.upload_blob(processed_blob_name, blob_data.readall(), overwrite=True)
        logging.info(f'Processing complete for {blob_name}. Copied to {processed_blob_name}.')
    except Exception as error:
        logging.error(f'Error processing blob {blob_name}: {error}')
        raise error
```

## Files to Remove

- `src/function_app.py` (replace with above)

## App Settings Required

```bicep
PDFProcessorSTORAGE__blobServiceUri: 'https://${storage.name}.blob.${environment().suffixes.storage}/'
PDFProcessorSTORAGE__credential: 'managedidentity'
PDFProcessorSTORAGE__clientId: uamiClientId
```

## Test

Upload a file to the `unprocessed-pdf` container:

```bash
az storage blob upload \
  --account-name <storage> \
  --container-name unprocessed-pdf \
  --file ./sample.pdf \
  --name sample.pdf \
  --auth-mode login
```

Check that `processed-sample.pdf` appears in `processed-pdf` container.

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
