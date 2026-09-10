#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

test_root="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$test_root/.." && pwd)"
contract_path="$test_root/$(basename "$0")"
skills_root="$plugin_root/skills"
if [[ ! -d "$skills_root" ]]; then
    skills_root="$(cd "$plugin_root/../../skills" && pwd)"
fi

bash4_array_pattern='(^|[^[:alnum:]_])(mapfile|readarray)([^[:alnum:]_]|$)|declare[[:space:]]+-A|local[[:space:]]+-n|declare[[:space:]]+-n'
bash4_case_pattern='\$\{[^}]+,,\}|\$\{[^}]+\^\^\}'
gnu_command_pattern='chmod[[:space:]]+--reference|sort[[:space:]]+-z|sed[[:space:]]+-i([[:space:]]|$)'
base64_operand_pattern='base64[[:space:]]+(--decode|-D|-d)[[:space:]]+[^<[:space:]]'

fail() {
    echo "Error: $*" >&2
    exit 1
}

extract_bash_blocks() {
    awk '
        /^[[:space:]]*```(bash|sh)[[:space:]]*$/ { in_bash=1; next }
        /^[[:space:]]*```/ { in_bash=0; next }
        in_bash { print }
    ' "$1"
}

while IFS= read -r shell_file; do
    [[ "$shell_file" == "$contract_path" ]] && continue
    bash -n "$shell_file" || fail "Bash parse errors in '$shell_file'."
    if grep -Eq "$bash4_array_pattern" "$shell_file"; then
        fail "Bash 4-only array syntax found in '$shell_file'."
    fi
    if grep -Eq "$bash4_case_pattern" "$shell_file"; then
        fail "Bash 4-only case conversion found in '$shell_file'."
    fi
    if grep -Eq "$gnu_command_pattern" "$shell_file"; then
        fail "GNU-only command usage found in '$shell_file'."
    fi
    if grep -Eq "$base64_operand_pattern" "$shell_file"; then
        fail "Nonportable base64 decoded-file operand found in '$shell_file'; read encoded input from standard input."
    fi
done < <(find "$plugin_root" -type f -name '*.sh' -print)

skill_count=0
while IFS= read -r skill_file; do
    skill_count=$((skill_count + 1))
    bash_blocks="$(extract_bash_blocks "$skill_file")"
    [[ -n "$bash_blocks" ]] || continue
    if printf '%s\n' "$bash_blocks" |
        grep -Eq "$bash4_array_pattern|$bash4_case_pattern"; then
        fail "Bash 4-only syntax found in Bash snippets in '$skill_file'."
    fi
    if printf '%s\n' "$bash_blocks" |
        grep -Eq "$gnu_command_pattern|$base64_operand_pattern"; then
        fail "GNU/Linux-only command usage found in Bash snippets in '$skill_file'."
    fi
done < <(
    find "$skills_root" -mindepth 2 -maxdepth 2 -type f \
        -path '*/shepherd-task-*/SKILL.md' -print
)
[[ "$skill_count" -eq 6 ]] ||
    fail "Expected to scan 6 shepherd-task skills; found $skill_count under '$skills_root'."

echo "macOS Bash compatibility contract tests passed."
