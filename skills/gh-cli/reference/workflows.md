# Common workflows — multi-step gh recipes

End-to-end patterns. Each one shows when it's useful and the exact commands.

## Ship a PR end-to-end

```bash
# Branch off an issue (optional)
gh issue develop 123 --branch fix/issue-123 --checkout

# ...edit, commit, push...
git push -u origin fix/issue-123

# Open PR, auto-link the issue
gh pr create --fill --body "Closes #123"

# Watch CI
gh pr checks --watch

# Merge when green
gh pr merge --squash --delete-branch
```

## Create repo with initial setup

```bash
gh repo create my-project --public \
  --description "..." --clone \
  --gitignore Python --license mit
cd my-project

git checkout -b develop && git push -u origin develop

gh label create bug         --color d73a4a --description "Bug report"
gh label create enhancement --color a2eeef --description "Feature request"
gh label create docs        --color 0075ca --description "Documentation"
```

## Fork + keep in sync with upstream

```bash
gh repo fork original/repo --clone --remote
cd repo
gh repo sync                                     # sync default branch
gh repo sync --branch feature --force            # specific branch, overwrite local
```

## Trigger workflow and wait for it

```bash
gh workflow run ci.yml --ref main
sleep 3                                                       # let the run register
RUN_ID=$(gh run list --workflow ci.yml --limit 1 \
           --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
gh run download "$RUN_ID" --dir ./artifacts
```

## Close multiple stale issues

```bash
gh issue list --label stale --limit 200 \
  --json number --jq '.[].number' \
| xargs -I {} gh issue close {} --comment "Closing as stale" --reason "not planned"
```

## Bulk-label PRs missing review

```bash
gh pr list --search "is:open review:required" --limit 200 \
  --json number --jq '.[].number' \
| xargs -I {} gh pr edit {} --add-label needs-review
```

## Clone all an org's non-archived repos

```bash
gh repo list my-org --limit 1000 --no-archived \
  --json nameWithOwner --jq '.[].nameWithOwner' \
| xargs -I {} gh repo clone {}
```

## Watch a PR's checks until green, then auto-merge

```bash
gh pr checks 123 --watch --interval 10 && \
  gh pr merge 123 --squash --delete-branch
# Or enable auto-merge (merges when all required checks pass)
gh pr merge 123 --squash --auto --delete-branch
```

## Export release assets for a version

```bash
gh release download v1.0.0 --dir ./dist --pattern "*.tar.gz"
gh release view v1.0.0 --json body --jq '.body' > CHANGELOG.md
```

## Find failed runs and rerun only the failed jobs

```bash
gh run list --workflow ci.yml --status failure --limit 5 \
  --json databaseId --jq '.[].databaseId' \
| xargs -I {} gh run rerun {} --failed
```

## Who reviewed my PR?

```bash
gh pr view 123 --json reviews \
  --jq '.reviews[] | {author: .author.login, state, submittedAt}'
```

## Scripting tips

- `export GH_TOKEN=$(gh auth token)` before shelling out to tools that expect a `$GH_TOKEN` env var.
- `export GH_PROMPT_DISABLED=true` to prevent any accidental interactive prompts in CI.
- `--jq '.[].number'` + `xargs -I {}` is the universal bulk pattern.
- Always pass `--limit` when iterating — defaults are conservative (30 on most list commands).
- `gh api --paginate --slurp` returns pages as an array when the endpoint returns objects, not arrays.
