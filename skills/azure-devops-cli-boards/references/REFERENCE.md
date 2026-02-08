# Work Items

- [Work Items](#work-items)
  - [Query Work Items](#query-work-items)
  - [Show Work Item](#show-work-item)
  - [Create Work Item](#create-work-item)
  - [Update Work Item](#update-work-item)
  - [Delete Work Item](#delete-work-item)
  - [Work Item Relations](#work-item-relations)
  - [Area Paths](#area-paths)
  - [Area Team Management](#area-team-management)
  - [Iterations](#iterations)
    - [Iterations for Team](#iterations-for-team)
  - [Common Workflows](#common-workflows)
    - [Create Work Item on Pipeline Failure](#create-work-item-on-pipeline-failure)
    - [Bulk Update Work Items](#bulk-update-work-items)

## Query Work Items

```bash
# WIQL query
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.State] = 'Active'"

# Query with output format
az boards query --wiql "SELECT * FROM WorkItems" --output table
```

## Show Work Item

```bash
az boards work-item show --id {work-item-id}
az boards work-item show --id {work-item-id} --open
```

## Create Work Item

```bash
# Basic work item
az boards work-item create \
  --title "Fix login bug" \
  --type Bug \
  --assigned-to user@example.com \
  --description "Users cannot login with SSO"

# With area and iteration
az boards work-item create \
  --title "New feature" \
  --type "User Story" \
  --area "Project\\Area1" \
  --iteration "Project\\Sprint 1"

# With custom fields
az boards work-item create \
  --title "Task" \
  --type Task \
  --fields "Priority=1" "Severity=2"

# With discussion comment
az boards work-item create \
  --title "Issue" \
  --type Bug \
  --discussion "Initial investigation completed"

# Open in browser after creation
az boards work-item create --title "Bug" --type Bug --open
```

## Update Work Item

```bash
# Update state, title, and assignee
az boards work-item update \
  --id {work-item-id} \
  --state "Active" \
  --title "Updated title" \
  --assigned-to user@example.com

# Move to different area
az boards work-item update \
  --id {work-item-id} \
  --area "{ProjectName}\\{Team}\\{Area}"

# Change iteration
az boards work-item update \
  --id {work-item-id} \
  --iteration "{ProjectName}\\Sprint 5"

# Add comment/discussion
az boards work-item update \
  --id {work-item-id} \
  --discussion "Work in progress"

# Update with custom fields
az boards work-item update \
  --id {work-item-id} \
  --fields "Priority=1" "StoryPoints=5"
```

## Delete Work Item

```bash
# Soft delete (can be restored)
az boards work-item delete --id {work-item-id} --yes

# Permanent delete
az boards work-item delete --id {work-item-id} --destroy --yes
```

## Work Item Relations

```bash
# List relations
az boards work-item relation list --id {work-item-id}

# List supported relation types
az boards work-item relation list-type

# Add relation
az boards work-item relation add --id {work-item-id} --relation-type parent --target-id {parent-id}

# Remove relation
az boards work-item relation remove --id {work-item-id} --relation-id {relation-id}
```

## Area Paths

```bash
# List areas for project
az boards area project list --project {project}
az boards area project show --path "Project\\Area1" --project {project}

# Create area
az boards area project create --path "Project\\NewArea" --project {project}

# Update area
az boards area project update \
  --path "Project\\OldArea" \
  --new-path "Project\\UpdatedArea" \
  --project {project}

# Delete area
az boards area project delete --path "Project\\AreaToDelete" --project {project} --yes
```

## Area Team Management

```bash
# List areas for team
az boards area team list --team {team-name} --project {project}

# Add area to team
az boards area team add \
  --team {team-name} \
  --path "Project\\NewArea" \
  --project {project}

# Remove area from team
az boards area team remove \
  --team {team-name} \
  --path "Project\\AreaToRemove" \
  --project {project}

# Update team area
az boards area team update \
  --team {team-name} \
  --path "Project\\Area" \
  --project {project} \
  --include-sub-areas true
```

## Iterations

```bash
# List iterations for project
az boards iteration project list --project {project}
az boards iteration project show --path "Project\\Sprint 1" --project {project}

# Create iteration
az boards iteration project create --path "Project\\Sprint 1" --project {project}

# Update iteration
az boards iteration project update \
  --path "Project\\OldSprint" \
  --new-path "Project\\NewSprint" \
  --project {project}

# Delete iteration
az boards iteration project delete --path "Project\\OldSprint" --project {project} --yes
```

### Iterations for Team

```bash
# List iterations for team
az boards iteration team list --team {team-name} --project {project}

# Add iteration to team
az boards iteration team add \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}

# Remove iteration from team
az boards iteration team remove \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}

# List work items in iteration
az boards iteration team list-work-items \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}

# Set default iteration for team
az boards iteration team set-default-iteration \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}

# Show default iteration
az boards iteration team show-default-iteration \
  --team {team-name} \
  --project {project}

# Set backlog iteration for team
az boards iteration team set-backlog-iteration \
  --team {team-name} \
  --path "Project\\Sprint 1" \
  --project {project}

# Show backlog iteration
az boards iteration team show-backlog-iteration \
  --team {team-name} \
  --project {project}

# Show current iteration
az boards iteration team show --team {team-name} --project {project} --timeframe current
```

## Common Workflows

### Create Work Item on Pipeline Failure

```bash
az boards work-item create \
  --title "Build $BUILD_BUILDNUMBER failed" \
  --type bug \
  --org $SYSTEM_TEAMFOUNDATIONCOLLECTIONURI \
  --project $SYSTEM_TEAMPROJECT
```

### Bulk Update Work Items

```bash
# Query items and update in loop
for id in $(az boards query --wiql "SELECT ID FROM WorkItems WHERE State='New'" -o tsv); do
  az boards work-item update --id $id --state "Active"
done
```
