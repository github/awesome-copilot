# AZCLI Validation Errors

| Error | Fix |
|-------|-----|
| `AADSTS700082: Token expired` | `az login` |
| `Please run 'az login'` | `az login` |
| `AADSTS50076: MFA required` | `az login --use-device-code` |
| `AuthorizationFailed` | Request Contributor role |
| `Template validation failed` | Check Bicep syntax |

## Debug

```bash
az <command> --verbose --debug
```
