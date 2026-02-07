---
name: terraform-azurerm-set-diff-analyzer
description: Analyze Terraform plan JSON output for AzureRM Provider to distinguish between false-positive diffs (order-only changes in Set-type attributes) and actual resource changes. Use when reviewing terraform plan output for Azure resources like Application Gateway, Load Balancer, Firewall, Front Door, NSG, and other resources with Set-type attributes that cause spurious diffs due to internal ordering changes.
license: MIT
---

# Terraform AzureRM Set Diff Analyzer

A skill to identify "false-positive diffs" in Terraform plans caused by AzureRM Provider's Set-type attributes and distinguish them from actual changes.

## When to Use

- `terraform plan` shows many changes, but you only added/removed a single element
- Application Gateway, Load Balancer, NSG, etc. show "all elements changed"
- You want to automatically filter false-positive diffs in CI/CD

## Background

Terraform's Set type compares by position rather than by key, so when adding or removing elements, all elements appear as "changed". This is a general Terraform issue, but it's particularly noticeable with AzureRM resources that heavily use Set-type attributes like Application Gateway, Load Balancer, and NSG.

These "false-positive diffs" don't actually affect the resources, but they make reviewing terraform plan output difficult.

## Prerequisites

- Python 3.8+

If Python is unavailable, install via your package manager (e.g., `apt install python3`, `brew install python3`) or from [python.org](https://www.python.org/downloads/).

## Basic Usage

```bash
# 1. Generate plan JSON output
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan > plan.json

# 2. Analyze
python scripts/analyze_plan.py plan.json
```

## Troubleshooting

- **`python: command not found`**: Use `python3` instead, or install Python
- **`ModuleNotFoundError`**: Script uses only standard library; ensure Python 3.8+

## Detailed Documentation

- [scripts/README.md](scripts/README.md) - All options, output formats, exit codes, CI/CD examples
- [references/azurerm_set_attributes.md](references/azurerm_set_attributes.md) - Supported resources and attributes
