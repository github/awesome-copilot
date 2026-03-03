# Authentication — Rust SDK Quick Reference

> Condensed from **azure-identity-rust**. Full patterns (ClientSecret,
> ClientCertificate, WorkloadIdentity, AzurePipelines credentials)
> in the **azure-identity-rust** plugin skill if installed.

## Install
cargo add azure_identity

## Quick Start
```rust
use azure_identity::DeveloperToolsCredential;
let credential = DeveloperToolsCredential::new(None)?;
```

## Best Practices
- Use DeveloperToolsCredential for local dev — automatically picks up Azure CLI
- Use ManagedIdentityCredential in production — no secrets to manage
- Clone credentials — credentials are Arc-wrapped and cheap to clone
- Reuse credential instances — same credential can be used with multiple clients
- Use tokio feature — `cargo add azure_identity --features tokio`
