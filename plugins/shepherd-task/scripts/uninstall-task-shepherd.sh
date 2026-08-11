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
    REDACTION_SCRIPTS=(
        "redact-secrets.sh"
        "redact-secrets.ps1"
    )
    for script in "${REDACTION_SCRIPTS[@]}"; do
        if [ -f "$PLUGIN_DIR/scripts/$script" ]; then
            rm -f "$PLUGIN_DIR/scripts/$script"
            echo "Removed $PLUGIN_DIR/scripts/$script"
        fi
    done
    rm -rf "$PLUGIN_DIR"
    echo "Removed $PLUGIN_DIR"
else
    echo "Plugin not found: $PLUGIN_DIR (skipped)"
fi

# Remove skills.
SKILLS=(
    "shepherd-task-30-from-assignment-to-ready"
    "shepherd-task-40-from-ready-to-merged-to-base"
    "shepherd-task-approve-workflows-and-wait-for-completion"
    "shepherd-task-10-create-ignorance-reduction-plan"
    "shepherd-task-50-create-post-mortem"
    "shepherd-task-20-create-issues-from-plan"
)
for skill in "${SKILLS[@]}"; do
    skill_dir="$COPILOT_HOME/skills/$skill"
    if [ -d "$skill_dir" ]; then
        rm -rf "$skill_dir"
        echo "Removed ~/.copilot/skills/$skill"
    fi
done

# Remove any generated interview prompt files from the plugin scripts directory.
rm -f "$PLUGIN_DIR/scripts/"*invoke-shepherd-task-20-create-issues-from-plan-skill.md 2>/dev/null || true

echo ""
echo "Shepherd-task fully uninstalled."
