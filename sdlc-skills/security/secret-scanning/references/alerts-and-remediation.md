# Alerts and Remediation Reference

Detailed reference for secret scanning alert types, validity checks, remediation workflows, and API access.

## Alert Types

### User Alerts

Generated when secret scanning detects a supported secret in the repository.

- Displayed in the repository **Security** tab
- Created for provider patterns, non-provider patterns, custom patterns, and AI-detected secrets
- Scanning covers entire Git history on all branches

### Push Protection Alerts

Generated when a contributor bypasses push protection to push a secret.

- Displayed in the Security tab (filter: `bypassed: true`)
- Record the bypass reason chosen by the contributor
- Include the commit and file where the secret was pushed

**Bypass reasons and their alert behavior:**

| Bypass Reason | Alert Status |
|---|---|
| It's used in tests | Closed (resolved as "used in tests") |
| It's a false positive | Closed (resolved as "false positive") |
| I'll fix it later | Open |

### Partner Alerts

Generated when GitHub detects a leaked secret matching a partner's pattern.

- Sent directly to the service provider (e.g., AWS, Stripe, GitHub)
- **Not** displayed in the repository Security tab
- Provider may automatically revoke the credential
- No action required by the repository owner

## Alert Lists

### Default Alerts List

The primary view showing alerts for:
- Supported provider patterns (e.g., GitHub PATs, AWS keys, Stripe keys)
- Custom patterns defined at repo/org/enterprise level

### Generic Alerts List

Separate view (toggle from default list) showing:
- Non-provider patterns (private keys, connection strings)
- AI-detected generic secrets (passwords)

**Limitations:**
- Maximum 5,000 alerts per repository (open + closed)
- Only first 5 detected locations shown for non-provider patterns
- Only first detected location shown for AI-detected secrets
- Not shown in security overview summary views

## Paired Credentials

When a resource requires paired credentials (e.g., access key + secret key):
- Alert is only created when BOTH parts are detected in the same file
- Prevents noise from partial leaks
- Reduces false positives

## Validity Checks

Validity checks verify whether a detected secret is still active.

### How It Works

1. Enable validity checks in repository/organization settings
2. GitHub periodically sends the secret to the issuer's API
3. Validation result is displayed on the alert

### Validation Statuses

| Status | Meaning | Priority |
|---|---|---|
| `Active` | Secret is confirmed to be valid and exploitable | 🔴 Immediate |
| `Inactive` | Secret has been revoked or expired | 🟡 Lower priority |
| `Unknown` | GitHub cannot determine validity | 🟠 Investigate |

### On-Demand Validation

Click the validation button on an individual alert to trigger an immediate check.

### Privacy

GitHub makes minimal API calls (typically GET requests) to the least intrusive endpoints, selecting endpoints that don't return personal information.

## Extended Metadata Checks

Provides additional context about detected secrets when validity checks are enabled.

### Available Metadata

Depends on what the service provider shares:
- Secret owner information
- Scope and permissions of the secret
- Creation date and expiration
- Associated account or project

### Benefits

- **Deeper insight** — know who owns a secret
- **Prioritize remediation** — understand scope and impact
- **Improve incident response** — quickly identify responsible teams
- **Enhance compliance** — ensure secrets align with governance policies
- **Reduce false positives** — additional context helps determine if action is needed

### Enabling

- Requires validity checks to be enabled first
- Can be enabled at repository, organization, or enterprise level
- Available via security configurations for bulk enablement

## Remediation Workflow

### Priority: Rotate the Credential

**Always rotate (revoke and reissue) the exposed credential first.** This is more important than removing the secret from Git history.

### Step-by-Step Remediation

1. **Receive alert** — via Security tab, email notification, or webhook
2. **Assess severity** — check validity status (active = urgent)
3. **Rotate the credential** — revoke the old credential and generate a new one
4. **Update references** — update all code/config that used the old credential
5. **Investigate impact** — check logs for unauthorized use during the exposure window
6. **Close the alert** — mark as resolved with appropriate reason
7. **Optionally clean Git history** — remove from commit history (time-intensive)

### Removing Secrets from Git History

If needed, use `git filter-repo` (recommended) or `BFG Repo-Cleaner`:

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove a specific file from all history
git filter-repo --path secrets.env --invert-paths

# Force push the cleaned history
git push --force --all
```

> **Note:** Rewriting history is disruptive — it invalidates existing clones and PRs. Only do this when absolutely necessary and after rotating the credential.

### Dismissing Alerts

Choose the appropriate reason:

| Reason | When to Use |
|---|---|
| **False positive** | Detected string is not a real secret |
| **Revoked** | Credential has already been revoked/rotated |
| **Used in tests** | Secret is only in test code with acceptable risk |

Add a dismissal comment for audit trail.

## Alert Notifications

Alerts generate notifications via:
- **Email** — to repository admins, organization owners, security managers
- **Webhooks** — `secret_scanning_alert` event
- **GitHub Actions** — `secret_scanning_alert` event trigger
- **Security overview** — aggregated view at organization level

## REST API

### List Alerts

```
GET /repos/{owner}/{repo}/secret-scanning/alerts
```

Query parameters: `state` (open/resolved), `secret_type`, `resolution`, `sort`, `direction`

### Get Alert Details

```
GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}
```

Returns: secret type, secret value (if permitted), locations, validity, resolution status, `dismissed_comment`

### Update Alert

```
PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}
```

Body: `state` (open/resolved), `resolution` (false_positive/revoked/used_in_tests/wont_fix), `resolution_comment`

### List Alert Locations

```
GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations
```

Returns: file path, line numbers, commit SHA, blob SHA

### Organization-Level Endpoints

```
GET /orgs/{org}/secret-scanning/alerts
```

Lists alerts across all repositories in the organization.

## Webhook Events

### `secret_scanning_alert`

Triggered when a secret scanning alert is:
- Created
- Resolved
- Reopened
- Validated (validity status changes)

Payload includes: alert number, secret type, resolution, commit SHA, and location details.

## Exclusion Configuration

### `secret_scanning.yml`

Place at `.github/secret_scanning.yml` to auto-close alerts for specific paths:

```yaml
paths-ignore:
  - "docs/**"              # Documentation with example secrets
  - "test/fixtures/**"     # Test fixture data
  - "**/*.example"         # Example configuration files
  - "samples/credentials"  # Sample credential files
```

**Limits:**
- Maximum 1,000 entries
- File must be under 1 MB
- Excluded paths are also excluded from push protection

**Alerts for excluded paths are closed as "ignored by configuration."**
