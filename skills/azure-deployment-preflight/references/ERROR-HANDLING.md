# Error Handling Guide

This reference documents common errors during preflight validation and how to handle them.

## Core Principle

**Continue on failure.** Capture all issues in the final report rather than stopping at the first error. This gives users a complete picture of what needs to be fixed.

---

## Authentication Errors

### Not Logged In (Azure CLI)

**Detection:**
```
ERROR: Please run 'az login' to setup account.
ERROR: AADSTS700082: The refresh token has expired
```

**Exit Codes:** Non-zero

**Handling:**
1. Note the error in the report
2. Include remediation steps
3. Skip remaining Azure CLI commands
4. Continue with other validation steps if possible

**Report Entry:**
```markdown
#### ❌ Azure CLI Authentication Required

- **Severity:** Error
- **Source:** az cli
- **Message:** Not logged in to Azure CLI
- **Remediation:** Run `az login` to authenticate, then re-run preflight validation
- **Documentation:** https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli
```

### Not Logged In (azd)

**Detection:**
```
ERROR: not logged in, run `azd auth login` to login
```

**Handling:**
1. Note the error in the report
2. Skip azd commands
3. Suggest `azd auth login`

**Report Entry:**
```markdown
#### ❌ Azure Developer CLI Authentication Required

- **Severity:** Error
- **Source:** azd
- **Message:** Not logged in to Azure Developer CLI
- **Remediation:** Run `azd auth login` to authenticate, then re-run preflight validation
```

### Token Expired

**Detection:**
```
AADSTS700024: Client assertion is not within its valid time range
AADSTS50173: The provided grant has expired
```

**Handling:**
1. Note the error
2. Suggest re-authentication
3. Skip Azure operations

---

## Permission Errors

### Insufficient RBAC Permissions

**Detection:**
```
AuthorizationFailed: The client '...' with object id '...' does not have authorization 
to perform action '...' over scope '...'
```

**Handling:**
1. **First attempt:** Retry with `--validation-level ProviderNoRbac`
2. Note the permission limitation in the report
3. If ProviderNoRbac also fails, report the specific missing permission

**Report Entry:**
```markdown
#### ⚠️ Limited Permission Validation

- **Severity:** Warning
- **Source:** what-if
- **Message:** Full RBAC validation failed; using read-only validation
- **Detail:** Missing permission: `Microsoft.Resources/deployments/write` on scope `/subscriptions/xxx`
- **Recommendation:** Request Contributor role on the target resource group, or verify deployment permissions with your administrator
```

### Resource Group Not Found

**Detection:**
```
ResourceGroupNotFound: Resource group 'xxx' could not be found.
```

**Handling:**
1. Note in report
2. Suggest creating the resource group
3. Skip what-if for this scope

**Report Entry:**
```markdown
#### ❌ Resource Group Does Not Exist

- **Severity:** Error
- **Source:** what-if
- **Message:** Resource group 'my-rg' does not exist
- **Remediation:** Create the resource group before deployment:
  ```bash
  az group create --name my-rg --location eastus
  ```
```

### Subscription Access Denied

**Detection:**
```
SubscriptionNotFound: The subscription 'xxx' could not be found.
InvalidSubscriptionId: Subscription '...' is not valid
```

**Handling:**
1. Note in report
2. Suggest checking subscription ID
3. List available subscriptions

---

## Bicep Syntax Errors

### Compilation Errors

**Detection:**
```
/path/main.bicep(22,51) : Error BCP064: Found unexpected tokens
/path/main.bicep(10,5) : Error BCP018: Expected the "=" character at this location
```

**Handling:**
1. Parse error output for line/column numbers
2. Include all errors in report (don't stop at first)
3. Continue to what-if (may provide additional context)

**Report Entry:**
```markdown
#### ❌ Bicep Syntax Error

- **Severity:** Error
- **Source:** bicep build
- **Location:** `main.bicep:22:51`
- **Code:** BCP064
- **Message:** Found unexpected tokens in interpolated expression
- **Remediation:** Check the string interpolation syntax at line 22
- **Documentation:** https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/diagnostics/bcp064
```

### Module Not Found

**Detection:**
```
Error BCP091: An error occurred reading file. Could not find file '...'
Error BCP190: The module is not valid
```

**Handling:**
1. Note missing module
2. Check if `bicep restore` is needed
3. Verify module path

### Parameter File Issues

**Detection:**
```
Error BCP032: The value must be a compile-time constant
Error BCP035: The specified object is missing required properties
```

**Handling:**
1. Note parameter issues
2. Indicate which parameters are problematic
3. Suggest fixes

---

## Tool Not Installed

### Azure CLI Not Found

**Detection:**
```
'az' is not recognized as an internal or external command
az: command not found
```

**Handling:**
1. Note in report
2. Provide installation instructions.
  - If available use the Azure MCP `extension_cli_install` tool to get installation instructions.
  - Otherwise look for instructions at https://learn.microsoft.com/en-us/cli/azure/install-azure-cli.
3. Skip az commands

**Report Entry:**
```markdown
#### ⏭️ Azure CLI Not Installed

- **Severity:** Warning
- **Source:** environment
- **Message:** Azure CLI (az) is not installed or not in PATH
- **Remediation:** Install the Azure CLI <ADD INSTALLATION INSTRUCTIONS HERE>
- **Impact:** What-if validation using az commands was skipped
```

### Bicep CLI Not Found

**Detection:**
```
'bicep' is not recognized as an internal or external command
bicep: command not found
```

**Handling:**
1. Note in report
2. Azure CLI may have built-in Bicep - try `az bicep build`
3. Provide installation link

**Report Entry:**
```markdown
#### ⏭️ Bicep CLI Not Installed

- **Severity:** Warning
- **Source:** environment
- **Message:** Bicep CLI is not installed
- **Remediation:** Install Bicep CLI: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/install
- **Impact:** Syntax validation was skipped; Azure will validate during what-if
```

### Azure Developer CLI Not Found

**Detection:**
```
'azd' is not recognized as an internal or external command
azd: command not found
```

**Handling:**
1. If `azure.yaml` exists, this is required
2. Fall back to az CLI commands if possible
3. Note in report

---

## What-If Specific Errors

### Nested Template Limits

**Detection:**
```
The deployment exceeded the nested template limit of 500
```

**Handling:**
1. Note as warning (not error)
2. Explain affected resources show as "Ignore"
3. Suggest manual review

### Template Link Not Supported

**Detection:**
```
templateLink references in nested deployments won't be visible in what-if
```

**Handling:**
1. Note as warning
2. Explain limitation
3. Resources will be verified during actual deployment

### Unevaluated Expressions

**Detection:** Properties showing function names like `[utcNow()]` instead of values

**Handling:**
1. Note as informational
2. Explain these are evaluated at deployment time
3. Not an error

---

## Network Errors

### Timeout

**Detection:**
```
Connection timed out
Request timed out
```

**Handling:**
1. Suggest retry
2. Check network connectivity
3. May indicate Azure service issues

### SSL/TLS Errors

**Detection:**
```
SSL: CERTIFICATE_VERIFY_FAILED
unable to get local issuer certificate
```

**Handling:**
1. Note in report
2. May indicate proxy or corporate firewall
3. Suggest checking SSL settings

---

## Fallback Strategy

When primary validation fails, attempt fallbacks in order:

```
Provider (full RBAC validation)
    ↓ fails with permission error
ProviderNoRbac (validation without write permission check)
    ↓ fails
Template (static syntax only)
    ↓ fails
Report all failures and skip what-if analysis
```

**Always continue to generate the report**, even if all validation steps fail.

---

## Error Report Aggregation

When multiple errors occur, aggregate them logically:

1. **Group by source** (bicep, what-if, permissions)
2. **Order by severity** (errors before warnings)
3. **Deduplicate** similar errors
4. **Provide summary count** at the top

Example:
```markdown
## Issues

Found **3 errors** and **2 warnings**

### Errors (3)

1. [Bicep Syntax Error - main.bicep:22:51](#error-1)
2. [Bicep Syntax Error - main.bicep:45:10](#error-2)
3. [Resource Group Not Found](#error-3)

### Warnings (2)

1. [Limited Permission Validation](#warning-1)
2. [Nested Template Limit Reached](#warning-2)
```

---

## Exit Code Reference

| Tool | Exit Code | Meaning |
|------|-----------|---------|
| az | 0 | Success |
| az | 1 | General error |
| az | 2 | Command not found |
| az | 3 | Required argument missing |
| azd | 0 | Success |
| azd | 1 | Error |
| bicep | 0 | Build succeeded |
| bicep | 1 | Build failed (errors) |
| bicep | 2 | Build succeeded with warnings |
