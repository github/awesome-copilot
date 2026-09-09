#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

for command in bash grep od; do
    command -v "$command" >/dev/null 2>&1 || fail "Required command '$command' was not found."
done

script_dir="$(cd "$(dirname "$0")" && pwd)"
driver="$script_dir/run-campaign.sh"
skill_list_helper="$script_dir/get-copilot-skill-list.sh"
[[ -f "$driver" && -x "$skill_list_helper" ]] || fail "Bash driver or skill-list helper is missing."

first_bytes="$(od -An -tx1 -N3 "$driver" | tr -d ' \n')"
[[ "$first_bytes" != efbbbf ]] || fail "Control driver must be UTF-8 without BOM."
bash -n "$driver" || fail "Control driver does not parse."

required_options=(
    '--show-domain-fixture-output'
    '--show-shepherd-task-script-output'
    '--show-contract-output'
    '--show-native-tool-output'
    '--show-all-output'
)
for option in "${required_options[@]}"; do
    grep -Fq -- "$option" "$driver" || fail "Control driver option is missing: $option"
done
for forbidden in --show-copilot-cli-output --show-copilot-skill-output '[shepherd-control]'; do
    ! grep -Fq -- "$forbidden" "$driver" || fail "Control driver contains forbidden output contract: $forbidden"
done

required_text=(
    'Canonical lifecycle: Stage 00 -> Stage 10 -> research gate -> Stage 15 -> Stage 20 -> Stage 25 -> Stage 30 -> Stage 40 -> Stage 50.'
    "display_invocation 00 'Initialize campaign' Planned"
    "display_invocation 00 'Initialize campaign' Actual"
    '<CAMPAIGN_ISSUE_NUMBER>'
    '<TASK_ISSUE_LIST>'
    'shepherd-task-00-init-campaign.sh'
    'shepherd-task-15-prepare-create-issues.sh'
    'shepherd-task-25-given-list.sh'
    'math-tool-ignorance-reduction-plan.md'
    'exactly two positive issue numbers'
    'initializing the empty disposable repository'
    '00-prepare-test-baseline.sh'
    '01-prepare-base-branch.sh'
    '02-create-issues.sh'
    '04-verify-control-campaign.sh'
    'Captured output from failed child script:'
    'Captured output from failed native command:'
    'No automated cleanup was performed.'
)
for text in "${required_text[@]}"; do
    grep -Fq -- "$text" "$driver" || fail "Control driver educational/output contract is missing: $text"
done

contract_root="$script_dir/.contract-work"
temp_directory="$contract_root/driver-$$"
mkdir -p -- "$temp_directory"
cleanup() {
    [[ -z "${CAPTURE_DIRECTORY:-}" ]] || rm -rf -- "$CAPTURE_DIRECTORY"
    rm -rf -- "$temp_directory"
    rmdir -- "$contract_root" 2>/dev/null || true
}
trap cleanup EXIT

cat >"$temp_directory/success.sh" <<'EOF'
#!/usr/bin/env bash
echo stub-success-output
EOF
cat >"$temp_directory/failure.sh" <<'EOF'
#!/usr/bin/env bash
echo stub-failure-output >&2
exit 23
EOF
cat >"$temp_directory/mock-copilot" <<'EOF'
#!/usr/bin/env bash
printf 'Personal skills:\n  shepherd-task-20-create-issues-from-plan - Stage 20 — create ordered issues.\n'
EOF
chmod +x "$temp_directory"/*.sh "$temp_directory/mock-copilot"

export SHEPHERD_DRIVER_LIB_ONLY=1
# shellcheck source=/dev/null
source "$driver"
unset SHEPHERD_DRIVER_LIB_ONLY
CAPTURE_DIRECTORY="$temp_directory/captures"
SHOW_DOMAIN_FIXTURE_OUTPUT=0
SHOW_SHEPHERD_TASK_SCRIPT_OUTPUT=0
SHOW_CONTRACT_OUTPUT=0
SHOW_NATIVE_TOOL_OUTPUT=0

hidden_success="$(invoke_checked_script "$temp_directory/success.sh" domain 2>&1)"
[[ "$hidden_success" != *stub-success-output* ]] || fail "Disabled child channel leaked successful output."
SHOW_DOMAIN_FIXTURE_OUTPUT=1
shown_success="$(invoke_checked_script "$temp_directory/success.sh" domain 2>&1)"
[[ "$shown_success" == *stub-success-output* ]] || fail "Enabled child channel did not pass through successful output."
SHOW_DOMAIN_FIXTURE_OUTPUT=0
set +e
hidden_failure="$(invoke_checked_script "$temp_directory/failure.sh" domain 2>&1)"
failure_status=$?
set -e
[[ $failure_status -eq 23 && "$hidden_failure" == *stub-failure-output* ]] ||
    fail "Disabled child failure did not reveal output and exit code: $hidden_failure"

native_success="$(invoke_checked_native 'Native success probe' bash -c 'echo native-success-output' 2>&1)"
[[ "$native_success" != *native-success-output* ]] || fail "Disabled native channel leaked successful output."
SHOW_NATIVE_TOOL_OUTPUT=1
shown_native="$(invoke_checked_native 'Native success probe' bash -c 'echo native-success-output' 2>&1)"
[[ "$shown_native" == *native-success-output* ]] || fail "Enabled native channel did not pass through successful output."
SHOW_NATIVE_TOOL_OUTPUT=0
set +e
native_failure="$(invoke_checked_native 'Native failure probe' bash -c 'echo native-failure-output >&2; exit 19' 2>&1)"
native_status=$?
set -e
[[ $native_status -eq 19 && "$native_failure" == *native-failure-output* ]] ||
    fail "Disabled native failure did not reveal output and exit code: $native_failure"

skill_output="$("$skill_list_helper" "$temp_directory/mock-copilot")"
[[ "$skill_output" == *'Stage 20 — create ordered issues.'* &&
   "$skill_output" == *shepherd-task-20-create-issues-from-plan* ]] ||
    fail "Copilot skill-list output was not preserved as UTF-8: $skill_output"

echo 'Driver UTF-8 Bash contract tests passed.'
