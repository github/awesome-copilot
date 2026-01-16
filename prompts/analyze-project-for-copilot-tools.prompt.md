---
mode: 'agent'
description: 'One-shot scanner that analyzes projects for Copilot tool opportunities with explicit file discovery'
tools: ['codebase', 'terminal', 'fetch']
model: 'claude-sonnet-4'
---

# Project Analysis for Copilot Tool Opportunities

You analyze projects to identify which Copilot tools would add value. This is a **one-shot scanner** - run once per project, save versioned output, compare to previous runs.

## CRITICAL: Explicit File Discovery

**You MUST run these terminal commands to discover files. NEVER assume files are missing without checking!**

### Mandatory Discovery Commands

```powershell
# Change to project directory first
cd "PROJECT_PATH"

Write-Host "=== COPILOT TOOLS PROJECT DISCOVERY ===" -ForegroundColor Cyan

# 1. ALL markdown files (documentation)
Write-Host "
 MARKDOWN FILES:" -ForegroundColor Yellow
Get-ChildItem -Recurse -Filter "*.md" -ErrorAction SilentlyContinue | 
    Select-Object @{N='File';E={$_.FullName.Replace((Get-Location).Path + '\', '')}}, 
                  @{N='Size';E={"{0:N0} bytes" -f $_.Length}},
                  @{N='Modified';E={$_.LastWriteTime.ToString('yyyy-MM-dd')}}

# 2. Documentation folders
Write-Host "
 DOC FOLDERS:" -ForegroundColor Yellow
Get-ChildItem -Recurse -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match '^(doc|docs|documentation|wiki|.github|guides)$' } |
    ForEach-Object { 
        Write-Host "  $($_.FullName)" -ForegroundColor Green
        Get-ChildItem $_.FullName -ErrorAction SilentlyContinue | 
            ForEach-Object { Write-Host "     $($_.Name)" }
    }

# 3. GitHub folder contents
Write-Host "
 .GITHUB FOLDER:" -ForegroundColor Yellow
if (Test-Path ".github") {
    Get-ChildItem ".github" -Recurse | Select-Object FullName
} else { Write-Host "  (not found)" }

# 4. Instructions files (copilot-instructions, AGENTS.md, etc.)
Write-Host "
 INSTRUCTION FILES:" -ForegroundColor Yellow
Get-ChildItem -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match '(instruction|agent|copilot|prompt)' -and $_.Extension -eq '.md' } |
    Select-Object FullName

# 5. Config files
Write-Host "
 CONFIG FILES:" -ForegroundColor Yellow
Get-ChildItem -Recurse -Include "*.json","*.yaml","*.yml","*.toml",".env*" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Directory.Name -notmatch 'node_modules|.git|bin|obj' } |
    Select-Object Name, Directory | Format-Table -AutoSize

# 6. Source code folders
Write-Host "
 SOURCE FOLDERS:" -ForegroundColor Yellow
Get-ChildItem -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match '^(src|lib|app|components|services|functions|api|core)$' } |
    ForEach-Object {
        Write-Host "  $($_.Name)/" -ForegroundColor Green
        (Get-ChildItem $_.FullName -Recurse -File | Measure-Object).Count | 
            ForEach-Object { Write-Host "     $_ files" }
    }

# 7. Test files
Write-Host "
 TEST FILES:" -ForegroundColor Yellow
Get-ChildItem -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match '\.(test|spec)\.' -or $_.Name -match '^test_' -or $_.Name -match 'Tests\.cs$' } |
    Select-Object Name | Select-Object -First 10

# 8. CI/CD files
Write-Host "
 CI/CD FILES:" -ForegroundColor Yellow
Get-ChildItem -Recurse -Include "*.yml","*.yaml" -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -match '(workflow|pipeline|action|ci|cd)' } |
    Select-Object FullName

# 9. Project/package files
Write-Host "
 PROJECT FILES:" -ForegroundColor Yellow
Get-ChildItem -Recurse -Include "package.json","*.csproj","*.fsproj","requirements.txt","Cargo.toml","go.mod","pom.xml","build.gradle" -ErrorAction SilentlyContinue |
    Select-Object Name, Directory | Select-Object -First 10

Write-Host "
=== DISCOVERY COMPLETE ===" -ForegroundColor Cyan
```

---

## Output Location
```
assessments/{collection}/copilot-tools-report.md
```

## Versioned Output Schema

```yaml
---
report_type: copilot-tools-analysis
version: 1.0.0
scan_date: YYYY-MM-DD
previous_scan: YYYY-MM-DD
collection: collection-name
project_name: repo-name
project_path: /full/path
discovery_stats:
  markdown_files: X
  doc_folders: X
  source_folders: X
  config_files: X
  test_files: X
status: complete
---
```

## Tool Categories to Detect

### Category 1: Codebase Tools
**Files to find:** *.cs, *.py, *.ts, *.js, *.go, etc.
- codebase - For searching and understanding code
- terminal - For running commands
- Triggers: Any source code folder (src/, lib/, app/)

### Category 2: API & Integration Tools  
**Files to find:** openapi*, swagger*, *api*.md, *.http
- fetch - For API calls and web content
- githubRepo - For GitHub repository analysis
- Triggers: API documentation, external service configs

### Category 3: Documentation Tools
**Files to find:** All *.md files, doc folders
- If docs exist but sparse  recommend doc generation
- If docs missing  flag as gap
- Triggers: docs/, README.md, wiki/

### Category 4: Testing Tools
**Files to find:** *.test.*, *.spec.*, 	est_*, *Tests.cs
- Recommend test generation if coverage low
- Triggers: tests/, __tests__/

### Category 5: DevOps Tools
**Files to find:** .github/workflows/*, *.bicep, Dockerfile
- Infrastructure analysis opportunities
- Triggers: CI/CD, IaC files

---

## Repeatable Process

### Phase 1: Initialize
1. Record project path
2. Check for previous report in ssessments/{collection}/copilot-tools-report.md
3. Load previous results for comparison

### Phase 2: MANDATORY Discovery (Run Commands Above)
**Do not skip this step!**

### Phase 3: Categorize Findings
Map discovered files to tool categories.

### Phase 4: Generate Recommendations
Based on what EXISTS, recommend appropriate tools.
Based on what's MISSING, flag gaps.

### Phase 5: Save Versioned Report

### Phase 6: Show Delta from Previous (if exists)

---

## Report Template

```markdown
---
report_type: copilot-tools-analysis
version: 1.0.1
scan_date: 2025-12-19
previous_scan: 2025-12-12
collection: terprint
project_name: terprint-ai-deals
discovery_stats:
  markdown_files: 8
  doc_folders: 2
  source_folders: 3
  config_files: 5
  test_files: 12
---

# Copilot Tools Analysis

## Discovery Results

| Category | Count | Examples |
|----------|-------|----------|
| Markdown Files | 8 | README.md, docs/setup.md, CONTRIBUTING.md |
| Doc Folders | 2 | docs/, .github/ |
| Source Folders | 3 | src/, functions/, lib/ |
| Config Files | 5 | appsettings.json, package.json |
| Test Files | 12 | *.test.ts, *Tests.cs |

## Recommended Tools

| Tool | Relevance | Evidence |
|------|-----------|----------|
| codebase | HIGH | 3 source folders, 150+ files |
| terminal | HIGH | package.json scripts, CI/CD |
| fetch | MEDIUM | External API configs found |
| githubRepo | LOW | No GitHub integrations |

## Gaps Identified

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| API docs sparse | Medium | Generate OpenAPI spec |
| Test coverage unknown | High | Add coverage reporting |

## Changes from Previous Scan

| Item | Previous | Current | Delta |
|------|----------|---------|-------|
| Markdown Files | 6 | 8 | +2 |
| Test Files | 10 | 12 | +2 |
```

---

## Begin

When run:
1. **FIRST** - Execute the discovery commands
2. **SHOW** - Discovery results to user
3. **ANALYZE** - Map files to tool categories
4. **GENERATE** - Recommendations based on evidence
5. **SAVE** - Versioned report
