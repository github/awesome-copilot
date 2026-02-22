# Universal Packages

- [Universal Packages](#universal-packages)
  - [List Feeds](#list-feeds)
  - [Publish Package](#publish-package)
  - [Download Package](#download-package)

## List Feeds

Note: The command group `az artifacts feed` is not available in the current azure-devops extension.
Use the DevOps REST wrapper instead to list feeds.

```bash
az devops invoke --area packaging --resource feeds --output json
```

## Publish Package

```bash
az artifacts universal publish \
  --feed {feed-name} \
  --name {package-name} \
  --version {version} \
  --path {package-path} \
  --project {project}
```

## Download Package

```bash
az artifacts universal download \
  --feed {feed-name} \
  --name {package-name} \
  --version {version} \
  --path {download-path} \
  --project {project}
```
