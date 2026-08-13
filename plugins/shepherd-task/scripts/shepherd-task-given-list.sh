#!/usr/bin/env bash
#
# Usage:
#   ./shepherd-task-given-list.sh --lesson-propagation=<off|campaign> \
#     <TASK_ISSUES> <CAMPAIGN_METADATA_DIRECTORY>

set -euo pipefail

usage() {
    echo "Usage: $0 --lesson-propagation=<off|campaign> <TASK_ISSUES> <CAMPAIGN_METADATA_DIRECTORY>" >&2
}

fail_input() {
    echo "Error: $1" >&2
    usage
    exit 1
}

[[ $# -eq 3 ]] || fail_input "Expected exactly 3 arguments."
[[ "$1" =~ ^--lesson-propagation=(off|campaign)$ ]] ||
    fail_input "First argument must be --lesson-propagation=off or --lesson-propagation=campaign."

LESSON_PROPAGATION="${1#*=}"
TASK_ISSUES="$2"
CAMPAIGN_METADATA_DIRECTORY="$3"
[[ "$TASK_ISSUES" =~ ^[1-9][0-9]*(,[1-9][0-9]*)*$ ]] ||
    fail_input "TASK_ISSUES must be a comma-separated list of positive issue numbers."
[[ "$CAMPAIGN_METADATA_DIRECTORY" != /* && "$CAMPAIGN_METADATA_DIRECTORY" != */* ]] ||
    fail_input "CAMPAIGN_METADATA_DIRECTORY must be a repository-root-relative basename."
[[ "$CAMPAIGN_METADATA_DIRECTORY" =~ ^[1-9][0-9]*-[a-z0-9][a-z0-9-]*-remove-before-merge$ ]] ||
    fail_input "CAMPAIGN_METADATA_DIRECTORY does not follow the campaign directory naming contract."

for command in git jq copilot; do
    command -v "$command" >/dev/null 2>&1 || fail_input "Required command '$command' was not found."
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail_input "Run this script inside the campaign Git worktree."
REPO_ROOT="$(cd "$REPO_ROOT" && pwd -P)"
CAMPAIGN_METADATA_PATH="$REPO_ROOT/$CAMPAIGN_METADATA_DIRECTORY"
[[ -d "$CAMPAIGN_METADATA_PATH" ]] || fail_input "Campaign metadata directory not found."
CAMPAIGN_METADATA_PATH="$(cd "$CAMPAIGN_METADATA_PATH" && pwd -P)"
[[ "$(dirname "$CAMPAIGN_METADATA_PATH")" == "$REPO_ROOT" ]] ||
    fail_input "Campaign metadata directory must be a direct child of the repository root."

MANIFEST_PATH="$CAMPAIGN_METADATA_PATH/shepherd-campaign.json"
[[ -f "$MANIFEST_PATH" ]] || fail_input "Campaign manifest not found: $MANIFEST_PATH"
jq -e '
  .schemaVersion == 1 and
  (.campaignId | type == "string" and test("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")) and
  (.campaignIssueNumber | type == "number" and . > 0) and
  (.repository | type == "string" and test("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")) and
  (.baseBranch | type == "string" and . != "main") and
  (.lessonPropagation == "off" or .lessonPropagation == "campaign")
' "$MANIFEST_PATH" >/dev/null || fail_input "Campaign manifest is invalid."

CAMPAIGN_ID="$(jq -r '.campaignId' "$MANIFEST_PATH")"
REPO="$(jq -r '.repository' "$MANIFEST_PATH")"
BASE_BRANCH="$(jq -r '.baseBranch' "$MANIFEST_PATH")"
MANIFEST_MODE="$(jq -r '.lessonPropagation' "$MANIFEST_PATH")"
MANIFEST_DIRECTORY="$(jq -r '.campaignMetadataDirectory' "$MANIFEST_PATH")"
[[ "$MANIFEST_DIRECTORY" == "$CAMPAIGN_METADATA_DIRECTORY" ]] ||
    fail_input "Manifest campaignMetadataDirectory does not match the supplied directory."
[[ "$MANIFEST_MODE" == "$LESSON_PROPAGATION" ]] ||
    fail_input "Requested lesson mode '$LESSON_PROPAGATION' does not match campaign mode '$MANIFEST_MODE'."
[[ -f "$CAMPAIGN_METADATA_PATH/campaign-lessons.md" ]] ||
    fail_input "Campaign lessons file not found."

timestamp="$(date +%Y%m%d-%H%M)"
LOG_DIR_FULL="$CAMPAIGN_METADATA_PATH/shepherd-tasks-$CAMPAIGN_ID-$timestamp"
[[ ! -e "$LOG_DIR_FULL" ]] || fail_input "Given-list run directory already exists: $LOG_DIR_FULL"
mkdir -- "$LOG_DIR_FULL"
RUN_MANIFEST="$LOG_DIR_FULL/shepherd-task-given-list-run.json"
started_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
jq -n \
    --argjson schemaVersion 1 \
    --arg campaignId "$CAMPAIGN_ID" \
    --arg campaignMetadataDirectory "$CAMPAIGN_METADATA_DIRECTORY" \
    --arg repository "$REPO" \
    --arg baseBranch "$BASE_BRANCH" \
    --arg lessonPropagation "$LESSON_PROPAGATION" \
    --arg taskIssues "$TASK_ISSUES" \
    --arg startedAt "$started_at" \
    '{
      schemaVersion: $schemaVersion,
      campaignId: $campaignId,
      campaignMetadataDirectory: $campaignMetadataDirectory,
      repository: $repository,
      baseBranch: $baseBranch,
      lessonPropagation: $lessonPropagation,
      taskIssues: ($taskIssues | split(",") | map(tonumber)),
      startedAt: $startedAt,
      completedAt: null,
      exitCode: null,
      status: "running"
    }' >"$RUN_MANIFEST"

echo "Campaign ID: $CAMPAIGN_ID"
echo "Lesson propagation: $LESSON_PROPAGATION"
echo "Logging shepherd-task-given-list run to: $LOG_DIR_FULL"

run_copilot_redacted() {
    local output_file="$1"
    shift
    set +e
    copilot "$@" | "$SCRIPT_DIR/redact-secrets.sh" - >"$output_file"
    local statuses=("${PIPESTATUS[@]}")
    set -e
    [[ ${statuses[0]} -eq 0 && ${statuses[1]} -eq 0 ]]
}

POST_MORTEM_INVOKED=0
finalize_run() {
    local original_exit="$1"
    local final_exit="$original_exit"
    trap - EXIT

    if [[ "$POST_MORTEM_INVOKED" == "0" ]]; then
        POST_MORTEM_INVOKED=1
        local pm_timestamp post_mortem_path share_path json_path prompt
        pm_timestamp="$(date +%Y%m%d-%H%M)"
        post_mortem_path="$LOG_DIR_FULL/${pm_timestamp}-post-mortem.md"
        share_path="$LOG_DIR_FULL/post-mortem-session-${pm_timestamp}.md"
        json_path="$LOG_DIR_FULL/post-mortem-session-${pm_timestamp}.json"
        prompt="Invoke skill \`shepherd-task-50-create-post-mortem\` with these inputs:

- SHEPHERD_LOG_DIR: $LOG_DIR_FULL
- SCRIPT_EXIT_CODE: $original_exit
- TASK_ISSUES: $TASK_ISSUES
- BASE_BRANCH: $BASE_BRANCH
- REPO: $REPO
- CAMPAIGN_ID: $CAMPAIGN_ID
- CAMPAIGN_METADATA_DIRECTORY: $CAMPAIGN_METADATA_DIRECTORY
- LESSON_PROPAGATION: $LESSON_PROPAGATION

Write the report to:
- OUTPUT_FILE: $post_mortem_path"
        local pm_exit
        if run_copilot_redacted "$json_path" --yolo --output-format json --share "$share_path" <<<"$prompt"; then
            pm_exit=0
        else
            pm_exit=$?
        fi
        set +e
        "$SCRIPT_DIR/redact-secrets.sh" "$LOG_DIR_FULL" >/dev/null 2>&1
        set -e
        [[ $pm_exit -eq 0 ]] || echo "[shepherd-task] WARNING: post-mortem generation failed." >&2
    fi

    local completed_at status temp_manifest
    completed_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    status="failed"
    [[ $original_exit -eq 0 ]] && status="succeeded"
    temp_manifest="$RUN_MANIFEST.tmp"
    if ! jq --arg completedAt "$completed_at" --arg status "$status" --argjson exitCode "$original_exit" \
        '.completedAt=$completedAt | .status=$status | .exitCode=$exitCode' \
        "$RUN_MANIFEST" >"$temp_manifest" ||
        ! mv -- "$temp_manifest" "$RUN_MANIFEST"; then
        echo "[shepherd-task] FAILED: could not finalize run manifest." >&2
        [[ $final_exit -ne 0 ]] || final_exit=1
    fi
    exit "$final_exit"
}
trap 'finalize_run $?' EXIT

IFS=',' read -ra ISSUES <<<"$TASK_ISSUES"
for issue in "${ISSUES[@]}"; do
    echo "=== Shepherding task issue #$issue ==="
    "$SCRIPT_DIR/shepherd-task.sh" "$issue" "$CAMPAIGN_METADATA_DIRECTORY" "$LOG_DIR_FULL"
done

echo "=== All tasks shepherded successfully ==="
