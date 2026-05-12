# gh — other commands

Less-frequently used subcommands: browse, gist, codespace, org, search, label, ssh-key, gpg-key, status, config, extension, alias, ruleset, attestation, completion, preview, agent-task.

## Browse (gh browse)

```bash
gh browse                                           # current repo on github.com
gh browse script/                                   # path
gh browse main.go:312                               # file at line
gh browse 123                                       # issue/PR
gh browse 77507cd                                   # commit
gh browse main.go --branch bug-fix
gh browse --repo owner/repo
gh browse --releases                                # also: --actions --projects --settings --wiki
gh browse --no-browser                              # just print URL
```

## Gists (gh gist)

```bash
gh gist list --limit 20 --public
gh gist view abc123
gh gist view abc123 --files

gh gist create script.py                            # private
gh gist create script.py --public --desc "My script"
gh gist create file1.py file2.py                    # multi-file
echo "print('hi')" | gh gist create -               # from stdin

gh gist edit abc123
gh gist rename abc123 old.py new.py
gh gist clone abc123 my-dir
gh gist delete abc123
```

## Codespaces (gh codespace)

```bash
gh codespace list
gh codespace create --repo owner/repo --branch develop --machine standardLinux
gh codespace view
gh codespace ssh
gh codespace ssh --command "ls /workspaces"
gh codespace code                                   # open desktop VS Code
gh codespace code --web                             # open in browser
gh codespace cp file.txt remote:/workspaces/file.txt
gh codespace cp remote:/workspaces/file.txt ./file.txt
gh codespace ports                                  # list forwarded ports
gh codespace ports forward 8080:8080
gh codespace logs
gh codespace stop
gh codespace rebuild
gh codespace edit --machine premiumLinux
gh codespace delete
gh codespace jupyter                                # Jupyter over SSH
```

## Organizations (gh org)

```bash
gh org list                                         # your memberships
gh org list --json login,name,description
```

(For org-level operations like members or teams, use `gh api` — e.g. `gh api orgs/my-org/members --paginate`.)

## Search (gh search)

```bash
gh search code "TODO" --repo owner/repo
gh search code "import" --extension py --language python
gh search commits "fix bug" --author monalisa
gh search issues "label:bug state:open"
gh search prs "is:open review:required author:@me"
gh search repos "stars:>1000 language:python"
gh search repos "topic:cli" --limit 50 --sort stars --order desc
gh search repos "stars:>100" --json name,description,stargazersCount
gh search prs "is:open" --web
```

## Labels (gh label)

```bash
gh label list
gh label list --limit 100 --json name,color,description
gh label create bug --color d73a4a --description "Something isn't working"
gh label create enhancement --color "#a2eeef"
gh label edit bug --name bug-report --color ff0000
gh label delete bug --yes
gh label clone owner/repo                          # copy labels into current repo
gh label clone owner/repo --force                  # overwrite existing
```

## SSH keys (gh ssh-key)

```bash
gh ssh-key list
gh ssh-key add ~/.ssh/id_ed25519.pub --title "My laptop"
gh ssh-key add ~/.ssh/id_ed25519.pub --type signing     # authentication|signing
gh ssh-key delete 12345
```

## GPG keys (gh gpg-key)

```bash
gh gpg-key list
gh gpg-key add ~/key.asc
gh gpg-key delete 12345
```

## Status (gh status)

```bash
gh status                                           # assigned/mentioned across your repos
gh status --org my-org
gh status --exclude owner/repo1,owner/repo2
```

## Configuration (gh config)

```bash
gh config list
gh config get editor
gh config set editor vim
gh config set git_protocol ssh                      # or https
gh config set prompt disabled                       # or enabled
gh config set pager "less -R"
gh config clear-cache
```

## Extensions (gh extension)

```bash
gh extension list
gh extension search <keyword>
gh extension browse                                 # TUI catalog
gh extension install owner/gh-my-ext
gh extension install . --force                      # from local path
gh extension upgrade <name>
gh extension upgrade --all
gh extension remove <name>
gh extension create <name>                          # scaffold a new extension
gh extension exec <name> -- <args>
```

## Aliases (gh alias)

```bash
gh alias list
gh alias set prview 'pr view --web'
gh alias set co 'pr checkout'
gh alias set bugs 'issue list --label=bug'
gh alias set --shell igrep 'gh issue list --label="$1" | grep "$2"'
gh alias import aliases.yml                        # bulk
gh alias import -                                  # from stdin
gh alias delete prview
```

## Rulesets (gh ruleset)

```bash
gh ruleset list                                     # repo rulesets
gh ruleset list --parents                           # include org-level
gh ruleset view 123
gh ruleset check --branch feature                   # which rules apply to a branch
gh ruleset check --repo owner/repo --branch main
```

## Attestations (gh attestation)

```bash
gh attestation verify ./artifact.tar.gz --owner my-org          # verify by owner
gh attestation verify ./artifact.tar.gz --repo owner/repo
gh attestation download owner/repo --artifact-digest sha256:...
gh attestation trusted-root                                     # print Sigstore trusted root
```

## Completion (gh completion)

```bash
gh completion -s bash        > ~/.gh-complete.bash
gh completion -s zsh         > ~/.gh-complete.zsh
gh completion -s fish        > ~/.config/fish/completions/gh.fish
gh completion -s powershell  > ~/.gh-complete.ps1
```

Typical `~/.zshrc` hook:
```bash
eval "$(gh completion -s zsh)"
```

## Preview (gh preview)

```bash
gh preview                                          # list preview features
gh preview <name>                                   # run a preview
```

## Agent tasks (gh agent-task)

```bash
gh agent-task list
gh agent-task view 123
gh agent-task create --description "..."
```

## Global flags cheat sheet

| Flag | Purpose |
|------|---------|
| `-R, --repo [HOST/]OWNER/REPO` | Target a specific repo |
| `--hostname HOST` | Use a different GitHub host (Enterprise) |
| `--jq EXPR` / `--json FIELDS` / `--template STR` | See `formatting.md` |
| `--web` | Open in browser (supported by most commands) |
| `--paginate` | Follow pagination (REST/API) |
| `--verbose` / `--debug` | Diagnostic output |
| `--cache DURATION` | Client-side cache (e.g. `1h`, `force`, `bypass`) |
| `--timeout SECONDS` | HTTP timeout |
