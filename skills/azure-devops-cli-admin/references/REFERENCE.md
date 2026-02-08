# Azure DevOps CLI Admin

Quick reference for common Azure DevOps admin CLI commands.

- [Azure DevOps CLI Admin](#azure-devops-cli-admin)
  - [Defaults](#defaults)
  - [Banners](#banners)
  - [Extensions](#extensions)

## Defaults

```bash
# Set defaults for the organization (and optionally project)
az devops configure --defaults organization=https://dev.azure.com/{org} project={project}
```

## Banners

```bash
# List banners
az devops admin banner list

# Add a banner
az devops admin banner add \
  --message "System maintenance scheduled" \
  --level info

# Update a banner
az devops admin banner update \
  --id {banner-id} \
  --message "Updated message" \
  --level warning

# Remove a banner
az devops admin banner remove --id {banner-id}
```

## Extensions

```bash
# List installed extensions
az devops extension list --org https://dev.azure.com/{org}

# Search Marketplace extensions
az devops extension search --search-query "docker"

# Install an extension
az devops extension install \
  --ext-id {extension-id} \
  --org https://dev.azure.com/{org} \
  --publisher {publisher-id}

# Enable or disable an extension
az devops extension enable --ext-id {extension-id} --org https://dev.azure.com/{org}
az devops extension disable --ext-id {extension-id} --org https://dev.azure.com/{org}

# Uninstall an extension
az devops extension uninstall --ext-id {extension-id} --org https://dev.azure.com/{org} --yes
```
