---
name: DORA Metrics Report
on:
  schedule:
    - cron: "3 2 1 * *"
  workflow_dispatch:
    inputs:
      organization:
        description: "GitHub organization to analyze"
        required: true
        type: string
        default: "github"
      repositories:
        description: "Comma-separated list of repos to analyze (leave empty for org-wide)"
        required: false
        type: string
        default: ""
      time_period:
        description: "Time period to analyze"
        required: false
        type: choice
        options:
          - 30d
          - 90d
          - 6m
          - 1y
        default: 90d
      incident_label:
        description: "Issue label that identifies production incidents"
        required: false
        type: string
        default: "incident"
      dry_run:
        description: "If true, log findings without creating an issue"
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
  bash: true

safe-outputs:
  create-issue:
    max: 1
    title-prefix: "[DORA Metrics] "
    labels:
      - dora-metrics

timeout-minutes: 45
---

You are an assistant that calculates DORA metrics for a GitHub organization.

## Inputs

| Input | Default |
|---|---|
| `organization` | `github` |
| `repositories` | _(all repos)_ |
| `time_period` | `90d` |
| `incident_label` | `incident` |
| `dry_run` | `false` |

Use the workflow dispatch inputs if provided; otherwise fall back to the defaults above.

## Instructions

### 1. Determine scope and time window

Parse `time_period` into a calendar duration: `30d` = 30 days, `90d` = 90 days, `6m` = 180 days, `1y` = 365 days. Compute the **start date** by subtracting that duration from today.

If `repositories` is non-empty, split it by comma and analyze only those repos. Otherwise, list **all non-archived** repositories in the `organization` and analyze each one.

### 2. Deployment Frequency

For each repository, use the Releases API to list all releases published on or after the start date. Count the total releases per repo within the time window.

Classify each repo:

| Level | Criteria |
|---|---|
| Elite | On-demand / multiple deploys per day (avg ≥ 1 release per day) |
| High | Between once per week and once per month |
| Medium | Between once per month and once every 6 months |
| Low | Fewer than once every 6 months |

### 3. Lead Time for Changes

For each repository, list pull requests merged on or after the start date. For each merged PR, find the earliest commit in that PR and compute the elapsed time from that commit's author date to the PR merge date.

Compute the **median lead time** across all merged PRs for that repo.

| Level | Criteria |
|---|---|
| Elite | Median < 1 day (24 hours) |
| High | Median between 1 day and 1 week |
| Medium | Median between 1 week and 1 month |
| Low | Median > 1 month |

### 4. Change Failure Rate

For each repository, examine every release published within the time window. For each release, check whether an issue with the `incident_label` label was opened in that repository within **3 days** after the release's published date. If so, count that release as a failure.

Compute: **Change Failure Rate = (failure releases / total releases) × 100%**.

| Level | Criteria |
|---|---|
| Elite | 0–5% |
| High | 5–10% |
| Medium | 10–15% |
| Low | > 15% |

### 5. Time to Restore Service (MTTR)

For each repository, list all **closed** issues with the `incident_label` label that were opened on or after the start date. For each, compute the duration from when the issue was opened to when it was closed.

Compute the **median time to restore** across all incident issues for that repo.

| Level | Criteria |
|---|---|
| Elite | Median < 1 hour |
| High | Median < 1 day (24 hours) |
| Medium | Median < 1 week |
| Low | Median > 1 week |

### 6. Generate report

Build a **Markdown report** with:

**Summary header:**
> **DORA Metrics Report — \<date\>**
> Organization: **\<org\>** | Period: **\<time_period\>** | Repos analyzed: **N**

**Per-repository breakdown table:**

| Repository | Deploy Freq | Lead Time | Change Failure Rate | MTTR | Overall |
|---|---|---|---|---|---|
| [owner/repo](url) | 12 releases (High) | 2.3 days (High) | 4.2% (Elite) | 3.1h (High) | High |

The **Overall** level for each repo is the lowest (worst) level among its four metrics (excluding N/A values).

**Org-wide summary:**

| Metric | Org-Wide Value | Level |
|---|---|---|
| Deployment Frequency | X releases / period | High |
| Lead Time for Changes | X days | Medium |
| Change Failure Rate | X% | Elite |
| Time to Restore Service | X hours | High |
| **Overall** | | **Medium** |

### 7. Create or update issue

If `dry_run` is true, log the full report to the workflow output and stop.

Otherwise, search for an existing **open** issue with the label `dora-metrics` and a title starting with `[DORA Metrics]`.

- If found, **update its body** with the new report.
- If not found, **create a new issue** with:
  - Title: `[DORA Metrics] Organization Performance Report — <date>`
  - Label: `dora-metrics`
  - Body: the full report.
