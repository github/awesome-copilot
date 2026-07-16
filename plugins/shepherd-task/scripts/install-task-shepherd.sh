#!/usr/bin/env bash
#
# install-task-shepherd.sh — Copies the task shepherd system into another repository.
#
# Copies the following directories from this repository to the target:
#   skills/shepherd-task-from-ready-to-merged-to-base
#   skills/shepherd-task-approve-workflows-and-wait-for-completion
#   skills/shepherd-task-from-assignment-to-ready
#   plugins/shepherd-task/scripts
#
# Usage: ./install-task-shepherd.sh <TARGET_REPO_PATH>
#   TARGET_REPO_PATH: relative path to the target repository root (must exist)

set -euo pipefail

TARGET_REPO="${1:?Usage: $0 <TARGET_REPO_PATH>}"

# Resolve the source repo root (three levels up from plugins/shepherd-task/scripts/).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Validate source repo looks correct.
if [ ! -d "$SOURCE_REPO/skills/shepherd-task-from-assignment-to-ready" ]; then
    echo "ERROR: Cannot locate skills/shepherd-task-from-assignment-to-ready in source repo at $SOURCE_REPO" >&2
    exit 1
fi

# Validate target path exists.
if [ ! -d "$TARGET_REPO" ]; then
    echo "ERROR: Target repository path does not exist: $TARGET_REPO" >&2
    exit 1
fi

SKILLS=(
    "skills/shepherd-task-from-ready-to-merged-to-base"
    "skills/shepherd-task-approve-workflows-and-wait-for-completion"
    "skills/shepherd-task-from-assignment-to-ready"
)

# Copy skill directories.
for skill in "${SKILLS[@]}"; do
    dest="$TARGET_REPO/$skill"
    mkdir -p "$dest"
    cp -R "$SOURCE_REPO/$skill/." "$dest/"
    echo "Copied $skill"
done

# Copy orchestration scripts.
dest="$TARGET_REPO/plugins/shepherd-task/scripts"
mkdir -p "$dest"
cp -R "$SCRIPT_DIR/." "$dest/"
echo "Copied plugins/shepherd-task/scripts"

echo "Task shepherd system installed into $TARGET_REPO"
