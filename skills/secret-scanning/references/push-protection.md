# Push Protection Reference

Detailed reference for GitHub push protection — preventing secrets from reaching repositories, bypass workflows, and delegated bypass configuration.

## How Push Protection Works

Push protection scans for secrets during the push process and blocks pushes containing detected secrets. It operates as a preventative control, unlike standard secret scanning which detects secrets after commit.

### What Gets Scanned

| Surface | Scanned |
|---|---|
| Command line pushes | ✅ |
| GitHub UI commits | ✅ |
| File uploads to repo | ✅ |
| REST API content creation requests | ✅ |

### Types of Push Protection

**Repository push protection:**
- Requires GitHub Secret Protection enabled
- Disabled by default; enabled by repo admin, org owner, or security manager
- Generates alerts for bypasses in the Security tab
- Can be enabled at repository, organization, or enterprise level

**User push protection:**
- Enabled by default for all GitHub.com accounts
- Blocks pushes to public repositories containing supported secrets
- Does NOT generate alerts when bypassed (unless repo also has push protection enabled)
- Managed via personal account settings

## Resolving Blocked Pushes — Command Line

When push protection blocks a push, the error message includes:
- The secret type detected
- Commit SHAs containing the secret
- File paths and line numbers
- A URL to bypass (if permitted)

### Remove Secret from Latest Commit

```bash
# Edit the file to remove the secret
# Amend the commit
git commit --amend --all

# Push again
git push
```

### Remove Secret from Earlier Commits

```bash
# 1. Review the push error for all commits containing the secret
# 2. Find the earliest commit with the secret
git log

# 3. Interactive rebase before that commit
git rebase -i <EARLIEST-COMMIT>~1

# 4. Change 'pick' to 'edit' for the offending commit(s)
# 5. Remove the secret from the file
# 6. Stage and amend
git add .
git commit --amend

# 7. Continue rebase
git rebase --continue

# 8. Push
git push
```

### Bypass Push Protection

1. Visit the URL from the error message (must be the same user who pushed)
2. Select a reason:
   - **It's used in tests** → creates a closed alert (resolved as "used in tests")
   - **It's a false positive** → creates a closed alert (resolved as "false positive")
   - **I'll fix it later** → creates an open alert
3. Click **Allow me to push this secret**
4. Re-push within **3 hours** (after that, repeat the bypass process)

> A bypass reason is required when the repo has secret scanning enabled. For public repos with only user push protection (no repo push protection), no reason is needed and no alert is generated.

## Resolving Blocked Pushes — GitHub UI

When creating or editing a file in the GitHub UI:
1. A banner appears warning about the detected secret
2. Options to remove the secret or bypass are presented inline
3. Same bypass reasons apply as command line

## Resolving Blocked Pushes — REST API

Push protection also applies to REST API content creation endpoints. When blocked:
- The API returns an error response with details about the detected secret
- Include the bypass reason in the request to proceed

## Delegated Bypass

Delegated bypass gives organizations fine-grained control over who can bypass push protection.

### How It Works

1. Organization owners/repo admins create a **bypass list** of users, roles, or teams
2. Users on the bypass list can bypass push protection directly (with a reason)
3. All other contributors must **submit a bypass request** for review
4. Bypass requests appear in the Security tab → "Push protection bypass" page
5. Requests expire after **7 days** if not reviewed

### Who Can Always Bypass (Without Request)

- Organization owners
- Security managers
- Users in teams/roles added to the bypass list
- Users with custom role having "review and manage secret scanning bypass requests" permission

### Enabling Delegated Bypass

**Repository level:**
1. Settings → Advanced Security → Push protection
2. Enable "Restrict who can bypass push protection"
3. Add users, teams, or roles to the bypass list

**Organization level:**
1. Organization Settings → Advanced Security → Global settings
2. Configure delegated bypass in security configuration

### Managing Bypass Requests

Designated reviewers:
1. Navigate to repository Security tab → "Push protection bypass"
2. Review pending requests (includes the secret, commit, and contributor's comment)
3. **Approve** — contributor can push the secret and any future commits with the same secret
4. **Deny** — contributor must remove the secret before pushing

### Bypass Request Flow (Contributor Perspective)

1. Push is blocked; visit the URL from the error message
2. Add a comment explaining why the secret is safe to push
3. Click **Submit request**
4. Wait for email notification of approval/denial
5. If approved: push the commit
6. If denied: remove the secret and push again

## Push Protection Patterns

Push protection supports a subset of secret scanning patterns. Not all detected secret types trigger push protection blocks.

Key considerations:
- Older/legacy token formats may not be supported by push protection
- Some patterns have higher false positive rates and are excluded from push protection
- Custom patterns can have push protection enabled after publishing

For the full list of patterns supported by push protection, see [Supported secret scanning patterns](https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns).

## Configuring Push Protection for Custom Patterns

After publishing a custom pattern:
1. Navigate to the custom pattern in Settings → Advanced Security
2. Click **Enable** next to push protection
3. The pattern will now block pushes containing matching secrets

> Push protection for custom patterns only applies to repos that have push protection enabled. Enabling push protection for commonly found patterns can be disruptive to contributors.
