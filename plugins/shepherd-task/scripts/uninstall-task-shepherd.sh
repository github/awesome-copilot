#!/usr/bin/env bash
#
# uninstall-task-shepherd.sh — Removes the shepherd-task plugin and skills
# from the user's Copilot home directory.
#
# Removes:
#   ~/.copilot/plugins/shepherd-task/
#   ~/.copilot/skills/shepherd-task-*
#
# Usage: ./uninstall-task-shepherd.sh

set -euo pipefail

COPILOT_HOME="${COPILOT_HOME:-$HOME/.copilot}"

# Remove plugin.
PLUGIN_DIR="$COPILOT_HOME/plugins/shepherd-task"
if [ -d "$PLUGIN_DIR" ]; then
    rm -rf "$PLUGIN_DIR"
    echo "Removed $PLUGIN_DIR"
else
    echo "Plugin not found: $PLUGIN_DIR (skipped)"
fi

# Remove skills.
SKILLS=(
    "shepherd-task-from-assignment-to-ready"
    "shepherd-task-from-ready-to-merged-to-base"
    "shepherd-task-approve-workflows-and-wait-for-completion"
    "shepherd-task-create-ignorance-reduction-plan"
    "shepherd-task-create-post-mortem"
)
for skill in "${SKILLS[@]}"; do
    skill_dir="$COPILOT_HOME/skills/$skill"
    if [ -d "$skill_dir" ]; then
        rm -rf "$skill_dir"
        echo "Removed ~/.copilot/skills/$skill"
    fi
done

echo ""
echo "Shepherd-task fully uninstalled."
