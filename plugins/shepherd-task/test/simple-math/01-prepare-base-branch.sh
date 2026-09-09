#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

[[ $# -eq 4 ]] ||
    fail "Usage: $0 OWNER/REPO BASE_BRANCH CAMPAIGN_SHORTNAME BASELINE_SHA"
repo="$1"
base_branch="$2"
campaign_shortname="$3"
baseline_sha="${4,,}"

[[ "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || fail "Invalid REPO: '$repo'."
[[ "$base_branch" != main ]] || fail "BASE_BRANCH must not be 'main'."
git check-ref-format --branch "$base_branch" >/dev/null 2>&1 || fail "Invalid BASE_BRANCH: '$base_branch'."
[[ "$campaign_shortname" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || fail "Invalid CAMPAIGN_SHORTNAME."
[[ "$baseline_sha" =~ ^[0-9a-f]{40}$ ]] || fail "Invalid BASELINE_SHA."
for command in git gh jq; do
    command -v "$command" >/dev/null 2>&1 || fail "Required command '$command' was not found."
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail "Run this script inside the target test worktree."
repo_root="$(cd "$repo_root" && pwd -P)"
[[ -z "$(git -C "$repo_root" status --porcelain)" ]] ||
    fail "Working tree is not clean. Commit or stash changes before creating a campaign."

script_dir="$(cd "$(dirname "$0")" && pwd)"
resolver="$script_dir/../../scripts/resolve-repository-remote.sh"
initializer="$script_dir/../../scripts/shepherd-task-00-init-campaign.sh"
[[ -x "$resolver" && -x "$initializer" ]] || fail "Installed shepherd-task Bash scripts are incomplete."
base_remote="$("$resolver" "$repo")"
git -C "$repo_root" fetch --no-tags "$base_remote" || fail "Failed to fetch remote '$base_remote'."
git -C "$repo_root" cat-file -e "$baseline_sha^{commit}" 2>/dev/null ||
    fail "BASELINE_SHA is not an available commit: '$baseline_sha'."
for baseline_file in .github/workflows/shepherd-task-math-tool.yml eng/test-math-tool.ps1; do
    git -C "$repo_root" cat-file -e "$baseline_sha:$baseline_file" 2>/dev/null ||
        fail "Baseline commit '$baseline_sha' does not contain '$baseline_file'."
done
if git -C "$repo_root" show-ref --verify --quiet "refs/heads/$base_branch"; then
    fail "Local campaign branch already exists: '$base_branch'."
fi
set +e
git -C "$repo_root" ls-remote --exit-code --heads "$base_remote" "$base_branch" >/dev/null 2>&1
remote_status=$?
set -e
[[ $remote_status -eq 2 ]] ||
    if [[ $remote_status -eq 0 ]]; then
        fail "Remote campaign branch already exists: '$base_remote/$base_branch'."
    else
        fail "Could not determine whether '$base_remote/$base_branch' exists."
    fi
git -C "$repo_root" checkout -b "$base_branch" "$baseline_sha" ||
    fail "Failed to create '$base_branch' from '$baseline_sha'."

campaign_body="$(cat <<EOF
## Shepherd-task simple-math control campaign

This campaign contains two serial math-tool tasks and runs with lesson
propagation disabled.

- Campaign base branch: \`$base_branch\`
- Campaign shortname: \`$campaign_shortname\`
- Lesson propagation: \`off\`
- Immutable baseline SHA: \`$baseline_sha\`
- Expected task count: 2
- Task 1: Fibonacci implementation and unit/CLI tests
- Task 2: factorial and operation dispatch using the same test infrastructure
EOF
)"
campaign_issue_output="$(gh issue create --repo "$repo" \
    --title '[Campaign][off] shepherd-task simple-math control' \
    --body "$campaign_body" 2>&1)" ||
    fail "Failed to create campaign issue: $campaign_issue_output"
campaign_issue_url="$(printf '%s\n' "$campaign_issue_output" | tail -n 1)"
[[ "$campaign_issue_url" =~ /issues/([1-9][0-9]*)$ ]] ||
    fail "Could not parse campaign issue number from '$campaign_issue_url'."
campaign_issue_number="${BASH_REMATCH[1]}"

(
    cd "$repo_root"
    "$initializer" "$campaign_issue_number" "$campaign_shortname" "$base_branch" "$repo"
)
campaign_directory="${campaign_issue_number}-${campaign_shortname}-remove-before-merge"
campaign_path="$repo_root/$campaign_directory"
manifest="$campaign_path/shepherd-campaign.json"
jq -e '.lessonPropagation == "off"' "$manifest" >/dev/null ||
    fail "Initialized control campaign does not use lessonPropagation=off."

plan_file='math-tool-ignorance-reduction-plan.md'
canonical_command='pwsh -NoLogo -NoProfile -File ./eng/test-math-tool.ps1'
cat >"$campaign_path/$plan_file" <<EOF
# PowerShell math-tool control campaign

Build the fixture in two cheap, serial tasks. The repository already contains
deterministic CI pinned to Pester 5.7.1. The acceptance command for every task
is \`$canonical_command\`. Task 2 starts only after task 1 is merged.

## Ignorance reduction

### Repository-owned validation

**Question:** What command and environment define acceptance?

**Resolution:** The committed canonical command is
\`$canonical_command\`. The baseline workflow
\`.github/workflows/shepherd-task-math-tool.yml\` installs exactly Pester
5.7.1 and invokes that repository-owned runner. Do not replace or bypass it.

### Output and ordering contracts

**Question:** What externally observable behavior and dependency order are required?

**Resolution:** Direct CLI execution writes exactly one result line to stdout:
\`Fibonacci(N) = value\` or \`Factorial(N) = value\`. Functions return the
numeric value without incidental output. Inputs are non-negative integers.
Implementation is serial: task 2 depends on merged task 1. The implementation
and test files are repository-root \`math-tool.ps1\` and
\`math-tool.Tests.ps1\`.

## Implementation

### 1. Implement Fibonacci with unit and isolated CLI coverage

Create \`math-tool.ps1\` with parameter \`N\` and a pure \`Get-Fibonacci\`
function. Direct execution must print exactly \`Fibonacci(N) = value\`.
Create \`math-tool.Tests.ps1\` containing dot-sourced unit tests for the
function and isolated child-\`pwsh\` process tests for direct CLI behavior.
Cover N=0, N=1, and a small representative value. Keep changes limited to the
math tool and its tests.

Acceptance: \`$canonical_command\` exits zero and the pinned pull-request CI
passes.

### 2. Add factorial and operation dispatch

After task 1 is merged, extend the same script with a pure \`Get-Factorial\`
function and an \`Operation\` parameter that dispatches between \`fibonacci\`
and \`factorial\` while retaining \`N\`. Preserve Fibonacci behavior. Cover
factorial edge cases 0 and 1 plus a small representative value. Keep the
interface and tests objective and small; the issue does not prescribe how to
extend the tests.

Acceptance: \`$canonical_command\` exits zero for the combined regression suite
and the pinned pull-request CI passes.
EOF
jq -n --arg baselineSha "$baseline_sha" \
    '{schemaVersion:1, baselineSha:$baselineSha, lessonPropagation:"off", expectedTaskCount:2}' \
    >"$campaign_path/shepherd-test-experiment.json"

git -C "$repo_root" add -- "$campaign_directory" || fail "git add failed."
git -C "$repo_root" commit -m "test: initialize simple-math control campaign #$campaign_issue_number" ||
    fail "git commit failed."
first_parent="$(git -C "$repo_root" rev-parse 'HEAD^')"
[[ "$first_parent" == "$baseline_sha" ]] ||
    fail "Campaign init commit parent '$first_parent' is not baseline '$baseline_sha'."
git -C "$repo_root" push -u "$base_remote" "$base_branch" ||
    fail "Failed to push '$base_branch' to '$base_remote'."

echo
echo 'Campaign initialized.'
echo '  Mode:               off'
echo "  Campaign issue:     $campaign_issue_url"
echo "  Campaign ID:        $(jq -r '.campaignId' "$manifest")"
echo "  Base remote:        $base_remote"
echo "  Baseline SHA:       $baseline_sha"
echo "  Init commit parent: $first_parent"
echo "  Metadata directory: $campaign_directory"
echo
echo "Next: 02-create-issues.sh \"$campaign_directory\""
