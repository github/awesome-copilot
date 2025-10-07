---
description: 'Comprehensive Power BI Row-Level Security (RLS) and advanced security patterns implementation guide with dynamic security, best practices, and governance strategies.'
applyTo: '**/*.{pbix,dax,md,txt,json,csharp,powershell}'
---

# Power BI Security and Row-Level Security Best Practices

## Overview
This document provides comprehensive instructions for implementing robust security patterns in Power BI, focusing on Row-Level Security (RLS), dynamic security, and governance best practices based on Microsoft's official guidance.

## Row-Level Security Fundamentals

### 1. Basic RLS Implementation
```dax
// Simple user-based filtering
[EmailAddress] = USERNAME()

// Role-based filtering with improved security
IF(
    USERNAME() = "Worker",
    [Type] = "Internal",
    IF(
        USERNAME() = "Manager",
        TRUE(),
        FALSE()  // Deny access to unexpected users
    )
)
```

### 2. Dynamic RLS with Custom Data
```dax
// Using CUSTOMDATA() for dynamic filtering
VAR UserRole = CUSTOMDATA()
RETURN
    SWITCH(
        UserRole,
        "SalesPersonA", [SalesTerritory] = "West",
        "SalesPersonB", [SalesTerritory] = "East",
        "Manager", TRUE(),
        FALSE()  // Default deny
    )
```

### 3. Advanced Security Patterns
```dax
// Hierarchical security with territory lookups
=DimSalesTerritory[SalesTerritoryKey]=LOOKUPVALUE(
    DimUserSecurity[SalesTerritoryID], 
    DimUserSecurity[UserName], USERNAME(), 
    DimUserSecurity[SalesTerritoryID], DimSalesTerritory[SalesTerritoryKey]
)

// Multiple condition security
VAR UserTerritories = 
    FILTER(
        UserSecurity,
        UserSecurity[UserName] = USERNAME()
    )
VAR AllowedTerritories = SELECTCOLUMNS(UserTerritories, "Territory", UserSecurity[Territory])
RETURN
    [Territory] IN AllowedTerritories
```

## Embedded Analytics Security

### 1. Static RLS Implementation
```csharp
// Static RLS with fixed roles
var rlsidentity = new EffectiveIdentity(
    username: "username@contoso.com", 
    roles: new List<string>{ "MyRole" },
    datasets: new List<string>{ datasetId.ToString()}
);
```

### 2. Dynamic RLS with Custom Data
```csharp
// Dynamic RLS with custom data
var rlsidentity = new EffectiveIdentity(
    username: "username@contoso.com",
    roles: new List<string>{ "MyRoleWithCustomData" },
    customData: "SalesPersonA",
    datasets: new List<string>{ datasetId.ToString()}
);
```

### 3. Multi-Dataset Security
```json
{
    "accessLevel": "View",
    "identities": [
        {
            "username": "France",
            "roles": [ "CountryDynamic"],
            "datasets": [ "fe0a1aeb-f6a4-4b27-a2d3-b5df3bb28bdc" ]
        }
    ]
}
```

## Database-Level Security Integration

### 1. SQL Server RLS Integration
```sql
-- Creating security schema and predicate function
CREATE SCHEMA Security;
GO

CREATE FUNCTION Security.tvf_securitypredicate(@SalesRep AS nvarchar(50))
    RETURNS TABLE
WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS tvf_securitypredicate_result
WHERE @SalesRep = USER_NAME() OR USER_NAME() = 'Manager';
GO

-- Applying security policy
CREATE SECURITY POLICY SalesFilter
ADD FILTER PREDICATE Security.tvf_securitypredicate(SalesRep)
ON sales.Orders
WITH (STATE = ON);
GO
```

### 2. Fabric Warehouse Security
```sql
-- Creating schema for Security
CREATE SCHEMA Security;
GO

-- Creating a function for the SalesRep evaluation
CREATE FUNCTION Security.tvf_securitypredicate(@UserName AS varchar(50))
    RETURNS TABLE
WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS tvf_securitypredicate_result
WHERE @UserName = USER_NAME()
OR USER_NAME() = 'BatchProcess@contoso.com';
GO

-- Using the function to create a Security Policy
CREATE SECURITY POLICY YourSecurityPolicy
ADD FILTER PREDICATE Security.tvf_securitypredicate(UserName_column)
ON sampleschema.sampletable
WITH (STATE = ON);
GO
```

## Advanced Security Patterns

### 1. Paginated Reports Security
```json
{
    "format": "PDF",
    "paginatedReportConfiguration":{
        "identities": [
            {"username": "john@contoso.com"}
        ]
    }
}
```

### 2. Power Pages Integration
```html
{% powerbi authentication_type:"powerbiembedded" path:"https://app.powerbi.com/groups/00000000-0000-0000-0000-000000000000/reports/00000000-0000-0000-0000-000000000001/ReportSection" roles:"pagesuser" %}
```

### 3. Multi-Tenant Security
```json
{
  "datasets": [
    {
      "id": "fff1a505-xxxx-xxxx-xxxx-e69f81e5b974",
    }
  ],
  "reports": [
    {
      "allowEdit": false,
      "id": "10ce71df-xxxx-xxxx-xxxx-814a916b700d"
    }
  ],
  "identities": [
    {
      "username": "YourUsername",
      "datasets": [
        "fff1a505-xxxx-xxxx-xxxx-e69f81e5b974"
      ],
      "roles": [
        "YourRole"
      ]
    }
  ],
  "datasourceIdentities": [
    {
      "identityBlob": "eyJ…",
      "datasources": [
        {
          "datasourceType": "Sql",
          "connectionDetails": {
            "server": "YourServerName.database.windows.net",
            "database": "YourDataBaseName"
          }
        }
      ]
    }
  ]
}
```

## Security Design Patterns

### 1. Partial RLS Implementation
```dax
// Create summary table for partial RLS
SalesRevenueSummary =
SUMMARIZECOLUMNS(
    Sales[OrderDate],
    "RevenueAllRegion", SUM(Sales[Revenue])
)

// Apply RLS only to detail level
Salesperson Filter = [EmailAddress] = USERNAME()
```

### 2. Hierarchical Security
```dax
// Manager can see all, others see their own
VAR CurrentUser = USERNAME()
VAR UserRole = LOOKUPVALUE(
    UserRoles[Role], 
    UserRoles[Email], CurrentUser
)
RETURN
    SWITCH(
        UserRole,
        "Manager", TRUE(),
        "Salesperson", [SalespersonEmail] = CurrentUser,
        "Regional Manager", [Region] IN (
            SELECTCOLUMNS(
                FILTER(UserRegions, UserRegions[Email] = CurrentUser),
                "Region", UserRegions[Region]
            )
        ),
        FALSE()
    )
```

### 3. Time-Based Security
```dax
// Restrict access to recent data based on role
VAR UserRole = LOOKUPVALUE(UserRoles[Role], UserRoles[Email], USERNAME())
VAR CutoffDate = 
    SWITCH(
        UserRole,
        "Executive", DATE(1900,1,1),  // All historical data
        "Manager", TODAY() - 365,     // Last year
        "Analyst", TODAY() - 90,      // Last 90 days
        TODAY()                       // Current day only
    )
RETURN
    [Date] >= CutoffDate
```

## Security Validation and Testing

### 1. Role Validation Patterns
```dax
// Security testing measure
Security Test = 
VAR CurrentUsername = USERNAME()
VAR ExpectedRole = "TestRole"
VAR TestResult = 
    IF(
        HASONEVALUE(SecurityRoles[Role]) && 
        VALUES(SecurityRoles[Role]) = ExpectedRole,
        "PASS: Role applied correctly",
        "FAIL: Incorrect role or multiple roles"
    )
RETURN
    "User: " & CurrentUsername & " | " & TestResult
```

### 2. Data Exposure Audit
```dax
// Audit measure to track data access
Data Access Audit = 
VAR AccessibleRows = COUNTROWS(FactTable)
VAR TotalRows = CALCULATE(COUNTROWS(FactTable), ALL(FactTable))
VAR AccessPercentage = DIVIDE(AccessibleRows, TotalRows) * 100
RETURN
    "User: " & USERNAME() & 
    " | Accessible: " & FORMAT(AccessibleRows, "#,0") & 
    " | Total: " & FORMAT(TotalRows, "#,0") & 
    " | Access: " & FORMAT(AccessPercentage, "0.00") & "%"
```

## Governance and Administration

### 1. Automated Security Group Management
```powershell
# Add security group to Power BI workspace
# Sign in to Power BI
Login-PowerBI

# Set up the security group object ID
$SGObjectID = "<security-group-object-ID>"

# Get the workspace
$pbiWorkspace = Get-PowerBIWorkspace -Filter "name eq '<workspace-name>'"

# Add the security group to the workspace
Add-PowerBIWorkspaceUser -Id $($pbiWorkspace.Id) -AccessRight Member -PrincipalType Group -Identifier $($SGObjectID)
```

### 2. Security Monitoring
```powershell
# Monitor Power BI access patterns
$workspaces = Get-PowerBIWorkspace
foreach ($workspace in $workspaces) {
    $users = Get-PowerBIWorkspaceUser -Id $workspace.Id
    Write-Host "Workspace: $($workspace.Name)"
    foreach ($user in $users) {
        Write-Host "  User: $($user.UserPrincipalName) - Access: $($user.AccessRight)"
    }
}
```

### 3. Compliance Reporting
```dax
// Compliance dashboard measures
Users with Data Access = 
CALCULATE(
    DISTINCTCOUNT(AuditLog[Username]),
    AuditLog[AccessType] = "DataAccess",
    AuditLog[Date] >= TODAY() - 30
)

High Privilege Users = 
CALCULATE(
    DISTINCTCOUNT(UserRoles[Email]),
    UserRoles[Role] IN {"Admin", "Manager", "Executive"}
)

Security Violations = 
CALCULATE(
    COUNTROWS(AuditLog),
    AuditLog[EventType] = "SecurityViolation",
    AuditLog[Date] >= TODAY() - 7
)
```

## Best Practices and Anti-Patterns

### ✅ Security Best Practices

#### 1. Principle of Least Privilege
```dax
// Always default to restrictive access
Default Security = 
VAR UserPermissions = 
    FILTER(
        UserAccess,
        UserAccess[Email] = USERNAME()
    )
RETURN
    IF(
        COUNTROWS(UserPermissions) > 0,
        [Territory] IN SELECTCOLUMNS(UserPermissions, "Territory", UserAccess[Territory]),
        FALSE()  // No access if not explicitly granted
    )
```

#### 2. Explicit Role Validation
```dax
// Validate expected roles explicitly
Role-Based Filter = 
VAR UserRole = LOOKUPVALUE(UserRoles[Role], UserRoles[Email], USERNAME())
VAR AllowedRoles = {"Analyst", "Manager", "Executive"}
RETURN
    IF(
        UserRole IN AllowedRoles,
        SWITCH(
            UserRole,
            "Analyst", [Department] = LOOKUPVALUE(UserDepartments[Department], UserDepartments[Email], USERNAME()),
            "Manager", [Region] = LOOKUPVALUE(UserRegions[Region], UserRegions[Email], USERNAME()),
            "Executive", TRUE()
        ),
        FALSE()  // Deny access for unexpected roles
    )
```

### ❌ Security Anti-Patterns to Avoid

#### 1. Overly Permissive Defaults
```dax
// ❌ AVOID: This grants full access to unexpected users
Bad Security Filter = 
IF(
    USERNAME() = "SpecificUser",
    [Type] = "Internal",
    TRUE()  // Dangerous default
)
```

#### 2. Complex Security Logic
```dax
// ❌ AVOID: Overly complex security that's hard to audit
Overly Complex Security = 
IF(
    OR(
        AND(USERNAME() = "User1", WEEKDAY(TODAY()) <= 5),
        AND(USERNAME() = "User2", HOUR(NOW()) >= 9, HOUR(NOW()) <= 17),
        AND(CONTAINS(VALUES(SpecialUsers[Email]), SpecialUsers[Email], USERNAME()), [Priority] = "High")
    ),
    [Type] IN {"Internal", "Confidential"},
    [Type] = "Public"
)
```

## Security Integration Patterns

### 1. Azure AD Integration
```csharp
// Generate token with Azure AD user context
var tokenRequest = new GenerateTokenRequestV2(
    reports: new List<GenerateTokenRequestV2Report>() { new GenerateTokenRequestV2Report(reportId) },
    datasets: datasetIds.Select(datasetId => new GenerateTokenRequestV2Dataset(datasetId.ToString())).ToList(),
    targetWorkspaces: targetWorkspaceId != Guid.Empty ? new List<GenerateTokenRequestV2TargetWorkspace>() { new GenerateTokenRequestV2TargetWorkspace(targetWorkspaceId) } : null,
    identities: new List<EffectiveIdentity> { rlsIdentity }
);

var embedToken = pbiClient.EmbedToken.GenerateToken(tokenRequest);
```

### 2. Service Principal Authentication
```csharp
// Service principal with RLS for embedded scenarios
public EmbedToken GetEmbedToken(Guid reportId, IList<Guid> datasetIds, [Optional] Guid targetWorkspaceId)
{
    PowerBIClient pbiClient = this.GetPowerBIClient();

    var rlsidentity = new EffectiveIdentity(
       username: "username@contoso.com",
       roles: new List<string>{ "MyRole" },
       datasets: new List<string>{ datasetId.ToString()}
    );
    
    var tokenRequest = new GenerateTokenRequestV2(
        reports: new List<GenerateTokenRequestV2Report>() { new GenerateTokenRequestV2Report(reportId) },
        datasets: datasetIds.Select(datasetId => new GenerateTokenRequestV2Dataset(datasetId.ToString())).ToList(),
        targetWorkspaces: targetWorkspaceId != Guid.Empty ? new List<GenerateTokenRequestV2TargetWorkspace>() { new GenerateTokenRequestV2TargetWorkspace(targetWorkspaceId) } : null,
        identities: new List<EffectiveIdentity> { rlsIdentity }
    );

    var embedToken = pbiClient.EmbedToken.GenerateToken(tokenRequest);

    return embedToken;
}
```

## Security Monitoring and Auditing

### 1. Access Pattern Analysis
```dax
// Identify unusual access patterns
Unusual Access Pattern = 
VAR UserAccessCount = 
    CALCULATE(
        COUNTROWS(AccessLog),
        AccessLog[Date] >= TODAY() - 7
    )
VAR AvgUserAccess = 
    CALCULATE(
        AVERAGE(AccessLog[AccessCount]),
        ALL(AccessLog[Username]),
        AccessLog[Date] >= TODAY() - 30
    )
RETURN
    IF(
        UserAccessCount > AvgUserAccess * 3,
        "⚠️ High Activity",
        "Normal"
    )
```

### 2. Data Breach Detection
```dax
// Detect potential data exposure
Potential Data Exposure = 
VAR UnexpectedAccess = 
    CALCULATE(
        COUNTROWS(AccessLog),
        AccessLog[AccessResult] = "Denied",
        AccessLog[Date] >= TODAY() - 1
    )
RETURN
    IF(
        UnexpectedAccess > 10,
        "🚨 Multiple Access Denials - Review Required",
        "Normal"
    )
```

Remember: Security is layered - implement defense in depth with proper authentication, authorization, data encryption, network security, and comprehensive auditing. Regularly review and test security implementations to ensure they meet current requirements and compliance standards.