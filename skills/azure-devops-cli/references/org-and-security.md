# Organization, Security & Administration

## Table of Contents
- [Projects](#projects)
- [Extension Management](#extension-management)
- [Service Endpoints](#service-endpoints)
- [Teams](#teams)
- [Users](#users)
- [Security Groups](#security-groups)
- [Security Permissions](#security-permissions)
- [Wikis](#wikis)
- [Administration](#administration)
- [DevOps Extensions](#devops-extensions)

---

## Projects

### List Projects

```bash
az devops project list --organization https://dev.azure.com/{org}
az devops project list --top 10 --output table
```

### Create Project

```bash
az devops project create \
  --name myNewProject \
  --organization https://dev.azure.com/{org} \
  --description "My new DevOps project" \
  --source-control git \
  --visibility private
```

### Show Project Details

```bash
az devops project show --project {project-name} --org https://dev.azure.com/{org}
```

### Delete Project

```bash
az devops project delete --id {project-id} --org https://dev.azure.com/{org} --yes
```

## Extension Management

### List Extensions

```bash
# List available extensions
az extension list-available --output table

# List installed extensions
az extension list --output table
```

### Manage Azure DevOps Extension

```bash
# Install Azure DevOps extension
az extension add --name azure-devops

# Update Azure DevOps extension
az extension update --name azure-devops

# Remove extension
az extension remove --name azure-devops

# Install from local path
az extension add --source ~/extensions/azure-devops.whl
```

## Service Endpoints

### List Service Endpoints

```bash
az devops service-endpoint list --project {project}
az devops service-endpoint list --project {project} --output table
```

### Show Service Endpoint

```bash
az devops service-endpoint show --id {endpoint-id} --project {project}
```

### Create Service Endpoint

```bash
# Using configuration file
az devops service-endpoint create --service-endpoint-configuration endpoint.json --project {project}
```

### Delete Service Endpoint

```bash
az devops service-endpoint delete --id {endpoint-id} --project {project} --yes
```

## Teams

### List Teams

```bash
az devops team list --project {project}
```

### Show Team

```bash
az devops team show --team {team-name} --project {project}
```

### Create Team

```bash
az devops team create \
  --name {team-name} \
  --description "Team description" \
  --project {project}
```

### Update Team

```bash
az devops team update \
  --team {team-name} \
  --project {project} \
  --name "{new-team-name}" \
  --description "Updated description"
```

### Delete Team

```bash
az devops team delete --team {team-name} --project {project} --yes
```

### Show Team Members

```bash
az devops team list-member --team {team-name} --project {project}
```

## Users

### List Users

```bash
az devops user list --org https://dev.azure.com/{org}
az devops user list --top 10 --output table
```

### Show User

```bash
az devops user show --user {user-id-or-email} --org https://dev.azure.com/{org}
```

### Add User

```bash
az devops user add \
  --email user@example.com \
  --license-type express \
  --org https://dev.azure.com/{org}
```

### Update User

```bash
az devops user update \
  --user {user-id-or-email} \
  --license-type advanced \
  --org https://dev.azure.com/{org}
```

### Remove User

```bash
az devops user remove --user {user-id-or-email} --org https://dev.azure.com/{org} --yes
```

## Security Groups

### List Groups

```bash
# List all groups in project
az devops security group list --project {project}

# List all groups in organization
az devops security group list --scope organization

# List with filtering
az devops security group list --project {project} --subject-types vstsgroup
```

### Show Group Details

```bash
az devops security group show --group-id {group-id}
```

### Create Group

```bash
az devops security group create \
  --name {group-name} \
  --description "Group description" \
  --project {project}
```

### Update Group

```bash
az devops security group update \
  --group-id {group-id} \
  --name "{new-group-name}" \
  --description "Updated description"
```

### Delete Group

```bash
az devops security group delete --group-id {group-id} --yes
```

### Group Memberships

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
# Show permissions available in a namespace
az devops security permission namespace show --namespace "GitRepositories"
```

### List Permissions

```bash
# List permissions for user/group and namespace
az devops security permission list \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project}

# List for specific token (repository)
az devops security permission list \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}"
```

### Show Permissions

```bash
az devops security permission show \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}"
```

### Update Permissions

```bash
# Grant permission
az devops security permission update \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}" \
  --permission-mask "Pull,Contribute"

# Deny permission
az devops security permission update \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}" \
  --permission-mask 0
```

### Reset Permissions

```bash
# Reset specific permission bits
az devops security permission reset \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}" \
  --permission-mask "Pull,Contribute"

# Reset all permissions
az devops security permission reset-all \
  --id {user-or-group-id} \
  --namespace "GitRepositories" \
  --project {project} \
  --token "repoV2/{project}/{repository-id}" --yes
```

## Wikis

### List Wikis

```bash
# List all wikis in project
az devops wiki list --project {project}

# List all wikis in organization
az devops wiki list
```

### Show Wiki

```bash
az devops wiki show --wiki {wiki-name} --project {project}
az devops wiki show --wiki {wiki-name} --project {project} --open
```

### Create Wiki

```bash
# Create project wiki
az devops wiki create \
  --name {wiki-name} \
  --project {project} \
  --type projectWiki

# Create code wiki from repository
az devops wiki create \
  --name {wiki-name} \
  --project {project} \
  --type codeWiki \
  --repository {repo-name} \
  --mapped-path /wiki
```

### Delete Wiki

```bash
az devops wiki delete --wiki {wiki-id} --project {project} --yes
```

### Wiki Pages

```bash
# List pages
az devops wiki page list --wiki {wiki-name} --project {project}

# Show page
az devops wiki page show \
  --wiki {wiki-name} \
  --path "/page-name" \
  --project {project}

# Create page
az devops wiki page create \
  --wiki {wiki-name} \
  --path "/new-page" \
  --content "# New Page\n\nPage content here..." \
  --project {project}

# Update page
az devops wiki page update \
  --wiki {wiki-name} \
  --path "/existing-page" \
  --content "# Updated Page\n\nNew content..." \
  --project {project}

# Delete page
az devops wiki page delete \
  --wiki {wiki-name} \
  --path "/old-page" \
  --project {project} --yes
```

## Administration

### Banner Management

```bash
# List banners
az devops admin banner list

# Show banner details
az devops admin banner show --id {banner-id}

# Add new banner
az devops admin banner add \
  --message "System maintenance scheduled" \
  --level info  # info, warning, error

# Update banner
az devops admin banner update \
  --id {banner-id} \
  --message "Updated message" \
  --level warning \
  --expiration-date "2025-12-31T23:59:59Z"

# Remove banner
az devops admin banner remove --id {banner-id}
```

## DevOps Extensions

Manage extensions installed in an Azure DevOps organization (different from CLI extensions).

```bash
# List installed extensions
az devops extension list --org https://dev.azure.com/{org}

# Search marketplace extensions
az devops extension search --search-query "docker"

# Show extension details
az devops extension show --ext-id {extension-id} --org https://dev.azure.com/{org}

# Install extension
az devops extension install \
  --ext-id {extension-id} \
  --org https://dev.azure.com/{org} \
  --publisher {publisher-id}

# Enable extension
az devops extension enable \
  --ext-id {extension-id} \
  --org https://dev.azure.com/{org}

# Disable extension
az devops extension disable \
  --ext-id {extension-id} \
  --org https://dev.azure.com/{org}

# Uninstall extension
az devops extension uninstall \
  --ext-id {extension-id} \
  --org https://dev.azure.com/{org} --yes
```
