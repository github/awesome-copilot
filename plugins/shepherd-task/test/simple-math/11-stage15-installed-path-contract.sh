#!/usr/bin/env bash
# shepherd-task-version: 1.0.3

set -euo pipefail

fixture_root="$(cd "$(dirname "$0")" && pwd)"
scripts_directory="$(cd "$fixture_root/../../scripts" && pwd -P)"
preparation_script="$scripts_directory/shepherd-task-15-prepare-create-issues.sh"
temp_directory="$(mktemp -d "$fixture_root/.stage15-installed-contract.XXXXXX")"
campaign_directory_name="1-stage15-installed-remove-before-merge"
campaign_directory="$temp_directory/$campaign_directory_name"

cleanup() {
    rm -rf "$temp_directory"
}
trap cleanup EXIT

fail() {
    echo "Error: $*" >&2
    exit 1
}

for command_name in git grep find; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done
[[ -x "$preparation_script" ]] ||
    fail "Installed Stage 15 script was not found: $preparation_script"

mkdir -p "$campaign_directory"
git -C "$temp_directory" init --quiet
git -C "$temp_directory" remote add origin https://github.com/owner/repository.git

cat >"$campaign_directory/shepherd-campaign.json" <<'EOF'
{
  "schemaVersion": 1,
  "campaignId": "12345678-1234-4123-8123-123456789abc",
  "campaignIssueNumber": 1,
  "campaignShortname": "stage15-installed",
  "repository": "owner/repository",
  "baseBranch": "experiment/stage15-installed",
  "lessonPropagation": "off",
  "campaignMetadataDirectory": "1-stage15-installed-remove-before-merge"
}
EOF

cat >"$campaign_directory/math-tool-ignorance-reduction-plan.md" <<'EOF'
## Ignorance reduction

### Question

Resolution: Resolved.

## Implementation

### First task

### Second task
EOF

(
    cd "$temp_directory"
    "$preparation_script" "$campaign_directory_name" >/dev/null
)

prompt_file="$(
    find "$campaign_directory/prompts" -type f \
        -name '*-invoke-shepherd-task-20-create-issues-from-plan-skill.md'
)"
invocation_file="$(
    find "$campaign_directory/prompts" -type f \
        -name '*-invoke-shepherd-task-20-create-issues-from-plan-skill.sh'
)"
[[ -f "$prompt_file" && -x "$invocation_file" ]] ||
    fail "Installed Stage 15 did not generate both Bash artifacts."

grep -Fq -- "- DRAFT_VALIDATOR: $scripts_directory/validate-stage20-drafts.sh" "$prompt_file" ||
    fail "Installed Stage 15 emitted a noncanonical draft-validator path."
grep -Fq -- "- ISSUE_BODY_VERIFIER: $scripts_directory/verify-github-issue-body.sh" "$prompt_file" ||
    fail "Installed Stage 15 emitted a noncanonical issue-body-verifier path."
grep -Fq -- "$scripts_directory/redact-secrets.sh" "$invocation_file" ||
    fail "Installed Stage 15 invocation does not use the installed redactor."
grep -Fq -- "$scripts_directory/assert-stage20-result.sh" "$invocation_file" ||
    fail "Installed Stage 15 invocation does not use the installed result assertion."

echo 'Simple-math Bash installed Stage 15 path contract tests passed.'
