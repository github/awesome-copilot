#!/usr/bin/env bash

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
    local current major minor micro next
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
    write_json_atomically "$PLUGIN_MANIFEST" '.version = $version' --arg version "$next"
    echo "Incremented shepherd-task lineup version: $current -> $next"
    print_version_information
}

set_schema_version() {
    local requested="$1"
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
