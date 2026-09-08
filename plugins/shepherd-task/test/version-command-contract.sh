#!/usr/bin/env bash

set -euo pipefail

test_root="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$test_root/.." && pwd)"
temp_root="$(mktemp -d)"
trap 'rm -rf "$temp_root"' EXIT
current_version="$(jq -r '.version' "$plugin_root/plugin.json")"
current_schema_version="$(
    jq -r '."$schema"' "$plugin_root/plugin.json" |
        sed -n 's#^.*/schemas/\([^/]*\)/plugin\.schema\.json$#\1#p'
)"

copy_installed_plugin() {
    local destination="$1"
    mkdir -p "$destination"
    cp "$plugin_root/plugin.json" "$destination/plugin.json"
    cp "$plugin_root/shepherd-task-version-contract.json" "$destination/shepherd-task-version-contract.json"
    cp "$plugin_root/version.sh" "$destination/version.sh"
    chmod +x "$destination/version.sh"
}

create_source_checkout() {
    local destination="$1"
    local source_plugin="$destination/plugins/shepherd-task"
    mkdir -p "$source_plugin"
    cp "$plugin_root/plugin.json" "$source_plugin/plugin.json"
    cp "$plugin_root/shepherd-task-version-contract.json" "$source_plugin/shepherd-task-version-contract.json"
    cp "$plugin_root/version.sh" "$source_plugin/version.sh"
    chmod +x "$source_plugin/version.sh"
    while IFS= read -r skill_ref; do
        local skill_path="${skill_ref#./}"
        mkdir -p "$destination/$skill_path"
        printf '%s\n' '---' "name: $(basename "$skill_path")" \
            "description: Contract fixture for $(basename "$skill_path")." '---' \
            >"$destination/$skill_path/SKILL.md"
    done < <(jq -r '.extensions["com.github.awesome-copilot"].skills[]' "$source_plugin/plugin.json")
    git -C "$destination" init --quiet
    git -C "$destination" add plugins/shepherd-task/plugin.json skills
}

copy_installed_plugin "$temp_root/installed"
output="$("$temp_root/installed/version.sh")"
grep -Fq "Lineup version:                  $current_version" <<<"$output"
grep -Fq "Agent Plugins schema version:    $current_schema_version" <<<"$output"
cp "$temp_root/installed/plugin.json" "$temp_root/installed/plugin.before"
if "$temp_root/installed/version.sh" -incrementMicro >"$temp_root/installed/error.out" 2>&1; then
    echo 'Bash version command mutated an installed copy.' >&2
    exit 1
fi
grep -Fq 'must run from the shepherd-task source checkout' "$temp_root/installed/error.out"
cmp "$temp_root/installed/plugin.before" "$temp_root/installed/plugin.json"

create_source_checkout "$temp_root/micro"
"$temp_root/micro/plugins/shepherd-task/version.sh" -incrementMicro >/dev/null
current_core="${current_version%%[-+]*}"
IFS=. read -r current_major current_minor current_micro <<<"$current_core"
expected_micro="$current_major.$current_minor.$((10#$current_micro + 1))"
[[ "$(jq -r '.version' "$temp_root/micro/plugins/shepherd-task/plugin.json")" == "$expected_micro" ]]

create_source_checkout "$temp_root/minor"
jq '.version = "2.7.9-beta.2+build.5"' "$temp_root/minor/plugins/shepherd-task/plugin.json" >"$temp_root/minor/plugin.json.tmp"
mv "$temp_root/minor/plugin.json.tmp" "$temp_root/minor/plugins/shepherd-task/plugin.json"
"$temp_root/minor/plugins/shepherd-task/version.sh" -incrementMinor >/dev/null
[[ "$(jq -r '.version' "$temp_root/minor/plugins/shepherd-task/plugin.json")" == "2.8.0" ]]

create_source_checkout "$temp_root/major"
jq '.version = "2.7.9"' "$temp_root/major/plugins/shepherd-task/plugin.json" >"$temp_root/major/plugin.json.tmp"
mv "$temp_root/major/plugin.json.tmp" "$temp_root/major/plugins/shepherd-task/plugin.json"
"$temp_root/major/plugins/shepherd-task/version.sh" -incrementMajor >/dev/null
[[ "$(jq -r '.version' "$temp_root/major/plugins/shepherd-task/plugin.json")" == "3.0.0" ]]

create_source_checkout "$temp_root/schema"
cat >"$temp_root/schema/plugins/shepherd-task/mcp.json" <<'EOF'
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {}
}
EOF
"$temp_root/schema/plugins/shepherd-task/version.sh" -newSchemaVersion 2.1.0 >/dev/null
[[ "$(jq -r '."$schema"' "$temp_root/schema/plugins/shepherd-task/plugin.json")" == \
    "https://agent-plugins.org/schemas/2.1.0/plugin.schema.json" ]]
[[ "$(jq -r '."$schema"' "$temp_root/schema/plugins/shepherd-task/mcp.json")" == \
    "https://agent-plugins.org/schemas/2.1.0/mcp.schema.json" ]]

cp "$temp_root/schema/plugins/shepherd-task/plugin.json" "$temp_root/schema/plugin.before"
if "$temp_root/schema/plugins/shepherd-task/version.sh" -newSchemaVersion 01.0.0 >/dev/null 2>&1; then
    echo 'Bash version command accepted invalid Semantic Versioning.' >&2
    exit 1
fi
cmp "$temp_root/schema/plugin.before" "$temp_root/schema/plugins/shepherd-task/plugin.json"

if "$temp_root/schema/plugins/shepherd-task/version.sh" -incrementMicro -incrementMinor >/dev/null 2>&1; then
    echo 'Bash version command accepted conflicting operations.' >&2
    exit 1
fi

echo 'Bash shepherd-task version command contract tests passed.'
