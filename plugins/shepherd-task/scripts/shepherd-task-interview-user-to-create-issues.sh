#!/usr/bin/env bash
#
# shepherd-task-interview-user-to-create-issues.sh — Interviews the user for 11 inputs
# to the shepherd-task-create-issues-from-plan skill and writes a timestamped prompt
# and invocation script inside a persistent log directory.
#
# Usage: ./shepherd-task-interview-user-to-create-issues.sh

set -euo pipefail

read_required() {
    local prompt="$1"
    local default="${2:-}"
    local value=""

    if [[ -n "$default" ]]; then
        prompt="$prompt [$default]"
    fi

    while true; do
        printf '%s: ' "$prompt" >&2
        IFS= read -r value
        value="${value#"${value%%[![:space:]]*}"}"
        value="${value%"${value##*[![:space:]]}"}"
        if [[ -z "$value" && -n "$default" ]]; then
            value="$default"
        fi
        if [[ -n "$value" ]]; then
            echo "$value"
            return
        fi
        echo "  This input is required." >&2
    done
}

echo "=== shepherd-task-create-issues-from-plan — Input Interview ==="
echo ""

REPO=$(read_required "1/11  REPO (OWNER/REPO format, e.g. github/copilot-sdk)")

BASE_BRANCH=$(read_required "2/11  BASE_BRANCH (non-main topic branch, e.g. edburns/1917-java-embed-cli)")

PARENT_ISSUE=$(read_required "3/11  PARENT_ISSUE (positive integer issue number only, e.g. 123)")

PLAN_DIRECTORY=$(read_required "4/11  PLAN_DIRECTORY (repo-relative path to directory containing plan and spikes)")

PLAN_FILE_NAME=$(read_required "5/11  PLAN_FILE_NAME (name of the plan file within that directory)")

echo ""
echo "  Hint: copy the exact markdown heading from the plan."
QUESTIONS_SECTION=$(read_required "6/11  QUESTIONS_SECTION (exact heading of the resolved questions section)")

IMPLEMENTATION_SECTION=$(read_required "7/11  IMPLEMENTATION_SECTION (exact heading of the implementation/build-order section)")

echo ""
echo "  Hint: provide full GitHub issue URLs separated by commas."
EXAMPLE_ISSUES=$(read_required "8/11  EXAMPLE_ISSUES (full GitHub issue URLs whose style to follow)")

BASE_REMOTE=$(read_required "9/11  BASE_REMOTE (git remote name, e.g. upstream or origin)" "upstream")

ISSUE_TYPE=$(read_required "10/11 ISSUE_TYPE (GitHub issue type for children)" "Task")

echo ""
echo "  Hint: repo-relative paths or constraints; comma-separated."
SUPPORTING_ARTIFACTS=$(read_required "11/11 SUPPORTING_ARTIFACTS (paths to spikes, screenshots, etc.)" "$PLAN_DIRECTORY")

# Build the prompt file.
timestamp=$(date +%Y%m%d-%H%M)
log_dir="$(pwd)/shepherd-task-${timestamp}"
mkdir -p "$log_dir"
log_dir_full="$(cd "$log_dir" && pwd)"
out_file="$log_dir_full/${timestamp}-invoke-shepherd-task-create-issues-from-plan-skill.md"
invocation_file="$log_dir_full/${timestamp}-invoke-shepherd-task-create-issues-from-plan-skill.sh"

cat > "$out_file" <<EOF
Invoke skill \`shepherd-task-create-issues-from-plan\` with these inputs:

- REPO: $REPO
- BASE_BRANCH: $BASE_BRANCH
- PARENT_ISSUE: $PARENT_ISSUE
- PLAN_DIRECTORY: $PLAN_DIRECTORY
- PLAN_FILE_NAME: $PLAN_FILE_NAME
- QUESTIONS_SECTION: $QUESTIONS_SECTION
- IMPLEMENTATION_SECTION: $IMPLEMENTATION_SECTION
- EXAMPLE_ISSUES: $EXAMPLE_ISSUES
- BASE_REMOTE: $BASE_REMOTE
- ISSUE_TYPE: $ISSUE_TYPE
- SUPPORTING_ARTIFACTS: $SUPPORTING_ARTIFACTS
- LOG_DIRECTORY: $log_dir_full
EOF

{
    printf 'timestamp=%q\n' "$timestamp"
    printf 'log_dir_full=%q\n' "$log_dir_full"
    printf 'mkdir -p "$log_dir_full"\n'
    printf 'session_share_path="$log_dir_full/create-issues-session-$timestamp.md"\n'
    printf 'session_json_path="$log_dir_full/create-issues-session-$timestamp.json"\n'
    printf 'session_otel_path="$log_dir_full/create-issues-otel-$timestamp.jsonl"\n'
    printf 'prompt_file=%q\n' "$out_file"
    printf 'prompt=$(cat "$prompt_file")\n'
    printf 'echo "[shepherd-task] Logging create-issues run to: $log_dir_full"\n'
    printf 'export COPILOT_OTEL_FILE_EXPORTER_PATH="$session_otel_path"\n'
    printf 'printf '\''%%s'\'' "$prompt" | copilot --yolo --output-format json --share "$session_share_path" > "$session_json_path"\n'
    printf 'copilot_exit=$?\n'
    printf 'unset COPILOT_OTEL_FILE_EXPORTER_PATH\n'
    printf 'if [[ $copilot_exit -ne 0 ]]; then echo "[shepherd-task] FAILED: copilot exited with code $copilot_exit" >&2; else echo "[shepherd-task] Create-issues session complete."; fi\n'
} > "$invocation_file"
chmod +x "$invocation_file"

echo ""
echo "Artifacts written:"
echo "  Prompt: $out_file"
echo "  Script: $invocation_file"
