#!/usr/bin/env bash
# shepherd-task-version: 1.0.5

set -euo pipefail

test_root="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$test_root/.." && pwd)"
monitor="$plugin_root/scripts/shepherd-task-monitor.sh"

fail() {
    echo "Error: $*" >&2
    exit 1
}

find_pr_definition="$(
    awk '
        /^find_pr\(\)/ { capture=1 }
        capture && /^# Get PR status/ { exit }
        capture { print }
    ' "$monitor"
)"
[[ -n "$find_pr_definition" ]] || fail "Unable to extract find_pr."
eval "$find_pr_definition"

REPO="owner/repository"
alert() {
    fail "Unexpected monitor alert: $*"
}
gh() {
    local command="$*"
    case "$command" in
        "api /repos/owner/repository/issues/14/timeline"*)
            echo "https://api.github.com/repos/owner/repository/pulls/240"
            ;;
        "pr list "*)
            printf '%s\n' 240 14
            ;;
        "pr view 240 "*)
            printf '%s\n' '{"state":"OPEN","closingIssuesReferences":[{"number":140}]}'
            ;;
        "pr view 14 "*)
            printf '%s\n' '{"state":"OPEN","closingIssuesReferences":[{"number":14}]}'
            ;;
        *)
            fail "Unexpected gh invocation: $command"
            ;;
    esac
}

result="$(find_pr 14)"
[[ "$result" == "14" ]] ||
    fail "Expected authoritative PR 14; found '$result'."
grep -Fq '(^|[^0-9])#$issue([^0-9]|$)' "$monitor" ||
    fail "The monitor body fallback does not use exact numeric boundaries."
grep -Fq 'any(.closingIssuesReferences[]?; .number == $issue)' "$monitor" ||
    fail "The monitor does not verify authoritative closing references."

echo "Bash monitor linked-PR contract tests passed."
