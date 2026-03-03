# Key Vault — Python SDK Quick Reference

> Condensed from **azure-keyvault-py**. Full patterns (async clients,
> cryptographic operations, certificate management, error handling)
> in the **azure-keyvault-py** plugin skill if installed.

## Install
pip install azure-keyvault-secrets azure-keyvault-keys azure-keyvault-certificates azure-identity

## Quick Start
```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
client = SecretClient(vault_url="https://<vault>.vault.azure.net/", credential=DefaultAzureCredential())
```

## Best Practices
- Use DefaultAzureCredential for **local development only**. In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
- Use managed identity in Azure-hosted applications
- Enable soft-delete for recovery (enabled by default)
- Use RBAC over access policies for fine-grained control
- Rotate secrets regularly using versioning
- Use Key Vault references in App Service/Functions config
- Cache secrets appropriately to reduce API calls
- Use async clients for high-throughput scenarios
