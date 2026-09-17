---
description: 'Fork-only: weekly upstream sync PR from github/awesome-copilot plus an AI summary that flags contribution-guideline and workflow changes'
on:
  schedule:
    - cron: '0 10 * * 5'
  workflow_dispatch:
permissions:
  contents: read
  pull-requests: read
  issues: read
  copilot-requests: write
concurrency:
  group: fork-sync-watchdog
  cancel-in-progress: false
timeout-minutes: 15
tools:
  github:
    toolsets: [repos, pull_requests]
  bash:
    - "git *"
jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    outputs:
      has_changes: ${{ steps.diff.outputs.has_changes }}
      pr_number: ${{ steps.pr.outputs.pr_number }}
      upstream_sha: ${{ steps.diff.outputs.upstream_sha }}
      guideline_files: ${{ steps.diff.outputs.guideline_files }}
      new_workflows: ${{ steps.diff.outputs.new_workflows }}
    steps:
      - name: Checkout fork
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
          token: ${{ secrets.FORK_AUTOMATION_PAT }}

      - name: Fetch upstream
        run: |
          git remote add upstream https://github.com/github/awesome-copilot.git
          git fetch --quiet upstream main

      - name: Compute unmerged upstream changes
        id: diff
        run: |
          UPSTREAM_SHA=$(git rev-parse upstream/main)
          echo "upstream_sha=$UPSTREAM_SHA" >> "$GITHUB_OUTPUT"

          if git merge-base --is-ancestor upstream/main origin/main; then
            echo "has_changes=false" >> "$GITHUB_OUTPUT"
            echo "::notice::Fork main already contains upstream/main ($UPSTREAM_SHA). Nothing to sync."
            exit 0
          fi
          echo "has_changes=true" >> "$GITHUB_OUTPUT"

          # Contribution guidelines that changed upstream since the last sync
          GUIDELINES=$(git diff --name-only origin/main...upstream/main -- CONTRIBUTING.md AGENTS.md | paste -sd ',' -)
          echo "guideline_files=$GUIDELINES" >> "$GITHUB_OUTPUT"

          # Workflow files added upstream (each one will start running in this fork once merged)
          NEW_WF=$(git diff --name-only --diff-filter=A origin/main...upstream/main -- '.github/workflows/*.yml' | paste -sd ',' -)
          echo "new_workflows=$NEW_WF" >> "$GITHUB_OUTPUT"

      - name: Push upstream mirror branch
        if: steps.diff.outputs.has_changes == 'true'
        run: git push --quiet origin upstream/main:refs/heads/fork-sync/upstream

      - name: Open or reuse sync PR
        id: pr
        if: steps.diff.outputs.has_changes == 'true'
        env:
          GH_TOKEN: ${{ secrets.FORK_AUTOMATION_PAT }}
          UPSTREAM_SHA: ${{ steps.diff.outputs.upstream_sha }}
        run: |
          EXISTING=$(gh pr list --repo "$GITHUB_REPOSITORY" --head fork-sync/upstream --base main --state open --json number --jq '.[0].number // empty')
          if [ -n "$EXISTING" ]; then
            echo "pr_number=$EXISTING" >> "$GITHUB_OUTPUT"
            echo "::notice::Reusing open sync PR #$EXISTING (branch fast-forwarded)."
            exit 0
          fi

          BODY_FILE=$(mktemp)
          cat > "$BODY_FILE" <<EOF
          Weekly mirror of \`github/awesome-copilot\` \`main\` into this fork.

          - Upstream HEAD: \`$UPSTREAM_SHA\`
          - Merge with **Create a merge commit** so shared history is preserved for future syncs.
          - An AI summary of what changed (and anything that affects contribution rules or fork workflows) follows as a comment.

          _Opened by the fork-sync-watchdog workflow._
          EOF

          PR_URL=$(gh pr create --repo "$GITHUB_REPOSITORY" \
            --base main --head fork-sync/upstream \
            --title "chore(fork-sync): merge upstream main ($(date -u +%Y-%m-%d))" \
            --body-file "$BODY_FILE")
          echo "pr_number=${PR_URL##*/}" >> "$GITHUB_OUTPUT"
          echo "::notice::Opened sync PR $PR_URL"
  agent:
    needs: [sync]
    if: needs.sync.outputs.has_changes == 'true'
safe-outputs:
  add-comment:
    target: "*"
    max: 1
  create-issue:
    title-prefix: "[fork-watchdog] "
    labels: [fork-automation, contribution-guidelines]
    max: 1
  noop:
---

# Fork Sync Watchdog

You are summarising an upstream sync for the maintainer of the fork **${{ github.repository }}** of `github/awesome-copilot`. A deterministic job has already pushed upstream `main` to the branch `fork-sync/upstream` and opened (or refreshed) pull request **#${{ needs.sync.outputs.pr_number }}** against this fork's `main`. Your job is to explain what is in it.

## Facts from the sync job

- Upstream HEAD: `${{ needs.sync.outputs.upstream_sha }}`
- Contribution-guideline files changed upstream (comma-separated, may be empty): `${{ needs.sync.outputs.guideline_files }}`
- Workflow files **added** upstream (comma-separated, may be empty): `${{ needs.sync.outputs.new_workflows }}`

## Steps

1. In the checked-out repository run:
   - `git remote add upstream https://github.com/github/awesome-copilot.git && git fetch --quiet upstream main`
   - `git log --oneline origin/main..upstream/main` to list incoming commits
   - `git diff --stat origin/main...upstream/main` for the change footprint
2. If the guideline list above is non-empty, run `git diff origin/main...upstream/main -- CONTRIBUTING.md AGENTS.md` and read the full diff.
3. Read the diff of any newly added workflow files listed above (`git diff origin/main...upstream/main -- <file>`).

## Output 1 — comment on the sync PR (always)

Use `add_comment` with `pull_request_number` = ${{ needs.sync.outputs.pr_number }}. Structure:

- **Summary** — 2–4 sentences on what this sync brings in.
- **Incoming commits** — the `git log --oneline` list (truncate to the most recent 40 if longer and say so).
- **Change footprint** — the `--stat` output inside a collapsed `<details>` block.
- **Affects this fork?** — call out anything touching `agents/oracle-to-postgres-migration-expert.agent.md`, `plugins/oracle-to-postgres-migration-expert/`, `skills/*oracle-to-postgres*`, or `.github/workflows/`. If new workflow files were added, list them and remind the maintainer to decide whether to disable each one in the fork's Actions tab after merging.
- **Contribution guidelines** — if the guideline list is empty write "No changes to CONTRIBUTING.md or AGENTS.md." Otherwise summarise the changes and link to the issue you create in Output 2.

## Output 2 — issue (only if guideline files changed)

If `${{ needs.sync.outputs.guideline_files }}` is non-empty, use `create_issue`:

- Title: `Upstream contribution guidelines changed — review fork automation`
- Body must include: which files changed; the full diff of those files in a fenced ```diff block; a plain-language explanation of what each change **means for this fork's workflow** (branching, PR titles, build steps, required checks, path conventions); and a checklist of fork files that may need updating (`.github/fork-only/README.md`, `.github/fork-only/PLAN.md`, `.github/fork-only/agents/dev-orchestrator.agent.md`, `.github/workflows/fork-bundle-upstream-pr.yml`).

If no guideline files changed, do **not** create an issue.

## Rules

- Do not edit files, do not push, do not merge. The maintainer merges the sync PR by hand.
- Be factual; quote file paths and SHAs rather than paraphrasing them.
- If you cannot access the repository or the diff, call `noop` with a one-line reason.
