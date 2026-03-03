# Terraform Verification

```bash
terraform output
terraform output -json
```

## Health Check

```bash
curl -s https://$(terraform output -raw api_url)/health | jq .
```

## Resource Check

```bash
az resource list --resource-group $(terraform output -raw resource_group_name) --output table
```
