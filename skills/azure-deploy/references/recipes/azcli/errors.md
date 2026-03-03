# Azure CLI Errors

| Error | Resolution |
|-------|------------|
| Not authenticated | `az login` |
| Subscription not found | `az account list` |
| Deployment failed | `az deployment sub show --name <name>` |
| Template error | `az deployment sub validate` |
| Permission denied | Verify RBAC roles |
| Quota exceeded | Request increase or change region |

## Cleanup (DESTRUCTIVE)

```bash
az group delete --name <rg-name> --yes
```

⚠️ Permanently deletes ALL resources in the group.
