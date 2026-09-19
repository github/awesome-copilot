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
network:
  allowed:
    - defaults
    - github
tools:
  github:
    toolsets: [repos, pull_requests]
  bash:
    - "git *"
    - "jq *"
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
      changed_workflows: ${{ steps.diff.outputs.changed_workflows }}
    steps:
      - name: Checkout fork
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
          token: ${{ secrets.FORK_AUTOMATION_PAT }}

      - name: Configure git push credentials
        env:
          FORK_AUTOMATION_PAT: ${{ secrets.FORK_AUTOMATION_PAT }}
        run: |
          # actions/checkout runs with persist-credentials: false, so origin has no
          # stored auth; git push needs an explicit authenticated remote URL.
          if [ -z "${FORK_AUTOMATION_PAT}" ]; then
            echo "::error::FORK_AUTOMATION_PAT is not configured"
            exit 1
          fi
          git remote set-url origin "https://x-access-token:${FORK_AUTOMATION_PAT}@github.com/${GITHUB_REPOSITORY}.git"
          git config --global user.name "github-actions[bot]"
          git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"

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
          NEW_WF=$(git diff --name-only --diff-filter=A origin/main...upstream/main -- '.github/workflows/*.yml' '.github/workflows/*.yaml' | paste -sd ',' -)
          echo "new_workflows=$NEW_WF" >> "$GITHUB_OUTPUT"

          # Existing upstream workflow files that were modified (may change what a kept workflow does)
          CHANGED_WF=$(git diff --name-only --diff-filter=M origin/main...upstream/main -- '.github/workflows/*.yml' '.github/workflows/*.yaml' | paste -sd ',' -)
          echo "changed_workflows=$CHANGED_WF" >> "$GITHUB_OUTPUT"

      - name: Push upstream mirror branch
        if: steps.diff.outputs.has_changes == 'true'
        run: |
          # Upstream routinely changes .github/workflows/*; pushing those needs the PAT to have the `workflow` scope.
          if ! git push --quiet origin upstream/main:refs/heads/fork-sync/upstream 2> push.err; then
            cat push.err
            if grep -q "workflow" push.err; then
              echo "::error::FORK_AUTOMATION_PAT lacks the 'workflow' scope. Edit the classic PAT, tick 'workflow', and update the repository secret (see .github/fork-only/README.md)."
            fi
            exit 1
          fi

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

          PR_OUTPUT=$(gh pr create --repo "$GITHUB_REPOSITORY" \
            --base main --head fork-sync/upstream \
            --title "chore(fork-sync): merge upstream main ($(date -u +%Y-%m-%d))" \
            --body-file "$BODY_FILE")
          PR_URL=$(printf '%s\n' "$PR_OUTPUT" | grep -Eo 'https?://[^[:space:]]+/pull/[0-9]+' | tail -n1)
          PR_NUMBER=${PR_URL##*/}
          if [ -z "$PR_URL" ] || [ -z "$PR_NUMBER" ]; then
            echo "::error::Unable to determine the sync PR number from gh output"
            printf '%s\n' "$PR_OUTPUT"
            exit 1
          fi
          echo "pr_number=$PR_NUMBER" >> "$GITHUB_OUTPUT"
          echo "::notice::Opened sync PR #$PR_NUMBER"
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
  report-incomplete:
    create-issue: false
  noop:
---

# Fork Sync Watchdog

You are summarising an upstream sync for the maintainer of the fork **${{ github.repository }}** of `github/awesome-copilot`. A deterministic job has already pushed upstream `main` to the branch `fork-sync/upstream` and opened (or refreshed) pull request **#${{ needs.sync.outputs.pr_number }}** against this fork's `main`. Your job is to explain what is in it.

## Facts from the sync job

- Upstream HEAD: `${{ needs.sync.outputs.upstream_sha }}`
- Contribution-guideline files changed upstream (comma-separated, may be empty): `${{ needs.sync.outputs.guideline_files }}`
- Workflow files **added** upstream (comma-separated, may be empty): `${{ needs.sync.outputs.new_workflows }}`
- Workflow files **modified** upstream (comma-separated, may be empty): `${{ needs.sync.outputs.changed_workflows }}`

## About this fork

The fork exists to develop one custom agent — `agents/oracle-to-postgres-migration-expert.agent.md`, its plugin `plugins/oracle-to-postgres-migration-expert/`, and `skills/*oracle-to-postgres*` — and promote it upstream. Upstream workflows all run here after a sync unless the maintainer disables them in the Actions tab. The maintainer's policy, from `.github/fork-only/README.md`:

- **Keep** workflows that lint or validate agents, plugins, skills, or READMEs (e.g. `skill-check*.yml`, `validate-plugins.yml`, `validate-readme.yml`, `validate-agentic-workflows-pr.yml`) — they are the checks an upstream PR will face, so failing early in the fork is valuable.
- **Disable** workflows that assume upstream-only context: org secrets, upstream-only labels or teams, publishing/deploy steps, release automation, stale-issue bots, or anything that would post noise or fail permanently in a fork.
- **Integrate** is an option when a new upstream workflow does something the fork's own tooling (`.github/workflows/fork-*`, `.github/fork-only/`) also does or should do — e.g. a new lint the bundler should run before promoting, or a check the `fork-agent-reviewer` should mirror.

## Steps

1. In the checked-out repository run:
   - `git fetch --quiet upstream main`
   - `git log --oneline origin/main..upstream/main` to list incoming commits
   - `git diff --stat origin/main...upstream/main` for the change footprint
2. If the guideline list above is non-empty, run `git diff origin/main...upstream/main -- CONTRIBUTING.md AGENTS.md` and read the full diff.
3. For each **added** workflow file, read the whole file (`git show upstream/main:<file>`): its triggers (`on:`), `permissions:`, any `secrets.*` it references, and what it does.
4. For each **modified** workflow file, read the diff (`git diff origin/main...upstream/main -- <file>`) and judge whether the change matters to a fork that has it enabled.

## Output 1 — comment on the sync PR (always)

Post the comment on PR **#${{ needs.sync.outputs.pr_number }}**. Call `add_comment` **once**, after all analysis is done, with the complete comment body — see Rules.

**How to post it (do exactly this — nothing else):**

1. Write the finished Markdown body to `/tmp/gh-aw/agent/comment.md` using your file-creation tool (not a shell heredoc).
2. Run this single command to post it:
   ```bash
   jq -Rs '{pr: ${{ needs.sync.outputs.pr_number }}, body: .}' /tmp/gh-aw/agent/comment.md | safeoutputs add_comment .
   ```
   `jq -Rs` slurps the file into a proper JSON string. Do **not** use `cat file | safeoutputs …`, `--body -`, `--body="$(cat …)"`, `printf` with embedded newlines, `python3`, `node`, or `bash -c` — those are either blocked in this sandbox or silently post the wrong body. If the `jq` command itself is denied, call `report_incomplete` explaining that; do not improvise another transport.

**Formatting rules for the whole comment:** prefer bullet points over prose everywhere. Never write a paragraph longer than one sentence; if you have two things to say, use two bullets. Lead each bullet with a bolded 2–5 word headline, then a dash and the detail. Use `##` headings for each section below so the maintainer can scan it.

Structure:

- **Summary** — 3–6 bullets, one per main theme of the sync (e.g. new agents, plugin/skill changes, workflow changes, docs, tooling), not one per commit. Open each with a bold headline and, where useful, the count of files or commits involved. End with a single **Action needed** bullet that says either "None — merge when ready" or lists the concrete things the maintainer must do after merging (disable workflows, update fork docs, review guideline changes).
- **Incoming commits** — the `git log --oneline` list inside a collapsed `<details>` block (truncate to the most recent 40 if longer and say so).
- **Change footprint** — the `--stat` output inside a collapsed `<details>` block.
- **Affects this fork?** — bullets calling out anything touching `agents/oracle-to-postgres-migration-expert.agent.md`, `plugins/oracle-to-postgres-migration-expert/`, or `skills/*oracle-to-postgres*`. If nothing does, write one bullet: "**No direct impact** — none of the fork's owned paths changed."
- **New upstream workflows** — if the added list is empty write "No new workflow files." Otherwise render a table with one row per file: `File | Trigger | Needs upstream-only context? | Recommendation | Why`. Recommendation is exactly one of **Keep**, **Disable**, or **Integrate**, applying the policy above. For every **Disable**, follow the table with the steps: *after merging this PR* → Actions tab → select the workflow → `⋯` → **Disable workflow**. For every **Integrate**, say concretely what to change in which fork file. Finish with a reminder to update the *Which upstream workflows to leave enabled* list in `.github/fork-only/README.md` if any verdict changes it.
- **Modified upstream workflows** — if the modified list is empty write "No existing workflow files changed." Otherwise one bullet per file: bold file name, then whether the change affects a fork that keeps it enabled (e.g. new secret required, new required check, trigger change); say "no fork impact" where that is the case.
- **Contribution guidelines** — if the guideline list is empty write "No changes to CONTRIBUTING.md or AGENTS.md." Otherwise one bullet per substantive change, and link to the issue you create in Output 2.

## Output 2 — issue (only if guideline files changed)

If `${{ needs.sync.outputs.guideline_files }}` is non-empty, use `create_issue` (same transport as the comment: write the body to `/tmp/gh-aw/agent/issue.md`, then `jq -Rs '{title: "Upstream contribution guidelines changed — review fork automation", body: .}' /tmp/gh-aw/agent/issue.md | safeoutputs create_issue .`):

- Title: `Upstream contribution guidelines changed — review fork automation`
- Body must include: which files changed; the full diff of those files in a fenced ```diff block; a plain-language explanation of what each change **means for this fork's workflow** (branching, PR titles, build steps, required checks, path conventions); and a checklist of fork files that may need updating (`.github/fork-only/README.md`, `.github/agents/dev-orchestrator.agent.md`, `.github/workflows/fork-bundle-upstream-pr.yml`).

If no guideline files changed, do **not** create an issue.

## Rules

- **`add_comment` exactly once, and only with the finished summary.** The run permits a single comment. Never make a test, placeholder, "checking the tool works", or partial call — the first call is the only one that will ever land, so it must contain the complete Output 1 content. Do all analysis first, write the full comment to a file, then post it with the exact `jq … | safeoutputs add_comment .` command in Output 1. If you are unsure whether a command will populate `body` correctly, do not run it.
- Do not edit files, do not push, do not merge. The maintainer merges the sync PR by hand.
- Be factual; quote file paths and SHAs rather than paraphrasing them.
- Bullets, not paragraphs. The maintainer skims this on a Friday morning — make every line earn its place.
- If you cannot access the repository or the diff, call `noop` with a one-line reason. Never post a placeholder comment instead.
