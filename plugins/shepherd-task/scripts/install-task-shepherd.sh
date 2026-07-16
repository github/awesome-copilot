#!/usr/bin/env bash
#
# install-task-shepherd.sh — Copies the orchestration scripts into another repository.
#
# Copies the following directory from this repository to the target:
#   plugins/shepherd-task/scripts
#
# Skills should be installed separately via:
#   gh skill install github/awesome-copilot shepherd-task-from-assignment-to-ready
#   gh skill install github/awesome-copilot shepherd-task-from-ready-to-merged-to-base
#   gh skill install github/awesome-copilot shepherd-task-approve-workflows-and-wait-for-completion
#
# Usage: ./install-task-shepherd.sh <TARGET_REPO_PATH>
#   TARGET_REPO_PATH: relative path to the target repository root (must exist)

set -euo pipefail

TARGET_REPO="${1:?Usage: $0 <TARGET_REPO_PATH>}"

# Resolve the source repo root (three levels up from plugins/shepherd-task/scripts/).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Validate target path exists.
if [ ! -d "$TARGET_REPO" ]; then
    echo "ERROR: Target repository path does not exist: $TARGET_REPO" >&2
    exit 1
fi

# Copy orchestration scripts.
dest="$TARGET_REPO/plugins/shepherd-task/scripts"
mkdir -p "$dest"
cp -R "$SCRIPT_DIR/." "$dest/"
echo "Copied plugins/shepherd-task/scripts"

echo ""
echo "Orchestration scripts installed into $TARGET_REPO"
echo ""
echo "Next, install the skills via gh CLI:"
echo "  gh skill install github/awesome-copilot shepherd-task-from-assignment-to-ready"
echo "  gh skill install github/awesome-copilot shepherd-task-from-ready-to-merged-to-base"
echo "  gh skill install github/awesome-copilot shepherd-task-approve-workflows-and-wait-for-completion"
