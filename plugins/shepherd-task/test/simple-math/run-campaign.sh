#!/usr/bin/env bash
# shepherd-task-version: 1.0.3

set -euo pipefail

SHOW_DOMAIN_FIXTURE_OUTPUT=0
SHOW_SHEPHERD_TASK_SCRIPT_OUTPUT=0
SHOW_CONTRACT_OUTPUT=0
SHOW_NATIVE_TOOL_OUTPUT=0
CURRENT_PHASE=preflight
TARGET=
CONTROL_WORKTREE=
CONTROL_DIRECTORY=
CAPTURE_DIRECTORY=

if [[ -t 1 && "${NO_COLOR:-}" == "" ]]; then
    CYAN=$'\033[36m'
    GREEN=$'\033[32m'
    RED=$'\033[31m'
    YELLOW=$'\033[33m'
    GRAY=$'\033[90m'
    MAGENTA=$'\033[35m'
    RESET=$'\033[0m'
else
    CYAN= GREEN= RED= YELLOW= GRAY= MAGENTA= RESET=
fi

status() {
    local message="$1"
    local color="${2:-}"
    printf '%s[shepherd] %s%s\n' "$color" "$message" "$RESET"
}

stage() {
    printf '\n'
    status "Stage $1 - $2" "$CYAN"
}

warning() {
    status "$1" "$YELLOW" >&2
}

fail() {
    echo "Error: $*" >&2
    return 1
}

channel_enabled() {
    case "$1" in
        domain) [[ "$SHOW_DOMAIN_FIXTURE_OUTPUT" == 1 ]] ;;
        shepherd) [[ "$SHOW_SHEPHERD_TASK_SCRIPT_OUTPUT" == 1 ]] ;;
        contract) [[ "$SHOW_CONTRACT_OUTPUT" == 1 ]] ;;
        *) fail "Unknown output channel: $1" ;;
    esac
}

ensure_capture_directory() {
    [[ -n "$CAPTURE_DIRECTORY" ]] || {
        local script_dir
        script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        CAPTURE_DIRECTORY="$script_dir/.driver-captures-$$"
    }
    mkdir -p "$CAPTURE_DIRECTORY"
}

invoke_checked_script() {
    local path="$1"
    local channel="$2"
    shift 2
    [[ -f "$path" ]] || fail "Required Bash script was not found: $path"
    if channel_enabled "$channel"; then
        "$path" "$@"
        return
    fi

    ensure_capture_directory
    local capture="$CAPTURE_DIRECTORY/child-$RANDOM.log"
    local exit_code
    if "$path" "$@" >"$capture" 2>&1; then
        exit_code=0
    else
        exit_code=$?
    fi
    if [[ $exit_code -ne 0 ]]; then
        warning 'Captured output from failed child script:'
        while IFS= read -r line || [[ -n "$line" ]]; do
            printf '%s%s%s\n' "$RED" "$line" "$RESET" >&2
        done <"$capture"
        rm -f "$capture"
        return "$exit_code"
    fi
    rm -f "$capture"
}

invoke_checked_native() {
    local operation="$1"
    shift
    if [[ "$SHOW_NATIVE_TOOL_OUTPUT" == 1 ]]; then
        "$@"
        return
    fi

    ensure_capture_directory
    local capture="$CAPTURE_DIRECTORY/native-$RANDOM.log"
    local exit_code
    if "$@" >"$capture" 2>&1; then
        exit_code=0
    else
        exit_code=$?
    fi
    if [[ $exit_code -ne 0 ]]; then
        warning 'Captured output from failed native command:'
        while IFS= read -r line || [[ -n "$line" ]]; do
            printf '%s%s%s\n' "$RED" "$line" "$RESET" >&2
        done <"$capture"
        rm -f "$capture"
        echo "$operation failed with exit code $exit_code." >&2
        return "$exit_code"
    fi
    rm -f "$capture"
}

display_literal() {
    local value="$1"
    if [[ "$value" =~ ^\<[A-Z0-9_]+\>$ ]]; then
        printf '%s' "$value"
    else
        printf '%q' "$value"
    fi
}

display_invocation() {
    local stage_number="$1"
    local purpose="$2"
    local invocation_type="$3"
    local script_path="$4"
    shift 4
    stage "$stage_number" "$purpose"
    local color="$MAGENTA"
    [[ "$invocation_type" == Planned ]] && color="$GRAY"
    status "$invocation_type invocation of $(basename "$script_path"):" "$color"
    printf '%s  %s' "$color" "$(display_literal "$script_path")"
    local argument
    for argument in "$@"; do
        printf ' %s' "$(display_literal "$argument")"
    done
    printf '%s\n' "$RESET"
}

usage() {
    cat <<'EOF'
Usage: run-campaign.sh REPOSITORY_URL [WORKAREAS_DIR] [OPTIONS]

Options:
  --validate-installed-only
  --show-domain-fixture-output
  --show-shepherd-task-script-output
  --show-contract-output
  --show-native-tool-output
  --show-all-output
  -h, --help
EOF
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
    printf '%s' "${matches[0]}"
}

get_campaign_handoff() {
    local campaign_directory="$1"
    local handoffs=()
    while IFS= read -r -d '' handoff; do
        handoffs+=("$handoff")
    done < <(
        find "$campaign_directory" -type f -name shepherd-test-experiment-handoff.json -print0
    )
    [[ ${#handoffs[@]} -eq 1 ]] ||
        fail "Expected one control handoff under '$campaign_directory'; found ${#handoffs[@]}."
    jq -e '.mode == "off" and (.issueNumbers | length == 2) and
        all(.issueNumbers[]; type == "number" and . > 0 and floor == .)' \
        "${handoffs[0]}" >/dev/null ||
        fail "Control handoff must use lessonPropagation=off and contain exactly two positive issue numbers: ${handoffs[0]}"
    printf '%s' "${handoffs[0]}"
}

get_completed_run_directory() {
    local campaign_directory="$1"
    local completed=()
    while IFS= read -r -d '' directory; do
        local manifest="$directory/shepherd-task-25-given-list-run.json"
        [[ -f "$manifest" ]] || continue
        if jq -e '.status == "succeeded" and .exitCode == 0 and .lessonPropagation == "off"' \
            "$manifest" >/dev/null 2>&1; then
            completed+=("$directory")
        fi
    done < <(find "$campaign_directory" -mindepth 1 -maxdepth 1 -type d -name 'shepherd-tasks-*' -print0)
    [[ ${#completed[@]} -eq 1 ]] ||
        fail "Expected one successful control stage-25 run under '$campaign_directory'; found ${#completed[@]}."
    printf '%s' "${completed[0]}"
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
        find "$run_directory" -mindepth 1 -maxdepth 1 -type f -name '*-post-mortem.md' -print0
    )
    if [[ ${#post_mortems[@]} -eq 1 ]]; then
        [[ -s "${post_mortems[0]}" ]] || fail "Post-mortem is empty: ${post_mortems[0]}"
        printf '%s' "${post_mortems[0]}"
        return
    fi
    [[ ${#post_mortems[@]} -eq 0 ]] ||
        fail "Expected at most one post-mortem in '$run_directory'; found ${#post_mortems[@]}."

    local campaign_id post_mortem_path prompt capture exit_code
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
    warning "No campaign post-mortem was found; regenerating it at: $post_mortem_path"
    if [[ "$SHOW_SHEPHERD_TASK_SCRIPT_OUTPUT" == 1 ]]; then
        (cd "$worktree" && printf '%s' "$prompt" | copilot --yolo)
    else
        ensure_capture_directory
        capture="$CAPTURE_DIRECTORY/post-mortem-$RANDOM.log"
        if (cd "$worktree" && printf '%s' "$prompt" | copilot --yolo) >"$capture" 2>&1; then
            exit_code=0
        else
            exit_code=$?
        fi
        if [[ $exit_code -ne 0 ]]; then
            warning 'Captured output from failed post-mortem recovery:'
            while IFS= read -r line || [[ -n "$line" ]]; do
                printf '%s%s%s\n' "$RED" "$line" "$RESET" >&2
            done <"$capture"
            rm -f "$capture"
            fail "Post-mortem recovery failed with exit code $exit_code for '$run_directory'."
        fi
        rm -f "$capture"
    fi
    [[ -s "$post_mortem_path" ]] ||
        fail "Post-mortem recovery did not create a nonempty report: $post_mortem_path"
    printf '%s' "$post_mortem_path"
}

main() {
    [[ $# -gt 0 ]] || { usage >&2; return 2; }
    local repository_url=
    local workareas_dir=
    local validate_installed_only=0
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --validate-installed-only) validate_installed_only=1 ;;
            --show-domain-fixture-output) SHOW_DOMAIN_FIXTURE_OUTPUT=1 ;;
            --show-shepherd-task-script-output) SHOW_SHEPHERD_TASK_SCRIPT_OUTPUT=1 ;;
            --show-contract-output) SHOW_CONTRACT_OUTPUT=1 ;;
            --show-native-tool-output) SHOW_NATIVE_TOOL_OUTPUT=1 ;;
            --show-all-output)
                SHOW_DOMAIN_FIXTURE_OUTPUT=1
                SHOW_SHEPHERD_TASK_SCRIPT_OUTPUT=1
                SHOW_CONTRACT_OUTPUT=1
                SHOW_NATIVE_TOOL_OUTPUT=1
                ;;
            -h|--help) usage; return 0 ;;
            --*) fail "Unknown option: $1"; return 2 ;;
            *)
                if [[ -z "$repository_url" ]]; then
                    repository_url="$1"
                elif [[ -z "$workareas_dir" ]]; then
                    workareas_dir="$1"
                else
                    fail "Unexpected argument: $1"
                    return 2
                fi
                ;;
        esac
        shift
    done
    [[ -n "$repository_url" ]] || fail "REPOSITORY_URL is required."
    workareas_dir="${workareas_dir:-$HOME/workareas}"

    CURRENT_PHASE='validating repository URL'
    repository_url="${repository_url%/}"
    repository_url="${repository_url%.git}"
    local repository_url_pattern='^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$'
    if [[ "$repository_url" =~ $repository_url_pattern ]]; then
        local repository_owner="${BASH_REMATCH[1]}"
        local repository_name="${BASH_REMATCH[2]}"
    else
        fail "REPOSITORY_URL must be a fully qualified HTTPS GitHub repository URL."
    fi
    local repo="$repository_owner/$repository_name"
    local canonical_url="https://github.com/$repo"
    mkdir -p "$workareas_dir"
    workareas_dir="$(cd "$workareas_dir" && pwd -P)"
    TARGET="$workareas_dir/$repository_name-shepherd-target"
    CONTROL_WORKTREE="$workareas_dir/$repository_name-shepherd-control"
    local baseline_branch='experiment/shepherd-shared-baseline'
    local control_branch='experiment/shepherd-control'
    local copilot_home="${COPILOT_HOME:-$HOME/.copilot}"
    local shepherd_plugin="$copilot_home/plugins/shepherd-task"
    local fixture_root="$shepherd_plugin/test/simple-math"
    local stage00_script="$shepherd_plugin/scripts/shepherd-task-00-init-campaign.sh"
    local stage15_script="$shepherd_plugin/scripts/shepherd-task-15-prepare-create-issues.sh"
    local stage25_script="$shepherd_plugin/scripts/shepherd-task-25-given-list.sh"
    CAPTURE_DIRECTORY="$fixture_root/.driver-captures-$$"

    printf '%s=== shepherd-task simple-math run ===%s\n' "$CYAN" "$RESET"
    printf 'Repository:          %s\n' "$repo"
    printf 'Workareas directory: %s\n' "$workareas_dir"
    printf 'Fixture root:        %s\n' "$fixture_root"
    printf 'Primary checkout:    %s\n' "$TARGET"
    printf 'Control worktree:    %s\n' "$CONTROL_WORKTREE"
    printf 'Baseline branch:     %s\n' "$baseline_branch"
    printf 'Control branch:      %s\n\n' "$control_branch"
    status 'Canonical lifecycle: Stage 00 -> Stage 10 -> research gate -> Stage 15 -> Stage 20 -> Stage 25 -> Stage 30 -> Stage 40 -> Stage 50.' "$GRAY"
    status 'Stage 10 and the human/Copilot research gate are not run live.' "$GRAY"
    status 'This deterministic simple-math control fixture writes an already-resolved plan in their place.' "$GRAY"
    status 'Repository setup, offline contracts, and final verification are experiment operations, not shepherd-task stages.' "$GRAY"

    CURRENT_PHASE='checking required commands'
    status 'Experiment setup: validating prerequisites.'
    for command in git gh copilot jq find; do
        command -v "$command" >/dev/null 2>&1 ||
            fail "Required command was not found on PATH: $command"
    done
    invoke_checked_native 'GitHub CLI authentication check' gh auth status

    CURRENT_PHASE='checking installed shepherd-task'
    [[ -x "$fixture_root/00-prepare-test-baseline.sh" ]] ||
        fail "Installed simple-math Bash fixture was not found at '$fixture_root'. Install shepherd-task before running this driver."
    local skill_list
    skill_list="$("$fixture_root/get-copilot-skill-list.sh")" ||
        fail "Unable to list installed Copilot skills: $skill_list"
    for skill_name in shepherd-task-20-create-issues-from-plan \
        shepherd-task-30-from-assignment-to-ready \
        shepherd-task-40-from-ready-to-merged-to-base \
        shepherd-task-50-create-post-mortem; do
        [[ "$skill_list" == *"$skill_name"* ]] ||
            fail "Required Copilot skill is not listed after installation: $skill_name"
    done

    CURRENT_PHASE='running offline contracts'
    status 'Experiment setup: running offline contracts.'
    local contract_root="$fixture_root/.contract-work/driver-$$"
    mkdir -p "$contract_root"
    export TMPDIR="$contract_root"
    invoke_checked_script "$shepherd_plugin/test/macos-bash-compatibility-contract.sh" contract
    invoke_checked_script "$shepherd_plugin/test/lesson-propagation-default-contract.sh" contract
    for contract in 03-resolve-repository-remote.sh 05-stage20-artifact-contract.sh \
        06-stage40-review-contract.sh 07-driver-encoding-contract.sh \
        08-psncpps-contract.sh 09-skill-powershell-contract.sh \
        10-simple-math-fixture-contract.sh \
        11-stage15-installed-path-contract.sh; do
        invoke_checked_script "$fixture_root/$contract" contract
    done
    rm -rf "$contract_root"
    rmdir "$fixture_root/.contract-work" 2>/dev/null || true
    unset TMPDIR
    if [[ "$validate_installed_only" == 1 ]]; then
        status 'Installed simple-math driver validation completed without paid or mutating operations.' "$GREEN"
        return 0
    fi

    [[ ! -e "$TARGET" ]] || fail "Control-run path already exists. Preserve or remove it before starting: $TARGET"
    [[ ! -e "$CONTROL_WORKTREE" ]] || fail "Control-run path already exists. Preserve or remove it before starting: $CONTROL_WORKTREE"

    CURRENT_PHASE='checking disposable repository'
    status 'Experiment setup: checking the disposable repository.'
    invoke_checked_native 'Disposable repository capability check' \
        gh repo view "$repo" --json nameWithOwner,defaultBranchRef

    CURRENT_PHASE='cloning primary checkout'
    status 'Experiment setup: cloning the primary checkout.'
    invoke_checked_native "Clone of '$repo'" gh repo clone "$repo" "$TARGET"
    if ! git -C "$TARGET" rev-parse --verify HEAD >/dev/null 2>&1; then
        status 'Experiment setup: initializing the empty disposable repository.'
        printf '# %s\n' "$repository_name" >"$TARGET/README.md"
        invoke_checked_native 'git add for initial README' git -C "$TARGET" add -- README.md
        invoke_checked_native 'Initial README commit' git -C "$TARGET" commit -m 'Initial commit'
        invoke_checked_native 'Initial README push' git -C "$TARGET" push -u origin HEAD
    fi
    [[ -z "$(git -C "$TARGET" status --porcelain)" ]] || fail "The primary target checkout is not clean."
    local resolved_remote
    resolved_remote="$(cd "$TARGET" && "$shepherd_plugin/scripts/resolve-repository-remote.sh" "$repo")"
    [[ -n "$resolved_remote" ]] || fail "Could not resolve the unique Git remote for '$repo'."
    for branch in "$baseline_branch" "$control_branch"; do
        local branch_status
        if git -C "$TARGET" ls-remote --exit-code --heads "$resolved_remote" "$branch" >/dev/null 2>&1; then
            branch_status=0
        else
            branch_status=$?
        fi
        [[ $branch_status -eq 2 ]] ||
            if [[ $branch_status -eq 0 ]]; then
                fail "Remote control-run branch already exists: $branch"
            else
                fail "Could not determine whether remote branch '$branch' exists."
            fi
    done

    CURRENT_PHASE='creating immutable baseline'
    status 'Experiment setup: creating the immutable simple-math baseline.'
    (cd "$TARGET" && invoke_checked_script "$fixture_root/00-prepare-test-baseline.sh" domain "$repo" "$baseline_branch")
    local baseline_sha
    baseline_sha="$(git -C "$TARGET" rev-parse HEAD)"
    [[ "$baseline_sha" =~ ^[0-9a-f]{40}$ ]] || fail "Invalid baseline SHA: $baseline_sha"

    CURRENT_PHASE='creating control worktree'
    status 'Experiment setup: creating the control worktree.'
    invoke_checked_native 'Control worktree creation' \
        git -C "$TARGET" worktree add --detach "$CONTROL_WORKTREE" "$baseline_sha"
    [[ "$(git -C "$CONTROL_WORKTREE" rev-parse HEAD)" == "$baseline_sha" ]] ||
        fail "Control worktree does not start at the immutable baseline SHA."

    CURRENT_PHASE='initializing control campaign'
    display_invocation 00 'Initialize campaign' Planned "$stage00_script" \
        '<CAMPAIGN_ISSUE_NUMBER>' math-control "$control_branch" "$repo"
    (cd "$CONTROL_WORKTREE" && invoke_checked_script "$fixture_root/01-prepare-base-branch.sh" domain \
        "$repo" "$control_branch" math-control "$baseline_sha")
    CONTROL_DIRECTORY="$(get_campaign_directory "$CONTROL_WORKTREE" math-control)"
    local control_directory_name
    control_directory_name="$(basename "$CONTROL_DIRECTORY")"
    local campaign_manifest="$CONTROL_DIRECTORY/shepherd-campaign.json"
    jq -e --arg branch "$control_branch" --arg repo "$repo" --arg directory "$control_directory_name" '
        (.campaignIssueNumber | type == "number" and . > 0) and
        .campaignShortname == "math-control" and .baseBranch == $branch and
        .repository == $repo and .campaignMetadataDirectory == $directory
    ' "$campaign_manifest" >/dev/null || fail "Campaign manifest does not match the control invocation: $campaign_manifest"
    local campaign_issue_number
    campaign_issue_number="$(jq -r '.campaignIssueNumber' "$campaign_manifest")"
    status "Creating campaign issue $campaign_issue_number in $canonical_url"
    display_invocation 00 'Initialize campaign' Actual "$stage00_script" \
        "$campaign_issue_number" math-control "$control_branch" "$repo"
    stage 10 'Create ignorance-reduction plan'
    status 'Normal usage invokes skill shepherd-task-10-create-ignorance-reduction-plan.' "$GRAY"
    status 'Human and Copilot research then fills every implementation-gating Resolution block.' "$GRAY"
    status 'This simple-math fixture substituted an already-resolved math-tool-ignorance-reduction-plan.md for Stage 10 and the research gate.' "$GRAY"
    [[ "$(git -C "$CONTROL_WORKTREE" rev-parse 'HEAD^')" == "$baseline_sha" ]] ||
        fail "Control campaign initialization does not descend directly from the baseline."

    CURRENT_PHASE='creating control issues'
    display_invocation 15 'Prepare Stage 20' Planned "$stage15_script" "$control_directory_name"
    stage 20 'Create issues from the resolved plan'
    status 'Stage 15 will generate a launcher that invokes skill shepherd-task-20-create-issues-from-plan.' "$GRAY"
    display_invocation 25 'Dispatch ordered issue list after Stage 20' Planned "$stage25_script" \
        '<TASK_ISSUE_LIST>' "$control_directory_name"
    (cd "$CONTROL_WORKTREE" && invoke_checked_script "$fixture_root/02-create-issues.sh" domain "$control_directory_name")
    display_invocation 15 'Prepare Stage 20' Actual "$stage15_script" "$control_directory_name"
    status 'Stage 20 completed through the generated launcher, and the fixture verified both issue bodies.'
    local handoff issue_list
    handoff="$(get_campaign_handoff "$CONTROL_DIRECTORY")"
    issue_list="$(jq -r '.issueNumbers | join(",")' "$handoff")"

    CURRENT_PHASE='running control stage 25'
    display_invocation 25 'Dispatch ordered issue list' Actual "$stage25_script" "$issue_list" "$control_directory_name"
    status "Stage 25 will process issues $issue_list serially."
    status 'For each issue, Stage 30 moves assignment to the Ready-for-review boundary, then Stage 40 reviews and merges it.' "$GRAY"
    status 'Stage 50 creates the campaign post-mortem after success or failure.' "$GRAY"
    status "Run evidence will be written beneath: $CONTROL_DIRECTORY/shepherd-tasks-<CAMPAIGN_ID>-<TIMESTAMP>" "$GRAY"
    [[ "$SHOW_SHEPHERD_TASK_SCRIPT_OUTPUT" == 1 ]] ||
        warning 'Detailed per-issue output is hidden; use --show-shepherd-task-script-output to display it.'
    (cd "$CONTROL_WORKTREE" && invoke_checked_script "$stage25_script" shepherd "$issue_list" "$control_directory_name")
    status 'Stage 25 completed successfully for both issues.' "$GREEN"

    CURRENT_PHASE='updating and verifying control campaign'
    status 'Experiment verification: synchronizing and checking the completed campaign.'
    (cd "$CONTROL_WORKTREE" && invoke_checked_native 'Control fast-forward pull' git pull --ff-only)
    (cd "$CONTROL_WORKTREE" && invoke_checked_script "$fixture_root/04-verify-control-campaign.sh" domain "$control_directory_name")

    CURRENT_PHASE='collecting final evidence'
    status 'Experiment verification: collecting final evidence.'
    local control_run post_mortem lessons summary_path
    control_run="$(get_completed_run_directory "$CONTROL_DIRECTORY")"
    post_mortem="$(get_or_create_post_mortem "$control_run" "$CONTROL_WORKTREE" "$CONTROL_DIRECTORY" \
        "$control_directory_name" "$issue_list" "$control_branch" "$repo")"
    lessons="$CONTROL_DIRECTORY/campaign-lessons.md"
    summary_path="$workareas_dir/$repository_name-shepherd-control-$(date +%Y%m%d-%H%M).json"
    jq -n \
        --arg repository "$repo" --arg repositoryUrl "$canonical_url" \
        --arg startedAt "$RUN_STARTED_AT" --arg completedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg baselineBranch "$baseline_branch" --arg baselineSha "$baseline_sha" \
        --arg target "$TARGET" --arg branch "$control_branch" --arg worktree "$CONTROL_WORKTREE" \
        --arg campaignDirectory "$CONTROL_DIRECTORY" \
        --argjson issues "$(jq '.issueNumbers' "$handoff")" --arg handoff "$handoff" \
        --arg runDirectory "$control_run" --arg postMortem "$post_mortem" --arg lessons "$lessons" \
        '{schemaVersion:1,repository:$repository,repositoryUrl:$repositoryUrl,startedAt:$startedAt,
          completedAt:$completedAt,lessonPropagation:"off",baselineBranch:$baselineBranch,
          baselineSha:$baselineSha,target:$target,branch:$branch,worktree:$worktree,
          campaignDirectory:$campaignDirectory,issues:$issues,handoff:$handoff,
          runDirectory:$runDirectory,postMortem:$postMortem,lessons:$lessons}' >"$summary_path"

    printf '\n%s=== CAMPAIGN LESSONS ===%s\n' "$GREEN" "$RESET"
    cat "$lessons"
    printf '\n%s=== RUN COMPLETE ===%s\n' "$GREEN" "$RESET"
    printf 'Repository:               %s\n' "$canonical_url"
    printf 'Baseline SHA:             %s\n' "$baseline_sha"
    printf 'Issues:                   %s\n' "$issue_list"
    printf 'Run directory:            %s\n' "$control_run"
    printf 'Post-mortem:              %s\n' "$post_mortem"
    printf 'Machine-readable summary: %s\n' "$summary_path"
    echo 'All evidence and worktrees were preserved. No cleanup was performed.'
}

if [[ "${SHEPHERD_DRIVER_LIB_ONLY:-0}" != 1 ]]; then
    RUN_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    initial_directory="$PWD"
    finish_run() {
        local exit_code=$?
        trap - EXIT
        cd "$initial_directory"
        [[ -z "$CAPTURE_DIRECTORY" ]] || rm -rf "$CAPTURE_DIRECTORY"
        if [[ $exit_code -ne 0 ]]; then
            printf '\n%s=== RUN FAILED DURING: %s ===%s\n' "$RED" "$CURRENT_PHASE" "$RESET" >&2
            warning 'No automated cleanup was performed. Preserve and inspect any paths that exist:'
            for path in "$TARGET" "$CONTROL_WORKTREE" "$CONTROL_DIRECTORY"; do
                if [[ -n "$path" && -e "$path" ]]; then
                    printf '%s  %s%s\n' "$YELLOW" "$path" "$RESET" >&2
                fi
            done
        fi
        exit "$exit_code"
    }
    trap finish_run EXIT
    main "$@"
fi
