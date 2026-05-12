# gh repo — Repositories

Create, clone, list, view, edit, delete, fork, sync repositories. Plus autolinks, deploy keys, gitignore/license templates.

## Create

```bash
gh repo create my-repo                              # interactive
gh repo create my-repo --public                     # public
gh repo create my-repo --private                    # private
gh repo create my-repo --description "..." \
  --homepage https://example.com \
  --license mit --gitignore python
gh repo create org/my-repo                          # in org
gh repo create my-repo --source=. --push            # from existing local dir
gh repo create my-repo --template                   # mark as template
gh repo create my-repo --disable-issues --disable-wiki
```

## Clone

```bash
gh repo clone owner/repo
gh repo clone owner/repo my-dir
gh repo clone owner/repo --branch develop
gh repo clone owner/repo -- --depth=1          # pass through to git
```

## List

```bash
gh repo list                                   # your repos
gh repo list owner                             # for user/org
gh repo list --limit 100
gh repo list --public                          # only public
gh repo list --source                          # exclude forks
gh repo list --language go --topic cli         # filter
gh repo list --json name,visibility,owner
gh repo list --json name --jq '.[].name'
```

## View

```bash
gh repo view                                    # current repo
gh repo view owner/repo
gh repo view --web                              # open in browser
gh repo view --json name,description,defaultBranchRef
```

## Edit

```bash
gh repo edit --description "New description"
gh repo edit --homepage https://example.com
gh repo edit --visibility private               # or public
gh repo edit --enable-issues --disable-wiki
gh repo edit --default-branch main
gh repo edit --add-topic cli --add-topic tooling
gh repo rename new-name
gh repo archive                                 # archive
gh repo unarchive
```

## Delete

```bash
gh repo delete owner/repo --yes
```

## Fork

```bash
gh repo fork owner/repo
gh repo fork owner/repo --org my-org
gh repo fork owner/repo --clone                 # clone after fork
gh repo fork owner/repo --remote-name upstream
```

## Sync fork

```bash
gh repo sync                                    # sync default branch
gh repo sync --branch feature                   # specific branch
gh repo sync --force                            # overwrite local divergence
```

## Default repo (for current directory)

```bash
gh repo set-default                             # interactive
gh repo set-default owner/repo
gh repo set-default --unset
```

## Autolinks

```bash
gh repo autolink list
gh repo autolink create JIRA- https://jira.example.com/browse/<num>
gh repo autolink delete 12345
```

## Deploy keys

```bash
gh repo deploy-key list
gh repo deploy-key add ~/.ssh/id_rsa.pub --title "Prod server" --allow-write
gh repo deploy-key delete 12345
```

## Gitignore / license templates

```bash
gh repo gitignore list
gh repo gitignore view Python
gh repo license list
gh repo license view mit
```
