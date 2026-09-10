#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

initial_directory="$(pwd -P)"
run_started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
current_phase="preflight"
target=""
control_worktree=""
control_directory=""

if [[ -t 1 && -z "${NO_COLOR:-}" && "${TERM:-dumb}" != dumb ]]; then
    cyan=$'\033[36m'
    green=$'\033[32m'
    red=$'\033[31m'
    yellow=$'\033[33m'
    gray=$'\033[90m'
    magenta=$'\033[35m'
    reset=$'\033[0m'
else
    cyan=""
    green=""
    red=""
    yellow=""
    gray=""
    magenta=""
    reset=""
fi

show_domain_fixture_output=0
show_shepherd_task_script_output=0
show_contract_output=0
show_native_tool_output=0
validate_installed_only=0

usage() {
    cat <<'EOF'
Usage:
  run-campaign.sh --repository-url URL [--workareas-dir DIR] [output options]
  run-campaign.sh URL [WORKAREAS_DIR] [output options]

Output options:
  --validate-installed-only
  --show-domain-fixture-output
  --show-shepherd-task-script-output
  --show-contract-output
  --show-native-tool-output
  --show-all-output
  -h, --help
EOF
}

status() {
    local message="$1"
    local color="${2:-}"
    printf '%s[shepherd] %s%s\n' "$color" "$message" "$reset"
}

stage() {
    printf '\n'
    status "Stage $1 - $2" "$cyan"
}

fail() {
    echo "Error: $*" >&2
    return 1
}

channel_enabled() {
    case "$1" in
        DomainFixture) [[ "$show_domain_fixture_output" == 1 ]] ;;
        ShepherdTaskScript) [[ "$show_shepherd_task_script_output" == 1 ]] ;;
        Contract) [[ "$show_contract_output" == 1 ]] ;;
        *) fail "Unknown output channel: $1" ;;
    esac
}

write_captured_output() {
    local output="$1"
    local color="${2:-$gray}"
    [[ -z "$output" ]] || printf '%s%s%s\n' "$color" "$output" "$reset"
}

invoke_checked_script() {
    local channel="$1"
    local path="$2"
    shift 2
    [[ -x "$path" ]] || fail "Required Bash script was not found or is not executable: $path"
    local output="" exit_code
    if channel_enabled "$channel"; then
        set +e
        "$path" "$@"
        exit_code=$?
        set -e
    else
        set +e
        output="$("$path" "$@" 2>&1)"
        exit_code=$?
        set -e
    fi
    if [[ $exit_code -ne 0 ]]; then
        if ! channel_enabled "$channel" && [[ -n "$output" ]]; then
            status "Captured output from failed child script:" "$red" >&2
            write_captured_output "$output" "$red" >&2
        fi
        fail "Bash script failed with exit code $exit_code: $path"
    fi
}

invoke_checked_native() {
    local operation="$1"
    shift
    local output="" exit_code
    if [[ "$show_native_tool_output" == 1 ]]; then
        set +e
        "$@"
        exit_code=$?
        set -e
    else
        set +e
        output="$("$@" 2>&1)"
        exit_code=$?
        set -e
    fi
    if [[ $exit_code -ne 0 ]]; then
        if [[ "$show_native_tool_output" != 1 && -n "$output" ]]; then
            status "Captured output from failed native command:" "$red" >&2
            write_captured_output "$output" "$red" >&2
        fi
        fail "$operation failed with exit code $exit_code."
    fi
    [[ "$show_native_tool_output" == 1 || -z "$output" ]] ||
        printf '%s' "$output" >/dev/null
}

display_invocation() {
    local stage_number="$1"
    local purpose="$2"
    local invocation_type="$3"
    shift 3
    stage "$stage_number" "$purpose"
    local color="$gray"
    [[ "$invocation_type" != Actual ]] || color="$magenta"
    printf '%s[shepherd] %s invocation of %s:%s\n' \
        "$color" "$invocation_type" "$(basename "$1")" "$reset"
    printf '%s  ' "$color"
    printf '%q ' "$@"
    printf '%s\n' "$reset"
}

get_campaign_directory() {
    local worktree="$1"
    local shortname="$2"
    local matches=()
    while IFS= read -r -d '' match; do
        matches+=("$match")
    done < <(
        find "$worktree" -mindepth 1 -maxdepth 1 -type d \
            -name "*-$shortname-remove-before-merge" -print0
    )
    [[ ${#matches[@]} -eq 1 ]] ||
        fail "Expected one '$shortname' campaign directory in '$worktree'; found ${#matches[@]}."
    printf '%s\n' "${matches[0]}"
}

get_campaign_handoff() {
    local campaign_directory="$1"
    local handoffs=()
    while IFS= read -r -d '' handoff; do
        handoffs+=("$handoff")
    done < <(
        find "$campaign_directory" -type f \
            -name shepherd-test-experiment-handoff.json -print0
    )
    [[ ${#handoffs[@]} -eq 1 ]] ||
        fail "Expected one control handoff under '$campaign_directory'; found ${#handoffs[@]}."
    jq -e '.mode == "off" and (.issueNumbers | length == 5) and
        all(.issueNumbers[]; type == "number" and . > 0 and floor == .)' \
        "${handoffs[0]}" >/dev/null ||
        fail "Control handoff must contain exactly five positive issue numbers and use lessonPropagation=off."
    printf '%s\n' "${handoffs[0]}"
}

get_only_completed_run_directory() {
    local campaign_directory="$1"
    local completed=()
    while IFS= read -r -d '' directory; do
        local manifest="$directory/shepherd-task-25-given-list-run.json"
        [[ -f "$manifest" ]] || continue
        if jq -e '.status == "succeeded" and .exitCode == 0 and
            .lessonPropagation == "off"' "$manifest" >/dev/null 2>&1; then
            completed+=("$directory")
        fi
    done < <(find "$campaign_directory" -mindepth 1 -maxdepth 1 -type d \
        -name 'shepherd-tasks-*' -print0)
    [[ ${#completed[@]} -eq 1 ]] ||
        fail "Expected one successful control stage-25 run under '$campaign_directory'; found ${#completed[@]}."
    printf '%s\n' "${completed[0]}"
}

get_or_create_post_mortem() {
    local run_directory="$1"
    local worktree="$2"
    local campaign_directory="$3"
    local campaign_directory_name="$4"
    local issue_list="$5"
    local base_branch="$6"
    local repository="$7"
    local post_mortems=()
    while IFS= read -r -d '' post_mortem; do
        post_mortems+=("$post_mortem")
    done < <(
        find "$run_directory" -maxdepth 1 -type f -name '*-post-mortem.md' -print0
    )
    if [[ ${#post_mortems[@]} -eq 1 ]]; then
        [[ -s "${post_mortems[0]}" ]] || fail "Post-mortem is empty: ${post_mortems[0]}"
        printf '%s\n' "${post_mortems[0]}"
        return
    fi
    [[ ${#post_mortems[@]} -eq 0 ]] ||
        fail "Expected at most one post-mortem in '$run_directory'; found ${#post_mortems[@]}."

    local campaign_id post_mortem_path prompt output="" exit_code
    campaign_id="$(jq -r '.campaignId' "$campaign_directory/shepherd-campaign.json")"
    post_mortem_path="$run_directory/$(date +%Y%m%d-%H%M%S)-post-mortem.md"
    prompt="Invoke skill \`shepherd-task-50-create-post-mortem\` with these inputs:
- SHEPHERD_LOG_DIR: $run_directory
- SCRIPT_EXIT_CODE: 0
- TASK_ISSUES: $issue_list
- BASE_BRANCH: $base_branch
- REPO: $repository
- CAMPAIGN_ID: $campaign_id
- CAMPAIGN_METADATA_DIRECTORY: $campaign_directory_name
- LESSON_PROPAGATION: off

Write the report to:
- OUTPUT_FILE: $post_mortem_path"
    status "No campaign post-mortem was found; regenerating it at: $post_mortem_path" "$yellow" >&2
    cd "$worktree"
    set +e
    if [[ "$show_shepherd_task_script_output" == 1 ]]; then
        copilot --yolo <<<"$prompt"
        exit_code=$?
    else
        output="$(copilot --yolo <<<"$prompt" 2>&1)"
        exit_code=$?
    fi
    set -e
    if [[ $exit_code -ne 0 ]]; then
        [[ -z "$output" ]] || write_captured_output "$output" "$red" >&2
        fail "Post-mortem recovery failed with exit code $exit_code for '$run_directory'."
    fi
    [[ -s "$post_mortem_path" ]] ||
        fail "Post-mortem recovery did not create a nonempty report: $post_mortem_path"
    printf '%s\n' "$post_mortem_path"
}

on_exit() {
    cd "$initial_directory" 2>/dev/null || true
}
trap on_exit EXIT

on_error() {
    local exit_code=$?
    trap - ERR
    printf '\n%s=== RUN FAILED DURING: %s ===%s\n' "$red" "$current_phase" "$reset" >&2
    status "No automated cleanup was performed. Preserve and inspect any paths that exist:" "$yellow" >&2
    local path
    for path in "$target" "$control_worktree" "$control_directory"; do
        [[ -n "$path" && -e "$path" ]] &&
            printf '%s  %s%s\n' "$yellow" "$path" "$reset" >&2
    done
    exit "$exit_code"
}
trap on_error ERR

repository_url=""
workareas_dir="${HOME}/workareas"
positional=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --validate-installed-only) validate_installed_only=1; shift ;;
        --repository-url) [[ $# -ge 2 ]] || fail "--repository-url requires a value"; repository_url="$2"; shift 2 ;;
        --workareas-dir) [[ $# -ge 2 ]] || fail "--workareas-dir requires a value"; workareas_dir="$2"; shift 2 ;;
        --show-domain-fixture-output) show_domain_fixture_output=1; shift ;;
        --show-shepherd-task-script-output) show_shepherd_task_script_output=1; shift ;;
        --show-contract-output) show_contract_output=1; shift ;;
        --show-native-tool-output) show_native_tool_output=1; shift ;;
        --show-all-output)
            show_domain_fixture_output=1
            show_shepherd_task_script_output=1
            show_contract_output=1
            show_native_tool_output=1
            shift
            ;;
        -h|--help) usage; exit 0 ;;
        --*) fail "Unknown option: $1" ;;
        *) positional+=("$1"); shift ;;
    esac
done
if [[ -z "$repository_url" && ${#positional[@]} -gt 0 ]]; then
    repository_url="${positional[0]}"
fi
if [[ ${#positional[@]} -gt 1 ]]; then
    workareas_dir="${positional[1]}"
fi
[[ -n "$repository_url" ]] || { usage >&2; fail "Repository URL is required."; }
[[ ${#positional[@]} -le 2 ]] || fail "Too many positional arguments."

current_phase="validating repository URL"
repository_url="${repository_url%/}"
repository_url="${repository_url%.git}"
repository_url_pattern='^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$'
[[ "$repository_url" =~ $repository_url_pattern ]] ||
    fail "RepositoryUrl must be a fully qualified HTTPS GitHub repository URL."
repository_owner="${BASH_REMATCH[1]}"
repository_name="${BASH_REMATCH[2]}"
repo="$repository_owner/$repository_name"
canonical_repository_url="https://github.com/$repo"

mkdir -p "$workareas_dir"
workareas_dir="$(cd "$workareas_dir" && pwd -P)"
target="$workareas_dir/$repository_name-shepherd-target"
control_worktree="$workareas_dir/$repository_name-shepherd-control"
baseline_branch="experiment/shepherd-shared-baseline"
source_branch="20260902-2104Z-commit-e7b651f-liberty"
control_branch="experiment/shepherd-control"
expected_baseline_sha="9b9f311b2a3a2854bdac947593950d9edb6bca7d"

copilot_home="${COPILOT_HOME:-$HOME/.copilot}"
shepherd_plugin="$copilot_home/plugins/shepherd-task"
fixture_root="$shepherd_plugin/test/cargotracker-add-change-arrival-deadline-feature"
stage00_script="$shepherd_plugin/scripts/shepherd-task-00-init-campaign.sh"
stage15_script="$shepherd_plugin/scripts/shepherd-task-15-prepare-create-issues.sh"
stage25_script="$shepherd_plugin/scripts/shepherd-task-25-given-list.sh"

printf '%s=== shepherd-task Cargo Tracker run ===%s\n' "$cyan" "$reset"
echo "Repository:          $repo"
echo "Workareas directory: $workareas_dir"
echo "Fixture root:        $fixture_root"
echo "Primary checkout:    $target"
echo "Control worktree:    $control_worktree"
echo "Source branch:       $source_branch"
echo "Baseline branch:     $baseline_branch"
echo "Control branch:      $control_branch"
printf '\n'
status "Canonical lifecycle: Stage 00 -> Stage 10 -> research gate -> Stage 15 -> Stage 20 -> Stage 25 -> Stage 30 -> Stage 40 -> Stage 50." "$gray"
status "Stage 10 and the human/Copilot research gate are not run live." "$gray"
status "This deterministic control fixture writes an already-resolved plan in their place." "$gray"
status "Repository setup, offline contracts, and final verification are experiment operations, not shepherd-task stages." "$gray"

current_phase="checking required commands"
status "Experiment setup: validating prerequisites."
for command_name in git gh copilot jq find base64 gzip; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done
command -v sha256sum >/dev/null 2>&1 ||
    command -v shasum >/dev/null 2>&1 ||
    fail "Required SHA-256 command was not found on PATH: sha256sum or shasum"
invoke_checked_native "GitHub CLI authentication check" gh auth status

current_phase="checking installed shepherd-task"
[[ -x "$fixture_root/00-prepare-test-baseline.sh" ]] ||
    fail "Installed Cargo Tracker fixture was not found at '$fixture_root'. Install shepherd-task before running this driver."
skill_list="$("$fixture_root/get-copilot-skill-list.sh")" ||
    fail "Unable to list installed Copilot skills: $skill_list"
for skill_name in \
    shepherd-task-20-create-issues-from-plan \
    shepherd-task-30-from-assignment-to-ready \
    shepherd-task-40-from-ready-to-merged-to-base \
    shepherd-task-50-create-post-mortem; do
    [[ "$skill_list" == *"$skill_name"* ]] ||
        fail "Required Copilot skill is not listed after installation: $skill_name"
done

current_phase="running offline contracts"
status "Experiment setup: running offline contracts."
invoke_checked_script Contract "$shepherd_plugin/test/macos-bash-compatibility-contract.sh"
invoke_checked_script Contract "$shepherd_plugin/test/lesson-propagation-default-contract.sh"
for contract in \
    03-resolve-repository-remote.sh \
    05-stage20-artifact-contract.sh \
    06-stage40-review-contract.sh \
    07-driver-encoding-contract.sh \
    08-psncpps-contract.sh \
    09-skill-powershell-contract.sh \
    10-cargotracker-fixture-contract.sh \
    11-stage15-plan-discovery-contract.sh \
    12-session-outcome-contract.sh; do
    invoke_checked_script Contract "$fixture_root/$contract"
done
if [[ "$validate_installed_only" == 1 ]]; then
    status "Installed Cargo Tracker driver validation completed without paid or mutating operations." "$green"
    exit 0
fi

for path in "$target" "$control_worktree"; do
    [[ ! -e "$path" ]] ||
        fail "Control-run path already exists. Preserve or remove it before starting: $path"
done

current_phase="checking disposable repository"
status "Experiment setup: checking the disposable repository."
invoke_checked_native "Disposable repository check" gh repo view "$repo" --json nameWithOwner

current_phase="cloning primary checkout"
status "Experiment setup: cloning the primary checkout."
invoke_checked_native "Clone of '$repo'" gh repo clone "$repo" "$target"
git -C "$target" rev-parse --verify HEAD >/dev/null 2>&1 ||
    fail "The Cargo Tracker fork is empty; it must contain the prepared baseline branch."
[[ -z "$(git -C "$target" status --porcelain)" ]] ||
    fail "The primary target checkout is not clean."
cd "$target"
resolved_remote="$("$shepherd_plugin/scripts/resolve-repository-remote.sh" "$repo")"
[[ -n "$resolved_remote" ]] || fail "Could not resolve the unique Git remote for '$repo'."
for branch in "$baseline_branch" "$control_branch"; do
    if git -C "$target" ls-remote --exit-code --heads \
        "$resolved_remote" "$branch" >/dev/null 2>&1; then
        branch_exit=0
    else
        branch_exit=$?
    fi
    if [[ $branch_exit -eq 0 ]]; then
        fail "Remote control-run branch already exists: $branch"
    elif [[ $branch_exit -ne 2 ]]; then
        fail "Could not determine whether remote branch '$branch' exists."
    fi
done

current_phase="publishing immutable baseline"
status "Experiment setup: publishing the immutable baseline."
invoke_checked_script DomainFixture "$fixture_root/00-prepare-test-baseline.sh" \
    "$repo" "$baseline_branch" "$source_branch" "$expected_baseline_sha"
baseline_sha="$(git -C "$target" rev-parse HEAD)"
[[ "$baseline_sha" == "$expected_baseline_sha" ]] ||
    fail "Published baseline '$baseline_sha' does not match '$expected_baseline_sha'."

current_phase="creating control worktree"
status "Experiment setup: creating the control worktree."
invoke_checked_native "Control worktree creation" git -C "$target" worktree add --detach \
    "$control_worktree" "$baseline_sha"
control_start="$(git -C "$control_worktree" rev-parse HEAD)"
[[ "$control_start" == "$baseline_sha" ]] ||
    fail "Control worktree does not start at the immutable baseline SHA."

current_phase="initializing control campaign"
cd "$control_worktree"
display_invocation 00 "Initialize campaign" Planned "$stage00_script" \
    '<CAMPAIGN_ISSUE_NUMBER>' arrival-deadline-control "$control_branch" "$repo"
invoke_checked_script DomainFixture "$fixture_root/01-prepare-base-branch.sh" \
    "$repo" "$control_branch" arrival-deadline-control "$baseline_sha"
control_directory="$(get_campaign_directory "$control_worktree" arrival-deadline-control)"
control_directory_name="$(basename "$control_directory")"
campaign_manifest_path="$control_directory/shepherd-campaign.json"
jq -e \
    --arg branch "$control_branch" \
    --arg repo "$repo" \
    --arg directory "$control_directory_name" \
    '.campaignIssueNumber > 0 and
     .campaignShortname == "arrival-deadline-control" and
     .baseBranch == $branch and .repository == $repo and
     .campaignMetadataDirectory == $directory' "$campaign_manifest_path" >/dev/null ||
    fail "Campaign manifest does not match the control invocation: $campaign_manifest_path"
campaign_issue_number="$(jq -r '.campaignIssueNumber' "$campaign_manifest_path")"
status "Creating campaign issue $campaign_issue_number in $canonical_repository_url"
display_invocation 00 "Initialize campaign" Actual "$stage00_script" \
    "$campaign_issue_number" arrival-deadline-control "$control_branch" "$repo"
stage 10 "Create ignorance-reduction plan"
status "Normal usage invokes skill shepherd-task-10-create-ignorance-reduction-plan." "$gray"
status "Human and Copilot research then fills every implementation-gating Resolution block." "$gray"
status "This control fixture substituted an already-resolved plan for Stage 10 and the research gate." "$gray"
control_init_parent="$(git -C "$control_worktree" rev-parse 'HEAD^')"
[[ "$control_init_parent" == "$baseline_sha" ]] ||
    fail "Control campaign initialization does not descend directly from the baseline."

current_phase="creating control issues"
display_invocation 15 "Prepare Stage 20" Planned "$stage15_script" "$control_directory_name"
stage 20 "Create issues from the resolved plan"
status "Stage 15 will generate a launcher that invokes skill shepherd-task-20-create-issues-from-plan." "$gray"
display_invocation 25 "Dispatch ordered issue list after Stage 20" Planned \
    "$stage25_script" '<TASK_ISSUE_LIST>' "$control_directory_name"
invoke_checked_script DomainFixture "$fixture_root/02-create-issues.sh" "$control_directory_name"
display_invocation 15 "Prepare Stage 20" Actual "$stage15_script" "$control_directory_name"
status "Stage 20 completed through the generated launcher, and the fixture verified all five issue bodies."
control_handoff="$(get_campaign_handoff "$control_directory")"
issue_list="$(jq -r '.issueNumbers | join(",")' "$control_handoff")"

current_phase="running control stage 25"
display_invocation 25 "Dispatch ordered issue list" Actual \
    "$stage25_script" "$issue_list" "$control_directory_name"
status "Stage 25 will process issues $issue_list serially."
status "For each issue, Stage 30 moves assignment to the Ready-for-review boundary, then Stage 40 reviews and merges it." "$gray"
status "Stage 50 creates the campaign post-mortem after success or failure." "$gray"
status "Run evidence will be written beneath: $control_directory/shepherd-tasks-<CAMPAIGN_ID>-<TIMESTAMP>" "$gray"
if [[ "$show_shepherd_task_script_output" != 1 ]]; then
    status "Detailed per-issue output is hidden; use --show-shepherd-task-script-output to display it." "$yellow"
fi
invoke_checked_script ShepherdTaskScript "$stage25_script" "$issue_list" "$control_directory_name"
status "Stage 25 completed successfully for all five issues." "$green"

current_phase="updating and verifying control campaign"
status "Experiment verification: synchronizing and checking the completed campaign."
cd "$control_worktree"
invoke_checked_native "Control fast-forward pull" git pull --ff-only
invoke_checked_script DomainFixture "$fixture_root/04-verify-control-campaign.sh" "$control_directory_name"

current_phase="collecting final evidence"
status "Experiment verification: collecting final evidence."
control_run="$(get_only_completed_run_directory "$control_directory")"
control_post_mortem="$(get_or_create_post_mortem "$control_run" "$control_worktree" \
    "$control_directory" "$control_directory_name" "$issue_list" "$control_branch" "$repo")"
control_lessons="$control_directory/campaign-lessons.md"
summary_path="$workareas_dir/$repository_name-shepherd-control-$(date -u +%Y%m%d-%H%M).json"
jq -n \
    --arg repository "$repo" \
    --arg repositoryUrl "$canonical_repository_url" \
    --arg startedAt "$run_started_at" \
    --arg completedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg sourceBranch "$source_branch" \
    --arg baselineBranch "$baseline_branch" \
    --arg baselineSha "$baseline_sha" \
    --arg target "$target" \
    --arg branch "$control_branch" \
    --arg worktree "$control_worktree" \
    --arg campaignDirectory "$control_directory" \
    --argjson issues "$(jq '.issueNumbers' "$control_handoff")" \
    --arg handoff "$control_handoff" \
    --arg runDirectory "$control_run" \
    --arg postMortem "$control_post_mortem" \
    --arg lessons "$control_lessons" \
    '{
      schemaVersion: 1,
      repository: $repository,
      repositoryUrl: $repositoryUrl,
      startedAt: $startedAt,
      completedAt: $completedAt,
      lessonPropagation: "off",
      sourceBranch: $sourceBranch,
      baselineBranch: $baselineBranch,
      baselineSha: $baselineSha,
      target: $target,
      branch: $branch,
      worktree: $worktree,
      campaignDirectory: $campaignDirectory,
      issues: $issues,
      handoff: $handoff,
      runDirectory: $runDirectory,
      postMortem: $postMortem,
      lessons: $lessons
    }' >"$summary_path"

printf '\n%s=== CAMPAIGN LESSONS ===%s\n' "$green" "$reset"
cat "$control_lessons"
printf '\n%s=== RUN COMPLETE ===%s\n' "$green" "$reset"
echo "Repository:               $canonical_repository_url"
echo "Baseline SHA:             $baseline_sha"
echo "Issues:                   $issue_list"
echo "Run directory:            $control_run"
echo "Post-mortem:              $control_post_mortem"
echo "Machine-readable summary: $summary_path"
echo "All evidence and worktrees were preserved. No cleanup was performed."
