---
name: skill-security-audit
description: Audit a third-party Agent Skill, MCP server, connector, or desktop extension before installation by tracing code, dependencies, permissions, credentials, data flow, and irreversible actions.
---

# Skill Security Audit

## Overview

Review an unfamiliar Agent Skill, MCP server, connector, or desktop extension before installation. This workflow is read-only by default: do not install dependencies, execute project code, sign in, provide credentials, or connect the project to a real account during static review.

## When to Use This Skill

- Use before installing an unfamiliar Skill, MCP server, connector, plugin, or desktop extension.
- Use when a project handles files, credentials, browser sessions, external accounts, network requests, or destructive actions.
- Use when a release, binary, dependency, or remote installer cannot be independently verified.

## How It Works

1. Record the exact repository, revision or release, license, archive status, latest meaningful update, and files reviewed. State any scope limitation.
2. Read the complete `SKILL.md` or equivalent instructions and every file it directly invokes. Follow references to scripts, hooks, manifests, package-install steps, binaries, remote URLs, environment variables, and bundled assets.
3. Inventory filesystem, command, network, browser, account, publishing, messaging, deletion, payment, credential, persistence, and self-update capabilities.
4. Trace sensitive data from its source to local stores, subprocesses, logs, models, APIs, MCP servers, analytics services, and other network destinations. Missing documentation is an unresolved question, not proof that data stays local.
5. Inspect dependency manifests, lockfiles, install scripts, and release provenance. Note unpinned remote execution, broad dependencies, opaque binaries, and mismatches between source and distributed artifacts.
6. Separate confirmed findings from contextual risks and unanswered questions. Cite file paths, line numbers, configuration fields, commands, or primary documentation for material claims.
7. Propose a minimal-permission test using disposable data or accounts; do not run it without explicit user approval.

## Examples

### Example 1: Local read-only Skill

Input: a repository containing only `SKILL.md` and Markdown references, with no scripts, dependencies, credentials, or network instructions.

Report: record the reviewed revision and files, mark command/network/credential capabilities as not observed in scope, identify missing license or provenance evidence, and recommend a disposable-data trial only after the remaining questions are resolved.

### Example 2: MCP server with a token

Input: a server whose setup reads `API_TOKEN` and whose tools can create or delete records.

Report: trace the token and request destinations, classify write/delete capability separately from read access, require a least-privilege test account and action-time confirmation, and do not run it with production credentials during review.

## Output

Begin with the audited identity and one verdict:

- **Lower observed risk**: no material concern was found in the reviewed scope; this is not a guarantee.
- **Review required**: important behavior, provenance, permissions, or data flow remains unclear.
- **High observed risk**: confirmed behavior could expose sensitive data, weaken account or device security, cause irreversible action, or bypass informed control.

Then provide:

1. Scope and limitations.
2. A capability and permission table.
3. A data-flow table.
4. Findings ordered by severity, with evidence, impact, and mitigation.
5. Unanswered questions.
6. A minimal-permission test plan.

## Best Practices

- Prefer implementation and current primary documentation over badges, screenshots, descriptions, or popularity.
- Pin revisions and inspect manifests, lockfiles, checksums, and release provenance.
- Use disposable data, least privilege, localhost binding, dry runs, backups, confirmation gates, and rollback where applicable.
- Mark unknown behavior explicitly and preserve the exact reviewed revision.
- Do not call a project safe, malicious, official, or compliant without evidence for that claim.
- Do not execute install commands, remote scripts, binaries, account actions, or credential flows during static review.

## Security & Safety Notes

Static review cannot prove runtime behavior or the contents of an opaque remote service. A green validator, marketplace entry, star count, or successful installation is evidence about only that narrow property, never a safety certificate. Stop if the requested review would require real credentials, production data, or an unapproved external action.

## Limitations

- The audit is bounded by the public revision and files that can be inspected.
- A missing policy or undocumented data destination remains unresolved; it must not be silently inferred away.
- Risk severity depends on capability, exposure, control, and reversibility, not on keywords alone.
