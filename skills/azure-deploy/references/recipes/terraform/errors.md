# Terraform Errors

| Error | Resolution |
|-------|------------|
| State lock error | Wait or `terraform force-unlock <lock-id>` |
| Resource exists | `terraform import <resource>` |
| Backend denied | Check storage permissions |
| Provider error | `terraform init -upgrade` |

## Cleanup (DESTRUCTIVE)

```bash
terraform destroy -auto-approve
```

Selective:
```bash
terraform destroy -target=azurerm_container_app.api
```

⚠️ Permanently deletes resources.
