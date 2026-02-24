---
name: entra-agent-user
description: 'Create Agent Users in Microsoft Entra ID from Agent Identities, enabling AI agents to act as digital workers with user identity capabilities in Microsoft 365 and Azure environments.'
---

# SKILL: Creating Agent Users in Microsoft Entra Agent ID

## Overview

An **agent user** is a specialized user identity in Microsoft Entra ID that enables AI agents to act as digital workers. It allows agents to access APIs and services that strictly require user identities (e.g., Exchange mailboxes, Teams, org charts), while maintaining appropriate security boundaries.

Agent users receive tokens with `idtyp=user`, unlike regular agent identities which receive `idtyp=app`.

---

## Prerequisites

- A **Microsoft Entra tenant** with Agent ID capabilities
- An **agent identity** (service principal of type `ServiceIdentity`) created from an **agent identity blueprint**
- One of the following **permissions**:
  - `AgentIdUser.ReadWrite.IdentityParentedBy` (least privileged)
  - `AgentIdUser.ReadWrite.All`
  - `User.ReadWrite.All`
- The caller must have at minimum the **Agent ID Administrator** role (in delegated scenarios)

> **Important:** The `identityParentId` must reference a true agent identity (created via an agent identity blueprint), NOT a regular application service principal. You can verify by checking that the service principal has `@odata.type: #microsoft.graph.agentIdentity` and `servicePrincipalType: ServiceIdentity`.

---

## Architecture

```
Agent Identity Blueprint (application template)
    │
    ├── Agent Identity (service principal - ServiceIdentity)
    │       │
    │       └── Agent User (user - agentUser) ← 1:1 relationship
    │
    └── Agent Identity Blueprint Principal (service principal in tenant)
```

| Component | Type | Token Claim | Purpose |
|---|---|---|---|
| Agent Identity | Service Principal | `idtyp=app` | Backend/API operations |
| Agent User | User (`agentUser`) | `idtyp=user` | Act as a digital worker in M365 |

---

## Step 1: Verify the Agent Identity Exists

Before creating an agent user, confirm the agent identity is a proper `agentIdentity` type:

```http
GET https://graph.microsoft.com/beta/servicePrincipals/{agent-identity-id}
Authorization: Bearer <token>
```

Verify the response contains:
```json
{
  "@odata.type": "#microsoft.graph.agentIdentity",
  "servicePrincipalType": "ServiceIdentity",
  "agentIdentityBlueprintId": "<blueprint-id>"
}
```

### PowerShell

```powershell
Connect-MgGraph -Scopes "Application.Read.All" -TenantId "<tenant>" -UseDeviceCode -NoWelcome
Invoke-MgGraphRequest -Method GET `
  -Uri "https://graph.microsoft.com/beta/servicePrincipals/<agent-identity-id>" | ConvertTo-Json -Depth 3
```

> **Common mistake:** Using an app registration's `appId` or a regular application service principal's `id` will fail. Only agent identities created from blueprints work.

---

## Step 2: Create the Agent User

### HTTP Request

```http
POST https://graph.microsoft.com/beta/users/microsoft.graph.agentUser
Content-Type: application/json
Authorization: Bearer <token>

{
  "accountEnabled": true,
  "displayName": "My Agent User",
  "mailNickname": "my-agent-user",
  "userPrincipalName": "my-agent-user@yourtenant.onmicrosoft.com",
  "identityParentId": "<agent-identity-object-id>"
}
```

### Required Properties

| Property | Type | Description |
|---|---|---|
| `accountEnabled` | Boolean | `true` to enable the account |
| `displayName` | String | Human-friendly name |
| `mailNickname` | String | Mail alias (no spaces/special chars) |
| `userPrincipalName` | String | UPN — must be unique in the tenant (`alias@verified-domain`) |
| `identityParentId` | String | Object ID of the parent agent identity |

### PowerShell

```powershell
Connect-MgGraph -Scopes "User.ReadWrite.All" -TenantId "<tenant>" -UseDeviceCode -NoWelcome

$body = @{
  accountEnabled    = $true
  displayName       = "My Agent User"
  mailNickname      = "my-agent-user"
  userPrincipalName = "my-agent-user@yourtenant.onmicrosoft.com"
  identityParentId  = "<agent-identity-object-id>"
} | ConvertTo-Json

Invoke-MgGraphRequest -Method POST `
  -Uri "https://graph.microsoft.com/beta/users/microsoft.graph.agentUser" `
  -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 3
```

### Key Notes

- **No password** — agent users cannot have passwords. They authenticate via their parent agent identity's credentials.
- **1:1 relationship** — each agent identity can have at most one agent user. Attempting to create a second returns `400 Bad Request`.
- The `userPrincipalName` must be unique. Don't reuse an existing user's UPN.

---

## Step 3: Assign a Manager (Optional)

Assigning a manager allows the agent user to appear in org charts (e.g., Teams).

```http
PUT https://graph.microsoft.com/beta/users/{agent-user-id}/manager/$ref
Content-Type: application/json
Authorization: Bearer <token>

{
  "@odata.id": "https://graph.microsoft.com/beta/users/{manager-user-id}"
}
```

### PowerShell

```powershell
$managerBody = '{"@odata.id":"https://graph.microsoft.com/beta/users/<manager-user-id>"}'
Invoke-MgGraphRequest -Method PUT `
  -Uri "https://graph.microsoft.com/beta/users/<agent-user-id>/manager/`$ref" `
  -Body $managerBody -ContentType "application/json"
```

---

## Step 4: Set Usage Location and Assign Licenses (Optional)

A license is needed for the agent user to have a mailbox, Teams presence, etc. Usage location must be set first.

### Set Usage Location

```http
PATCH https://graph.microsoft.com/beta/users/{agent-user-id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "usageLocation": "US"
}
```

### List Available Licenses

```http
GET https://graph.microsoft.com/beta/subscribedSkus?$select=skuPartNumber,skuId,consumedUnits,prepaidUnits
Authorization: Bearer <token>
```

Requires `Organization.Read.All` permission.

### Assign a License

```http
POST https://graph.microsoft.com/beta/users/{agent-user-id}/assignLicense
Content-Type: application/json
Authorization: Bearer <token>

{
  "addLicenses": [
    { "skuId": "<sku-id>" }
  ],
  "removeLicenses": []
}
```

### PowerShell (all in one)

```powershell
Connect-MgGraph -Scopes "User.ReadWrite.All","Organization.Read.All" -TenantId "<tenant>" -NoWelcome

# Set usage location
Invoke-MgGraphRequest -Method PATCH `
  -Uri "https://graph.microsoft.com/beta/users/<agent-user-id>" `
  -Body '{"usageLocation":"US"}' -ContentType "application/json"

# Assign license
$licenseBody = '{"addLicenses":[{"skuId":"<sku-id>"}],"removeLicenses":[]}'
Invoke-MgGraphRequest -Method POST `
  -Uri "https://graph.microsoft.com/beta/users/<agent-user-id>/assignLicense" `
  -Body $licenseBody -ContentType "application/json"
```

> **Tip:** You can also assign licenses via the **Entra admin center** under Identity → Users → All users → select the agent user → Licenses and apps.

---

## Provisioning Times

| Service | Estimated Time |
|---|---|
| Exchange mailbox | 5–30 minutes |
| Teams availability | 15 min – 24 hours |
| Org chart / People search | Up to 24–48 hours |
| SharePoint / OneDrive | 5–30 minutes |
| Global Address List | Up to 24 hours |

---

## Agent User Capabilities

- ✅ Added to Microsoft Entra groups (including dynamic groups)
- ✅ Access user-only APIs (`idtyp=user` tokens)
- ✅ Own a mailbox, calendar, and contacts
- ✅ Participate in Teams chats and channels
- ✅ Appear in org charts and People search
- ✅ Added to administrative units
- ✅ Assigned licenses

## Agent User Security Constraints

- ❌ Cannot have passwords, passkeys, or interactive sign-in
- ❌ Cannot be assigned privileged admin roles
- ❌ Cannot be added to role-assignable groups
- ❌ Permissions similar to guest users by default
- ❌ Custom role assignment not available

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Agent user IdentityParent does not exist` | `identityParentId` points to a non-existent or non-agent-identity object | Verify the ID is an `agentIdentity` service principal, not a regular app |
| `400 Bad Request` (identityParentId already linked) | The agent identity already has an agent user | Each agent identity supports only one agent user |
| `409 Conflict` on UPN | The `userPrincipalName` is already taken | Use a unique UPN |
| License assignment fails | Usage location not set | Set `usageLocation` before assigning licenses |

---

## References

- [Agent identities](https://learn.microsoft.com/en-us/entra/agent-id/identity-platform/agent-identities)
- [Agent users](https://learn.microsoft.com/en-us/entra/agent-id/identity-platform/agent-users)
- [Agent service principals](https://learn.microsoft.com/en-us/entra/agent-id/identity-platform/agent-service-principals)
- [Create agent identity blueprint](https://learn.microsoft.com/en-us/entra/agent-id/identity-platform/create-blueprint)
- [Create agent identities](https://learn.microsoft.com/en-us/entra/agent-id/identity-platform/create-delete-agent-identities)
- [agentUser resource type (Graph API)](https://learn.microsoft.com/en-us/graph/api/resources/agentuser?view=graph-rest-beta)
- [Create agentUser (Graph API)](https://learn.microsoft.com/en-us/graph/api/agentuser-post?view=graph-rest-beta)
