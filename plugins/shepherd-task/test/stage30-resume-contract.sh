#!/usr/bin/env bash
# shepherd-task-version: 1.0.5

set -euo pipefail

fixture_root="$(cd "$(dirname "$0")" && pwd)"
repository_root="$(cd "$fixture_root/../../.." && pwd)"
skill="$repository_root/skills/shepherd-task-30-from-assignment-to-ready/SKILL.md"

fail() {
    echo "Error: $*" >&2
    exit 1
}

require_text() {
    grep -Fq -- "$1" "$skill" || fail "$2"
}

first_line() {
    grep -nF "$1" "$skill" | head -n 1 | cut -d: -f1
}

for command_name in grep head cut sed; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done

discovery_line="$(first_line 'find_linked_pr() {')"
preflight_line="$(first_line 'if PR_NUMBER="$(find_linked_pr)"; then')"
multiple_line="$(first_line 'Multiple open PRs close task #$TASK_ISSUE')"
assignment_guard_line="$(first_line 'if [[ -z "$PR_NUMBER" ]]; then')"
assignment_line="$(first_line '/repos/$REPO/issues/$TASK_ISSUE/assignees \')"

[[ -n "$discovery_line" && -n "$preflight_line" && -n "$multiple_line" &&
    -n "$assignment_guard_line" && -n "$assignment_line" ]] ||
    fail "Stage 30 is missing discovery, preflight, or assignment guidance."
[[ "$discovery_line" -lt "$multiple_line" &&
    "$multiple_line" -lt "$preflight_line" &&
    "$preflight_line" -lt "$assignment_guard_line" &&
    "$assignment_guard_line" -lt "$assignment_line" ]] ||
    fail "Stage 30 must discover and validate an existing PR before assignment."

require_text 'if [[ -z "$PR_NUMBER" ]]; then' \
    "The Bash assignment and polling flows must be conditional on a missing PR."
require_text 'Resuming Stage 30 with existing draft PR #$PR_NUMBER; skipping assignment.' \
    "The Bash resume path must skip assignment explicitly."
require_text 'retain it for every later Stage 30 step' \
    "The resumed PR number must be retained for later validation."
require_text 'Multiple open PRs close task #$TASK_ISSUE' \
    "Multiple authoritative open PRs must fail closed."
require_text '--json state,isDraft,baseRefName,closingIssuesReferences' \
    "Resume validation must query state, draft status, base, and closing references."
require_text '.state == "OPEN" and' \
    "The Bash resume gate must require an open PR."
require_text '.isDraft == true and' \
    "The Bash resume gate must reject a Ready-for-review PR."
require_text '.baseRefName == $base and' \
    "The Bash resume gate must require the campaign base branch."
require_text 'any(.closingIssuesReferences[]?; .number == $issue)' \
    "The Bash resume gate must require the exact closing issue."
require_text '(^|[^0-9])$TASK_ISSUE([^0-9]|$)' \
    "Bash candidate discovery must retain numeric issue boundaries."
require_text 'copilot_work_finished_failure at $LATEST_FAILURE) with no substantive changes. Re-assigning.' \
    "The intentional post-failure re-assignment path must remain present."

require_text 'function Find-LinkedOpenPR {' \
    "The PowerShell resume path must define authoritative discovery."
require_text '$PR_NUMBER = Find-LinkedOpenPR' \
    "The PowerShell resume path must retain the discovered PR number."
require_text 'if ($null -eq $PR_NUMBER) {' \
    "The PowerShell assignment and polling flows must require a missing PR."
require_text '$resumeState.isDraft -ne $true' \
    "The PowerShell resume gate must reject a Ready-for-review PR."
require_text '[string]$resumeState.baseRefName -ne $BASE_BRANCH' \
    "The PowerShell resume gate must require the campaign base branch."
require_text '[string]$resumeState.state -ne '\''OPEN'\''' \
    "The PowerShell resume gate must require an open PR."
require_text '[int]$_.number -eq [int]$TASK_ISSUE' \
    "The PowerShell resume gate must require the exact closing issue."

assignment_count="$(grep -Fc '/repos/$REPO/issues/$TASK_ISSUE/assignees' "$skill")"
failure_line="$(first_line 'copilot_work_finished_failure at $LATEST_FAILURE) with no substantive changes. Re-assigning.')"
post_failure_assignment_line="$(
    sed -n "${failure_line},\$p" "$skill" |
        grep -nF '/repos/$REPO/issues/$TASK_ISSUE/assignees' |
        head -n 1 |
        cut -d: -f1
)"
[[ "$assignment_count" -ge 3 && -n "$post_failure_assignment_line" ]] ||
    fail "Stage 30 must preserve initial Bash/PowerShell assignment and later failure re-assignment."

stage30_action() {
    local match_count="$1"
    local state="${2:-}"
    local draft="${3:-}"
    local base="${4:-}"
    local expected_base="${5:-campaign-base}"

    if [[ "$match_count" -gt 1 ]]; then
        printf '%s\n' fail
    elif [[ "$match_count" -eq 0 ]]; then
        printf '%s\n' assign-and-poll
    elif [[ "$state" == OPEN && "$draft" == true && "$base" == "$expected_base" ]]; then
        printf '%s\n' resume
    else
        printf '%s\n' fail
    fi
}

[[ "$(stage30_action 0)" == assign-and-poll ]] ||
    fail "Zero matches must preserve first-run assignment and discovery."
[[ "$(stage30_action 1 OPEN true campaign-base)" == resume ]] ||
    fail "One authoritative open draft PR on the campaign base must resume."
[[ "$(stage30_action 2 OPEN true campaign-base)" == fail ]] ||
    fail "Multiple authoritative open PRs must fail before assignment."
[[ "$(stage30_action 1 CLOSED true campaign-base)" == fail ]] ||
    fail "A PR that becomes non-open during resume validation must fail."
[[ "$(stage30_action 1 OPEN false campaign-base)" == fail ]] ||
    fail "A Ready-for-review PR must fail the Stage 30 resume gate."
[[ "$(stage30_action 1 OPEN true wrong-base)" == fail ]] ||
    fail "A PR targeting the wrong base must fail the Stage 30 resume gate."

[[ "fix #14" =~ (^|[^0-9])#14([^0-9]|$) ]] ||
    fail "The exact issue-boundary fixture is invalid."
if [[ "fix #140" =~ (^|[^0-9])#14([^0-9]|$) ]]; then
    fail "Issue 14 must not match issue 140."
fi
[[ 14 -eq 14 && 140 -ne 14 ]] ||
    fail "Authoritative closing-reference comparison must remain numeric and exact."

echo "Stage 30 Bash resume contract tests passed."
