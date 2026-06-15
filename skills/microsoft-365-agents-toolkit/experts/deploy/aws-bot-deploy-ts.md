# aws-bot-deploy-ts

## purpose

Step-by-step deployment of a Slack bot or Teams bot to AWS. Covers AWS CLI setup, IAM configuration, compute provisioning (Lambda + API Gateway / EC2 / ECS Fargate), environment configuration, and verification. Teams bots on AWS still require an Azure Bot Service registration for the Bot Framework messaging endpoint.

## rules

1. **Install prerequisites.** You need: Node.js 20 LTS, AWS CLI v2, and optionally AWS SAM CLI (`pip install aws-sam-cli`) or AWS CDK (`npm install -g aws-cdk`). Verify with `aws --version` and `node --version`. [docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
2. **Configure AWS credentials.** Run `aws configure` and enter your IAM access key, secret key, default region, and output format. For SSO-enabled organizations, use `aws sso login` instead. Verify with `aws sts get-caller-identity`. [docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
3. **Create an IAM user or role for the bot.** The bot's execution role needs permissions for: CloudWatch Logs (logging), Secrets Manager or SSM Parameter Store (credentials), and any other AWS services it accesses. Use least-privilege — don't give the bot AdministratorAccess. [docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
4. **Create a Slack API app at api.slack.com.** Under "OAuth & Permissions", install the app to your workspace and copy the Bot User OAuth Token (`xoxb-...`). Under "Basic Information", copy the Signing Secret. For Socket Mode, also create an App-Level Token (`xapp-...`). [api.slack.com/authentication/basics](https://api.slack.com/authentication/basics)
5. **Choose your compute target.** Lambda + API Gateway (serverless, event-driven — best for HTTP-mode Slack bots), EC2 or Elastic Beanstalk (always-on — required for Socket Mode, good for Teams bots), or ECS Fargate (containerized, production-grade). [docs.aws.amazon.com/lambda/latest/dg/welcome.html](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
6. **For Lambda: use SAM or CDK to define the stack.** A SAM template defines the Lambda function + API Gateway in YAML. `sam build && sam deploy --guided` handles packaging, uploading, and CloudFormation stack creation. [docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
7. **For Lambda: handle the Slack 3-second ack deadline.** Lambda cold starts can take 1-5 seconds. Use provisioned concurrency (`ProvisionedConcurrencyConfig` in SAM) to keep warm instances, or use the async pattern: immediately return 200 to ack, then process via SQS + a second Lambda. [docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
8. **Socket Mode cannot run on Lambda.** Socket Mode requires a persistent WebSocket connection — Lambda functions are ephemeral. Use EC2, Elastic Beanstalk, or ECS Fargate for Socket Mode bots. HTTP-mode Slack bots work fine on Lambda.
9. **Store secrets in Secrets Manager or SSM Parameter Store.** Never put `SLACK_BOT_TOKEN` or `CLIENT_SECRET` in Lambda environment variables in plaintext for production. Use the SDK to fetch secrets at runtime: `const client = new SecretsManagerClient({}); const secret = await client.send(new GetSecretValueCommand({ SecretId: "bot/slack" }))`. [docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
10. **For Teams bots on AWS: you still need Azure Bot Service.** Register an App Registration in Entra ID (Azure AD), create a Bot Service resource, and set the messaging endpoint to your AWS URL (e.g., `https://<api-id>.execute-api.<region>.amazonaws.com/api/messages`). Configure `MicrosoftAppId` and `MicrosoftAppPassword` in your AWS environment. [learn.microsoft.com/azure/bot-service/bot-service-quickstart-registration](https://learn.microsoft.com/azure/bot-service/bot-service-quickstart-registration)
11. **Configure Slack app URLs after deployment.** Once your API Gateway or EC2 instance is live, set the Event Subscriptions Request URL and Interactivity URL in the Slack app dashboard to your endpoint (e.g., `https://<api-id>.execute-api.<region>.amazonaws.com/slack/events`). Slack sends a verification challenge immediately — the app must be running.
12. **Set up CloudWatch alarms for error monitoring.** Create alarms for Lambda errors (`Errors` metric > 0), API Gateway 5xx responses, and invocation duration. Use `aws cloudwatch put-metric-alarm` or define them in your SAM/CDK template. [docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)

## interview

### Q1 — Compute Target
```
question: "Which AWS compute target do you want to deploy to?"
header: "Compute"
options:
  - label: "Lambda + API Gateway (Recommended)"
    description: "Serverless, pay-per-invocation. Best for HTTP-mode Slack bots. Cannot use Socket Mode."
  - label: "EC2 / Elastic Beanstalk"
    description: "Always-on VM. Supports Socket Mode, good for Teams bots. ~$8/month for t3.micro."
  - label: "ECS / Fargate"
    description: "Containerized, production-grade. Auto-scaling, no server management. Good for high-traffic bots."
  - label: "You Decide Everything"
    description: "Use Lambda + API Gateway (recommended default) and skip remaining questions."
multiSelect: false
```

### Q2 — Infrastructure as Code
```
question: "How do you want to define your infrastructure?"
header: "IaC"
options:
  - label: "AWS SAM (Recommended)"
    description: "YAML templates for Lambda + API Gateway. sam build && sam deploy — simple and well-documented."
  - label: "AWS CDK"
    description: "Define infrastructure in TypeScript. Full AWS resource control. More flexible but more setup."
  - label: "Manual CLI"
    description: "Step-by-step aws CLI commands. Learn exactly what resources are created."
  - label: "You Decide Everything"
    description: "Use AWS SAM (recommended default) and skip remaining questions."
multiSelect: false
```

### defaults table

| Question | Default |
|---|---|
| Q1 | Lambda + API Gateway |
| Q2 | AWS SAM |

## patterns

### Slack bot on Lambda with SAM

```yaml
# template.yaml (SAM template)
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Slack bot on Lambda

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs20.x
    MemorySize: 256

Resources:
  SlackBotFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: dist/lambda.handler
      CodeUri: .
      Events:
        SlackEvents:
          Type: HttpApi
          Properties:
            Path: /slack/events
            Method: POST
      Environment:
        Variables:
          SLACK_SECRET_NAME: bot/slack  # reference, not the actual secret
      Policies:
        - SecretsManagerReadWrite

Outputs:
  SlackEndpoint:
    Description: "URL for Slack Event Subscriptions"
    Value: !Sub "https://${ServerlessHttpApi}.execute-api.${AWS::Region}.amazonaws.com/slack/events"
```

```bash
# Deploy the SAM stack
sam build
sam deploy --guided \
  --stack-name slack-bot \
  --capabilities CAPABILITY_IAM \
  --resolve-s3

# Output shows the API Gateway URL — use it as Slack Request URL
```

```typescript
// src/lambda.ts — Lambda handler wrapping Bolt
import { App, AwsLambdaReceiver } from "@slack/bolt";

const awsReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  receiver: awsReceiver,
});

app.message("hello", async ({ say }) => {
  await say("Hi from Lambda!");
});

export const handler = async (event: any, context: any, callback: any) => {
  const handler = await awsReceiver.start();
  return handler(event, context, callback);
};
```

### Slack bot on EC2 with Elastic Beanstalk

```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize the project
eb init slack-bot --platform "Node.js 20" --region us-east-1

# 3. Create the environment
eb create slack-bot-env --single --instance-types t3.micro

# 4. Set environment variables
eb setenv \
  SLACK_BOT_TOKEN=xoxb-your-token \
  SLACK_SIGNING_SECRET=your-signing-secret \
  SLACK_APP_TOKEN=xapp-your-app-token \
  PORT=8080

# 5. Deploy
eb deploy

# 6. Get the URL
eb status  # shows CNAME: slack-bot-env.us-east-1.elasticbeanstalk.com

# Configure Slack Request URL:
#   https://slack-bot-env.us-east-1.elasticbeanstalk.com/slack/events
```

### Teams bot on AWS (Lambda + Azure Bot Service)

```bash
# Step 1: Deploy to AWS (same as Slack bot SAM pattern, but different routes)
# In template.yaml, use Path: /api/messages instead of /slack/events

# Step 2: Register in Azure (required for Teams)
az login
APP_ID=$(az ad app create --display-name "MyBot-AWS" --query appId -o tsv)
APP_SECRET=$(az ad app credential reset --id $APP_ID --query password -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

az bot create \
  --resource-group rg-mybot \
  --name mybot-aws \
  --app-type SingleTenant \
  --appid $APP_ID \
  --tenant-id $TENANT_ID

az bot msteams create --resource-group rg-mybot --name mybot-aws

# Step 3: Set the messaging endpoint to your AWS URL
API_URL="https://abc123.execute-api.us-east-1.amazonaws.com/api/messages"
az bot update --resource-group rg-mybot --name mybot-aws --endpoint $API_URL

# Step 4: Add Azure credentials to AWS Lambda environment
aws lambda update-function-configuration \
  --function-name MyTeamsBot \
  --environment "Variables={MicrosoftAppId=$APP_ID,MicrosoftAppPassword=$APP_SECRET,MicrosoftAppTenantId=$TENANT_ID}"
```

### Socket Mode on EC2 (long-running process)

```bash
# Socket Mode requires a persistent WebSocket — use EC2 or ECS, not Lambda

# 1. Launch an EC2 instance (Amazon Linux 2023, t3.micro)
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-xxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=slack-bot}]'

# 2. SSH in and install Node.js
ssh -i my-key.pem ec2-user@<public-ip>
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 3. Clone, install, build
git clone https://github.com/your-org/your-bot.git
cd your-bot && npm install && npm run build

# 4. Set environment variables
export SLACK_BOT_TOKEN=xoxb-your-token
export SLACK_APP_TOKEN=xapp-your-app-token
export SLACK_SIGNING_SECRET=your-signing-secret

# 5. Run with PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name slack-bot
pm2 save
pm2 startup  # auto-restart on reboot
```

## pitfalls

- **Lambda cold starts causing Slack ack timeout.** Node.js Lambda cold starts take 1-5 seconds. If your handler does any work before calling `ack()`, you'll exceed the 3-second Slack deadline. Use provisioned concurrency, or ack immediately and process asynchronously.
- **Socket Mode on Lambda.** Socket Mode requires a persistent WebSocket connection. Lambda functions are ephemeral — they spin down after the request completes. Use EC2, Elastic Beanstalk, or ECS Fargate for Socket Mode.
- **Forgetting Azure Bot Service for Teams bots.** Even though your bot runs on AWS, Teams bots require an Azure Bot Service resource with the messaging endpoint pointing to your AWS URL. Without it, Teams cannot discover or route messages to your bot.
- **API Gateway default timeout.** API Gateway has a 29-second integration timeout. For most bot handlers this is fine, but long-running AI inference calls may exceed it. Use async invocation patterns for heavy processing.
- **Lambda function URL vs API Gateway.** Function URLs are simpler (no API Gateway needed) but lack WAF, throttling, and custom domain support. Use API Gateway for production bots that need rate limiting or custom domains.
- **Missing IAM permissions for Secrets Manager.** If your Lambda execution role doesn't include `secretsmanager:GetSecretValue`, the bot crashes when trying to fetch credentials. Add the policy to the SAM template or IAM role.
- **Elastic Beanstalk port mismatch.** EB expects your app to listen on port 8080 by default (configurable). If your bot hardcodes port 3000, the health check fails and EB marks the instance unhealthy. Always use `process.env.PORT`.

## references

- https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html
- https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
- https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_nodejs.html
- https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html
- https://api.slack.com/authentication/basics
- https://slack.dev/bolt-js/deployments/aws-lambda
- https://learn.microsoft.com/azure/bot-service/bot-service-quickstart-registration

## instructions

This expert walks through deploying a bot to AWS from scratch — from installing the CLI to verifying a test message. Use it when a developer says "deploy my bot to AWS", "set up Lambda hosting", or "get my bot running on AWS". Covers Slack bots (Lambda or EC2), Teams bots (requires Azure Bot Service + AWS hosting), and Socket Mode considerations.

Pair with: `../slack/runtime.bolt-foundations-ts.md` (Bolt app setup for receiver selection), `../slack/bolt-oauth-distribution-ts.md` (OAuth for multi-workspace Slack apps), `../security/secrets-ts.md` (secrets best practices), `../bridge/infra-compute-ts.md` (if comparing AWS compute options with Azure equivalents), `azure-bot-deploy-ts.md` (if also needing Azure Bot Service for Teams).

## research

Deep Research prompt:

"Write a micro expert on deploying a Slack Bolt.js or Microsoft Teams bot to AWS. Cover: AWS CLI v2 installation, aws configure / aws sso login, IAM role creation for bot execution, Lambda + API Gateway deployment with SAM (template.yaml, sam build, sam deploy), AwsLambdaReceiver from @slack/bolt, EC2 deployment with PM2 for Socket Mode, Elastic Beanstalk for managed EC2, ECS Fargate for containerized bots, Secrets Manager for credential storage, CloudWatch alarms for error monitoring, provisioned concurrency for cold start mitigation, Teams-on-AWS pattern (Azure Bot Service pointing to AWS endpoint), and Slack app URL configuration. Provide 3-4 canonical deployment examples and 5-7 common pitfalls."
