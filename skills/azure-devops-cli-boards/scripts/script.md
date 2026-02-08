
### Idempotent Work Item Creation

```bash
# Create work item only if doesn't exist with same title
create_work_item_if_new() {
  local title=$1
  local type=$2

  WI_ID=$(az boards query \
    --wiql "SELECT ID FROM WorkItems WHERE [System.WorkItemType]='$type' AND [System.Title]='$title'" \
    --query "[0].id" -o tsv)

  if [[ -z "$WI_ID" ]]; then
    echo "Creating work item: $title"
    WI_ID=$(az boards work-item create --title "$title" --type "$type" --query "id" -o tsv)
  else
    echo "Work item exists: $title (ID: $WI_ID)"
  fi

  echo "$WI_ID"
}
```
