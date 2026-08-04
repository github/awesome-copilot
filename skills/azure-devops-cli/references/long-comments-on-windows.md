# Posting Long Comments and Bodies on Windows

On Windows the `az` command resolves to `az.cmd`, a batch wrapper invoked by `cmd.exe`. The whole command line is capped at ~8191 characters, so a long `--discussion`, `--description`, or `--content` value can be silently truncated or fail. Detect the shell before composing a long argument and route accordingly. Skipping this is the most common reason the agent burns 3-5 turns falling back to raw token retrieval and REST calls.

## Detect the shell first

| Environment | Signal | Action |
|---|---|---|
| PowerShell on Windows | `$IsWindows -eq $true` and `$PSVersionTable.PSVersion` is set | Use `azps.ps1` (see below) |
| PowerShell on macOS / Linux | `$IsWindows -eq $false` | Plain `az` is fine, no cmd.exe wrapper |
| bash / zsh / sh | `$BASH_VERSION` or `$ZSH_VERSION` set, or `uname` works | Plain `az` is fine, no cmd.exe wrapper |
| Windows `cmd.exe` | `%ComSpec%` ends in `cmd.exe`, no `$PSVersionTable` | Use `azps.ps1` if PowerShell is installed, otherwise see `az devops invoke` fallback below |

## Option 1: `azps.ps1` (PowerShell on Windows)

`azps.ps1` ships with the Azure CLI installer and invokes the Python entry point directly. No `cmd.exe` length cap.

```powershell
# Read the long body into a variable and pass it through. No quoting headaches.
$body = Get-Content -Raw .\comment.md
azps.ps1 boards work-item update --id 1234 --discussion $body
```

## Option 2: dedicated `--file-path` flag where Azure CLI offers one

Some commands have a native file flag and you should prefer it over any inline body:

- `az devops wiki page create` and `az devops wiki page update` take `--file-path` (with optional `--encoding`).
- Use it on any shell, including Windows.

```bash
az devops wiki page create --path 'My page' --wiki myproject --file-path ./page.md --encoding utf-8
```

## Option 3: `az devops invoke` fallback

When no `--file-path` exists (work-item `--discussion`, PR `--description`) and you're not in PowerShell, post the body via the underlying REST API. `az devops invoke` runs inside the Python entry point, so it isn't subject to the `cmd.exe` cap either, and it takes the request body from a file with `--in-file`:

```bash
# Post a long discussion comment to work item 1234.
# REST: POST /{project}/_apis/wit/workItems/{id}/comments?api-version=7.0-preview.3
az devops invoke \
  --area wit --resource comments \
  --route-parameters project={project} workItemId=1234 \
  --api-version 7.0-preview.3 \
  --http-method POST \
  --in-file ./comment.json
```

Where `comment.json` is `{ "text": "<long markdown body>" }`. This is the universal escape hatch when neither `azps.ps1` nor `--file-path` is available. `az devops invoke` itself accepts `--in-file` natively.

## Don't rely on `@<file>` for plain string args

The Azure CLI `@<file>` convention is documented for JSON parameters (see [the official quoting guide](https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-quoting)). It is not guaranteed to expand plain string args like `--discussion` or `--description`, so don't reach for it as a substitute for the three options above.
