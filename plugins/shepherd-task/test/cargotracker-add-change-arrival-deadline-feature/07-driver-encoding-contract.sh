#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

fixture_root="$(cd "$(dirname "$0")" && pwd)"
driver="$fixture_root/run-campaign.sh"
skill_list_helper="$fixture_root/get-copilot-skill-list.sh"
temp_directory="$(mktemp -d "$fixture_root/.driver-contract.XXXXXX")"
trap 'rm -rf -- "$temp_directory"' EXIT

fail() {
    echo "Error: $*" >&2
    exit 1
}

for command_name in bash od tr grep cut mktemp; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done

[[ -f "$driver" && -x "$driver" ]] || fail "Bash control driver is missing or not executable."
[[ -f "$skill_list_helper" && -x "$skill_list_helper" ]] ||
    fail "Bash Copilot skill-list helper is missing or not executable."
[[ "$(od -An -tx1 -N3 "$driver" | tr -d ' \n')" != efbbbf ]] ||
    fail "Control driver must be UTF-8 without BOM."
bash -n "$driver"

help_output="$("$driver" --help)"
for option in \
    --show-domain-fixture-output \
    --show-shepherd-task-script-output \
    --show-contract-output \
    --show-native-tool-output \
    --show-all-output; do
    [[ "$help_output" == *"$option"* ]] || fail "Control driver option is missing: $option"
done

required_texts=(
    'Canonical lifecycle: Stage 00 -> Stage 10 -> research gate -> Stage 15 -> Stage 20 -> Stage 25 -> Stage 30 -> Stage 40 -> Stage 50.'
    'Captured output from failed child script:'
    'Captured output from failed native command:'
    'No automated cleanup was performed.'
    'For each issue, Stage 30'
    'Stage 50 creates the campaign post-mortem'
    '00-prepare-test-baseline.sh'
    '01-prepare-base-branch.sh'
    '02-create-issues.sh'
    '04-verify-control-campaign.sh'
    'shepherd-task-00-init-campaign.sh'
    'shepherd-task-15-prepare-create-issues.sh'
    'shepherd-task-25-given-list.sh'
    '20260902-2104Z-commit-e7b651f-liberty'
    '9b9f311b2a3a2854bdac947593950d9edb6bca7d'
)
for required in "${required_texts[@]}"; do
    grep -Fq -- "$required" "$driver" ||
        fail "Driver output or educational contract is missing: $required"
done
for forbidden in pwsh ShowCopilotCLIOutput ShowCopilotSkillOutput '[shepherd-control]'; do
    ! grep -Fq -- "$forbidden" "$driver" ||
        fail "Bash driver contains forbidden PowerShell or legacy text: $forbidden"
done

line_stage00_planned="$(grep -n -m1 'display_invocation 00 "Initialize campaign" Planned' "$driver" | cut -d: -f1)"
line_campaign_issue="$(grep -n -m1 'Creating campaign issue' "$driver" | cut -d: -f1)"
line_stage00_actual="$(grep -n -m1 'display_invocation 00 "Initialize campaign" Actual' "$driver" | cut -d: -f1)"
line_stage10="$(grep -n -m1 'stage 10 "Create ignorance-reduction plan"' "$driver" | cut -d: -f1)"
line_stage15_planned="$(grep -n -m1 'display_invocation 15 "Prepare Stage 20" Planned' "$driver" | cut -d: -f1)"
line_stage20="$(grep -n -m1 'stage 20 "Create issues from the resolved plan"' "$driver" | cut -d: -f1)"
line_stage25_planned="$(grep -n -m1 'display_invocation 25 "Dispatch ordered issue list after Stage 20" Planned' "$driver" | cut -d: -f1)"
line_stage15_actual="$(grep -n -m1 'display_invocation 15 "Prepare Stage 20" Actual' "$driver" | cut -d: -f1)"
line_stage25_actual="$(grep -n -m1 'display_invocation 25 "Dispatch ordered issue list" Actual' "$driver" | cut -d: -f1)"
[[ "$line_stage00_planned" -lt "$line_campaign_issue" &&
   "$line_campaign_issue" -lt "$line_stage00_actual" &&
   "$line_stage00_actual" -lt "$line_stage10" &&
   "$line_stage10" -lt "$line_stage15_planned" &&
   "$line_stage15_planned" -lt "$line_stage20" &&
   "$line_stage20" -lt "$line_stage25_planned" &&
   "$line_stage25_planned" -lt "$line_stage15_actual" &&
   "$line_stage15_actual" -lt "$line_stage25_actual" ]] ||
    fail "Canonical stage and invocation displays are out of order."

mock_copilot="$temp_directory/mock-copilot"
cat >"$mock_copilot" <<'EOF'
#!/usr/bin/env bash
printf 'Personal skills:\n  shepherd-task-20-create-issues-from-plan - Stage 20 — create ordered issues.\n'
EOF
chmod +x "$mock_copilot"
skill_output="$("$skill_list_helper" "$mock_copilot")"
[[ "$skill_output" == *'Stage 20 — create ordered issues.'* &&
   "$skill_output" == *'shepherd-task-20-create-issues-from-plan'* ]] ||
    fail "Copilot skill-list output was not preserved as UTF-8."

mock_failure="$temp_directory/mock-failure"
cat >"$mock_failure" <<'EOF'
#!/usr/bin/env bash
echo 'mock-failure-output' >&2
exit 23
EOF
chmod +x "$mock_failure"
set +e
failure_output="$("$skill_list_helper" "$mock_failure" 2>&1)"
failure_exit=$?
set -e
[[ $failure_exit -eq 23 && "$failure_output" == *mock-failure-output* ]] ||
    fail "Skill-list helper did not preserve native failure output and exit status."

echo "Driver UTF-8 and output contract tests passed."
