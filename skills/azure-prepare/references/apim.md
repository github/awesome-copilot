# APIM Deployment Guide

Deploy Azure API Management (APIM) as part of your Azure infrastructure.

> **For AI Gateway configuration** (policies, backends, semantic caching), use the **azure-aigateway** skill after deployment.

---

## When to Deploy APIM

| Scenario | APIM Tier | Notes |
|----------|-----------|-------|
| AI Gateway for model governance | Standard v2 or Premium v2 | Semantic caching requires v2 SKUs |
| API consolidation | Standard v2 | Single entry point for microservices |
| MCP tool hosting | Standard v2 | Rate limiting and auth for AI tools |
| Development / Testing | Developer | Not for production |
| High-volume production | Premium v2 | Multi-region, higher limits |

---

## Quick Deploy (Azure CLI)

### 1. Create APIM Instance

```bash
az apim create \
  --name <apim-name> \
  --resource-group <rg> \
  --location <location> \
  --publisher-name "<your-org>" \
  --publisher-email "<admin@org.com>" \
  --sku-name "StandardV2" \
  --sku-capacity 1

# ⚠ APIM provisioning takes 30-45 minutes for Standard/Premium tiers
```

### 2. Enable Managed Identity

```bash
az apim update --name <apim-name> --resource-group <rg> \
  --set identity.type=SystemAssigned
```

### 3. Get Gateway URL

```bash
az apim show --name <apim-name> --resource-group <rg> \
  --query "gatewayUrl" -o tsv
```

---

## Bicep Template

```bicep
@description('Name of the API Management instance')
param apimName string

@description('Location for the APIM instance')
param location string = resourceGroup().location

@description('Publisher organization name')
param publisherName string

@description('Publisher email address')
param publisherEmail string

@description('SKU name (StandardV2 recommended for AI Gateway)')
@allowed(['Developer', 'StandardV2', 'PremiumV2'])
param skuName string = 'StandardV2'

@description('Number of scale units')
param skuCapacity int = 1

resource apim 'Microsoft.ApiManagement/service@2023-09-01-preview' = {
  name: apimName
  location: location
  sku: {
    name: skuName
    capacity: skuCapacity
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    publisherName: publisherName
    publisherEmail: publisherEmail
  }
}

output apimId string = apim.id
output gatewayUrl string = apim.properties.gatewayUrl
output principalId string = apim.identity.principalId
```

### With Azure OpenAI Backend (AI Gateway Pattern)

```bicep
@description('Name of the Azure OpenAI resource')
param aoaiName string

@description('Resource group of the Azure OpenAI resource')
param aoaiResourceGroup string = resourceGroup().name

// Reference existing Azure OpenAI
resource aoai 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' existing = {
  name: aoaiName
  scope: resourceGroup(aoaiResourceGroup)
}

// APIM Backend pointing to Azure OpenAI
resource openaiBackend 'Microsoft.ApiManagement/service/backends@2023-09-01-preview' = {
  parent: apim
  name: 'openai-backend'
  properties: {
    protocol: 'http'
    url: '${aoai.properties.endpoint}openai'
    tls: {
      validateCertificateChain: true
      validateCertificateName: true
    }
  }
}

// Grant APIM access to Azure OpenAI
resource cognitiveServicesUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(apim.id, aoai.id, 'Cognitive Services User')
  scope: aoai
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
    principalId: apim.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
```

---

## Terraform Module

```hcl
resource "azurerm_api_management" "apim" {
  name                = var.apim_name
  location            = var.location
  resource_group_name = var.resource_group_name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email
  sku_name            = "${var.sku_name}_${var.sku_capacity}"

  identity {
    type = "SystemAssigned"
  }
}

output "gateway_url" {
  value = azurerm_api_management.apim.gateway_url
}

output "principal_id" {
  value = azurerm_api_management.apim.identity[0].principal_id
}
```

---

## Post-Deployment Steps

After APIM is deployed:

1. **Configure AI backends** → Use **azure-aigateway** skill
2. **Import APIs** → `az apim api import` or portal
3. **Apply policies** → Invoke **azure-aigateway** skill for AI governance policies
4. **Enable monitoring** → Connect Application Insights
5. **Secure endpoints** → Configure subscriptions and RBAC

---

## SKU Selection Guide

| Feature | Developer | Standard v2 | Premium v2 |
|---------|-----------|-------------|------------|
| GenAI policies | ✅ | ✅ | ✅ |
| Semantic caching | ❌ | ✅ | ✅ |
| VNet integration | ❌ | ✅ | ✅ |
| Multi-region | ❌ | ❌ | ✅ |
| SLA | None | 99.95% | 99.99% |
| Scale units | 1 | 1-10 | 1-12 per region |
| Provisioning time | ~30 min | ~30 min | ~45 min |

> **Recommendation**: Use **Standard v2** for most AI Gateway scenarios. Use **Premium v2** only for multi-region or high-compliance requirements.

---

## Naming Conventions

| Resource | Pattern | Example |
|----------|---------|---------|
| APIM Instance | `apim-<app>-<env>` | `apim-myapp-prod` |
| API | `<api-name>-api` | `openai-api` |
| Backend | `<service>-backend` | `openai-backend` |
| Product | `<tier>-product` | `premium-product` |
| Subscription | `<consumer>-sub` | `frontend-sub` |

---

## References

- [APIM v2 Overview](https://learn.microsoft.com/azure/api-management/v2-service-tiers-overview)
- [APIM Bicep Reference](https://learn.microsoft.com/azure/templates/microsoft.apimanagement/service)
- [APIM Terraform](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management)
- [GenAI Gateway Capabilities](https://learn.microsoft.com/azure/api-management/genai-gateway-capabilities)
