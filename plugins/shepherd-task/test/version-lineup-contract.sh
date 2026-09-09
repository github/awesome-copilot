#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

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
  "./test/",
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
while IFS= read -r plugin_ref; do
    plugin_path="$plugin_root/${plugin_ref#./}"
    if [[ -d "$plugin_path" ]]; then
        while IFS= read -r script; do
            [[ "$(grep -Fxc "$marker" "$script" || true)" == 1 ]]
        done < <(find "$plugin_path" -type f \( -name '*.sh' -o -name '*.ps1' \) -print)
    elif [[ "$plugin_path" == *.sh || "$plugin_path" == *.ps1 ]]; then
        [[ "$(grep -Fxc "$marker" "$plugin_path" || true)" == 1 ]]
    fi
done < <(
    jq -r '.extensions["com.github.awesome-copilot"].pluginFiles[]' \
        "$plugin_root/plugin.json"
)
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
for installed_driver in \
    "$COPILOT_HOME/plugins/shepherd-task/test/simple-math/run-campaign.sh" \
    "$COPILOT_HOME/plugins/shepherd-task/test/simple-math/run-campaign.ps1" \
    "$COPILOT_HOME/plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/run-campaign.sh" \
    "$COPILOT_HOME/plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/run-campaign.ps1"; do
    [[ -f "$installed_driver" ]] || {
        echo "Installed campaign driver is missing: $installed_driver" >&2
        exit 1
    }
done
[[ -x "$COPILOT_HOME/plugins/shepherd-task/test/simple-math/run-campaign.sh" ]]
[[ -x "$COPILOT_HOME/plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/run-campaign.sh" ]]

mock_bin="$temp_root/mock-bin"
mkdir -p "$mock_bin"
cat >"$mock_bin/gh" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == "auth status" ]]; then
    exit 0
fi
echo "Unexpected gh invocation during installed-only validation: $*" >&2
exit 91
EOF
cat >"$mock_bin/copilot" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == "skill list" ]]; then
    cat <<'SKILLS'
shepherd-task-20-create-issues-from-plan
shepherd-task-30-from-assignment-to-ready
shepherd-task-40-from-ready-to-merged-to-base
shepherd-task-50-create-post-mortem
SKILLS
    exit 0
fi
echo "Unexpected copilot invocation during installed-only validation: $*" >&2
exit 92
EOF
chmod +x "$mock_bin/gh" "$mock_bin/copilot"
validation_workareas="$temp_root/validation-workareas"
mkdir -p "$validation_workareas"
(
    cd "$temp_root"
    if ! PATH="$mock_bin:$PATH" \
        "$COPILOT_HOME/plugins/shepherd-task/test/simple-math/run-campaign.sh" \
        https://github.com/owner/simple-math-validation \
        "$validation_workareas" \
        --validate-installed-only >/dev/null; then
        echo "Installed simple-math Bash driver validation failed." >&2
        exit 1
    fi
    if ! PATH="$mock_bin:$PATH" \
        "$COPILOT_HOME/plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/run-campaign.sh" \
        https://github.com/owner/cargotracker-validation \
        "$validation_workareas" \
        --validate-installed-only >/dev/null; then
        echo "Installed Cargo Tracker Bash driver validation failed." >&2
        exit 1
    fi
)
[[ ! -e "$validation_workareas/simple-math-validation-shepherd-target" ]]
[[ ! -e "$validation_workareas/cargotracker-validation-shepherd-target" ]]

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
