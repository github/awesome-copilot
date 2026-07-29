#!/usr/bin/env bash
#
# shepherd-task-interview-user-to-create-issues.sh — Interviews the user for all 11
# inputs to the shepherd-task-create-issues-from-plan skill and writes a timestamped
# prompt file in the current directory.
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
out_file="$(pwd)/${timestamp}-invoke-shepherd-task-create-issues-from-plan-skill.md"

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
EOF

echo ""
echo "Prompt file written to:"
echo "  $out_file"
echo ""
echo "To execute, paste the contents into a Copilot chat or pipe to copilot:"
echo "  cat \"$out_file\" | copilot --yolo"
