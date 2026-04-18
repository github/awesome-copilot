# Contributor Reporting (Maintainers) 🚧

This directory contains build scripts and utilities for maintaining the repository.

## Build Scripts

### `update-readme.mjs`
Generates the main README.md and documentation files from the repository content (agents, prompts, instructions, skills, hooks, collections).

### `generate-marketplace.mjs`
Automatically generates `.github/plugin/marketplace.json` from all plugin directories in the `plugins/` folder. This file is used by the GitHub Copilot CLI to discover and install plugins from this repository.

**How it works:**
- Scans all directories in `plugins/`
- Reads each plugin's `.github/plugin/plugin.json` for metadata
- Generates a consolidated `marketplace.json` with all available plugins
- Runs automatically as part of `npm run build`

**To run manually:**
```bash
npm run plugin:generate-marketplace
```

### `generate-website-data.mjs`
Generates JSON data files for the website from repository content.

## Contributor Tools

- `contributor-report.mjs` — generates a markdown report of merged PRs for missing contributors (includes shared helpers).
- `add-missing-contributors.mjs` — on-demand maintainer script to automatically add missing contributors to `.all-contributorsrc` (infers contribution types from merged PR files, then runs the all-contributors CLI).

## Key notes for maintainers

- Reports are generated on-demand and output to `reports/contributor-report.md` for human review.
- The report output is intentionally minimal: a single list of affected PRs and one command to add missing contributor(s).
- This repository requires full git history for accurate analysis. In CI, set `fetch-depth: 0`.
- Link: [all-contributors CLI documentation](https://allcontributors.org/docs/en/cli)

## On-demand scripts (not CI)

These are maintainer utilities. They are intentionally on-demand only (but could be wired into CI later).

### `add-missing-contributors.mjs`

- Purpose: detect missing contributors, infer contribution types from their merged PR files, and run `npx all-contributors add ...` to update `.all-contributorsrc`.
- Requirements:
	- GitHub CLI (`gh`) available (used to query merged PRs).
	- `.all-contributorsrc` exists.
	- Auth token set to avoid the anonymous GitHub rate limits:
		- Set `GITHUB_TOKEN` (preferred), or `GH_TOKEN` for the `gh` CLI.
		- If you use `PRIVATE_TOKEN` locally, `contributor-report.mjs` will map it to `GITHUB_TOKEN`.

## Graceful shutdown

- `contributor-report.mjs` calls `setupGracefulShutdown('script-name')` from `eng/utils/graceful-shutdown.mjs` early in the file to attach signal/exception handlers.

## Testing & maintenance

- Helper functions have small, deterministic behavior and include JSDoc comments.
- The `getMissingContributors` function in `contributor-report.mjs` is the single source of truth for detecting missing contributors from `all-contributors check` output.
