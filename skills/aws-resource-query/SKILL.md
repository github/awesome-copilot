---
name: aws-resource-query
description: 'Query AWS resources using natural language. Covers EC2, S3, RDS, Lambda, ECS, EKS, Secrets Manager, IAM, VPC, networking, messaging, and more. Strictly read-only — no writes, deletes, or mutations.'
---

# AWS Resource Query

Answer natural language questions about AWS resources by translating intent into read-only AWS CLI commands. This skill **never** runs commands that create, modify, or delete resources.

## Safety Contract

**STRICTLY READ-ONLY.** This skill exclusively uses:
- `aws <service> describe-*`
- `aws <service> list-*`
- `aws <service> get-*`
- `aws sts get-caller-identity`
- `aws configure get`
- `aws resourcegroupstaggingapi get-resources`
- `aws ce get-*`
- `aws support describe-*`

**NEVER** run any of the following, regardless of what the user asks:
`create-*`, `run-*`, `start-*`, `stop-*`, `reboot-*`, `delete-*`, `terminate-*`, `put-*`, `update-*`, `modify-*`, `attach-*`, `detach-*`, `send-*`, `publish-*`, `invoke-*`, `execute-*`

If the user's query implies a write action, respond:
> "This skill is read-only. I can show you the current state of [resource], but I cannot [create/modify/delete] it. Would you like to see what currently exists?"

## Workflow

### Step 1: Parse Intent
Identify: target service(s), scope (all / filtered / specific), detail level, and region.

### Step 2: Confirm Account & Region
```bash
aws sts get-caller-identity --query '{Account:Account,UserId:UserId}'
aws configure get region
```
Append `--region <region>` to all commands when the user specifies one.

### Step 3: Execute & Format
Run the matched read-only command(s) below and format results as a readable table. For large result sets show a count first and offer to filter further.

---

## Intent → Command Mapping

### COMPUTE

#### EC2 Instances
```bash
# "list EC2 instances" / "show my VMs" / "what instances are running"
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name,Tags[?Key==`Name`].Value|[0],PrivateIpAddress,PublicIpAddress]' \
  --output table

# "running instances only"
aws ec2 describe-instances --filters Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,Tags[?Key==`Name`].Value|[0],PrivateIpAddress]' \
  --output table

# "stopped instances"
aws ec2 describe-instances --filters Name=instance-state-name,Values=stopped \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,Tags[?Key==`Name`].Value|[0]]' \
  --output table

# "instance types in use"
aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceType' --output text | sort | uniq -c | sort -rn

# "auto scaling groups" / "ASGs"
aws autoscaling describe-auto-scaling-groups \
  --query 'AutoScalingGroups[].[AutoScalingGroupName,MinSize,MaxSize,DesiredCapacity]' --output table

# "elastic IPs" / "EIPs"
aws ec2 describe-addresses \
  --query 'Addresses[].[PublicIp,InstanceId,AllocationId,AssociationId]' --output table

# "key pairs"
aws ec2 describe-key-pairs \
  --query 'KeyPairs[].[KeyName,CreateTime]' --output table

# "AMIs I own"
aws ec2 describe-images --owners self \
  --query 'Images[].[ImageId,Name,CreationDate,State]' --output table

# "spot instances"
aws ec2 describe-spot-instance-requests \
  --query 'SpotInstanceRequests[].[SpotInstanceRequestId,State,InstanceId,LaunchSpecification.InstanceType]' --output table
```

#### Lambda Functions
```bash
# "list Lambda functions" / "show serverless functions"
aws lambda list-functions \
  --query 'Functions[].[FunctionName,Runtime,MemorySize,Timeout,LastModified]' --output table

# "Lambda function details for <name>"
aws lambda get-function-configuration --function-name <name>

# "Lambda event source mappings" / "Lambda triggers"
aws lambda list-event-source-mappings \
  --query 'EventSourceMappings[].[FunctionArn,EventSourceArn,State,BatchSize]' --output table

# "Lambda layers"
aws lambda list-layers \
  --query 'Layers[].[LayerName,LatestMatchingVersion.LayerVersionArn]' --output table

# "Lambda concurrency for <name>"
aws lambda get-function-concurrency --function-name <name>
```

#### ECS
```bash
# "ECS clusters"
aws ecs list-clusters --query 'clusterArns' --output table

# "ECS cluster details"
aws ecs describe-clusters \
  --clusters $(aws ecs list-clusters --query 'clusterArns[]' --output text) \
  --query 'clusters[].[clusterName,status,runningTasksCount,activeServicesCount]' --output table

# "ECS services in <cluster>"
aws ecs describe-services --cluster <cluster> \
  --services $(aws ecs list-services --cluster <cluster> --query 'serviceArns[]' --output text) \
  --query 'services[].[serviceName,status,runningCount,desiredCount]' --output table

# "ECS task definitions"
aws ecs list-task-definitions --query 'taskDefinitionArns' --output table
```

#### EKS
```bash
# "EKS clusters" / "Kubernetes clusters"
aws eks list-clusters --query 'clusters' --output table

# "EKS cluster details for <name>"
aws eks describe-cluster --name <name> \
  --query 'cluster.[name,status,version,endpoint]'

# "EKS node groups for <cluster>"
aws eks list-nodegroups --cluster-name <name> --query 'nodegroups' --output table

# "EKS add-ons for <cluster>"
aws eks list-addons --cluster-name <name> --query 'addons' --output table
```

#### Other Compute
```bash
# "Beanstalk environments"
aws elasticbeanstalk describe-environments \
  --query 'Environments[].[EnvironmentName,ApplicationName,Status,Health]' --output table

# "Batch job queues"
aws batch describe-job-queues \
  --query 'jobQueues[].[jobQueueName,state,status,priority]' --output table

# "Batch compute environments"
aws batch describe-compute-environments \
  --query 'computeEnvironments[].[computeEnvironmentName,type,state,status]' --output table
```

---

### STORAGE

#### S3
```bash
# "list S3 buckets" / "show my buckets"
aws s3api list-buckets --query 'Buckets[].[Name,CreationDate]' --output table

# "S3 bucket encryption for <name>"
aws s3api get-bucket-encryption --bucket <name>

# "S3 bucket versioning for <name>"
aws s3api get-bucket-versioning --bucket <name>

# "S3 public access settings for <name>"
aws s3api get-public-access-block --bucket <name>

# "S3 lifecycle rules for <name>"
aws s3api get-bucket-lifecycle-configuration --bucket <name>

# "S3 bucket policy for <name>"
aws s3api get-bucket-policy --bucket <name>

# "list objects in s3://<bucket>/<prefix>"
aws s3api list-objects-v2 --bucket <bucket> --prefix <prefix> \
  --query 'Contents[].[Key,Size,LastModified,StorageClass]' --output table
```

#### EBS & EFS
```bash
# "EBS volumes" / "list volumes"
aws ec2 describe-volumes \
  --query 'Volumes[].[VolumeId,Size,VolumeType,State,AvailabilityZone,Attachments[0].InstanceId]' --output table

# "unattached EBS volumes" / "unused volumes"
aws ec2 describe-volumes --filters Name=status,Values=available \
  --query 'Volumes[].[VolumeId,Size,VolumeType,CreateTime]' --output table

# "EBS snapshots I own"
aws ec2 describe-snapshots --owner-ids self \
  --query 'Snapshots[].[SnapshotId,VolumeId,State,StartTime]' --output table

# "EFS file systems"
aws efs describe-file-systems \
  --query 'FileSystems[].[FileSystemId,Name,LifeCycleState,SizeInBytes.Value,ThroughputMode]' --output table
```

---

### DATABASES

#### RDS
```bash
# "list RDS instances" / "show databases" / "what databases do I have"
aws rds describe-db-instances \
  --query 'DBInstances[].[DBInstanceIdentifier,DBInstanceClass,Engine,EngineVersion,DBInstanceStatus,MultiAZ,Endpoint.Address]' \
  --output table

# "Aurora clusters" / "RDS clusters"
aws rds describe-db-clusters \
  --query 'DBClusters[].[DBClusterIdentifier,Engine,EngineVersion,Status,MultiAZ,Endpoint]' --output table

# "RDS snapshots"
aws rds describe-db-snapshots \
  --query 'DBSnapshots[].[DBSnapshotIdentifier,DBInstanceIdentifier,Engine,Status,SnapshotCreateTime]' --output table

# "RDS parameter groups"
aws rds describe-db-parameter-groups \
  --query 'DBParameterGroups[].[DBParameterGroupName,DBParameterGroupFamily]' --output table

# "RDS subnet groups"
aws rds describe-db-subnet-groups \
  --query 'DBSubnetGroups[].[DBSubnetGroupName,VpcId]' --output table
```

#### DynamoDB
```bash
# "DynamoDB tables" / "list NoSQL tables"
aws dynamodb list-tables --query 'TableNames' --output table

# "DynamoDB table details for <name>"
aws dynamodb describe-table --table-name <name> \
  --query 'Table.[TableName,TableStatus,ItemCount,BillingModeSummary.BillingMode]'

# "DynamoDB backups"
aws dynamodb list-backups \
  --query 'BackupSummaries[].[TableName,BackupName,BackupStatus,BackupCreationDateTime]' --output table

# "DynamoDB global tables"
aws dynamodb list-global-tables \
  --query 'GlobalTables[].[GlobalTableName,ReplicationGroup[].RegionName]' --output table
```

#### ElastiCache & Redshift
```bash
# "ElastiCache clusters" / "Redis clusters"
aws elasticache describe-cache-clusters \
  --query 'CacheClusters[].[CacheClusterId,Engine,EngineVersion,CacheNodeType,CacheClusterStatus]' --output table

# "ElastiCache replication groups"
aws elasticache describe-replication-groups \
  --query 'ReplicationGroups[].[ReplicationGroupId,Status,AutomaticFailover]' --output table

# "Redshift clusters" / "data warehouse"
aws redshift describe-clusters \
  --query 'Clusters[].[ClusterIdentifier,ClusterStatus,NodeType,NumberOfNodes,Endpoint.Address]' --output table

# "DocumentDB clusters"
aws docdb describe-db-clusters \
  --query 'DBClusters[].[DBClusterIdentifier,Status,Engine,Endpoint]' --output table

# "Neptune clusters" / "graph databases"
aws neptune describe-db-clusters \
  --query 'DBClusters[].[DBClusterIdentifier,Status,Engine,Endpoint]' --output table
```

---

### NETWORKING

#### VPC & Subnets
```bash
# "list VPCs" / "show my VPCs"
aws ec2 describe-vpcs \
  --query 'Vpcs[].[VpcId,CidrBlock,IsDefault,Tags[?Key==`Name`].Value|[0],State]' --output table

# "subnets" / "list subnets"
aws ec2 describe-subnets \
  --query 'Subnets[].[SubnetId,VpcId,CidrBlock,AvailabilityZone,MapPublicIpOnLaunch,Tags[?Key==`Name`].Value|[0]]' --output table

# "public subnets"
aws ec2 describe-subnets --filters "Name=mapPublicIpOnLaunch,Values=true" \
  --query 'Subnets[].[SubnetId,VpcId,CidrBlock,AvailabilityZone]' --output table

# "security groups"
aws ec2 describe-security-groups \
  --query 'SecurityGroups[].[GroupId,GroupName,VpcId,Description]' --output table

# "security group rules for <group-id>"
aws ec2 describe-security-group-rules --filters "Name=group-id,Values=<id>" \
  --query 'SecurityGroupRules[].[IsEgress,IpProtocol,FromPort,ToPort,CidrIpv4,Description]' --output table

# "route tables"
aws ec2 describe-route-tables \
  --query 'RouteTables[].[RouteTableId,VpcId,Associations[0].SubnetId,Tags[?Key==`Name`].Value|[0]]' --output table

# "internet gateways" / "IGWs"
aws ec2 describe-internet-gateways \
  --query 'InternetGateways[].[InternetGatewayId,Attachments[0].VpcId,Tags[?Key==`Name`].Value|[0]]' --output table

# "NAT gateways"
aws ec2 describe-nat-gateways \
  --query 'NatGateways[].[NatGatewayId,VpcId,SubnetId,State,NatGatewayAddresses[0].PublicIp]' --output table

# "VPC endpoints"
aws ec2 describe-vpc-endpoints \
  --query 'VpcEndpoints[].[VpcEndpointId,VpcId,ServiceName,State,VpcEndpointType]' --output table

# "VPC peering connections"
aws ec2 describe-vpc-peering-connections \
  --query 'VpcPeeringConnections[].[VpcPeeringConnectionId,Status.Code,RequesterVpcInfo.VpcId,AccepterVpcInfo.VpcId]' --output table

# "NACLs" / "network ACLs"
aws ec2 describe-network-acls \
  --query 'NetworkAcls[].[NetworkAclId,VpcId,IsDefault]' --output table

# "Transit Gateways"
aws ec2 describe-transit-gateways \
  --query 'TransitGateways[].[TransitGatewayId,State,Description]' --output table
```

#### Load Balancers & DNS
```bash
# "load balancers" / "ALBs" / "NLBs"
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[].[LoadBalancerName,Type,Scheme,State.Code,DNSName]' --output table

# "target groups"
aws elbv2 describe-target-groups \
  --query 'TargetGroups[].[TargetGroupName,Protocol,Port,TargetType,VpcId]' --output table

# "target health for <target-group-arn>"
aws elbv2 describe-target-health --target-group-arn <arn> \
  --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State,TargetHealth.Description]' --output table

# "Route 53 hosted zones" / "DNS zones"
aws route53 list-hosted-zones \
  --query 'HostedZones[].[Id,Name,Config.PrivateZone,ResourceRecordSetCount]' --output table

# "DNS records in zone <id>"
aws route53 list-resource-record-sets --hosted-zone-id <id> \
  --query 'ResourceRecordSets[].[Name,Type,TTL]' --output table

# "CloudFront distributions"
aws cloudfront list-distributions \
  --query 'DistributionList.Items[].[Id,DomainName,Status,Origins.Items[0].DomainName]' --output table

# "VPN connections"
aws ec2 describe-vpn-connections \
  --query 'VpnConnections[].[VpnConnectionId,State,Type,CustomerGatewayId]' --output table

# "Direct Connect connections"
aws directconnect describe-connections \
  --query 'connections[].[connectionId,connectionName,connectionState,bandwidth]' --output table
```

---

### SECURITY & IDENTITY

#### IAM
```bash
# "IAM users" / "list users"
aws iam list-users \
  --query 'Users[].[UserName,UserId,CreateDate,PasswordLastUsed]' --output table

# "IAM roles" / "list roles"
aws iam list-roles \
  --query 'Roles[].[RoleName,RoleId,CreateDate]' --output table

# "IAM policies attached to role <name>"
aws iam list-attached-role-policies --role-name <name> \
  --query 'AttachedPolicies[].[PolicyName,PolicyArn]' --output table

# "IAM groups"
aws iam list-groups \
  --query 'Groups[].[GroupName,GroupId,CreateDate]' --output table

# "IAM policies (customer managed)"
aws iam list-policies --scope Local \
  --query 'Policies[].[PolicyName,AttachmentCount,CreateDate]' --output table

# "who has MFA enabled" / "MFA devices"
aws iam list-virtual-mfa-devices \
  --query 'VirtualMFADevices[].[SerialNumber,User.UserName,EnableDate]' --output table

# "IAM account password policy"
aws iam get-account-password-policy

# "IAM account summary"
aws iam get-account-summary
```

#### Secrets Manager
```bash
# "list secrets" / "Secrets Manager secrets" / "show secrets"
aws secretsmanager list-secrets \
  --query 'SecretList[].[Name,ARN,LastChangedDate,LastAccessedDate,Description]' --output table

# "secret metadata for <name>"
aws secretsmanager describe-secret --secret-id <name> \
  --query '{Name:Name,ARN:ARN,RotationEnabled:RotationEnabled,LastRotatedDate:LastRotatedDate,Tags:Tags}'

# "secrets with rotation enabled"
aws secretsmanager list-secrets \
  --query 'SecretList[?RotationEnabled==`true`].[Name,LastRotatedDate]' --output table
```

> ⚠️ **Note**: Secret **values** are never retrieved (`get-secret-value` is excluded). Only metadata is shown.

#### SSM Parameter Store
```bash
# "SSM parameters" / "Parameter Store"
aws ssm describe-parameters \
  --query 'Parameters[].[Name,Type,LastModifiedDate,Description]' --output table

# "SSM parameters by path <path>"
aws ssm describe-parameters \
  --parameter-filters "Key=Path,Values=<path>" \
  --query 'Parameters[].[Name,Type,LastModifiedDate]' --output table
```

> ⚠️ **Note**: Parameter **values** are never retrieved (`get-parameter` is excluded). Only metadata is shown.

#### KMS & Certificates
```bash
# "KMS keys" / "encryption keys"
aws kms list-keys --query 'Keys[].[KeyId,KeyArn]' --output table

# "KMS key details for <id>"
aws kms describe-key --key-id <id> \
  --query 'KeyMetadata.[KeyId,Description,KeyState,KeyUsage,CreationDate,Enabled]'

# "KMS aliases"
aws kms list-aliases \
  --query 'Aliases[].[AliasName,AliasArn,TargetKeyId]' --output table

# "SSL certificates" / "ACM certificates"
aws acm list-certificates \
  --query 'CertificateSummaryList[].[CertificateArn,DomainName,Status,RenewalEligibility]' --output table

# "certificate details for <arn>"
aws acm describe-certificate --certificate-arn <arn> \
  --query 'Certificate.[DomainName,Status,NotAfter,NotBefore,InUseBy]'
```

#### GuardDuty, Security Hub & Config
```bash
# "GuardDuty detectors"
aws guardduty list-detectors --query 'DetectorIds' --output table

# "GuardDuty findings"
aws guardduty list-findings --detector-id <id> --query 'FindingIds' --output table

# "Security Hub findings"
aws securityhub get-findings \
  --query 'Findings[].[Title,Severity.Label,WorkflowState,UpdatedAt]' --output table

# "AWS Config rules"
aws configservice describe-config-rules \
  --query 'ConfigRules[].[ConfigRuleName,ConfigRuleState,Source.SourceIdentifier]' --output table

# "non-compliant resources"
aws configservice get-compliance-summary-by-config-rule \
  --query 'ComplianceSummariesByConfigRule[].[ConfigRuleName,Compliance.ComplianceType]' --output table
```

---

### MESSAGING & EVENTS

```bash
# "SQS queues" / "list queues"
aws sqs list-queues --query 'QueueUrls' --output table

# "SQS queue details / message count for <url>"
aws sqs get-queue-attributes --queue-url <url> \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible,ApproximateAgeOfOldestMessage

# "SNS topics"
aws sns list-topics --query 'Topics[].TopicArn' --output table

# "SNS subscriptions"
aws sns list-subscriptions \
  --query 'Subscriptions[].[SubscriptionArn,Protocol,Endpoint,TopicArn]' --output table

# "EventBridge rules"
aws events list-rules \
  --query 'Rules[].[Name,State,ScheduleExpression,EventPattern]' --output table

# "EventBridge event buses"
aws events list-event-buses \
  --query 'EventBuses[].[Name,Arn]' --output table

# "Kinesis streams"
aws kinesis list-streams --query 'StreamNames' --output table

# "Kinesis Firehose delivery streams"
aws firehose list-delivery-streams --query 'DeliveryStreamNames' --output table
```

---

### API GATEWAY & SERVERLESS

```bash
# "API Gateway APIs" / "REST APIs"
aws apigateway get-rest-apis \
  --query 'items[].[id,name,description,createdDate]' --output table

# "HTTP APIs" / "API Gateway v2"
aws apigatewayv2 get-apis \
  --query 'Items[].[ApiId,Name,ProtocolType,ApiEndpoint,CreatedDate]' --output table

# "Step Functions state machines" / "workflows"
aws stepfunctions list-state-machines \
  --query 'stateMachines[].[name,stateMachineArn,type,creationDate]' --output table

# "Step Functions executions for <arn>"
aws stepfunctions list-executions --state-machine-arn <arn> \
  --query 'executions[].[name,status,startDate,stopDate]' --output table
```

---

### MONITORING & OBSERVABILITY

```bash
# "CloudWatch alarms" / "list alarms"
aws cloudwatch describe-alarms \
  --query 'MetricAlarms[].[AlarmName,StateValue,MetricName,Namespace,Threshold]' --output table

# "alarms in ALARM state" / "triggered alarms"
aws cloudwatch describe-alarms --state-value ALARM \
  --query 'MetricAlarms[].[AlarmName,MetricName,StateReason]' --output table

# "CloudWatch dashboards"
aws cloudwatch list-dashboards \
  --query 'DashboardEntries[].[DashboardName,LastModified,Size]' --output table

# "CloudWatch log groups"
aws logs describe-log-groups \
  --query 'logGroups[].[logGroupName,retentionInDays,storedBytes]' --output table

# "CloudTrail trails"
aws cloudtrail describe-trails \
  --query 'trailList[].[Name,S3BucketName,IsMultiRegionTrail,LogFileValidationEnabled]' --output table

# "ECR repositories" / "container registries"
aws ecr describe-repositories \
  --query 'repositories[].[repositoryName,repositoryUri,createdAt]' --output table
```

---

### COST & BILLING

```bash
# "current month cost" / "how much am I spending"
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY --metrics BlendedCost \
  --query 'ResultsByTime[].[TimePeriod.Start,Total.BlendedCost.Amount,Total.BlendedCost.Unit]' \
  --output table

# "cost by service" / "spending breakdown"
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '30 days ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE --output table

# "AWS Budgets"
aws budgets describe-budgets \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --query 'Budgets[].[BudgetName,BudgetType,BudgetLimit.Amount,CalculatedSpend.ActualSpend.Amount]' \
  --output table

# "Trusted Advisor recommendations"
aws support describe-trusted-advisor-checks --language en \
  --query 'checks[].[id,name,category]' --output table
```

---

### CROSS-SERVICE QUERIES

```bash
# "resources tagged Environment=production" / "all production resources"
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Environment,Values=production \
  --query 'ResourceTagMappingList[].[ResourceARN]' --output table

# "all resources tagged <key>=<value>"
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=<key>,Values=<value> \
  --query 'ResourceTagMappingList[].[ResourceARN,Tags]' --output table

# "inventory of all resources" (AWS Config)
aws configservice list-discovered-resources --resource-type <type> \
  --query 'resourceIdentifiers[].[resourceType,resourceId,resourceName]' --output table
```

---

## Output Formatting Rules

1. Always use `--output table` for list results; use `--output json` only when deep detail is explicitly requested
2. Always use `--query` to extract only relevant fields — never dump raw JSON
3. For large result sets (>20 items), show a count first, then offer to filter
4. When a command returns nothing, explain why (wrong region, no resources, insufficient permissions)
5. Offer to drill into a specific resource: "Found 47 EC2 instances. Filter by state, type, or tag?"

## Error Handling

| Error | Response |
|---|---|
| `AccessDenied` | "You don't have permission to list [resource]. Required: `<service>:<Action>`." |
| `NoCredentialProviders` | "Run `aws configure` or set `AWS_PROFILE`." |
| Empty result | "No [resources] found in [region]. Check another region?" |
| Invalid identifier | "Could not find '[name]'. Check the name or provide the resource ID." |
