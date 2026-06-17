# AWS Cloud Development Plugin

Comprehensive AWS cloud development tools including Infrastructure as Code, serverless functions, architecture patterns, and cost optimization for building scalable cloud applications.

## Installation

```bash
# Using Copilot CLI
copilot plugin install aws-cloud-development@awesome-copilot
```

## What's Included

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/aws-cloud-development:aws-cost-optimize` | Analyze AWS resources used in the app (IaC files and/or resources in a target account/region) and optimize costs - creating GitHub issues for identified optimizations. |
| `/aws-cloud-development:aws-resource-health-diagnose` | Analyze AWS resource health, diagnose issues from CloudWatch logs and metrics, and create a remediation plan for identified problems. |
| `/aws-cloud-development:aws-resource-query` | Query any AWS resource using natural language (EC2, S3, RDS, Lambda, VPC, IAM, Secrets Manager, and more). Strictly read-only — no writes or deletes. |
| `/aws-cloud-development:aws-well-architected-review` | Perform an AWS Well-Architected Framework review of the current workload IaC and architecture, generating findings and GitHub issues for improvements. |

### Agents

| Agent | Description |
|-------|-------------|
| `aws-principal-architect` | Provide expert AWS Principal Architect guidance using AWS Well-Architected Framework principles and AWS best practices. |
| `aws-serverless-architect` | Provide expert AWS Serverless Architect guidance focusing on event-driven architectures, Lambda, API Gateway, and serverless best practices. |
| `terraform-aws-planning` | Act as implementation planner for your AWS Terraform Infrastructure as Code task. |
| `terraform-aws-implement` | Act as an AWS Terraform Infrastructure as Code coding specialist that creates and reviews Terraform for AWS resources. |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
