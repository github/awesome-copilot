// recipes/cosmosdb/bicep/cosmos-network.bicep
// Cosmos DB networking recipe — private endpoint + DNS zone
// Only deployed when VNET_ENABLED=true
//
// USAGE: Add this as a conditional module in main.bicep:
//   module cosmosNetwork './app/cosmos-network.bicep' = if (vnetEnabled) {
//     name: 'cosmosNetwork'
//     scope: rg
//     params: {
//       cosmosAccountId: cosmos.outputs.cosmosAccountId
//       cosmosAccountName: cosmos.outputs.cosmosAccountName
//       vnetId: vnet.outputs.vnetId
//       subnetId: vnet.outputs.subnetId
//       location: location
//       tags: tags
//     }
//   }

targetScope = 'resourceGroup'

@description('Cosmos DB account resource ID')
param cosmosAccountId string

@description('Cosmos DB account name')
param cosmosAccountName string

@description('VNet resource ID')
param vnetId string

@description('Subnet resource ID for private endpoint')
param subnetId string

@description('Azure region')
param location string = resourceGroup().location

@description('Resource tags')
param tags object = {}

// ============================================================================
// Private DNS Zone
// ============================================================================
resource privateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.documents.azure.com'
  location: 'global'
  tags: tags
}

resource privateDnsZoneVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: privateDnsZone
  name: '${cosmosAccountName}-dns-link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnetId
    }
  }
}

// ============================================================================
// Private Endpoint
// ============================================================================
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'pe-${cosmosAccountName}'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: subnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'cosmos-connection'
        properties: {
          privateLinkServiceId: cosmosAccountId
          groupIds: ['Sql']
        }
      }
    ]
  }
}

resource privateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
  parent: privateEndpoint
  name: 'cosmos-dns-group'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'cosmos-dns-config'
        properties: {
          privateDnsZoneId: privateDnsZone.id
        }
      }
    ]
  }
}
