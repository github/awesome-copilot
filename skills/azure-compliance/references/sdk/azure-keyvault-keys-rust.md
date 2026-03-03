# Key Vault Keys — Rust SDK Quick Reference

> Condensed from **azure-keyvault-keys-rust**. Full patterns (EC keys,
> backup/restore, crypto operations, RBAC permissions)
> in the **azure-keyvault-keys-rust** plugin skill if installed.

## Install
cargo add azure_security_keyvault_keys azure_identity

## Quick Start
```rust
use azure_identity::DeveloperToolsCredential;
use azure_security_keyvault_keys::KeyClient;
let credential = DeveloperToolsCredential::new(None)?;
let client = KeyClient::new("https://<vault>.vault.azure.net/", credential.clone(), None)?;
```

## Best Practices
- Use Entra ID auth — `DeveloperToolsCredential` for dev, `ManagedIdentityCredential` for production
- Use HSM keys for sensitive workloads — hardware-protected keys
- Use EC for signing — more efficient than RSA
- Use RSA for encryption — when encrypting data
- Backup keys for disaster recovery
- Enable soft delete — required for production vaults
- Use key rotation — create new versions periodically

## Non-Obvious Patterns
```rust
use azure_security_keyvault_keys::models::{CreateKeyParameters, KeyType};
let params = CreateKeyParameters { kty: KeyType::Rsa, key_size: Some(2048), ..Default::default() };
client.create_key("name", params.try_into()?, None).await?.into_model()?;
```
