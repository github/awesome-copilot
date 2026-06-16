---
name: 'security-loop'
description: 'Security validation skill embedded in each analysis cycle: not only in onboarding but in each recommendation and output'
---

# Continuous Security Loop

## Purpose
Security is not a specific startup step. It is a gate that is executed in each cycle of analysis, recommendation and delivery of results. This skill is automatically invoked before any output that may contain sensitive information.

## When Activated
The security loop is executed at **three moments** of each session:

```
START           →  Security preflight on source of truth
     ↓
ANALYSIS        →  Validate that findings do not expose unnecessary business details
     ↓
DELIVERY        →  Sanitize outputs before sharing outside the environment
     ↓
(return to ANALYSIS if there are more cycles)
```

## Gate 1: Start Preflight
- Verify that the source of truth does not contain clear secrets
- Confirm that there is no productive business SQL without anonymization
- Execute: `pwsh -File scripts/security-preflight.ps1`
- Expected result: PASS. If FAIL → sanitize before continuing.

## Gate 2: Validation in Analysis
Before including any fragment in a report or recommendation, check:

```
Is this data necessary to explain the finding?
     YES -> Can it be expressed as metadata (object name, metric, pattern)?
                     YES -> use metadata, not literal SQL
                     NO  -> anonymize: replace real names with descriptive aliases
     NO  -> omit
```

Data that should **never** appear in shareable outputs:
- Complete connection strings
- Internal server names
- Users or passwords
- Data from real rows (even if they are examples)
- Names of tables/columns that reveal proprietary business model

## Gate 3: Delivery Sanitation
Before any external output (reporting, sharing, collaboration):
- Execute: `pwsh -File scripts/sanitize-and-validate.ps1 -Destination "C:\temp\output"`
- Check PASS in VALIDATION-REPORT.md of the output
- Confirm that the shared content is only what is necessary

## Minimum Data Principle
> Share the finding, not the data that originated it.

| Instead of | Use |
|-------------|-----|
| `SELECT * FROM dbo.Clientes WHERE DNI = '12345678A'` | "Queries without selective predicate were detected in the customer table" |
| `Server=PROD-SQL-01;Database=ERP_PROD;User=sa;Password=...` | "[anonymized connection to origin]" |
| `sp_CalcularComisionVendedor_v3` | "Commission calculation SP (critical, 47 dependencies)" |

## Loop Checklist
- [ ] Preflight executed and PASS at startup
- [ ] Each finding expressed in terms of pattern/metric, not literal data
- [ ] Sanitized and validated external outputs
- [ ] Local source of truth intact (no business modifications)
- [ ] Traceability: SANITIZATION-REPORT and VALIDATION-REPORT generated
