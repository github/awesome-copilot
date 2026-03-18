---
name: openclaw-github-repo-commander
description: |
  A 7-stage super workflow for comprehensive GitHub repository management. Use this skill when:
  - Auditing a GitHub repository for low-value files, duplicate skills, or hardcoded secrets
  - Cleaning up a repository (removing junk files, empty directories, node_modules commits)
  - Reviewing or creating pull requests with structured analysis
  - Refactoring a codebase using a systematic multi-stage approach
  - Performing competitor analysis against similar open-source projects
  - Running /super-workflow on any repo URL for deep optimization
  - The user says "optimize my repo", "clean up this library", "audit my GitHub repo", or "compare with competitors"
---
# OpenClaw GitHub Repo Commander

A 7-stage super workflow for comprehensive GitHub repository management, cleanup, and optimization.

## Overview

This skill provides a structured, repeatable 7-stage methodology for auditing, cleaning, and optimizing GitHub repositories. It combines automated scripts with AI-driven analysis to identify issues, compare against competitors, and deliver measurable improvements.

The workflow is inspired by the super-workflow pattern and adapted specifically for GitHub repository operations using the `gh` CLI.

## When to Use This Skill

- Use when a repository has accumulated technical debt (junk files, duplicates, secrets)
- Use when you want a structured PR review process with competitor benchmarking
- Use when creating a new project and want to establish quality standards from day one
- Use when the user asks to "audit", "clean up", or "optimize" any GitHub repository

## How It Works

### Stage 1: Intake
Clone the repository, define success criteria, and establish baseline metrics (file count, size, skill count).

### Stage 2: Execution
Run the automated audit script (`scripts/repo-audit.sh`) to check for:
- Hardcoded secrets and credentials
- Tracked `node_modules/` or build artifacts
- Empty directories
- Large files (>1MB)
- Missing `.gitignore` rules
- Broken internal links

### Stage 3: Reflection
Deep manual review of content quality, documentation consistency, and structural issues beyond what automation catches.

### Stage 4: Competitor Analysis
Search GitHub for similar repositories, compare documentation standards, feature coverage, and community adoption metrics.

### Stage 5: Synthesis
Consolidate findings from Stages 3–4 into a prioritized action plan (P0/P1/P2).

### Stage 6: Iteration
Execute the action plan: delete low-value files, fix security issues, upgrade documentation, add missing structure.

### Stage 7: Validation
Re-run the audit script, verify all changes, push to GitHub, and report results.

## Examples

### Example 1: Full Repository Audit

```
/openclaw-github-repo-commander https://github.com/owner/my-repo
```

The skill will run all 7 stages and produce a detailed report with before/after metrics.

### Example 2: Quick Cleanup

```
Clean up my GitHub repo at https://github.com/owner/my-repo — remove junk files and fix secrets
```

### Example 3: Competitor Benchmarking

```
Compare https://github.com/owner/my-skill with top similar repos on GitHub
```

## Best Practices

- ✅ Always run Stage 7 validation before pushing changes
- ✅ Use the automated audit script for consistent, repeatable checks
- ✅ Commit changes with semantic commit messages (`chore:`, `fix:`, `docs:`)
- ❌ Don't skip Stage 4 — competitor analysis often reveals blind spots
- ❌ Don't commit `node_modules/` or build artifacts

## Security & Safety Notes

- The audit script (`scripts/repo-audit.sh`) scans for common secret patterns (`ghp_`, `sk-`, `AKIA`, etc.)
- All operations use the `gh` CLI with the user's existing authentication — no credentials are stored
- The skill excludes `.github/workflows/` from secret scanning to avoid false positives

## Source

**Repository**: [wd041216-bit/openclaw-github-repo-commander](https://github.com/wd041216-bit/openclaw-github-repo-commander)

**License**: MIT
