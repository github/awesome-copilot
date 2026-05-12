# gh issue — Issues

Create, list, view, edit, close/reopen, comment, pin, lock, transfer, delete issues. Plus `gh issue develop` to branch off an issue.

## Create

```bash
gh issue create                                       # interactive
gh issue create --title "Bug: Login" --body "Repro..."
gh issue create --body-file issue.md
gh issue create --title "Fix bug" --label bug,high-priority
gh issue create --title "Fix bug" --assignee user1,user2
gh issue create --title "..." --milestone "v1.0" --project "Roadmap"
gh issue create --repo owner/repo --title "..."
gh issue create --web                                 # open form in browser
```

## List

```bash
gh issue list                                         # open
gh issue list --state all                             # open + closed
gh issue list --state closed
gh issue list --limit 50
gh issue list --assignee @me                          # mine
gh issue list --assignee username
gh issue list --label bug,enhancement
gh issue list --milestone "v1.0"
gh issue list --search "is:open label:bug no:assignee"
gh issue list --sort created --order desc
gh issue list --json number,title,state,author
gh issue list --json number,title,labels \
  --jq '.[] | [.number, .title, (.labels | map(.name) | join(","))] | @tsv'
```

## View

```bash
gh issue view 123
gh issue view 123 --comments
gh issue view 123 --web
gh issue view 123 --json title,body,state,labels,comments
gh issue view 123 --json title --jq '.title'
```

## Edit

```bash
gh issue edit 123                                     # interactive
gh issue edit 123 --title "New title"
gh issue edit 123 --body "New description"
gh issue edit 123 --body-file desc.md
gh issue edit 123 --add-label bug --remove-label stale
gh issue edit 123 --add-assignee user1 --remove-assignee user2
gh issue edit 123 --milestone "v1.0"
```

## Close / reopen

```bash
gh issue close 123
gh issue close 123 --comment "Fixed in PR #456" --reason completed
gh issue reopen 123
```

## Comment

```bash
gh issue comment 123 --body "Looks good!"
gh issue comment 123 --body-file reply.md
gh issue comment 123 --edit-last --body "Updated"
```

## Status summary

```bash
gh issue status                                       # mine + assigned + mentioned
gh issue status --repo owner/repo
```

## Pin / lock / transfer / delete

```bash
gh issue pin 123
gh issue unpin 123
gh issue lock 123 --reason off-topic                  # resolved|off-topic|too heated|spam
gh issue unlock 123
gh issue transfer 123 owner/new-repo
gh issue delete 123 --yes
```

## Develop (branch + draft PR from an issue)

```bash
gh issue develop 123                                  # create linked branch
gh issue develop 123 --branch fix/issue-123
gh issue develop 123 --base main --checkout
```
