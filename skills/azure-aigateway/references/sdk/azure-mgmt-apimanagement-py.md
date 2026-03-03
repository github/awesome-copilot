# API Management — Python SDK Quick Reference

> Condensed from **azure-mgmt-apimanagement-py**. Full patterns (APIs,
> products, subscriptions, policies, backends, named values)
> in the **azure-mgmt-apimanagement-py** plugin skill if installed.

## Install
pip install azure-mgmt-apimanagement azure-identity

## Quick Start
> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
import os
from azure.mgmt.apimanagement import ApiManagementClient
from azure.identity import DefaultAzureCredential
client = ApiManagementClient(DefaultAzureCredential(), os.environ["AZURE_SUBSCRIPTION_ID"])
```

## Best Practices
- Use named values for secrets and configuration
- Apply policies at appropriate scopes (global, product, API, operation)
- Use products to bundle APIs and manage access
- Enable Application Insights for monitoring
- Use backends to abstract backend services
- Version your APIs using APIM's versioning features
