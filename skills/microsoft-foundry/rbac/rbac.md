# Microsoft Foundry RBAC Management

Reference for managing RBAC for Microsoft Foundry resources: user permissions, managed identity configuration, and service principal setup for CI/CD.

## Quick Reference

| Property | Value |
|----------|-------|
| **CLI Extension** | `az role assignment`, `az ad sp` |
| **Resource Type** | `Microsoft.CognitiveServices/accounts` |
| **Best For** | Permission management, access auditing, CI/CD setup |

## When to Use

- Grant user access to Foundry resources or projects
- Set up developer permissions (Project Manager, Owner roles)
- Audit role assignments or validate permissions
- Configure managed identity roles for connected resources
- Create service principals for CI/CD pipeline automation
- Troubleshoot permission errors

## Azure AI Foundry Built-in Roles

| Role | Create Projects | Data Actions | Role Assignments |
|------|-----------------|--------------|------------------|
| Azure AI User | No | Yes | No |
| Azure AI Project Manager | Yes | Yes | Yes (AI User only) |
| Azure AI Account Owner | Yes | No | Yes (AI User only) |
| Azure AI Owner | Yes | Yes | Yes |

> ⚠️ **Warning:** Azure AI User is auto-assigned via Portal but NOT via SDK/CLI. Automation must explicitly assign roles.

## Workflows

All scopes follow the pattern: `/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.CognitiveServices/accounts/<foundry-resource-name>`

For project-level scoping, append `/projects/<project-name>`.

### 1. Assign User Permissions

```bash
az role assignment create --role "Azure AI User" --assignee "<user-email-or-object-id>" --scope "<foundry-scope>"
```

### 2. Assign Developer Permissions

```bash
# Project Manager (create projects, assign AI User roles)
az role assignment create --role "Azure AI Project Manager" --assignee "<user-email-or-object-id>" --scope "<foundry-scope>"

# Full ownership including data actions
az role assignment create --role "Azure AI Owner" --assignee "<user-email-or-object-id>" --scope "<foundry-scope>"
```

### 3. Audit Role Assignments

```bash
# List all assignments
az role assignment list --scope "<foundry-scope>" --output table

# Detailed with principal names
az role assignment list --scope "<foundry-scope>" --query "[].{Principal:principalName, PrincipalType:principalType, Role:roleDefinitionName}" --output table

# Azure AI roles only
az role assignment list --scope "<foundry-scope>" --query "[?contains(roleDefinitionName, 'Azure AI')].{Principal:principalName, Role:roleDefinitionName}" --output table
```

### 4. Validate Permissions

```bash
# Current user's roles on resource
az role assignment list --assignee "$(az ad signed-in-user show --query id -o tsv)" --scope "<foundry-scope>" --query "[].roleDefinitionName" --output tsv

# Check actions available to a role
az role definition list --name "Azure AI User" --query "[].permissions[].actions" --output json
```

**Permission Requirements by Action:**

| Action | Required Role(s) |
|--------|------------------|
| Deploy models | Azure AI User, Azure AI Project Manager, Azure AI Owner |
| Create projects | Azure AI Project Manager, Azure AI Account Owner, Azure AI Owner |
| Assign Azure AI User role | Azure AI Project Manager, Azure AI Account Owner, Azure AI Owner |
| Full data access | Azure AI User, Azure AI Project Manager, Azure AI Owner |

### 5. Configure Managed Identity Roles

```bash
# Get managed identity principal ID
PRINCIPAL_ID=$(az cognitiveservices account show --name <foundry-resource-name> --resource-group <resource-group> --query identity.principalId --output tsv)

# Assign roles to connected resources (repeat pattern for each)
az role assignment create --role "<role-name>" --assignee "$PRINCIPAL_ID" --scope "<resource-scope>"
```

**Common Managed Identity Role Assignments:**

| Connected Resource | Role | Purpose |
|--------------------|------|---------|
| Azure Storage | Storage Blob Data Reader | Read files/documents |
| Azure Storage | Storage Blob Data Contributor | Read/write files |
| Azure Key Vault | Key Vault Secrets User | Read secrets |
| Azure AI Search | Search Index Data Reader | Query indexes |
| Azure AI Search | Search Index Data Contributor | Query and modify indexes |
| Azure Cosmos DB | Cosmos DB Account Reader | Read data |

### 6. Create Service Principal for CI/CD

```bash
# Create SP with minimal role
az ad sp create-for-rbac --name "foundry-cicd-sp" --role "Azure AI User" --scopes "<foundry-scope>" --output json
# Output contains: appId, password, tenant — store securely

# For project management permissions
az ad sp create-for-rbac --name "foundry-cicd-admin-sp" --role "Azure AI Project Manager" --scopes "<foundry-scope>" --output json

# Add Contributor for resource provisioning
SP_APP_ID=$(az ad sp list --display-name "foundry-cicd-sp" --query "[0].appId" -o tsv)
az role assignment create --role "Contributor" --assignee "$SP_APP_ID" --scope "/subscriptions/<subscription-id>/resourceGroups/<resource-group>"
```

> 💡 **Tip:** Use least privilege — start with `Azure AI User` and add roles as needed.

| CI/CD Scenario | Recommended Role | Additional Roles |
|----------------|------------------|------------------|
| Deploy models only | Azure AI User | None |
| Manage projects | Azure AI Project Manager | None |
| Full provisioning | Azure AI Owner | Contributor (on RG) |
| Read-only monitoring | Reader | Azure AI User (for data) |

**CI/CD Pipeline Login:**

```bash
az login --service-principal --username "<app-id>" --password "<client-secret>" --tenant "<tenant-id>"
az account set --subscription "<subscription-id>"
```

## Error Handling

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Authorization failed" when deploying | Missing Azure AI User role | Assign Azure AI User role at resource scope |
| Cannot create projects | Missing Project Manager or Owner role | Assign Azure AI Project Manager role |
| "Access denied" on connected resources | Managed identity missing roles | Assign appropriate roles to MI on each resource |
| Portal works but CLI fails | Portal auto-assigns roles, CLI doesn't | Explicitly assign Azure AI User via CLI |
| Service principal cannot access data | Wrong role or scope | Verify Azure AI User is assigned at correct scope |
| "Principal does not exist" | User/SP not found in directory | Verify the assignee email or object ID is correct |
| Role assignment already exists | Duplicate assignment attempt | Use `az role assignment list` to verify existing assignments |

## Additional Resources

- [Azure AI Foundry RBAC Documentation](https://learn.microsoft.com/azure/ai-foundry/concepts/rbac-ai-foundry)
- [Azure Built-in Roles](https://learn.microsoft.com/azure/role-based-access-control/built-in-roles)
- [Managed Identities Overview](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview)
- [Service Principal Authentication](https://learn.microsoft.com/azure/developer/github/connect-from-azure)
