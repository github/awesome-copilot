---
name: remediation-bash-generator
description: Generate production-ready, idempotent Bash remediation and rollback scripts for cloud infrastructure findings. Use this skill whenever a remediation requires executable shell automation for AWS, Azure, GCP, Kubernetes, Linux, or other infrastructure resources.
---

# Production Bash Remediation Generator

## Purpose

Your responsibility is to generate production-ready Bash scripts that remediate infrastructure findings safely and consistently.

This skill generates only:

- `bash_script`
- `rollback_script`

Do **not** generate explanations, summaries, remediation reasoning, validation reports, or metadata. Your sole responsibility is producing high-quality executable shell scripts.

The generated scripts should be suitable for production environments and meet the expectations of experienced DevOps, CloudOps, Platform Engineering, and SRE teams.

---

# Primary Objectives

Every generated script must satisfy the following goals:

- Safe to execute
- Safe to execute repeatedly
- Easy to read
- Easy to audit
- Easy to troubleshoot
- Production-ready
- Minimal operational risk

Generate scripts that would pass a production infrastructure code review with little or no modification.

---

# Script Structure

Every remediation script must follow this structure.

## 1. Interpreter

Always begin with:

```bash
#!/bin/bash
set -euo pipefail
```

Never omit either line.

---

## 2. Purpose Header

Immediately describe the purpose of the script.

Example:

```bash
# -----------------------------------------------------------------------------
# Remediation:
# Enable versioning on an S3 bucket.
# -----------------------------------------------------------------------------
```

Keep the description concise and focused.

---

## 3. Dependency Validation

Validate every required CLI tool before performing any operation.

Examples include:

- aws
- jq
- kubectl
- az
- gcloud
- terraform
- openssl
- curl

Only validate tools actually required by the remediation.

Use:

```bash
command -v
```

Provide clear error messages.

Example:

```text
Error:
AWS CLI is not installed or is not available in PATH.
```

Never allow the script to fail later because a dependency is missing.

---

## 4. Resource Inputs

Never hardcode customer-specific values.

Always expose required resource identifiers as placeholders.

Examples:

```text
<bucket-name>

<instance-id>

<volume-id>

<security-group-id>

<vpc-id>

<role-name>

<policy-arn>

<kms-key-id>
```

Prefer defining variables near the beginning of the script.

Example:

```bash
BUCKET_NAME="<bucket-name>"
```

---

## 5. Input Validation

Validate every required input before continuing.

Examples include:

- Empty variables
- Missing identifiers
- Invalid parameter combinations

Return clear, actionable error messages.

---

## 6. Current State Inspection

Always inspect the resource before making changes.

Never assume the finding still exists.

Prefer read operations before write operations.

Examples:

- describe
- get
- show
- list

Determine whether remediation is actually required.

---

## 7. Idempotency

Every script must be idempotent.

Running the script multiple times must always produce a predictable outcome.

If the resource is already compliant:

- Explain why
- Skip remediation
- Exit successfully

Example:

```text
Versioning is already enabled.

No remediation required.
```

The script must never create duplicate resources or repeatedly apply the same configuration.

---

## 8. Minimal Remediation

Only perform the minimum changes required to resolve the finding.

Do not:

- modify unrelated settings
- update optional configurations
- reconfigure unrelated resources

Minimize blast radius.

---

## 9. Progress Logging

Provide concise progress messages.

Examples:

```text
Checking current configuration...

Applying remediation...

Validating changes...
```

Avoid excessive logging.

Avoid decorative formatting.

---

## 10. Inline Comments

Use comments to explain non-obvious logic.

Comments should explain **why** something is being done rather than describing obvious shell syntax.

Avoid unnecessary comments.

---

## 11. Automated Validation

Every remediation script must automatically validate its own work.

Examples:

```bash
aws ...

kubectl ...

gcloud ...

az ...
```

Verify the desired infrastructure state rather than relying only on successful command execution.

Whenever practical, confirm the resource is now compliant.

---

## 12. Completion

Finish with a concise success message.

Example:

```text
Remediation completed successfully.
```

---

# Rollback Script Requirements

Generate a rollback script whenever remediation is reversible.

The rollback script must:

- Reverse only the changes introduced by the remediation script.
- Never modify unrelated infrastructure.
- Never assume the rollback is always required.
- Validate the current state before reverting changes.
- Be fully idempotent.

Rollback scripts must follow the same engineering standards as remediation scripts.

Specifically they must include:

- Dependency validation
- Input validation
- Current state inspection
- Idempotency
- Progress logging
- Validation
- Completion message

If rollback cannot be implemented safely or automatically, clearly state that rollback cannot be automated instead of generating an unsafe rollback script.

---

# Engineering Standards

## Readability

Use descriptive variable names.

Prefer:

```bash
SECURITY_GROUP_ID
```

instead of:

```bash
SG
```

Write code that is easy to understand during production incidents.

---

## Simplicity

Prefer straightforward Bash.

Avoid clever one-liners.

Prioritize maintainability over brevity.

---

## Defensive Programming

Assume any of the following may occur:

- Missing resources
- Deleted resources
- Incorrect identifiers
- Missing permissions
- Temporary cloud API failures
- Partial infrastructure state

Handle failures gracefully with clear error messages.

---

## Deterministic Behaviour

Given the same infrastructure state, the script should always produce the same outcome.

Avoid unnecessary randomness or non-deterministic behaviour.

---

## Minimal Blast Radius

Modify only the resources required for remediation.

Never make unrelated infrastructure changes.

---

## Production Safety

Never:

- Disable security controls
- Reduce IAM permissions unnecessarily
- Ignore command failures
- Suppress errors
- Embed credentials
- Hardcode customer identifiers
- Assume default AWS regions
- Assume default cloud accounts

Always prefer explicit configuration.

---

# Cloud CLI Best Practices

When using cloud provider CLIs:

- Read before writing.
- Validate resource existence before modification.
- Use explicit CLI parameters.
- Avoid relying on CLI defaults.
- Prefer structured output (`--output json`) when parsing responses.
- Use `jq` only when structured parsing improves reliability.

---

# Output Quality Checklist

Before returning either script, verify that all of the following are true:

- Starts with `#!/bin/bash`
- Uses `set -euo pipefail`
- Validates required CLI tools
- Uses placeholders instead of customer-specific values
- Validates all required inputs
- Checks current resource state before modification
- Is fully idempotent
- Includes meaningful inline comments
- Performs only the required remediation
- Includes automated post-remediation validation
- Produces clear success or skip messages
- Follows production-grade Bash coding practices

If any requirement is not satisfied, improve the script before returning it.

---

# Guiding Principle

Always generate Bash scripts that an experienced DevOps Engineer, Cloud Engineer, Site Reliability Engineer (SRE), or Platform Engineer would confidently execute in a production environment without requiring significant refactoring.
