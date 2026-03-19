---
name: secret-scanning
description: 'Guide for configuring and managing GitHub secret scanning, push protection, custom patterns, secret alert remediation, and pre-commit secret scanning via the GitHub MCP Server in AI coding agents. Use this skill when enabling secret scanning, setting up push protection, defining custom patterns, triaging alerts, resolving blocked pushes, or scanning code changes for secrets before committing.'
---

# Secret Scanning

This skill provides procedural guidance for configuring GitHub secret scanning — detecting leaked credentials, preventing secret pushes, defining custom patterns, and managing alerts.

## When to Use This Skill

Use this skill when the request involves:

- Enabling or configuring secret scanning for a repository or organization
- Setting up push protection to block secrets before they reach the repository
- Defining custom secret patterns with regular expressions
- Resolving a blocked push from the command line
- Triaging, dismissing, or remediating secret scanning alerts
- Configuring delegated bypass for push protection
- Excluding directories from secret scanning via `secret_scanning.yml`
- Understanding alert types (user, partner, push protection)
- Enabling validity checks or extended metadata checks
- Scanning local code changes for secrets before committing (via MCP / AI coding agent)
- Using the GitHub MCP Server's secret scanning tool in an agentic workflow

## How Secret Scanning Works

Secret scanning automatically detects exposed credentials across:

- Entire Git history on all branches
- Issue descriptions, comments, and titles (open and closed)
- Pull request titles, descriptions, and comments
- GitHub Discussions titles, descriptions, and comments
- Wikis and secret gists

### Availability

| Repository Type | Availability |
|---|---|
| Public repos | Automatic, free |
| Private/internal (org-owned) | Requires GitHub Secret Protection on Team/Enterprise Cloud |
| User-owned | Enterprise Cloud with Enterprise Managed Users |

## Core Workflow — Enable Secret Scanning

### Step 1: Enable Secret Protection

1. Navigate to repository **Settings** → **Advanced Security**
2. Click **Enable** next to "Secret Protection"
3. Confirm by clicking **Enable Secret Protection**

For organizations, use security configurations to enable at scale:
- Settings → Advanced Security → Global settings → Security configurations

### Step 2: Enable Push Protection

Push protection blocks secrets during the push process — before they reach the repository.

1. Navigate to repository **Settings** → **Advanced Security**
2. Enable "Push protection" under Secret Protection

Push protection blocks secrets in:
- Command line pushes
- GitHub UI commits
- File uploads
- REST API requests
- REST API content creation endpoints

### Step 3: Configure Exclusions (Optional)

Create `.github/secret_scanning.yml` to auto-close alerts for specific directories:

```yaml
paths-ignore:
  - "docs/**"
  - "test/fixtures/**"
  - "**/*.example"
```

**Limits:**
- Maximum 1,000 entries in `paths-ignore`
- File must be under 1 MB
- Excluded paths also skip push protection checks

**Best practices:**
- Be as specific as possible with exclusion paths
- Add comments explaining why each path is excluded
- Review exclusions periodically — remove stale entries
- Inform the security team about exclusions

### Step 4: Enable Additional Features (Optional)

**Non-provider patterns** — detect private keys, connection strings, generic API keys:
- Settings → Advanced Security → enable "Scan for non-provider patterns"

**AI-powered generic secret detection** — uses Copilot to detect unstructured secrets like passwords:
- Settings → Advanced Security → enable "Use AI detection"

**Validity checks** — verify if detected secrets are still active:
- Settings → Advanced Security → enable "Validity checks"
- GitHub periodically tests detected credentials against provider APIs
- Status shown in alert: `active`, `inactive`, or `unknown`

**Extended metadata checks** — additional context about who owns a secret:
- Requires validity checks to be enabled first
- Helps prioritize remediation and identify responsible teams

## Core Workflow — Resolve Blocked Pushes

When push protection blocks a push from the command line:

### Option A: Remove the Secret

**If the secret is in the latest commit:**
```bash
# Remove the secret from the file
# Then amend the commit
git commit --amend --all
git push
```

**If the secret is in an earlier commit:**
```bash
# Find the earliest commit containing the secret
git log

# Start interactive rebase before that commit
git rebase -i <COMMIT-ID>~1

# Change 'pick' to 'edit' for the offending commit
# Remove the secret, then:
git add .
git commit --amend
git rebase --continue
git push
```

### Option B: Bypass Push Protection

1. Visit the URL returned in the push error message (as the same user)
2. Select a bypass reason:
   - **It's used in tests** — alert created and auto-closed
   - **It's a false positive** — alert created and auto-closed
   - **I'll fix it later** — open alert created
3. Click **Allow me to push this secret**
4. Re-push within 3 hours

### Option C: Request Bypass Privileges

If delegated bypass is enabled and you lack bypass privileges:
1. Visit the URL from the push error
2. Add a comment explaining why the secret is safe
3. Click **Submit request**
4. Wait for email notification of approval/denial
5. If approved, push the commit; if denied, remove the secret

> For detailed bypass and delegated bypass workflows, search `references/push-protection.md`.

## Custom Patterns

Define organization-specific secret patterns using regular expressions.

### Quick Setup

1. Settings → Advanced Security → Custom patterns → **New pattern**
2. Enter pattern name and regex for secret format
3. Add a sample test string
4. Click **Save and dry run** to test (up to 1,000 results)
5. Review results for false positives
6. Click **Publish pattern**
7. Optionally enable push protection for the pattern

### Scopes

Custom patterns can be defined at:
- **Repository level** — applies to that repo only
- **Organization level** — applies to all repos with secret scanning enabled
- **Enterprise level** — applies across all organizations

### Copilot-Assisted Pattern Generation

Use Copilot secret scanning to generate regex from a text description of the secret type, including optional example strings.

> For detailed custom pattern configuration, search `references/custom-patterns.md`.

## Alert Management

### Alert Types

| Type | Description | Visibility |
|---|---|---|
| **User alerts** | Secrets found in repository | Security tab |
| **Push protection alerts** | Secrets pushed via bypass | Security tab (filter: `bypassed: true`) |
| **Partner alerts** | Secrets reported to provider | Not shown in repo (provider-only) |

### Alert Lists

- **Default alerts** — supported provider patterns and custom patterns
- **Generic alerts** — non-provider patterns and AI-detected secrets (limited to 5,000 per repo)

### Remediation Priority

1. **Rotate the credential immediately** — this is the critical action
2. Review the alert for context (location, commit, author)
3. Check validity status: `active` (urgent), `inactive` (lower priority), `unknown`
4. Remove from Git history if needed (time-intensive, often unnecessary after rotation)

### Dismissing Alerts

Dismiss with a documented reason:
- **False positive** — detected string is not a real secret
- **Revoked** — credential has already been revoked
- **Used in tests** — secret is only in test code

> For detailed alert types, validity checks, and REST API, search `references/alerts-and-remediation.md`.

## Reference Files

For detailed documentation, load the following reference files as needed:

- `references/push-protection.md` — Push protection mechanics, bypass workflow, delegated bypass, user push protection
  - Search patterns: `bypass`, `delegated`, `bypass request`, `command line`, `REST API`, `user push protection`
- `references/custom-patterns.md` — Custom pattern creation, regex syntax, dry runs, Copilot regex generation, scopes
  - Search patterns: `custom pattern`, `regex`, `dry run`, `publish`, `organization`, `enterprise`, `Copilot`
- `references/alerts-and-remediation.md` — Alert types, validity checks, extended metadata, generic alerts, secret removal, REST API
  - Search patterns: `user alert`, `partner alert`, `validity`, `metadata`, `generic`, `remediation`, `git history`, `REST API`
- `references/mcp-setup.md` — Pre-commit scanning via GitHub MCP Server, IDE setup, plugin installation, example prompts
  - Search patterns: `MCP`, `pre-commit`, `AI agent`, `coding agent`, `plugin`, `advanced-security`

## Core Workflow — Pre-Commit Secret Scanning via MCP

Secret scanning can run **inside your AI coding agent** before code is ever pushed, using the GitHub MCP Server. This catches exposed secrets at the earliest possible point — before they enter Git history.

### Prerequisites

- GitHub Secret Protection enabled on the target repository
- GitHub MCP Server configured in your IDE or agent environment

### How It Works

1. Gather the current code changes (staged diff or working tree changes)
2. Call the `secret_scanning` MCP tool with those changes
3. The engine returns structured results: file paths, line numbers, and secret types
4. Present findings to the user and suggest remediations
5. Re-scan after fixes to confirm resolution
6. Do not proceed with the commit or PR until the scan is clean

### Agent Instructions

When a user asks to scan code before committing or pushing:

1. Collect the staged diff or working tree changes
2. Call the `secret_scanning` MCP tool with the changes
3. If secrets are detected, report for each finding:
   - **File path** — which file contains the secret
   - **Line number** — exact location
   - **Secret type** — e.g., GitHub PAT, AWS key, generic password
4. Suggest remediation for each finding (move to environment variable, secret vault, or `.env` file)
5. Re-scan after the user applies fixes to confirm all secrets are resolved
6. Do not suggest committing or opening a PR while any secrets remain detected

### Example Prompts

Use these to trigger a pre-commit scan:

- "Scan my current changes for exposed secrets and show me the files and lines I should update before I commit."
- "Check this diff for API keys, tokens, or credentials before I push."
- "Are there any secrets in my staged changes?"

### If the Tool Is Not Available

If the `secret_scanning` MCP tool is not accessible, direct the user to `references/mcp-setup.md` for instructions on setting up the GitHub MCP Server and enabling the tool in their environment.
