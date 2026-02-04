# Terraform AzureRM Set Diff Analyzer Script

A Python script that analyzes Terraform plan JSON and identifies "false-positive diffs" in AzureRM Set-type attributes.

## Overview

AzureRM Provider's Set-type attributes (such as `backend_address_pool`, `security_rule`, etc.) don't guarantee order, so when adding or removing elements, all elements appear as "changed". This script distinguishes such "false-positive diffs" from actual changes.

### Use Cases

- As an **Agent Skill** (recommended)
- As a **CLI tool** for manual execution
- For automated analysis in **CI/CD pipelines**

## Prerequisites

- Python 3.8 or higher
- No additional packages required (uses only standard library)

## Usage

### Basic Usage

```bash
# Read from file
python analyze_plan.py plan.json

# Read from stdin
terraform show -json plan.tfplan | python analyze_plan.py
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--format` | `-f` | Output format (markdown/json/summary) | markdown |
| `--exit-code` | `-e` | Return exit code based on changes | false |
| `--quiet` | `-q` | Suppress warnings | false |
| `--verbose` | `-v` | Show detailed warnings | false |
| `--ignore-case` | - | Compare values case-insensitively | false |
| `--attributes` | - | Path to custom attribute definition file | (built-in) |
| `--include` | - | Filter resources to analyze (can specify multiple) | (all) |
| `--exclude` | - | Filter resources to exclude (can specify multiple) | (none) |

### Exit Codes (with `--exit-code`)

| Code | Meaning |
|------|---------|
| 0 | No changes, or order-only changes |
| 1 | Actual Set attribute changes |
| 2 | Resource replacement (delete + create) |
| 3 | Error |

## Output Formats

### Markdown (default)

Human-readable format for PR comments and reports.

```bash
python analyze_plan.py plan.json --format markdown
```

### JSON

Structured data for programmatic processing.

```bash
python analyze_plan.py plan.json --format json
```

Example output:
```json
{
  "summary": {
    "order_only_count": 3,
    "actual_set_changes_count": 1,
    "replace_count": 0
  },
  "has_real_changes": true,
  "resources": [...],
  "warnings": []
}
```

### Summary

One-line summary for CI/CD logs.

```bash
python analyze_plan.py plan.json --format summary
```

Example output:
```
🟢 3 order-only | 🟡 1 set changes
```

## CI/CD Pipeline Usage

### GitHub Actions

```yaml
name: Terraform Plan Analysis

on:
  pull_request:
    paths:
      - '**.tf'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        
      - name: Terraform Init & Plan
        run: |
          terraform init
          terraform plan -out=plan.tfplan
          terraform show -json plan.tfplan > plan.json
          
      - name: Analyze Set Diff
        run: |
          python path/to/analyze_plan.py plan.json --format markdown > analysis.md
          
      - name: Comment PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: analysis.md
```

### GitHub Actions (Gate with Exit Code)

```yaml
      - name: Analyze and Gate
        run: |
          python path/to/analyze_plan.py plan.json --exit-code --format summary
        # Fail on exit code 2 (resource replacement)
        continue-on-error: false
```

### Azure Pipelines

```yaml
- task: TerraformCLI@0
  inputs:
    command: 'plan'
    commandOptions: '-out=plan.tfplan'

- script: |
    terraform show -json plan.tfplan > plan.json
    python scripts/analyze_plan.py plan.json --format markdown > $(Build.ArtifactStagingDirectory)/analysis.md
  displayName: 'Analyze Plan'

- task: PublishBuildArtifacts@1
  inputs:
    pathToPublish: '$(Build.ArtifactStagingDirectory)/analysis.md'
    artifactName: 'plan-analysis'
```

### Filtering Examples

Analyze only specific resources:
```bash
python analyze_plan.py plan.json --include application_gateway --include load_balancer
```

Exclude specific resources:
```bash
python analyze_plan.py plan.json --exclude virtual_network
```

## Interpreting Results

| Category | Meaning | Recommended Action |
|----------|---------|-------------------|
| 🟢 Order-only | False-positive diff, no actual change | Safe to ignore |
| 🟡 Actual change | Set element added/removed/modified | Review the content, usually in-place update |
| 🔴 Resource replacement | delete + create | Check for downtime impact |

## Custom Attribute Definitions

By default, uses `references/azurerm_set_attributes.json`, but you can specify a custom definition file:

```bash
python analyze_plan.py plan.json --attributes /path/to/custom_attributes.json
```

See `references/azurerm_set_attributes.md` for the definition file format.

## Limitations

- Only AzureRM resources (`azurerm_*`) are supported
- Some resources/attributes may not be supported
- Comparisons may be incomplete for attributes containing `after_unknown` (values determined after apply)
- Comparisons may be incomplete for sensitive attributes (they are masked)

## Related Documentation

- [SKILL.md](../SKILL.md) - Usage as an Agent Skill
- [azurerm_set_attributes.md](../references/azurerm_set_attributes.md) - Attribute definition reference
