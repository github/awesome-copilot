# Key Vault Certificates — Rust SDK Quick Reference

> Condensed from **azure-keyvault-certificates-rust**. Full patterns
> (certificate policies, import, lifecycle management)
> in the **azure-keyvault-certificates-rust** plugin skill if installed.

## Install
cargo add azure_security_keyvault_certificates azure_identity

## Quick Start
```rust
use azure_identity::DeveloperToolsCredential;
use azure_security_keyvault_certificates::CertificateClient;
let credential = DeveloperToolsCredential::new(None)?;
let client = CertificateClient::new("https://<vault>.vault.azure.net/", credential.clone(), None)?;
```

## Best Practices
- Use Entra ID auth — `DeveloperToolsCredential` for dev
- Use managed certificates — auto-renewal with supported issuers
- Set proper validity period — balance security and maintenance
- Use certificate policies — define renewal and key properties
- Monitor expiration — set up alerts for expiring certificates
- Enable soft delete — required for production vaults
