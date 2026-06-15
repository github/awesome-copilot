# Permissions and Tokens

Every workflow run gets an automatic `GITHUB_TOKEN`. Its scope is the blast radius if a step is
compromised, so scope it to the minimum.

## The Default Is Too Broad

If a workflow has no `permissions:` block, it inherits the repository/organization default. On
older or permissive repos that default is **read/write to most scopes**. A single injected command
or malicious dependency then runs with the ability to push code, publish releases, or approve PRs.

## Least-Privilege Recipe

Set a restrictive default at the top level, then elevate per job only where needed.

```yaml
# Deny by default
permissions: {}

jobs:
  build:
    permissions:
      contents: read          # checkout only
    runs-on: ubuntu-latest
    steps: [...]

  comment:
    permissions:
      contents: read
      pull-requests: write    # this job posts a comment; nothing else
    runs-on: ubuntu-latest
    steps: [...]
```

Common scopes: `contents`, `pull-requests`, `issues`, `actions`, `packages`, `id-token`,
`deployments`, `checks`, `statuses`. Each is `read`, `write`, or `none`.

## Findings to Flag

* No `permissions:` block anywhere → MEDIUM (inherits possibly-broad default).
* `permissions: write-all` → HIGH.
* A `write` scope the job's steps never use → HIGH (drop it).
* Top-level `write` that should live on one job → MEDIUM (move it down).

## OIDC Instead of Long-Lived Cloud Secrets

Storing static cloud keys (`AWS_ACCESS_KEY_ID`, etc.) as repo secrets means a leak is permanent
until manually rotated. Prefer OpenID Connect: the workflow requests a short-lived token the cloud
provider trusts, scoped to that repo/branch, expiring in minutes.

```yaml
permissions:
  id-token: write     # required to request the OIDC token
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@<sha>
        with:
          role-to-assume: arn:aws:iam::123456789012:role/my-ci-role
          aws-region: us-east-1
      # no AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY secrets needed
```

The same pattern exists for Azure (`azure/login`), GCP (`google-github-actions/auth`), HashiCorp
Vault, and others. On the cloud side, scope the trust policy to the specific repo and ideally a
specific branch/environment so a fork or another repo cannot assume the role.

## Secret Hygiene

* Reference secrets only in the jobs that need them.
* Never `echo` a secret or enable shell tracing (`set -x`) in a step that handles one.
* Don't pass secrets into third-party actions you haven't pinned and reviewed.
* Remember fork `pull_request` runs get no secrets — don't try to "fix" that by switching to
  `pull_request_target` (see `triggers-and-privilege.md`).
