#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

[[ $# -ge 2 && $# -le 3 ]] ||
    fail "Usage: $0 OWNER/REPO BASELINE_BRANCH [PESTER_VERSION]"

repo="$1"
baseline_branch="$2"
pester_version="${3:-5.7.1}"

[[ "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] ||
    fail "REPO must be in OWNER/REPO form."
[[ "$baseline_branch" != main ]] ||
    fail "BASELINE_BRANCH must not be 'main'."
git check-ref-format --branch "$baseline_branch" >/dev/null 2>&1 ||
    fail "BASELINE_BRANCH is not a valid Git branch name: '$baseline_branch'."
[[ "$pester_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
    fail "PESTER_VERSION must be an exact semantic version."

for command in git gh jq; do
    command -v "$command" >/dev/null 2>&1 ||
        fail "Required command '$command' was not found."
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail "Run this script inside the fresh target-repository checkout."
repo_root="$(cd "$repo_root" && pwd -P)"
[[ -z "$(git -C "$repo_root" status --porcelain)" ]] ||
    fail "Working tree is not clean. Commit or stash changes before preparing the baseline."

script_dir="$(cd "$(dirname "$0")" && pwd)"
resolver="$script_dir/../../scripts/resolve-repository-remote.sh"
[[ -x "$resolver" ]] || fail "Repository remote resolver not found or not executable: $resolver"
base_remote="$("$resolver" "$repo")"

repository_info="$(gh repo view "$repo" --json defaultBranchRef 2>&1)" ||
    fail "Unable to query repository '$repo' default branch: $repository_info"
default_branch="$(jq -er '.defaultBranchRef.name | select(type == "string" and length > 0)' <<<"$repository_info")" ||
    fail "Repository '$repo' did not report a default branch."
[[ "$baseline_branch" != "$default_branch" ]] ||
    fail "BASELINE_BRANCH must differ from the repository default branch '$default_branch'."

if git -C "$repo_root" show-ref --verify --quiet "refs/heads/$baseline_branch"; then
    fail "Local baseline branch already exists: '$baseline_branch'."
fi

echo "Fetching '$default_branch' from remote '$base_remote'..."
git -C "$repo_root" fetch --no-tags "$base_remote" "$default_branch" ||
    fail "Failed to fetch '$default_branch' from '$base_remote'."

set +e
git -C "$repo_root" ls-remote --exit-code --heads "$base_remote" "$baseline_branch" >/dev/null 2>&1
remote_status=$?
set -e
[[ $remote_status -eq 2 ]] ||
    if [[ $remote_status -eq 0 ]]; then
        fail "Remote baseline branch already exists: '$base_remote/$baseline_branch'."
    else
        fail "Could not determine whether '$base_remote/$baseline_branch' exists."
    fi

git -C "$repo_root" checkout -b "$baseline_branch" FETCH_HEAD ||
    fail "Failed to create '$baseline_branch' from fetched default-branch tip."

mkdir -p "$repo_root/.github/workflows" "$repo_root/eng"
cat >"$repo_root/.github/workflows/shepherd-task-math-tool.yml" <<EOF
name: Shepherd task math tool

on:
  pull_request:
  push:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    name: Shepherd task math tool
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Pester $pester_version
        shell: pwsh
        run: Install-Module Pester -RequiredVersion $pester_version -Scope CurrentUser -Force
      - name: Test math tool
        shell: pwsh
        run: ./eng/test-math-tool.ps1
EOF

cat >"$repo_root/eng/test-math-tool.ps1" <<EOF
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
\$ErrorActionPreference = 'Stop'

\$requiredVersion = '$pester_version'
\$repositoryRoot = Split-Path -Parent \$PSScriptRoot
\$implementationPath = Join-Path \$repositoryRoot 'math-tool.ps1'
\$testPath = Join-Path \$repositoryRoot 'math-tool.Tests.ps1'

\$implementationExists = Test-Path -LiteralPath \$implementationPath -PathType Leaf
\$testsExist = Test-Path -LiteralPath \$testPath -PathType Leaf
if (-not \$implementationExists -and -not \$testsExist) {
    Write-Host 'Math-tool implementation has not been introduced yet; baseline validation passed.'
    exit 0
}
if (-not \$implementationExists -or -not \$testsExist) {
    throw 'math-tool.ps1 and math-tool.Tests.ps1 must be introduced together.'
}

\$available = Get-Module -ListAvailable Pester |
    Where-Object { \$_.Version.ToString() -eq \$requiredVersion } |
    Select-Object -First 1
if (-not \$available) {
    Write-Host "Installing Pester \$requiredVersion in CurrentUser scope..."
    Install-Module Pester -RequiredVersion \$requiredVersion -Scope CurrentUser -Force
}

Import-Module Pester -RequiredVersion \$requiredVersion -Force
\$result = Invoke-Pester -Path \$testPath -PassThru
if (\$result.FailedCount -gt 0) {
    Write-Error "Pester reported \$(\$result.FailedCount) failed test(s)."
    exit 1
}
exit 0
EOF

git -C "$repo_root" add -- .github/workflows/shepherd-task-math-tool.yml eng/test-math-tool.ps1 ||
    fail "git add failed."
git -C "$repo_root" commit -m 'test: bootstrap shepherd-task math fixture baseline' ||
    fail "git commit failed."

baseline_sha="$(git -C "$repo_root" rev-parse HEAD)"
[[ "$baseline_sha" =~ ^[0-9a-f]{40}$ ]] ||
    fail "Could not determine the full baseline commit SHA: '$baseline_sha'."
git -C "$repo_root" push -u "$base_remote" "$baseline_branch" ||
    fail "Failed to push '$baseline_branch' to '$base_remote'."

echo
echo '=== IMMUTABLE SHARED BASELINE SHA ==='
echo "$baseline_sha"
echo 'Use this exact 40-character SHA for both campaigns.'
