#!/usr/bin/env bash
#
# install-task-shepherd.sh — Copies the orchestration scripts and skills into another repository.
#
# Copies the following from this repository to the target:
#   plugins/shepherd-task/scripts   (orchestration scripts)
#   skills/shepherd-task-*          (skills, only if not already present)
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

# Copy skills (only if not already present in target).
SKILLS=(
    "shepherd-task-from-assignment-to-ready"
    "shepherd-task-from-ready-to-merged-to-base"
    "shepherd-task-approve-workflows-and-wait-for-completion"
)

skills_installed=0
skills_skipped=0
for skill in "${SKILLS[@]}"; do
    skill_src="$SOURCE_REPO/skills/$skill"
    skill_dest="$TARGET_REPO/skills/$skill"

    if [ ! -d "$skill_src" ]; then
        echo "WARNING: Source skill not found: $skill_src" >&2
        continue
    fi

    if [ -d "$skill_dest" ]; then
        echo "Skipped skills/$skill (already exists)"
        skills_skipped=$((skills_skipped + 1))
    else
        mkdir -p "$skill_dest"
        cp -R "$skill_src/." "$skill_dest/"
        echo "Copied skills/$skill"
        skills_installed=$((skills_installed + 1))
    fi
done

echo ""
echo "Installation complete into $TARGET_REPO"
echo "  Scripts: copied"
echo "  Skills:  $skills_installed installed, $skills_skipped already present"
