# Boost DBA 360 Plugin

Boost DBA 360 is an AI-augmented SQL Server DBA toolkit for secure analysis, performance tuning, operational risk control, and structured modernization.

## What This Plugin Includes

- 18 specialized DBA agents
- 20 reusable skills
- Security-first onboarding and source-of-truth workflow
- Dependency and impact analysis
- Performance diagnostics and query optimization
- Reliability, governance, and high-availability assessments
- Migration planning, scripting, and test-data generation

## Recommended Usage

- First run per project: use full assessment mode to establish a complete baseline.
- Subsequent runs: use lean mode and activate specialized agents only when triggered by real needs.

## Secure Onboarding and Anonymization

When you initialize a workspace with `run-dba360-wizard.ps1`, choose one anonymization mode:

- `-Anonymize ask`: interactive decision at startup
- `-Anonymize yes`: end-to-end anonymization
- `-Anonymize no`: keep real identifiers

## Quick Start

```powershell
# 1) Recommended: ask at startup
pwsh -File .github/scripts/run-dba360-wizard.ps1 -ProjectName "MyProject" -SchemaPath "input" -Anonymize ask

# 2) Force full anonymization (external sharing)
pwsh -File .github/scripts/run-dba360-wizard.ps1 -ProjectName "MyProject" -SchemaPath "input" -Anonymize yes

# 3) Keep real identifiers (controlled internal use)
pwsh -File .github/scripts/run-dba360-wizard.ps1 -ProjectName "MyProject" -SchemaPath "input" -Anonymize no
```

## Integration Notes

- Analysis artifacts are generated under `workspaces/<Project>/`.
- Security and source-of-truth gates are mandatory before deep analysis.
- Word exports and delivery artifacts should be reviewed by a human before external sharing.

## Installation

```bash
copilot plugin install boostdba@awesome-copilot
```
