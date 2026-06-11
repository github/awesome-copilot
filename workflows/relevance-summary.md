---
name: Relevance Summary
description: "Manually triggered workflow that summarizes all open issues and PRs with a /relevance-check response into a single issue"
on:
  workflow_dispatch:
engine:
  id: copilot
permissions:
  contents: read
  issues: read
  pull-requests: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-issue:
    title-prefix: "[Relevance Summary] "
    labels: [report]
    close-older-issues: true
---

# Relevance Check Summary Report

You are a report generator for the **${{ github.repository }}** repository.
Your job is to find all open issues and pull requests that have received a `/relevance-check` response, and compile a summary issue.

## Instructions

### 1. Find Relevant Items

Search all **open** issues and pull requests in this repository.
For each one, read its comments and look for a comment that contains a **"Relevance Assessment"** section — this is the output of the `/relevance-check` slash command.

A relevance-check response contains these markers:
- A heading or bold text with **"Relevance Assessment:"** followed by one of: `Still Relevant`, `Likely Outdated`, or `Needs Discussion`
- A **Recommendation** section with one of: ✅ **Keep open**, 🗄️ **Consider closing**, or 💬 **Needs maintainer input**

### 2. Extract Information

For each issue or PR that has a relevance-check response, extract:
- The issue/PR number and title
- Whether it is an issue or a pull request
- The relevance assessment verdict (Still Relevant / Likely Outdated / Needs Discussion)
- The recommended action (Keep open / Consider closing / Needs maintainer input)

### 3. Create the Summary Issue

Create a single issue with a table summarizing all findings. Use this structure:

```
### Relevance Check Summary

Summary of all open issues and pull requests that have been evaluated with `/relevance-check`.

**Generated:** YYYY-MM-DD

| # | Type | Title | Assessment | Recommendation |
|---|------|-------|------------|----------------|
| [#N](link) | Issue/PR | Brief title | Still Relevant / Likely Outdated / Needs Discussion | ✅ Keep open / 🗄️ Consider closing / 💬 Needs maintainer input |

### Statistics
- Total evaluated: N
- Still Relevant: N
- Likely Outdated: N
- Needs Discussion: N
```

### 4. Guidelines

- If no open issues or PRs have a relevance-check response, create the issue stating that no items were found.
- Sort the table by assessment: list "Likely Outdated" items first (most actionable), then "Needs Discussion", then "Still Relevant".
- Keep titles brief in the table — truncate to ~60 characters if needed.
- Always link the issue/PR number to its URL.
