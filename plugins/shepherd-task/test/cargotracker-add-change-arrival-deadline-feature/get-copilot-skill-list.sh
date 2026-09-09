#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

copilot_cli="${1:-copilot}"
command -v "$copilot_cli" >/dev/null 2>&1 || {
    echo "Required command was not found on PATH: $copilot_cli" >&2
    exit 1
}
output=""
set +e
output="$("$copilot_cli" skill list 2>&1)"
exit_code=$?
set -e

printf '%s' "$output"
[[ -z "$output" ]] || printf '\n'
exit "$exit_code"
