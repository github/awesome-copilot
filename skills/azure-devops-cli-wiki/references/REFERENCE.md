# Wikis

- [Wikis](#wikis)
  - [List all wikis in project](#list-all-wikis-in-project)
  - [List all wikis in organization](#list-all-wikis-in-organization)
  - [Show wiki](#show-wiki)
  - [Create project wiki](#create-project-wiki)
  - [Create code wiki from repository](#create-code-wiki-from-repository)
  - [Delete wiki](#delete-wiki)
  - [List pages](#list-pages)
  - [Show page](#show-page)
  - [Create page](#create-page)
  - [Update page](#update-page)
  - [Delete page](#delete-page)

## List all wikis in project

```bash
az devops wiki list --project {project}
```

## List all wikis in organization

```bash
az devops wiki list
```

## Show wiki

```bash
az devops wiki show --wiki {wiki-name} --project {project}
az devops wiki show --wiki {wiki-name} --project {project} --open
```

## Create project wiki

```bash
az devops wiki create \
  --name {wiki-name} \
  --project {project} \
  --type projectwiki
```

## Create code wiki from repository

```bash
az devops wiki create \
  --name {wiki-name} \
  --project {project} \
  --type codewiki \
  --repository {repo-name} \
  --mapped-path /wiki \
  --version {branch-name}
```

## Delete wiki

```bash
az devops wiki delete --wiki {wiki-id} --project {project} --yes
```

## List pages

```bash
# List pages by showing root page with recursion
az devops wiki page show \
  --wiki {wiki-name} \
  --path "/" \
  --project {project} \
  --recursion-level full
```

## Show page

```bash
az devops wiki page show \
  --wiki {wiki-name} \
  --path "/page-name" \
  --project {project}
```

## Create page

```bash
az devops wiki page create \
  --wiki {wiki-name} \
  --path "/new-page" \
  --content "# New Page\n\nPage content here..." \
  --project {project}
```

## Update page

```bash
az devops wiki page update \
  --wiki {wiki-name} \
  --path "/existing-page" \
  --version {page-etag} \
  --content "# Updated Page\n\nNew content..." \
  --project {project}
```

## Delete page

```bash
az devops wiki page delete \
  --wiki {wiki-name} \
  --path "/old-page" \
  --project {project} --yes
```
