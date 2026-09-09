#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

usage() {
    echo "Usage: $0 [--allow-downgrade]" >&2
}

ALLOW_DOWNGRADE=0
if [[ $# -gt 1 ]]; then
    usage
    exit 1
fi
if [[ $# -eq 1 ]]; then
    [[ "$1" == "--allow-downgrade" ]] || {
        usage
        exit 1
    }
    ALLOW_DOWNGRADE=1
fi

for command in git jq mktemp; do
    command -v "$command" >/dev/null 2>&1 || {
        echo "ERROR: Required command '$command' was not found." >&2
        exit 1
    }
done

COPILOT_HOME="${COPILOT_HOME:-$HOME/.copilot}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_REPO="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PLUGIN_SRC="$SCRIPT_DIR/.."
PLUGIN_DEST="$COPILOT_HOME/plugins/shepherd-task"
SKILLS_DEST="$COPILOT_HOME/skills"
mapfile -t SKILLS < <(
    jq -er '
      .extensions["com.github.awesome-copilot"].skills[] |
      sub("^./skills/"; "") |
      sub("/$"; "")
    ' "$PLUGIN_SRC/plugin.json"
)

semver_is_downgrade() {
    local new_version="$1"
    local old_version="$2"
    local new_core="${new_version%%[-+]*}"
    local old_core="${old_version%%[-+]*}"
    local new_pre="" old_pre=""
    [[ "$new_version" == *-* ]] && new_pre="${new_version#*-}" && new_pre="${new_pre%%+*}"
    [[ "$old_version" == *-* ]] && old_pre="${old_version#*-}" && old_pre="${old_pre%%+*}"
    local new_major new_minor new_patch old_major old_minor old_patch
    IFS=. read -r new_major new_minor new_patch <<<"$new_core"
    IFS=. read -r old_major old_minor old_patch <<<"$old_core"
    local index
    local -a new_parts=("$new_major" "$new_minor" "$new_patch")
    local -a old_parts=("$old_major" "$old_minor" "$old_patch")
    for index in 0 1 2; do
        if ((10#${new_parts[$index]} < 10#${old_parts[$index]})); then
            return 0
        fi
        if ((10#${new_parts[$index]} > 10#${old_parts[$index]})); then
            return 1
        fi
    done
    if [[ -n "$new_pre" && -z "$old_pre" ]]; then
        return 0
    fi
    if [[ -z "$new_pre" || "$new_pre" == "$old_pre" ]]; then
        return 1
    fi
    local -a new_identifiers old_identifiers
    IFS=. read -ra new_identifiers <<<"$new_pre"
    IFS=. read -ra old_identifiers <<<"$old_pre"
    local max_identifiers="${#new_identifiers[@]}"
    if ((${#old_identifiers[@]} > max_identifiers)); then
        max_identifiers="${#old_identifiers[@]}"
    fi
    for ((index = 0; index < max_identifiers; index++)); do
        if ((index >= ${#new_identifiers[@]})); then
            return 0
        fi
        if ((index >= ${#old_identifiers[@]})); then
            return 1
        fi
        local new_identifier="${new_identifiers[$index]}"
        local old_identifier="${old_identifiers[$index]}"
        [[ "$new_identifier" == "$old_identifier" ]] && continue
        if [[ "$new_identifier" =~ ^[0-9]+$ && "$old_identifier" =~ ^[0-9]+$ ]]; then
            ((10#$new_identifier < 10#$old_identifier)) && return 0
            return 1
        fi
        [[ "$new_identifier" =~ ^[0-9]+$ ]] && return 0
        [[ "$old_identifier" =~ ^[0-9]+$ ]] && return 1
        [[ "$new_identifier" < "$old_identifier" ]] && return 0
        return 1
    done
    return 1
}

mkdir -p "$COPILOT_HOME"
STAGING_ROOT="$(mktemp -d "$COPILOT_HOME/.shepherd-task-install.XXXXXX")"
BACKUP_ROOT="$(mktemp -d "$COPILOT_HOME/.shepherd-task-backup.XXXXXX")"
STAGED_PLUGIN="$STAGING_ROOT/plugin"
STAGED_SKILLS="$STAGING_ROOT/skills"
PUBLISH_STARTED=0
PUBLISHED=0

cleanup() {
    local exit_code=$?
    trap - EXIT
    if [[ "$PUBLISH_STARTED" == "1" && "$PUBLISHED" != "1" ]]; then
        rm -rf -- "$PLUGIN_DEST"
        if [[ -d "$BACKUP_ROOT/plugin" ]]; then
            mkdir -p "$(dirname "$PLUGIN_DEST")"
            mv -- "$BACKUP_ROOT/plugin" "$PLUGIN_DEST"
        fi
        for skill in "${SKILLS[@]}"; do
            rm -rf -- "$SKILLS_DEST/$skill"
            if [[ -d "$BACKUP_ROOT/skills/$skill" ]]; then
                mkdir -p "$SKILLS_DEST"
                mv -- "$BACKUP_ROOT/skills/$skill" "$SKILLS_DEST/$skill"
            fi
        done
    fi
    rm -rf -- "$STAGING_ROOT" "$BACKUP_ROOT"
    exit "$exit_code"
}
trap cleanup EXIT

mkdir -p "$STAGED_PLUGIN" "$STAGED_SKILLS"
cp -R "$PLUGIN_SRC/." "$STAGED_PLUGIN/"

VERSION_INFO="$(bash "$STAGED_PLUGIN/scripts/read-shepherd-task-version.sh")"
SHEPHERD_TASK_VERSION="$(jq -r '.shepherdTaskVersion' <<<"$VERSION_INFO")"
INSTALL_MANIFEST_SCHEMA_VERSION="$(jq -r '.artifactSchemaVersions.installationManifest' <<<"$VERSION_INFO")"
INSTALLED_COMPONENT_SCHEMA_VERSION="$(jq -r '.artifactSchemaVersions.installedComponent' <<<"$VERSION_INFO")"
STAGE_OUTCOME_PROTOCOL_VERSION="$(jq -r '.stageOutcomeProtocolVersion' <<<"$VERSION_INFO")"

if [[ -f "$PLUGIN_DEST/install-manifest.json" ]]; then
    EXISTING_VERSION="$(jq -r '.shepherdTaskVersion // empty' "$PLUGIN_DEST/install-manifest.json")"
elif [[ -f "$PLUGIN_DEST/plugin.json" ]]; then
    EXISTING_VERSION="$(jq -r '.version // empty' "$PLUGIN_DEST/plugin.json")"
else
    EXISTING_VERSION=""
fi
if [[ -n "$EXISTING_VERSION" ]] &&
    semver_is_downgrade "$SHEPHERD_TASK_VERSION" "$EXISTING_VERSION" &&
    [[ "$ALLOW_DOWNGRADE" != "1" ]]; then
    echo "ERROR: Refusing to downgrade shepherd-task from $EXISTING_VERSION to $SHEPHERD_TASK_VERSION." >&2
    echo "Re-run with --allow-downgrade to permit this downgrade." >&2
    exit 1
fi

mkdir -p "$STAGED_PLUGIN/skills"
for skill in "${SKILLS[@]}"; do
    skill_src="$SOURCE_REPO/skills/$skill"
    [[ -f "$skill_src/SKILL.md" ]] || {
        echo "ERROR: Required source skill not found: $skill_src/SKILL.md" >&2
        exit 1
    }
    cp -R "$skill_src" "$STAGED_SKILLS/$skill"
    cp -R "$skill_src" "$STAGED_PLUGIN/skills/$skill"
    for staged_skill in "$STAGED_SKILLS/$skill" "$STAGED_PLUGIN/skills/$skill"; do
        jq -n \
            --argjson schemaVersion "$INSTALLED_COMPONENT_SCHEMA_VERSION" \
            --arg shepherdTaskVersion "$SHEPHERD_TASK_VERSION" \
            --arg component "$skill" \
            '{
              schemaVersion: $schemaVersion,
              shepherdTaskVersion: $shepherdTaskVersion,
              component: $component
            }' >"$staged_skill/shepherd-task-component.json"
    done
done

while IFS= read -r plugin_ref; do
    [[ -e "$STAGED_PLUGIN/${plugin_ref#./}" ]] || {
        echo "Error: Declared plugin file was not staged: $plugin_ref" >&2
        exit 1
    }
done < <(
    jq -er '.extensions["com.github.awesome-copilot"].pluginFiles[]' \
        "$STAGED_PLUGIN/plugin.json"
)

for skill in "${SKILLS[@]}"; do
    jq -e \
        --arg version "$SHEPHERD_TASK_VERSION" \
        --arg component "$skill" \
        --argjson schemaVersion "$INSTALLED_COMPONENT_SCHEMA_VERSION" \
        '.schemaVersion == $schemaVersion and .shepherdTaskVersion == $version and .component == $component' \
        "$STAGED_SKILLS/$skill/shepherd-task-component.json" >/dev/null
done

mkdir -p "$(dirname "$PLUGIN_DEST")" "$SKILLS_DEST" "$BACKUP_ROOT/skills"
PUBLISH_STARTED=1
if [[ -e "$PLUGIN_DEST" || -L "$PLUGIN_DEST" ]]; then
    mv -- "$PLUGIN_DEST" "$BACKUP_ROOT/plugin"
fi
for skill in "${SKILLS[@]}"; do
    if [[ -e "$SKILLS_DEST/$skill" || -L "$SKILLS_DEST/$skill" ]]; then
        mv -- "$SKILLS_DEST/$skill" "$BACKUP_ROOT/skills/$skill"
    fi
done

mv -- "$STAGED_PLUGIN" "$PLUGIN_DEST"
for skill in "${SKILLS[@]}"; do
    mv -- "$STAGED_SKILLS/$skill" "$SKILLS_DEST/$skill"
done

SOURCE_COMMIT="$(git -C "$SOURCE_REPO" rev-parse HEAD 2>/dev/null || true)"
SOURCE_REPOSITORY="$(jq -r '.repository // empty' "$PLUGIN_DEST/plugin.json")"
AGENT_PLUGINS_SPEC_VERSION="$(jq -r '."$schema"' "$PLUGIN_DEST/plugin.json" |
    sed -n 's#^.*/schemas/\([^/]*\)/plugin\.schema\.json$#\1#p')"
INSTALLED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
SKILL_NAMES="$(IFS=,; echo "${SKILLS[*]}")"
TEMP_INSTALL_MANIFEST="$PLUGIN_DEST/.install-manifest.json.tmp.$$"
jq -n \
    --argjson schemaVersion "$INSTALL_MANIFEST_SCHEMA_VERSION" \
    --arg shepherdTaskVersion "$SHEPHERD_TASK_VERSION" \
    --arg agentPluginsSpecVersion "$AGENT_PLUGINS_SPEC_VERSION" \
    --arg sourceCommit "$SOURCE_COMMIT" \
    --arg sourceRepository "$SOURCE_REPOSITORY" \
    --arg installedAt "$INSTALLED_AT" \
    --argjson stageOutcomeProtocolVersion "$STAGE_OUTCOME_PROTOCOL_VERSION" \
    --arg skillNames "$SKILL_NAMES" \
    '{
      schemaVersion: $schemaVersion,
      shepherdTaskVersion: $shepherdTaskVersion,
      versionContractSchemaVersion: 1,
      agentPluginsSpecVersion: $agentPluginsSpecVersion,
      sourceCommit: (if $sourceCommit == "" then null else $sourceCommit end),
      sourceRepository: $sourceRepository,
      installedAt: $installedAt,
      stageOutcomeProtocolVersion: $stageOutcomeProtocolVersion,
      components: {
        plugin: {
          name: "shepherd-task",
          shepherdTaskVersion: $shepherdTaskVersion
        },
        skills: (
          $skillNames | split(",") |
          map({name: ., shepherdTaskVersion: $shepherdTaskVersion})
        )
      }
    }' >"$TEMP_INSTALL_MANIFEST"
mv -- "$TEMP_INSTALL_MANIFEST" "$PLUGIN_DEST/install-manifest.json"

bash "$PLUGIN_DEST/scripts/read-shepherd-task-version.sh" >/dev/null
PUBLISHED=1

echo "Installed shepherd-task $SHEPHERD_TASK_VERSION."
echo "  Plugin: $PLUGIN_DEST"
echo "  Skills: ${#SKILLS[@]} replaced as one lineup"
echo "  Manifest: $PLUGIN_DEST/install-manifest.json"
echo ""
echo "Verify with: copilot skill list"
