#!/usr/bin/env bash
# shepherd-task-version: 1.0.3

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

for command in bash git find; do
    command -v "$command" >/dev/null 2>&1 || fail "Required command '$command' was not found."
done

script_dir="$(cd "$(dirname "$0")" && pwd)"
scripts_directory="$script_dir/../../scripts"
stage25="$scripts_directory/shepherd-task-25-given-list.sh"
while IFS= read -r -d '' file; do
    bash -n "$file" || fail "Bash parse errors in '$file'."
done < <(find "$script_dir" "$scripts_directory" -maxdepth 1 -type f -name '*.sh' -print0)

contract_root="$script_dir/.contract-work"
temp_directory="$contract_root/bash-native-$$"
mkdir -p "$temp_directory"
cleanup() {
    rm -rf "$temp_directory"
    rmdir "$contract_root" 2>/dev/null || true
}
trap cleanup EXIT
git -C "$temp_directory" init --quiet

set +e
output="$(cd "$temp_directory" && "$stage25" 1 '1-test-remove-before-merge' 2>&1)"
exit_code=$?
set -e
[[ $exit_code -ne 0 ]] || fail "Stage 25 unexpectedly accepted a missing campaign directory."
[[ "$output" == *'Campaign metadata directory not found'* ]] ||
    fail "Stage 25 failed for an unexpected reason: $output"

echo 'Bash native-command propagation contract tests passed.'
