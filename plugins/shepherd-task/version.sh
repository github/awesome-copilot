#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_MANIFEST="$PLUGIN_ROOT/plugin.json"
VERSION_CONTRACT="$PLUGIN_ROOT/shepherd-task-version-contract.json"
MCP_MANIFEST="$PLUGIN_ROOT/mcp.json"
SEMVER_PATTERN='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'

usage() {
    cat >&2 <<EOF
Usage:
  $0
  $0 -incrementMicro
  $0 -incrementMinor
  $0 -incrementMajor
  $0 -newSchemaVersion <SemVer>
EOF
}

fail() {
    echo "Error: $1" >&2
    usage
    exit 1
}

command -v jq >/dev/null 2>&1 || fail "Required command 'jq' was not found."
[[ -f "$PLUGIN_MANIFEST" ]] || fail "Plugin manifest not found: $PLUGIN_MANIFEST"
[[ -f "$VERSION_CONTRACT" ]] || fail "Version contract not found: $VERSION_CONTRACT"

read_plugin_version() {
    jq -er '.version | select(type == "string")' "$PLUGIN_MANIFEST"
}

read_schema_version() {
    jq -er '
      ."$schema" |
      capture("^https://agent-plugins\\.org/schemas/(?<version>[^/]+)/plugin\\.schema\\.json$").version
    ' "$PLUGIN_MANIFEST"
}

validate_semver() {
    [[ "$1" =~ $SEMVER_PATTERN ]]
}

collect_estate_version_files() {
    local repo_root="$1"
    local skill_ref skill_path plugin_ref plugin_path

    while IFS= read -r skill_ref; do
        skill_path="${skill_ref#./}"
        printf '%s\n' "$repo_root/$skill_path/SKILL.md"
    done < <(
        jq -er '.extensions["com.github.awesome-copilot"].skills[]' "$PLUGIN_MANIFEST"
    )

    while IFS= read -r plugin_ref; do
        [[ "$plugin_ref" == ./* && "$plugin_ref" != *\\* &&
            "$plugin_ref" != *"/../"* && "$plugin_ref" != "./.."* ]] ||
            fail "Invalid shepherd-task pluginFiles reference: $plugin_ref"
        plugin_path="$PLUGIN_ROOT/${plugin_ref#./}"
        if [[ -d "$plugin_path" ]]; then
            find "$plugin_path" -type f \( -name '*.sh' -o -name '*.ps1' \) -print
        elif [[ "$plugin_path" == *.sh || "$plugin_path" == *.ps1 ]]; then
            printf '%s\n' "$plugin_path"
        fi
    done < <(
        jq -er '.extensions["com.github.awesome-copilot"].pluginFiles[]' "$PLUGIN_MANIFEST"
    )
}

assert_estate_version_stamps() {
    local repo_root="$1"
    local expected_version="$2"
    local file count
    local -a files
    mapfile -t files < <(collect_estate_version_files "$repo_root" | sort -u)
    ((${#files[@]} > 0)) ||
        fail "The shepherd-task estate contains no versioned scripts or skills."

    for file in "${files[@]}"; do
        [[ -f "$file" ]] ||
            fail "Declared shepherd-task estate file is missing: $file"
        count="$(grep -Fxc "# shepherd-task-version: $expected_version" "$file" || true)"
        [[ "$count" == 1 ]] ||
            fail "Expected exactly one '# shepherd-task-version: $expected_version' marker in $file."
    done
}

update_estate_version_stamps() {
    local repo_root="$1"
    local current_version="$2"
    local next_version="$3"
    local file temporary index
    local -a files temporaries
    mapfile -t files < <(collect_estate_version_files "$repo_root" | sort -u)
    assert_estate_version_stamps "$repo_root" "$current_version"

    for file in "${files[@]}"; do
        temporary="$file.shepherd-task-version.$$"
        awk \
            -v current="# shepherd-task-version: $current_version" \
            -v replacement="# shepherd-task-version: $next_version" \
            '{ print ($0 == current ? replacement : $0) }' \
            "$file" >"$temporary"
        chmod --reference="$file" "$temporary"
        temporaries+=("$temporary")
    done

    for index in "${!files[@]}"; do
        mv -- "${temporaries[$index]}" "${files[$index]}"
    done
}

assert_source_checkout() {
    command -v git >/dev/null 2>&1 ||
        fail "Mutating version operations require Git and a shepherd-task source checkout."

    local repo_root expected_plugin_root
    repo_root="$(git -C "$PLUGIN_ROOT" rev-parse --show-toplevel 2>/dev/null)" ||
        fail "Version increments must run from the shepherd-task source checkout, not an installed copy."
    repo_root="$(cd "$repo_root" && pwd -P)"
    expected_plugin_root="$repo_root/plugins/shepherd-task"
    [[ "$PLUGIN_ROOT" == "$expected_plugin_root" ]] ||
        fail "Version increments must run from '$expected_plugin_root', not '$PLUGIN_ROOT'."

    git -C "$repo_root" ls-files --error-unmatch \
        "plugins/shepherd-task/plugin.json" >/dev/null 2>&1 ||
        fail "The source plugin manifest is not tracked by the current Git repository."

    local skill_ref skill_path
    while IFS= read -r skill_ref; do
        skill_path="${skill_ref#./}"
        [[ -f "$repo_root/$skill_path/SKILL.md" ]] ||
            fail "Declared shepherd-task source skill is missing: $repo_root/$skill_path/SKILL.md"
    done < <(
        jq -er '.extensions["com.github.awesome-copilot"].skills[]' "$PLUGIN_MANIFEST"
    )

    local plugin_ref plugin_path
    while IFS= read -r plugin_ref; do
        [[ "$plugin_ref" == ./* && "$plugin_ref" != *\\* &&
            "$plugin_ref" != *"/../"* && "$plugin_ref" != "./.."* ]] ||
            fail "Invalid shepherd-task pluginFiles reference: $plugin_ref"
        plugin_path="$PLUGIN_ROOT/${plugin_ref#./}"
        [[ -e "$plugin_path" ]] ||
            fail "Declared shepherd-task plugin file is missing: $plugin_path"
    done < <(
        jq -er '.extensions["com.github.awesome-copilot"].pluginFiles[]' "$PLUGIN_MANIFEST"
    )
}

write_json_atomically() {
    local target="$1"
    local filter="$2"
    shift 2
    local temporary="$target.tmp.$$"
    if jq "$@" "$filter" "$target" >"$temporary"; then
        mv -- "$temporary" "$target"
    else
        rm -f -- "$temporary"
        return 1
    fi
}

print_version_information() {
    local plugin_version schema_version
    plugin_version="$(read_plugin_version)" ||
        fail "plugin.json does not contain a string version."
    validate_semver "$plugin_version" ||
        fail "Plugin version '$plugin_version' is not valid Semantic Versioning."
    schema_version="$(read_schema_version)" ||
        fail "plugin.json has an unsupported Agent Plugins schema URL."
    validate_semver "$schema_version" ||
        fail "Agent Plugins schema version '$schema_version' is not valid Semantic Versioning."

    jq -e '
      .schemaVersion == 1 and
      (.stageOutcomeProtocolVersion | type == "number" and floor == . and . >= 1) and
      (.artifactSchemaVersions | type == "object") and
      all(.artifactSchemaVersions[]; type == "number" and floor == . and . >= 1)
    ' "$VERSION_CONTRACT" >/dev/null ||
        fail "shepherd-task-version-contract.json is invalid."

    echo "Shepherd-task version information"
    echo "  Lineup version:                  $plugin_version"
    echo "  Agent Plugins schema version:    $schema_version"
    echo "  Version contract schema version: $(jq -r '.schemaVersion' "$VERSION_CONTRACT")"
    echo "  Stage outcome protocol version:  $(jq -r '.stageOutcomeProtocolVersion' "$VERSION_CONTRACT")"
    echo "  Artifact schema versions:"
    jq -r '.artifactSchemaVersions | to_entries[] | "    \(.key): \(.value)"' "$VERSION_CONTRACT"
}

increment_version() {
    local segment="$1"
    local current major minor micro next repo_root plugin_temporary
    assert_source_checkout
    repo_root="$(git -C "$PLUGIN_ROOT" rev-parse --show-toplevel)"
    current="$(read_plugin_version)" ||
        fail "plugin.json does not contain a string version."
    validate_semver "$current" ||
        fail "Plugin version '$current' is not valid Semantic Versioning."
    IFS=. read -r major minor micro <<<"${current%%[-+]*}"

    case "$segment" in
        micro)
            micro=$((10#$micro + 1))
            ;;
        minor)
            minor=$((10#$minor + 1))
            micro=0
            ;;
        major)
            major=$((10#$major + 1))
            minor=0
            micro=0
            ;;
        *)
            fail "Unknown version segment '$segment'."
            ;;
    esac
    next="$major.$minor.$micro"
    plugin_temporary="$PLUGIN_MANIFEST.tmp.$$"
    jq --arg version "$next" '.version = $version' "$PLUGIN_MANIFEST" >"$plugin_temporary" ||
        fail "Could not prepare the shepherd-task plugin version update."
    update_estate_version_stamps "$repo_root" "$current" "$next"
    mv -- "$plugin_temporary" "$PLUGIN_MANIFEST"
    echo "Incremented shepherd-task lineup version: $current -> $next"
    print_version_information
}

set_schema_version() {
    local requested="$1"
    assert_source_checkout
    validate_semver "$requested" ||
        fail "Schema version '$requested' is not valid Semantic Versioning."
    local current
    current="$(read_schema_version)" ||
        fail "plugin.json has an unsupported Agent Plugins schema URL."

    write_json_atomically \
        "$PLUGIN_MANIFEST" \
        '."$schema" = $schema' \
        --arg schema "https://agent-plugins.org/schemas/$requested/plugin.schema.json"
    if [[ -f "$MCP_MANIFEST" ]]; then
        write_json_atomically \
            "$MCP_MANIFEST" \
            '."$schema" = $schema' \
            --arg schema "https://agent-plugins.org/schemas/$requested/mcp.schema.json"
    fi
    echo "Updated Agent Plugins schema version: $current -> $requested"
    print_version_information
}

case $# in
    0)
        print_version_information
        ;;
    1)
        case "$1" in
            -incrementMicro)
                increment_version micro
                ;;
            -incrementMinor)
                increment_version minor
                ;;
            -incrementMajor)
                increment_version major
                ;;
            -newSchemaVersion)
                fail "-newSchemaVersion requires a Semantic Versioning value."
                ;;
            *)
                fail "Unknown argument '$1'."
                ;;
        esac
        ;;
    2)
        [[ "$1" == "-newSchemaVersion" ]] ||
            fail "Only -newSchemaVersion accepts a value."
        set_schema_version "$2"
        ;;
    *)
        fail "Expected no arguments, one increment option, or -newSchemaVersion <SemVer>."
        ;;
esac
