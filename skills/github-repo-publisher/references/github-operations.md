# GitHub Operations

Use this reference when a task touches git state, GitHub APIs, `gh`, PRs, issues, releases, or repository metadata writes.

## Tool Preference

- Use GitHub connector tools for structured repo, issue, PR, comment, label, and reaction operations when available.
- Use local `git` for branch, diff, status, staging, commit, and push.
- Use `gh` for current-branch PR discovery, GitHub Actions checks/logs, repository metadata fields not exposed elsewhere, releases, and API fallbacks.
- Use the browser only when an action depends on the user's existing logged-in web session or when the user explicitly asks for browser operation.

## Before Write Operations

Check:

- `git status --short --branch`
- `git ls-files`
- Ignored and untracked files, for example with `git ls-files --others --exclude-standard` and `git ls-files --others --ignored --exclude-standard`
- `git remote -v`
- Current branch and upstream.
- Whether the worktree contains unrelated user changes.
- Local instructions such as `AGENTS.md`, especially proxy, packaging, release, branch, or commit conventions.
- Auth with `gh auth status` when using `gh`.
- Branch protection, rulesets, required reviews, required status checks, signed commit rules, and release permissions when a write targets GitHub.
- For security automation writes, confirm the target repository, exact file or setting, schedule or trigger, affected branches/ecosystems, and expected notification or permission impact. This includes `.github/dependabot.yml`, `.github/workflows/*security*`, code scanning, dependency review, branch protection, Dependabot settings, secret scanning, push protection, and private vulnerability reporting.

If GitHub HTTPS access requires a proxy, apply repo-local instructions. Example for shells that support environment variables:

```bash
HTTPS_PROXY=<proxy-url> HTTP_PROXY=<proxy-url> gh repo view
```

In PowerShell:

```powershell
$env:HTTPS_PROXY='<proxy-url>'; $env:HTTP_PROXY='<proxy-url>'; gh repo view
```

## Git Tracking Review

Before reporting that a local file is missing from GitHub, classify it by Git tracking state.

Common local assistant instruction files include `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX.md`, `.cursor/rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.claude`, and `.codex`.

- Treat ignored or untracked files in this family as local operational context, not GitHub publishing-surface gaps.
- Treat tracked files in this family as valid repository content, but review whether publishing them is intentional, useful, and free of sensitive local instructions.
- Flag untracked files that look public-facing as possible forgotten tracking, especially README assets, docs, license files, manifests, examples, screenshots, social previews, and CI/config files meant for the repository.
- Do not stage, untrack, delete, or push tracking-review findings unless the user explicitly asks for that action.

## Safe Git Flow

1. Inspect current state.
2. Create or switch to a task branch when appropriate. Use the repo's preferred agent branch prefix, or `agent/` when no convention exists.
3. Edit only relevant files.
4. Run focused validation.
5. Stage explicit paths in mixed worktrees.
6. Commit with a concise message.
7. Push the branch.
8. Open a draft PR unless the user requests ready review.

Do not use destructive commands such as hard resets or checkout-based reverts unless the user clearly asks for them.

Do not bypass branch protection, rulesets, required review, signed commit, or required status check policies. For regular collaborators, prefer a branch PR workflow. Use fork PRs primarily for external contributors or when repository permissions require them.

Do not add Dependabot, code scanning, dependency review, secret scanning, or other security automation as a side effect of a repository audit. Draft or report the recommendation first, then apply only the exact security change the user explicitly requested.

## Release Operations

- Confirm the release tag, target commit, version, changelog source, generated notes source, and release assets before creating or updating a release.
- Treat draft releases as the default when the user has not explicitly asked to publish immediately.
- Do not upload binaries, installers, archives, screenshots, or GIFs unless the user requested release assets and the files are verified.

## Metadata Updates

Repository About metadata commonly includes:

- `description`
- `homepage`
- `topics`

Prefer drafting exact values first. Apply through connector/API/`gh repo edit` only after the target repo and values are confirmed or the user explicitly requested the update.

Example fallback:

```bash
gh repo edit OWNER/REPO --description "..." --homepage "https://..."
gh repo edit OWNER/REPO --add-topic agents --add-topic github
```

## Actions and CI

For failing GitHub Actions:

- Use `gh pr checks <pr> --json name,state,bucket,link,workflow`.
- Fetch logs with `gh run view <run-id> --log-failed` when available.
- Report external checks as external unless the user asks for a separate provider investigation.

Never claim a check passed unless the command or connector result shows it.

## Large Files and Assets

- Avoid adding large screenshots, GIFs, videos, archives, installers, datasets, or generated binaries directly to the repository.
- Prefer optimized images for README assets, GitHub release assets for downloadable artifacts, and Git LFS for large files that truly must live in the repository.
- Before adding binary assets, check existing repo conventions and whether the project already uses Git LFS or release artifacts.
