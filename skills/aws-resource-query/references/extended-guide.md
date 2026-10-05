# AWS Resource Query: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Intent → Command Mapping

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
