#!/usr/bin/env bash
# shepherd-task-version: 1.0.4

set -euo pipefail

fixture_root="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$fixture_root/../.." && pwd)"
assertion="$plugin_root/scripts/assert-shepherd-session-outcome.sh"
orchestrator="$plugin_root/scripts/shepherd-task.sh"
temp_directory="$(mktemp -d "$fixture_root/.session-outcome-contract.XXXXXX")"
trap 'rm -rf "$temp_directory"' EXIT

cat >"$temp_directory/stage30-success.md" <<'EOF'
Earlier tool output mentioned SHEPHERD FAILED: but was not a terminal marker.
**SHEPHERD COMPLETE:** PR #24 for task #14 is ready for marking as "Ready for review".
EOF
"$assertion" "$temp_directory/stage30-success.md" 30 14 24 >/dev/null

cat >"$temp_directory/stage30-failure.md" <<'EOF'
The GitHub CLI and Copilot CLI both returned process exit code 0.
**SHEPHERD FAILED:** Copilot completed a follow-up work cycle on PR #24 but did not push a new HEAD within 10 minutes.
EOF
if "$assertion" "$temp_directory/stage30-failure.md" 30 14 24 >/dev/null 2>&1; then
    echo 'Failed stage 30 transcript was incorrectly accepted.' >&2
    exit 1
fi

cat >"$temp_directory/stage40-success.md" <<'EOF'
>> **SHEPHERD COMPLETE:** PR #24 for task #14 was merged into experiment/shepherd-control.
EOF
"$assertion" "$temp_directory/stage40-success.md" 40 14 24 >/dev/null

if "$assertion" "$temp_directory/stage30-success.md" 30 14 '' >/dev/null 2>&1; then
    echo 'Completed stage 30 transcript without a PR was incorrectly accepted.' >&2
    exit 1
fi

cat >"$temp_directory/prefix-collision.md" <<'EOF'
**SHEPHERD COMPLETE:** PR #240 for task #140 is ready for marking as "Ready for review".
EOF
if "$assertion" "$temp_directory/prefix-collision.md" 30 14 24 >/dev/null 2>&1; then
    echo 'Prefix-colliding PR and task numbers were incorrectly accepted.' >&2
    exit 1
fi


candidate_json='[
  {"number":24,"body":"Fixes #14","title":"Task 14","headRefName":"task-14"},
  {"number":240,"body":"Fixes #140","title":"Task 140","headRefName":"task-140"}
]'
body_matches=$(jq -r '.[] | select((.body // "") | test("(^|[^0-9])#14([^0-9]|$)")) | .number' <<<"$candidate_json")
title_branch_matches=$(jq -r '.[] | select(((.title // "") | test("(^|[^0-9])14([^0-9]|$)"; "i")) or ((.headRefName // "") | test("(^|[^0-9])14([^0-9]|$)"))) | .number' <<<"$candidate_json")
[[ "$body_matches" == 24 && "$title_branch_matches" == 24 ]] || {
    echo 'Exact issue-number discovery matched the #140 prefix collision.' >&2
    exit 1
}

grep -Fq 'resuming Phase 1' "$orchestrator"
grep -Fq 'find_linked_pr MERGED' "$orchestrator"
grep -Fq 'closingIssuesReferences' "$orchestrator"
grep -Fq 'any(.closingIssuesReferences[]?; .number == $issue)' "$orchestrator"
grep -Fq 'Multiple $desired_state PRs close task issue' "$orchestrator"
grep -Fq 'FIND_PR_STATUS' "$orchestrator"
grep -Fq 'was already completed by PR' "$orchestrator"
grep -Fq '"$SESSION_OUTCOME_ASSERTION" "$PHASE1_SHARE" 30' "$orchestrator"
grep -Fq '"$SESSION_OUTCOME_ASSERTION" "$PHASE2_SHARE" 40' "$orchestrator"
grep -Fq 'state,isDraft,baseRefName,reviewDecision' "$orchestrator"
grep -Fq 'gh api graphql --paginate --slurp' "$orchestrator"
grep -Fq '"$review_decision" != "CHANGES_REQUESTED"' "$orchestrator"
if grep -Fq 'find_linked_pr OPEN) || true' "$orchestrator"; then
    echo 'Bash orchestrator still suppresses linked-PR discovery errors.' >&2
    exit 1
fi
if grep -Fq 'skipping Phase 1' "$orchestrator"; then
    echo 'Bash orchestrator still skips stage 30 when an open PR exists.' >&2
    exit 1
fi

echo 'Bash shepherd session outcome contract tests passed.'
