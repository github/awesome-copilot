---
name: gh-cli
description: Use when running GitHub CLI (gh) commands — auth, repos, issues, PRs, Actions/workflows, releases, projects, gists, codespaces, rulesets, or any `gh api` REST/GraphQL call from the command line.
---

# GitHub CLI (gh)

Comprehensive reference for `gh`, loaded on demand.

**Rule:** read the router below, then open only the reference file(s) the task needs. Don't load all of them preemptively.

## How to use this skill

1. Identify the command group from the task (e.g. "open a PR" → `pr`, "trigger a workflow" → `actions`).
2. Read that one file from `reference/` — each is self-contained with flags and examples.
3. Fall back to `gh <command> --help` for rarely used flags not documented here.

## Reference index

| File | Covers |
|------|--------|
| [reference/auth.md](reference/auth.md) | `gh auth` — install, login, tokens, multi-account, `setup-git`, env vars (`GH_TOKEN`, `GH_HOST`, …) |
| [reference/repo.md](reference/repo.md) | `gh repo` — create, clone, list, view, edit, fork, sync, autolinks, deploy keys |
| [reference/issue.md](reference/issue.md) | `gh issue` — create, list, view, edit, close, comment, pin, lock, transfer, `issue develop` |
| [reference/pr.md](reference/pr.md) | `gh pr` — create, list, view, checkout, diff, merge, review, checks, edit, ready, update-branch, revert |
| [reference/actions.md](reference/actions.md) | `gh run`, `gh workflow`, `gh cache`, `gh secret`, `gh variable` |
| [reference/api.md](reference/api.md) | `gh api` — REST, GraphQL, pagination, `-f`/`-F` fields, jq patterns |
| [reference/projects.md](reference/projects.md) | `gh project` — Projects v2 boards, fields, items |
| [reference/release.md](reference/release.md) | `gh release` — create, edit, upload/download assets, generate notes |
| [reference/formatting.md](reference/formatting.md) | `--json` / `--jq` / `--template` — discover fields, common jq patterns, Go templates |
| [reference/workflows.md](reference/workflows.md) | End-to-end recipes — ship a PR, bulk label, sync fork, wait-for-workflow, auto-merge |
| [reference/misc.md](reference/misc.md) | `browse`, `gist`, `codespace`, `org`, `search`, `label`, `ssh-key`, `gpg-key`, `status`, `config`, `extension`, `alias`, `ruleset`, `attestation`, `completion`, `preview`, `agent-task` + global flags |

## Quick routing by task

- **"How do I log in / switch accounts / set a token for CI?"** → `reference/auth.md`
- **"Create / clone / fork / sync a repo"** → `reference/repo.md`
- **"Open / close / comment on an issue"** → `reference/issue.md`
- **"Create / review / merge / check status of a PR"** → `reference/pr.md`
- **"Trigger / watch / rerun a workflow; manage secrets or caches"** → `reference/actions.md`
- **"Hit a GitHub REST or GraphQL endpoint"** → `reference/api.md`
- **"Manage a Projects v2 board / items / fields"** → `reference/projects.md`
- **"Cut a release / upload or download assets"** → `reference/release.md`
- **"Extract structured output / filter with jq / format with Go template"** → `reference/formatting.md`
- **"Chain multiple `gh` commands into a workflow"** → `reference/workflows.md`
- **"Anything not listed above"** → `reference/misc.md` (+ `gh <command> --help`)

## Prereqs

- `gh` 2.85.0+ (`brew install gh` / `winget install GitHub.cli` / apt). See `reference/auth.md` for install + first login.
- For scripts, export `GH_TOKEN=$(gh auth token)` and `GH_PROMPT_DISABLED=true` to avoid prompts.

## Global flags present on most commands

`-R, --repo OWNER/REPO` · `--hostname HOST` · `--json FIELDS` · `--jq EXPR` · `--template STR` · `--paginate` · `--web` · `--verbose` · `--cache DUR`

## References

- Official manual: https://cli.github.com/manual/
- REST API: https://docs.github.com/en/rest
- GraphQL API: https://docs.github.com/en/graphql
