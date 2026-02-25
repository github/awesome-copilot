---
name: 'OSPO Contributors Report'
description: 'Monthly contributor activity metrics across an organization''s repositories.'
labels: ['ospo', 'reporting', 'contributors']
on:
  schedule:
    - cron: "3 2 1 * *"
  workflow_dispatch:
    inputs:
      organization:
        description: "GitHub organization to analyze (e.g. github)"
        required: false
        type: string
      repositories:
        description: "Comma-separated list of repos to analyze (e.g. owner/repo1,owner/repo2)"
        required: false
        type: string
      start_date:
        description: "Start date for the report period (YYYY-MM-DD)"
        required: false
        type: string
      end_date:
        description: "End date for the report period (YYYY-MM-DD)"
        required: false
        type: string
      sponsor_info:
        description: "Include GitHub Sponsors information for contributors"
        required: false
        type: boolean
        default: false

permissions:
  contents: read
  issues: read
  pull-requests: read

engine: copilot

tools:
  github:
    toolsets:
      - repos
      - issues
      - pull_requests
      - orgs
      - users
  bash: true

safe-outputs:
  create-issue:
    max: 1
    title-prefix: "[Contributors Report] "

timeout-minutes: 60
---

# Contributors Report

Generate a contributors report for the specified organization or repositories.

## Step 1: Validate Configuration

Check the workflow inputs. Either `organization` or `repositories` must be provided.

- If **both** are empty and this is a **scheduled run**, default to analyzing all public repositories in the organization that owns the current repository. Determine the org from the `GITHUB_REPOSITORY` environment variable (the part before the `/`).
- If **both** are empty and this is a **manual dispatch**, fail with a clear error message: "You must provide either an organization or a comma-separated list of repositories."
- If **both** are provided, prefer `repositories` and ignore `organization`.

## Step 2: Determine Date Range

- If `start_date` and `end_date` are provided, use them.
- Otherwise, default to the **previous calendar month**. For example, if today is 2025-03-15, the range is 2025-02-01 to 2025-02-28.
- Use bash to compute the dates if needed. Store them as `START_DATE` and `END_DATE`.

## Step 3: Enumerate Repositories

- If `repositories` input was provided, split the comma-separated string into a list. Each entry should be in `owner/repo` format.
- If `organization` input was provided (or defaulted from Step 1), list all **public, non-archived, non-fork** repositories in the organization using the GitHub API. Collect their `owner/repo` identifiers.

## Step 4: Collect Contributors from Commit History

For each repository in scope:

1. Use the GitHub API to list commits between `START_DATE` and `END_DATE` (use the `since` and `until` parameters on the commits endpoint).
2. For each commit, extract the **author login** (from `author.login` on the commit object).
3. **Exclude bot accounts**: skip any contributor whose username contains `[bot]` or whose `type` field is `"Bot"`.
4. Track per-contributor:
   - Total number of commits across all repos.
   - The set of repos they contributed to.

Use bash to aggregate and deduplicate the contributor data across all repositories.

## Step 5: Determine New vs Returning Contributors

For each contributor found in Step 4, check whether they have **any commits before `START_DATE`** in any of the in-scope repositories.

- If a contributor has **no commits before `START_DATE`**, mark them as a **New Contributor**.
- Otherwise, mark them as a **Returning Contributor**.

## Step 6: Collect Sponsor Information (Optional)

If the `sponsor_info` input is `true`:

1. For each contributor, check whether they have a GitHub Sponsors profile by querying the user's profile via the GitHub API.
2. If the user has sponsorship enabled, record their sponsor URL as `https://github.com/sponsors/<username>`.
3. If not, leave the sponsor field empty.

## Step 7: Generate Markdown Report

Build a markdown report with the following structure:

### Summary Table

| Metric | Value |
|---|---|
| Total Contributors | count |
| Total Contributions (Commits) | count |
| New Contributors | count |
| Returning Contributors | count |
| % New Contributors | percentage |

### Contributors Detail Table

Sort contributors by commit count descending.

| # | Username | Contribution Count | New Contributor | Sponsor URL | Commits |
|---|---|---|---|---|---|
| 1 | @username | 42 | Yes | [Sponsor](url) | [View](commits-url) |

- The **Username** column should link to the contributor's GitHub profile.
- The **Sponsor URL** column should show "N/A" if `sponsor_info` is false or the user has no Sponsors page.
- The **Commits** column should link to a filtered commits view.

## Step 8: Create Issue with Report

Create an issue in the **current repository** with:

- **Title:** `[Contributors Report] <ORG_OR_REPO_SCOPE> — START_DATE to END_DATE`
- **Body:** The full markdown report from Step 7.
- **Labels:** Add the label `contributors-report` if it exists; do not fail if it does not.
