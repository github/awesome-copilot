# aws-cli-reference-ts

## purpose

Comprehensive reference of all AWS CLI (`aws`) command groups a developer needs for creating, reading, updating, and deleting resources in a bot or AI agent project on AWS. Use as a lookup companion to `aws-bot-deploy-ts.md` (step-by-step deployment) — this file maps every relevant CLI surface so you know what commands exist.

## rules

1. **This is a reference, not a tutorial.** For step-by-step deployment walkthroughs, see `aws-bot-deploy-ts.md`. This file catalogs every `aws` command group relevant to bot/agent projects.
2. **Always authenticate first.** Every command below assumes you have run `aws configure` (or `aws sso login`) and verified with `aws sts get-caller-identity`. [docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
3. **Region matters.** Most commands operate in your configured default region. Override per-command with `--region <region>`, or set globally with `export AWS_DEFAULT_REGION=us-east-1`.

---

## 1. IAM (`aws iam`) — Identity & Access Management

Every bot needs an execution role with least-privilege permissions.

### Roles

| Command | Purpose |
|---|---|
| `aws iam create-role --role-name <name> --assume-role-policy-document file://trust.json` | Create execution role for Lambda/ECS/EC2 bot |
| `aws iam get-role --role-name <name>` | Read role details including ARN |
| `aws iam list-roles` | List all roles |
| `aws iam update-role --role-name <name> --max-session-duration 7200` | Update role session duration |
| `aws iam update-assume-role-policy --role-name <name> --policy-document file://trust.json` | Update who can assume the role |
| `aws iam delete-role --role-name <name>` | Delete a role (must detach policies first) |

### Policies

| Command | Purpose |
|---|---|
| `aws iam create-policy --policy-name <name> --policy-document file://policy.json` | Create custom policy for bot permissions |
| `aws iam get-policy --policy-arn <arn>` | Read policy metadata |
| `aws iam get-policy-version --policy-arn <arn> --version-id v1` | Read actual policy document |
| `aws iam list-policies --scope Local` | List custom policies |
| `aws iam create-policy-version --policy-arn <arn> --policy-document file://policy.json --set-as-default` | Update policy (creates new version) |
| `aws iam delete-policy --policy-arn <arn>` | Delete policy |

### Attach/Detach Policies to Roles

| Command | Purpose |
|---|---|
| `aws iam attach-role-policy --role-name <name> --policy-arn <arn>` | Attach managed policy to role |
| `aws iam list-attached-role-policies --role-name <name>` | List policies on a role |
| `aws iam detach-role-policy --role-name <name> --policy-arn <arn>` | Remove policy from role |
| `aws iam put-role-policy --role-name <name> --policy-name <name> --policy-document file://policy.json` | Attach inline policy |
| `aws iam delete-role-policy --role-name <name> --policy-name <name>` | Delete inline policy |

### Instance Profiles (for EC2 bots)

| Command | Purpose |
|---|---|
| `aws iam create-instance-profile --instance-profile-name <name>` | Create instance profile for EC2 |
| `aws iam add-role-to-instance-profile --instance-profile-name <name> --role-name <name>` | Link role to instance profile |
| `aws iam remove-role-from-instance-profile --instance-profile-name <name> --role-name <name>` | Unlink role |
| `aws iam delete-instance-profile --instance-profile-name <name>` | Delete instance profile |

Reference: [docs.aws.amazon.com/cli/latest/reference/iam](https://docs.aws.amazon.com/cli/latest/reference/iam)

---

## 2. Lambda (`aws lambda`) — Serverless Bot Hosting

### Functions

| Command | Purpose |
|---|---|
| `aws lambda create-function --function-name <name> --runtime nodejs20.x --role <arn> --handler index.handler --zip-file fileb://function.zip` | Create bot function |
| `aws lambda get-function --function-name <name>` | Read function config and code location |
| `aws lambda get-function-configuration --function-name <name>` | Read runtime config only |
| `aws lambda list-functions` | List all functions |
| `aws lambda update-function-code --function-name <name> --zip-file fileb://function.zip` | Deploy new bot code |
| `aws lambda update-function-code --function-name <name> --image-uri <ecr-uri>` | Deploy from container image |
| `aws lambda update-function-configuration --function-name <name> --timeout 30 --memory-size 256 --environment "Variables={KEY=value}"` | Update runtime settings |
| `aws lambda delete-function --function-name <name>` | Delete function |

### Invocation & Testing

| Command | Purpose |
|---|---|
| `aws lambda invoke --function-name <name> --payload file://event.json output.json` | Invoke synchronously (test) |
| `aws lambda invoke --function-name <name> --invocation-type Event --payload file://event.json output.json` | Invoke async (fire-and-forget) |

### Event Source Mappings (SQS trigger for async bot processing)

| Command | Purpose |
|---|---|
| `aws lambda create-event-source-mapping --function-name <name> --event-source-arn <sqs-arn> --batch-size 10` | Connect SQS queue to Lambda |
| `aws lambda list-event-source-mappings --function-name <name>` | List triggers |
| `aws lambda update-event-source-mapping --uuid <id> --batch-size 5` | Update trigger |
| `aws lambda delete-event-source-mapping --uuid <id>` | Remove trigger |

### Permissions (resource-based policy)

| Command | Purpose |
|---|---|
| `aws lambda add-permission --function-name <name> --statement-id apigateway --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn <api-arn>` | Allow API Gateway to invoke |
| `aws lambda get-policy --function-name <name>` | Read resource policy |
| `aws lambda remove-permission --function-name <name> --statement-id apigateway` | Revoke permission |

### Aliases & Versions (deployment strategy)

| Command | Purpose |
|---|---|
| `aws lambda publish-version --function-name <name>` | Publish immutable version |
| `aws lambda create-alias --function-name <name> --name prod --function-version 3` | Create alias pointing to version |
| `aws lambda update-alias --function-name <name> --name prod --function-version 4` | Shift alias to new version |
| `aws lambda delete-alias --function-name <name> --name prod` | Delete alias |

### Function URL (alternative to API Gateway)

| Command | Purpose |
|---|---|
| `aws lambda create-function-url-config --function-name <name> --auth-type NONE` | Create public HTTPS endpoint |
| `aws lambda get-function-url-config --function-name <name>` | Read URL config |
| `aws lambda update-function-url-config --function-name <name> --auth-type AWS_IAM` | Update auth type |
| `aws lambda delete-function-url-config --function-name <name>` | Delete URL endpoint |

### Layers

| Command | Purpose |
|---|---|
| `aws lambda publish-layer-version --layer-name <name> --zip-file fileb://layer.zip --compatible-runtimes nodejs20.x` | Publish shared dependency layer |
| `aws lambda list-layers` | List available layers |
| `aws lambda delete-layer-version --layer-name <name> --version-number 1` | Delete layer version |

Reference: [docs.aws.amazon.com/cli/latest/reference/lambda](https://docs.aws.amazon.com/cli/latest/reference/lambda)

---

## 3. API Gateway — HTTP Endpoints for Bots

### HTTP API (`aws apigatewayv2`) — Recommended for bot webhooks

| Command | Purpose |
|---|---|
| `aws apigatewayv2 create-api --name <name> --protocol-type HTTP` | Create HTTP API |
| `aws apigatewayv2 get-api --api-id <id>` | Read API details |
| `aws apigatewayv2 get-apis` | List APIs |
| `aws apigatewayv2 update-api --api-id <id> --name <new-name>` | Update API |
| `aws apigatewayv2 delete-api --api-id <id>` | Delete API |

### Integrations

| Command | Purpose |
|---|---|
| `aws apigatewayv2 create-integration --api-id <id> --integration-type AWS_PROXY --integration-uri <lambda-arn> --payload-format-version 2.0` | Connect Lambda backend |
| `aws apigatewayv2 get-integration --api-id <id> --integration-id <id>` | Read integration |
| `aws apigatewayv2 update-integration --api-id <id> --integration-id <id> --timeout-in-millis 10000` | Update integration |
| `aws apigatewayv2 delete-integration --api-id <id> --integration-id <id>` | Remove integration |

### Routes

| Command | Purpose |
|---|---|
| `aws apigatewayv2 create-route --api-id <id> --route-key "POST /slack/events" --target integrations/<integration-id>` | Create route for Slack events |
| `aws apigatewayv2 get-routes --api-id <id>` | List routes |
| `aws apigatewayv2 update-route --api-id <id> --route-id <id> --route-key "POST /slack/interactions"` | Update route |
| `aws apigatewayv2 delete-route --api-id <id> --route-id <id>` | Delete route |

### Stages & Deployment

| Command | Purpose |
|---|---|
| `aws apigatewayv2 create-stage --api-id <id> --stage-name prod --auto-deploy` | Create stage with auto-deploy |
| `aws apigatewayv2 get-stages --api-id <id>` | List stages |
| `aws apigatewayv2 update-stage --api-id <id> --stage-name prod --stage-variables env=production` | Update stage variables |
| `aws apigatewayv2 delete-stage --api-id <id> --stage-name prod` | Delete stage |

### Custom Domain

| Command | Purpose |
|---|---|
| `aws apigatewayv2 create-domain-name --domain-name bot.example.com --domain-name-configurations CertificateArn=<acm-arn>` | Map custom domain |
| `aws apigatewayv2 create-api-mapping --api-id <id> --domain-name bot.example.com --stage prod` | Map domain to stage |
| `aws apigatewayv2 delete-domain-name --domain-name bot.example.com` | Remove custom domain |

### REST API (`aws apigateway`) — When you need request validation, API keys, usage plans

| Command | Purpose |
|---|---|
| `aws apigateway create-rest-api --name <name> --endpoint-configuration types=REGIONAL` | Create REST API |
| `aws apigateway get-rest-api --rest-api-id <id>` | Read API |
| `aws apigateway get-rest-apis` | List REST APIs |
| `aws apigateway delete-rest-api --rest-api-id <id>` | Delete API |
| `aws apigateway get-resources --rest-api-id <id>` | List resources/paths |
| `aws apigateway create-resource --rest-api-id <id> --parent-id <root-id> --path-part slack` | Create path segment |
| `aws apigateway put-method --rest-api-id <id> --resource-id <id> --http-method POST --authorization-type NONE` | Create method |
| `aws apigateway put-integration --rest-api-id <id> --resource-id <id> --http-method POST --type AWS_PROXY --integration-http-method POST --uri <lambda-invoke-arn>` | Connect to Lambda |
| `aws apigateway create-deployment --rest-api-id <id> --stage-name prod` | Deploy changes |

Reference: [docs.aws.amazon.com/cli/latest/reference/apigatewayv2](https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2)

---

## 4. EC2 (`aws ec2`) — VM Hosting for Socket Mode Bots

### Instances

| Command | Purpose |
|---|---|
| `aws ec2 run-instances --image-id <ami> --instance-type t3.micro --key-name <key> --security-group-ids <sg-id> --subnet-id <subnet-id> --iam-instance-profile Name=<profile> --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=slack-bot}]"` | Launch bot instance |
| `aws ec2 describe-instances --filters "Name=tag:Name,Values=slack-bot"` | Find bot instances |
| `aws ec2 describe-instance-status --instance-ids <id>` | Check instance health |
| `aws ec2 start-instances --instance-ids <id>` | Start stopped instance |
| `aws ec2 stop-instances --instance-ids <id>` | Stop instance (preserve state) |
| `aws ec2 reboot-instances --instance-ids <id>` | Reboot instance |
| `aws ec2 terminate-instances --instance-ids <id>` | Delete instance permanently |

### Key Pairs (SSH access)

| Command | Purpose |
|---|---|
| `aws ec2 create-key-pair --key-name <name> --query "KeyMaterial" --output text > key.pem` | Create SSH key pair |
| `aws ec2 describe-key-pairs` | List key pairs |
| `aws ec2 delete-key-pair --key-name <name>` | Delete key pair |

### Security Groups (firewall)

| Command | Purpose |
|---|---|
| `aws ec2 create-security-group --group-name bot-sg --description "Bot security group" --vpc-id <vpc-id>` | Create security group |
| `aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 443 --cidr 0.0.0.0/0` | Allow inbound HTTPS |
| `aws ec2 describe-security-groups --group-ids <sg-id>` | Read rules |
| `aws ec2 revoke-security-group-ingress --group-id <sg-id> --protocol tcp --port 22 --cidr 0.0.0.0/0` | Remove inbound rule |
| `aws ec2 delete-security-group --group-id <sg-id>` | Delete security group |

### VPC Basics

| Command | Purpose |
|---|---|
| `aws ec2 describe-vpcs` | List VPCs |
| `aws ec2 describe-subnets --filters "Name=vpc-id,Values=<vpc-id>"` | List subnets in VPC |

### AMI (machine images)

| Command | Purpose |
|---|---|
| `aws ec2 describe-images --owners amazon --filters "Name=name,Values=al2023-ami-*-x86_64"` | Find Amazon Linux AMI |
| `aws ec2 create-image --instance-id <id> --name "bot-snapshot"` | Create AMI from running instance |

Reference: [docs.aws.amazon.com/cli/latest/reference/ec2](https://docs.aws.amazon.com/cli/latest/reference/ec2)

---

## 5. ECS (`aws ecs`) — Containerized Bot Hosting

### Clusters

| Command | Purpose |
|---|---|
| `aws ecs create-cluster --cluster-name <name> --capacity-providers FARGATE --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1` | Create Fargate cluster |
| `aws ecs describe-clusters --clusters <name>` | Read cluster details |
| `aws ecs list-clusters` | List clusters |
| `aws ecs delete-cluster --cluster <name>` | Delete cluster (must be empty) |

### Task Definitions (container blueprint)

| Command | Purpose |
|---|---|
| `aws ecs register-task-definition --cli-input-json file://task-def.json` | Create/update task definition |
| `aws ecs describe-task-definition --task-definition <name>` | Read latest task def |
| `aws ecs describe-task-definition --task-definition <name>:<revision>` | Read specific revision |
| `aws ecs list-task-definitions --family-prefix <name>` | List revisions |
| `aws ecs deregister-task-definition --task-definition <name>:<revision>` | Deactivate revision |

### Services (long-running bot)

| Command | Purpose |
|---|---|
| `aws ecs create-service --cluster <name> --service-name <name> --task-definition <name> --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[<subnet>],securityGroups=[<sg>],assignPublicIp=ENABLED}"` | Create service |
| `aws ecs describe-services --cluster <name> --services <name>` | Read service status |
| `aws ecs list-services --cluster <name>` | List services |
| `aws ecs update-service --cluster <name> --service <name> --desired-count 2` | Scale service |
| `aws ecs update-service --cluster <name> --service <name> --task-definition <name>:<new-rev> --force-new-deployment` | Deploy new version |
| `aws ecs delete-service --cluster <name> --service <name> --force` | Delete service |

### Tasks (individual containers)

| Command | Purpose |
|---|---|
| `aws ecs run-task --cluster <name> --task-definition <name> --launch-type FARGATE --network-configuration "awsvpcConfiguration={...}"` | Run one-off task |
| `aws ecs list-tasks --cluster <name> --service-name <name>` | List running tasks |
| `aws ecs describe-tasks --cluster <name> --tasks <task-arn>` | Read task details |
| `aws ecs stop-task --cluster <name> --task <task-arn> --reason "manual stop"` | Stop a running task |
| `aws ecs execute-command --cluster <name> --task <task-arn> --container <name> --interactive --command "/bin/sh"` | Exec into running container |

Reference: [docs.aws.amazon.com/cli/latest/reference/ecs](https://docs.aws.amazon.com/cli/latest/reference/ecs)

---

## 6. Elastic Beanstalk (`aws elasticbeanstalk`) — Managed Hosting

| Command | Purpose |
|---|---|
| `aws elasticbeanstalk create-application --application-name <name>` | Create application |
| `aws elasticbeanstalk describe-applications --application-names <name>` | Read application |
| `aws elasticbeanstalk update-application --application-name <name> --description "Slack bot"` | Update application |
| `aws elasticbeanstalk delete-application --application-name <name> --terminate-env-by-force` | Delete application |
| `aws elasticbeanstalk create-application-version --application-name <name> --version-label v1 --source-bundle S3Bucket=<bucket>,S3Key=<key>` | Upload version |
| `aws elasticbeanstalk create-environment --application-name <name> --environment-name prod --solution-stack-name "64bit Amazon Linux 2023 v6.1.0 running Node.js 20" --option-settings file://options.json` | Create environment |
| `aws elasticbeanstalk describe-environments --application-name <name>` | Read environment status |
| `aws elasticbeanstalk update-environment --environment-name <name> --version-label v2` | Deploy new version |
| `aws elasticbeanstalk terminate-environment --environment-name <name>` | Delete environment |
| `aws elasticbeanstalk list-platform-versions --filters "Type=PlatformName,Operator=contains,Values=Node.js"` | Find supported platforms |

Reference: [docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk](https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk)

---

## 7. App Runner (`aws apprunner`) — Simplified Container Hosting

| Command | Purpose |
|---|---|
| `aws apprunner create-service --service-name <name> --source-configuration file://source-config.json` | Create service from ECR image or GitHub |
| `aws apprunner describe-service --service-arn <arn>` | Read service details and URL |
| `aws apprunner list-services` | List services |
| `aws apprunner update-service --service-arn <arn> --source-configuration file://source-config.json` | Update source/config |
| `aws apprunner delete-service --service-arn <arn>` | Delete service |
| `aws apprunner start-deployment --service-arn <arn>` | Trigger manual deployment |
| `aws apprunner pause-service --service-arn <arn>` | Pause (stop billing for compute) |
| `aws apprunner resume-service --service-arn <arn>` | Resume paused service |
| `aws apprunner associate-custom-domain --service-arn <arn> --domain-name bot.example.com` | Map custom domain |
| `aws apprunner disassociate-custom-domain --service-arn <arn> --domain-name bot.example.com` | Remove custom domain |

Reference: [docs.aws.amazon.com/cli/latest/reference/apprunner](https://docs.aws.amazon.com/cli/latest/reference/apprunner)

---

## 8. Secrets Manager (`aws secretsmanager`) — Bot Credentials

| Command | Purpose |
|---|---|
| `aws secretsmanager create-secret --name bot/slack --secret-string '{"SLACK_BOT_TOKEN":"xoxb-...","SLACK_SIGNING_SECRET":"..."}'` | Store bot credentials |
| `aws secretsmanager get-secret-value --secret-id bot/slack` | Read secret value |
| `aws secretsmanager describe-secret --secret-id bot/slack` | Read metadata (no value) |
| `aws secretsmanager list-secrets --filters Key=name,Values=bot/` | List secrets |
| `aws secretsmanager update-secret --secret-id bot/slack --secret-string '{"SLACK_BOT_TOKEN":"xoxb-new"}'` | Update secret value |
| `aws secretsmanager rotate-secret --secret-id bot/slack --rotation-lambda-arn <arn>` | Trigger rotation |
| `aws secretsmanager delete-secret --secret-id bot/slack --recovery-window-in-days 7` | Soft delete (recoverable) |
| `aws secretsmanager delete-secret --secret-id bot/slack --force-delete-without-recovery` | Hard delete (immediate) |
| `aws secretsmanager restore-secret --secret-id bot/slack` | Recover soft-deleted secret |

Reference: [docs.aws.amazon.com/cli/latest/reference/secretsmanager](https://docs.aws.amazon.com/cli/latest/reference/secretsmanager)

---

## 9. SSM Parameter Store (`aws ssm`) — Configuration & Secrets

| Command | Purpose |
|---|---|
| `aws ssm put-parameter --name /bot/config/log-level --value "info" --type String` | Create string parameter |
| `aws ssm put-parameter --name /bot/secrets/api-key --value "sk-..." --type SecureString` | Create encrypted parameter |
| `aws ssm get-parameter --name /bot/config/log-level` | Read parameter |
| `aws ssm get-parameter --name /bot/secrets/api-key --with-decryption` | Read encrypted parameter |
| `aws ssm get-parameters-by-path --path /bot/ --recursive --with-decryption` | Read all params under path |
| `aws ssm describe-parameters --parameter-filters "Key=Name,Option=BeginsWith,Values=/bot/"` | List parameters (metadata only) |
| `aws ssm put-parameter --name /bot/config/log-level --value "debug" --type String --overwrite` | Update parameter |
| `aws ssm delete-parameter --name /bot/config/log-level` | Delete parameter |
| `aws ssm delete-parameters --names /bot/config/log-level /bot/config/timeout` | Batch delete |

Reference: [docs.aws.amazon.com/cli/latest/reference/ssm](https://docs.aws.amazon.com/cli/latest/reference/ssm)

---

## 10. CloudWatch & Logs (`aws cloudwatch`, `aws logs`) — Monitoring

### CloudWatch Metrics & Alarms

| Command | Purpose |
|---|---|
| `aws cloudwatch put-metric-alarm --alarm-name bot-errors --metric-name Errors --namespace AWS/Lambda --statistic Sum --period 300 --threshold 5 --comparison-operator GreaterThanThreshold --evaluation-periods 1 --alarm-actions <sns-arn> --dimensions Name=FunctionName,Value=<func>` | Create error alarm |
| `aws cloudwatch describe-alarms --alarm-names bot-errors` | Read alarm config |
| `aws cloudwatch list-metrics --namespace AWS/Lambda --dimensions Name=FunctionName,Value=<func>` | List available metrics |
| `aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Duration --dimensions Name=FunctionName,Value=<func> --start-time <time> --end-time <time> --period 3600 --statistics Average` | Query metric data |
| `aws cloudwatch put-metric-data --namespace BotMetrics --metric-name MessagesProcessed --value 1 --unit Count` | Publish custom metric |
| `aws cloudwatch delete-alarms --alarm-names bot-errors` | Delete alarm |

### CloudWatch Logs

| Command | Purpose |
|---|---|
| `aws logs create-log-group --log-group-name /aws/lambda/slack-bot` | Create log group |
| `aws logs describe-log-groups --log-group-name-prefix /aws/lambda/` | List log groups |
| `aws logs put-retention-policy --log-group-name /aws/lambda/slack-bot --retention-in-days 30` | Set log retention |
| `aws logs delete-log-group --log-group-name /aws/lambda/slack-bot` | Delete log group |
| `aws logs describe-log-streams --log-group-name /aws/lambda/slack-bot --order-by LastEventTime --descending --limit 5` | List recent log streams |
| `aws logs get-log-events --log-group-name /aws/lambda/slack-bot --log-stream-name <stream>` | Read log events |
| `aws logs filter-log-events --log-group-name /aws/lambda/slack-bot --filter-pattern "ERROR"` | Search logs for errors |
| `aws logs tail /aws/lambda/slack-bot --follow` | Live tail logs |
| `aws logs put-metric-filter --log-group-name /aws/lambda/slack-bot --filter-name bot-errors --filter-pattern "ERROR" --metric-transformations metricName=BotErrors,metricNamespace=BotMetrics,metricValue=1` | Create metric from log pattern |

Reference: [docs.aws.amazon.com/cli/latest/reference/cloudwatch](https://docs.aws.amazon.com/cli/latest/reference/cloudwatch)

---

## 11. S3 (`aws s3` / `aws s3api`) — Artifact Storage & Bot State

### High-Level Commands (`aws s3`)

| Command | Purpose |
|---|---|
| `aws s3 mb s3://my-bot-artifacts` | Create bucket |
| `aws s3 ls` | List buckets |
| `aws s3 ls s3://my-bot-artifacts/` | List objects in bucket |
| `aws s3 cp function.zip s3://my-bot-artifacts/deploys/function.zip` | Upload file |
| `aws s3 cp s3://my-bot-artifacts/deploys/function.zip ./function.zip` | Download file |
| `aws s3 sync ./dist s3://my-bot-artifacts/deploys/latest/` | Sync directory to S3 |
| `aws s3 rm s3://my-bot-artifacts/deploys/function.zip` | Delete object |
| `aws s3 rb s3://my-bot-artifacts --force` | Delete bucket and all contents |
| `aws s3 presign s3://my-bot-artifacts/files/report.pdf --expires-in 3600` | Generate pre-signed URL |

### Low-Level Commands (`aws s3api`)

| Command | Purpose |
|---|---|
| `aws s3api create-bucket --bucket <name> --region us-east-1` | Create bucket (us-east-1) |
| `aws s3api create-bucket --bucket <name> --region us-west-2 --create-bucket-configuration LocationConstraint=us-west-2` | Create bucket (other regions) |
| `aws s3api put-bucket-versioning --bucket <name> --versioning-configuration Status=Enabled` | Enable versioning |
| `aws s3api put-bucket-encryption --bucket <name> --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}'` | Enable encryption |
| `aws s3api put-public-access-block --bucket <name> --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true` | Block public access |

Reference: [docs.aws.amazon.com/cli/latest/reference/s3](https://docs.aws.amazon.com/cli/latest/reference/s3)

---

## 12. DynamoDB (`aws dynamodb`) — Conversation State

### Tables

| Command | Purpose |
|---|---|
| `aws dynamodb create-table --table-name bot-conversations --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE --billing-mode PAY_PER_REQUEST` | Create table (on-demand) |
| `aws dynamodb describe-table --table-name bot-conversations` | Read table details |
| `aws dynamodb list-tables` | List tables |
| `aws dynamodb update-table --table-name bot-conversations --billing-mode PAY_PER_REQUEST` | Switch to on-demand |
| `aws dynamodb update-time-to-live --table-name bot-conversations --time-to-live-specification Enabled=true,AttributeName=ttl` | Enable TTL (auto-expire old state) |
| `aws dynamodb delete-table --table-name bot-conversations` | Delete table |

### Items (CRUD)

| Command | Purpose |
|---|---|
| `aws dynamodb put-item --table-name bot-conversations --item '{"pk":{"S":"user#U123"},"sk":{"S":"conv#2026-02-28"},"state":{"S":"awaiting_input"}}'` | Create/overwrite item |
| `aws dynamodb get-item --table-name bot-conversations --key '{"pk":{"S":"user#U123"},"sk":{"S":"conv#2026-02-28"}}'` | Read item by key |
| `aws dynamodb query --table-name bot-conversations --key-condition-expression "pk = :pk" --expression-attribute-values '{":pk":{"S":"user#U123"}}'` | Query items by partition key |
| `aws dynamodb update-item --table-name bot-conversations --key '{"pk":{"S":"user#U123"},"sk":{"S":"conv#2026-02-28"}}' --update-expression "SET #s = :s" --expression-attribute-names '{"#s":"state"}' --expression-attribute-values '{":s":{"S":"completed"}}'` | Update specific attributes |
| `aws dynamodb delete-item --table-name bot-conversations --key '{"pk":{"S":"user#U123"},"sk":{"S":"conv#2026-02-28"}}'` | Delete item |

### Batch Operations

| Command | Purpose |
|---|---|
| `aws dynamodb batch-write-item --request-items file://batch-write.json` | Batch write (up to 25 items) |
| `aws dynamodb batch-get-item --request-items file://batch-get.json` | Batch read (up to 100 items) |

Reference: [docs.aws.amazon.com/cli/latest/reference/dynamodb](https://docs.aws.amazon.com/cli/latest/reference/dynamodb)

---

## 13. SQS (`aws sqs`) — Async Message Processing

For Lambda bots that need to ack Slack within 3 seconds and process asynchronously.

| Command | Purpose |
|---|---|
| `aws sqs create-queue --queue-name bot-events` | Create standard queue |
| `aws sqs create-queue --queue-name bot-events.fifo --attributes FifoQueue=true,ContentBasedDeduplication=true` | Create FIFO queue (ordered) |
| `aws sqs create-queue --queue-name bot-events-dlq` | Create dead-letter queue |
| `aws sqs get-queue-url --queue-name bot-events` | Get queue URL |
| `aws sqs get-queue-attributes --queue-url <url> --attribute-names All` | Read queue config |
| `aws sqs list-queues --queue-name-prefix bot-` | List queues |
| `aws sqs set-queue-attributes --queue-url <url> --attributes '{"VisibilityTimeout":"60","RedrivePolicy":"{\"deadLetterTargetArn\":\"<dlq-arn>\",\"maxReceiveCount\":\"3\"}"}'` | Configure DLQ redrive |
| `aws sqs send-message --queue-url <url> --message-body '{"event":"message","text":"hello"}'` | Send message |
| `aws sqs purge-queue --queue-url <url>` | Delete all messages |
| `aws sqs delete-queue --queue-url <url>` | Delete queue |

Reference: [docs.aws.amazon.com/cli/latest/reference/sqs](https://docs.aws.amazon.com/cli/latest/reference/sqs)

---

## 14. SNS (`aws sns`) — Notifications & Alerts

| Command | Purpose |
|---|---|
| `aws sns create-topic --name bot-alerts` | Create topic |
| `aws sns list-topics` | List topics |
| `aws sns get-topic-attributes --topic-arn <arn>` | Read topic details |
| `aws sns delete-topic --topic-arn <arn>` | Delete topic |
| `aws sns subscribe --topic-arn <arn> --protocol email --notification-endpoint ops@example.com` | Subscribe email |
| `aws sns subscribe --topic-arn <arn> --protocol lambda --notification-endpoint <lambda-arn>` | Subscribe Lambda |
| `aws sns list-subscriptions-by-topic --topic-arn <arn>` | List subscribers |
| `aws sns unsubscribe --subscription-arn <arn>` | Remove subscriber |
| `aws sns publish --topic-arn <arn> --subject "Bot Error" --message "Lambda function failed"` | Publish to topic |

Reference: [docs.aws.amazon.com/cli/latest/reference/sns](https://docs.aws.amazon.com/cli/latest/reference/sns)

---

## 15. ECR (`aws ecr`) — Container Registry

| Command | Purpose |
|---|---|
| `aws ecr create-repository --repository-name slack-bot --image-scanning-configuration scanOnPush=true` | Create repository |
| `aws ecr describe-repositories --repository-names slack-bot` | Read repository |
| `aws ecr list-images --repository-name slack-bot` | List images |
| `aws ecr describe-images --repository-name slack-bot --image-ids imageTag=latest` | Read image details |
| `aws ecr get-login-password --region us-east-1 \| docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com` | Authenticate Docker to ECR |
| `aws ecr put-lifecycle-policy --repository-name slack-bot --lifecycle-policy-text file://lifecycle.json` | Set image cleanup policy |
| `aws ecr batch-delete-image --repository-name slack-bot --image-ids imageTag=old` | Delete images |
| `aws ecr delete-repository --repository-name slack-bot --force` | Delete repository and images |

### Typical Docker Push Flow

```bash
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t slack-bot .
docker tag slack-bot:latest <account>.dkr.ecr.<region>.amazonaws.com/slack-bot:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/slack-bot:latest
```

Reference: [docs.aws.amazon.com/cli/latest/reference/ecr](https://docs.aws.amazon.com/cli/latest/reference/ecr)

---

## 16. CloudFormation (`aws cloudformation`) — Infrastructure as Code

| Command | Purpose |
|---|---|
| `aws cloudformation create-stack --stack-name bot-infra --template-body file://template.yaml --capabilities CAPABILITY_IAM` | Create stack |
| `aws cloudformation describe-stacks --stack-name bot-infra` | Read stack status and outputs |
| `aws cloudformation describe-stack-resources --stack-name bot-infra` | List resources in stack |
| `aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE` | List active stacks |
| `aws cloudformation update-stack --stack-name bot-infra --template-body file://template.yaml --capabilities CAPABILITY_IAM` | Update stack |
| `aws cloudformation create-change-set --stack-name bot-infra --change-set-name update-v2 --template-body file://template.yaml --capabilities CAPABILITY_IAM` | Preview changes |
| `aws cloudformation execute-change-set --stack-name bot-infra --change-set-name update-v2` | Apply change set |
| `aws cloudformation delete-stack --stack-name bot-infra` | Delete stack and resources |
| `aws cloudformation describe-stack-events --stack-name bot-infra` | Read deployment events/errors |
| `aws cloudformation validate-template --template-body file://template.yaml` | Validate template syntax |
| `aws cloudformation wait stack-create-complete --stack-name bot-infra` | Wait for creation to finish |

Reference: [docs.aws.amazon.com/cli/latest/reference/cloudformation](https://docs.aws.amazon.com/cli/latest/reference/cloudformation)

---

## 17. STS (`aws sts`) — Identity Verification

| Command | Purpose |
|---|---|
| `aws sts get-caller-identity` | Verify current identity (account, user, ARN) |
| `aws sts assume-role --role-arn <arn> --role-session-name bot-deploy` | Assume a role (cross-account or elevated) |
| `aws sts get-session-token --duration-seconds 3600` | Get temporary credentials |
| `aws sts decode-authorization-message --encoded-message <msg>` | Decode IAM denial message |

Reference: [docs.aws.amazon.com/cli/latest/reference/sts](https://docs.aws.amazon.com/cli/latest/reference/sts)

---

## 18. Route 53 (`aws route53`) — Custom Domain for Bot Endpoints

### Hosted Zones

| Command | Purpose |
|---|---|
| `aws route53 create-hosted-zone --name example.com --caller-reference $(date +%s)` | Create hosted zone |
| `aws route53 list-hosted-zones` | List hosted zones |
| `aws route53 get-hosted-zone --id <zone-id>` | Read zone details |
| `aws route53 delete-hosted-zone --id <zone-id>` | Delete zone |

### DNS Records

| Command | Purpose |
|---|---|
| `aws route53 change-resource-record-sets --hosted-zone-id <id> --change-batch file://dns-change.json` | Create/update/delete records |
| `aws route53 list-resource-record-sets --hosted-zone-id <id>` | List records |
| `aws route53 test-dns-answer --hosted-zone-id <id> --record-name bot.example.com --record-type A` | Test DNS resolution |

### Example `dns-change.json` (CNAME to API Gateway)

```json
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "bot.example.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "abc123.execute-api.us-east-1.amazonaws.com"}]
    }
  }]
}
```

Reference: [docs.aws.amazon.com/cli/latest/reference/route53](https://docs.aws.amazon.com/cli/latest/reference/route53)

---

## 19. ACM (`aws acm`) — SSL Certificates

| Command | Purpose |
|---|---|
| `aws acm request-certificate --domain-name bot.example.com --validation-method DNS` | Request certificate |
| `aws acm describe-certificate --certificate-arn <arn>` | Read cert status and validation info |
| `aws acm list-certificates` | List certificates |
| `aws acm list-certificates --certificate-statuses ISSUED` | List only issued certs |
| `aws acm delete-certificate --certificate-arn <arn>` | Delete certificate |
| `aws acm wait certificate-validated --certificate-arn <arn>` | Wait for validation to complete |

### DNS Validation Flow

```bash
# 1. Request certificate
CERT_ARN=$(aws acm request-certificate --domain-name bot.example.com --validation-method DNS --query CertificateArn --output text)

# 2. Get CNAME validation record
aws acm describe-certificate --certificate-arn $CERT_ARN --query "Certificate.DomainValidationOptions[0].ResourceRecord"

# 3. Create validation CNAME in Route 53 (using change-resource-record-sets)

# 4. Wait for validation
aws acm wait certificate-validated --certificate-arn $CERT_ARN
```

Reference: [docs.aws.amazon.com/cli/latest/reference/acm](https://docs.aws.amazon.com/cli/latest/reference/acm)

---

## 20. Bedrock (`aws bedrock` / `aws bedrock-agent`) — AI Agents on AWS

### Foundation Model Discovery

| Command | Purpose |
|---|---|
| `aws bedrock list-foundation-models` | List all available models |
| `aws bedrock list-foundation-models --by-provider anthropic` | List Anthropic models |
| `aws bedrock get-foundation-model --model-identifier anthropic.claude-3-sonnet-20240229-v1:0` | Get model details |

### Model Invocation (`aws bedrock-runtime`)

| Command | Purpose |
|---|---|
| `aws bedrock-runtime invoke-model --model-id anthropic.claude-3-sonnet-20240229-v1:0 --content-type application/json --body file://prompt.json output.json` | Invoke model (sync) |
| `aws bedrock-runtime invoke-model-with-response-stream --model-id <model-id> --content-type application/json --body file://prompt.json output.json` | Invoke model (streaming) |
| `aws bedrock-runtime converse --model-id <model-id> --messages file://messages.json` | Multi-turn conversation (Converse API) |

### Bedrock Agents (`aws bedrock-agent`)

| Command | Purpose |
|---|---|
| `aws bedrock-agent create-agent --agent-name slack-ai-agent --agent-resource-role-arn <arn> --foundation-model anthropic.claude-3-sonnet-20240229-v1:0 --instruction "You are a helpful Slack bot."` | Create agent |
| `aws bedrock-agent get-agent --agent-id <id>` | Read agent config |
| `aws bedrock-agent list-agents` | List agents |
| `aws bedrock-agent update-agent --agent-id <id> --agent-name <name> --agent-resource-role-arn <arn> --foundation-model <model> --instruction "Updated instructions"` | Update agent |
| `aws bedrock-agent delete-agent --agent-id <id>` | Delete agent |
| `aws bedrock-agent prepare-agent --agent-id <id>` | Prepare agent for use (required after changes) |

### Agent Action Groups (tool use)

| Command | Purpose |
|---|---|
| `aws bedrock-agent create-agent-action-group --agent-id <id> --agent-version DRAFT --action-group-name slack-actions --action-group-executor lambda=<lambda-arn> --api-schema s3=<s3-uri>` | Add tools/actions to agent |
| `aws bedrock-agent list-agent-action-groups --agent-id <id> --agent-version DRAFT` | List action groups |
| `aws bedrock-agent update-agent-action-group --agent-id <id> --agent-version DRAFT --action-group-id <id> --action-group-name <name>` | Update action group |
| `aws bedrock-agent delete-agent-action-group --agent-id <id> --agent-version DRAFT --action-group-id <id>` | Delete action group |

### Agent Knowledge Bases

| Command | Purpose |
|---|---|
| `aws bedrock-agent create-knowledge-base --name bot-knowledge --role-arn <arn> --knowledge-base-configuration type=VECTOR,vectorKnowledgeBaseConfiguration={embeddingModelArn=<model-arn>} --storage-configuration file://storage.json` | Create knowledge base |
| `aws bedrock-agent list-knowledge-bases` | List knowledge bases |
| `aws bedrock-agent get-knowledge-base --knowledge-base-id <id>` | Read knowledge base |
| `aws bedrock-agent associate-agent-knowledge-base --agent-id <id> --agent-version DRAFT --knowledge-base-id <kb-id> --description "Bot documentation"` | Connect KB to agent |
| `aws bedrock-agent create-data-source --knowledge-base-id <id> --name docs --data-source-configuration type=S3,s3Configuration={bucketArn=<arn>}` | Add data source to KB |
| `aws bedrock-agent start-ingestion-job --knowledge-base-id <id> --data-source-id <id>` | Sync data into KB |
| `aws bedrock-agent delete-knowledge-base --knowledge-base-id <id>` | Delete knowledge base |

### Agent Aliases & Invocation

| Command | Purpose |
|---|---|
| `aws bedrock-agent create-agent-alias --agent-id <id> --agent-alias-name prod` | Create alias for deployment |
| `aws bedrock-agent list-agent-aliases --agent-id <id>` | List aliases |
| `aws bedrock-agent update-agent-alias --agent-id <id> --agent-alias-id <alias-id> --agent-alias-name prod` | Update alias |
| `aws bedrock-agent delete-agent-alias --agent-id <id> --agent-alias-id <alias-id>` | Delete alias |

### Agent Runtime (`aws bedrock-agent-runtime`)

| Command | Purpose |
|---|---|
| `aws bedrock-agent-runtime invoke-agent --agent-id <id> --agent-alias-id <alias-id> --session-id <session> --input-text "What are our team policies?"` | Invoke agent |
| `aws bedrock-agent-runtime retrieve --knowledge-base-id <id> --retrieval-query text="deployment process"` | Query knowledge base directly |
| `aws bedrock-agent-runtime retrieve-and-generate --input text="How do I deploy?" --retrieve-and-generate-configuration file://rag-config.json` | RAG query |

### Guardrails

| Command | Purpose |
|---|---|
| `aws bedrock create-guardrail --name bot-guardrail --blocked-input-messaging "I cannot process that." --blocked-outputs-messaging "Response filtered." --content-policy-config file://content-policy.json` | Create guardrail |
| `aws bedrock get-guardrail --guardrail-identifier <id>` | Read guardrail |
| `aws bedrock list-guardrails` | List guardrails |
| `aws bedrock update-guardrail --guardrail-identifier <id> --name bot-guardrail --blocked-input-messaging "..." --blocked-outputs-messaging "..."` | Update guardrail |
| `aws bedrock delete-guardrail --guardrail-identifier <id>` | Delete guardrail |

Reference: [docs.aws.amazon.com/cli/latest/reference/bedrock](https://docs.aws.amazon.com/cli/latest/reference/bedrock)

---

## 21. Lex V2 (`aws lexv2-models`) — AWS Native Bot Framework

### Bots

| Command | Purpose |
|---|---|
| `aws lexv2-models create-bot --bot-name slack-bot --role-arn <arn> --data-privacy '{"childDirected":false}' --idle-session-ttl-in-seconds 300` | Create bot |
| `aws lexv2-models describe-bot --bot-id <id>` | Read bot config |
| `aws lexv2-models list-bots` | List bots |
| `aws lexv2-models update-bot --bot-id <id> --bot-name <name> --role-arn <arn> --data-privacy '{"childDirected":false}' --idle-session-ttl-in-seconds 300` | Update bot |
| `aws lexv2-models delete-bot --bot-id <id> --skip-resource-in-use-check` | Delete bot |

### Intents

| Command | Purpose |
|---|---|
| `aws lexv2-models create-intent --bot-id <id> --bot-version DRAFT --locale-id en_US --intent-name OrderFood` | Create intent |
| `aws lexv2-models list-intents --bot-id <id> --bot-version DRAFT --locale-id en_US` | List intents |
| `aws lexv2-models update-intent --bot-id <id> --bot-version DRAFT --locale-id en_US --intent-id <id> --intent-name OrderFood --sample-utterances file://utterances.json --fulfillment-code-hook '{"enabled":true}'` | Update intent with utterances and Lambda fulfillment |
| `aws lexv2-models delete-intent --bot-id <id> --bot-version DRAFT --locale-id en_US --intent-id <id>` | Delete intent |

### Slots (parameters)

| Command | Purpose |
|---|---|
| `aws lexv2-models create-slot --bot-id <id> --bot-version DRAFT --locale-id en_US --intent-id <id> --slot-name FoodType --slot-type-id AMAZON.FreeFormInput --value-elicitation-setting file://elicitation.json` | Create slot |
| `aws lexv2-models list-slots --bot-id <id> --bot-version DRAFT --locale-id en_US --intent-id <id>` | List slots |
| `aws lexv2-models delete-slot --bot-id <id> --bot-version DRAFT --locale-id en_US --intent-id <id> --slot-id <id>` | Delete slot |

### Build & Deploy

| Command | Purpose |
|---|---|
| `aws lexv2-models build-bot-locale --bot-id <id> --bot-version DRAFT --locale-id en_US` | Build bot (compile NLU model) |
| `aws lexv2-models create-bot-version --bot-id <id> --bot-version-locale-specification '{"en_US":{"sourceBotVersion":"DRAFT"}}'` | Create immutable version |
| `aws lexv2-models create-bot-alias --bot-id <id> --bot-alias-name prod --bot-version 1` | Create alias |
| `aws lexv2-models update-bot-alias --bot-id <id> --bot-alias-id <alias-id> --bot-alias-name prod --bot-version 2` | Point alias to new version |
| `aws lexv2-models delete-bot-alias --bot-id <id> --bot-alias-id <alias-id>` | Delete alias |

### Runtime (`aws lexv2-runtime`)

| Command | Purpose |
|---|---|
| `aws lexv2-runtime recognize-text --bot-id <id> --bot-alias-id <alias-id> --locale-id en_US --session-id user-123 --text "I want to order pizza"` | Send text to bot |
| `aws lexv2-runtime get-session --bot-id <id> --bot-alias-id <alias-id> --locale-id en_US --session-id user-123` | Read session state |
| `aws lexv2-runtime delete-session --bot-id <id> --bot-alias-id <alias-id> --locale-id en_US --session-id user-123` | Clear session |

Reference: [docs.aws.amazon.com/cli/latest/reference/lexv2-models](https://docs.aws.amazon.com/cli/latest/reference/lexv2-models)

---

## patterns

### Minimum viable Slack bot on Lambda — full CRUD flow

```bash
# 1. Verify identity
aws sts get-caller-identity

# 2. Create IAM role for Lambda
cat > trust.json << 'TRUST'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
TRUST
ROLE_ARN=$(aws iam create-role --role-name slack-bot-role \
  --assume-role-policy-document file://trust.json --query Role.Arn --output text)
aws iam attach-role-policy --role-name slack-bot-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam attach-role-policy --role-name slack-bot-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# 3. Store secrets
aws secretsmanager create-secret --name bot/slack \
  --secret-string '{"SLACK_BOT_TOKEN":"xoxb-...","SLACK_SIGNING_SECRET":"..."}'

# 4. Create Lambda function
npm run build && cd dist && zip -r ../function.zip . && cd ..
aws lambda create-function --function-name slack-bot \
  --runtime nodejs20.x --role $ROLE_ARN --handler lambda.handler \
  --zip-file fileb://function.zip --timeout 30 --memory-size 256

# 5. Create HTTP API + Lambda integration
API_ID=$(aws apigatewayv2 create-api --name slack-bot-api \
  --protocol-type HTTP --query ApiId --output text)
INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:$(aws sts get-caller-identity --query Account --output text):function:slack-bot \
  --payload-format-version 2.0 --query IntegrationId --output text)
aws apigatewayv2 create-route --api-id $API_ID \
  --route-key "POST /slack/events" --target integrations/$INTEGRATION_ID
aws apigatewayv2 create-stage --api-id $API_ID --stage-name '$default' --auto-deploy

# 6. Grant API Gateway permission to invoke Lambda
aws lambda add-permission --function-name slack-bot \
  --statement-id apigateway --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$(aws sts get-caller-identity --query Account --output text):$API_ID/*"

# 7. Get endpoint URL for Slack app configuration
echo "Slack Request URL: https://$API_ID.execute-api.us-east-1.amazonaws.com/slack/events"

# 8. Set up monitoring
aws cloudwatch put-metric-alarm --alarm-name slack-bot-errors \
  --metric-name Errors --namespace AWS/Lambda --statistic Sum \
  --period 300 --threshold 5 --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 --dimensions Name=FunctionName,Value=slack-bot
```

### Minimum viable Bedrock agent wired to a Slack bot

```bash
# 1. Create Bedrock agent
AGENT_ID=$(aws bedrock-agent create-agent \
  --agent-name slack-ai-agent \
  --agent-resource-role-arn $ROLE_ARN \
  --foundation-model anthropic.claude-3-sonnet-20240229-v1:0 \
  --instruction "You are a helpful assistant in a Slack workspace." \
  --query agent.agentId --output text)

# 2. Prepare and create alias
aws bedrock-agent prepare-agent --agent-id $AGENT_ID
ALIAS_ID=$(aws bedrock-agent create-agent-alias \
  --agent-id $AGENT_ID --agent-alias-name prod \
  --query agentAlias.agentAliasId --output text)

# 3. Add a knowledge base (optional)
KB_ID=$(aws bedrock-agent create-knowledge-base \
  --name company-docs --role-arn $ROLE_ARN \
  --knowledge-base-configuration type=VECTOR,vectorKnowledgeBaseConfiguration={embeddingModelArn=arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v1} \
  --storage-configuration file://storage.json \
  --query knowledgeBase.knowledgeBaseId --output text)
aws bedrock-agent associate-agent-knowledge-base \
  --agent-id $AGENT_ID --agent-version DRAFT \
  --knowledge-base-id $KB_ID --description "Company documentation"
aws bedrock-agent prepare-agent --agent-id $AGENT_ID

# 4. Test invocation
aws bedrock-agent-runtime invoke-agent \
  --agent-id $AGENT_ID --agent-alias-id $ALIAS_ID \
  --session-id test-session --input-text "Hello, what can you help me with?"
```

### Teardown (delete everything)

```bash
# Delete compute
aws lambda delete-function --function-name slack-bot
aws apigatewayv2 delete-api --api-id $API_ID

# Delete secrets
aws secretsmanager delete-secret --secret-id bot/slack --force-delete-without-recovery

# Delete IAM (detach policies first)
aws iam detach-role-policy --role-name slack-bot-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam detach-role-policy --role-name slack-bot-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
aws iam delete-role --role-name slack-bot-role

# Delete Bedrock agent
aws bedrock-agent delete-agent-alias --agent-id $AGENT_ID --agent-alias-id $ALIAS_ID
aws bedrock-agent delete-agent --agent-id $AGENT_ID

# Delete monitoring
aws cloudwatch delete-alarms --alarm-names slack-bot-errors
```

### List all resources in a bot project

```bash
# Lambda functions
aws lambda list-functions --query "Functions[?starts_with(FunctionName,'slack-bot')]" --output table

# API Gateway
aws apigatewayv2 get-apis --query "Items[?Name=='slack-bot-api']" --output table

# Secrets
aws secretsmanager list-secrets --filters Key=name,Values=bot/ --output table

# Bedrock agents
aws bedrock-agent list-agents --output table

# CloudWatch alarms
aws cloudwatch describe-alarms --alarm-name-prefix slack-bot --output table
```

## service selection by architecture

| Architecture | Primary Services |
|---|---|
| **Lambda webhook bot** (Slack Events API) | Lambda, API Gateway (HTTP API), Secrets Manager, CloudWatch Logs, IAM, SQS (for async) |
| **Lambda + Bedrock AI agent** | Lambda, API Gateway, Bedrock (agent + runtime), Secrets Manager, DynamoDB (state), S3 (knowledge base), IAM |
| **ECS Fargate long-running bot** (Socket Mode) | ECS, ECR, Secrets Manager, CloudWatch Logs, IAM |
| **EC2 Socket Mode bot** | EC2, IAM (instance profile), SSM Parameter Store, CloudWatch Logs |
| **App Runner bot** | App Runner, ECR, Secrets Manager, CloudWatch Logs |
| **Elastic Beanstalk bot** | Elastic Beanstalk, S3 (deploy artifacts), CloudWatch Logs, IAM |
| **Lex conversational bot** | Lex V2, Lambda (fulfillment), DynamoDB (state), CloudWatch Logs |
| **Full production deployment** | All above + CloudFormation, Route 53, ACM, SNS (alerts) |

## pitfalls

- **IAM role must exist before Lambda.** The `create-function` call fails if the role ARN doesn't exist yet. After `create-role`, wait a few seconds for propagation before creating the Lambda.
- **Detach policies before deleting roles.** `aws iam delete-role` fails if any policies are still attached. Always `detach-role-policy` for each managed policy and `delete-role-policy` for each inline policy first.
- **API Gateway permission on Lambda.** Creating the API Gateway and integration doesn't automatically grant invoke permission. You must run `aws lambda add-permission` — without it, API Gateway returns 500 errors.
- **Secrets Manager soft-delete.** By default, `delete-secret` schedules deletion after 30 days. Recreating a secret with the same name fails during this window. Use `--force-delete-without-recovery` for immediate deletion, or `restore-secret` to recover.
- **Lambda cold starts vs Slack 3-second ack.** Node.js Lambda cold starts can take 1-5 seconds. If your handler does work before calling `ack()`, you exceed the deadline. Use provisioned concurrency or the async SQS pattern.
- **ECS needs ECR auth refresh.** The ECR login token expires after 12 hours. CI/CD pipelines must call `aws ecr get-login-password` before every `docker push`.
- **DynamoDB on-demand vs provisioned.** On-demand (`PAY_PER_REQUEST`) is best for unpredictable bot traffic. Provisioned with auto-scaling saves cost at high, steady throughput but requires capacity planning.
- **CloudFormation stack deletion order.** Stacks with resources that have deletion protection (S3 buckets with objects, DynamoDB tables) will fail to delete. Empty buckets and remove protection before deleting the stack.
- **Bedrock model access.** Foundation models require explicit enablement in your account. Check `aws bedrock list-foundation-models` and request access via the console before trying to invoke.
- **Region availability for Bedrock.** Not all Bedrock models are available in all regions. Anthropic Claude models are typically available in `us-east-1` and `us-west-2`.

## instructions

This expert is a reference catalog of all AWS CLI commands relevant to bot and agent development. Use it when a developer asks "what aws commands do I need for X?" or needs to look up the CLI surface for a specific AWS service. For step-by-step deployment instructions, defer to `aws-bot-deploy-ts.md`.

Pair with: `aws-bot-deploy-ts.md` (step-by-step deployment), `../security/secrets-ts.md` (secrets best practices), `../bridge/infra-compute-ts.md` (compute comparisons with Azure), `azure-cli-reference-ts.md` (Azure equivalent).

## research

Deep Research prompt:

"Catalog all AWS CLI command groups a developer would need for creating, reading, updating, and deleting resources in a bot/agent project on AWS. Include: IAM (roles, policies, instance profiles), Lambda (functions, aliases, layers, function URLs), API Gateway (HTTP API and REST API), EC2 (instances, security groups, key pairs), ECS (clusters, task definitions, services), Elastic Beanstalk, App Runner, Secrets Manager, SSM Parameter Store, CloudWatch (alarms, metrics, logs), S3, DynamoDB, SQS, SNS, ECR, CloudFormation, STS, Route 53, ACM, Bedrock (foundation models, agents, knowledge bases, guardrails), and Lex V2 (bots, intents, slots). For each group, list the key CRUD commands and their purpose."
