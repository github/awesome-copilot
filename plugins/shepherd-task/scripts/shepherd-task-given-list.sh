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

IFS=',' read -ra ISSUES <<< "$TASK_ISSUES"

for issue in "${ISSUES[@]}"; do
    issue="$(echo "$issue" | tr -d '[:space:]')"
    [[ -z "$issue" ]] && continue
    echo "=== Shepherding task issue #${issue} ==="
    "$SCRIPT_DIR/shepherd-task.sh" "$issue" "$BASE_BRANCH" "$REPO" "$LOG_DIR"
done

echo "=== All tasks shepherded successfully ==="
