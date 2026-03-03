# Bicep Validation Errors

| Error | Fix |
|-------|-----|
| `BCP035: Invalid type` | Check API version |
| `BCP037: Not a member` | Check resource schema |
| `BCP018: Expected character` | Fix syntax |
| `Module not found` | Check relative paths |
| `Template validation failed` | Review error details |

## Debug

```bash
az bicep build --file ./infra/main.bicep 2>&1
```
