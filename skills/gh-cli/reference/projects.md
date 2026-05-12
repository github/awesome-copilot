# gh project — GitHub Projects (v2)

Manage Projects v2 boards, fields, and items. Most commands need `--owner` (user or org).

## Project CRUD

```bash
gh project list                                     # your projects
gh project list --owner my-org
gh project list --closed
gh project list --format json

gh project view 123                                 # project by number
gh project view 123 --owner my-org
gh project view 123 --web
gh project view 123 --format json

gh project create --title "My Project" --owner @me
gh project create --title "Roadmap" --owner my-org
gh project edit 123 --owner my-org --title "New Title" --description "..."
gh project edit 123 --owner my-org --readme "Markdown readme"
gh project edit 123 --owner my-org --visibility PUBLIC   # PUBLIC|PRIVATE

gh project close 123 --owner my-org
gh project close 123 --owner my-org --undo
gh project copy 123 --source-owner my-org --target-owner my-org --title "Copy"
gh project delete 123 --owner my-org
gh project mark-template 123 --owner my-org
gh project link 123 --owner my-org --repo my-org/my-repo      # link to repo
gh project unlink 123 --owner my-org --repo my-org/my-repo
```

## Fields

```bash
gh project field-list 123 --owner my-org
gh project field-list 123 --owner my-org --format json

gh project field-create 123 --owner my-org \
  --name "Priority" --data-type SINGLE_SELECT \
  --single-select-options "High,Medium,Low"

gh project field-create 123 --owner my-org \
  --name "Effort" --data-type NUMBER

# Data types: TEXT | SINGLE_SELECT | DATE | NUMBER | ITERATION

gh project field-delete --id PVTF_xxx
```

## Items

```bash
gh project item-list 123 --owner my-org
gh project item-list 123 --owner my-org --format json --limit 200

# Add existing issue/PR to project
gh project item-add 123 --owner my-org \
  --url https://github.com/my-org/repo/issues/42

# Create a draft (non-issue) item
gh project item-create 123 --owner my-org \
  --title "Research: X" --body "Notes..."

gh project item-edit --id PVTI_xxx --field-id PVTF_xxx --text "In review"
gh project item-edit --id PVTI_xxx --field-id PVTF_xxx --single-select-option-id OPT_xxx
gh project item-edit --id PVTI_xxx --field-id PVTF_xxx --number 5
gh project item-edit --id PVTI_xxx --field-id PVTF_xxx --date 2026-06-01
gh project item-edit --id PVTI_xxx --field-id PVTF_xxx --iteration-id ITER_xxx
gh project item-edit --id PVTI_xxx --clear                  # clear field value

gh project item-archive --id PVTI_xxx
gh project item-archive --id PVTI_xxx --undo
gh project item-delete 123 --owner my-org --id PVTI_xxx
```

## Tip — look up field / option IDs

```bash
gh project field-list 123 --owner my-org --format json \
  --jq '.fields[] | {id, name, dataType, options: .options}'
```
