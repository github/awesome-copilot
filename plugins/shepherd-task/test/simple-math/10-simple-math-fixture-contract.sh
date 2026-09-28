#!/usr/bin/env bash
# shepherd-task-version: 1.0.5

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

script_dir="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$script_dir/../.." && pwd)"
baseline="$script_dir/00-prepare-test-baseline.sh"
initializer="$script_dir/01-prepare-base-branch.sh"
issue_creator="$script_dir/02-create-issues.sh"
verifier="$script_dir/04-verify-control-campaign.sh"
driver="$script_dir/run-campaign.sh"
object_id_helper="$script_dir/git-object-id.sh"
for path in "$baseline" "$initializer" "$issue_creator" "$verifier" "$driver" "$object_id_helper"; do
    [[ -f "$path" ]] || fail "Required Bash fixture file not found: $path"
done

pagination_filter='if length == 0 then [] elif all(.[]; type == "array") then add else . end'
for fixture in \
    '[]|[]' \
    '[[{"id":1}]]|[{"id":1}]' \
    '[[{"id":1}],[{"id":2}]]|[{"id":1},{"id":2}]' \
    '[{"id":1},{"id":2}]|[{"id":1},{"id":2}]'; do
    input="${fixture%%|*}"
    expected="${fixture#*|}"
    actual="$(printf '%s' "$input" | jq -c "$pagination_filter")"
    [[ "$actual" == "$expected" ]] ||
        fail "Pagination normalization produced '$actual'; expected '$expected'."
done
for text in \
    'Fixture pagination response contract (mandatory):' \
    'one-page response has the shape `[[{...}]]`, not `[{...}]`' \
    "$pagination_filter" \
    'capture the `gh` output and `$LASTEXITCODE` first'; do
    grep -Fq -- "$text" "$issue_creator" ||
        fail "Simple-math issue creator is missing pagination guidance: $text"
done

initializer_required=(
    "plan_file='math-tool-ignorance-reduction-plan.md'"
    'lessonPropagation:"off"'
    'expectedTaskCount:2'
    'pwsh -NoLogo -NoProfile -File ./eng/test-math-tool.ps1'
)
for text in "${initializer_required[@]}"; do
    grep -Fq -- "$text" "$initializer" || fail "Simple-math initializer is missing required fixture text: $text"
done
! grep -Fq 'lesson_propagation=' "$initializer" ||
    fail "Simple-math control initializer still accepts an alternate lesson mode."

driver_required=(
    '04-verify-control-campaign.sh'
    'gh repo clone "$repo" "$TARGET"'
    'math-control'
    'lessonPropagation'
    '05-stage20-artifact-contract.sh'
    '09-skill-powershell-contract.sh'
    '10-simple-math-fixture-contract.sh'
    '11-stage15-installed-path-contract.sh'
    '12-git-object-id-contract.sh'
    'test/stage30-remediation-timeout-contract.sh'
    'test/lesson-propagation-default-contract.sh'
)
for text in "${driver_required[@]}"; do
    grep -Fq -- "$text" "$driver" || fail "Simple-math driver is missing required control behavior: $text"
done
grep -Fq 'ls-remote --exit-code --heads "$resolved_remote" "$branch"' "$driver" ||
    fail "Simple-math driver does not probe branches through the resolved repository remote."
! grep -Fq 'must have exactly one Git remote' "$driver" ||
    fail "Simple-math driver still rejects fork checkouts with an upstream remote."
grep -Fq 'scripts_directory="$(cd "$script_dir/../../scripts" && pwd -P)"' "$issue_creator" ||
    fail "Simple-math issue creator does not canonicalize the installed scripts directory."
for forbidden in treatment comparison treatment-control; do
    ! grep -Fqi -- "$forbidden" "$driver" || fail "Simple-math driver still contains treatment/comparison behavior."
done
[[ "$(grep -Fc 'scripts/shepherd-task-25-given-list.sh' "$driver")" -eq 1 ]] ||
    fail "Simple-math driver must define the installed stage-25 path exactly once."

for path in "$baseline" "$initializer" "$issue_creator" "$verifier" "$driver"; do
    grep -Fq 'git-object-id.sh' "$path" ||
        fail "$(basename "$path") does not use the format-aware Git object-ID helper."
    ! grep -Eq '\{40\}|40-character SHA' "$path" ||
        fail "$(basename "$path") still contains a SHA-1-only object-ID assumption."
done

runtime_files=(
    "$script_dir/00-prepare-test-baseline.sh"
    "$script_dir/01-prepare-base-branch.sh"
    "$script_dir/02-create-issues.sh"
    "$script_dir/04-verify-control-campaign.sh"
    "$object_id_helper"
    "$script_dir/get-copilot-skill-list.sh"
    "$driver"
    "$plugin_root"/scripts/*.sh
)
unsafe_git_transport_pattern='clone_?url=|(^|[^[:alnum:]_])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+clone|git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+remote[[:space:]]+(add|set-url)[[:space:]].*https://github\.com'
if grep -Ein "$unsafe_git_transport_pattern" "${runtime_files[@]}" >/dev/null; then
    grep -Ein "$unsafe_git_transport_pattern" "${runtime_files[@]}" >&2
    fail "Simple-math Bash runtime bypasses gh-managed Git transport."
fi

for path in "$issue_creator" "$verifier"; do
    grep -Fq 'lessonPropagation' "$path" && grep -Fq 'off' "$path" ||
        fail "$(basename "$path") does not require lessonPropagation=off."
    ! grep -Fq 'Treatment issue' "$path" || fail "$(basename "$path") contains treatment-arm behavior."
done

echo 'Simple-math Bash control fixture contract tests passed.'
