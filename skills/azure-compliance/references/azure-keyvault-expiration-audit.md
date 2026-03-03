# Key Vault Expiration Audit & Compliance

Automated auditing of Azure Key Vault resources to identify expired or expiring keys, secrets, and certificates before they cause service disruptions.

## Overview

This skill monitors Azure Key Vault resources (keys, secrets, certificates) for expiration issues. It helps prevent service disruptions by identifying:
- **Expired resources** causing active problems
- **Expiring soon** (within customizable days threshold)
- **Missing expiration dates** (security risk)
- **Disabled resources** needing cleanup

## Core Workflow

1. **List Resources**: Enumerate keys, secrets, and certificates in target vault(s)
2. **Get Details**: Retrieve expiration metadata for each resource
3. **Analyze Status**: Compare expiration dates against current date and threshold
4. **Generate Report**: Organize findings by priority with actionable recommendations

## Audit Patterns

### Pattern 1: Single Vault Quick Scan
Check one Key Vault for all expiration issues with configurable day threshold (default: 30 days).

**Tools**: `keyvault_key_list`, `keyvault_key_get`, `keyvault_secret_list`, `keyvault_secret_get`, `keyvault_certificate_list`, `keyvault_certificate_get`

### Pattern 2: Multi-Vault Compliance Report
Scan multiple vaults across subscription for comprehensive security review.

**Use for**: Quarterly audits, organization-wide compliance checks

### Pattern 3: Resource Type Focus
Audit only keys, secrets, OR certificates when specific resource type is mentioned.

**Use for**: Certificate renewal planning, secret rotation tracking

### Pattern 4: Emergency Expired Finder
Quick scan for already-expired resources (negative days) to troubleshoot active incidents.

**Use for**: Production issues, authentication failures

## Key Data Fields

When retrieving resource details, analyze these fields:
- **expiresOn**: Expiration timestamp (null = no expiration set - security risk!)
- **enabled**: Resource is active (false = disabled/inactive)
- **notBefore**: When resource becomes valid
- **createdOn/updatedOn**: For tracking resource age and last rotation
- **subject/issuer**: Certificate-specific metadata

## Report Format

Organize findings into:
- **Summary Statistics**: Total count, expired count, expiring count, no-expiration count per resource type
- **Critical Issues**: Expired resources requiring immediate action
- **Warnings**: Expiring within threshold (e.g., 30 days)
- **Risks**: Resources without expiration dates
- **Recommendations**: Set expiration policies, rotate credentials, remove disabled items

## Remediation Priority

**🔴 Critical** - Expired (< 0 days): Rotate immediately  
**🟠 High** - Expiring 0-7 days: Schedule rotation within 24 hours  
**🟡 Medium** - Expiring 8-30 days: Plan rotation within 1 week  
**🟡 Medium** - No expiration set: Apply expiration policy  
**🟢 Low** - Active (> 30 days): Monitor on regular schedule

## Best Practices

- Run weekly audits to catch issues early
- All resources should have expiration dates (Azure Policy recommendation)
- Configure Azure Event Grid for 30-day advance notifications
- Rotation schedule: Secrets every 60-90 days, Keys annually, Certificates per CA requirements (max 1 year)
- Prioritize production Key Vaults over dev/test
- Automate rotation with Azure Functions or Logic Apps

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `keyvault_key_list` | List all keys in a vault |
| `keyvault_key_get` | Get key details including expiration |
| `keyvault_secret_list` | List all secrets in a vault |
| `keyvault_secret_get` | Get secret details including expiration |
| `keyvault_certificate_list` | List all certificates in a vault |
| `keyvault_certificate_get` | Get certificate details including expiration |

**Required**: `vault` (Key Vault name)  
**Optional**: `subscription`, `tenant`

## Fallback Strategy: Azure CLI Commands

If Azure MCP Key Vault tools fail, timeout, or are unavailable, use Azure CLI commands as fallback.

### CLI Command Reference

| Operation | Azure CLI Command |
|-----------|-------------------|
| List secrets | `az keyvault secret list --vault-name <vault-name>` |
| Get secret details | `az keyvault secret show --vault-name <vault-name> --name <secret-name>` |
| List keys | `az keyvault key list --vault-name <vault-name>` |
| Get key details | `az keyvault key show --vault-name <vault-name> --name <key-name>` |
| List certificates | `az keyvault certificate list --vault-name <vault-name>` |
| Get certificate details | `az keyvault certificate show --vault-name <vault-name> --name <cert-name>` |

### When to Fallback

Switch to Azure CLI when:
- MCP tool returns timeout error
- MCP tool returns "service unavailable" or connection errors
- MCP tool takes longer than 30 seconds to respond
- Empty response when vault is known to have resources

## Common Issues

- **Access Denied**: Verify RBAC permissions (Key Vault Reader + data plane access)
- **Vault Not Found**: Check vault name and subscription context
- **Null expiresOn**: Resource has no expiration (security risk - requires policy)
- **Time zones**: All timestamps are UTC