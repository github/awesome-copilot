---
name: azure-compliance
description: "Comprehensive Azure compliance and security auditing capabilities including best practices assessment, Key Vault expiration monitoring, and resource configuration validation. USE FOR: compliance scan, security audit, azqr, Azure best practices, Key Vault expiration check, compliance assessment, resource review, configuration validation, expired certificates, expiring secrets, orphaned resources, policy compliance, security posture evaluation. DO NOT USE FOR: deploying resources (use azure-deploy), cost analysis alone (use azure-cost-optimization), active security hardening (use azure-security-hardening), general Azure Advisor queries (use azure-observability)."
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---

# Azure Compliance & Security Auditing

## Quick Reference

| Property | Details |
|---|---|
| Best for | Compliance scans, security audits, Key Vault expiration checks |
| Primary capabilities | Comprehensive Resources Assessment, Key Vault Expiration Monitoring |
| MCP tools | azqr, subscription and resource group listing, Key Vault item inspection |

## When to Use This Skill

- Run azqr or Azure Quick Review for compliance assessment
- Validate Azure resource configuration against best practices
- Identify orphaned or misconfigured resources
- Audit Key Vault keys, secrets, and certificates for expiration

## Skill Activation Triggers

Activate this skill when user wants to:
- Check Azure compliance or best practices
- Assess Azure resources for configuration issues
- Run azqr or Azure Quick Review
- Identify orphaned or misconfigured resources
- Review Azure security posture
- "Show me expired certificates/keys/secrets in my Key Vault"
- "Check what's expiring in the next 30 days"
- "Audit my Key Vault for compliance"
- "Find secrets without expiration dates"
- "Check certificate expiration dates"

## Prerequisites

- Authentication: user is logged in to Azure via `az login`
- Permissions to read resource configuration and Key Vault metadata

## Assessments

| Assessment | Reference |
|------------|-----------|
| Comprehensive Compliance (azqr) | [references/azure-quick-review.md](references/azure-quick-review.md) |
| Key Vault Expiration | [references/azure-keyvault-expiration-audit.md](references/azure-keyvault-expiration-audit.md) |
| Resource Graph Queries | [references/azure-resource-graph.md](references/azure-resource-graph.md) |

## MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp_azure_mcp_extension_azqr` | Run azqr compliance scans |
| `mcp_azure_mcp_subscription_list` | List available subscriptions |
| `mcp_azure_mcp_group_list` | List resource groups |
| `keyvault_key_list` | List all keys in vault |
| `keyvault_key_get` | Get key details including expiration |
| `keyvault_secret_list` | List all secrets in vault |
| `keyvault_secret_get` | Get secret details including expiration |
| `keyvault_certificate_list` | List all certificates in vault |
| `keyvault_certificate_get` | Get certificate details including expiration |

## Assessment Workflow

1. Select scope (subscription or resource group) for Comprehensive Resources Assessment.
2. Run azqr and capture output artifacts.
3. Analyze Scan Results and summarize findings and recommendations.
4. Review Key Vault Expiration Monitoring output for keys, secrets, and certificates.
5. Classify issues and propose remediation or fix steps for each finding.

### Priority Classification

| Priority | Guidance |
|---|---|
| Critical | Immediate remediation required for high-impact exposure |
| High | Resolve within days to reduce risk |
| Medium | Plan a resolution in the next sprint |
| Low | Track and fix during regular maintenance |

## Error Handling

| Error | Message | Remediation |
|---|---|---|
| Authentication required | "Please login" | Run `az login` and retry |
| Access denied | "Forbidden" | Confirm permissions and fix role assignments |
| Missing resource | "Not found" | Verify subscription and resource group selection |

## Best Practices

- Run compliance scans on a regular schedule (weekly or monthly)
- Track findings over time and verify remediation effectiveness
- Separate compliance reporting from remediation execution
- Keep Key Vault expiration policies documented and enforced

## SDK Quick References

For programmatic Key Vault access, see the condensed SDK guides:

- **Key Vault (Python)**: [Secrets/Keys/Certs](references/sdk/azure-keyvault-py.md)
- **Secrets**: [TypeScript](references/sdk/azure-keyvault-secrets-ts.md) | [Rust](references/sdk/azure-keyvault-secrets-rust.md) | [Java](references/sdk/azure-security-keyvault-secrets-java.md)
- **Keys**: [.NET](references/sdk/azure-security-keyvault-keys-dotnet.md) | [Java](references/sdk/azure-security-keyvault-keys-java.md) | [TypeScript](references/sdk/azure-keyvault-keys-ts.md) | [Rust](references/sdk/azure-keyvault-keys-rust.md)
- **Certificates**: [Rust](references/sdk/azure-keyvault-certificates-rust.md)

