#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

fixture_root="$(cd "$(dirname "$0")" && pwd)"
scripts_directory="$fixture_root/../../scripts"
stage25="$scripts_directory/shepherd-task-25-given-list.sh"
temp_directory="$(mktemp -d "$fixture_root/.pipeline-contract.XXXXXX")"
trap 'rm -rf -- "$temp_directory"' EXIT

fail() {
    echo "Error: $*" >&2
    exit 1
}

for command_name in bash find grep git mktemp; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done

mapfile -t shell_files < <(
    find "$fixture_root" "$scripts_directory" -maxdepth 1 -type f -name '*.sh' -print
)
for shell_file in "${shell_files[@]}"; do
    bash -n "$shell_file" || fail "Bash parse errors in '$shell_file'."
done

grep -Fq 'PIPESTATUS' "$scripts_directory/shepherd-task-15-prepare-create-issues.sh" ||
    fail "Stage 15 generated invocation does not preserve pipeline status."
grep -Fq 'PIPESTATUS' "$stage25" ||
    fail "Stage 25 does not preserve pipeline status."
grep -Fq 'set +e' "$stage25" ||
    fail "Stage 25 does not capture expected native failures explicitly."

git -C "$temp_directory" init --quiet
set +e
output="$(
    cd "$temp_directory"
    "$stage25" 1 1-test-remove-before-merge 2>&1
)"
exit_code=$?
set -e
[[ $exit_code -ne 0 ]] || fail "Stage 25 unexpectedly accepted a missing campaign directory."
[[ "$output" == *"Campaign metadata directory not found"* ]] ||
    fail "Stage 25 failed for an unexpected reason: $output"

echo "Bash native pipeline contract tests passed."
