#!/usr/bin/env bash

set -euo pipefail

test_root="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$test_root/.." && pwd)"
installer="$plugin_root/scripts/install-task-shepherd.sh"
version_reader="$plugin_root/scripts/read-shepherd-task-version.sh"
temp_root="$(mktemp -d)"
trap 'rm -rf "$temp_root"' EXIT

expected_skills='[
  "./skills/shepherd-task-10-create-ignorance-reduction-plan/",
  "./skills/shepherd-task-20-create-issues-from-plan/",
  "./skills/shepherd-task-30-from-assignment-to-ready/",
  "./skills/shepherd-task-40-from-ready-to-merged-to-base/",
  "./skills/shepherd-task-50-create-post-mortem/",
  "./skills/shepherd-task-approve-workflows-and-wait-for-completion/"
]'
expected_plugin_files='[
  "./scripts/",
  "./shepherd-task-version-contract.json",
  "./version.ps1",
  "./version.sh"
]'
jq -e \
    --argjson expectedSkills "$expected_skills" \
    --argjson expectedPluginFiles "$expected_plugin_files" \
    '
      .extensions["com.github.awesome-copilot"].skills == $expectedSkills and
      .extensions["com.github.awesome-copilot"].pluginFiles == $expectedPluginFiles
    ' \
    "$plugin_root/plugin.json" >/dev/null

version_info="$(bash "$version_reader")"
version="$(jq -r '.shepherdTaskVersion' <<<"$version_info")"
[[ "$version" == "$(jq -r '.version' "$plugin_root/plugin.json")" ]]
[[ "$(jq -r '.artifactSchemaVersions.campaign' <<<"$version_info")" == "1" ]]
[[ "$(jq -r '.artifactSchemaVersions.givenListRun' <<<"$version_info")" == "1" ]]

marker="# shepherd-task-version: $version"
while IFS= read -r script; do
    [[ "$(grep -Fxc "$marker" "$script" || true)" == 1 ]]
done < <(find "$plugin_root/scripts" -type f \( -name '*.sh' -o -name '*.ps1' \) -print)
[[ "$(grep -Fxc "$marker" "$plugin_root/version.sh" || true)" == 1 ]]
[[ "$(grep -Fxc "$marker" "$plugin_root/version.ps1" || true)" == 1 ]]
for skill_ref in $(jq -r '.extensions["com.github.awesome-copilot"].skills[]' "$plugin_root/plugin.json"); do
    skill_path="${skill_ref#./}"
    [[ "$(grep -Fxc "$marker" "$plugin_root/../../$skill_path/SKILL.md" || true)" == 1 ]]
done

grep -Fq 'read-shepherd-task-version.sh' "$plugin_root/scripts/shepherd-task-00-init-campaign.sh"
grep -Fq 'createdBy:' "$plugin_root/scripts/shepherd-task-00-init-campaign.sh"
grep -Fq 'stageOutcomeProtocolVersion:' "$plugin_root/scripts/shepherd-task-25-given-list.sh"

export COPILOT_HOME="$temp_root/copilot-home"
bash "$installer" >/dev/null

install_manifest="$COPILOT_HOME/plugins/shepherd-task/install-manifest.json"
jq -e --arg version "$version" '
  .shepherdTaskVersion == $version and
  .components.plugin.shepherdTaskVersion == $version and
  (.components.skills | length == 6) and
  all(.components.skills[]; .shepherdTaskVersion == $version)
' "$install_manifest" >/dev/null

for skill_ref in $(jq -r '.extensions["com.github.awesome-copilot"].skills[]' "$plugin_root/plugin.json"); do
    skill="${skill_ref#./skills/}"
    skill="${skill%/}"
    for skill_root in \
        "$COPILOT_HOME/plugins/shepherd-task/skills/$skill" \
        "$COPILOT_HOME/skills/$skill"; do
        [[ -f "$skill_root/SKILL.md" ]]
        jq -e \
            --arg version "$version" \
            --arg skill "$skill" \
            '.shepherdTaskVersion == $version and .component == $skill' \
            "$skill_root/shepherd-task-component.json" >/dev/null
    done
done

sentinel="$COPILOT_HOME/skills/shepherd-task-10-create-ignorance-reduction-plan/stale-file"
touch "$sentinel"
bash "$installer" >/dev/null
[[ ! -e "$sentinel" ]]

jq '.shepherdTaskVersion = "9.0.0"' "$install_manifest" >"$install_manifest.tmp"
mv "$install_manifest.tmp" "$install_manifest"
if bash "$installer" >"$temp_root/downgrade.out" 2>&1; then
    echo "Installer accepted an accidental downgrade." >&2
    exit 1
fi
grep -Fq 'Refusing to downgrade shepherd-task from 9.0.0' "$temp_root/downgrade.out"
bash "$installer" --allow-downgrade >/dev/null
jq -e --arg version "$version" '.shepherdTaskVersion == $version' "$install_manifest" >/dev/null

if find "$COPILOT_HOME" -maxdepth 1 \
    \( -name '.shepherd-task-install.*' -o -name '.shepherd-task-backup.*' \) |
    grep -q .; then
    echo "Installer left staging or backup directories behind." >&2
    exit 1
fi

echo "Bash shepherd-task version lineup contract tests passed."
