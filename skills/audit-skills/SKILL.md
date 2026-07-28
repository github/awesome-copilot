---
name: audit-skills
description: 'Install the audit-skills package — language- and framework-agnostic audit checklists for security, correctness, and operability (IDOR, injection, CSRF, mass assignment, atomicity, idempotency, N+1, migration safety, and more), plus remediation patterns. USE THIS SKILL when the user asks to "add audit skills", "install security audit checklists", or wants per-topic audit commands like /audit-idor or /audit-injection.'
---

# Audit Skills

This skill installs the [audit-skills](https://github.com/danygiguere/audit-skills) package — audit checklists for security, correctness, and operability.

## What it covers

- **Access & data security** — authorization, authn & session, token validation, IDOR, data exposure, crypto, output encoding (XSS), tenant isolation, CSRF, mass assignment
- **Input & API** — injection, deserialization, config, secrets, API contract validation, file handling, SSRF, parser differentials
- **Correctness** — atomicity, idempotency, background work, state & race conditions, exception handling, discarded async, cardinality, numeric precision, time & clock
- **Operability** — N+1, observability, migration safety, resource limits, blocking I/O, schema design, statelessness, caching
- **Fixes** — remediation patterns for authorization, correctness/async, and observability findings

See [the full audit table](https://github.com/danygiguere/audit-skills#the-audits) for what each checklist looks for.

## How it works

Every checklist is written as **invariants and detection smells**, not framework APIs, so the same content audits a Rails app, a Spring service, or an Express API. It installs an `/audit` router skill (full audit) plus one thin skill per topic (`/audit-idor`, `/audit-injection`, `/audit-atomicity`, `/audit-fix-authz`, …), all prefixed `audit` so they stay grouped.

Audits **find and report only** — they never edit code. Fixing is a separate, explicit step. Every command defaults to the current diff; name a file, folder, or branch to audit something else.

This folder keeps the package discoverable here while the source of truth stays in [danygiguere/audit-skills](https://github.com/danygiguere/audit-skills), so an install always picks up the current version.

## Steps

1. Read [README § Install](https://github.com/danygiguere/audit-skills#install) in the source repo and follow it. Those instructions are authoritative — they carry the current release tag and the supported install methods.
