---
name: sst-sql-secretless-auth
description: 'Helps developers migrate Azure SQL Database connections from SQL authentication (username/password) to Microsoft Entra ID authentication using Managed Identity — eliminating stored credentials and strengthening identity security.'
metadata:
  version: "1.0.0"
---

# Azure SQL Database Entra Auth Migration

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

---

## Overview

This skill helps you migrate Azure SQL Database connections from SQL authentication (username/password) to Microsoft Entra ID authentication using Managed Identity — a security best practice aligned with [**Pillar 1: Protect identities and secrets**](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) of Microsoft's [Secure Future Initiative](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-overview) and [Zero Trust principles](https://learn.microsoft.com/security/zero-trust/).

Eliminating stored credentials and leveraging Azure's identity platform strengthens identity security, centralizes access governance, and removes the risk of credential leakage.

---

## Source of Truth: Canonical Migration Guide

The source of truth for this migration is the [Securing Azure SQL Database with Microsoft Entra Password-less Authentication: Migration Guide](https://techcommunity.microsoft.com/blog/azuresqlblog/securing-azure-sql-database-with-microsoft-entra-password-less-authentication-mi/4470734) (Azure SQL Blog). This skill is based on that guide: the 8 numbered steps below mirror the guide's 8-step flow. The skill adds practical IaC, application-code, troubleshooting, and rollback content that the guide does not cover. Where the skill and the guide differ on sequence or wording, **the guide is authoritative**.

### Runtime alignment check

Before doing any migration work, the agent running this skill must verify that the skill is still aligned with the canonical guide. Treat the steps below as a precondition gate — they run once, at the start of a session, before Step 1.

- **Fetch the canonical guide.** Retrieve the current content of the canonical guide URL above. If retrieval fails (network, access, blog moved), surface the failure to the user, note that alignment cannot be verified, and ask whether to proceed on the skill alone or stop. Do not silently proceed.
- **Compare the 8-step flow.** Check that the guide still presents an 8-step flow and that the step titles / sequence match the **High-Level Migration Steps** list below. Material drift includes: a step added, removed, renumbered, or its scope changed (e.g., the audit gate moves from post-Step-5 to a different stage).
- **Surface any drift before starting work.** If drift is detected, summarize it to the user (which steps changed, how) and ask how to proceed. The default is: follow the guide, flag each affected skill section as out-of-date, and recommend a skill update before relying on the affected sections.
- **On per-step conflicts during execution, defer to the guide.** If a specific step's procedure in the guide conflicts with the skill's procedure (e.g., different SQL syntax, different IaC field name, different ordering within a step), use the guide's procedure for the operation and note the divergence to the user.
- **Skill-only sections are not gated by the guide.** The two skill addenda (*Remove SQL secrets from configuration*, *Monitor & iterate*), the Rollback Plan's three-regime structure, and the IaC / application-code samples are skill-original content. Drift in the canonical guide does not invalidate them on its own; they are only invalidated if the guide adds or changes guidance that contradicts them.

---

## Engagement Mode: Explain Before Proposing

While working through this skill, you are in **explanation mode** until the developer
**explicitly asks for changes** — help them understand what the guidance recommends and how
it applies; do not draft a plan or propose edits.

- **Lead with the "why" in prose** — what the guidance recommends and how it applies here, not a checklist, table, or file list. Name the docs as the source.
- **Offer the scan as read-only** — say why, and wait for the developer to accept before scanning.
- **Report findings as coverage** — what's done, partial, or not yet done; never a change list.
- **Don't ask pre-edit decisions** (credential type, target version) until the developer asks to proceed.
- **Close with an understanding or options check** — never "Shall I apply this?" before they engage.
- **Scan consent ≠ edit consent; exit only on an explicit "make the change" signal** — a prior "yes" to scanning doesn't count.

---

## Migration Overview

| **Aspect** | **Description** |
|------------|----------------|
| **Problem** | Azure SQL Database connection uses SQL authentication (User Id/Password in connection string) instead of Microsoft Entra ID authentication |
| **Risk** | SQL credentials can be compromised, leaked, or rotated improperly; no centralized identity governance |
| **Security Principle** | [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) — eliminate shared secrets, authenticate with managed identities. See also: [Zero Trust: Verify explicitly](https://learn.microsoft.com/security/zero-trust/) |
| **Migration Goal** | Replace SQL username/password authentication with Managed Identity token-based authentication |
| **Scope** | IaC (SQL server & database config), application code (connection strings & authentication), configuration (secret removal) |

---

## High-Level Migration Steps

Steps 1–8 mirror the canonical guide. Step 0 is a skill-only preflight that runs once before the canonical flow begins; it is outside the guide's 8-step count and exists to confirm the skill is still aligned with the guide before any migration work starts. Two additional skill-only sections (not in the canonical guide) are interleaved at the points where they are operationally required:

0. **Verify alignment with the canonical guide** (preflight — skill-only, outside the canonical 8 steps)
   - Run the **Runtime alignment check** in the [Source of Truth: Canonical Migration Guide](#source-of-truth-canonical-migration-guide) section before proceeding to Step 1.
1. **Identify your logins and users** (discovery — SQL Auditing)
2. **Enable Microsoft Entra authentication — assign admin in mixed mode** (IaC)
3. **Identify and document existing permissions** (SQL)
   - Enumerate `sys.sql_logins`, `sys.database_principals`, role memberships, and explicit `GRANT` / `DENY` rows per principal you intend to migrate
4. **Create SQL users for your Microsoft Entra identities** (SQL)
5. **Update programmatic connections** (client code)
   - *Skill addendum: Remove SQL secrets from configuration* — runs after Step 5 connections are validated and before the Step 6 audit re-run.
6. **Validate no local-auth traffic** (audit re-run)
7. **Enable Microsoft Entra-only authentication** (final cutover, IaC)
8. **Enforce Entra-only at scale** (Azure Policy)
   - *Skill addendum: Monitor & iterate* — steady-state observability after cutover.

---

## 🔐 Azure SQL Database Entra Authentication Architecture

### Identity Flow

```
┌─────────────────────┐
│ Application with    │
│ Managed Identity    │
└──────────┬──────────┘
           │
           │ 1. Request token for
           │    "https://database.windows.net/.default"
           ▼
┌─────────────────────┐
│ Entra ID            │
│ (Identity Provider) │
└──────────┬──────────┘
           │
           │ 2. Return access token
           ▼
┌─────────────────────┐
│ Application         │
│ (uses token in      │
│  SQL connection)    │
└──────────┬──────────┘
           │
           │ 3. Connect with token
           ▼
┌─────────────────────┐
│ Azure SQL Database  │
│ (validates token    │
│  against Entra)     │
└─────────────────────┘
```

**Key Concepts:**
- **Managed Identity**: Azure resource's automatically managed identity in Entra ID (no secrets to manage)
- **Contained Database User**: Database-level principal mapped to Entra identity (no server-level login required)
- **Access Token**: Time-limited JWT token with `aud: https://database.windows.net`
- **Entra-Only Authentication**: SQL server mode that disables SQL authentication entirely

---

## Step 1: Identify your logins and users (SQL Auditing)

> Do not run Step 1 until the developer has explicitly asked to start the migration or audit. Step 1 is procedural; it is not the agent's first message after the alignment check. See **Engagement Mode: Explain Before Proposing** above.

Before changing anything, enumerate who is actually authenticating with SQL Auth today. The canonical guide does this via Azure SQL Auditing and a T-SQL query against the audit log. Live-session views (`sys.dm_exec_sessions`) are not sufficient — they miss batch jobs, schedulers, and any caller that happens to be idle when you check.

### Enable SQL Auditing on the server (if not already enabled)

The audit log is written to a storage account in the SQL Database audit log format. Ensure server-level auditing is on for the period you intend to query.

```bash
# Example: enable server-level auditing to a storage account
az sql server audit-policy update \
  --resource-group myResourceGroup \
  --name mySqlServer \
  --state Enabled \
  --storage-account <storage-account-name>
```

### Enumerate SQL Auth callers

Connect as the Entra admin (after Step 2 lands) or as the existing SQL admin, and run:

```sql
-- Identify SQL Auth logins/users active in the audit window.
-- action_id 'DBAF' = database authentication failed; 'DBAS' = database authentication succeeded.
SELECT
    af.database_name,
    af.server_principal_name,
    af.database_principal_name,
    sp.sid          AS server_principal_sid,
    dp.sid          AS database_principal_sid,
    COUNT(*)        AS auth_event_count,
    MIN(af.event_time) AS first_seen,
    MAX(af.event_time) AS last_seen
FROM sys.fn_get_audit_file_v2(
    '<audit-log-location>',  -- storage path or URL where SQL Auditing writes log files
    DEFAULT, DEFAULT, DEFAULT, DEFAULT
) AS af
LEFT JOIN sys.server_principals   AS sp ON sp.name = af.server_principal_name
LEFT JOIN sys.database_principals AS dp ON dp.name = af.database_principal_name
WHERE (action_id = 'DBAF' OR action_id = 'DBAS')
GROUP BY af.database_name, af.server_principal_name, af.database_principal_name, sp.sid, dp.sid
ORDER BY auth_event_count DESC;
```

The result lists every principal that has authenticated to this database in the audit window, the count of auth events, and first/last-seen timestamps. Use it to:

- Identify principals that need an Entra-based equivalent (Steps 3 and 4).
- Spot intermittent / batch callers that won't be visible in `sys.dm_exec_sessions`.
- Establish a baseline you can compare against in Step 6.

> **If you don't have audit access.** The guide allows skipping this step *only* if you already have full visibility of every login through another mechanism. Live-session queries do not count.

---

## Step 2: Enable Microsoft Entra authentication — assign admin (mixed mode, IaC)

> **Mixed mode only.** This step assigns the Microsoft Entra admin while keeping SQL authentication enabled. Do **not** set `azureADOnlyAuthentication: true` (Bicep), `azuread_authentication_only = true` (Terraform), or run `az sql server ad-only-auth enable` here. Entra-only enablement is a separate later step (Step 7) that runs only after applications are validated on managed identity and the Step 6 audit re-run shows zero local-auth traffic. Combining these in a single deployment breaks every existing SQL Auth connection on first apply, with no SQL credential left for rollback.

### Bicep/ARM Template

Update your `Microsoft.Sql/servers` resource:

```bicep
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    // KEEP the SQL admin login during migration. It is the break-glass / rollback
    // credential. Removing it is a separate, later change gated on rollback retirement.
    administratorLogin: 'sqladmin'
    administratorLoginPassword: adminPassword

    // Assign the Microsoft Entra admin in MIXED MODE (SQL auth still works).
    administrators: {
      administratorType: 'ActiveDirectory'
      principalType: 'Group'  // or 'User' for individual
      login: 'SQL Admins Group'  // Entra group or user name
      sid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'  // Object ID from Entra
      tenantId: subscription().tenantId
      azureADOnlyAuthentication: false  // mixed mode — flipped to true in the final cutover step (Step 7)
    }

    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'  // Enforce private connectivity
  }
}
```

**Terraform Example:**

```hcl
resource "azurerm_mssql_server" "example" {
  name                         = var.sql_server_name
  resource_group_name          = azurerm_resource_group.example.name
  location                     = azurerm_resource_group.example.location
  version                      = "12.0"

  # KEEP the SQL admin credentials during migration. They are the break-glass /
  # rollback path. Removing them is a separate, later change gated on rollback retirement.
  administrator_login          = "sqladmin"
  administrator_login_password = var.admin_password

  azuread_administrator {
    login_username              = "SQL Admins Group"
    object_id                   = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    tenant_id                   = data.azurerm_client_config.current.tenant_id
    azuread_authentication_only = false  # mixed mode — flipped to true in the final cutover step (Step 7)
  }

  minimum_tls_version          = "1.2"
  public_network_access_enabled = false
}
```

**Azure CLI (for testing/manual setup):**

```bash
# Step 2 (mixed mode): set the Entra admin only. SQL auth still works.
az sql server ad-admin create \
  --resource-group myResourceGroup \
  --server-name mySqlServer \
  --display-name "SQL Admins Group" \
  --object-id aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee

# Do NOT run `az sql server ad-only-auth enable` here.
# That belongs in the final cutover step (Step 7), after applications are validated
# on managed identity and the SQL Auth audit shows zero local-auth traffic.
```

---

## Step 3: Identify and document existing permissions (SQL)

Before creating Entra users (Step 4), enumerate every SQL Auth principal you intend to migrate and document the permissions they currently hold. The new Entra user's grants are derived from this inventory. Skipping this step silently changes the authorization model: apps with narrow grants get over-privileged, and apps with wide grants get under-privileged. Both failures surface only at runtime.

Run all queries connected as the Entra admin (Step 2) or the existing SQL admin. The first query runs against `master`; the others run against each user database in scope.

### Enumerate server-level SQL logins

```sql
-- Run on master.
SELECT name, sid, type_desc, is_disabled, create_date, modify_date
FROM sys.sql_logins
ORDER BY name;
```

`type_desc = 'SQL_LOGIN'` rows are SQL Auth logins. Cross-reference this list with the audit results from Step 1 — any login that appears in the audit but not here is a stale entry; any login here that's missing from the audit may be inactive.

### Enumerate database-level SQL users

```sql
-- Run on each user database.
SELECT name, sid, type_desc, default_schema_name, create_date, modify_date
FROM sys.database_principals
WHERE type = 'S'
ORDER BY name;
```

`type = 'S'` filters to SQL Auth users (mapped to a SQL login). For each row, note the `default_schema_name` — schema-scoped grants are easy to miss otherwise.

### Enumerate role memberships per user

```sql
-- Run on each user database.
SELECT
    member.name           AS user_name,
    role.name             AS role_name
FROM sys.database_role_members rm
JOIN sys.database_principals member ON member.principal_id = rm.member_principal_id
JOIN sys.database_principals role   ON role.principal_id   = rm.role_principal_id
WHERE member.type = 'S'
ORDER BY user_name, role_name;
```

Captures built-in role memberships (`db_datareader`, `db_datawriter`, `db_owner`, etc.) and any custom database roles.

### Enumerate explicit permissions per user

```sql
-- Run on each user database.
SELECT
    p.name                            AS user_name,
    perm.permission_name,
    perm.state_desc,
    perm.class_desc,
    OBJECT_SCHEMA_NAME(perm.major_id) AS schema_name,
    OBJECT_NAME(perm.major_id)        AS object_name,
    perm.minor_id                     AS column_id
FROM sys.database_permissions perm
JOIN sys.database_principals p ON p.principal_id = perm.grantee_principal_id
WHERE p.type = 'S'
ORDER BY user_name, schema_name, object_name, permission_name;
```

Captures `GRANT` / `DENY` / `REVOKE` state on database, schema, object, and column scopes. The `state_desc` column distinguishes `GRANT` from `DENY`; both must be migrated. Column-level permissions are surfaced via `minor_id` (column ID); resolve column names from `sys.columns` if column-level grants exist.

### Document the result before proceeding

For each SQL Auth principal you intend to migrate, capture:

- the principal's name and `sid`,
- which databases it has a user in,
- its role memberships per database,
- its explicit `GRANT` / `DENY` rows per database,
- the schema-scoped or object-scoped grants noted above.

This becomes the input to Step 4: each new Entra user gets the same role memberships and the same `GRANT` / `DENY` rows, scoped to the same schemas and objects, as its SQL Auth predecessor. Built-in roles (`db_datareader`, `db_datawriter`) are used in Step 4 only when the existing principal genuinely had those role memberships and nothing else.

> **Why not just default to `db_datareader` + `db_datawriter`?** That default works only for the narrow case where the existing principal had exactly those two memberships and no explicit grants. Every deviation produces a silent privilege change — over-privilege for principals with narrower grants, under-privilege for principals with wider grants. The cost of getting it wrong is borne at runtime, often in production, and is hard to trace back to the migration.

---

## Step 4: Create SQL users for your Microsoft Entra identities (SQL)

After configuring the SQL server, connect as the Entra admin and create contained database users for your managed identities.

### Connect as Entra Admin

Use Azure Data Studio, SSMS, or `sqlcmd` with Entra authentication:

```bash
# Azure CLI (generates connection)
az sql db show-connection-string --client ado.net --server mySqlServer --name myDatabase --auth-type ADPassword

# Example using sqlcmd
sqlcmd -S mySqlServer.database.windows.net -d myDatabase -G -U admin@contoso.com
```

### Prerequisite: Microsoft Graph permissions on the SQL server identity

`CREATE USER [name] FROM EXTERNAL PROVIDER` requires Azure SQL to resolve the Entra principal at the time the statement runs. Resolution is performed by the SQL server's own managed identity calling Microsoft Graph. For that call to succeed, the SQL server's managed identity must be granted three Microsoft Graph **application** permissions in your tenant:

- `User.Read.All`
- `GroupMember.Read.All`
- `Application.Read.All`

Without these permissions, the `CREATE USER` statement returns `Principal '<name>' could not be resolved`. Non-unique display names make the failure more confusing because resolution cannot disambiguate without the additional permissions.

> **Azure RBAC vs. Microsoft Graph permissions.** Mapping a managed identity to a contained database user does **not** require Azure RBAC roles on the SQL resource. It does, however, require the Graph permissions above on the SQL server's own managed identity, because that identity is what resolves the Entra principal. The two permission systems are independent; granting Azure RBAC does not satisfy the Graph requirement.

If your tenant cannot grant these Graph permissions to the SQL server managed identity (for example, regulated environments), use the `CREATE USER ... WITH SID = ..., TYPE = E|X` pattern instead — see the alternative path below.

### Create Contained User for Managed Identity (Graph permissions granted)

Use these patterns when the prerequisite Graph permissions above are in place. Pick the pattern that matches your principal's display-name uniqueness:

**Display name is unique in the tenant:**

```sql
-- Create user mapped to your app's managed identity by name.
CREATE USER [my-app-managed-identity] FROM EXTERNAL PROVIDER;
```

**Display name is non-unique** (multiple Entra principals share the name) — disambiguate with the object ID:

```sql
-- Disambiguate by Entra object ID.
CREATE USER [my-app-managed-identity]
    FROM EXTERNAL PROVIDER
    WITH OBJECT_ID = '<entra-object-id-of-the-principal>';
```

After creation, grant permissions (the example below uses built-in roles; map to whatever the existing SQL principal had — see Step 3):

The grants below are an **illustrative example only**, not a default. Use them verbatim only if the existing SQL principal's Step 3 inventory shows membership in exactly `db_datareader` and `db_datawriter` with no additional explicit grants. Otherwise, replace the role / grant statements with the equivalents derived from Step 3:

```sql
-- Example only — mirror the existing principal's actual grants from Step 3.
ALTER ROLE db_datareader ADD MEMBER [my-app-managed-identity];
ALTER ROLE db_datawriter ADD MEMBER [my-app-managed-identity];

-- Schema- or object-scoped grants follow the same shape; replace with the
-- specific permissions the Step 3 inventory recorded for this principal.
-- Example: GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [my-app-managed-identity];
-- Example: DENY DELETE ON OBJECT::dbo.AuditLog TO [my-app-managed-identity];  -- mirror DENYs too
```

**Key Points:**
- `[my-app-managed-identity]` must match the **name** of your Managed Identity resource in Azure (not the Object ID)
- For non-unique display names, use the `WITH OBJECT_ID = '...'` form to disambiguate (Graph permissions still required)
- `FROM EXTERNAL PROVIDER` tells SQL this is an Entra principal
- Use `ALTER ROLE` to assign built-in roles, or `GRANT` for granular permissions
- **Azure RBAC** roles are not required on the SQL resource for contained-user access. **Microsoft Graph permissions** on the SQL server's managed identity (see the prerequisite above) *are* required for `FROM EXTERNAL PROVIDER` resolution.

### Alternative: Create Contained User without Graph permissions (`WITH SID`, `TYPE`)

Use this pattern when your tenant cannot or will not grant Microsoft Graph permissions to the SQL server's managed identity (regulated environments, segmented tenants, etc.). With `WITH SID = ..., TYPE = E|X`, Azure SQL skips the Microsoft Graph lookup entirely — you supply the principal's identifier directly, and SQL trusts it.

The identifier you supply is **role-specific**. Choosing the wrong value silently produces `Login failed for user '<token-identified principal>'` at runtime, after the user has been created successfully:

| Principal type            | SID value                                | TYPE |
|---------------------------|------------------------------------------|------|
| Managed identity / app    | **Client ID** as `varbinary(16)`         | `E`  |
| Entra user                | **Object ID** as `varbinary(16)`         | `E`  |
| Entra group               | **Object ID** as `varbinary(16)`         | `X`  |

> ⚠️ **Most common mistake.** For managed identities and applications, use the **client ID** — not the object ID. The two IDs are distinct values for the same principal, and the user creation will succeed with either. Only at runtime does the wrong choice surface as a token-principal login failure, which is hard to trace back to the `CREATE USER` statement.

**Convert a GUID to `varbinary(16)`:**

```sql
-- Replace with the appropriate ID for the principal type (see table above).
DECLARE @sid varbinary(16) = CONVERT(varbinary(16), CAST('<guid>' AS uniqueidentifier));

-- Managed identity / app (TYPE = E):
CREATE USER [my-app-managed-identity] WITH SID = @sid, TYPE = E;

-- Entra user (TYPE = E):
-- CREATE USER [user@contoso.com] WITH SID = @sid, TYPE = E;

-- Entra group (TYPE = X):
-- CREATE USER [Contoso Engineers] WITH SID = @sid, TYPE = X;
```

Permission assignment after creation is the same as the Graph-permissions path above (`ALTER ROLE` for built-in roles, `GRANT` for granular permissions). Map permissions to whatever the existing SQL principal had — see Step 3.

**Trade-offs vs. the Graph-permissions path:**

- Azure SQL does not validate that the SID corresponds to a real Entra principal at user creation time. A typo or wrong-ID-type mistake will not be caught until runtime.
- New principals added later (e.g., an additional managed identity) require their SID to be supplied explicitly here; there is no lookup-by-name fallback once you are on this path.
- This pattern is appropriate when Graph permissions are not granted *as a tenant decision*, not as a workaround for missing permissions you intend to grant later. If you intend to grant the Graph permissions, use the section above instead.

### Verify the user was created

```sql
SELECT name, type_desc, authentication_type_desc
FROM sys.database_principals
WHERE name = 'my-app-managed-identity';
```

Expected output:
- `type_desc`: `EXTERNAL_USER`
- `authentication_type_desc`: `EXTERNAL`

---

## Step 5: Update programmatic connections (client code)

### Prerequisites: Driver Version Requirements

Before updating your code, ensure your drivers meet the minimum versions required for Entra ID / Managed Identity authentication:

| Driver | Minimum Version | Notes |
|--------|----------------|-------|
| **Microsoft.Data.SqlClient** (ADO.NET) | 5.2.2+ | Recommended .NET driver |
| **Microsoft.EntityFramework.SqlServer** | 6.5.0+ | Entity Framework |
| **JDBC** (Java) | 7.2.0+ | |
| **ODBC** (C/C++, COBOL, Perl, PHP, Python) | 17.3+ | |
| **OLE DB** (COM-based applications) | 18.3.0+ | |

> ⚠️ **System.Data.SqlClient (SDS) does NOT support Managed Identity.** You must switch to **Microsoft.Data.SqlClient (MDS)**.
> For porting guidance, see the [SDS → MDS porting cheat sheet](https://github.com/dotnet/SqlClient/blob/main/porting-cheat-sheet.md).

> **Note:** Microsoft.Data.SqlClient depends on **MSAL for .NET (v4.56.0+)**. Ensure your MSAL dependency is up to date.

> ⚠️ **CRITICAL: Credential Choice for Production**
> For production workloads, consider using `ManagedIdentityCredential` explicitly rather than `DefaultAzureCredential`. This avoids credential chaining and ensures predictable, single-path authentication. `DefaultAzureCredential` is convenient for local development as it chains multiple credential sources (Managed Identity → Azure CLI → Visual Studio, etc.), but in production the chaining behavior can introduce latency and ambiguity. See the [Azure Identity client library documentation](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) for details on available credential types and their tradeoffs.

### .NET (C#)

#### Option 1: Connection String with Managed Identity Authentication

```csharp
using Microsoft.Data.SqlClient;

// Before (SQL authentication - INSECURE):
// var connectionString = "Server=mySqlServer.database.windows.net;Database=myDatabase;User Id=sqladmin;Password=<YOUR_PASSWORD>;";

// After (Entra Managed Identity):
var connectionString = "Server=mySqlServer.database.windows.net;Database=myDatabase;Authentication=Active Directory Managed Identity;";

using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();
```

**Connection String Properties:**
- `Authentication=Active Directory Managed Identity` — uses system-assigned or user-assigned managed identity
- For **user-assigned** MI, add: `User Id=<client-id-of-user-assigned-MI>`

#### Option 2: Token-Based Authentication with Azure.Identity

```csharp
using Azure.Core;
using Azure.Identity;
using Microsoft.Data.SqlClient;

// Get access token using ManagedIdentityCredential (recommended for production)
var credential = new ManagedIdentityCredential();
var tokenRequestContext = new TokenRequestContext(new[] { "https://database.windows.net/.default" });
var accessToken = await credential.GetTokenAsync(tokenRequestContext);

// Create connection with token
var connectionString = "Server=mySqlServer.database.windows.net;Database=myDatabase;";
using var connection = new SqlConnection(connectionString)
{
    AccessToken = accessToken.Token
};

await connection.OpenAsync();
```

**For local development only:**

```csharp
// Local dev: DefaultAzureCredential tries MI -> Azure CLI -> Visual Studio, etc.
var credential = new DefaultAzureCredential();
var tokenRequestContext = new TokenRequestContext(new[] { "https://database.windows.net/.default" });
var accessToken = await credential.GetTokenAsync(tokenRequestContext);

var connectionString = "Server=mySqlServer.database.windows.net;Database=myDatabase;";
using var connection = new SqlConnection(connectionString)
{
    AccessToken = accessToken.Token
};

await connection.OpenAsync();
```

**NuGet Packages Required:**
```xml
<PackageReference Include="Microsoft.Data.SqlClient" Version="5.1.x" />
<PackageReference Include="Azure.Identity" Version="1.10.x" />
```

---

### Python (pyodbc)

```python
from azure.identity import ManagedIdentityCredential
import pyodbc
import struct

# Recommended for production
credential = ManagedIdentityCredential()

# Get access token
token = credential.get_token("https://database.windows.net/.default")
token_bytes = token.token.encode("utf-16-le")
token_struct = struct.pack(f'<I{len(token_bytes)}s', len(token_bytes), token_bytes)

# Connect with token
connection_string = "Driver={ODBC Driver 18 for SQL Server};Server=mySqlServer.database.windows.net;Database=myDatabase;"
conn = pyodbc.connect(connection_string, attrs_before={1256: token_struct})

cursor = conn.cursor()
cursor.execute("SELECT @@VERSION")
print(cursor.fetchone())
conn.close()
```

**For local development only:**

```python
from azure.identity import DefaultAzureCredential

# Local dev only
credential = DefaultAzureCredential()
token = credential.get_token("https://database.windows.net/.default")
# ... rest same as above
```

**Packages Required:**
```bash
pip install azure-identity pyodbc
```

---

### Java (JDBC with msal4j)

```java
import com.azure.identity.ManagedIdentityCredential;
import com.azure.identity.ManagedIdentityCredentialBuilder;
import com.azure.core.credential.AccessToken;
import com.azure.core.credential.TokenRequestContext;
import com.microsoft.sqlserver.jdbc.SQLServerDataSource;
import java.sql.Connection;
import java.util.Collections;

// Recommended for production
ManagedIdentityCredential credential = new ManagedIdentityCredentialBuilder().build();

// Get access token
TokenRequestContext tokenRequestContext = new TokenRequestContext();
tokenRequestContext.setScopes(Collections.singletonList("https://database.windows.net/.default"));
AccessToken accessToken = credential.getToken(tokenRequestContext).block();

// Create connection
SQLServerDataSource ds = new SQLServerDataSource();
ds.setServerName("mySqlServer.database.windows.net");
ds.setDatabaseName("myDatabase");
ds.setAccessToken(accessToken.getToken());

Connection connection = ds.getConnection();
```

**Maven Dependencies:**

```xml
<dependency>
    <groupId>com.microsoft.sqlserver</groupId>
    <artifactId>mssql-jdbc</artifactId>
    <version>12.4.x</version>
</dependency>
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
    <version>1.10.x</version>
</dependency>
```

---

### Node.js (tedious)

```javascript
const { ManagedIdentityCredential } = require("@azure/identity");
const { Connection, Request } = require("tedious");

// Recommended for production
const credential = new ManagedIdentityCredential();

async function connect() {
    // Get access token
    const tokenResponse = await credential.getToken("https://database.windows.net/.default");

    const config = {
        server: "mySqlServer.database.windows.net",
        authentication: {
            type: "azure-active-directory-access-token",
            options: {
                token: tokenResponse.token
            }
        },
        options: {
            database: "myDatabase",
            encrypt: true
        }
    };

    const connection = new Connection(config);
    connection.on("connect", (err) => {
        if (err) {
            console.error("Connection failed:", err);
        } else {
            console.log("Connected to SQL Database");
        }
    });
    connection.connect();
}

connect();
```

**Packages Required:**

```bash
npm install @azure/identity tedious
```

---

### Local Testing

To test locally before deploying:

1. **Authenticate Azure CLI:**
   ```bash
   az login
   az account set --subscription <subscription-id>
   ```

2. **Use `DefaultAzureCredential` in local code** (falls back to Azure CLI)

3. **Grant your user account access to the database:**
   ```sql
   -- Run as Entra admin
   CREATE USER [your-email@contoso.com] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_datareader ADD MEMBER [your-email@contoso.com];
   ALTER ROLE db_datawriter ADD MEMBER [your-email@contoso.com];
   ```

4. **Run application locally** — `DefaultAzureCredential` will use your Azure CLI identity

### Production Testing

1. **Deploy application** with updated code and managed identity enabled
2. **Check application logs** for connection errors
3. **Confirm new connections use Entra authentication** via live diagnostics (`sys.dm_exec_sessions`, see Step 6 supplemental). This confirms the application's connection path; it is **not** a cutover-readiness gate — that gate is the audit re-run in Step 6.
4. **Test all database operations** (read, write, stored procedures)

> Cutover readiness (zero residual SQL Auth traffic across the audit window) is validated separately in Step 6. Passing this Step 5 connection check is necessary but not sufficient for Step 7 cutover.

### Common Issues

| **Issue** | **Cause** | **Fix** |
|-----------|-----------|---------|
| `Login failed for user '<token-identified principal>'` | Contained user not created or incorrect name | Verify contained user name matches managed identity name exactly |
| `The token is not valid` | Token audience mismatch | Use scope `https://database.windows.net/.default` (note: `.windows.net`, not `.azure.net`) |
| `No access token provided` | Code not using Managed Identity credential | Verify `Authentication=Active Directory Managed Identity` or `AccessToken` is set |
| `DefaultAzureCredential failed to retrieve a token` | No identity available | Ensure managed identity is enabled on the Azure resource |
| `Principal does not have permission` | Insufficient database permissions | Grant appropriate roles via `ALTER ROLE` or `GRANT` |
| Existing app stops working immediately after Entra-only is enabled | A SQL Auth caller (often a batch job or scheduler) was missed because cutover used `sys.dm_exec_sessions` instead of the Step 6 audit re-run | Re-enable mixed mode (see Rollback Plan), re-run the Step 1 audit query against a recent window, migrate the remaining caller, then re-attempt cutover |
| `Principal '<name>' could not be resolved` when running `CREATE USER ... FROM EXTERNAL PROVIDER` | SQL server's managed identity is missing the required Microsoft Graph application permissions, **or** the display name is non-unique and could not be disambiguated | Grant `User.Read.All`, `GroupMember.Read.All`, `Application.Read.All` to the SQL server's managed identity. For non-unique names, use `CREATE USER [name] FROM EXTERNAL PROVIDER WITH OBJECT_ID = '<id>'`. If granting Graph permissions is not possible, use `CREATE USER [name] WITH SID = ..., TYPE = E\|X` (see the alternative path under Step 4). |
| `Login failed for user '<token-identified principal>'` after `CREATE USER ... WITH SID = ...` succeeded | Wrong ID type used in the `SID` value. Managed identities and applications must use **client ID**, not object ID. Entra users and groups use **object ID**. The mismatch is silent at user creation and only surfaces at runtime. | Look up the principal's correct ID for its type (client ID for MI/app, object ID for user/group), drop and recreate the user with the correct `SID` and matching `TYPE` (`E` for MI/app/user, `X` for group). |
| Rollback attempted but SQL auth still fails after `az sql server ad-only-auth disable` | SQL admin has been retired from IaC; the credential no longer exists on the server even though `azureADOnlyAuthentication` is now `false` | This is regime 3 in the Rollback Plan. Re-add `administratorLogin` and `administratorLoginPassword` to IaC with a freshly generated password and redeploy; do not attempt to reuse the previously-retired credential. |
| Application starts failing with `Permission denied` on operations that worked before migration | Entra user was granted `db_datareader` + `db_datawriter` by default, but the predecessor SQL principal had additional grants (DDL, EXECUTE, schema ownership) that weren't mirrored | Re-run the Step 3 enumeration queries for the predecessor SQL principal, capture all role memberships and explicit `GRANT` rows, and apply equivalents to the Entra user. The default role pair is illustrative only, not a safe default. |

---

## Skill addendum: Remove SQL secrets from configuration

> Not part of the canonical guide's 8-step flow. Included here because the operational change (deleting passwords from connection strings, Key Vault, environment variables) is load-bearing for the migration. Run after Step 5 connections are validated and before the Step 6 audit re-run; do not remove the SQL admin credential here — see the Rollback Plan section.

### Configuration Files

**Before (appsettings.json):**

```json
{
  "ConnectionStrings": {
    "SqlDatabase": "Server=mySqlServer.database.windows.net;Database=myDatabase;User Id=sqladmin;Password=<YOUR_PASSWORD>;"
  }
}
```

**After:**

```json
{
  "ConnectionStrings": {
    "SqlDatabase": "Server=mySqlServer.database.windows.net;Database=myDatabase;Authentication=Active Directory Managed Identity;"
  }
}
```

### Key Vault

If SQL passwords are stored in Key Vault:

1. **Delete the secret** (after confirming migration is complete)
2. Update any scripts/pipelines that reference the secret
3. Remove Key Vault access policies for the secret (if dedicated)

### Environment Variables

Remove any environment variables containing SQL usernames/passwords:

```bash
# Remove from .env, docker-compose.yml, Kubernetes secrets, etc.
# SQL_USERNAME=sqladmin
# SQL_PASSWORD=<YOUR_PASSWORD>
```

---

## Step 6: Validate no local-auth traffic

Before flipping Entra-only authentication, re-run the Step 1 audit query and confirm zero SQL Auth events in the most recent window. This is the canonical guide's cutover gate: any caller still authenticating with SQL Auth will break the moment Entra-only is enabled.

### Re-run the audit query

Run the same `sys.fn_get_audit_file_v2` query from Step 1 against a recent window. Expected result: zero rows, or only rows for principals you have explicitly retired.

If any rows return for live principals:

- Trace each one back to the calling application or job.
- Migrate the remaining caller to managed identity (Steps 3–5) or formally retire it.
- Re-run this query and confirm zero rows before proceeding to Step 7.

If the audit gate fails after a partial cutover (some applications already on managed identity, others still using SQL auth), see the Rollback Plan section — regime 1 applies because Entra-only has not yet been enabled.

Do **not** treat `sys.dm_exec_sessions` as a substitute. It only shows sessions live at the moment of query and will return zero rows for any caller that happens to be idle.

### Supplemental: live-session diagnostics

`sys.dm_exec_sessions` remains useful for live triage (e.g., "is the application connecting right now?") but is not a cutover-readiness signal. Use it after migration to confirm that *new* connections are using Entra authentication:

```sql
-- Live sessions only — diagnostic, not a cutover gate.
SELECT session_id, login_name, login_time, program_name, client_interface_name
FROM sys.dm_exec_sessions
WHERE login_name = 'my-app-managed-identity';
```

---

## Step 7: Enable Microsoft Entra-only authentication (final cutover, IaC)

Run this only after: (a) all applications are validated end-to-end on managed identity in this environment; (b) the Step 6 audit re-run shows zero SQL Auth traffic; (c) a tested rollback path is in place (see Rollback Plan). Apply as its own deployment so it is reviewable and revertable on its own.

```bicep
// Final cutover: flip Entra-only on. Apply as its own deployment.
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: 'sqladmin'              // still present; retired in a later, separate change
    administratorLoginPassword: adminPassword   // still present; retired in a later, separate change
    administrators: {
      administratorType: 'ActiveDirectory'
      principalType: 'Group'
      login: 'SQL Admins Group'
      sid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
      tenantId: subscription().tenantId
      azureADOnlyAuthentication: true           // flipped from false → true here
    }
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
  }
}
```

```hcl
# Final cutover: flip Entra-only on. Apply as its own deployment.
resource "azurerm_mssql_server" "example" {
  # ... unchanged fields omitted ...
  administrator_login          = "sqladmin"            # still present; retired in a later, separate change
  administrator_login_password = var.admin_password    # still present; retired in a later, separate change

  azuread_administrator {
    login_username              = "SQL Admins Group"
    object_id                   = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    tenant_id                   = data.azurerm_client_config.current.tenant_id
    azuread_authentication_only = true                 # flipped from false → true here
  }
}
```

```bash
# Final cutover: enable Entra-only authentication on the server.
az sql server ad-only-auth enable \
  --resource-group myResourceGroup \
  --name mySqlServer
```

Retiring the SQL admin (removing `administratorLogin` / `administratorLoginPassword` from IaC) is a **further, separate change** that runs only after rollback is formally retired. See the Rollback Plan section for the gates that must be satisfied first.

---

## Quality Checklist

Before completing the migration:

- [ ] **Step 0 — Verify alignment with the canonical guide (preflight, skill-only):**
  - [ ] Canonical guide fetched at the start of the session (or retrieval failure surfaced to the user with an explicit decision to proceed or stop)
  - [ ] 8-step flow in the guide compared against the **High-Level Migration Steps** list; no material drift detected, **or** drift summarized to the user with a decision on how to proceed
  - [ ] Any per-step procedural conflicts noted during execution were resolved by deferring to the guide and flagged to the user

- [ ] **Step 1 — Identify your logins and users (SQL Auditing):**
  - [ ] SQL Auditing enabled on server
  - [ ] Initial SQL Auth audit query run; results captured and reviewed

- [ ] **Step 2 — Enable Microsoft Entra authentication (mixed mode, IaC):**
  - [ ] SQL server has Entra admin configured
  - [ ] SQL admin login (`administratorLogin` / `administratorLoginPassword`) retained in IaC; password stored in a recoverable secret store (Key Vault or equivalent)
  - [ ] `azureADOnlyAuthentication` is `false` (mixed mode); Entra-only is **not** enabled here

- [ ] **Step 3 — Identify and document existing permissions:**
  - [ ] All SQL Auth principals in scope have role memberships and explicit `GRANT` / `DENY` rows captured per database from Step 3 queries
  - [ ] Stale principals (in `sys.sql_logins` but not in Step 1 audit results) explicitly marked for retirement rather than migration
  - [ ] Schema- and object-scoped grants documented (not just role memberships)

- [ ] **Step 4 — Create SQL users for your Microsoft Entra identities:**
  - [ ] Microsoft Graph permissions (`User.Read.All`, `GroupMember.Read.All`, `Application.Read.All`) granted to the SQL server's managed identity, **or** alternative `WITH SID = ..., TYPE` path chosen
  - [ ] `CREATE USER` pattern selected based on display-name uniqueness
  - [ ] If using `WITH SID = ..., TYPE` pattern, ID type verified per role (client ID for managed identity/app; object ID for Entra user/group)
  - [ ] User creation verified via `sys.database_principals`
  - [ ] Each Entra user's grants mirror the predecessor SQL principal's Step 3 inventory; built-in roles used only when the inventory matches them exactly

- [ ] **Step 5 — Update programmatic connections:**
  - [ ] Connection strings use `Authentication=Active Directory Managed Identity` or token-based auth
  - [ ] **`ManagedIdentityCredential` used in production code** (recommended for predictable auth)
  - [ ] `DefaultAzureCredential` only in local dev paths (if used at all)
  - [ ] Access token scope is `https://database.windows.net/.default`
  - [ ] Application connects successfully using Managed Identity
  - [ ] All database operations work (read, write, execute)
  - [ ] Local development flow documented and tested

- [ ] **Skill addendum — Remove SQL secrets:**
  - [ ] SQL passwords deleted from connection strings
  - [ ] Secrets removed from Key Vault, environment variables, config files
  - [ ] No SQL credentials in source control (check git history if needed)

- [ ] **Step 6 — Validate no local-auth traffic:**
  - [ ] Audit re-run shows zero SQL Auth events
  - [ ] Every remaining SQL Auth caller from Step 1 is either migrated or formally retired

- [ ] **Step 7 — Enable Microsoft Entra-only authentication (final cutover):**
  - [ ] Rollback procedure for current regime tested end-to-end in a lower environment within the last 30 days
  - [ ] SQL admin credential verified reachable immediately before applying Step 7
  - [ ] `azureADOnlyAuthentication: true` set only after audit + rollback gates pass
  - [ ] SQL admin retirement is a separate, deliberate IaC change after rollback is formally retired — **not** part of the Step 7 deployment

- [ ] **Step 8 — Enforce Entra-only at scale (Azure Policy):**
  - [ ] Built-in policy assigned at subscription or management-group scope
  - [ ] Exemptions, if any, recorded as Azure Policy exemptions (not by removing the assignment)

- [ ] **Skill addendum — Monitor & iterate:**
  - [ ] Application logs track authentication success/failure
  - [ ] SQL auditing enabled and alerts configured
  - [ ] No authentication errors in production logs

---

## Rollback Plan

Rollback procedure depends on which migration step is in flight. Identify the regime you are in **before** taking any rollback action — running the regime-2 procedure while still in regime 1 will needlessly redeploy IaC, and running regime-1 actions in regime 3 will not restore connectivity because the SQL admin no longer exists.

| Regime | State of the system | Rollback type |
|---|---|---|
| 1 | Mixed mode active; Entra-only **not** enabled; SQL admin retained | Application config revert only |
| 2 | Entra-only **enabled** (Step 7 applied); SQL admin still retained in IaC | Disable Entra-only, then config revert |
| 3 | SQL admin formally retired from IaC after Step 7 | IaC redeploy to recreate admin, then regime-2 procedure |

> **Regime 3 is the explicit "no rollback past this point" gate.** Retiring the SQL admin from IaC is a deliberate, separate change documented in Step 7. Do not apply that change until rollback is formally retired and Entra-only operation has been validated in steady state.

### Regime 1: Rollback before final cutover (Entra-only not yet enabled)

**Preconditions:** Step 2 (mixed-mode Entra admin) has been applied. Step 7 (Entra-only enablement) has **not** been applied. SQL admin login (`administratorLogin` / `administratorLoginPassword`) is still in IaC and working.

No IaC change is required for this regime. SQL authentication still works because Entra-only mode was never enabled. Rollback is application-side only:

1. **Revert application configuration** to the SQL auth connection string:

   ```json
   "SqlDatabase": "Server=mySqlServer.database.windows.net;Database=myDatabase;User Id=sqladmin;Password=<YOUR_PASSWORD>;"
   ```

2. **Redeploy the application** with the reverted configuration.
3. **Leave the Entra admin in place.** The mixed-mode IaC change is the desired steady state for a paused migration; do not revert it.
4. **Leave any Entra contained users in place.** Users created in Step 4 (`CREATE USER [name] FROM EXTERNAL PROVIDER` or `WITH SID = ..., TYPE`) are dormant when the application reverts to SQL auth and do not need to be dropped. They remain ready for a future migration attempt without re-running Step 4. Drop them only if a stale-user policy explicitly requires it.

End state: applications run on SQL auth as before; Entra admin and any Entra contained users remain configured for a future migration attempt.

### Regime 2: Rollback after final cutover (Entra-only enabled, SQL admin still retained)

**Preconditions:** Step 7 has been applied (Entra-only is `true`). The deliberate SQL-admin retirement change described in Step 7's closing note has **not** been applied — `administratorLogin` and `administratorLoginPassword` are still present in IaC.

1. **Disable Entra-only authentication.** Either via CLI for an immediate revert:

   ```bash
   az sql server ad-only-auth disable \
     --resource-group myResourceGroup \
     --name mySqlServer
   ```

   …or by redeploying IaC with `azureADOnlyAuthentication: false` (Bicep) / `azuread_authentication_only = false` (Terraform). The CLI path is faster for an outage; the IaC path keeps configuration drift out of the deployment record.

2. **Verify the SQL admin credential is reachable.** Authenticate to the server using `administratorLogin` and the stored password to confirm the credential still works before reverting application configuration.
3. **Revert application configuration** to the SQL auth connection string (same as regime 1, step 1).
4. **Redeploy the application** with the reverted configuration.

End state: Entra-only is disabled, SQL auth works again, and the system is back in the regime-1 state. Investigate root cause before re-attempting Step 7.

### Regime 3: Rollback after SQL admin has been retired from IaC

**Preconditions:** Step 7 has been applied **and** the deliberate SQL-admin retirement change has been applied — `administratorLogin` and `administratorLoginPassword` are no longer in IaC. This is the steady state explicitly described as "rollback formally retired" in Step 7.

Rollback in this regime is intentionally harder. Reaching it should be a deliberate decision; the gating in Step 7 is designed to prevent customers from arriving here by accident. If you are here:

1. **Re-add the SQL admin to IaC.** Add `administratorLogin` and `administratorLoginPassword` back to the `Microsoft.Sql/servers` resource (Bicep) or `azurerm_mssql_server` resource (Terraform). Use a freshly generated password — do **not** reuse the previously-retired credential.
2. **Set `azureADOnlyAuthentication` to `false`** in the same IaC change so that the redeploy lands in mixed mode.
3. **Apply the IaC redeploy.** The deployment recreates the SQL admin login on the server with the new password and disables Entra-only.
4. **Verify the new SQL admin credential** by authenticating to the server.
5. **Revert application configuration** to the SQL auth connection string using the new password.
6. **Redeploy the application.**

End state: equivalent to regime 1 (mixed mode, SQL admin retained, Entra admin still configured). The system is recoverable, but the recovery cost is one extra IaC deployment plus a credential rotation. Treat reaching regime 3 as a signal to revisit the gating that should have prevented it.

### Long-Term Fix

- Investigate root cause (missing permissions, incorrect identity mapping, etc.)
- Test fix in lower environment before re-migrating production
- Keep Entra admin configured for future migration attempts
- If rollback was performed from regime 3, treat the recovery itself as a Sev event in the incident review — reaching regime 3 means the gating on Step 7's deliberate-retirement change failed, and that gating needs to be tightened (typically: add an explicit approval gate, or extend the steady-state validation window before retirement).

---

## Step 8: Enforce Entra-only at scale (Azure Policy)

After successfully migrating to Entra ID authentication, enforce Entra-only authentication across your Azure SQL servers using built-in Azure Policy. This prevents accidental re-enabling of SQL password authentication and ensures ongoing security.

### **Apply the Built-In Azure Policy:**

Azure provides a built-in policy definition for this purpose:

- **Policy name**: *Azure SQL Database should have Microsoft Entra-only authentication enabled*
- **Policy definition ID**: `/providers/Microsoft.Authorization/policyDefinitions/abda6d70-9778-44e7-84a8-06713e6db027`

Assign this policy at your subscription or management group level:

```bash
az policy assignment create \
  --name "sql-entra-only-auth" \
  --display-name "Enforce Entra-only authentication on Azure SQL" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/abda6d70-9778-44e7-84a8-06713e6db027" \
  --scope "/subscriptions/<subscription-id>"
```

For more details on configuring and assigning this policy, see the [Azure SQL Entra-only authentication policy documentation](https://learn.microsoft.com/azure/azure-sql/database/authentication-azure-ad-only-authentication-policy).

### **Exemptions (Break-Glass):**

If you need to temporarily exempt a SQL server (e.g., during migration or for emergency access), use an [Azure Policy exemption](https://learn.microsoft.com/azure/governance/policy/concepts/exemption-structure) rather than removing the policy assignment.

---

## Skill addendum: Monitor & iterate

> Not part of the canonical guide's 8-step flow. Included here because steady-state monitoring is part of the skill's operational guidance after cutover.

### Observability

1. **Application Logs:**
   - Monitor for `SqlException` errors related to authentication
   - Log successful connection attempts with identity context

2. **SQL Audit Logs:**
   - Keep Azure SQL auditing enabled to track authentication events historically (same audit data used by Steps 1 and 6).
   - For live triage of in-flight connections, use `sys.dm_exec_sessions`. This is a diagnostic view, not an audit substitute.

3. **Metrics:**
   - Track failed login attempts in Azure Monitor
   - Set alerts for repeated authentication failures

### Continuous Validation

- **Periodic Access Reviews:** Verify contained database users align with current application identities
- **Permission Audits:** Ensure managed identities have least-privilege access
- **Secret Scanning:** Confirm no SQL passwords remain in code, config, or Key Vault

---

## Related Resources

| **Resource** | **Link** |
|--------------|----------|
| **Microsoft Entra-only authentication with Azure SQL** | [Microsoft Learn — Microsoft Entra-only authentication with Azure SQL](https://learn.microsoft.com/azure/azure-sql/database/authentication-azure-ad-only-authentication) |
| **Azure SQL Entra Auth Overview** | [Microsoft Entra authentication for Azure SQL](https://learn.microsoft.com/azure/azure-sql/database/authentication-aad-overview) |
| **Azure SQL Entra Auth Configuration** | [Configure Microsoft Entra authentication](https://learn.microsoft.com/azure/azure-sql/database/authentication-aad-configure) |
| **Managed Identity Overview** | [Managed identities for Azure resources](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview) |
| **Azure Identity Client Library (.NET)** | [Azure.Identity documentation](https://learn.microsoft.com/dotnet/api/overview/azure/identity-readme) |
| **Azure Identity Best Practices** | [Identity management best practices](https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices) |
| **SFI Pillar 1: Protect identities and secrets** | [Secure Future Initiative — Identity](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) |
| **Zero Trust Principles** | [Zero Trust security model](https://learn.microsoft.com/security/zero-trust/) |

---

## Summary

This skill guides migration from SQL authentication to Microsoft Entra ID (Managed Identity) authentication for Azure SQL Database — a security best practice aligned with [Pillar 1: Protect identities and secrets](https://learn.microsoft.com/en-us/security/zero-trust/sfi/secure-future-initiative-identity-overview) of Microsoft's Secure Future Initiative.

**Key Takeaways:**
- SQL authentication (username/password) is insecure and lacks centralized identity governance
- Managed Identity eliminates secrets and integrates with Entra ID for centralized access control
- For production workloads, `ManagedIdentityCredential` provides explicit, predictable authentication
- Contained database users map Entra identities to SQL permissions; mapping new (display-name) Entra principals via `CREATE USER ... FROM EXTERNAL PROVIDER` requires the SQL server's managed identity to hold Microsoft Graph permissions (`User.Read.All`, `GroupMember.Read.All`, `Application.Read.All`), or the SID-based fallback path must be used instead
- Entra-only authentication mode (`azureADOnlyAuthentication: true`) is enabled in Step 7 only after the Step 6 audit gate passes; it is not enabled in Step 2

**Next Steps:**
0. Verify alignment with the canonical guide (Step 0 — preflight; see [Source of Truth: Canonical Migration Guide](#source-of-truth-canonical-migration-guide))
1. Identify your logins and users via SQL Auditing (Step 1)
2. Enable Microsoft Entra authentication — assign admin in mixed mode (Step 2 / IaC)
3. Identify and document existing permissions in SQL (Step 3)
4. Create SQL users for your Microsoft Entra identities (Step 4 / SQL)
5. Update programmatic connections in client code (Step 5)
6. Validate no local-auth traffic via audit re-run (Step 6)
7. Enable Microsoft Entra-only authentication — final cutover (Step 7 / IaC)
8. Enforce Entra-only at scale via Azure Policy (Step 8)

Skill addenda (not part of the canonical 8-step flow):
- Remove SQL secrets from configuration (between Step 5 and Step 6)
- Monitor & iterate (after Step 8)

---

> [!CAUTION]
> **NOT OPERATIONAL INSTRUCTIONS** — The examples below are for **plugin quality evaluation**
> and **developer reference** only. They are not steps to execute, not output templates to follow,
> and not behavioral guidance. If you are performing this workflow, skip the
> `Key Decision Examples` section below.

---

## Key Decision Examples

### Scenario: .NET app uses Microsoft.Data.SqlClient — full Entra auth migration proceeds

**Input state:**
- Application references `Microsoft.Data.SqlClient` (v5.2.2+) in `.csproj`
- Connection string: `Server=mySqlServer.database.windows.net;Database=myDb;User Id=sqladmin;Password=<YOUR_PASSWORD>;`
- Managed Identity is enabled on the hosting resource

**Key decision points:**
1. Audit-based discovery (source: Step 1): SQL Auditing query identifies the existing SQL Auth caller for this app and the SQL principal it authenticates as — this is the principal whose Step 3 permission inventory drives the new Entra user's grants.
2. Driver compatibility gate (source: Step 5 Prerequisites): `Microsoft.Data.SqlClient` detected → gate passes, proceed with migration
3. Database user setup (source: Steps 3 + 4): inventory the predecessor SQL principal's role memberships and explicit grants per Step 3, then in Step 4 execute `CREATE USER [my-app-identity] FROM EXTERNAL PROVIDER` and mirror those grants on the new Entra user. Use built-in roles only when the inventory matches them exactly.
4. Connection string update (source: Step 5 .NET options): replace password-based string with `Authentication=Active Directory Managed Identity` using `ManagedIdentityCredential` (recommended for production to avoid credential chaining)
5. Cutover audit gate (source: Step 6): after the application is running on Managed Identity, re-run the Step 1 audit query against a recent window. Confirm zero residual SQL Auth events for this app before proceeding to config cleanup or Step 7 cutover.

**Sample output** (at Step 5 / connection string migration):
> Driver check: **Microsoft.Data.SqlClient v5.2.2+** detected — compatible with Managed Identity.
>
> **Database user created** (grants mirror the predecessor SQL principal's Step 3 inventory; do not assume `db_datareader`/`db_datawriter` unless the inventory matches them exactly):
> ```sql
> CREATE USER [my-app-identity] FROM EXTERNAL PROVIDER;
> -- Example: predecessor principal had db_datareader + db_datawriter role memberships and no explicit grants.
> -- Replace these ALTER ROLE statements with the role memberships and GRANT statements captured in Step 3 for this principal.
> ALTER ROLE db_datareader ADD MEMBER [my-app-identity];
> ALTER ROLE db_datawriter ADD MEMBER [my-app-identity];
> ```
>
> **Connection string updated:**
> ```
> Server=mySqlServer.database.windows.net;Database=myDb;Authentication=Active Directory Managed Identity;
> ```
>
> **Config cleanup** (only after the Step 6 audit re-run shows zero residual SQL Auth events for this app): Remove `User Id` and `Password` from connection string, Key Vault, and environment variables.

**Error handling:** If `System.Data.SqlClient` is detected instead of `Microsoft.Data.SqlClient`, halt the Entra auth migration and report: "System.Data.SqlClient does not support MI. Switch to Microsoft.Data.SqlClient 5.2.2+ first" (source: Step 5 driver prerequisites table).

---
