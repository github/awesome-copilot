# deploy-router

## purpose

Route deployment tasks to the correct cloud-specific expert. Handles the initial cloud provider interview, then loads the matching micro-expert for step-by-step provisioning and deployment.

## interview

### Q1 — Cloud Provider
```
question: "Which cloud provider are you deploying to?"
header: "Cloud"
options:
  - label: "Azure (Recommended)"
    description: "Deploy to Azure App Service, Functions, or Container Apps. Required for Teams bots (Bot Framework registration lives in Azure). Also works for Slack bots."
  - label: "AWS"
    description: "Deploy to AWS Lambda, EC2, or ECS/Fargate. Native choice for Slack bots. Teams bots on AWS still require an Azure Bot Service registration."
  - label: "You Decide Everything"
    description: "Accept recommended defaults for all decisions and skip remaining questions."
multiSelect: false
```

### Q2 — Bot Platform
```
question: "Which bot platform are you deploying?"
header: "Platform"
options:
  - label: "Teams bot"
    description: "Microsoft Teams bot using Teams SDK / Bot Framework. Requires Azure Bot Service registration regardless of hosting cloud."
  - label: "Slack bot"
    description: "Slack app using @slack/bolt. Requires Slack API app configuration."
  - label: "Both (dual bot)"
    description: "Single server hosting both Slack and Teams bots. Deploy once, configure both platforms."
  - label: "You Decide Everything"
    description: "Accept recommended defaults for all decisions and skip remaining questions."
multiSelect: false
```

### defaults table

| Question | Default |
|---|---|
| Q1 | Azure |
| Q2 | Teams bot |

## task clusters

### Deploy to Azure
When: deploying a bot to Azure, Azure App Service, Azure Functions, Azure Container Apps, `az` CLI, `az login`, Azure Bot registration, App Registration, Entra ID, `atk provision`, `atk deploy`, Agents Toolkit deploy, deploy Teams bot, deploy Slack bot to Azure
Read:
- `azure-bot-deploy-ts.md`
Cross-domain deps: `../teams/project.scaffold-files-ts.md` (project structure), `../teams/runtime.manifest-ts.md` (Teams manifest for sideloading), `../teams/dev.debug-test-ts.md` (Agents Toolkit reference), `../security/secrets-ts.md` (secrets hygiene), `../bridge/infra-compute-ts.md` (if also migrating from AWS)
Note: For Agents Toolkit automated deployment (alternative to manual Azure CLI), see `../teams/toolkit.lifecycle-cli.md`.

### Azure CLI Reference
When: looking up Azure CLI commands, "what az commands do I need", az bot commands, az cognitiveservices commands, az ad app commands, az webapp commands, az containerapp commands, az keyvault commands, Azure CLI CRUD reference, list all az commands for bots
Read:
- `azure-cli-reference-ts.md`
Cross-domain deps: `azure-bot-deploy-ts.md` (step-by-step deployment), `../security/secrets-ts.md` (secrets hygiene)

### Deploy to AWS
When: deploying a bot to AWS, Lambda, EC2, ECS, Elastic Beanstalk, Fargate, AWS CLI, `aws configure`, API Gateway, CloudFormation, SAM, CDK, deploy Slack bot to AWS
Read:
- `aws-bot-deploy-ts.md`
Cross-domain deps: `../slack/bolt-oauth-distribution-ts.md` (Slack OAuth for multi-workspace), `../security/secrets-ts.md` (secrets hygiene), `../bridge/infra-compute-ts.md` (if also deploying to Azure)

### AWS CLI Reference
When: looking up AWS CLI commands, "what aws commands do I need", aws lambda commands, aws ecs commands, aws bedrock commands, aws iam commands, aws secretsmanager commands, aws dynamodb commands, aws sqs commands, AWS CLI CRUD reference, list all aws commands for bots, Bedrock agents, Lex bots
Read:
- `aws-cli-reference-ts.md`
Cross-domain deps: `aws-bot-deploy-ts.md` (step-by-step deployment), `../security/secrets-ts.md` (secrets hygiene)

### Deploy Both (Dual Bot)
When: deploying a dual-platform bot to the cloud, deploy to both Azure and AWS, single server deployment for both Slack and Teams
Read:
- `azure-bot-deploy-ts.md`
- `aws-bot-deploy-ts.md`
Cross-domain deps: `../bridge/cross-platform-architecture-ts.md` (shared Express architecture)

## combining rule

If deploying a **dual bot** (Slack + Teams), read both cloud experts. The **Azure expert always applies for Teams bots** even when primary hosting is AWS — Bot Service registration is Azure-only.

If deploying a **Slack-only bot**, either cloud works independently.

## file inventory

`aws-bot-deploy-ts.md` | `aws-cli-reference-ts.md` | `azure-bot-deploy-ts.md` | `azure-cli-reference-ts.md`

<!-- Created 2026-02-28: Deploy domain with cloud provider interview, Azure and AWS deployment experts -->
<!-- Updated 2026-03-01: Added cross-reference to teams/toolkit.lifecycle-cli.md as Agents Toolkit alternative to manual Azure deployment -->
