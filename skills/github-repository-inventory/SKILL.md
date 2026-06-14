---
name: github-repository-inventory
description: Builds a read-only, evidence-based inventory of the repositories connected to a GitHub account — not just owned repos, but every repo the account demonstrably contributed to (authored or reviewed pull requests, authored issues, commits) or has access to (collaborator, organization). Records the evidence and a confidence level for each relationship and never conflates access with contribution. Privacy-first — public-only by default, no token storage, with private repo content redacted. Also captures metadata, README availability, technology stack, and project type. Use when asked what a GitHub account has contributed to or worked on, to reconstruct a developer's verifiable GitHub footprint across owned and external repos, or to catalogue, audit, or summarize the projects and technologies behind an account.
license: MIT
compatibility: Requires Python 3.11+ and an authenticated GitHub CLI (gh) v2.90.0+. Network access to the GitHub API required. Read-only; never modifies repositories.
allowed-tools: Bash(gh:*) Bash(python3:*) Read
metadata:
  author: Kinosaur
  version: "1.0.2"
---

# GitHub Repository Inventory

Use this skill when a user wants an evidence-based view of a GitHub account's footprint —
above all, **what the account has actually contributed to** (across repos it does not own),
with the evidence and confidence for each relationship. It also catalogues, audits, and
summarizes the owned projects and their technologies.

## Safety defaults

- Read-only. Never modify repositories; never call a mutating endpoint.
- Public repositories only unless the user explicitly asks to include private ones.
- Never print or store tokens. Authentication is delegated to `gh`.
- Never publish private repository content into shareable output.
- Distinguish repository *access* from verified *contribution*. Access (owner, collaborator,
  org member) is not evidence of having contributed.

## Prerequisites

- `gh --version` reports 2.90.0 or newer.
- `gh auth status` shows an authenticated account.
- `python3 --version` reports 3.11 or newer.

If any fail, tell the user how to fix it (e.g. `brew install gh`, then `gh auth login`)
before continuing.

## Workflow

1. Verify GitHub CLI authentication (`gh auth status`).
2. Determine the requested inventory scope (default: public owned repositories).
3. Run `scripts/inventory.py scan` with the chosen flags. Use `--dry-run` first if the user
   wants a preview.
4. Inspect `warnings.json` for incomplete results before reporting anything.
5. Treat `catalog.json` as the source of truth; `PROJECTS.md` is the human-readable view.
6. Present extracted facts separately from any conclusions you draw.

## Commands

```bash
# Full scan: discover public owned repos + public contribution evidence, inspect
# (README + structure + technology detection), render all three outputs.
python3 scripts/inventory.py scan [--out DIR] [--dry-run]

# Optional discovery scope (default is owned + public contributions only):
python3 scripts/inventory.py scan --include-accessible   # + collaborator / organization repos (access)
python3 scripts/inventory.py scan --include-private      # + private repos (README redacted; write to a gitignored dir)

# Re-scans reuse a per-repo inspection cache (skip-unchanged via updated_at/pushed_at).
python3 scripts/inventory.py scan --no-cache             # force a full re-inspection

# Localize PROJECTS.md (headers + labels). Data values stay as-is. Default: en.
python3 scripts/inventory.py scan --lang my              # Burmese (မြန်မာ)

# Derived reports (deterministic, from catalog.json; no LLM): technology-summary,
# missing-readmes, portfolio-candidates, contribution-summary -> <out>/reports/.
python3 scripts/inventory.py report [--out DIR]

# Individual stages (each reads/writes JSON so they compose and are independently testable):
python3 scripts/inventory.py discover [--out DIR]   # owned-repo discovery -> repositories
python3 scripts/inventory.py inspect  [--out DIR]   # README presence + top-level contents
python3 scripts/inventory.py render   [--out DIR]   # catalog.json + PROJECTS.md + warnings.json
python3 scripts/inventory.py validate [--out DIR]   # validate catalog.json against the schema
```

Defaults: public-only, read-only, owned + public contributions, output directory
`github-inventory/`. `--include-accessible` adds collaborator/organization repos (access,
never labelled as contribution). `--include-private` includes private repos — their README
content is redacted, and you must write only to a gitignored directory; the tool warns if
the output path is not a known gitignored location.

## Outputs

- `catalog.json` — canonical, machine-readable; the source of truth.
- `PROJECTS.md` — human-readable inventory grouped into Owned Projects / External
  Contributions / Accessible Repositories (localizable via `--lang`).
- `warnings.json` — incompleteness, rate-limit truncation, redactions, and gaps. Always read
  this before reporting.

## Honesty requirements

- Never claim "every repo the user ever contributed to." The true statement is:
  "repositories for which GitHub currently exposes contribution or access evidence."
- Deleted repos, inaccessible private repos, unmatched commit emails, and expired permissions
  all create gaps. These are recorded in `warnings.json` — surface them.

Detailed schema, relationship model, privacy rules, and known limitations live in
`references/`. Load them only when needed.
