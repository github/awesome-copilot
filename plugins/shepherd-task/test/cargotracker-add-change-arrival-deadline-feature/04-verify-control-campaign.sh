#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

[[ $# -eq 1 ]] || fail "Usage: $0 <CAMPAIGN_METADATA_DIRECTORY>"
campaign_metadata_directory="$1"
[[ "$campaign_metadata_directory" != /* && "$campaign_metadata_directory" != */* ]] ||
    fail "CampaignMetadataDirectory must be a repository-root-relative basename."
for command_name in git gh jq find sort tr; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail "Run this script inside the target test worktree."
repo_root="$(cd "$repo_root" && pwd -P)"
script_dir="$(cd "$(dirname "$0")" && pwd)"
issue_body_verifier="$script_dir/../../scripts/verify-github-issue-body.sh"
[[ -x "$issue_body_verifier" ]] ||
    fail "Issue body verifier not found or not executable: $issue_body_verifier"

campaign_path="$repo_root/$campaign_metadata_directory"
manifest_path="$campaign_path/shepherd-campaign.json"
experiment_path="$campaign_path/shepherd-test-experiment.json"
lessons_path="$campaign_path/campaign-lessons.md"
for required_path in "$manifest_path" "$experiment_path" "$lessons_path"; do
    [[ -f "$required_path" ]] || fail "Required file not found: $required_path"
done
campaign="$(cat "$manifest_path")"
experiment="$(cat "$experiment_path")"
current_branch="$(git -C "$repo_root" branch --show-current)"
base_branch="$(jq -r '.baseBranch' <<<"$campaign")"
repository="$(jq -r '.repository' <<<"$campaign")"
[[ "$current_branch" == "$base_branch" ]] ||
    fail "Current branch '$current_branch' does not match campaign base '$base_branch'."
jq -e '.schemaVersion == 1' <<<"$campaign" >/dev/null &&
    jq -e '.schemaVersion == 1 and (.baselineSha | test("^[0-9a-f]{40}$")) and
        .expectedTaskCount == 5' <<<"$experiment" >/dev/null ||
    fail "Unsupported campaign or experiment metadata."
[[ "$(jq -r '.lessonPropagation' <<<"$campaign")" == "off" ]] ||
    fail "Control campaign must use lessonPropagation=off."
[[ "$(jq -r '.lessonPropagation' <<<"$campaign")" == "$(jq -r '.lessonPropagation' <<<"$experiment")" ]] ||
    fail "Experiment lesson mode does not match the campaign."

handoff_files=()
while IFS= read -r handoff_file; do
    handoff_files+=("$handoff_file")
done < <(find "$campaign_path/prompts" -type f \
    -name shepherd-test-experiment-handoff.json -print)
[[ ${#handoff_files[@]} -eq 1 ]] ||
    fail "Expected exactly one stage-20 experiment handoff; found ${#handoff_files[@]}."
handoff_path="${handoff_files[0]}"
artifact_directory="$(dirname "$handoff_path")"
ledger_path="$artifact_directory/creation-ledger.json"
jq -e . "$handoff_path" >/dev/null 2>&1 &&
    jq -e 'type == "array"' "$ledger_path" >/dev/null 2>&1 ||
    fail "Unable to read stage-20 evidence."
handoff="$(cat "$handoff_path")"
ledger="$(cat "$ledger_path")"
jq -e \
    --arg mode "$(jq -r '.lessonPropagation' <<<"$campaign")" \
    --arg baseline "$(jq -r '.baselineSha' <<<"$experiment")" \
    --arg campaignId "$(jq -r '.campaignId' <<<"$campaign")" \
    '.mode == $mode and .baselineSha == $baseline and .campaignId == $campaignId and
     (.expectedLessonCategory | type == "string" and length > 0) and
     (.issueNumbers | length == 5)' <<<"$handoff" >/dev/null ||
    fail "Stage-20 handoff does not match campaign and experiment metadata."
jq -e 'length == 5' <<<"$ledger" >/dev/null ||
    fail "Stage-20 evidence must contain exactly five ordered issues."
for index in 0 1 2 3 4; do
    [[ "$(jq -r ".issueNumbers[$index]" <<<"$handoff")" == "$(jq -r ".[$index].number" <<<"$ledger")" ]] ||
        fail "Handoff issue order does not match the creation ledger."
done

expected_placeholder="$(cat <<'EOF'
# Campaign lessons

This file contains validated, reusable lessons for subsequent issues in this campaign.
The issue specification and repository instructions remain authoritative.

## Validated lessons

No validated lessons have been recorded yet.
EOF
)"
actual_lessons="$(cat "$lessons_path")"
[[ "$actual_lessons" == "$expected_placeholder" ]] ||
    fail "Control campaign-lessons.md no longer has the exact initial placeholder content."

linked_prs='[]'
for index in 0 1 2 3 4; do
    issue_number="$(jq -r ".issueNumbers[$index]" <<<"$handoff")"
    body_file="$(jq -r ".[$index].bodyFile // empty" <<<"$ledger")"
    [[ -n "$body_file" && "$body_file" != /* ]] ||
        fail "Ledger entry for issue #$issue_number has no valid relative bodyFile."
    diagnostic_path="$artifact_directory/issue-$issue_number-final-body-verification-failure.json"
    issue_json="$("$issue_body_verifier" "$repository" "$issue_number" \
        "$artifact_directory/$body_file" 6 5 "$diagnostic_path")"
    [[ "$(jq -r '.state' <<<"$issue_json")" == "closed" ]] ||
        fail "Issue #$issue_number is '$(jq -r '.state' <<<"$issue_json")', expected closed after stage 25."
    normalized_body="$(jq -r '.body // ""' <<<"$issue_json" | tr '\r\n\t' '   ' | tr -s ' ')"
    forbidden_texts=(
        '## Campaign lessons (REQUIRED)'
        "Before implementation, read \`$campaign_metadata_directory/campaign-lessons.md\`"
        'Treat only entries under `Validated lessons` as advisory context'
        'Candidate lessons for issue'
    )
    for forbidden in "${forbidden_texts[@]}"; do
        normalized_forbidden="$(printf '%s' "$forbidden" | tr '\r\n\t' '   ' | tr -s ' ')"
        [[ "$normalized_body" != *"$normalized_forbidden"* ]] ||
            fail "Control issue #$issue_number unexpectedly contains '$forbidden'."
    done

    references="$(
        gh api "/repos/$repository/issues/$issue_number/timeline?per_page=100" \
            -H 'Accept: application/vnd.github+json' \
            --jq '.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | .source.issue.number' |
            sort -u
    )" || fail "Unable to query linked PRs for issue #$issue_number."
    matching='[]'
    while IFS= read -r pr_number; do
        [[ "$pr_number" =~ ^[1-9][0-9]*$ ]] || continue
        pr_json="$(gh pr view "$pr_number" --repo "$repository" \
            --json number,state,mergedAt,createdAt,baseRefName,headRefOid,url,title)" ||
            fail "Unable to fetch linked PR #$pr_number for issue #$issue_number."
        if jq -e --arg base "$base_branch" '.state == "MERGED" and .baseRefName == $base' \
            <<<"$pr_json" >/dev/null; then
            matching="$(jq --argjson pr "$pr_json" '. + [$pr]' <<<"$matching")"
        fi
    done <<<"$references"
    [[ "$(jq 'length' <<<"$matching")" -gt 0 ]] ||
        fail "Expected a merged PR to '$base_branch' linked to issue #$issue_number; found none."
    first_pr="$(jq 'sort_by(.createdAt) | .[0]' <<<"$matching")"
    linked_prs="$(jq --argjson pr "$first_pr" '. + [$pr]' <<<"$linked_prs")"
done

while IFS= read -r pr; do
    pr_number="$(jq -r '.number' <<<"$pr")"
    head_oid="$(jq -r '.headRefOid' <<<"$pr")"
    checks="$(gh api "/repos/$repository/commits/$head_oid/check-runs?per_page=100")" ||
        fail "Unable to query check runs for PR #$pr_number head $head_oid."
    jq -e '[.check_runs[] | select(.name == "Shepherd task Cargo Tracker" and .conclusion == "success")] | length > 0' \
        <<<"$checks" >/dev/null ||
        fail "PR #$pr_number head $head_oid lacks a successful substantive 'Shepherd task Cargo Tracker' check."
done < <(jq -c '.[]' <<<"$linked_prs")

for index in 1 2 3 4; do
    previous_merged="$(jq -r ".[$((index - 1))].mergedAt" <<<"$linked_prs")"
    current_created="$(jq -r ".[$index].createdAt" <<<"$linked_prs")"
    current_merged="$(jq -r ".[$index].mergedAt" <<<"$linked_prs")"
    [[ "$previous_merged" < "$current_merged" ]] ||
        fail "Linked PR timestamps do not show issue $index merging before issue $((index + 1))."
    [[ "$current_created" > "$previous_merged" || "$current_created" == "$previous_merged" ]] ||
        fail "Issue $((index + 1)) linked PR was created before issue $index merged; serial execution was not preserved."
done

echo "Control campaign checks passed."
echo "  Mode: off"
echo "  Issues: $(jq -r '.issueNumbers | join(",")' <<<"$handoff")"
for index in 0 1 2 3 4; do
    echo "  Issue $((index + 1)) PR #$(jq -r ".[$index].number" <<<"$linked_prs") created: $(jq -r ".[$index].createdAt" <<<"$linked_prs")"
    echo "  Issue $((index + 1)) PR #$(jq -r ".[$index].number" <<<"$linked_prs") merged: $(jq -r ".[$index].mergedAt" <<<"$linked_prs")"
done
echo "  Expected lesson category: $(jq -r '.expectedLessonCategory' <<<"$handoff")"
