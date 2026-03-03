# Terraform Validation Errors

| Error | Fix |
|-------|-----|
| `Backend init failed` | Check storage account access |
| `Provider version conflict` | Update required_providers |
| `State lock failed` | Wait or force unlock |
| `Validation failed` | Check terraform validate output |

## Debug

```bash
TF_LOG=DEBUG terraform plan
```
