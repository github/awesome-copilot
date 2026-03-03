# Azure CLI Verification

```bash
az resource list --resource-group <rg-name> --output table
```

## Health Check

```bash
curl -s https://<endpoint>/health | jq .
```

## Container Apps

```bash
az containerapp revision list \
  --name <app-name> \
  --resource-group <rg-name> \
  --query "[].{name:name, active:properties.active}" \
  --output table
```

## App Service

```bash
az webapp show \
  --name <app-name> \
  --resource-group <rg-name> \
  --query "{state:state, hostNames:hostNames}"
```
