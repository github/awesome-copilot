#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

test_root="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$test_root/.." && pwd)"
contract_path="$test_root/$(basename "$0")"

fail() {
    echo "Error: $*" >&2
    exit 1
}

while IFS= read -r shell_file; do
    [[ "$shell_file" == "$contract_path" ]] && continue
    bash -n "$shell_file" || fail "Bash parse errors in '$shell_file'."
    if grep -Eq '(^|[^[:alnum:]_])(mapfile|readarray)([^[:alnum:]_]|$)|declare[[:space:]]+-A|local[[:space:]]+-n|declare[[:space:]]+-n' \
        "$shell_file"; then
        fail "Bash 4-only array syntax found in '$shell_file'."
    fi
    if grep -Eq '\$\{[^}]+,,\}|\$\{[^}]+\^\^\}' "$shell_file"; then
        fail "Bash 4-only case conversion found in '$shell_file'."
    fi
    if grep -Eq 'chmod[[:space:]]+--reference|sort[[:space:]]+-z|sed[[:space:]]+-i([[:space:]]|$)' \
        "$shell_file"; then
        fail "GNU-only command usage found in '$shell_file'."
    fi
done < <(find "$plugin_root" -type f -name '*.sh' -print)

echo "macOS Bash compatibility contract tests passed."
