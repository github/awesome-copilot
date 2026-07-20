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

if [[ $# -lt 3 ]]; then
    echo "Usage: $0 <TASK_ISSUES> <BASE_BRANCH> <REPO>" >&2
    exit 1
fi

TASK_ISSUES="$1"
BASE_BRANCH="$2"
REPO="$3"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

LOG_DIR="shepherd-tasks-$(date +%Y%m%d-%H%M)"
mkdir -p "$LOG_DIR"
LOG_DIR_FULL="$(cd "$LOG_DIR" && pwd)"
echo "Logging shepherd task files to $LOG_DIR_FULL"

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

    prompt="Invoke skill \`shepherd-task-create-post-mortem\` with these inputs:

- SHEPHERD_LOG_DIR: $LOG_DIR_FULL
- SCRIPT_EXIT_CODE: $script_exit
- TASK_ISSUES: $TASK_ISSUES
- BASE_BRANCH: $BASE_BRANCH
- REPO: $REPO

Write the report to:
- OUTPUT_FILE: $post_mortem_path"

    echo "[shepherd-task] Generating post-mortem report at: $post_mortem_path"
    set +e
    printf '%s' "$prompt" | copilot --yolo --output-format json --share "$share_path" > "$json_path"
    pm_exit=$?
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
