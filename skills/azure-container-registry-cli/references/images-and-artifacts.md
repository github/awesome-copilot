# Images & Artifacts

## Table of Contents
- [Import Images (Server-Side Copy)](#import-images-server-side-copy)
- [Repositories & Tags](#repositories--tags)
- [Manifests](#manifests)
- [Untag vs Delete](#untag-vs-delete)
- [Purge Old Images (acr purge)](#purge-old-images-acr-purge)
- [Lock Images](#lock-images)
- [Retention Policy & Soft Delete](#retention-policy--soft-delete)
- [Artifact Cache (Pull-Through Cache)](#artifact-cache-pull-through-cache)
- [Storage Usage](#storage-usage)

---

## Import Images (Server-Side Copy)

Preferred over `docker pull` + `docker push` — no local storage, keeps multi-arch manifests intact:

```bash
# From a public registry
az acr import --name {registry} --source mcr.microsoft.com/hello-world:latest
az acr import --name {registry} --source docker.io/library/nginx:1.27 --image nginx:1.27

# From another ACR in the same tenant (by resource ID, no credentials needed)
az acr import --name {registry} \
  --source app:v1 \
  --registry /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerRegistry/registries/{src-registry}

# From a private registry with credentials
az acr import --name {registry} --source private.example.com/app:v1 \
  --username {user} --password {password}

# Overwrite an existing tag
az acr import --name {registry} --source docker.io/library/nginx:1.27 --image nginx:1.27 --force
```

## Repositories & Tags

```bash
az acr repository list --name {registry} --output table

# Tags, newest first, with digest and timestamps
az acr repository show-tags --name {registry} --repository app \
  --orderby time_desc --detail --output table

az acr repository show --name {registry} --image app:v1        # tag attributes
az acr repository show --name {registry} --repository app      # repo attributes
```

## Manifests

```bash
# Metadata for all manifests in a repo (digest, tags, size, timestamps)
az acr manifest list-metadata --registry {registry} --name app --output table

# One manifest's metadata / raw content
az acr manifest show-metadata --registry {registry} --name app:v1
az acr manifest show --registry {registry} --name app@sha256:{digest}

# Find untagged (orphaned) manifests
az acr manifest list-metadata --registry {registry} --name app \
  --query "[?tags==null].digest" --output tsv
```

## Untag vs Delete

```bash
# Untag: removes only the tag; manifest + layers remain (still pullable by digest)
az acr repository untag --name {registry} --image app:v1

# Delete by tag: deletes the whole manifest and ALL other tags pointing to it
az acr repository delete --name {registry} --image app:v1 --yes

# Delete by digest (precise)
az acr repository delete --name {registry} --image app@sha256:{digest} --yes

# Delete an entire repository
az acr repository delete --name {registry} --repository app --yes
```

⚠️ Deleting by tag deletes the underlying manifest — other tags on the same image disappear too. Untag first if you only want to retire a tag name.

## Purge Old Images (acr purge)

`acr purge` runs as an ACR Task (container `mcr.microsoft.com/acr/acr-cli`):

```bash
# Dry run first — ALWAYS
az acr run --registry {registry} \
  --cmd "acr purge --filter 'app:.*' --ago 30d --untagged --dry-run" /dev/null

# Delete tags older than 30 days matching the regex, plus untagged manifests
az acr run --registry {registry} \
  --cmd "acr purge --filter 'app:.*' --ago 30d --untagged" /dev/null

# Keep the 5 most recent tags regardless of age
az acr run --registry {registry} \
  --cmd "acr purge --filter 'app:.*' --ago 0d --keep 5 --untagged" /dev/null

# Schedule as a nightly task
az acr task create --registry {registry} --name purge-old-images \
  --cmd "acr purge --filter 'app:.*' --ago 30d --untagged" \
  --context /dev/null --schedule "0 3 * * *"
```

`--filter` takes `repository:tag-regex` and can be repeated for multiple repos.

⚠️ `--untagged` ignores `--ago`: it deletes **every** untagged manifest, including ones created moments ago (mid-push images, referrer artifacts). Omit `--untagged` if recent untagged manifests must survive — the age cutoff only applies to tagged images matched by `--filter`.

## Lock Images

Prevent overwrite or deletion of critical tags (e.g., released versions):

```bash
# Read-only: cannot be overwritten or deleted
az acr repository update --name {registry} --image app:v1 --write-enabled false

# Undeletable but still overwritable
az acr repository update --name {registry} --image app:v1 --delete-enabled false

# Unlock
az acr repository update --name {registry} --image app:v1 --write-enabled true --delete-enabled true
```

## Retention Policy & Soft Delete

Two distinct policies that **cannot be enabled at the same time**. Retention policy requires **Premium**; soft delete (preview) is available in **all tiers** but doesn't support geo-replicated or artifact-cache-enabled registries.

```bash
# Retention policy (Premium): auto-delete untagged manifests after N days (0 = immediately)
az acr config retention update --registry {registry} \
  --status enabled --days 7 --type UntaggedManifests
az acr config retention show --registry {registry}

# Soft delete (preview, all tiers): recover deleted artifacts within 1-90 days
az acr config soft-delete update --registry {registry} --status enabled --days 7
az acr repository list-deleted --name {registry}
az acr manifest restore --registry {registry} --name app:v1
```

## Artifact Cache (Pull-Through Cache)

Cache upstream images (Docker Hub, MCR, GHCR, quay.io, ECR Public) in your registry — avoids rate limits and centralizes provenance:

```bash
# Optional: credentials for authenticated upstream (secrets live in Key Vault)
az acr credential-set create --registry {registry} --name dockerhub-creds \
  --login-server docker.io \
  --username-id https://{vault}.vault.azure.net/secrets/dh-user \
  --password-id https://{vault}.vault.azure.net/secrets/dh-pass

# Cache rule: docker.io/library/* -> {registry}.azurecr.io/dockerhub/*
az acr cache create --registry {registry} --name dockerhub-cache \
  --source-repo "docker.io/library/*" --target-repo "dockerhub/*" \
  --cred-set dockerhub-creds

az acr cache list --registry {registry} --output table
```

Then `docker pull {registry}.azurecr.io/dockerhub/nginx:1.27` fetches through the cache.

## Storage Usage

```bash
# Consumed storage vs SKU quota (Basic 10 GB / Standard 100 GB / Premium 500 GB included)
az acr show-usage --name {registry} --output table
```

Layers are deduplicated and shared across repositories; `show-usage` reports actual billable storage.
