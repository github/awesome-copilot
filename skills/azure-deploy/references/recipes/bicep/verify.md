# Bicep Verification

```bash
az resource list --resource-group <rg-name> --output table
```

## Get Deployment Outputs

```bash
az deployment sub show \
  --name main \
  --query properties.outputs
```

## Health Check

```bash
curl -s https://<endpoint>/health | jq .
```
