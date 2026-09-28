#!/usr/bin/env bash
# shepherd-task-version: 1.0.5

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

script_dir="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=git-object-id.sh
source "$script_dir/git-object-id.sh"

contract_root="$(mktemp -d "${TMPDIR:-/tmp}/shepherd-git-object-id.XXXXXX")"
trap 'rm -rf "$contract_root"' EXIT

for format in sha1 sha256; do
    repository="$contract_root/$format"
    git init --quiet --object-format="$format" "$repository" ||
        fail "Could not initialize the $format contract repository."
    git -C "$repository" config user.name 'Shepherd Contract'
    git -C "$repository" config user.email 'shepherd-contract@example.invalid'
    printf '%s\n' "$format" >"$repository/README.md"
    git -C "$repository" add -- README.md
    git -C "$repository" commit --quiet -m "Create $format contract commit" ||
        fail "Could not commit in the $format contract repository."
    object_id="$(git -C "$repository" rev-parse HEAD)"

    [[ "$(git_object_format "$repository")" == "$format" ]] ||
        fail "Helper did not report $format."
    is_full_git_object_id "$repository" "$object_id" ||
        fail "Helper rejected the full $format object ID."
    require_git_commit_object_id "$repository" "$object_id" 'Contract commit'
    if [[ "$format" == sha1 ]]; then
        wrong_length="$(printf 'a%.0s' {1..64})"
    else
        wrong_length="$(printf 'a%.0s' {1..40})"
    fi
    ! is_full_git_object_id "$repository" "$wrong_length" ||
        fail "Helper accepted the wrong object-ID length for $format."
done

echo 'Simple-math Bash Git object-ID contract tests passed.'
