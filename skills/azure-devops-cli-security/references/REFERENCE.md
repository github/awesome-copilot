# Security Groups

- [Security Groups](#security-groups)
  - [List Groups](#list-groups)
  - [Show Group Details](#show-group-details)
  - [Create Group](#create-group)
  - [Update Group](#update-group)
  - [Delete Group](#delete-group)
  - [Group Memberships](#group-memberships)
  - [Security Permissions](#security-permissions)
    - [List Namespaces](#list-namespaces)
    - [Show Namespace Details](#show-namespace-details)
    - [List Permissions](#list-permissions)
    - [Show Permissions](#show-permissions)
    - [Update Permissions](#update-permissions)
    - [Reset Permissions](#reset-permissions)
  - [Error Handling](#error-handling)
    - [Handle Permission Errors](#handle-permission-errors)

## List Groups

```bash
# List all groups in project
az devops security group list --project {project}

# List all groups in organization
az devops security group list --scope organization

# List with filtering
az devops security group list --project {project} --subject-types vstsgroup
```

## Show Group Details

```bash
az devops security group show --id {group-descriptor}
```

## Create Group

```bash
az devops security group create \
  --name {group-name} \
  --description "Group description" \
  --project {project}
```

## Update Group

```bash
az devops security group update \
  --id {group-descriptor} \
  --name "{new-group-name}" \
  --description "Updated description"
```

## Delete Group

```bash
az devops security group delete --id {group-descriptor} --yes
```

## Group Memberships

```bash
# List memberships
az devops security group membership list --id {group-id}

# Add member
az devops security group membership add \
  --group-id {group-id} \
  --member-id {member-id}

# Remove member
az devops security group membership remove \
  --group-id {group-id} \
  --member-id {member-id} --yes
```

## Security Permissions

### List Namespaces

```bash
az devops security permission namespace list
```

### Show Namespace Details

```bash
# Show permissions available in a namespace (requires namespace GUID)
az devops security permission namespace show --namespace-id {namespace-guid}
```

### List Permissions

```bash
# List permissions for user/group and namespace
az devops security permission list \
  --namespace-id {namespace-guid} \
  --subject {user-email-or-group-descriptor}

# List for specific token (repository)
az devops security permission list \
  --namespace-id {namespace-guid} \
  --subject {user-email-or-group-descriptor} \
  --token "repoV2/{project-id}/{repository-id}"
```

### Show Permissions

```bash
az devops security permission show \
  --namespace-id {namespace-guid} \
  --subject {user-email-or-group-descriptor} \
  --token "repoV2/{project-id}/{repository-id}"
```

### Update Permissions

```bash
# Grant permission (allow-bit is the sum of permission bits to allow)
az devops security permission update \
  --namespace-id {namespace-guid} \
  --subject {user-email-or-group-descriptor} \
  --token "repoV2/{project-id}/{repository-id}" \
  --allow-bit {permission-bit-value}

# Deny permission (deny-bit is the sum of permission bits to deny)
az devops security permission update \
  --namespace-id {namespace-guid} \
  --subject {user-email-or-group-descriptor} \
  --token "repoV2/{project-id}/{repository-id}" \
  --deny-bit {permission-bit-value}
```

### Reset Permissions

```bash
# Reset specific permission bits
az devops security permission reset \
  --namespace-id {namespace-guid} \
  --subject {user-email-or-group-descriptor} \
  --token "repoV2/{project-id}/{repository-id}" \
  --permission-bit {permission-bit-value}

# Reset all permissions
az devops security permission reset-all \
  --namespace-id {namespace-guid} \
  --subject {user-email-or-group-descriptor} \
  --token "repoV2/{project-id}/{repository-id}" --yes
```

## Error Handling

### Handle Permission Errors

```bash
# Try operation, handle permission errors
if az devops security permission update \
  --namespace-id "$NAMESPACE_ID" \
  --subject "$USER_EMAIL" \
  --token "repoV2/$PROJECT_ID/$REPO_ID" \
  --allow-bit 2 2>&1 | grep -q "unauthorized"; then
  echo "Error: Insufficient permissions to update repository permissions"
  exit 1
fi
```
