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

for command_name in git jq find grep sort comm tr; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail "Run this script inside the target test worktree."
repo_root="$(cd "$repo_root" && pwd -P)"
script_dir="$(cd "$(dirname "$0")" && pwd)"
scripts_directory="$(cd "$script_dir/../../scripts" && pwd -P)"
preparation_script="$scripts_directory/shepherd-task-15-prepare-create-issues.sh"
[[ -x "$preparation_script" ]] ||
    fail "Stage 15 preparation script not found or not executable: $preparation_script"

campaign_path="$repo_root/$campaign_metadata_directory"
manifest_path="$campaign_path/shepherd-campaign.json"
experiment_path="$campaign_path/shepherd-test-experiment.json"
[[ -f "$manifest_path" ]] || fail "Required file not found: $manifest_path"
[[ -f "$experiment_path" ]] || fail "Required file not found: $experiment_path"

campaign="$(cat "$manifest_path")"
experiment="$(cat "$experiment_path")"
current_branch="$(git -C "$repo_root" branch --show-current)"
campaign_base="$(jq -r '.baseBranch' <<<"$campaign")"
[[ "$current_branch" == "$campaign_base" ]] ||
    fail "Current branch '$current_branch' does not match campaign base '$campaign_base'."
jq -e '.schemaVersion == 1 and (.baselineSha | test("^[0-9a-f]{40}$")) and
    .expectedTaskCount == 5 and .lessonPropagation == "off"' <<<"$experiment" >/dev/null ||
    fail "Experiment metadata has an unsupported schema, invalid baselineSha, task count, or lesson mode."
campaign_mode="$(jq -r '.lessonPropagation' <<<"$campaign")"
experiment_mode="$(jq -r '.lessonPropagation' <<<"$experiment")"
[[ "$campaign_mode" == "$experiment_mode" ]] ||
    fail "Experiment and campaign lesson modes do not match."
[[ "$campaign_mode" == "off" ]] ||
    fail "Control campaign must use lessonPropagation=off."

before_file="$campaign_path/.stage20-before.$$"
after_file="$campaign_path/.stage20-after.$$"
cleanup_lists() {
    rm -f "$before_file" "$after_file"
}
trap cleanup_lists EXIT
if [[ -d "$campaign_path/prompts" ]]; then
    find "$campaign_path/prompts" -mindepth 1 -maxdepth 1 -type d -print |
        sort >"$before_file"
else
    : >"$before_file"
fi

echo "Executing stage 15 preparation..."
(
    cd "$repo_root"
    "$preparation_script" "$campaign_metadata_directory"
)

find "$campaign_path/prompts" -mindepth 1 -maxdepth 1 -type d -print |
    sort >"$after_file"
new_artifact_directories=()
while IFS= read -r directory; do
    new_artifact_directories+=("$directory")
done < <(comm -13 "$before_file" "$after_file")
[[ ${#new_artifact_directories[@]} -eq 1 ]] ||
    fail "Expected stage 15 to create one artifact directory; found ${#new_artifact_directories[@]}."
artifact_directory="${new_artifact_directories[0]}"
prompt_files=()
while IFS= read -r prompt_file_path; do
    prompt_files+=("$prompt_file_path")
done < <(find "$artifact_directory" -maxdepth 1 -type f \
    -name '*-invoke-shepherd-task-20-create-issues-from-plan-skill.md' -print)
invocation_files=()
while IFS= read -r invocation_file_path; do
    invocation_files+=("$invocation_file_path")
done < <(find "$artifact_directory" -maxdepth 1 -type f \
    -name '*-invoke-shepherd-task-20-create-issues-from-plan-skill.sh' -print)
[[ ${#prompt_files[@]} -eq 1 && ${#invocation_files[@]} -eq 1 ]] ||
    fail "Stage 15 did not create exactly one prompt and one Bash invocation."
prompt_file="${prompt_files[0]}"
invocation_file="${invocation_files[0]}"

base_remote="$("$scripts_directory/resolve-repository-remote.sh" "$(jq -r '.repository' <<<"$campaign")")"
expected_inputs=(
    '- PLAN_FILE_NAME: add-change-arrival-deadline-feature-ignorance-reduction-plan.md'
    '- QUESTIONS_SECTION: ## Phase 3 — Ignorance reduction: questions to answer before writing code'
    '- IMPLEMENTATION_SECTION: ## Phase 4 — Implementation (five serial issues)'
    '- EXPECTED_TASK_COUNT: 5'
    "- BASE_REMOTE: $base_remote"
    "- DRAFT_VALIDATOR: $scripts_directory/validate-stage20-drafts.sh"
    "- ISSUE_BODY_VERIFIER: $scripts_directory/verify-github-issue-body.sh"
)
for expected_input in "${expected_inputs[@]}"; do
    grep -Fq -- "$expected_input" "$prompt_file" ||
        fail "Generated stage-20 prompt is missing '$expected_input'."
done
if grep -Eq '^- (ISSUE_TYPE|EXAMPLE_ISSUES|SUPPORTING_ARTIFACTS):' "$prompt_file"; then
    fail "Generated stage-20 prompt contains an obsolete caller-supplied input."
fi

echo "Executing the generated stage-20 Copilot invocation..."
set +e
"$invocation_file"
stage20_exit=$?
set -e
if [[ $stage20_exit -ne 0 ]]; then
    detail=""
    result_path="$artifact_directory/stage-20-result.json"
    ledger_path="$artifact_directory/creation-ledger.json"
    if [[ -f "$result_path" ]] && jq -e . "$result_path" >/dev/null 2>&1; then
        detail+=" Stage result: $(jq -r '.status // "missing"' "$result_path")."
        operation_error="$(jq -r '.operationError // empty' "$result_path")"
        [[ -z "$operation_error" ]] || detail+=" Operation error: $operation_error"
    else
        detail+=" The required stage-20-result.json document is missing or invalid."
    fi
    if [[ -f "$ledger_path" ]] && jq -e 'type == "array"' "$ledger_path" >/dev/null 2>&1; then
        partial="$(jq -r 'map("#\(.number) (body_verified=\(.body_verified), linked=\(.linked))") | join(", ")' "$ledger_path")"
        commands="$(jq -r --arg repo "$(jq -r '.repository' <<<"$campaign")" \
            'map("gh issue delete \(.number) --repo \"" + $repo + "\" --yes") | join("; ")' "$ledger_path")"
        [[ -z "$partial" ]] || detail+=" Partial creation ledger: $partial. Delete every ledger issue before rerunning: $commands"
    fi
    fail "Stage-20 invocation failed with exit code $stage20_exit.$detail"
fi

result_path="$artifact_directory/stage-20-result.json"
ledger_path="$artifact_directory/creation-ledger.json"
"$scripts_directory/assert-stage20-result.sh" "$result_path"
jq -e 'type == "array" and length == 5' "$ledger_path" >/dev/null ||
    fail "Creation ledger must contain exactly five entries."

repository="$(jq -r '.repository' <<<"$campaign")"
baseline_sha="$(jq -r '.baselineSha' <<<"$experiment")"
campaign_id="$(jq -r '.campaignId' <<<"$campaign")"
issue_numbers_json='[]'
actual_bodies_json='[]'
while IFS= read -r entry; do
    issue_number="$(jq -r '.number' <<<"$entry")"
    body_file="$(jq -r '.bodyFile // empty' <<<"$entry")"
    jq -e '.body_verified == true and .linked == true and
        (.number | type == "number" and . > 0 and floor == .)' <<<"$entry" >/dev/null ||
        fail "Ledger entry is not valid, body-verified, and linked: $(jq -c . <<<"$entry")"
    [[ -n "$body_file" && "$body_file" != /* ]] ||
        fail "Ledger entry for issue #$issue_number has no valid relative bodyFile."
    persisted_body="$artifact_directory/$body_file"
    [[ -f "$persisted_body" ]] ||
        fail "Persisted draft for issue #$issue_number was not found: $persisted_body"
    diagnostic_path="$artifact_directory/issue-$issue_number-body-verification-failure.json"
    issue_json="$("$scripts_directory/verify-github-issue-body.sh" \
        "$repository" "$issue_number" "$persisted_body" 6 5 "$diagnostic_path")"
    [[ "$(jq -r '.state' <<<"$issue_json")" == "open" ]] ||
        fail "Issue #$issue_number is not open; state is '$(jq -r '.state' <<<"$issue_json")'."
    body="$(jq -r '.body // ""' <<<"$issue_json")"
    normalized_body="$(printf '%s' "$body" | tr '\r\n\t' '   ' | tr -s ' ')"
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
    issue_numbers_json="$(jq --argjson number "$issue_number" '. + [$number]' <<<"$issue_numbers_json")"
    actual_bodies_json="$(jq --argjson number "$issue_number" \
        '. + [{number: $number, state: "OPEN", bodyVerified: true}]' <<<"$actual_bodies_json")"
done < <(jq -c '.[]' "$ledger_path")

handoff_path="$artifact_directory/shepherd-test-experiment-handoff.json"
jq -n \
    --arg baselineSha "$baseline_sha" \
    --arg campaignId "$campaign_id" \
    --argjson issueNumbers "$issue_numbers_json" \
    --argjson actualBodiesVerified "$actual_bodies_json" \
    '{
      schemaVersion: 1,
      mode: "off",
      baselineSha: $baselineSha,
      campaignId: $campaignId,
      issueNumbers: $issueNumbers,
      actualBodiesVerified: $actualBodiesVerified,
      expectedLessonCategory: "Repository-tested Cargo Tracker layering and Open Liberty constraints that reduce integration rework across later facade and UI tasks."
    }' >"$handoff_path"

ordered_issue_list="$(jq -r '.issueNumbers | join(",")' "$handoff_path")"
printf '\nStage 20 completed and actual issue bodies were verified.\n'
echo "Evidence: $handoff_path"
echo "Exact stage-25 command:"
printf '  %q %q %q\n' \
    "$scripts_directory/shepherd-task-25-given-list.sh" \
    "$ordered_issue_list" \
    "$campaign_metadata_directory"
