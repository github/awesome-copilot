#!/usr/bin/env bash
#
# shepherd-task-given-list.sh — Shepherds a list of child Task issues end-to-end
# by invoking shepherd-task.sh sequentially for each one.
#
# Usage: ./shepherd-task-given-list.sh <TASK_ISSUES> <BASE_BRANCH> <REPO>
#   TASK_ISSUES: comma-separated list of issue numbers (e.g., "1841,1842,1843")
#   BASE_BRANCH: the base branch the task PRs should target (never main)
#   REPO:        repository in OWNER/REPO format

set -euo pipefail

usage() {
    echo "Usage: $0 <TASK_ISSUES> <BASE_BRANCH> <REPO>" >&2
}

fail_input() {
    echo "Error: $1" >&2
    usage
    exit 1
}

if [[ $# -ne 3 ]]; then
    fail_input "Expected exactly 3 arguments; received $#. TASK_ISSUES must be the first argument."
fi

TASK_ISSUES="$1"
BASE_BRANCH="$2"
REPO="$3"

if [[ ! "$TASK_ISSUES" =~ ^[1-9][0-9]*(,[1-9][0-9]*)*$ ]]; then
    fail_input "TASK_ISSUES must be a comma-separated list of positive issue numbers (for example: 2167,2168); received '$TASK_ISSUES'."
fi

if [[ "$BASE_BRANCH" == "main" ]]; then
    fail_input "BASE_BRANCH must not be 'main'."
fi

if ! git check-ref-format --branch "$BASE_BRANCH" >/dev/null 2>&1; then
    fail_input "BASE_BRANCH is not a valid Git branch name; received '$BASE_BRANCH'."
fi

if [[ ! "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
    fail_input "REPO must be in OWNER/REPO format; received '$REPO'."
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

LOG_DIR="shepherd-tasks-$(date +%Y%m%d-%H%M)"
mkdir -p "$LOG_DIR"
LOG_DIR_FULL="$(cd "$LOG_DIR" && pwd)"
echo "Logging shepherd task files to $LOG_DIR_FULL"

run_copilot_redacted() {
    local output_file="$1"
    shift
    local copilot_exit redact_exit

    set +e
    copilot "$@" | "$SCRIPT_DIR/redact-secrets.sh" - >"$output_file"
    local pipeline_status=("${PIPESTATUS[@]}")
    copilot_exit=${pipeline_status[0]}
    redact_exit=${pipeline_status[1]}
    set -e
    [[ $copilot_exit -eq 0 && $redact_exit -eq 0 ]]
}

IFS=',' read -ra ISSUES <<< "$TASK_ISSUES"

invoke_post_mortem_on_exit() {
    local script_exit=$?
    local timestamp post_mortem_path share_path json_path prompt pm_exit

    # Prevent duplicate invocation if EXIT trap is triggered more than once.
    if [[ "${POST_MORTEM_INVOKED:-0}" == "1" ]]; then
        return
    fi
    POST_MORTEM_INVOKED=1

    # Always attempt post-mortem generation once shepherding log directory exists.
    if [[ -z "${LOG_DIR_FULL:-}" ]]; then
        return
    fi

    timestamp="$(date +%Y%m%d-%H%M)"
    post_mortem_path="$LOG_DIR_FULL/${timestamp}-post-mortem.md"
    share_path="$LOG_DIR_FULL/post-mortem-session-${timestamp}.md"
    json_path="$LOG_DIR_FULL/post-mortem-session-${timestamp}.json"

    prompt="Invoke skill \`shepherd-task-50-create-post-mortem\` with these inputs:

- SHEPHERD_LOG_DIR: $LOG_DIR_FULL
- SCRIPT_EXIT_CODE: $script_exit
- TASK_ISSUES: $TASK_ISSUES
- BASE_BRANCH: $BASE_BRANCH
- REPO: $REPO

Write the report to:
- OUTPUT_FILE: $post_mortem_path"

    echo "[shepherd-task] Generating post-mortem report at: $post_mortem_path"
    set +e
    if ! run_copilot_redacted "$json_path" --yolo --output-format json --share "$share_path" <<< "$prompt"; then
        pm_exit=1
    else
        pm_exit=0
    fi
    "$SCRIPT_DIR/redact-secrets.sh" "$LOG_DIR_FULL" >/dev/null
    set -e

    if [[ $pm_exit -ne 0 ]]; then
        echo "[shepherd-task] WARNING: post-mortem skill invocation exited with code $pm_exit" >&2
    fi
}

trap 'invoke_post_mortem_on_exit' EXIT

for issue in "${ISSUES[@]}"; do
    issue="$(echo "$issue" | tr -d '[:space:]')"
    [[ -z "$issue" ]] && continue
    echo "=== Shepherding task issue #${issue} ==="
    "$SCRIPT_DIR/shepherd-task.sh" "$issue" "$BASE_BRANCH" "$REPO" "$LOG_DIR"
done

echo "=== All tasks shepherded successfully ==="
exit 0
