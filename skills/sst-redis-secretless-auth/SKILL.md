---
name: sst-redis-secretless-auth
description: 'Helps you migrate Azure Cache for Redis from access key authentication to Microsoft Entra ID (Managed Identity) authentication — eliminating shared secrets and aligning with identity-based security best practices.'
metadata:
  version: "1.0.0"
---

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

# Azure Cache for Redis — Managed Identity Migration

> **Scope:** Azure Cache for Redis only. Azure Managed Redis is a separate service and is not covered here.

This skill helps you migrate Azure Cache for Redis from access key authentication to Microsoft Entra ID (Managed Identity) authentication — a security best practice aligned with [**Pillar 1: Protect identities and secrets**](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) of Microsoft's [Secure Future Initiative](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-overview) and [Zero Trust principles](https://learn.microsoft.com/security/zero-trust/).

**Approach:**

- Explain *why* Entra authentication matters before diving into changes
- Provide clear guidance with code examples — you decide what to apply
- Be transparent about confidence — especially when code patterns are unusual
- Celebrate progress — every migrated Redis connection reduces security risk

---

## Overview

| Aspect | Details |
|--------|---------|
| **What** | Migrate Azure Cache for Redis from access key authentication to Microsoft Entra ID using managed identities |
| **Why** | Access keys are shared secrets — they can be leaked, don't expire automatically, and grant broad access. Managed identities eliminate these risks. |
| **Security Principle** | [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) — eliminate shared secrets, authenticate with managed identities. See also: [Zero Trust: Verify explicitly](https://learn.microsoft.com/security/zero-trust/) |
| **Scope** | Infrastructure as Code (Bicep/ARM) and client-side code (.NET with `StackExchange.Redis`; other languages per the fetched doc) |

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

## First Step: Fetch the Public Docs

**Do this before anything else** — before scanning the codebase, proposing changes, or following any step below. Fetch the docs below and reuse them as you work through this skill. Treat them as the source of truth: if a live doc and any value written into this skill disagree, **the live doc wins**.

**Why — the security goal (SFI, kept current by the SFI team):**

- [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview) — the goal this migration serves: eliminate shared secrets and authenticate with managed identities. Use it for the rationale and current pillar objectives.

**How — the remediation steps (service doc):**

- [Use Microsoft Entra for cache authentication](https://learn.microsoft.com/azure/azure-cache-for-redis/cache-azure-active-directory-for-authentication) — the current migration steps and client configuration.

Use the **How** doc as the source of truth for:

- Which client languages are currently supported (the **Client library support** table)
- Per-language client library names and minimum versions
- Per-language code samples
- Current property and access-policy naming

Use the **Why** doc as the source of truth for which SFI objective applies and the current principle framing.

**If the fetch fails**, tell the user, share the doc URL so they can read it themselves, and continue with the .NET / C# guidance below — note that language coverage, library minimums, property names, and code samples may be out of date.

**If the codebase uses more than one language** from the Client library support table, list the detected languages and ask the user whether to focus on a single language for this session (others deferred) or work through all of them. Do not pick a default.

> **Note:** Subsequent references to "the fetched doc" in this skill mean the **How** doc (cache authentication) you fetched in this step. Do not re-fetch on every reference.

## When to Use This Skill

Use this skill when your codebase has any of the following patterns:

### In IaC Files (Bicep / ARM Templates)

Look for `Microsoft.Cache/redis` resources where:

- `"aad-enabled"` property is not set to `"true"`
- `"disableAccessKeyAuthentication"` property is not set to `"true"`
- `apiVersion` is set to an earlier version than `"2023-08-01"`

### In Client-Side Code

Scan the codebase to identify which language(s) and Redis client libraries are in use, then check the [Client library support](https://learn.microsoft.com/azure/azure-cache-for-redis/cache-azure-active-directory-for-authentication#client-library-support) table in the fetched doc to confirm Entra authentication is supported for each one.

For .NET, look for `StackExchange.Redis` usage where:

- `ConfigurationOptions.Password` is used for authentication
- A connection string value is passed to `ConnectionMultiplexer.Connect()` or `ConnectionMultiplexer.ConnectAsync()`
- `Microsoft.Azure.StackExchangeRedis` client library version is earlier than `3.3.0` (or older than the current minimum named in the fetched doc, if newer)

For other languages, look for the equivalent indicators per the fetched doc's per-language guidance — typically password or connection-URL credentials passed to the client constructor, or a supporting library version below the fetched doc's current minimum.

> **Note:** Redis operations (e.g., list keys, get key) are not indicators — only connection-related patterns should be flagged.

## Prerequisites

- **Azure CLI** installed and authenticated (`az login`)
- **Azure subscription** with an Azure Cache for Redis instance (Basic, Standard, or Premium tier)
- **Managed identity** — either a user-assigned or system-assigned managed identity configured for your application
- For client-side changes (.NET): **Microsoft.Azure.StackExchangeRedis** NuGet package — see the fetched doc for the current minimum version (v3.3.0 or later at time of authoring).
- For client-side changes in other supported languages: see the [Client library support](https://learn.microsoft.com/azure/azure-cache-for-redis/cache-azure-active-directory-for-authentication#client-library-support) table in the fetched doc for the supported library and minimum version per language.

## Step-by-Step Migration Guide

> ⚠️ **Critical: Do not enable Entra and disable access keys in the same deployment.**
> If clients haven't been updated to authenticate with Entra yet, setting `disableAccessKeyAuthentication: true` at the same time as `aad-enabled: true` will terminate all client connections and cause a customer-facing outage.

The migration runs as three sequential deployments:

1. **Phase 1 — Enable Entra (IaC).** Deploy the IaC change that adds Entra auth alongside existing access-key auth. Existing clients keep working unchanged.
2. **Phase 2 — Migrate clients to Entra.** Update each client to authenticate via managed identity, then confirm `ConnectedClientUsingAADToken` and `ConnectedClients` are about the same number (see [Validation](#validation)).
3. **Phase 3 — Disable access keys (IaC).** Once Phase 2 validation passes for **all** clients of the cache, deploy the IaC change that flips `disableAccessKeyAuthentication` to `true`.

### Phase 1 — Enable Entra (IaC)

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

Turn on Entra authentication while leaving access-key authentication intact, so existing clients keep working unchanged. Confirm the deployment succeeds and existing clients still connect via access keys before moving to Phase 2.

Update your `Microsoft.Cache/redis` resource definitions:

- Add or update `"aad-enabled"` property to `"true"`
- Ensure `apiVersion` is set to `"2023-08-01"` or later
- Configure managed identity access by adding `accessPolicyAssignments` as sub-resources, with `"accessPolicyName"` (e.g., `"Data Owner"`) and associated `objectId`
- **Leave `"disableAccessKeyAuthentication"` as `false` (or omit it).** Do not set this in Phase 1.

  **Sample Updated Code for Bicep/ARM Template**
  ```json
  {
      "parameters": {
        "builtInAccessPolicyName": {
          "type": "string",
          "defaultValue": "Data Owner",
          "allowedValues": [
            "Data Owner",
            "Data Contributor",
            "Data Reader"
          ],
          "metadata": {
            "description": "Specify name of Built-In access policy to use as assignment."
          }
        },
        "builtInAccessPolicyAssignmentName": {
          "type": "string",
          "defaultValue": "[format('builtInAccessPolicyAssignment-{0}', uniqueString(resourceGroup().id))]",
          "metadata": {
            "description": "Specify name of custom access policy to create."
          }
        },
        "builtInAccessPolicyAssignmentObjectId": {
          "type": "string",
          "defaultValue": "<your-managed-identity-object-id>",
          "metadata": {
            "description": "Specify the valid objectId(usually it is a GUID) of the Microsoft Entra Service Principal or Managed Identity or User Principal to which the built-in access policy would be assigned."
          }
        },
        "builtInAccessPolicyAssignmentObjectAlias": {
          "type": "string",
          "defaultValue": "<your-managed-identity-display-name>",
          "metadata": {
            "description": "Specify human readable name of principal Id of the Microsoft Entra Application name or Managed Identity name used for built-in policy assignment."
          }
        }
      },
      "resources": [
        {
          "type": "Microsoft.Cache/redis",
          "apiVersion": "2023-08-01",
          "name": "[parameters('redisCacheName')]",
          "location": "[parameters('location')]",
          "properties": {
            "disableAccessKeyAuthentication": false,
            "enableNonSslPort": false,
            "minimumTlsVersion": "1.2",
            "redisConfiguration": {
              "aad-enabled": "true"
            }
          }
        },
        {
          "type": "Microsoft.Cache/redis/accessPolicyAssignments",
          "apiVersion": "2023-08-01",
          "name": "[format('{0}/{1}', parameters('redisCacheName'), parameters('builtInAccessPolicyAssignmentName'))]",
          "properties": {
            "accessPolicyName": "[parameters('builtInAccessPolicyName')]",
            "objectId": "[parameters('builtInAccessPolicyAssignmentObjectId')]",
            "objectIdAlias": "[parameters('builtInAccessPolicyAssignmentObjectAlias')]"
          },
          "dependsOn": [
            "[resourceId('Microsoft.Cache/redis', parameters('redisCacheName'))]"
          ]
        }
      ]
  }
  ```

### Phase 2 — Migrate clients to Entra

#### .NET (C#)

Replace password or connection string authentication with managed identity authentication using Microsoft Entra:

- Remove any use of `ConfigurationOptions.Password`
- Replace connection string–based connections with managed identity–based configuration
- Use `ConfigureForAzureWithUserAssignedManagedIdentityAsync()` for user-assigned managed identity, or `ConfigureForAzureWithSystemAssignedManagedIdentityAsync()` for system-assigned managed identity

For more details, see: [Use Microsoft Entra for cache authentication](https://learn.microsoft.com/azure/azure-cache-for-redis/cache-azure-active-directory-for-authentication)

  **Example Updated C# Code for Entra Authentication**
  ```csharp
  using StackExchange.Redis;

  string managedIdentity = "<your-managed-identity-client-id>";
  ConfigurationOptions configurationOptions = new()
  {
      // Set all other necessary configuration options here
  };

  try
  {
      // Configure for user-assigned managed identity
      await configurationOptions.ConfigureForAzureWithUserAssignedManagedIdentityAsync(managedIdentity);

      // Alternatively, for system-assigned managed identity, use:
      // await configurationOptions.ConfigureForAzureWithSystemAssignedManagedIdentityAsync();

      var connection = await ConnectionMultiplexer.ConnectAsync(configurationOptions);
      IDatabase database = connection.GetDatabase();
      Console.WriteLine("Connected to Redis successfully.");
  }
  catch (Exception ex)
  {
      Console.WriteLine($"Failed to connect to Redis: {ex.Message}");
  }
  ```

#### Other languages

For any language other than .NET listed in the fetched doc's [Client library support](https://learn.microsoft.com/azure/azure-cache-for-redis/cache-azure-active-directory-for-authentication#client-library-support) table, follow the fetched doc's per-language code sample. The surrounding migration structure — Phase 1, Phase 3, the metrics gate (see [Validation](#validation)), and the rollback warning — applies identically regardless of client language.

### Phase 3 — Disable access keys (IaC)

Disable access-key authentication. Only execute this after Phase 2 validation confirms the Azure Monitor metrics `ConnectedClientUsingAADToken` and `ConnectedClients` are about the same number for **all** clients of the cache (see [Validation](#validation)) — that confirms application clients have moved to Entra.

> **Note:** Disabling access keys terminates all existing client connections (both key-based and Entra-based). Plan for a brief connection disruption during the switch as clients reconnect via Entra.

Apply this single property change to the Phase 1 template:

- Set `"disableAccessKeyAuthentication"` to `true`. No other property changes from Phase 1.

  **Bicep / ARM diff snippet**
  ```jsonc
  // Phase 3 change (delta vs. Phase 1 template):
  "properties": {
    "disableAccessKeyAuthentication": true,   // was: false
    "enableNonSslPort": false,
    "minimumTlsVersion": "1.2",
    "redisConfiguration": {
      "aad-enabled": "true"
    }
  }
  ```

---

## 🔐 Enforce Entra-Only Authentication with Azure Policy

After successfully migrating to Entra ID authentication, enforce disabled access key authentication across your Azure Cache for Redis instances using built-in Azure Policy. This prevents accidental re-enabling of local auth and ensures ongoing security.

### Apply the Built-In Azure Policy

Azure provides a built-in policy definition for this purpose:

- **Policy name**: *Azure Cache for Redis should not use access keys for authentication*
- **Policy definition ID**: `/providers/Microsoft.Authorization/policyDefinitions/3827af20-8f80-4b15-8300-6db0873ec901`

Assign this policy at your subscription or management group level:

```bash
az policy assignment create \
  --name "redis-disable-access-keys" \
  --display-name "Enforce Entra-only authentication on Azure Cache for Redis" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/3827af20-8f80-4b15-8300-6db0873ec901" \
  --scope "/subscriptions/<subscription-id>"
```

For more details on built-in policies for Azure Cache for Redis, see: [Azure Policy built-in definitions for Azure Cache for Redis](https://learn.microsoft.com/azure/azure-cache-for-redis/policy-reference)

### Exemptions (Break-Glass)

If you need to temporarily exempt a Redis Cache instance (e.g., during migration or for emergency access), use an [Azure Policy exemption](https://learn.microsoft.com/azure/governance/policy/concepts/exemption-structure) rather than removing the policy assignment.

---

## Validation

After completing the migration, verify:

1. **IaC validation** — Review your Bicep/ARM template to confirm:
   - `redisConfiguration.aad-enabled` is `"true"`
   - `disableAccessKeyAuthentication` is `true`
   - `apiVersion` is `"2023-08-01"` or later
   - `accessPolicyAssignments` sub-resource is present with correct `objectId`

2. **Client-side validation** — Confirm:
   - **For .NET:**
     - No `ConfigurationOptions.Password` usage remains
     - No connection string–based `ConnectionMultiplexer.Connect()` calls remain
     - `Microsoft.Azure.StackExchangeRedis` package is `3.3.0` or later (or the current minimum named in the fetched doc, if newer)
   - **For other languages:** confirm the equivalent — no password / connection-URL credentials in the Redis client constructor — using the language's idiomatic mechanism per the fetched doc's per-language sample.

3. **Runtime validation** — After deployment:
   - Verify the application connects to Redis successfully using managed identity
   - Check Azure Monitor metrics: `ConnectedClientUsingAADToken` (display name: *Connected Clients Using Microsoft Entra Token*) and `ConnectedClients` should be about the same number. `ConnectedClients` will likely show 1 to 30 connections higher (depending on cache size) because of internal management connections — that's normal.
   - Confirm access keys are disabled in the Azure portal under **Authentication > Access keys**

## Rollback

If issues arise after migration:

1. **Re-enable access keys** — Set `disableAccessKeyAuthentication` to `false` in your IaC template and redeploy
2. **If Entra authentication itself is failing** — temporarily revert affected clients to access-key (connection string) auth until the root cause is resolved
3. **Investigate** — Check Azure Monitor logs for authentication failures; verify managed identity has the correct access policy assignment
4. **Retry migration** — After resolving the root cause, re-apply the Entra authentication changes

> ⚠️ **Warning:** Do not combine Phase 1 (enable Entra) and Phase 3 (disable access keys) into a single deployment. If clients have not yet been updated to authenticate via Entra, disabling access keys will cause a customer-facing outage.

---

## Example Scenarios

> **Note:** The examples below are for developer reference — they illustrate how
> different codebase configurations affect the migration approach.

### Scenario: IaC-only — no client-side Redis code

**Starting state:** Repository contains a Bicep template with a `Microsoft.Cache/redis` resource. `aad-enabled` is not set. `disableAccessKeyAuthentication` is `false`. No C# files reference `StackExchange.Redis`. No `Microsoft.Azure.StackExchangeRedis` package in the project.

**Migration approach:**

1. IaC scan finds Bicep with `Microsoft.Cache/redis` — two issues: `aad-enabled` missing, `disableAccessKeyAuthentication` is `false`. Client-side scan finds no `StackExchange.Redis` usage.
2. Execute Phase 1: set `aad-enabled: "true"`, update `apiVersion` to `2023-08-01` or later, leave `disableAccessKeyAuthentication: false`. No client-side changes are needed in this repo.
3. Monitor the live cache's authentication metrics until `ConnectedClientUsingAADToken` and `ConnectedClients` are about the same number (see [Validation](#validation)), confirming no clients still use access keys — including services outside this repo that the skill can't see or migrate.
4. Execute Phase 3: set `disableAccessKeyAuthentication: true` once that gate holds.

**If no Redis resources are found** in either IaC templates or client-side code, no migration is needed — confirm the repository scope is correct.

---

## Related Resources

- [SFI Pillar 1: Protect identities and secrets](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-identity-overview)
- [Secure Future Initiative Overview](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-overview)
- [Zero Trust Principles](https://learn.microsoft.com/security/zero-trust/)
- [Use Microsoft Entra for Azure Cache for Redis authentication](https://learn.microsoft.com/azure/azure-cache-for-redis/cache-azure-active-directory-for-authentication)
- [Azure Identity management best practices](https://learn.microsoft.com/azure/security/fundamentals/identity-management-best-practices)
- [Microsoft.Azure.StackExchangeRedis NuGet package](https://www.nuget.org/packages/Microsoft.Azure.StackExchangeRedis)
- [Adopt standard SDKs for identity (SFI)](https://learn.microsoft.com/security/zero-trust/sfi/adopt-standard-sdk-identity)

---
