---
name: superpowers-verification-gate
description: Use before declaring work done. Validate behavior with reproducible evidence, identify residual risk, and classify unresolved issues by severity.
---

# Superpowers Verification Gate

## Goal

Prevent false completion claims.

## Required Evidence

1. Commands executed for verification.
2. Test results summary.
3. Files materially changed.
4. Any known limitations or follow-up items.

## Severity Model

- Critical: incorrect behavior, data loss, or security concern.
- Important: likely regression or missing required behavior.
- Minor: non-blocking quality issues.

## Rules

- Never claim success without command-based evidence.
- If evidence is partial, say what is missing and why.
- Confirm changed behavior against acceptance criteria, not assumptions.

## Completion Gate

Work is done only if no Critical or Important issues remain unresolved.
