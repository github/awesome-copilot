# Azure Retail Prices API Guide

The [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) is **unauthenticated** — no Azure account or subscription needed.

## Endpoint

```text
https://prices.azure.com/api/retail/prices
```

Preview version (includes savings plan rates):
```text
https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview
```

## Querying VM Prices

> **No Azure CLI command exists** for the Retail Prices API. Since the API is unauthenticated, use `curl` (bash) or `Invoke-RestMethod` (PowerShell) directly. The `az rest` command also works but adds no auth benefit.

### Basic VM price lookup

```http
GET https://prices.azure.com/api/retail/prices?$filter=serviceName eq 'Virtual Machines' and armRegionName eq 'eastus' and armSkuName eq 'Standard_D4s_v5' and priceType eq 'Consumption'
```

```bash
curl -s "https://prices.azure.com/api/retail/prices?\$filter=serviceName%20eq%20'Virtual%20Machines'%20and%20armRegionName%20eq%20'eastus'%20and%20armSkuName%20eq%20'Standard_D4s_v5'%20and%20priceType%20eq%20'Consumption'"
```

```powershell
$filter = "serviceName eq 'Virtual Machines' and armRegionName eq 'eastus' and armSkuName eq 'Standard_D4s_v5' and priceType eq 'Consumption'"
$response = Invoke-RestMethod "https://prices.azure.com/api/retail/prices?`$filter=$filter"
$response.Items | Select-Object armSkuName, retailPrice, unitOfMeasure, meterName
```

### Filter by family (all D-series in a region)

```http
GET https://prices.azure.com/api/retail/prices?$filter=serviceName eq 'Virtual Machines' and armRegionName eq 'eastus' and contains(armSkuName, 'Standard_D') and priceType eq 'Consumption'
```

```bash
curl -s "https://prices.azure.com/api/retail/prices?\$filter=serviceName%20eq%20'Virtual%20Machines'%20and%20armRegionName%20eq%20'eastus'%20and%20contains(armSkuName,%20'Standard_D')%20and%20priceType%20eq%20'Consumption'"
```

```powershell
$filter = "serviceName eq 'Virtual Machines' and armRegionName eq 'eastus' and contains(armSkuName, 'Standard_D') and priceType eq 'Consumption'"
$response = Invoke-RestMethod "https://prices.azure.com/api/retail/prices?`$filter=$filter"
$response.Items | Select-Object armSkuName, retailPrice, meterName
```

### Reservation pricing

```http
GET https://prices.azure.com/api/retail/prices?$filter=serviceName eq 'Virtual Machines' and armSkuName eq 'Standard_D4s_v5' and priceType eq 'Reservation'
```

```bash
curl -s "https://prices.azure.com/api/retail/prices?\$filter=serviceName%20eq%20'Virtual%20Machines'%20and%20armSkuName%20eq%20'Standard_D4s_v5'%20and%20priceType%20eq%20'Reservation'"
```

```powershell
$filter = "serviceName eq 'Virtual Machines' and armSkuName eq 'Standard_D4s_v5' and priceType eq 'Reservation'"
$response = Invoke-RestMethod "https://prices.azure.com/api/retail/prices?`$filter=$filter"
$response.Items | Select-Object armSkuName, retailPrice, reservationTerm, meterName
```

### Non-USD currency

Append `currencyCode` parameter:
```http
GET https://prices.azure.com/api/retail/prices?currencyCode='EUR'&$filter=serviceName eq 'Virtual Machines' and armSkuName eq 'Standard_D4s_v5'
```

```bash
curl -s "https://prices.azure.com/api/retail/prices?currencyCode='EUR'&\$filter=serviceName%20eq%20'Virtual%20Machines'%20and%20armSkuName%20eq%20'Standard_D4s_v5'"
```

```powershell
$filter = "serviceName eq 'Virtual Machines' and armSkuName eq 'Standard_D4s_v5'"
$response = Invoke-RestMethod "https://prices.azure.com/api/retail/prices?currencyCode='EUR'&`$filter=$filter"
$response.Items | Select-Object armSkuName, retailPrice, currencyCode, meterName
```

## Available Filters

| Filter          | Example Value                    | Notes                          |
| --------------- | -------------------------------- | ------------------------------ |
| `serviceName`   | `'Virtual Machines'`             | Case-sensitive in preview API  |
| `armRegionName` | `'eastus'`, `'westeurope'`       | ARM region name                |
| `armSkuName`    | `'Standard_D4s_v5'`              | Full ARM SKU name              |
| `priceType`     | `'Consumption'`, `'Reservation'` | Pay-as-you-go vs reserved      |
| `serviceFamily` | `'Compute'`                      | Broad category                 |
| `productName`   | `'Virtual Machines Dv5 Series'`  | Product line                   |
| `meterName`     | `'D4s v5'`, `'D4s v5 Spot'`      | Includes Spot and Low Priority |

> **Warning:** Filter values are **case-sensitive** in API version `2023-01-01-preview` and later.

## Response Fields

| Field                  | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `armSkuName`           | ARM SKU name (e.g., `Standard_D4s_v5`)                             |
| `retailPrice`          | Microsoft retail price (USD unless overridden)                     |
| `unitOfMeasure`        | Usually `1 Hour` for VMs                                           |
| `armRegionName`        | Region code                                                        |
| `meterName`            | Human-readable meter (includes "Spot" / "Low Priority" variants)   |
| `productName`          | Product line with OS (e.g., "Virtual Machines Dv5 Series Windows") |
| `type`                 | `Consumption`, `Reservation`, or `DevTestConsumption`              |
| `reservationTerm`      | `1 Year` or `3 Years` (reservation only)                           |
| `savingsPlan`          | Array with `term` and `unitPrice` (preview API only)               |
| `isPrimaryMeterRegion` | Filter to `true` to avoid duplicate regional meters                |

## Pagination

API returns max 1,000 records per request. Follow `NextPageLink` in the response to get more:

```json
{ "NextPageLink": "https://prices.azure.com:443/api/retail/prices?$filter=...&$skip=1000" }
```

## Tips for Recommendations

1. **Filter Linux vs Windows**: `productName` contains the OS — e.g., `'Virtual Machines Dv5 Series'` (Linux) vs `'Virtual Machines Dv5 Series Windows'`
2. **Use `isPrimaryMeterRegion eq true`** to deduplicate
3. **Compare Consumption + Reservation + Savings Plan** for full cost picture
4. **Monthly estimate**: `retailPrice × 730` (hours/month)
5. **Spot pricing**: Filter `meterName` containing `'Spot'` for discounted interruptible VMs
