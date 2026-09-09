#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

for command in awk grep find; do
    command -v "$command" >/dev/null 2>&1 || fail "Required command '$command' was not found."
done

script_dir="$(cd "$(dirname "$0")" && pwd)"
skills_directory="$script_dir/../../../../skills"
mapfile -t skill_files < <(find "$skills_directory" -mindepth 2 -maxdepth 2 \
    -path '*/shepherd-task-*/SKILL.md' -type f | sort)
[[ ${#skill_files[@]} -gt 0 ]] || fail "No shepherd-task skills were found."

block_count="$(awk '
    /^[[:space:]]*(>[[:space:]]*)?```bash[[:space:]]*$/ { in_block=1; count++; next }
    in_block && /^[[:space:]]*(>[[:space:]]*)?```[[:space:]]*$/ { in_block=0 }
    END { print count + 0 }
' "${skill_files[@]}")"
[[ "$block_count" -ge 4 ]] ||
    fail "Expected at least 4 shepherd-task Bash code blocks; found $block_count."

stage30="$skills_directory/shepherd-task-30-from-assignment-to-ready/SKILL.md"
stage40="$skills_directory/shepherd-task-40-from-ready-to-merged-to-base/SKILL.md"
grep -Fq '/assignees \' "$stage30" || fail "Stage-30 Bash assignment example is missing."
grep -Fq -- '--input - <<< "{' "$stage30" || fail "Stage-30 Bash assignment body is missing."
grep -Fq 'if ! gh pr edit --help | grep -Fq '\''@copilot'\''; then' "$stage40" ||
    fail "Stage-40 Bash capability preflight is missing."
for skill_file in "$stage30" "$stage40"; do
    ! grep -Fq 'skills/shepherd-task-approve-workflows-and-wait-for-completion/SKILL.md' "$skill_file" ||
        fail "$(basename "$(dirname "$skill_file")") uses a repository-relative path for an installed skill."
done
grep -Fq 'Invoke the installed **`shepherd-task-approve-workflows-and-wait-for-completion`** skill by name' "$stage30" ||
    fail "Stage 30 does not invoke the workflow-approval skill by installed name."
grep -Fq 'Invoke the installed **`shepherd-task-approve-workflows-and-wait-for-completion`** skill by name' "$stage40" ||
    fail "Stage 40 does not invoke the workflow-approval skill by installed name."

if grep -En '^(git|gh|copilot|node|npm)[^|]*\|[[:space:]]*(jq|head|tail|grep)' \
    "${skill_files[@]}" | grep -vE '```|^[^:]+:[0-9]+:[[:space:]]*#' >/dev/null; then
    echo "Warning: shepherd-task Bash examples contain native pipelines; callers must rely on pipefail." >&2
fi

echo 'Shepherd-task embedded Bash contract tests passed.'
