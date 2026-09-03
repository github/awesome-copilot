#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PREPARATION_SCRIPT="$SCRIPT_DIR/../../scripts/shepherd-task-15-prepare-create-issues.sh"
TEMP_DIRECTORY="$(mktemp -d)"
CAMPAIGN_DIRECTORY_NAME="1-stage15-contract-remove-before-merge"
CAMPAIGN_DIRECTORY="$TEMP_DIRECTORY/$CAMPAIGN_DIRECTORY_NAME"

cleanup() {
    rm -rf -- "$TEMP_DIRECTORY"
}
trap cleanup EXIT

mkdir -p -- "$CAMPAIGN_DIRECTORY"
git -C "$TEMP_DIRECTORY" init --quiet
git -C "$TEMP_DIRECTORY" remote add origin https://github.com/owner/repository.git

cat >"$CAMPAIGN_DIRECTORY/shepherd-campaign.json" <<'EOF'
{
  "schemaVersion": 1,
  "campaignId": "12345678-1234-4123-8123-123456789abc",
  "campaignIssueNumber": 1,
  "campaignShortname": "stage15-contract",
  "repository": "owner/repository",
  "baseBranch": "experiment/stage15-contract",
  "lessonPropagation": "off",
  "campaignMetadataDirectory": "1-stage15-contract-remove-before-merge"
}
EOF

cat >"$CAMPAIGN_DIRECTORY/cargotracker-ignorance-reduction-plan.md" <<'EOF'
## Ignorance reduction

### Question

Resolution: Resolved.

## Phase 4 — Implementation (five serial issues)

### 4.1 — First task

### 4.2 — Second task

### 4.3 — Third task

### 4.4 — Fourth task

### 4.5 — Fifth task

## Phase 5 — Documentation and implementation handoff

Document the completed work.
EOF

output="$(
    cd "$TEMP_DIRECTORY"
    "$PREPARATION_SCRIPT" "$CAMPAIGN_DIRECTORY_NAME"
)"

grep -Fq 'Implementation section:      ## Phase 4 — Implementation (five serial issues)' <<<"$output"
grep -Fq 'Implementation tasks:        5' <<<"$output"

prompt_file="$(
    find "$CAMPAIGN_DIRECTORY/prompts" -type f \
        -name '*-invoke-shepherd-task-20-create-issues-from-plan-skill.md'
)"
[[ -f "$prompt_file" ]]
grep -Fq -- '- IMPLEMENTATION_SECTION: ## Phase 4 — Implementation (five serial issues)' "$prompt_file"
grep -Fq -- '- EXPECTED_TASK_COUNT: 5' "$prompt_file"

echo 'Cargo Tracker Bash stage-15 plan-discovery contract tests passed.'
