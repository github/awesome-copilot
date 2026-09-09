#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

[[ $# -eq 1 ]] || fail "Usage: $0 CAMPAIGN_METADATA_DIRECTORY"
campaign_directory="$1"
[[ "$campaign_directory" != /* && "$campaign_directory" != */* ]] ||
    fail "CAMPAIGN_METADATA_DIRECTORY must be a repository-root-relative basename."
for command in git jq copilot; do
    command -v "$command" >/dev/null 2>&1 || fail "Required command '$command' was not found."
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail "Run this script inside the target test worktree."
repo_root="$(cd "$repo_root" && pwd -P)"
script_dir="$(cd "$(dirname "$0")" && pwd)"
scripts_directory="$(cd "$script_dir/../../scripts" && pwd -P)"
stage15="$scripts_directory/shepherd-task-15-prepare-create-issues.sh"
stage25="$scripts_directory/shepherd-task-25-given-list.sh"
[[ -x "$stage15" && -x "$stage25" ]] || fail "Installed shepherd-task Bash stage scripts are incomplete."

campaign_path="$repo_root/$campaign_directory"
manifest="$campaign_path/shepherd-campaign.json"
experiment_path="$campaign_path/shepherd-test-experiment.json"
[[ -f "$manifest" && -f "$experiment_path" ]] || fail "Required campaign metadata was not found."
campaign="$(cat "$manifest")"
experiment="$(cat "$experiment_path")"
current_branch="$(git -C "$repo_root" branch --show-current)"
[[ "$current_branch" == "$(jq -r '.baseBranch' <<<"$campaign")" ]] ||
    fail "Current branch '$current_branch' does not match campaign base '$(jq -r '.baseBranch' <<<"$campaign")'."
jq -e '.schemaVersion == 1 and (.baselineSha | test("^[0-9a-f]{40}$")) and
    .lessonPropagation == "off" and .expectedTaskCount == 2' <<<"$experiment" >/dev/null ||
    fail "Experiment metadata has an unsupported schema or invalid control contract."
[[ "$(jq -r '.lessonPropagation' <<<"$campaign")" == off ]] ||
    fail "Control campaign must use lessonPropagation=off."

stage15_output="$("$stage15" "$campaign_directory")" ||
    fail "Stage 15 preparation failed: $stage15_output"
printf '%s\n' "$stage15_output"
artifact_directory="$(printf '%s\n' "$stage15_output" | sed -n 's/^  Directory: //p' | tail -n 1)"
prompt_file="$(printf '%s\n' "$stage15_output" | sed -n 's/^  Prompt:    //p' | tail -n 1)"
invocation_file="$(printf '%s\n' "$stage15_output" | sed -n 's/^  Script:    //p' | tail -n 1)"
[[ -d "$artifact_directory" && -f "$prompt_file" && -x "$invocation_file" ]] ||
    fail "Stage 15 returned incomplete artifact information."

base_remote="$("$scripts_directory/resolve-repository-remote.sh" "$(jq -r '.repository' <<<"$campaign")")"
draft_validator="$scripts_directory/validate-stage20-drafts.sh"
issue_body_verifier="$scripts_directory/verify-github-issue-body.sh"
required_prompt=(
    '- PLAN_FILE_NAME: math-tool-ignorance-reduction-plan.md'
    '- QUESTIONS_SECTION: ## Ignorance reduction'
    '- IMPLEMENTATION_SECTION: ## Implementation'
    '- EXPECTED_TASK_COUNT: 2'
    "- BASE_REMOTE: $base_remote"
    "- DRAFT_VALIDATOR: $draft_validator"
    "- ISSUE_BODY_VERIFIER: $issue_body_verifier"
)
for expected in "${required_prompt[@]}"; do
    grep -Fq -- "$expected" "$prompt_file" || fail "Generated stage-20 prompt is missing '$expected'."
done
if grep -Eq '^- (ISSUE_TYPE|EXAMPLE_ISSUES|SUPPORTING_ARTIFACTS):' "$prompt_file"; then
    fail "Generated stage-20 prompt contains an obsolete caller-supplied input."
fi

echo 'Executing the generated stage-20 Copilot invocation...'
"$invocation_file" || {
    details=()
    if [[ -f "$artifact_directory/stage-20-result.json" ]]; then
        details+=("Stage result: $(jq -r '.status // "invalid"' "$artifact_directory/stage-20-result.json" 2>/dev/null || echo invalid).")
        operation_error="$(jq -r '.operationError // empty' "$artifact_directory/stage-20-result.json" 2>/dev/null || true)"
        [[ -z "$operation_error" ]] || details+=("Operation error: $operation_error")
    else
        details+=("The required stage-20-result.json document is missing.")
    fi
    fail "Stage-20 invocation failed. ${details[*]}"
}

result_path="$artifact_directory/stage-20-result.json"
ledger_path="$artifact_directory/creation-ledger.json"
jq -e '.schemaVersion == 1 and .status == "complete" and .ledgerFile == "creation-ledger.json"' \
    "$result_path" >/dev/null || fail "Stage result does not report a completed stage 20."
jq -e 'type == "array" and length == 2' "$ledger_path" >/dev/null ||
    fail "Creation ledger must contain exactly two entries."

mapfile -t issue_numbers < <(jq -r '.[].number' "$ledger_path")
actual_bodies='[]'
repository="$(jq -r '.repository' <<<"$campaign")"
for index in 0 1; do
    issue_number="${issue_numbers[$index]}"
    jq -e --argjson index "$index" \
        '.[$index] | (.number | type == "number" and . > 0) and .body_verified == true and
        .linked == true and
        (.bodyFile | type == "string" and length > 0 and (startswith("/") | not))' \
        "$ledger_path" >/dev/null || fail "Ledger entry for issue #$issue_number is invalid."
    body_file="$artifact_directory/$(jq -r --argjson index "$index" '.[$index].bodyFile' "$ledger_path")"
    [[ -f "$body_file" ]] || fail "Persisted draft for issue #$issue_number was not found: $body_file"
    issue_json="$("$issue_body_verifier" "$repository" "$issue_number" "$body_file" 6 5 \
        "$artifact_directory/issue-$issue_number-body-verification-failure.json")"
    [[ "$(jq -r '.state' <<<"$issue_json")" == open ]] ||
        fail "Issue #$issue_number is not open."
    normalized="$(jq -r '.body // ""' <<<"$issue_json" | tr '\n\r\t' '   ' | tr -s ' ')"
    for forbidden in '## Campaign lessons (REQUIRED)' \
        "Before implementation, read \`$campaign_directory/campaign-lessons.md\`" \
        'Treat only entries under `Validated lessons` as advisory context' \
        'Candidate lessons for issue'; do
        [[ "$normalized" != *"$forbidden"* ]] ||
            fail "Control issue #$issue_number unexpectedly contains '$forbidden'."
    done
    actual_bodies="$(jq --argjson number "$issue_number" \
        '. + [{number:$number,state:"OPEN",bodyVerified:true}]' <<<"$actual_bodies")"
done

handoff_path="$artifact_directory/shepherd-test-experiment-handoff.json"
jq -n \
    --arg baselineSha "$(jq -r '.baselineSha' <<<"$experiment")" \
    --arg campaignId "$(jq -r '.campaignId' <<<"$campaign")" \
    --argjson issueNumbers "$(printf '%s\n' "${issue_numbers[@]}" | jq -s 'map(tonumber)')" \
    --argjson actualBodiesVerified "$actual_bodies" \
    --arg expectedLessonCategory 'Non-obvious repository-tested implementation pattern that lets dot-sourced unit tests coexist with direct CLI execution.' \
    '{schemaVersion:1,mode:"off",baselineSha:$baselineSha,campaignId:$campaignId,
      issueNumbers:$issueNumbers,actualBodiesVerified:$actualBodiesVerified,
      expectedLessonCategory:$expectedLessonCategory}' >"$handoff_path"
ordered_issue_list="$(IFS=,; echo "${issue_numbers[*]}")"

echo
echo 'Stage 20 completed and actual issue bodies were verified.'
echo "Evidence: $handoff_path"
echo 'Exact stage-25 command:'
printf '  %q %q %q\n' "$stage25" "$ordered_issue_list" "$campaign_directory"
