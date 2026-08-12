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

# Verify required campaign initialization and log redaction scripts were installed.
REQUIRED_SCRIPTS=(
    "shepherd-task-init-campaign.sh"
    "shepherd-task-init-campaign.ps1"
    "redact-secrets.sh"
    "redact-secrets.ps1"
)
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ ! -f "$plugin_dest/scripts/$script" ]; then
        echo "ERROR: Required script was not installed: $plugin_dest/scripts/$script" >&2
        exit 1
    fi
done

# Install skills (only if not already present).
SKILLS=(
    "shepherd-task-30-from-assignment-to-ready"
    "shepherd-task-40-from-ready-to-merged-to-base"
    "shepherd-task-approve-workflows-and-wait-for-completion"
    "shepherd-task-10-create-ignorance-reduction-plan"
    "shepherd-task-50-create-post-mortem"
    "shepherd-task-20-create-issues-from-plan"
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
echo "Campaign initialization scripts available at:"
echo "  $plugin_dest/scripts/shepherd-task-init-campaign.sh"
echo "  $plugin_dest/scripts/shepherd-task-init-campaign.ps1"
echo ""
echo "Interview script available at:"
echo "  $plugin_dest/scripts/shepherd-task-interview-user-to-create-issues.sh"
echo ""
echo "Verify with: copilot skill list"
