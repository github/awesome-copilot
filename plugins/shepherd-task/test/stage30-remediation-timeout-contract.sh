#!/usr/bin/env bash
# shepherd-task-version: 1.0.5

set -euo pipefail

fixture_root="$(cd "$(dirname "$0")" && pwd)"
repository_root="$(cd "$fixture_root/../../.." && pwd)"
skill_root="$repository_root/skills/shepherd-task-30-from-assignment-to-ready"
reference="$skill_root/references/cca-remediation-loop.md"
skill="$skill_root/SKILL.md"

fail() {
    echo "Error: $*" >&2
    exit 1
}

[[ "$(grep -Ec '^PHASE_C_TIMEOUT=1200$' "$reference")" -eq 1 ]] ||
    fail "Expected one Stage 30 remediation timeout assignment of 1200 seconds."
grep -Fq 'Wait for CCA to complete a full work cycle (up to 20 minutes)' "$reference" ||
    fail "Stage 30 remediation guidance does not describe the 20-minute completion window."
! grep -Fq 'PHASE_C_TIMEOUT=600' "$reference" ||
    fail "Stage 30 remediation guidance still assigns the former 10-minute timeout."
! grep -Fq 'up to 10 minutes' "$reference" ||
    fail "Stage 30 remediation guidance still describes the former 10-minute completion window."
grep -Fq "Copilot doesn't push after review request within 20 minutes" "$skill" ||
    fail "Stage 30 error handling does not describe the 20-minute remediation window."
! grep -Fq "Copilot doesn't push after review request within 10 minutes" "$skill" ||
    fail "Stage 30 error handling still describes the former 10-minute remediation window."

echo 'Stage 30 remediation timeout contract tests passed.'
