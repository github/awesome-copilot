# gh pr — Pull Requests

Create, list, view, checkout, diff, merge, close, reopen, edit, review, comment, update branch, lock, revert. Plus `gh pr checks` and `gh pr status`.

## Create

```bash
gh pr create                                                # interactive
gh pr create --title "feat: X" --body "..."
gh pr create --body-file .github/PULL_REQUEST_TEMPLATE.md
gh pr create --base main --head feature-branch
gh pr create --draft
gh pr create --assignee user1,user2 --reviewer user3
gh pr create --label enhancement,feature
gh pr create --fill                                         # use commit info for title/body
gh pr create --fill-first                                   # only first commit
gh pr create --repo owner/repo
gh pr create --web                                          # open form in browser
```

## List

```bash
gh pr list                                                   # open
gh pr list --state all                                       # all states
gh pr list --state merged
gh pr list --state closed                                    # closed but not merged
gh pr list --head feature-branch --base main
gh pr list --author @me
gh pr list --assignee username
gh pr list --label bug,enhancement
gh pr list --limit 50
gh pr list --search "is:open review-requested:@me"
gh pr list --json number,title,state,author,headRefName
gh pr list --json number,title,statusCheckRollup \
  --jq '.[] | [.number, .title, (.statusCheckRollup | map(.conclusion) | unique | join(","))] | @tsv'
```

## View

```bash
gh pr view 123                                               # defaults to current branch's PR
gh pr view                                                   # auto-detect from branch
gh pr view 123 --comments
gh pr view 123 --web
gh pr view 123 --json title,body,state,author,commits,files,reviews
```

## Checkout

```bash
gh pr checkout 123
gh pr checkout 123 --branch custom-name
gh pr checkout 123 --force                                   # discard local changes
gh pr checkout 123 --detach                                  # detached HEAD
```

## Diff

```bash
gh pr diff 123
gh pr diff 123 --color always
gh pr diff 123 --name-only                                   # file list only
gh pr diff 123 --patch > pr-123.patch
```

## Merge

```bash
gh pr merge 123                                              # interactive
gh pr merge 123 --merge                                      # merge commit
gh pr merge 123 --squash
gh pr merge 123 --rebase
gh pr merge 123 --delete-branch
gh pr merge 123 --auto                                       # enable auto-merge
gh pr merge 123 --subject "..." --body "..."
gh pr merge 123 --admin                                      # bypass required checks
```

## Close / reopen

```bash
gh pr close 123
gh pr close 123 --comment "Superseded by #456" --delete-branch
gh pr reopen 123
```

## Edit

```bash
gh pr edit 123 --title "New title" --body "New desc"
gh pr edit 123 --add-label bug --remove-label stale
gh pr edit 123 --add-assignee user1 --remove-assignee user2
gh pr edit 123 --add-reviewer user3 --remove-reviewer user4
gh pr edit 123 --base main                                   # change target branch
```

## Ready for review

```bash
gh pr ready 123                                              # mark draft ready
gh pr ready 123 --undo                                       # back to draft
```

## Checks

```bash
gh pr checks 123                                             # status table
gh pr checks 123 --watch                                     # re-render until done
gh pr checks 123 --watch --interval 5
gh pr checks 123 --required                                  # only required checks
gh pr checks 123 --json name,status,conclusion,link
```

## Comment

```bash
gh pr comment 123 --body "Looks good!"
gh pr comment 123 --body-file reply.md
gh pr comment 123 --edit-last --body "Updated"
```

## Review

```bash
gh pr review 123                                             # editor opens
gh pr review 123 --approve --body "LGTM"
gh pr review 123 --request-changes --body "Please fix..."
gh pr review 123 --comment --body "Some thoughts..."
```

## Update branch (sync with base)

```bash
gh pr update-branch 123                                      # merge base into PR branch
gh pr update-branch 123 --rebase                             # rebase instead
```

## Lock / revert

```bash
gh pr lock 123 --reason off-topic
gh pr unlock 123
gh pr revert 123                                             # open PR to revert a merged PR
gh pr revert 123 --branch revert-pr-123
```

## Status summary

```bash
gh pr status                                                 # mine + assigned + review-requested
gh pr status --repo owner/repo
```
