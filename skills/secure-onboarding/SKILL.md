---
name: 'secure-onboarding'
description: 'Skill to start a DB project from scratch with security-first and local source of truth'
---

# Secure Onboarding and Source of Truth

## Purpose
Prepare a complete DBA session without exposing business, creating a reusable local source of truth so as not to depend on continuous connections to the source database.

## Operating Rule (MANDATORY)

Onboarding is the master start-up flow: it executes the entire technical pipeline autonomously and even leaves reports and plans ready for review.

Mandatory stopping point: before generating `.docx`, the process must stop for human review of `reports/` and `plans/`.

## Entries
- DBA project name
- One of these origins:
  - Connection string (for initial discovery only)
  - Folder with schemas/SQL scripts
  - Database project (dacpac/sqlproj/scripts)

## Departures
- Local structure in `workspaces/<Project>/` inside the repo
- **Complete source of truth** with all objects in the DB
- PASS/FAIL configuration and preflight manifest
- Technical reports and plans in `workspaces/<Project>/reports` and `workspaces/<Project>/plans`
- Word deliverables in `workspaces/<Project>/delivery/*.docx` (only after human approval)

## Source of Truth — Complete Structure (REQUIRED)

The source of truth is not just the SQL schema. It is the complete inventory of everything that exists in the DB. No agent analyzes without this structure being generated:

```
workspaces/<Project>/
  fuente-de-verdad/
    manifest.json               ← DB configuration + preflight
    schema/db.sql               ← complete schema (DDL + SPs)
    tables-by-schema.json       ← table inventory by schema
    procs-by-schema.json        ← SP inventory by schema
    views-by-schema.json        ← view inventory by schema     ← NEW
    functions-by-schema.json    ← function inventory by schema ← NEW
  plans/
    full-db-sp-classification.json ← CRUD/Simple/Complex/Critical classification
    full-db-sp-classification.md
  reports/
    business-rules/
      critical-rules-catalog.md  ← business-rule patterns in Critical SPs ← NEW
      complex-rules-catalog.md   ← business-rule patterns in Complex SPs  ← NEW
```

## Bootstrap Steps (Order Required)

### Step 0: Security Preflight (FIRST)
```powershell
pwsh -File .github/scripts/security-preflight.ps1
if ($LASTEXITCODE -ne 0) { Write-Error 'Security preflight FAILED. Sanitize before continuing.'; exit 1 }
```

This gate always runs first.

### Step 1: Schema and base objects
```powershell
# If schema already exists in input/:
pwsh -File .github/scripts/refresh-source-of-truth.ps1 -ProjectName "ProjectName"
```
Generates: `schema/db.sql`, `tables-by-schema.json`, `procs-by-schema.json`, `manifest.json`

### Step 2: Inventory of views and functions
```powershell
# Extract views and functions from generated schema
$lines = [IO.File]::ReadAllLines("workspaces/$project/fuente-de-verdad/schema/db.sql")
$v=@{}; $f=@{}
foreach($l in $lines) {
    if ($l -match 'VIEW\s+\[?(\w+)\]?\.\[?(\w+)\]?') { $s=$matches[1];$n=$matches[2]; if(!$v[$s]){$v[$s]=@()};$v[$s]+=$n }
    if ($l -match 'FUNCTION\s+\[?(\w+)\]?\.\[?(\w+)\]?') { $s=$matches[1];$n=$matches[2]; if(!$f[$s]){$f[$s]=@()};$f[$s]+=$n }
}
@{total=($v.Values|%{$_.Count}|Measure-Object -Sum).Sum; bySchema=$v} | ConvertTo-Json -Depth 4 | Out-File "workspaces/$project/fuente-de-verdad/views-by-schema.json" -Encoding UTF8
@{total=($f.Values|%{$_.Count}|Measure-Object -Sum).Sum; bySchema=$f} | ConvertTo-Json -Depth 4 | Out-File "workspaces/$project/fuente-de-verdad/functions-by-schema.json" -Encoding UTF8
```

### Step 3: Classification of SPs
```powershell
pwsh -File .github/scripts/analyze-sp-migration.ps1 -ProjectName "NombreProject"
```
Generates: `plans/full-db-sp-classification.json`

### Step 4: Business Rule Catalogs (REQUIRED before any analysis)
```powershell
pwsh -File .github/scripts/extract-critical-business-rules.ps1 -Category Critical
pwsh -File .github/scripts/extract-critical-business-rules.ps1 -Category Complex
```
Generates: `reports/business-rules/critical-rules-catalog.md` and `complex-rules-catalog.md`

### Final verification
```powershell
$p = "workspaces/ProjectName"
@(
    "$p/fuente-de-verdad/schema/db.sql",
    "$p/fuente-de-verdad/tables-by-schema.json",
    "$p/fuente-de-verdad/procs-by-schema.json",
    "$p/fuente-de-verdad/views-by-schema.json",
    "$p/fuente-de-verdad/functions-by-schema.json",
    "$p/plans/full-db-sp-classification.json",
    "$p/reports/business-rules/critical-rules-catalog.md",
    "$p/reports/business-rules/complex-rules-catalog.md"
) | ForEach-Object { "$_ -> $(if(Test-Path $_){'✅'}else{'❌ MISSING'})" }
```

**If any file is missing, execute the corresponding step before continuing.**

### Step 5: Orchestration of technical analysis

With the complete source of truth and catalogs, onboarding triggers orchestration of DBA analyses (dependencies, impact, performance, security/reliability, modernization) and generates project artifacts in `reports/` and `plans/`.

Rule: any finding must be supported by reading the actual SQL in `schema/db.sql`.

### Step 6: STOP human control (HITL mandatory)

Before creating the `.docx`, onboarding must stop and request explicit user review before any further action.

Review checklist:
- `workspaces/<Project>/fuente-de-verdad/manifest.json`
- `workspaces/<Project>/fuente-de-verdad/schema/db.sql`
- `workspaces/<Project>/fuente-de-verdad/tables-by-schema.json`
- `workspaces/<Project>/fuente-de-verdad/procs-by-schema.json`
- `workspaces/<Project>/fuente-de-verdad/views-by-schema.json`
- `workspaces/<Project>/fuente-de-verdad/functions-by-schema.json`
- `workspaces/<Project>/reports/`
- `workspaces/<Project>/plans/`

With explicit approval, Step 7 is executed to generate Word.

Without this approval, you will not continue to subsequent phases.

### Step 7: Generation of Word deliverables

Mandatory precondition:
- Complete validated source of truth
- Reports and plans generated
- HITL approval of Step 6

Onboarding invokes the delivery flow to generate documents `.docx` in `workspaces/<Project>/delivery/`.

Minimum expected outputs:
- `<Project>-INFORME-CLIENTE.docx`
- `<Project>-INFORME-FUNCIONAL.docx`
- `<Project>-ASSESSMENT.docx`
- `<Project>-INFORME-TECHLEAD.docx`
- `<Project>-INFORME-DBA.docx`
