# Network Topology and Connectivity Design

## Table of Contents
1. [Topology Selection](#topology-selection)
2. [Hub-Spoke Architecture](#hub-spoke-architecture)
3. [Virtual WAN Architecture](#virtual-wan-architecture)
4. [Connectivity Patterns](#connectivity-patterns)
5. [DNS Design](#dns-design)
6. [IP Address Management](#ip-address-management)

## Topology Selection

### Decision Matrix

| Requirement | Hub-Spoke | Virtual WAN |
|-------------|-----------|-------------|
| < 30 VNets | ✅ Recommended | ⚠️ Overkill |
| 30-200 VNets | ⚠️ Complex | ✅ Recommended |
| > 200 VNets | ❌ Not scalable | ✅ Required |
| SD-WAN integration | ❌ Manual | ✅ Native |
| Custom routing | ✅ Full control | ⚠️ Limited |
| Cost sensitivity | ✅ Lower | ⚠️ Higher base cost |
| Multi-region | ⚠️ Complex | ✅ Simplified |

### Hybrid Approach
Start with hub-spoke, migrate to Virtual WAN when:
- VNet count exceeds 50
- Multi-region connectivity becomes complex
- SD-WAN integration is required

## Hub-Spoke Architecture

### Reference Design
```
                    ┌─────────────────────────────────────┐
                    │         On-premises Network         │
                    └───────────────┬─────────────────────┘
                                    │ ExpressRoute/VPN
                    ┌───────────────▼─────────────────────┐
                    │            Hub VNet                 │
                    │  ┌─────────┐  ┌─────────────────┐  │
                    │  │ Gateway │  │  Azure Firewall │  │
                    │  │ Subnet  │  │     Subnet      │  │
                    │  └─────────┘  └─────────────────┘  │
                    │  ┌─────────────────────────────┐   │
                    │  │     Shared Services         │   │
                    │  │  (DNS, AD DS, Jump boxes)   │   │
                    │  └─────────────────────────────┘   │
                    └──────┬─────────────┬───────────────┘
                           │ Peering     │ Peering
              ┌────────────▼──┐      ┌───▼────────────┐
              │  Spoke VNet   │      │  Spoke VNet    │
              │  (Workload A) │      │  (Workload B)  │
              └───────────────┘      └────────────────┘
```

### Hub VNet Subnets

| Subnet | Size | Purpose |
|--------|------|---------|
| GatewaySubnet | /27 minimum | VPN/ExpressRoute gateways |
| AzureFirewallSubnet | /26 required | Azure Firewall |
| AzureBastionSubnet | /26 minimum | Azure Bastion |
| SharedServices | /24 | DNS forwarders, DCs, jump boxes |
| Management | /24 | Automation, monitoring agents |

### Spoke VNet Subnets

| Subnet | Size | Purpose |
|--------|------|---------|
| Application | /24 | App tier |
| Data | /24 | Database tier |
| PrivateEndpoints | /24 | Private endpoints |
| AppGateway | /24 | Application Gateway (if needed) |

### Peering Configuration
```bicep
resource hubToSpokePeering 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-05-01' = {
  name: 'hub-to-spoke-${spokeName}'
  parent: hubVnet
  properties: {
    remoteVirtualNetwork: { id: spokeVnet.id }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
    allowGatewayTransit: true      // Hub has gateway
    useRemoteGateways: false
  }
}

resource spokeToHubPeering 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-05-01' = {
  name: 'spoke-to-hub'
  parent: spokeVnet
  properties: {
    remoteVirtualNetwork: { id: hubVnet.id }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
    allowGatewayTransit: false
    useRemoteGateways: true        // Use hub's gateway
  }
}
```

## Virtual WAN Architecture

### Reference Design
```
┌─────────────────────────────────────────────────────────────┐
│                      Virtual WAN                            │
│  ┌─────────────────┐              ┌─────────────────┐      │
│  │   Hub (East)    │◄────────────►│   Hub (West)    │      │
│  │                 │   Global     │                 │      │
│  │ - VPN Gateway   │   Transit    │ - VPN Gateway   │      │
│  │ - ER Gateway    │              │ - ER Gateway    │      │
│  │ - Firewall      │              │ - Firewall      │      │
│  └───────┬─────────┘              └───────┬─────────┘      │
└──────────┼────────────────────────────────┼────────────────┘
           │                                │
    ┌──────▼──────┐                  ┌──────▼──────┐
    │ Spoke VNets │                  │ Spoke VNets │
    │ (East US)   │                  │ (West US)   │
    └─────────────┘                  └─────────────┘
```

### Virtual Hub Configuration

| Setting | Recommended Value |
|---------|-------------------|
| Hub address space | /23 (512 addresses) |
| VPN Gateway scale units | Start with 1, scale as needed |
| ExpressRoute scale units | Match circuit bandwidth |
| Firewall tier | Premium for IDPS |
| Routing preference | ExpressRoute > VPN |

## Connectivity Patterns

### ExpressRoute Configuration
- Use ExpressRoute Global Reach for site-to-site
- Deploy redundant circuits (2 circuits, 2 peering locations)
- Enable FastPath for performance-sensitive workloads
- Configure BFD for faster failover

### VPN Configuration
- Use IKEv2 for stability
- Configure BGP for dynamic routing
- Deploy active-active gateways
- Use custom IPsec policies (AES256, SHA256)

### Private Link Strategy
```
Public Service         Private Endpoint         Consumer VNet
┌─────────────┐       ┌─────────────────┐      ┌─────────────┐
│   Storage   │◄──────│ privatelink.    │◄─────│ Application │
│   Account   │       │ blob.core.      │      │             │
└─────────────┘       │ windows.net     │      └─────────────┘
                      └─────────────────┘
```

## DNS Design

### Private DNS Zones (Centralized in Hub)

| Service | Zone Name |
|---------|-----------|
| Blob Storage | privatelink.blob.core.windows.net |
| Key Vault | privatelink.vaultcore.azure.net |
| SQL Database | privatelink.database.windows.net |
| Cosmos DB | privatelink.documents.azure.com |
| ACR | privatelink.azurecr.io |
| App Service | privatelink.azurewebsites.net |

### DNS Resolution Flow
```
1. VM queries DNS (168.63.129.16)
2. Azure DNS forwards to Private DNS Zone
3. Private DNS returns private endpoint IP
4. VM connects via private IP
```

### Hybrid DNS
```
On-premises DNS ──► Azure DNS Private Resolver ──► Private DNS Zones
                           │
                           ▼
                    Azure-provided DNS
                    (168.63.129.16)
```

## IP Address Management

### Address Space Planning

| Environment | Range | Notes |
|-------------|-------|-------|
| Hub VNets | 10.0.0.0/16 | Per region |
| Spoke VNets | 10.1.0.0/16 - 10.255.0.0/16 | By subscription/workload |
| On-premises | 192.168.0.0/16 | Existing |
| Reserved | 172.16.0.0/12 | Future growth |

### Subnet Calculator
```
/16 = 65,536 addresses = 256 x /24 subnets
/24 = 256 addresses (251 usable, Azure reserves 5)
/26 = 64 addresses (59 usable)
/27 = 32 addresses (27 usable)
```

### IP Addressing Best Practices
- Never overlap with on-premises ranges
- Reserve space for future growth (2x current needs)
- Use contiguous ranges per region for summarization
- Document all allocations in IPAM tool
