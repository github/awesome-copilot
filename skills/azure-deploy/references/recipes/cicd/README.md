# CI/CD Deploy Recipe

Deploy to Azure using automated pipelines.

## Prerequisites

- `.azure/plan.md` exists with status `Validated`
- Azure Service Principal or federated credentials configured
- Pipeline file exists (`.github/workflows/` or `azure-pipelines.yml`)

## GitHub Actions

| Example | Description |
|---------|-------------|
| [github-azd.yml](examples/github-azd.yml) | AZD deployment workflow |
| [github-bicep.yml](examples/github-bicep.yml) | Bicep infrastructure deployment |

## Azure DevOps

| Example | Description |
|---------|-------------|
| [azdo-azd.yml](examples/azdo-azd.yml) | Basic AZD pipeline |
| [azdo-multistage.yml](examples/azdo-multistage.yml) | Multi-stage with approvals |

## Setup Requirements

### GitHub Actions

1. Create Azure Service Principal with federated credentials
2. Add secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
3. Add variables: `AZURE_ENV_NAME`, `AZURE_LOCATION`
4. Create environments with protection rules

### Azure DevOps

1. Create Service Connection to Azure
2. Create Variable Groups per environment
3. Create Environments with approval gates

## References

- [Verification steps](./verify.md)
- [Error handling](./errors.md)
