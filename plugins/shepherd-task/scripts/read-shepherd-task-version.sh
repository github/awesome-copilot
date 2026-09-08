#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_MANIFEST="$PLUGIN_ROOT/plugin.json"
VERSION_CONTRACT="$PLUGIN_ROOT/shepherd-task-version-contract.json"
INSTALL_MANIFEST="$PLUGIN_ROOT/install-manifest.json"

for command in jq; do
    command -v "$command" >/dev/null 2>&1 || {
        echo "Error: Required command '$command' was not found." >&2
        exit 1
    }
done

[[ -f "$PLUGIN_MANIFEST" ]] || {
    echo "Error: Shepherd-task plugin manifest not found: $PLUGIN_MANIFEST" >&2
    exit 1
}
[[ -f "$VERSION_CONTRACT" ]] || {
    echo "Error: Shepherd-task version contract not found: $VERSION_CONTRACT" >&2
    exit 1
}

jq -e '
  (.version | type == "string" and test("^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$"))
' "$PLUGIN_MANIFEST" >/dev/null || {
    echo "Error: Shepherd-task plugin version is missing or is not Semantic Versioning." >&2
    exit 1
}

jq -e '
  .schemaVersion == 1 and
  (.stageOutcomeProtocolVersion | type == "number" and . >= 1 and floor == .) and
  (.artifactSchemaVersions.campaign | type == "number" and . >= 1 and floor == .) and
  (.artifactSchemaVersions.givenListRun | type == "number" and . >= 1 and floor == .) and
  (.artifactSchemaVersions.installationManifest | type == "number" and . >= 1 and floor == .) and
  (.artifactSchemaVersions.installedComponent | type == "number" and . >= 1 and floor == .)
' "$VERSION_CONTRACT" >/dev/null || {
    echo "Error: Shepherd-task version contract is invalid." >&2
    exit 1
}

SHEPHERD_TASK_VERSION="$(jq -r '.version' "$PLUGIN_MANIFEST")"
INSTALLATION_MANIFEST_SCHEMA_VERSION="$(jq -r '.artifactSchemaVersions.installationManifest' "$VERSION_CONTRACT")"
EXPECTED_SKILLS='[
  "shepherd-task-10-create-ignorance-reduction-plan",
  "shepherd-task-20-create-issues-from-plan",
  "shepherd-task-30-from-assignment-to-ready",
  "shepherd-task-40-from-ready-to-merged-to-base",
  "shepherd-task-50-create-post-mortem",
  "shepherd-task-approve-workflows-and-wait-for-completion"
]'

if [[ -f "$INSTALL_MANIFEST" ]]; then
    jq -e \
        --arg version "$SHEPHERD_TASK_VERSION" \
        --argjson schemaVersion "$INSTALLATION_MANIFEST_SCHEMA_VERSION" \
        --argjson expectedSkills "$EXPECTED_SKILLS" \
        '
          .schemaVersion == $schemaVersion and
          .shepherdTaskVersion == $version and
          (.components.plugin.shepherdTaskVersion == $version) and
          ([.components.skills[].name] == $expectedSkills) and
          all(.components.skills[]; .shepherdTaskVersion == $version)
        ' "$INSTALL_MANIFEST" >/dev/null || {
        echo "Error: Installed shepherd-task components do not match plugin version $SHEPHERD_TASK_VERSION." >&2
        exit 1
    }
    for skill in $(jq -r '.[]' <<<"$EXPECTED_SKILLS"); do
        component_manifest="$PLUGIN_ROOT/skills/$skill/shepherd-task-component.json"
        jq -e \
            --arg version "$SHEPHERD_TASK_VERSION" \
            --arg component "$skill" \
            '.shepherdTaskVersion == $version and .component == $component' \
            "$component_manifest" >/dev/null 2>&1 || {
            echo "Error: Installed shepherd-task skill '$skill' does not match plugin version $SHEPHERD_TASK_VERSION." >&2
            exit 1
        }
    done
fi

jq -n \
    --arg shepherdTaskVersion "$SHEPHERD_TASK_VERSION" \
    --slurpfile contract "$VERSION_CONTRACT" \
    '{
      shepherdTaskVersion: $shepherdTaskVersion,
      versionContractSchemaVersion: $contract[0].schemaVersion,
      stageOutcomeProtocolVersion: $contract[0].stageOutcomeProtocolVersion,
      artifactSchemaVersions: $contract[0].artifactSchemaVersions
    }'
