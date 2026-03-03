# Terraform Deploy Recipe

Deploy to Azure using Terraform.

## Prerequisites

- Terraform CLI installed
- `.azure/plan.md` exists with status `Validated`
- Terraform initialized (`terraform init`)
- Plan validated (`terraform plan`)
- **Subscription and location confirmed** → See [Pre-Deploy Checklist](../../pre-deploy-checklist.md)

## Workflow

| Step | Task | Command |
|------|------|---------|
| 1 | **[Pre-deploy checklist](../../pre-deploy-checklist.md)** | Confirm subscription/location with user |
| 2 | Select workspace | `terraform workspace select <env>` |
| 3 | Apply | `terraform apply tfplan` |
| 4 | Get outputs | `terraform output` |
| 5 | Deploy app | Service-specific commands |

## Deployment Commands

### Apply with Plan File (Recommended)

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### Auto-Approve (CI/CD)

```bash
terraform apply -auto-approve
```

### With Variables

```bash
terraform apply \
  -var="environment=prod" \
  -var="location=westus2" \
  -auto-approve
```

### Target Specific Resource

```bash
terraform apply -target=azurerm_container_app.api
```

## Get Outputs

```bash
terraform output
terraform output -json
terraform output api_url
```

## Application Deployment

After infrastructure is deployed:

```bash
ACR_NAME=$(terraform output -raw acr_name)
APP_NAME=$(terraform output -raw container_app_name)
RG_NAME=$(terraform output -raw resource_group_name)

az acr build --registry $ACR_NAME --image myapp:latest ./src/api

az containerapp update \
  --name $APP_NAME \
  --resource-group $RG_NAME \
  --image $ACR_NAME.azurecr.io/myapp:latest
```

## References

- [Verification steps](./verify.md)
- [Error handling](./errors.md)
