#!/usr/bin/env bash
# shepherd-task-version: 1.0.3

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

[[ $# -eq 1 ]] || fail "Usage: $0 CAMPAIGN_METADATA_DIRECTORY"
campaign_directory="$1"
[[ "$campaign_directory" != /* && "$campaign_directory" != */* ]] ||
    fail "CAMPAIGN_METADATA_DIRECTORY must be a repository-root-relative basename."
for command in git gh jq find; do
    command -v "$command" >/dev/null 2>&1 || fail "Required command '$command' was not found."
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail "Run this script inside the target test worktree."
repo_root="$(cd "$repo_root" && pwd -P)"
script_dir="$(cd "$(dirname "$0")" && pwd)"
campaign_path="$repo_root/$campaign_directory"
manifest="$campaign_path/shepherd-campaign.json"
experiment_path="$campaign_path/shepherd-test-experiment.json"
lessons_path="$campaign_path/campaign-lessons.md"
issue_body_verifier="$script_dir/../../scripts/verify-github-issue-body.sh"
for path in "$manifest" "$experiment_path" "$lessons_path" "$issue_body_verifier"; do
    [[ -f "$path" ]] || fail "Required file not found: $path"
done

campaign="$(cat "$manifest")"
experiment="$(cat "$experiment_path")"
current_branch="$(git -C "$repo_root" branch --show-current)"
[[ "$current_branch" == "$(jq -r '.baseBranch' <<<"$campaign")" ]] ||
    fail "Current branch '$current_branch' does not match campaign base '$(jq -r '.baseBranch' <<<"$campaign")'."
jq -e '.schemaVersion == 1' <<<"$campaign" >/dev/null || fail "Unsupported campaign schemaVersion."
jq -e '.schemaVersion == 1 and (.baselineSha | test("^[0-9a-f]{40}$")) and
    .expectedTaskCount == 2 and .lessonPropagation == "off"' <<<"$experiment" >/dev/null ||
    fail "Experiment metadata does not match the two-task control campaign."
[[ "$(jq -r '.lessonPropagation' <<<"$campaign")" == off ]] ||
    fail "Control campaign must use lessonPropagation=off."

handoff_files=()
while IFS= read -r -d '' handoff_file; do
    handoff_files+=("$handoff_file")
done < <(
    find "$campaign_path/prompts" -type f -name shepherd-test-experiment-handoff.json -print0
)
[[ ${#handoff_files[@]} -eq 1 ]] ||
    fail "Expected exactly one stage-20 experiment handoff; found ${#handoff_files[@]}."
handoff_path="${handoff_files[0]}"
artifact_directory="$(dirname "$handoff_path")"
ledger_path="$artifact_directory/creation-ledger.json"
handoff="$(cat "$handoff_path")"
jq -e 'type == "array"' "$ledger_path" >/dev/null || fail "Unable to read stage-20 evidence."
[[ "$(jq -r '.mode' <<<"$handoff")" == "$(jq -r '.lessonPropagation' <<<"$campaign")" &&
   "$(jq -r '.baselineSha' <<<"$handoff")" == "$(jq -r '.baselineSha' <<<"$experiment")" &&
   "$(jq -r '.campaignId' <<<"$handoff")" == "$(jq -r '.campaignId' <<<"$campaign")" ]] ||
    fail "Stage-20 handoff does not match campaign and experiment metadata."
jq -e '.expectedLessonCategory | type == "string" and length > 0' <<<"$handoff" >/dev/null ||
    fail "Stage-20 handoff does not define the operator-only expected lesson category."
jq -e 'length == 2' "$ledger_path" >/dev/null || fail "Stage-20 ledger must contain exactly two issues."
jq -e '.issueNumbers | length == 2 and all(.[]; type == "number" and . > 0)' <<<"$handoff" >/dev/null ||
    fail "Stage-20 handoff must contain exactly two ordered issues."
issue_numbers=()
while IFS= read -r issue_number; do
    issue_numbers+=("$issue_number")
done < <(jq -r '.issueNumbers[]' <<<"$handoff")
[[ "${issue_numbers[0]},${issue_numbers[1]}" == "$(jq -r 'map(.number) | join(",")' "$ledger_path")" ]] ||
    fail "Handoff issue order does not match the creation ledger."

expected_lessons="$(cat <<'EOF'
# Campaign lessons

This file contains validated, reusable lessons for subsequent issues in this campaign.
The issue specification and repository instructions remain authoritative.

## Validated lessons

No validated lessons have been recorded yet.
EOF
)"
[[ "$(cat "$lessons_path")" == "$expected_lessons" ]] ||
    fail "Control campaign-lessons.md no longer has the exact initial placeholder content."

repository="$(jq -r '.repository' <<<"$campaign")"
base_branch="$(jq -r '.baseBranch' <<<"$campaign")"
declare -a pr_numbers pr_created pr_merged pr_heads
for index in 0 1; do
    issue_number="${issue_numbers[$index]}"
    body_file_relative="$(jq -r --argjson index "$index" '.[$index].bodyFile // empty' "$ledger_path")"
    [[ -n "$body_file_relative" && "$body_file_relative" != /* ]] ||
        fail "Ledger entry for issue #$issue_number has no valid relative bodyFile."
    body_file="$artifact_directory/$body_file_relative"
    issue_json="$("$issue_body_verifier" "$repository" "$issue_number" "$body_file" 6 5 \
        "$artifact_directory/issue-$issue_number-final-body-verification-failure.json")"
    [[ "$(jq -r '.state' <<<"$issue_json")" == closed ]] ||
        fail "Issue #$issue_number is '$(jq -r '.state' <<<"$issue_json")', expected closed after stage 25."
    normalized="$(jq -r '.body // ""' <<<"$issue_json" | tr '\n\r\t' '   ' | tr -s ' ')"
    for forbidden in '## Campaign lessons (REQUIRED)' \
        "Before implementation, read \`$campaign_directory/campaign-lessons.md\`" \
        'Treat only entries under `Validated lessons` as advisory context' \
        'Candidate lessons for issue'; do
        [[ "$normalized" != *"$forbidden"* ]] ||
            fail "Control issue #$issue_number unexpectedly contains '$forbidden'."
    done

    references=()
    while IFS= read -r reference; do
        references+=("$reference")
    done < <(gh api "/repos/$repository/issues/$issue_number/timeline?per_page=100" \
        -H 'Accept: application/vnd.github+json' \
        --jq '.[] | select(.event == "cross-referenced") |
          select(.source.issue.pull_request != null) | .source.issue.number' | sort -nu)
    matching='[]'
    if ((${#references[@]} > 0)); then
        for pr_number in "${references[@]}"; do
            [[ "$pr_number" =~ ^[1-9][0-9]*$ ]] || continue
            pr_json="$(gh pr view "$pr_number" --repo "$repository" \
                --json number,state,mergedAt,createdAt,baseRefName,headRefOid,url,title 2>&1)" ||
                fail "Unable to fetch linked PR #$pr_number for issue #$issue_number: $pr_json"
            if [[ "$(jq -r '.state' <<<"$pr_json")" == MERGED &&
                  "$(jq -r '.baseRefName' <<<"$pr_json")" == "$base_branch" ]]; then
                matching="$(jq --argjson pr "$pr_json" '. + [$pr]' <<<"$matching")"
            fi
        done
    fi
    [[ "$(jq 'length' <<<"$matching")" -gt 0 ]] ||
        fail "Expected a merged PR to '$base_branch' linked to issue #$issue_number; found none."
    selected="$(jq 'sort_by(.createdAt) | first' <<<"$matching")"
    pr_numbers[$index]="$(jq -r '.number' <<<"$selected")"
    pr_created[$index]="$(jq -r '.createdAt' <<<"$selected")"
    pr_merged[$index]="$(jq -r '.mergedAt' <<<"$selected")"
    pr_heads[$index]="$(jq -r '.headRefOid' <<<"$selected")"
done

for index in 0 1; do
    checks="$(gh api "/repos/$repository/commits/${pr_heads[$index]}/check-runs?per_page=100" 2>&1)" ||
        fail "Unable to query check runs for PR #${pr_numbers[$index]} head ${pr_heads[$index]}: $checks"
    jq -e '[.check_runs[] | select(.name == "Shepherd task math tool" and .conclusion == "success")] |
        length > 0' <<<"$checks" >/dev/null ||
        fail "PR #${pr_numbers[$index]} head ${pr_heads[$index]} lacks a successful substantive check."
done

[[ "${pr_merged[0]}" < "${pr_merged[1]}" ]] ||
    fail "Linked PR timestamps do not show issue 1 merging before issue 2."
[[ ! "${pr_created[1]}" < "${pr_merged[0]}" ]] ||
    fail "Issue 2 linked PR was created before issue 1 merged; serial execution was not preserved."

echo 'Control campaign checks passed.'
echo "  Mode: off"
echo "  Issues: ${issue_numbers[0]},${issue_numbers[1]}"
echo "  Issue 1 PR #${pr_numbers[0]} merged: ${pr_merged[0]}"
echo "  Issue 2 PR #${pr_numbers[1]} created: ${pr_created[1]}"
echo "  Issue 2 PR #${pr_numbers[1]} merged: ${pr_merged[1]}"
echo "  Expected lesson category: $(jq -r '.expectedLessonCategory' <<<"$handoff")"
