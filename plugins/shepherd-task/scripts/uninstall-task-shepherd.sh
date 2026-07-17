#!/usr/bin/env bash
#
# uninstall-task-shepherd.sh — Removes the orchestration scripts from a target repository.
#
# Removes the following directory from the target:
#   plugins/shepherd-task/scripts
#
# Skills must be removed manually by deleting them from your agent's skills location.
#
# Usage: ./uninstall-task-shepherd.sh <TARGET_REPO_PATH>
#   TARGET_REPO_PATH: relative path to the target repository root (must exist)

set -euo pipefail

TARGET_REPO="${1:?Usage: $0 <TARGET_REPO_PATH>}"

# Validate target path exists.
if [ ! -d "$TARGET_REPO" ]; then
    echo "ERROR: Target repository path does not exist: $TARGET_REPO" >&2
    exit 1
fi

SCRIPTS_DIR="$TARGET_REPO/plugins/shepherd-task/scripts"

if [ ! -d "$SCRIPTS_DIR" ]; then
    echo "Nothing to remove: $SCRIPTS_DIR does not exist."
    exit 0
fi

rm -rf "$SCRIPTS_DIR"
echo "Removed $SCRIPTS_DIR"

# Clean up empty parent directories.
rmdir "$TARGET_REPO/plugins/shepherd-task" 2>/dev/null && echo "Removed plugins/shepherd-task/" || true
rmdir "$TARGET_REPO/plugins" 2>/dev/null && echo "Removed plugins/" || true

echo ""
echo "Orchestration scripts removed from $TARGET_REPO"

# Remove skills.
SKILLS=(
    "shepherd-task-from-assignment-to-ready"
    "shepherd-task-from-ready-to-merged-to-base"
    "shepherd-task-approve-workflows-and-wait-for-completion"
)
for skill in "${SKILLS[@]}"; do
    skill_dir="$TARGET_REPO/.github/skills/$skill"
    if [ -d "$skill_dir" ]; then
        rm -rf "$skill_dir"
        echo "Removed .github/skills/$skill"
    fi
done

echo ""
echo "Shepherd-task fully removed from $TARGET_REPO"
