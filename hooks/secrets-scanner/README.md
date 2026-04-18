---
name: 'Secrets Scanner'
description: 'Scans files modified during a Copilot coding agent session for leaked secrets, credentials, and sensitive data'
tags: ['security', 'secrets', 'scanning', 'session-end']
---

# Secrets Scanner Hook

Scans files modified during a GitHub Copilot coding agent session for accidentally leaked secrets, credentials, API keys, and other sensitive data before they are committed.

## Overview

AI coding agents generate and modify code rapidly, which increases the risk of hardcoded secrets slipping into the codebase. This hook acts as a safety net by scanning all modified files at session end for 20+ categories of secret patterns, including:

- **Cloud credentials**: AWS access keys, GCP service account keys, Azure client secrets
- **Platform tokens**: GitHub PATs, npm tokens, Slack tokens, Stripe keys
- **Private keys**: RSA, EC, OpenSSH, PGP, DSA private key blocks
- **Connection strings**: Database URIs (PostgreSQL, MongoDB, MySQL, Redis, MSSQL)
- **Generic secrets**: API keys, passwords, bearer tokens, JWTs
- **Internal infrastructure**: Private IP addresses with ports

## Features

- **Two scan modes**: `warn` (log only) or `block` (exit non-zero to prevent commit)
- **Two scan scopes**: `diff` (modified files vs HEAD) or `staged` (git-staged files only)
- **Smart filtering**: Skips binary files, lock files, and placeholder/example values
- **Allowlist support**: Exclude known false positives via `SECRETS_ALLOWLIST`
- **Structured logging**: JSON Lines output for integration with monitoring tools
- **Redacted output**: Findings are truncated in logs to avoid re-exposing secrets
- **Zero dependencies**: Uses only standard Unix tools (`grep`, `file`, `git`)

## Installation

1. Copy the hook folder to your repository:

   ```bash
   cp -r hooks/secrets-scanner .github/hooks/
   ```

2. Ensure the script is executable:

   ```bash
   chmod +x .github/hooks/secrets-scanner/scan-secrets.sh
   ```

3. Create the logs directory and add it to `.gitignore`:

   ```bash
   mkdir -p logs/copilot/secrets
   echo "logs/" >> .gitignore
   ```

4. Commit the hook configuration to your repository's default branch.

## Configuration

The hook is configured in `hooks.json` to run on the `sessionEnd` event:

```json
{
  "version": 1,
  "hooks": {
    "sessionEnd": [
      {
        "type": "command",
        "bash": ".github/hooks/secrets-scanner/scan-secrets.sh",
        "cwd": ".",
        "env": {
          "SCAN_MODE": "warn",
          "SCAN_SCOPE": "diff"
        },
        "timeoutSec": 30
      }
    ]
  }
}
```

### Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `SCAN_MODE` | `warn`, `block` | `warn` | `warn` logs findings only; `block` exits non-zero to prevent auto-commit |
| `SCAN_SCOPE` | `diff`, `staged` | `diff` | `diff` scans uncommitted changes vs HEAD; `staged` scans only staged files |
| `SKIP_SECRETS_SCAN` | `true` | unset | Disable the scanner entirely |
| `SECRETS_LOG_DIR` | path | `logs/copilot/secrets` | Directory where scan logs are written |
| `SECRETS_ALLOWLIST` | comma-separated | unset | Patterns to ignore (e.g., `test_key_123,example.com`) |

## How It Works

1. When a Copilot coding agent session ends, the hook executes
2. Collects all modified files using `git diff` (respects the configured scope)
3. Filters out binary files and lock files
4. Scans each text file line-by-line against 20+ regex patterns for known secret formats
5. Skips matches that look like placeholders (e.g., values containing `example`, `changeme`, `your_`)
6. Checks matches against the allowlist if configured
7. Reports findings with file path, line number, pattern name, and severity
8. Writes a structured JSON log entry for audit purposes
9. In `block` mode, exits non-zero to signal the agent to stop before committing

## Detected Secret Patterns

| Pattern | Severity | Example Match |
|---------|----------|---------------|
| `AWS_ACCESS_KEY` | critical | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_KEY` | critical | `aws_secret_access_key = wJalr...` |
| `GCP_SERVICE_ACCOUNT` | critical | `"type": "service_account"` |
| `GCP_API_KEY` | high | `AIzaSyC...` |
| `AZURE_CLIENT_SECRET` | critical | `azure_client_secret = ...` |
| `GITHUB_PAT` | critical | `ghp_xxxxxxxxxxxx...` |
| `GITHUB_FINE_GRAINED_PAT` | critical | `github_pat_...` |
| `PRIVATE_KEY` | critical | `-----BEGIN RSA PRIVATE KEY-----` |
| `GENERIC_SECRET` | high | `api_key = "sk-..."` |
| `CONNECTION_STRING` | high | `postgresql://user:pass@host/db` |
| `SLACK_TOKEN` | high | `xoxb-...` |
| `STRIPE_SECRET_KEY` | critical | `sk_live_...` |
| `NPM_TOKEN` | high | `npm_...` |
| `JWT_TOKEN` | medium | `eyJhbGci...` |
| `INTERNAL_IP_PORT` | medium | `192.168.1.1:8080` |

See the full list in `scan-secrets.sh`.

## Example Output

### Clean scan

```
🔍 Scanning 5 modified file(s) for secrets...
✅ No secrets detected in 5 scanned file(s)
```

### Findings detected (warn mode)

```
🔍 Scanning 3 modified file(s) for secrets...

⚠️  Found 2 potential secret(s) in modified files:

  FILE                                     LINE   PATTERN                      SEVERITY
  ----                                     ----   -------                      --------
  src/config.ts                            12     GITHUB_PAT                   critical
  .env.local                               3      CONNECTION_STRING            high

💡 Review the findings above. Set SCAN_MODE=block to prevent commits with secrets.
```

### Findings detected (block mode)

```
🔍 Scanning 3 modified file(s) for secrets...

⚠️  Found 1 potential secret(s) in modified files:

  FILE                                     LINE   PATTERN                      SEVERITY
  ----                                     ----   -------                      --------
  lib/auth.py                              45     AWS_ACCESS_KEY               critical

🚫 Session blocked: resolve the findings above before committing.
   Set SCAN_MODE=warn to log without blocking, or add patterns to SECRETS_ALLOWLIST.
```

## Log Format

Scan events are written to `logs/copilot/secrets/scan.log` in JSON Lines format:

```json
{"timestamp":"2026-03-13T10:30:00Z","event":"secrets_found","mode":"warn","scope":"diff","files_scanned":3,"finding_count":2,"findings":[{"file":"src/config.ts","line":12,"pattern":"GITHUB_PAT","severity":"critical","match":"ghp_...xyz1"}]}
```

```json
{"timestamp":"2026-03-13T10:30:00Z","event":"scan_complete","mode":"warn","scope":"diff","status":"clean","files_scanned":5}
```

## Pairing with Other Hooks

This hook pairs well with the **Session Auto-Commit** hook. When both are installed, order them so that `secrets-scanner` runs first:

1. Secrets scanner runs at `sessionEnd`, catches leaked secrets
2. Auto-commit runs at `sessionEnd`, only commits if all previous hooks pass

Set `SCAN_MODE=block` to prevent auto-commit when secrets are detected.

## Customization

- **Add custom patterns**: Edit the `PATTERNS` array in `scan-secrets.sh` to add project-specific secret formats
- **Adjust sensitivity**: Change severity levels or remove patterns that generate false positives
- **Allowlist known values**: Use `SECRETS_ALLOWLIST` for test fixtures or known safe patterns
- **Change log location**: Set `SECRETS_LOG_DIR` to route logs to your preferred directory

## Disabling

To temporarily disable the scanner:

- Set `SKIP_SECRETS_SCAN=true` in the hook environment
- Or remove the `sessionEnd` entry from `hooks.json`

## Limitations

- Pattern-based detection; does not perform entropy analysis or contextual validation
- May produce false positives for test fixtures or example code (use the allowlist to suppress these)
- Scans only text files; binary secrets (keystores, certificates in DER format) are not detected
- Requires `git` to be available in the execution environment
