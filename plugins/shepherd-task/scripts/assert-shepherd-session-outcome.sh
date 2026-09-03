#!/usr/bin/env bash

set -euo pipefail

[[ $# -eq 4 ]] || {
    echo "Usage: $0 <SHARE_PATH> <STAGE> <TASK_ISSUE> <PR_NUMBER>" >&2
    exit 1
}

share_path="$1"
stage="$2"
task_issue="$3"
pr_number="$4"

[[ "$stage" == 30 || "$stage" == 40 ]] ||
    { echo "Stage must be 30 or 40." >&2; exit 1; }
[[ "$task_issue" =~ ^[1-9][0-9]*$ ]] ||
    { echo "Task issue must be a positive integer." >&2; exit 1; }
[[ -f "$share_path" ]] ||
    { echo "Stage $stage did not write its required session transcript: $share_path" >&2; exit 1; }

terminal_marker="$(
    awk '
        {
            gsub(/\*/, "")
            while ($0 ~ /^[[:space:]]*>/) {
                sub(/^[[:space:]]*>[[:space:]]*/, "")
            }
            sub(/^[[:space:]]+/, "")
            sub(/[[:space:]]+$/, "")
            if ($0 ~ /^SHEPHERD (COMPLETE|FAILED):/) marker=$0
        }
        END { print marker }
    ' "$share_path"
)"

[[ -n "$terminal_marker" ]] || {
    echo "Stage $stage did not report a terminal SHEPHERD COMPLETE or SHEPHERD FAILED marker: $share_path" >&2
    exit 1
}
[[ "$terminal_marker" != SHEPHERD\ FAILED:* ]] || {
    echo "Stage $stage reported semantic failure: $terminal_marker" >&2
    exit 1
}
[[ "$terminal_marker" == SHEPHERD\ COMPLETE:* ]] || {
    echo "Stage $stage reported an unsupported terminal marker: $terminal_marker" >&2
    exit 1
}
[[ "$pr_number" =~ ^[1-9][0-9]*$ ]] || {
    echo "Stage $stage reported completion, but no linked PR was found for task #$task_issue." >&2
    exit 1
}
pr_pattern="PR #${pr_number}([^0-9]|$)"
task_pattern="task #${task_issue}([^0-9]|$)"
[[ "$terminal_marker" =~ $pr_pattern &&
   "$terminal_marker" =~ $task_pattern ]] || {
    echo "Stage $stage terminal marker does not identify task #$task_issue and PR #$pr_number: $terminal_marker" >&2
    exit 1
}

required_outcome=ready
[[ "$stage" == 30 ]] || required_outcome=merged
[[ "${terminal_marker,,}" == *"$required_outcome"* ]] || {
    echo "Stage $stage terminal marker does not report '$required_outcome': $terminal_marker" >&2
    exit 1
}

printf '%s\n' "$terminal_marker"
