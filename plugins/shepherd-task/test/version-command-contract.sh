#!/usr/bin/env bash
# shepherd-task-version: 1.0.0

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
    while IFS= read -r plugin_ref; do
        local relative_path="${plugin_ref#./}"
        mkdir -p "$destination/$(dirname "$relative_path")"
        cp -R "$plugin_root/$relative_path" "$destination/$relative_path"
    done < <(jq -r '.extensions["com.github.awesome-copilot"].pluginFiles[]' "$plugin_root/plugin.json")
    chmod +x "$destination/version.sh"
}

create_source_checkout() {
    local destination="$1"
    local fixture_version="${2:-$current_version}"
    local source_plugin="$destination/plugins/shepherd-task"
    mkdir -p "$source_plugin"
    copy_installed_plugin "$source_plugin"
    jq --arg version "$fixture_version" '.version = $version' \
        "$source_plugin/plugin.json" >"$source_plugin/plugin.json.tmp"
    mv "$source_plugin/plugin.json.tmp" "$source_plugin/plugin.json"
    while IFS= read -r file; do
        sed -i "s/^# shepherd-task-version: $current_version$/# shepherd-task-version: $fixture_version/" "$file"
    done < <(find "$source_plugin" -type f \( -name '*.sh' -o -name '*.ps1' \) -print)
    while IFS= read -r skill_ref; do
        local skill_path="${skill_ref#./}"
        mkdir -p "$destination/$skill_path"
        printf '%s\n' '---' "# shepherd-task-version: $fixture_version" \
            "name: $(basename "$skill_path")" \
            "description: Contract fixture for $(basename "$skill_path")." '---' \
            >"$destination/$skill_path/SKILL.md"
    done < <(jq -r '.extensions["com.github.awesome-copilot"].skills[]' "$source_plugin/plugin.json")
    git -C "$destination" init --quiet
    git -C "$destination" add plugins/shepherd-task skills
}

assert_fixture_stamps() {
    local destination="$1"
    local expected_version="$2"
    local marker="# shepherd-task-version: $expected_version"
    local source_plugin="$destination/plugins/shepherd-task"
    local file skill_ref skill_path
    while IFS= read -r plugin_ref; do
        plugin_path="$source_plugin/${plugin_ref#./}"
        if [[ -d "$plugin_path" ]]; then
            while IFS= read -r file; do
                [[ "$(grep -Fxc "$marker" "$file" || true)" == 1 ]]
            done < <(find "$plugin_path" -type f \( -name '*.sh' -o -name '*.ps1' \) -print)
        elif [[ "$plugin_path" == *.sh || "$plugin_path" == *.ps1 ]]; then
            [[ "$(grep -Fxc "$marker" "$plugin_path" || true)" == 1 ]]
        fi
    done < <(
        jq -r '.extensions["com.github.awesome-copilot"].pluginFiles[]' \
            "$source_plugin/plugin.json"
    )
    while IFS= read -r skill_ref; do
        skill_path="${skill_ref#./}"
        [[ "$(grep -Fxc "$marker" "$destination/$skill_path/SKILL.md" || true)" == 1 ]]
    done < <(jq -r '.extensions["com.github.awesome-copilot"].skills[]' "$source_plugin/plugin.json")
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
assert_fixture_stamps "$temp_root/micro" "$expected_micro"

create_source_checkout "$temp_root/minor" "2.7.9-beta.2+build.5"
"$temp_root/minor/plugins/shepherd-task/version.sh" -incrementMinor >/dev/null
[[ "$(jq -r '.version' "$temp_root/minor/plugins/shepherd-task/plugin.json")" == "2.8.0" ]]
assert_fixture_stamps "$temp_root/minor" "2.8.0"

create_source_checkout "$temp_root/major" "2.7.9"
"$temp_root/major/plugins/shepherd-task/version.sh" -incrementMajor >/dev/null
[[ "$(jq -r '.version' "$temp_root/major/plugins/shepherd-task/plugin.json")" == "3.0.0" ]]
assert_fixture_stamps "$temp_root/major" "3.0.0"

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
assert_fixture_stamps "$temp_root/schema" "$current_version"

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
