#!/usr/bin/env bash
#
# install-task-shepherd.sh — Installs the shepherd-task plugin and skills
# into the user's Copilot home directory.
#
# Installs to:
#   ~/.copilot/plugins/shepherd-task/  (plugin with orchestration scripts)
#   ~/.copilot/skills/shepherd-task-*  (skills, only if not already present)
#
# Usage: ./install-task-shepherd.sh

set -euo pipefail

COPILOT_HOME="${COPILOT_HOME:-$HOME/.copilot}"

# Resolve the source repo root (three levels up from plugins/shepherd-task/scripts/).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PLUGIN_SRC="$SCRIPT_DIR/.."

# Install plugin.
plugin_dest="$COPILOT_HOME/plugins/shepherd-task"
mkdir -p "$plugin_dest"
cp -R "$PLUGIN_SRC/." "$plugin_dest/"
echo "Installed plugin to $plugin_dest"

# Install skills (only if not already present).
SKILLS=(
    "shepherd-task-from-assignment-to-ready"
    "shepherd-task-from-ready-to-merged-to-base"
    "shepherd-task-approve-workflows-and-wait-for-completion"
    "shepherd-task-create-ignorance-reduction-plan"
    "shepherd-task-create-post-mortem"
)

skills_installed=0
skills_skipped=0
for skill in "${SKILLS[@]}"; do
    skill_src="$SOURCE_REPO/skills/$skill"
    skill_dest="$COPILOT_HOME/skills/$skill"

    if [ ! -d "$skill_src" ]; then
        echo "WARNING: Source skill not found: $skill_src" >&2
        continue
    fi

    if [ -d "$skill_dest" ]; then
        echo "Skipped ~/.copilot/skills/$skill (already exists)"
        skills_skipped=$((skills_skipped + 1))
    else
        mkdir -p "$skill_dest"
        cp -R "$skill_src/." "$skill_dest/"
        echo "Installed ~/.copilot/skills/$skill"
        skills_installed=$((skills_installed + 1))
    fi
done

echo ""
echo "Installation complete."
echo "  Plugin: $plugin_dest"
echo "  Skills: $skills_installed installed, $skills_skipped already present"
echo ""
echo "Verify with: copilot skill list"
