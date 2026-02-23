---
name: Team Permissions Audit
description: >
  Scans organization repositories for direct (non-team) collaborator access
  and reports findings. Helps enforce team-based permission management for
  better security and maintainability.

on:
  schedule:
    - cron: "3 2 1 * *"
  workflow_dispatch:
    inputs:
      organization:
        description: "GitHub organization to audit"
        required: true
        type: string
        default: "github"
      exempt_repos:
        description: "Comma-separated list of repo names to skip"
        required: false
        type: string
        default: ""
      exempt_users:
        description: "Comma-separated list of usernames to exempt (e.g. bots, outside collaborators)"
        required: false
        type: string
        default: ""
      dry_run:
        description: "If true, log findings without creating an issue"
        required: false
        type: boolean
        default: false

permissions:
  contents: read
  issues: read

engine: copilot
tools:
  github:
    toolsets:
      - repos
      - issues
  bash: true

safe-outputs:
  create-issue:
    max: 1
    title-prefix: "[Permissions Audit] "
    labels:
      - permissions-audit

timeout-minutes: 30
---

You are an assistant that audits GitHub repository permissions to ensure
team-based access management. Your goal is to identify repositories where
individual users have been granted direct collaborator access instead of
receiving access through team membership.

## Inputs

| Input | Default |
|---|---|
| `organization` | `github` |
| `exempt_repos` | _(none)_ |
| `exempt_users` | _(none)_ |
| `dry_run` | `false` |

## Instructions

### Step 1 — Enumerate repositories

List all repositories in the provided organization. Skip any repository
that is archived. Also skip any repository whose name appears in the
`exempt_repos` input (comma-separated).

### Step 2 — Identify direct collaborators

For each repository, list collaborators with their permission level and
affiliation. Focus on users whose affiliation is "direct" — meaning they
were added individually rather than through a team. Also identify outside
collaborators (affiliation "outside"). Exclude any username that appears
in the `exempt_users` input.

### Step 3 — List team access

For each repository, list all teams that have access and their
corresponding permission levels. This context helps determine whether a
direct collaborator's access is redundant with existing team grants.

### Step 4 — Flag direct access grants

For each repository, flag individual users who have direct access that
could instead be managed through a team. If a user already has access via
a team at the same or higher permission level, their direct grant is
redundant and should be removed. If no suitable team exists, suggest
creating one or adding the user to an existing team.

### Step 5 — Handle outside collaborators separately

Outside collaborators cannot be added to organization teams. Flag these
users in a separate section of the report with a note that individual
access is expected and required for outside collaborators.

### Step 6 — Generate report

Produce a report with the following structure:

**Summary line:** "Found N repos with M direct collaborator grants"

**Direct collaborator table:**

| Repository | User | Permission | Affiliation | Suggested Action |
|------------|------|------------|-------------|------------------|
| repo-name | @user | write | direct | Remove — already covered by team [team-name] |

Populate the Suggested Action column with one of:
- "Remove — already covered by team [team-name]"
- "Add to team [team-name] and remove direct grant"
- "Create a team for this access pattern"

**Outside collaborators section (informational):**

List outside collaborators grouped by repository with their permission
levels. Note that these require individual access grants and are not
actionable findings.

### Step 7 — Output results

If `dry_run` is true, output the full report to the workflow logs only.
Do not create or update any issue.

If `dry_run` is false, search for an existing open issue with the label
`permissions-audit`. If one exists, update its body with the new report.
If none exists, create a new issue titled
"[Permissions Audit] Direct collaborator access report" with the label
`permissions-audit` and the report as the body.
