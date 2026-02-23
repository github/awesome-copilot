# OSPO Agentic Workflows

> AI-powered automation for Open Source Program Offices — org health, contributor metrics, compliance, and more.

## Overview

These workflows automate common OSPO tasks using [GitHub Agentic Workflows](../README.md). Copy any workflow into your repo's `.github/workflows/` directory, customize the organization name, compile with `gh aw compile`, and you're running.

## Workflows

| Workflow | Schedule | What It Does |
|----------|----------|-------------|
| [**org-health**](org-health.md) | Weekly (Monday) | Comprehensive org health report — stale issues/PRs, merge time analysis, contributor leaderboards, health alerts |
| [**contributors-report**](contributors-report.md) | Monthly (1st) | New vs. returning contributor metrics, commit counts, optional Sponsors info |
| [**release-compliance-checker**](release-compliance-checker.md) | On issue open | Audits a repo for OSS release readiness — required files, security config, license compliance, risk assessment |
| [**stale-repos**](stale-repos.md) | Monthly (1st) | Finds repositories with no activity in X days (default: 365) |

## Quick Start

```bash
# 1. Copy a workflow to your repo
cp agentic-workflows/ospo/org-health.md your-repo/.github/workflows/

# 2. Edit the workflow — change the organization name and any defaults
#    (it's just Markdown — edit the plain English instructions)

# 3. Compile to generate the Actions lock file
cd your-repo
gh aw compile org-health

# 4. Commit both files
git add .github/workflows/org-health.md .github/workflows/org-health.lock.yml
git commit -m "feat: add org health agentic workflow"
git push
```

## Customization Tips

- **Change the org**: Most workflows default to `"github"` — update this to your organization name
- **Adjust schedules**: Edit the `cron` expression in the YAML frontmatter
- **Tune thresholds**: Stale days, activity methods, exempt repos — all configurable via `workflow_dispatch` inputs
- **Add/remove checks**: Edit the Markdown instructions to add custom checks or remove ones you don't need

## See Also

- [ospo-readiness skill](../../skills/ospo-readiness/) — Interactive repo scanner (graded A–F) for use in Copilot chat
- [GitHub Agentic Workflows docs](https://githubnext.github.io/gh-aw/)
