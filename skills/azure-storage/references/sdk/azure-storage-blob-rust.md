# Blob Storage — Rust SDK Quick Reference

> Condensed from **azure-storage-blob-rust**. Full patterns (container ops,
> blob properties, RBAC permissions)
> in the **azure-storage-blob-rust** plugin skill if installed.

## Install
cargo add azure_storage_blob azure_identity

## Quick Start
```rust
use azure_identity::DeveloperToolsCredential;
use azure_storage_blob::BlobClient;
let credential = DeveloperToolsCredential::new(None)?;
let blob_client = BlobClient::new("https://<account>.blob.core.windows.net/", "container", "blob", Some(credential), None)?;
```

## Best Practices
- Use Entra ID auth — `DeveloperToolsCredential` for dev, `ManagedIdentityCredential` for production
- Specify content length — required for uploads
- Use `RequestContent::from()` to wrap upload data
- Handle async operations — use `tokio` runtime
- Check RBAC permissions — ensure "Storage Blob Data Contributor" role

## Non-Obvious Patterns
```rust
use azure_core::http::RequestContent;
blob_client.upload(RequestContent::from(data.to_vec()), false, u64::try_from(data.len())?, None).await?;
```
