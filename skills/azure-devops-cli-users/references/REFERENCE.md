# Users

- [Users](#users)
  - [List users](#list-users)
  - [Show user](#show-user)
  - [Add user](#add-user)
  - [Update user](#update-user)
  - [Remove user](#remove-user)

## List users

```bash
# List users
az devops user list --org https://dev.azure.com/{org}
az devops user list --top 10 --output table
```

## Show user

```bash
az devops user show --user {user-id-or-email} --org https://dev.azure.com/{org}
```

## Add user

```bash
az devops user add \
  --email-id user@example.com \
  --license-type express \
  --org https://dev.azure.com/{org}
```

## Update user

```bash
az devops user update \
  --user {user-id-or-email} \
  --license-type advanced \
  --org https://dev.azure.com/{org}
```

## Remove user

```bash
az devops user remove --user {user-id-or-email} --org https://dev.azure.com/{org} --yes
```
