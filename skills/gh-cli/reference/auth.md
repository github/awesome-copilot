# gh auth — Authentication

Covers login, token management, account switching, git credential setup, and environment variables for automation.

## Install

```bash
# macOS
brew install gh

# Linux (Debian/Ubuntu)
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install gh

# Windows
winget install --id GitHub.cli

gh --version
```

## Login

```bash
gh auth login                                  # interactive
gh auth login --web                            # web-based OAuth
gh auth login --web --clipboard                # copy OAuth code to clipboard
gh auth login --git-protocol ssh               # force SSH protocol
gh auth login --hostname enterprise.internal   # GitHub Enterprise
gh auth login --with-token < token.txt         # non-interactive with token
gh auth login --insecure-storage               # plaintext token storage
```

## Status

```bash
gh auth status                          # all accounts
gh auth status --active                 # active account only
gh auth status --hostname github.com    # specific host
gh auth status --show-token             # reveal token
gh auth status --json hosts --jq '.hosts | add'
```

## Switch accounts

```bash
gh auth switch                                              # interactive
gh auth switch --hostname github.com --user monalisa       # explicit
```

## Token

```bash
gh auth token                                          # print active token
gh auth token --hostname github.com --user monalisa    # specific account
```

## Refresh / adjust scopes

```bash
gh auth refresh
gh auth refresh --scopes write:org,read:public_key   # add scopes
gh auth refresh --remove-scopes delete_repo          # remove scopes
gh auth refresh --reset-scopes                       # back to defaults
gh auth refresh --clipboard
```

## Logout

```bash
gh auth logout --hostname github.com --user username
```

## Setup git credential helper

```bash
gh auth setup-git                                    # current host
gh auth setup-git --hostname enterprise.internal     # specific host
gh auth setup-git --hostname enterprise.internal --force
```

## Environment variables (for automation)

| Variable | Purpose |
|----------|---------|
| `GH_TOKEN` | Auth token (preferred for CI) |
| `GH_HOST` | Default hostname |
| `GH_ENTERPRISE_TOKEN` | Enterprise-specific token |
| `GH_PROMPT_DISABLED` | Disable interactive prompts |
| `GH_EDITOR` | Editor for multi-line inputs |
| `GH_PAGER` | Pager (e.g., `less`, empty to disable) |
| `GH_REPO` | Override default `owner/repo` |
| `GH_TIMEOUT` | HTTP request timeout (seconds) |

```bash
export GH_TOKEN=$(gh auth token)    # common pattern in scripts
```
