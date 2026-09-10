#!/usr/bin/env bash
# shepherd-task-version: 1.0.3

set -euo pipefail

usage() {
    echo "Usage: $0 <OWNER/REPO> <BASELINE_BRANCH> [SOURCE_BRANCH] [EXPECTED_BASELINE_SHA]" >&2
}

fail() {
    echo "Error: $*" >&2
    exit 1
}

[[ $# -ge 2 && $# -le 4 ]] || { usage; exit 1; }
repo="$1"
baseline_branch="$2"
source_branch="${3:-20260902-2104Z-commit-e7b651f-liberty}"
expected_baseline_sha="${4:-9b9f311b2a3a2854bdac947593950d9edb6bca7d}"

for command_name in git; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done
[[ "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] ||
    fail "Repo must be in OWNER/REPO format."
[[ "$expected_baseline_sha" =~ ^[0-9a-fA-F]{40}$ ]] ||
    fail "ExpectedBaselineSha must be a 40-character hexadecimal SHA."
expected_baseline_sha="$(printf '%s' "$expected_baseline_sha" | tr '[:upper:]' '[:lower:]')"
[[ "$source_branch" == "20260902-2104Z-commit-e7b651f-liberty" ]] ||
    fail "Unsupported SourceBranch: '$source_branch'."
[[ "$baseline_branch" != "main" ]] ||
    fail "BaselineBranch must not be 'main'."
git check-ref-format --branch "$baseline_branch" >/dev/null 2>&1 ||
    fail "Invalid Git branch name: '$baseline_branch'."
git check-ref-format --branch "$source_branch" >/dev/null 2>&1 ||
    fail "Invalid Git branch name: '$source_branch'."
[[ "$baseline_branch" != "$source_branch" ]] ||
    fail "BaselineBranch must differ from SourceBranch."

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail "Run this script inside the fresh target-repository checkout."
repo_root="$(cd "$repo_root" && pwd -P)"
[[ -z "$(git -C "$repo_root" status --porcelain)" ]] ||
    fail "Working tree is not clean. Commit or stash changes before preparing the baseline."

script_dir="$(cd "$(dirname "$0")" && pwd)"
resolver="$script_dir/../../scripts/resolve-repository-remote.sh"
[[ -x "$resolver" ]] || fail "Repository remote resolver not found or not executable: $resolver"
base_remote="$("$resolver" "$repo")"

if git -C "$repo_root" show-ref --verify --quiet "refs/heads/$baseline_branch"; then
    fail "Local baseline branch already exists: '$baseline_branch'."
fi

echo "Fetching required source branch '$source_branch' from remote '$base_remote'..."
git -C "$repo_root" fetch --no-tags "$base_remote" "refs/heads/$source_branch" ||
    fail "Required source branch '$base_remote/$source_branch' is missing or could not be fetched."
fetched_sha="$(git -C "$repo_root" rev-parse FETCH_HEAD 2>/dev/null)" ||
    fail "Could not resolve the fetched '$source_branch' commit."
fetched_sha="$(printf '%s' "$fetched_sha" | tr '[:upper:]' '[:lower:]')"

set +e
git -C "$repo_root" merge-base --is-ancestor "$expected_baseline_sha" "$fetched_sha"
ancestor_exit=$?
set -e
if [[ $ancestor_exit -eq 1 ]]; then
    fail "Prepared baseline '$expected_baseline_sha' is not an ancestor of '$source_branch' at '$fetched_sha'."
elif [[ $ancestor_exit -ne 0 ]]; then
    fail "Could not verify prepared baseline ancestry for '$base_remote/$source_branch'."
fi

required_paths=(
    pom.xml
    mvnw
    README.md
    src/main/java/org/eclipse/cargotracker/application/BookingService.java
    src/main/webapp/admin/tables/listNotRouted.xhtml
)
for required_path in "${required_paths[@]}"; do
    git -C "$repo_root" cat-file -e "${expected_baseline_sha}:${required_path}" 2>/dev/null ||
        fail "Baseline commit '$expected_baseline_sha' does not contain '$required_path'."
done

feature_paths=(
    src/main/java/org/eclipse/cargotracker/interfaces/booking/web/ChangeArrivalDeadlineDate.java
    src/main/java/org/eclipse/cargotracker/interfaces/booking/web/ChangeArrivalDeadlineDateDialog.java
    src/main/webapp/admin/dialogs/changeArrivalDeadlineDate.xhtml
)
for feature_path in "${feature_paths[@]}"; do
    set +e
    git -C "$repo_root" cat-file -e "${expected_baseline_sha}:${feature_path}" 2>/dev/null
    feature_exit=$?
    set -e
    if [[ $feature_exit -eq 0 ]]; then
        fail "Feature-bearing path already exists in baseline '$expected_baseline_sha': $feature_path"
    elif [[ $feature_exit -ne 128 ]]; then
        fail "Could not verify feature absence for '$feature_path'."
    fi
done

set +e
git -C "$repo_root" ls-remote --exit-code --heads "$base_remote" "$baseline_branch" >/dev/null 2>&1
remote_exit=$?
set -e
if [[ $remote_exit -eq 0 ]]; then
    fail "Remote baseline branch already exists: '$base_remote/$baseline_branch'."
elif [[ $remote_exit -ne 2 ]]; then
    fail "Could not determine whether '$base_remote/$baseline_branch' exists."
fi

git -C "$repo_root" checkout -b "$baseline_branch" "$expected_baseline_sha" ||
    fail "Failed to create '$baseline_branch' from '$expected_baseline_sha'."
git -C "$repo_root" push -u "$base_remote" "$baseline_branch" ||
    fail "Failed to push '$baseline_branch' to '$base_remote'."

printf '\n=== IMMUTABLE SHARED BASELINE SHA ===\n%s\n' "$expected_baseline_sha"
echo "Required source branch: $base_remote/$source_branch"
echo "Source branch tip:      $fetched_sha"
echo "No domain source or fixture application code was generated."
echo "Use this exact 40-character SHA for both campaigns."
