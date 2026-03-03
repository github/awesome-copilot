# Key Vault - SDK Patterns

## Node.js

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../../auth-best-practices.md) for production patterns.

```javascript
const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");

const client = new SecretClient(
  process.env.KEY_VAULT_URL,
  new DefaultAzureCredential()
);

const secret = await client.getSecret("database-connection-string");
console.log(secret.value);
```

## Python

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../../auth-best-practices.md) for production patterns.

```python
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

client = SecretClient(
    vault_url=os.environ["KEY_VAULT_URL"],
    credential=DefaultAzureCredential()
)

secret = client.get_secret("database-connection-string")
print(secret.value)
```

## .NET

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../../auth-best-practices.md) for production patterns.

```csharp
var client = new SecretClient(
    new Uri(Environment.GetEnvironmentVariable("KEY_VAULT_URL")),
    new DefaultAzureCredential()
);

KeyVaultSecret secret = await client.GetSecretAsync("database-connection-string");
Console.WriteLine(secret.Value);
```

## Event Grid Integration (Expiry Notifications)

```bicep
resource kvEventSubscription 'Microsoft.EventGrid/eventSubscriptions@2023-12-15-preview' = {
  name: 'secret-expiry-notification'
  scope: keyVault
  properties: {
    destination: {
      endpointType: 'WebHook'
      properties: {
        endpointUrl: 'https://my-api.example.com/secret-rotation'
      }
    }
    filter: {
      includedEventTypes: [
        'Microsoft.KeyVault.SecretNearExpiry'
        'Microsoft.KeyVault.SecretExpired'
      ]
    }
  }
}
```
