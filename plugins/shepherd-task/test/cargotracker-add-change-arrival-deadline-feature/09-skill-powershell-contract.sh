#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

fixture_root="$(cd "$(dirname "$0")" && pwd)"
repository_root="$(cd "$fixture_root/../../../.." && pwd)"
skills_directory="$repository_root/skills"
temp_directory="$(mktemp -d "$fixture_root/.skill-bash-contract.XXXXXX")"
trap 'rm -rf "$temp_directory"' EXIT

fail() {
    echo "Error: $*" >&2
    exit 1
}

for command_name in bash find awk sort grep mktemp; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done

block_count=0
while IFS= read -r skill_file; do
    while IFS=$'\t' read -r start_line block_file; do
        [[ -n "$block_file" ]] || continue
        block_count=$((block_count + 1))
        bash -n "$block_file" ||
            fail "Invalid embedded Bash in '$skill_file' beginning at line $start_line."
    done < <(
        awk -v output_dir="$temp_directory" -v prefix="$(basename "$(dirname "$skill_file")")" '
            BEGIN { in_block=0; count=0 }
            {
                line=$0
                if (!in_block && line ~ /^[[:space:]]*(>[[:space:]]*)?```(bash|sh|shell)[[:space:]]*$/) {
                    in_block=1
                    start=NR+1
                    count++
                    file=output_dir "/" prefix "-" count ".sh"
                    printf "%s", "" > file
                    close(file)
                    next
                }
                if (in_block && line ~ /^[[:space:]]*(>[[:space:]]*)?```[[:space:]]*$/) {
                    close(file)
                    print start "\t" file
                    in_block=0
                    next
                }
                if (in_block) {
                    sub(/^[[:space:]]*>[[:space:]]?/, "", line)
                    print line > file
                }
            }
            END {
                if (in_block) {
                    print "unterminated\t" file
                    exit 2
                }
            }
        ' "$skill_file"
    ) || fail "Unterminated Bash code block in '$skill_file'."
done < <(find "$skills_directory" -mindepth 2 -maxdepth 2 -type f \
    -path '*/shepherd-task-*/SKILL.md' | sort)

[[ $block_count -ge 4 ]] ||
    fail "Expected at least 4 shepherd-task Bash code blocks; found $block_count."

stage30="$skills_directory/shepherd-task-30-from-assignment-to-ready/SKILL.md"
stage40="$skills_directory/shepherd-task-40-from-ready-to-merged-to-base/SKILL.md"
grep -Fq 'gh api \' "$stage30" &&
    grep -Fq '/assignees \' "$stage30" &&
    grep -Fq -- '--input - <<< "{' "$stage30" ||
    fail "The stage-30 Bash assignment example must execute gh directly under fail-fast semantics."
grep -Fq 'if GH_PR_EDIT_HELP=$(gh pr edit --help 2>&1); then' "$stage40" &&
    grep -Fq 'case "$GH_PR_EDIT_HELP" in' "$stage40" ||
    fail "The stage-40 Bash capability preflight must capture help before inspecting it."
! grep -Eq 'gh pr edit --help[[:space:]]*\|[[:space:]]*grep[[:space:]]+-Fq' "$stage40" ||
    fail "The stage-40 Bash capability preflight still uses an early-closing grep pipeline."
for skill_file in "$stage30" "$stage40"; do
    ! grep -Fq 'skills/shepherd-task-approve-workflows-and-wait-for-completion/SKILL.md' "$skill_file" ||
        fail "$(basename "$(dirname "$skill_file")") uses a repository-relative path for an installed skill."
done
grep -Fq 'Invoke the installed **`shepherd-task-approve-workflows-and-wait-for-completion`** skill by name' "$stage30" ||
    fail "Stage 30 does not invoke the workflow-approval skill by installed name."
grep -Fq 'Invoke the installed **`shepherd-task-approve-workflows-and-wait-for-completion`** skill by name' "$stage40" ||
    fail "Stage 40 does not invoke the workflow-approval skill by installed name."

echo "Shepherd-task embedded Bash contract tests passed."
