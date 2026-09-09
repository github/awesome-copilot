#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

fixture_root="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$fixture_root/../.." && pwd)"
initializer="$fixture_root/01-prepare-base-branch.sh"
baseline="$fixture_root/00-prepare-test-baseline.sh"
issue_creator="$fixture_root/02-create-issues.sh"
verifier="$fixture_root/04-verify-control-campaign.sh"
driver="$fixture_root/run-campaign.sh"
plan_archive="$fixture_root/cargotracker-plan.md.gz.b64"

fail() {
    echo "Error: $*" >&2
    exit 1
}

for command_name in base64 gzip awk grep find; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done
command -v sha256sum >/dev/null 2>&1 ||
    command -v shasum >/dev/null 2>&1 ||
    fail "Required SHA-256 command was not found on PATH: sha256sum or shasum"

decode_plan_archive() {
    if base64 --decode </dev/null >/dev/null 2>&1; then
        base64 --decode "$plan_archive"
    else
        base64 -D "$plan_archive"
    fi
}

sha256_stream() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum | awk '{print $1}'
    else
        shasum -a 256 | awk '{print $1}'
    fi
}

for required_file in "$initializer" "$baseline" "$issue_creator" "$verifier" "$driver" "$plan_archive"; do
    [[ -f "$required_file" ]] || fail "Required fixture file is missing: $required_file"
done

plan_hash="$(decode_plan_archive | gzip -dc | sha256_stream)"
expected_plan_hash='6fdedc8d42a586fe8dc74bf4155d4d2b927b2dd35754093e6719b2061835e882'
[[ "$plan_hash" == "$expected_plan_hash" ]] ||
    fail "Embedded Cargo Tracker plan hash '$plan_hash' does not match '$expected_plan_hash'."
task_count="$(
    decode_plan_archive | gzip -dc |
        awk '
          $0 == "## Phase 4 — Implementation (five serial issues)" { in_section=1; next }
          in_section && /^## / { exit }
          in_section && /^### 4\.[1-5] —/ { count++ }
          END { print count+0 }
        '
)"
[[ "$task_count" -eq 5 ]] ||
    fail "Embedded Cargo Tracker plan contains $task_count direct implementation tasks; expected 5."

expected_baseline_sha='9b9f311b2a3a2854bdac947593950d9edb6bca7d'
expected_source_branch='20260902-2104Z-commit-e7b651f-liberty'
for file in "$baseline" "$driver"; do
    grep -Fq "$expected_baseline_sha" "$file" ||
        fail "$(basename "$file") does not enforce baseline '$expected_baseline_sha'."
    grep -Fq "$expected_source_branch" "$file" ||
        fail "$(basename "$file") does not enforce source branch '$expected_source_branch'."
done
grep -Fq 'merge-base --is-ancestor "$expected_baseline_sha" "$fetched_sha"' "$baseline" ||
    fail "Baseline script does not enforce prepared source-branch ancestry."
! grep -Fq 'defaultBranchRef' "$baseline" ||
    fail "Baseline script still depends on repository default-branch discovery."

for required in \
    11-stage15-plan-discovery-contract.sh \
    12-session-outcome-contract.sh \
    'gh repo clone "$repo" "$target"' \
    lesson-propagation-default-contract.sh \
    04-verify-control-campaign.sh \
    'lessonPropagation: "off"' \
    cargotracker-plan.md.gz.b64 \
    'name: Shepherd task Cargo Tracker' \
    './mvnw --batch-mode --no-transfer-progress clean package -Popenliberty'; do
    grep -Fq -- "$required" "$driver" "$initializer" ||
        fail "Cargo Tracker Bash fixture is missing required text: $required"
done
if decode_plan_archive | gzip -dc |
    grep -Eq '/home/|[A-Za-z]:\\|dd-3058828-cargotracker-remove-before-merge'; then
    fail "Embedded Cargo Tracker plan contains a machine- or source-checkout-specific path."
fi
grep -Fq 'scripts_directory="$(cd "$script_dir/../../scripts" && pwd -P)"' "$issue_creator" ||
    fail "Cargo Tracker issue creator does not canonicalize the installed scripts directory."
for file in "$issue_creator" "$verifier"; do
    grep -Fq 'lessonPropagation' "$file" && grep -Fq '"off"' "$file" ||
        fail "$(basename "$file") does not require lessonPropagation=off."
done
if grep -Eq 'Treatment|treatment-control|resume-driver|LessonPropagation.*campaign' \
    "$driver" "$initializer" "$issue_creator" "$verifier"; then
    fail "Bash fixture still contains treatment, comparison, or recovery behavior."
fi
[[ "$(grep -Fc 'shepherd-task-25-given-list.sh' "$driver")" -eq 1 ]] ||
    fail "Driver must reference Bash stage 25 exactly once."

runtime_files=(
    "$fixture_root/00-prepare-test-baseline.sh"
    "$fixture_root/01-prepare-base-branch.sh"
    "$fixture_root/02-create-issues.sh"
    "$fixture_root/04-verify-control-campaign.sh"
    "$fixture_root/get-copilot-skill-list.sh"
    "$driver"
    "$plugin_root"/scripts/*.sh
)
unsafe_git_transport_pattern='clone_?url=|(^|[^[:alnum:]_])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+clone|git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+remote[[:space:]]+(add|set-url)[[:space:]].*https://github\.com'
if grep -Ein "$unsafe_git_transport_pattern" "${runtime_files[@]}" >/dev/null; then
    grep -Ein "$unsafe_git_transport_pattern" "${runtime_files[@]}" >&2
    fail "Cargo Tracker Bash runtime bypasses gh-managed Git transport."
fi

while IFS= read -r operational_file; do
    [[ "$operational_file" != "$fixture_root/10-cargotracker-fixture-contract.sh" ]] || continue
    ! grep -Fq 'simple-math' "$operational_file" ||
        fail "Cargo Tracker operational script depends on simple-math: $operational_file"
done < <(find "$fixture_root" -maxdepth 1 -type f -name '*.sh')

echo "Cargo Tracker Bash fixture contract tests passed."
