# OSPO Agentic Workflows

> AI-powered automation for Open Source Program Offices — org health, contributor metrics, compliance, and more.

These workflows automate common OSPO tasks using [GitHub Agentic Workflows](../README.md). Copy any workflow into your repo's `.github/workflows/` directory, customize the organization name, and compile with `gh aw compile`.

## Workflows

| Workflow | Schedule | What It Does |
|----------|----------|-------------|
| [**org-health**](org-health.md) | Weekly (Monday) | Comprehensive org health report — stale issues/PRs, merge time analysis, contributor leaderboards, health alerts |
| [**contributors-report**](contributors-report.md) | Monthly (1st) | New vs. returning contributor metrics, commit counts, optional Sponsors info |
| [**release-compliance-checker**](release-compliance-checker.md) | On issue open | Audits a repo for OSS release readiness — required files, security config, license compliance, risk assessment |
| [**stale-repos**](stale-repos.md) | Monthly (1st) | Finds repositories with no activity in X days (default: 365) |

## Customization

- **Change the org**: Most workflows default to `"my-org"` — update to your org name
- **Adjust schedules**: Edit the `cron` in the YAML frontmatter
- **Tune thresholds**: Stale days, exempt repos, activity methods — all configurable via `workflow_dispatch` inputs
- **Add/remove checks**: Edit the Markdown instructions directly

## See Also

- [ospo-readiness skill](../../skills/ospo-readiness/) — Interactive repo scanner (graded A–F) for Copilot chat
- [GitHub Agentic Workflows docs](https://githubnext.github.io/gh-aw/)
