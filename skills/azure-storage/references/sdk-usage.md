# Azure Storage SDK Usage

SDK packages and quick start examples for Azure Storage services.

## Storage SDKs by Language

| Language | Blob | Queue | File Share | Data Lake |
|----------|------|-------|------------|----------|
| .NET | `Azure.Storage.Blobs` | `Azure.Storage.Queues` | `Azure.Storage.Files.Shares` | `Azure.Storage.Files.DataLake` |
| Java | `azure-storage-blob` | `azure-storage-queue` | `azure-storage-file-share` | `azure-storage-file-datalake` |
| JavaScript | `@azure/storage-blob` | `@azure/storage-queue` | `@azure/storage-file-share` | `@azure/storage-file-datalake` |
| Python | `azure-storage-blob` | `azure-storage-queue` | `azure-storage-file-share` | `azure-storage-file-datalake` |
| Go | `azblob` | `azqueue` | `azfile` | `azdatalake` |
| Rust | `azure_storage_blob` | `azure_storage_queue` | - | - |

## Installation Commands

| Language | Install Blob SDK + Identity |
|----------|-----------------------------|
| .NET | `dotnet add package Azure.Storage.Blobs` `dotnet add package Azure.Identity` |
| Java | Maven: `com.azure:azure-storage-blob` `com.azure:azure-identity` |
| JavaScript | `npm install @azure/storage-blob @azure/identity` |
| Python | `pip install azure-storage-blob azure-identity` |
| Go | `go get github.com/Azure/azure-sdk-for-go/sdk/storage/azblob github.com/Azure/azure-sdk-for-go/sdk/azidentity` |
| Rust | `cargo add azure_storage_blob azure_identity` |

## Quick Start Examples

All examples use `DefaultAzureCredential` for authentication, which is recommended for **local development only**. In production, use `ManagedIdentityCredential` — see [auth-best-practices.md](auth-best-practices.md). Rust uses `DeveloperToolsCredential` as it doesn't have a `DefaultAzureCredential` equivalent.

**Python** - Upload Blob:
```python
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

service = BlobServiceClient(account_url="https://ACCOUNT.blob.core.windows.net/", credential=DefaultAzureCredential())
container = service.get_container_client("my-container")
blob = container.get_blob_client("my-blob.txt")
blob.upload_blob(b"Hello, Azure Storage!", overwrite=True)
```

**JavaScript** - Upload Blob:
```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

const client = new BlobServiceClient("https://ACCOUNT.blob.core.windows.net/", new DefaultAzureCredential());
const container = client.getContainerClient("my-container");
const blob = container.getBlockBlobClient("my-blob.txt");
await blob.uploadData(Buffer.from("Hello, Azure Storage!"));
```

**C#** - Upload Blob:
```csharp
using Azure.Identity;
using Azure.Storage.Blobs;

var client = new BlobServiceClient(new Uri("https://ACCOUNT.blob.core.windows.net/"), new DefaultAzureCredential());
var container = client.GetBlobContainerClient("my-container");
var blob = container.GetBlobClient("my-blob.txt");
await blob.UploadAsync(BinaryData.FromString("Hello, Azure Storage!"), overwrite: true);
```

**Java** - Upload Blob:
```java
import com.azure.identity.*;
import com.azure.storage.blob.*;
import com.azure.core.util.BinaryData;

BlobServiceClient client = new BlobServiceClientBuilder()
    .endpoint("https://ACCOUNT.blob.core.windows.net/")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
BlobContainerClient container = client.getBlobContainerClient("my-container");
BlobClient blob = container.getBlobClient("my-blob.txt");
blob.upload(BinaryData.fromString("Hello, Azure Storage!"), true);
```

**Go** - Upload Blob:
```go
package main

import (
    "context"

    "github.com/Azure/azure-sdk-for-go/sdk/azidentity"
    "github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
)

func main() {
    cred, _ := azidentity.NewDefaultAzureCredential(nil)
    client, _ := azblob.NewClient("https://ACCOUNT.blob.core.windows.net/", cred, nil)

    data := []byte("Hello, Azure Storage!")
    _, _ = client.UploadBuffer(context.Background(), "my-container", "my-blob.txt", data, nil)
}
```

**Rust** - Upload Blob:
```rust
use azure_identity::DeveloperToolsCredential;
use azure_storage_blob::{BlobClient, BlobClientOptions};

let credential = DeveloperToolsCredential::new(None)?;
let blob_client = BlobClient::new(
    "https://ACCOUNT.blob.core.windows.net/",
    "my-container",
    "my-blob.txt",
    Some(credential),
    Some(BlobClientOptions::default()),
)?;
let data = b"Hello, Azure Storage!";
blob_client.upload(None, data.to_vec().into()).await?;
```
