# Fork-Only Automation Tooling

This directory contains all fork-specific workflows, agents, and state files used to manage the Oracle-to-PostgreSQL Migration Expert agent development in the fork of `github/awesome-copilot`.

## Architecture Overview

### Workflows (`.github/workflows/fork-*.yml`)

These run on the fork and are **never** upstreamed:

1. **fork-sync-watchdog.yml** — Runs weekly (Friday 10:00 AM UTC)
   - Merges upstream `main` into fork `main`
   - Watches for changes to `CONTRIBUTING.md` and `AGENTS.md`
   - Alerts if contribution instructions change (requires manual review)
   - Stores state in `state/contrib-watch.json`

2. **fork-agent-reviewer.yml** — Runs on every PR to fork main (path-scoped)
   - Lint checks agent file structure (YAML frontmatter, required fields)
   - Runs domain-aware AI review (Oracle-to-Postgres migration best practices)
   - Comments on PR with findings (advisory, non-blocking)
   - Scoped to: `agents/oracle-to-postgres-*`, `plugins/oracle-to-postgres-*`, `.github/fork-only/agents/**`

3. **fork-bundle-upstream-pr.yml** — Runs on-demand (`workflow_dispatch`)
   - Gathers all commits to agent/plugin paths since last promotion
   - Creates a branch from upstream `main` and cherry-picks commits
   - Opens a **draft PR** against upstream
   - Stores promotion state in `state/upstream-promotion.json`
   - **Requires:** `UPSTREAM_PAT` secret (fine-grained PAT from your account)

### Agents (`.github/fork-only/agents/`)

Custom agents that run in Copilot CLI or via workflow dispatch:

1. **dev-orchestrator.agent.md** — Your development workflow coordinator
   - Reads GitHub issues
   - Grills requirements (challenge assumptions, clarify scope)
   - Plans implementation (with specific diffs)
   - Dispatches to plan-skeptic for adversarial critique
   - Waits for your approval (plan-mode gating)
   - Implements changes
   - Self-reviews before PR

2. **plan-skeptic.agent.md** — Skeptical sub-agent
   - Reviews dev-orchestrator's plans adversarially
   - Challenges assumptions, exposes edge cases
   - Questions scope and implementation approach
   - Reports severity-ranked concerns

### State Files (`.github/fork-only/state/`)

JSON files tracking fork operations (committed to repo):

1. **contrib-watch.json**
   - Tracks last-seen SHAs for `CONTRIBUTING.md` and `AGENTS.md` from upstream
   - Used by fork-sync-watchdog to detect upstream changes
   - Updated on every sync run

2. **upstream-promotion.json**
   - Tracks promotion history (when commits were bundled and promoted)
   - Records last promoted SHA to identify new changes for next promotion
   - Used by fork-bundle-upstream-pr to scope cherry-picks
   - Stores promotion IDs and workflow run URLs

## Setup: Fine-Grained PAT Creation

The `fork-bundle-upstream-pr.yml` workflow requires a fine-grained Personal Access Token (PAT) with minimal permissions.

### Step 1: Create the Token

1. Go to https://github.com/settings/tokens?type=beta
2. Click **"Generate new token"**
3. Fill in:
   - **Token name:** `fork-bundle-upstream-pat` (or similar)
   - **Description:** "Fork promotion to awesome-copilot upstream"
   - **Expiration:** 90 days (or your preference)
4. Under **Resource owner**, select your personal account
5. Under **Repository access**, select **"Only select repositories"**
6. Search for and select `github/awesome-copilot`
7. Under **Permissions**, grant:
   - **Contents:** Read and write
   - **Pull requests:** Read and write
8. Click **"Generate token"** and **copy it immediately** (you won't see it again)

### Step 2: Store as Repository Secret

1. Go to your fork's repository settings: `https://github.com/YOUR_USERNAME/awesome-copilot/settings/secrets/actions`
2. Click **"New repository secret"**
3. **Name:** `UPSTREAM_PAT`
4. **Value:** Paste the token from Step 1
5. Click **"Add secret"**

### Step 3: Verify

The workflow will use the secret when you trigger `fork-bundle-upstream-pr.yml` manually from the Actions tab.

## Workflow: Using the System

### Development Flow (You)

1. **Create an issue** in the fork describing what you want to improve in the agent
2. **Trigger the dev-orchestrator** (via Copilot CLI or as a workflow input):
   ```bash
   gh workflow run fork-orchestrator-dispatch.yml -f issue_number=<NUMBER>
   ```
   Or, use this session's Copilot agent to call the dev-orchestrator directly
3. The orchestrator will:
   - Grill your issue (challenge requirements)
   - Present a plan with skeptic's critique
   - Wait for your approval
   - Implement changes
   - Self-review before PR
4. **Open a PR** against your fork's `main` from the result branch
5. The **fork-agent-reviewer** will comment with lint + AI review findings (advisory)
6. **Merge the PR** into your fork's `main`

### Promotion to Upstream (Periodically)

1. Go to **Actions** → **Fork Bundle Upstream PR**
2. Click **"Run workflow"** on `main`
3. Optionally provide:
   - Custom PR title (auto-generated if omitted)
   - Custom description
4. The workflow will:
   - Find all commits to agent/plugin paths since last promotion
   - Create a branch from upstream `main`
   - Cherry-pick your commits
   - Open a **draft PR** against upstream
   - Store promotion state
5. **Review the draft PR** in the upstream repository
6. If ready, convert to regular PR and iterate with upstream maintainers

### Weekly Sync (Automatic)

- Every **Friday at 10:00 AM UTC**, the fork-sync-watchdog:
  - Merges upstream `main` into your fork `main`
  - Checks for updates to `CONTRIBUTING.md` and `AGENTS.md`
  - Alerts you if contribution instructions changed
  - Stores state for next week's comparison

## Important Notes

- **Fork-only tooling is committed to `main`:** Workflows and agents live in `.github/fork-only/` and `.github/workflows/fork-*.*` — this is intentional. They are excluded from promotion by path-scoping in the bundler.
- **State files are committed:** `contrib-watch.json` and `upstream-promotion.json` track system state across runs. Commit them as part of normal fork work.
- **PAT Security:** The `UPSTREAM_PAT` is stored securely as a repository secret. It is only used by `fork-bundle-upstream-pr.yml` and is scoped to `github/awesome-copilot` only (not your fork).
- **No force-pushes:** The system uses merge (watchdog) and cherry-pick (bundler), never rebases or force-pushes. This keeps history clean and audit-able.
- **Least privilege:** All workflows use minimal permissions. The bundler uses a fine-grained PAT (not `GITHUB_TOKEN`) scoped to a single remote repository and specific permissions.

## Troubleshooting

### Sync Watchdog Fails to Merge
- **Issue:** Merge conflict with upstream
- **Fix:** Manually merge upstream/main in your fork, resolve conflicts, push to main

### Bundler Finds No Changes
- **Issue:** No commits to agent/plugin paths since last promotion
- **Fix:** Make a change to the agent or plugin, commit, push, then re-run the bundler

### PR Opens But We Want Custom Scope
- **Issue:** Cherry-pick included unrelated commits
- **Fix:** Edit `upstream-promotion.json` `lastPromotedSHA` to the correct commit SHA, re-run bundler with fewer commits

### UPSTREAM_PAT Secret Not Found
- **Issue:** Workflow fails on auth
- **Fix:** Go to repository settings → Secrets → verify `UPSTREAM_PAT` exists and is not expired

## Contributing

To modify fork-only tooling:
1. Edit files in `.github/fork-only/` or `.github/workflows/fork-*.*`
2. Test locally (workflows run on push/schedule)
3. Commit and push — these changes never go upstream

## References

- GitHub Agentic Workflows: https://github.github.com/gh-aw/
- GitHub Actions: https://docs.github.com/en/actions
- Git Cherry-pick: https://git-scm.com/docs/git-cherry-pick
- Fine-grained PATs: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token
