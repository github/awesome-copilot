---
applyTo: '**'
---

# Dataverse SDK for Python — Authentication & Security Patterns

Based on official Microsoft Azure SDK authentication documentation and Dataverse SDK best practices.

## 1. Authentication Overview

The Dataverse SDK for Python uses Azure Identity credentials for token-based authentication. This approach follows the principle of least privilege and works across local development, cloud deployment, and on-premises environments.

### Why Token-Based Authentication?

**Advantages over connection strings**:
- Establishes specific permissions needed by your app (principle of least privilege)
- Credentials are scoped only to intended apps
- With managed identity, no secrets to store or compromise
- Works seamlessly across environments without code changes

---

## 2. Credential Types & Selection

### Interactive Browser Credential (Local Development)

**Use for**: Developer workstations during local development.

```python
from azure.identity import InteractiveBrowserCredential
from PowerPlatform.Dataverse.client import DataverseClient

# Opens browser for authentication
credential = InteractiveBrowserCredential()
client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=credential
)

# First use prompts for sign-in; subsequent calls use cached token
records = client.get("account")
```

**When to use**:
- ✅ Interactive development and testing
- ✅ Desktop applications with UI
- ❌ Background services or scheduled jobs

---

### Default Azure Credential (Recommended for All Environments)

**Use for**: Apps that run in multiple environments (dev → test → production).

```python
from azure.identity import DefaultAzureCredential
from PowerPlatform.Dataverse.client import DataverseClient

# Attempts credentials in this order:
# 1. Environment variables (app service principal)
# 2. Azure CLI credentials (local development)
# 3. Azure PowerShell credentials (local development)
# 4. Managed identity (when running in Azure)
credential = DefaultAzureCredential()

client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=credential
)

records = client.get("account")
```

**Advantages**:
- Single code path works everywhere
- No environment-specific logic needed
- Automatically detects available credentials
- Preferred for production apps

**Credential chain**:
1. Environment variables (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`)
2. Visual Studio Code login
3. Azure CLI (`az login`)
4. Azure PowerShell (`Connect-AzAccount`)
5. Managed identity (on Azure VMs, App Service, AKS, etc.)

---

### Client Secret Credential (Service Principal)

**Use for**: Unattended authentication (scheduled jobs, scripts, on-premises services).

```python
from azure.identity import ClientSecretCredential
from PowerPlatform.Dataverse.client import DataverseClient
import os

credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"]
)

client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=credential
)

records = client.get("account")
```

**Setup steps**:
1. Create app registration in Azure AD
2. Create client secret (keep secure!)
3. Grant Dataverse permissions to the app
4. Store credentials in environment variables or secure vault

**Security concerns**:
- ⚠️ Never hardcode credentials in source code
- ⚠️ Store secrets in Azure Key Vault or environment variables
- ⚠️ Rotate credentials regularly
- ⚠️ Use minimal required permissions

---

### Managed Identity Credential (Azure Resources)

**Use for**: Apps hosted in Azure (App Service, Azure Functions, AKS, VMs).

```python
from azure.identity import ManagedIdentityCredential
from PowerPlatform.Dataverse.client import DataverseClient

# No secrets needed - Azure manages identity
credential = ManagedIdentityCredential()

client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=credential
)

records = client.get("account")
```

**Benefits**:
- ✅ No secrets to manage
- ✅ Automatic token refresh
- ✅ Highly secure
- ✅ Built-in to Azure services

**Setup**:
1. Enable managed identity on Azure resource (App Service, VM, etc.)
2. Grant Dataverse permissions to the managed identity
3. Code automatically uses the identity

---

## 3. Environment-Specific Configuration

### Local Development

```python
# .env file (git-ignored)
DATAVERSE_URL=https://myorg-dev.crm.dynamics.com

# Python code
import os
from azure.identity import DefaultAzureCredential
from PowerPlatform.Dataverse.client import DataverseClient

# Uses your Azure CLI credentials
credential = DefaultAzureCredential()
client = DataverseClient(
    base_url=os.environ["DATAVERSE_URL"],
    credential=credential
)
```

**Setup**: `az login` with your developer account

---

### Azure App Service / Azure Functions

```python
from azure.identity import ManagedIdentityCredential
from PowerPlatform.Dataverse.client import DataverseClient

# Automatically uses managed identity
credential = ManagedIdentityCredential()
client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=credential
)
```

**Setup**: Enable managed identity in App Service, grant permissions in Dataverse

---

### On-Premises / Third-Party Hosting

```python
import os
from azure.identity import ClientSecretCredential
from PowerPlatform.Dataverse.client import DataverseClient

credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"]
)

client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=credential
)
```

**Setup**: Create service principal, store credentials securely, grant Dataverse permissions

---

## 4. Client Configuration & Connection Settings

### Basic Configuration

```python
from PowerPlatform.Dataverse.core.config import DataverseConfig
from azure.identity import DefaultAzureCredential
from PowerPlatform.Dataverse.client import DataverseClient

cfg = DataverseConfig()
cfg.logging_enable = True  # Enable detailed logging

client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=DefaultAzureCredential(),
    config=cfg
)
```

### HTTP Tuning

```python
from PowerPlatform.Dataverse.core.config import DataverseConfig

cfg = DataverseConfig()

# Timeout settings
cfg.http_timeout = 30          # Request timeout in seconds

# Retry configuration
cfg.http_retries = 3           # Number of retry attempts
cfg.http_backoff = 1           # Initial backoff in seconds

# Connection reuse
cfg.connection_timeout = 5     # Connection timeout

client = DataverseClient(
    base_url="https://myorg.crm.dynamics.com",
    credential=credential,
    config=cfg
)
```

---

## 5. Security Best Practices

### 1. Never Hardcode Credentials

```python
# ❌ BAD - Don't do this!
credential = ClientSecretCredential(
    tenant_id="your-tenant-id",
    client_id="your-client-id",
    client_secret="your-secret-key"  # EXPOSED!
)

# ✅ GOOD - Use environment variables
import os
credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"]
)
```

### 2. Store Secrets Securely

**Development**:
```bash
# .env file (git-ignored)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret-key
```

**Production**:
```python
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

# Retrieve secrets from Azure Key Vault
credential = DefaultAzureCredential()
client = SecretClient(
    vault_url="https://mykeyvault.vault.azure.net",
    credential=credential
)

secret = client.get_secret("dataverse-client-secret")
```

### 3. Implement Principle of Least Privilege

```python
# Grant minimal permissions:
# - Only read if app only reads
# - Only specific tables if possible
# - Time-limit credentials (auto-rotation)
# - Use managed identity instead of shared secrets
```

### 4. Monitor Authentication Events

```python
import logging

logger = logging.getLogger("dataverse_auth")

try:
    client = DataverseClient(
        base_url="https://myorg.crm.dynamics.com",
        credential=credential
    )
    logger.info("Successfully authenticated to Dataverse")
except Exception as e:
    logger.error(f"Authentication failed: {e}")
    raise
```

### 5. Handle Token Expiration

```python
from azure.core.exceptions import ClientAuthenticationError
import time

def create_with_auth_retry(client, table_name, payload, max_retries=2):
    """Create record, retrying if token expired."""
    for attempt in range(max_retries):
        try:
            return client.create(table_name, payload)
        except ClientAuthenticationError:
            if attempt < max_retries - 1:
                logger.warning("Token expired, retrying...")
                time.sleep(1)
            else:
                raise
```

---

## 6. Multi-Tenant Applications

### Tenant-Aware Client

```python
from azure.identity import DefaultAzureCredential
from PowerPlatform.Dataverse.client import DataverseClient

def get_client_for_tenant(tenant_id: str) -> DataverseClient:
    """Get DataverseClient for specific tenant."""
    credential = DefaultAzureCredential()
    
    # Dataverse URL contains tenant-specific org
    base_url = f"https://{get_org_for_tenant(tenant_id)}.crm.dynamics.com"
    
    return DataverseClient(
        base_url=base_url,
        credential=credential
    )

def get_org_for_tenant(tenant_id: str) -> str:
    """Map tenant to Dataverse organization."""
    # Implementation depends on your multi-tenant strategy
    # Could be database lookup, configuration, etc.
    pass
```

---

## 7. Troubleshooting Authentication

### Error: "Access Denied" (403)

```python
try:
    client.get("account")
except DataverseError as e:
    if e.status_code == 403:
        print("User/app lacks Dataverse permissions")
        print("Ensure Dataverse security role is assigned")
```

### Error: "Invalid Credentials" (401)

```python
# Check credential source
from azure.identity import DefaultAzureCredential

try:
    cred = DefaultAzureCredential(exclude_cli_credential=False, 
                                  exclude_powershell_credential=False)
    # Force re-authentication
    import subprocess
    subprocess.run(["az", "login"])
except Exception as e:
    print(f"Authentication failed: {e}")
```

### Error: "Invalid Tenant" 

```python
# Verify tenant ID
import json
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
token = credential.get_token("https://dataverse.dynamics.com/.default")

# Decode token to verify tenant
import base64
payload = base64.b64decode(token.token.split('.')[1] + '==')
claims = json.loads(payload)
print(f"Token tenant: {claims.get('tid')}")
```

---

## 8. Credential Lifecycle

### Token Refresh

Azure Identity handles token refresh automatically:

```python
# Tokens are cached and refreshed automatically
credential = DefaultAzureCredential()

# First call acquires token
client.get("account")

# Subsequent calls reuse cached token
client.get("contact")

# If token expires, SDK automatically refreshes
```

### Session Management

```python
class DataverseSession:
    """Manages DataverseClient lifecycle."""
    
    def __init__(self, base_url: str):
        from azure.identity import DefaultAzureCredential
        
        self.client = DataverseClient(
            base_url=base_url,
            credential=DefaultAzureCredential()
        )
    
    def __enter__(self):
        return self.client
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Cleanup if needed
        pass

# Usage
with DataverseSession("https://myorg.crm.dynamics.com") as client:
    records = client.get("account")
```

---

## 9. Dataverse-Specific Security

### Row-Level Security (RLS)

User's Dataverse security role determines accessible records:

```python
from azure.identity import InteractiveBrowserCredential
from PowerPlatform.Dataverse.client import DataverseClient

# Each user gets client with their credentials
def get_user_client(user_username: str) -> DataverseClient:
    # User must already be authenticated
    credential = InteractiveBrowserCredential()
    
    client = DataverseClient(
        base_url="https://myorg.crm.dynamics.com",
        credential=credential
    )
    
    # User only sees records they have access to
    return client
```

### Security Roles

Assign minimal required roles:
- **System Administrator**: Full access (avoid for apps)
- **Sales Manager**: Sales tables + reporting
- **Service Representative**: Service cases + knowledge
- **Custom**: Create role with specific table permissions

---

## 10. See Also

- [Azure Identity Client Library](https://learn.microsoft.com/en-us/python/api/azure-identity)
- [Authenticate to Azure Services](https://learn.microsoft.com/en-us/azure/developer/python/sdk/authentication/overview)
- [Azure Key Vault for Secrets](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
- [Dataverse Security Model](https://learn.microsoft.com/en-us/power-platform/admin/security/security-overview)
