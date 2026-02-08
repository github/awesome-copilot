# Teams

- [Teams](#teams)
  - [List teams](#list-teams)
  - [Show team](#show-team)
  - [Create team](#create-team)
  - [Update team](#update-team)
  - [Delete team](#delete-team)
  - [Show team members](#show-team-members)

## List teams

```bash
az devops team list --project {project}
```

## Show team

```bash
az devops team show --team {team-name} --project {project}
```

## Create team

```bash
az devops team create \
  --name {team-name} \
  --description "Team description" \
  --project {project}
```

## Update team

```bash
az devops team update \
  --team {team-name} \
  --project {project} \
  --name "{new-team-name}" \
  --description "Updated description"
```

## Delete team

```bash
az devops team delete --id {team-id} --project {project} --yes
```

## Show team members

```bash
az devops team list-member --team {team-name} --project {project}
```
