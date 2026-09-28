#!/usr/bin/env bash
# shepherd-task-version: 1.0.5

set -euo pipefail

test_root="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$test_root/.." && pwd)"
orchestrator="$plugin_root/scripts/shepherd-task.sh"

fail() {
    echo "Error: $*" >&2
    exit 1
}

find_linked_pr_definition="$(
    awk '
        /^find_linked_pr\(\)/ { capture=1 }
        capture && /^# Verify all CI checks/ { exit }
        capture { print }
    ' "$orchestrator"
)"
[[ -n "$find_linked_pr_definition" ]] || fail "Unable to extract find_linked_pr."
eval "$find_linked_pr_definition"

REPO="owner/repository"
TASK_ISSUE=14

gh() {
    local command="$*"
    case "$command" in
        "api /repos/owner/repository/issues/14/timeline?per_page=100 --paginate --jq "*)
            printf '%s\n' \
                "https://api.github.com/repos/owner/repository/pulls/240" \
                "https://api.github.com/repos/owner/repository/pulls/14"
            ;;
        "pr view 240 "*)
            printf '%s\n' '{"state":"MERGED","closingIssuesReferences":[{"number":140}]}'
            ;;
        "pr view 14 "*)
            printf '%s\n' '{"state":"MERGED","closingIssuesReferences":[{"number":14}]}'
            ;;
        "pr list "*)
            fail "Merged PR discovery must not depend on open-PR fallbacks."
            ;;
        *)
            fail "Unexpected gh invocation: $command"
            ;;
    esac
}

result="$(find_linked_pr MERGED)"
[[ "$result" == "14" ]] ||
    fail "Expected authoritative merged PR 14 from paginated timeline output; found '$result'."

echo "Bash orchestrator linked-PR pagination contract tests passed."
