---
name: github-actions-workflow-linter
description: Lints GitHub Actions / GitLab CI workflow YAML files for unpinned actions, unsafe secret usage, deprecated commands, and security anti-patterns. Use this skill whenever a user asks to review, audit, lint, or harden a CI/CD workflow file, or mentions ".github/workflows", "GitHub Actions", "GitLab CI", "pipeline security", or "workflow YAML".
---

# GitHub Actions Workflow Linter

## Purpose

This skill teaches Copilot to perform a security- and best-practice-focused lint pass over CI/CD workflow definitions (primarily GitHub Actions `.yml`/`.yaml` files under `.github/workflows/`, and secondarily GitLab CI `.gitlab-ci.yml` files). It should trigger automatically whenever the user's request or open file context involves reviewing, auditing, fixing, or generating a CI/CD pipeline definition.

## When to use this skill

Activate this skill when:
- The user asks to "lint", "review", "audit", "harden", or "check" a workflow file.
- The active file matches `.github/workflows/*.yml`, `.github/workflows/*.yaml`, or `.gitlab-ci.yml`.
- The user pastes YAML content that contains `on:`, `jobs:`, `steps:`, or `uses:` keys typical of CI pipelines.
- The user asks general questions like "is my pipeline secure?" or "why is my CI action failing/flaky?".

## What the skill should check

When invoked, walk through the workflow file and evaluate it against the following categories. For each finding, report: **file/line reference**, **severity** (Critical / High / Medium / Low), **explanation**, and a **concrete fixed snippet**.

### 1. Action pinning
- Flag any `uses:` reference pinned to a mutable tag (e.g. `actions/checkout@v4`, `@main`, `@master`) instead of a full-length commit SHA.
- Recommend pinning to the commit SHA, with the human-readable version as a trailing comment, e.g.:
  ```yaml
  uses: actions/checkout@8f4b7f84864484a7bde6d277f8f2f8a1a3f5be4 # v4.1.1
  ```
- Flag third-party actions (not `actions/*` or `github/*`) that are unpinned as **Critical**, since these represent supply-chain risk.

### 2. Secrets handling
- Flag secrets interpolated directly into `run:` shell commands (e.g. `run: curl -H "Authorization: ${{ secrets.TOKEN }}"`), since this can leak the value into shell history, process lists, or debug logs. Recommend passing secrets via `env:` instead.
- Flag workflows that echo, print, or log a secret.
- Flag `pull_request_target` or `workflow_run` triggers combined with checkout of untrusted PR head refs plus access to secrets — this is a known privilege-escalation pattern.
- Confirm that secrets are only referenced inside `${{ secrets.NAME }}` expressions and never hardcoded as plaintext values.

### 3. Permissions
- Flag workflows/jobs missing an explicit `permissions:` block (GitHub defaults to broad read/write `GITHUB_TOKEN` permissions unless restricted at the org level).
- Recommend the principle of least privilege, e.g.:
  ```yaml
  permissions:
    contents: read
  ```
  and only elevate (`contents: write`, `id-token: write`, etc.) on the specific job that needs it.
- Flag `permissions: write-all` as **Critical**.

### 4. Deprecated / unsafe commands
- Flag deprecated workflow commands such as `::set-output`, `::save-state`, `::add-path`, or `::set-env`, and recommend the modern replacements (`$GITHUB_OUTPUT`, `$GITHUB_STATE`, `$GITHUB_PATH`, `$GITHUB_ENV` files).
- Flag deprecated/EOL runner images (e.g. `ubuntu-18.04`, `windows-2016`) and outdated major versions of common actions (`actions/checkout@v1`, `actions/setup-node@v1`).
- Flag use of `actions/create-release` or other archived/unmaintained actions with a suggested modern alternative.

### 5. General pipeline hygiene
- Flag jobs/steps without a `timeout-minutes`, which can hang indefinitely and burn CI minutes.
- Flag missing or ineffective dependency caching (`actions/cache`, or language-specific cache options in `setup-node`/`setup-python`/etc.) on jobs that install dependencies.
- Flag self-hosted runners used on workflows triggered by `pull_request` from forks (risk of arbitrary code execution on infra).
- Flag missing `concurrency:` groups on deploy workflows, which can allow overlapping/conflicting deployments.

## Output format

Respond with a structured report:

```markdown
## Workflow Lint Report: <filename>

### 🔴 Critical
- **Line 12** — Unpinned third-party action `foo/bar-action@v1`. Supply-chain risk...
  Fix: `uses: foo/bar-action@<sha> # v1.2.3`

### 🟠 High
...

### 🟡 Medium
...

### ✅ Passed checks
- Explicit `permissions:` block present
- ...
```

If the user asks for an automatic fix rather than just a report, apply the fixes directly to the file and summarize what changed.

## Notes
- Never invent a commit SHA — if pinning an action, tell the user to run `git ls-remote --tags <repo>` or use `gh` / the marketplace page to resolve the correct SHA, or use a placeholder clearly marked `<RESOLVE_SHA>`.
- Do not flag internal/private actions hosted in the same organization as unpinned unless explicitly asked, since org policy may already restrict who can push to those repos — but still recommend it as best practice.
- Keep explanations concise and actionable; this skill is meant to save review time, not replace it with a wall of text.
