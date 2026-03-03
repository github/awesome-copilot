# Security Hardening

Secure Azure resources following Zero Trust principles.

## Security Principles

1. **Zero Trust** — Never trust, always verify
2. **Least Privilege** — Minimum required permissions
3. **Defense in Depth** — Multiple security layers
4. **Encryption Everywhere** — At rest and in transit

---

## Security Services

| Service | Use When | MCP Tools | CLI |
|---------|----------|-----------|-----|
| Key Vault | Secrets, keys, certificates | `azure__keyvault` | `az keyvault` |
| Managed Identity | Credential-free authentication | — | `az identity` |
| RBAC | Role-based access control | `azure__role` | `az role` |
| Entra ID | Identity and access management | — | `az ad` |
| Defender | Threat protection, security posture | — | `az security` |

### MCP Tools (Preferred)

When Azure MCP is enabled:

**Key Vault:**
- `azure__keyvault` with command `keyvault_list` — List Key Vaults
- `azure__keyvault` with command `keyvault_secret_list` — List secrets
- `azure__keyvault` with command `keyvault_secret_get` — Get secret value
- `azure__keyvault` with command `keyvault_key_list` — List keys
- `azure__keyvault` with command `keyvault_certificate_list` — List certificates

**RBAC:**
- `azure__role` with command `role_assignment_list` — List role assignments
- `azure__role` with command `role_definition_list` — List role definitions

### CLI Quick Reference

```bash
# Key Vault
az keyvault list --output table
az keyvault secret list --vault-name VAULT --output table

# RBAC
az role assignment list --output table

# Managed Identity
az identity list --output table
```

---

## Identity and Access

### Checklist

- [ ] Use managed identities (no credentials in code)
- [ ] Enable MFA for all users
- [ ] Apply least privilege RBAC
- [ ] Use Microsoft Entra ID for authentication
- [ ] Review access regularly

### Managed Identity

```bash
# App Service
az webapp identity assign --name APP -g RG

# Container Apps
az containerapp identity assign --name APP -g RG --system-assigned

# Function App
az functionapp identity assign --name APP -g RG
```

### Grant Access

```bash
# Grant Key Vault access
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee IDENTITY_PRINCIPAL_ID \
  --scope /subscriptions/SUB/resourceGroups/RG/providers/Microsoft.KeyVault/vaults/VAULT
```

### Permissions Required to Grant Roles

> ⚠️ **Important**: To assign RBAC roles to identities, you need a role with the `Microsoft.Authorization/roleAssignments/write` permission.

| Your Role | Permissions | Recommended For |
|-----------|-------------|-----------------|
| **User Access Administrator** | Assign roles (no data access) | ✅ Least privilege for role assignment |
| **Owner** | Full access + assign roles | ❌ More permissions than needed |
| **Custom Role** | Specific permissions including roleAssignments/write | ✅ Fine-grained control |

**Common Scenario**: Granting Storage Blob Data Owner to a Web App's managed identity

```bash
# You need User Access Administrator (or Owner) on the Storage Account to run this:
az role assignment create \
  --role "Storage Blob Data Owner" \
  --assignee WEBAPP_PRINCIPAL_ID \
  --scope /subscriptions/SUB/resourceGroups/RG/providers/Microsoft.Storage/storageAccounts/ACCOUNT
```

If you encounter `AuthorizationFailed` errors when assigning roles, you likely need the User Access Administrator role at the target scope.

### RBAC Best Practices

| Role | Use When |
|------|----------|
| Owner | Full access + assign roles |
| Contributor | Full access except IAM |
| Reader | View-only access |
| Key Vault Secrets User | Read secrets only |
| Storage Blob Data Reader | Read blobs only |

```bash
# Grant minimal role at resource scope
az role assignment create \
  --role "Storage Blob Data Reader" \
  --assignee PRINCIPAL_ID \
  --scope /subscriptions/SUB/resourceGroups/RG/providers/Microsoft.Storage/storageAccounts/ACCOUNT
```

---

## Network Security

### Checklist

- [ ] Use private endpoints for PaaS services
- [ ] Configure NSGs on all subnets
- [ ] Disable public endpoints where possible
- [ ] Enable DDoS protection
- [ ] Use Azure Firewall or NVA

### Private Endpoints

```bash
# Create private endpoint for storage
az network private-endpoint create \
  --name myEndpoint -g RG \
  --vnet-name VNET --subnet SUBNET \
  --private-connection-resource-id STORAGE_ID \
  --group-id blob \
  --connection-name myConnection
```

### NSG Rules

```bash
# Deny all inbound by default, allow only required traffic
az network nsg rule create \
  --nsg-name NSG -g RG \
  --name AllowHTTPS \
  --priority 100 \
  --destination-port-ranges 443 \
  --access Allow
```

### Best Practices

1. **Default deny** — Block all traffic by default, allow only required
2. **Segment networks** — Use subnets and NSGs to isolate workloads
3. **Private endpoints** — Use for all PaaS services in production
4. **Service endpoints** — Alternative to private endpoints for simpler scenarios
5. **Azure Firewall** — Centralize egress traffic control

---

## Data Protection

### Checklist

- [ ] Enable encryption at rest (default for most Azure services)
- [ ] Use TLS 1.2+ for transit
- [ ] Store secrets in Key Vault
- [ ] Enable soft delete for Key Vault
- [ ] Use customer-managed keys (CMK) for sensitive data

### Key Vault Security

```bash
# Enable soft delete and purge protection
az keyvault update \
  --name VAULT -g RG \
  --enable-soft-delete true \
  --enable-purge-protection true

# Enable RBAC permission model
az keyvault update \
  --name VAULT -g RG \
  --enable-rbac-authorization true
```

### Best Practices

1. **Never store secrets in code** — Use Key Vault or managed identity
2. **Rotate secrets regularly** — Set expiration dates and automate rotation
3. **Enable soft delete** — Protect against accidental deletion
4. **Enable purge protection** — Prevent permanent deletion during retention
5. **Use RBAC for Key Vault** — Prefer over access policies
6. **Customer-managed keys** — For sensitive data requiring key control

---

## Monitoring and Defender

### Checklist

- [ ] Enable Microsoft Defender for Cloud
- [ ] Configure diagnostic logging
- [ ] Set up security alerts
- [ ] Enable audit logging

### Microsoft Defender for Cloud

```bash
# Enable Defender plans
az security pricing create \
  --name VirtualMachines \
  --tier Standard
```

### Security Assessment

Use Microsoft Defender for Cloud for:
- Security score
- Recommendations
- Compliance assessment
- Threat detection

### Best Practices

1. **Enable Defender** — For all production workloads
2. **Review security score** — Address high-priority recommendations
3. **Configure alerts** — Set up notifications for security events
4. **Diagnostic logs** — Enable for all resources, send to Log Analytics
5. **Audit logging** — Track administrative actions and access

---

## Azure Identity SDK

All Azure SDKs use their language's Identity library for credential-free authentication. Use `DefaultAzureCredential` for **local development only**; in production, use `ManagedIdentityCredential` or another deterministic credential — see [auth-best-practices.md](auth-best-practices.md). Rust uses `DeveloperToolsCredential` as it doesn't have a `DefaultAzureCredential` equivalent.

| Language | Package | Install |
|----------|---------|---------|
| .NET | `Azure.Identity` | `dotnet add package Azure.Identity` |
| Java | `azure-identity` | Maven: `com.azure:azure-identity` |
| JavaScript | `@azure/identity` | `npm install @azure/identity` |
| Python | `azure-identity` | `pip install azure-identity` |
| Go | `azidentity` | `go get github.com/Azure/azure-sdk-for-go/sdk/azidentity` |
| Rust | `azure_identity` | `cargo add azure_identity` |

For Key Vault SDK examples, see: [Key Vault Reference](services/key-vault/README.md)

For Storage SDK examples, see: [Storage Reference](services/storage/README.md)

---

## Further Reading

- [Key Vault documentation](https://learn.microsoft.com/azure/key-vault/general/overview)
- [Managed identities documentation](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview)
- [Azure RBAC documentation](https://learn.microsoft.com/azure/role-based-access-control/overview)
- [Microsoft Defender for Cloud](https://learn.microsoft.com/azure/defender-for-cloud/defender-for-cloud-introduction)
