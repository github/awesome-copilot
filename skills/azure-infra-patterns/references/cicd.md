# CI/CD Pipeline Patterns

## Table of Contents
1. [GitHub Actions](#github-actions)
2. [Azure DevOps Pipelines](#azure-devops-pipelines)
3. [Authentication Patterns](#authentication-patterns)
4. [Deployment Strategies](#deployment-strategies)

## GitHub Actions

### Bicep Deployment Workflow
```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths: ['infra/**']
  pull_request:
    branches: [main]
    paths: ['infra/**']

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  RESOURCE_GROUP: rg-myapp-prod

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      
      - name: Validate Bicep
        run: az bicep build --file infra/main.bicep
      
      - name: What-If (PR only)
        if: github.event_name == 'pull_request'
        run: |
          az deployment group what-if \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --template-file infra/main.bicep \
            --parameters @infra/main.bicepparam

  deploy:
    needs: validate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      
      - name: Deploy
        run: |
          az deployment group create \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --template-file infra/main.bicep \
            --parameters @infra/main.bicepparam
```

### Terraform Deployment Workflow
```yaml
name: Terraform Deploy

on:
  push:
    branches: [main]
    paths: ['terraform/**']
  pull_request:
    branches: [main]
    paths: ['terraform/**']

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  TF_VERSION: '1.6.0'
  WORKING_DIR: './terraform'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
      
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      
      - name: Terraform Init
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform init
      
      - name: Terraform Validate
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform validate
      
      - name: Terraform Plan
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform plan -out=tfplan
      
      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: ${{ env.WORKING_DIR }}/tfplan

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
      
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      
      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: ${{ env.WORKING_DIR }}
      
      - name: Terraform Init
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform init
      
      - name: Terraform Apply
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform apply -auto-approve tfplan
```

## Azure DevOps Pipelines

### Bicep Pipeline
```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infra/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureServiceConnection: 'azure-prod'
  resourceGroup: 'rg-myapp-prod'

stages:
  - stage: Validate
    jobs:
      - job: ValidateBicep
        steps:
          - task: AzureCLI@2
            displayName: 'Validate Bicep'
            inputs:
              azureSubscription: $(azureServiceConnection)
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az bicep build --file infra/main.bicep
          
          - task: AzureCLI@2
            displayName: 'What-If'
            inputs:
              azureSubscription: $(azureServiceConnection)
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az deployment group what-if \
                  --resource-group $(resourceGroup) \
                  --template-file infra/main.bicep

  - stage: Deploy
    dependsOn: Validate
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployInfra
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                
                - task: AzureCLI@2
                  displayName: 'Deploy Bicep'
                  inputs:
                    azureSubscription: $(azureServiceConnection)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      az deployment group create \
                        --resource-group $(resourceGroup) \
                        --template-file infra/main.bicep
```

### Terraform Pipeline
```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - terraform/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  terraformVersion: '1.6.0'
  azureServiceConnection: 'azure-prod'
  workingDirectory: '$(System.DefaultWorkingDirectory)/terraform'

stages:
  - stage: Plan
    jobs:
      - job: TerraformPlan
        steps:
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: $(terraformVersion)
          
          - task: TerraformTaskV4@4
            displayName: 'Terraform Init'
            inputs:
              provider: 'azurerm'
              command: 'init'
              workingDirectory: $(workingDirectory)
              backendServiceArm: $(azureServiceConnection)
          
          - task: TerraformTaskV4@4
            displayName: 'Terraform Plan'
            inputs:
              provider: 'azurerm'
              command: 'plan'
              workingDirectory: $(workingDirectory)
              environmentServiceNameAzureRM: $(azureServiceConnection)
              commandOptions: '-out=tfplan'
          
          - publish: $(workingDirectory)/tfplan
            artifact: tfplan

  - stage: Apply
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: TerraformApply
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                
                - download: current
                  artifact: tfplan
                
                - task: TerraformInstaller@1
                  inputs:
                    terraformVersion: $(terraformVersion)
                
                - task: TerraformTaskV4@4
                  displayName: 'Terraform Init'
                  inputs:
                    provider: 'azurerm'
                    command: 'init'
                    workingDirectory: $(workingDirectory)
                    backendServiceArm: $(azureServiceConnection)
                
                - task: TerraformTaskV4@4
                  displayName: 'Terraform Apply'
                  inputs:
                    provider: 'azurerm'
                    command: 'apply'
                    workingDirectory: $(workingDirectory)
                    environmentServiceNameAzureRM: $(azureServiceConnection)
                    commandOptions: '$(Pipeline.Workspace)/tfplan/tfplan'
```

## Authentication Patterns

### GitHub Actions - Federated Credentials (OIDC)
```yaml
# Recommended - no secrets to manage
permissions:
  id-token: write
  contents: read

- name: Azure Login
  uses: azure/login@v2
  with:
    client-id: ${{ vars.AZURE_CLIENT_ID }}
    tenant-id: ${{ vars.AZURE_TENANT_ID }}
    subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```

### Service Principal Setup for OIDC
```bash
# Create service principal
az ad sp create-for-rbac --name "github-actions-sp" --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID

# Add federated credential
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:org/repo:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

## Deployment Strategies

### Multi-Environment Pipeline
```yaml
jobs:
  deploy-dev:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: dev
      resource-group: rg-myapp-dev
    secrets: inherit

  deploy-staging:
    needs: deploy-dev
    uses: ./.github/workflows/deploy.yml
    with:
      environment: staging
      resource-group: rg-myapp-staging
    secrets: inherit

  deploy-prod:
    needs: deploy-staging
    uses: ./.github/workflows/deploy.yml
    with:
      environment: prod
      resource-group: rg-myapp-prod
    secrets: inherit
```

### Blue-Green with Slots
```yaml
- name: Deploy to Staging Slot
  run: |
    az webapp deployment source config-zip \
      --name app-myapp \
      --resource-group rg-myapp \
      --slot staging \
      --src app.zip

- name: Verify Staging
  run: |
    curl -f https://app-myapp-staging.azurewebsites.net/health

- name: Swap Slots
  run: |
    az webapp deployment slot swap \
      --name app-myapp \
      --resource-group rg-myapp \
      --slot staging \
      --target-slot production
```
