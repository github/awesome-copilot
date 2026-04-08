# Azure Common Patterns (Stable)

This file contains only **near-immutable patterns** that are repeated across Azure services.
Dynamic information such as API version, SKU, and region is not included here → See `azure-dynamic-sources.md`.

---

## 1. Network Isolation Patterns

### Private Endpoint 3-Component Set

All services using PE must have the 3-component set configured:

1. **Private Endpoint** — Placed in pe-subnet
2. **Private DNS Zone** + **VNet Link** (`registrationEnabled: false`)
3. **DNS Zone Group** — Linked to PE

> If any one is missing, DNS resolution fails even with PE present, causing connection failure.

### PE Subnet Required Settings

```bicep
resource peSubnet 'Microsoft.Network/virtualNetworks/subnets' = {
  properties: {
    addressPrefix: peSubnetPrefix              // ← CIDR as parameter — prevent existing network conflicts
    privateEndpointNetworkPolicies: 'Disabled'  // ← Required. PE deployment fails without it
  }
}
```

### publicNetworkAccess Pattern

Services using PE must include:
```bicep
properties: {
  publicNetworkAccess: 'Disabled'
  networkAcls: {
    defaultAction: 'Deny'
  }
}
```

---

## 2. Security Patterns

### Key Vault

```bicep
properties: {
  enableRbacAuthorization: true    // Do not use Access Policy method
  enableSoftDelete: true
  softDeleteRetentionInDays: 90
  enablePurgeProtection: true
}
```

### Managed Identity

When AI services access other resources:
```bicep
identity: {
  type: 'SystemAssigned'  // or 'UserAssigned'
}
```

### Sensitive Information

- Use `@secure()` decorator
- Do not store plaintext in `.bicepparam` files
- Use Key Vault references

---

## 3. Naming Conventions (CAF-based)

```
rg-{project}-{env}          Resource Group
vnet-{project}-{env}        Virtual Network
st{project}{env}             Storage Account (no special characters, lowercase+numbers only)
kv-{project}-{env}           Key Vault
srch-{project}-{env}         AI Search
foundry-{project}-{env}      Cognitive Services (Foundry)
```

> Name collision prevention: Recommend using `uniqueString(resourceGroup().id)`
> ```bicep
> param storageName string = 'st${uniqueString(resourceGroup().id)}'
> ```

---

## 4. Bicep Module Structure

```
<project>/
├── main.bicep              # Orchestration — module calls + parameter passing
├── main.bicepparam         # Environment-specific values (excluding sensitive info)
└── modules/
    ├── network.bicep           # VNet, Subnet
    ├── <service>.bicep         # Per-service modules
    ├── keyvault.bicep          # Key Vault
    └── private-endpoints.bicep # All PE + DNS Zone + VNet Link
```

### Dependency Management

```bicep
// ✅ Correct: Implicit dependency via resource reference
resource project '...' = {
  properties: {
    parentId: foundry.id  // foundry reference → automatically deploys foundry first
  }
}

// ❌ Avoid: Explicit dependsOn (use only when necessary)
```

---

## 5. PE Bicep Common Template

```bicep
// ── Private Endpoint ──
resource pe 'Microsoft.Network/privateEndpoints@<fetch>' = {
  name: 'pe-${serviceName}'
  location: location
  properties: {
    subnet: { id: peSubnetId }
    privateLinkServiceConnections: [{
      name: 'pls-${serviceName}'
      properties: {
        privateLinkServiceId: serviceId
        groupIds: ['<groupId>']  // ← Varies by service. See service-gotchas.md
      }
    }]
  }
}

// ── Private DNS Zone ──
resource dnsZone 'Microsoft.Network/privateDnsZones@<fetch>' = {
  name: '<dnsZoneName>'  // ← Varies by service
  location: 'global'
}

// ── VNet Link ──
resource vnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@<fetch>' = {
  parent: dnsZone
  name: '${dnsZone.name}-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnetId }
    registrationEnabled: false  // ← Must be false
  }
}

// ── DNS Zone Group ──
resource dnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@<fetch>' = {
  parent: pe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [{
      name: 'config'
      properties: { privateDnsZoneId: dnsZone.id }
    }]
  }
}
```

> `@<fetch>`: Always verify the latest stable API version from MS Docs before deployment.
