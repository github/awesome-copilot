# AZD Validation Errors

## Pre-Deployment Errors

These errors can be caught **before** running `azd up`:

| Error | Cause | Resolution |
|-------|-------|------------|
| `Please run 'az login'` | Not authenticated | `az login` or `azd auth login` |
| `No environment selected` | Missing azd environment | `azd env select <name>` or `azd env new <name>` |
| `no default response for prompt 'Enter a unique environment name'` | No azd environment created, or missing `-e` flag | Run `azd env new <name>` OR use `azd init --from-code -e <name>` with the `-e` flag |
| `no default response for prompt 'Enter a value for the 'environmentName'` | Environment variables not set | Run `azd env set AZURE_ENV_NAME <name>` |
| `Service not found` | Service name mismatch | Check service name in azure.yaml |
| `Invalid azure.yaml` | YAML syntax error | Fix YAML syntax |
| `Project path does not exist` | Wrong service project path | Fix service project path in azure.yaml |
| `Cannot connect to Docker daemon` | Docker not running | Start Docker Desktop |
| `Could not find a part of the path 'infra\main.bicep'` | Missing infrastructure files | Generate infra/ folder before `azd up` |
| `Invalid resource group location '<loc>'. The Resource group already exists in location '<other>'` | RG exists in different region | Check RG location first with `az group show`, use that region or new env name |
| `expecting only '1' resource tagged with 'azd-service-name: web', but found '2'` | Multiple resources with same tag **in the same RG** | Delete duplicate or rename service |

## Static Web App Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `language 'html' is not supported` | Invalid language value | Omit `language` for pure static sites |
| `language 'static' is not supported` | Invalid language value | Omit `language` for pure static sites |
| `dist folder not found` | Wrong dist path or missing build | Check `dist` is relative to `project`; add `language: js` if build needed |
| `LocationNotAvailableForResourceType` | SWA not in region | See [Region Availability](../../region-availability.md) for valid regions |

## SWA Path Validation

Before deployment, verify:
1. `project` path exists and contains source files
2. For framework apps: `language: js` is set
3. `dist` is relative to `project` (not project root)
4. Bicep has `azd-service-name` tag matching service name

## Debug

```bash
azd <command> --debug
```
