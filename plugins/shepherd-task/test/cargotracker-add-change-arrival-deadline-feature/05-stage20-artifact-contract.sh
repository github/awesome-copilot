#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

fixture_root="$(cd "$(dirname "$0")" && pwd)"
scripts_directory="$fixture_root/../../scripts"
draft_validator="$scripts_directory/validate-stage20-drafts.sh"
result_assertion="$scripts_directory/assert-stage20-result.sh"
redactor="$scripts_directory/redact-secrets.sh"
issue_body_verifier="$scripts_directory/verify-github-issue-body.sh"
stage20_skill="$fixture_root/../../../../skills/shepherd-task-20-create-issues-from-plan/SKILL.md"
temp_directory="$(mktemp -d "$fixture_root/.stage20-contract.XXXXXX")"
body_directory="$temp_directory/issue-bodies"
trap 'rm -rf -- "$temp_directory"' EXIT

fail() {
    echo "Error: $*" >&2
    exit 1
}

expect_failure() {
    local expected_message="$1"
    shift
    local output exit_code
    set +e
    output="$("$@" 2>&1)"
    exit_code=$?
    set -e
    [[ $exit_code -ne 0 ]] ||
        fail "Expected operation to fail with '$expected_message'."
    [[ "$output" == *"$expected_message"* ]] ||
        fail "Expected failure containing '$expected_message'; observed '$output'."
}

for command_name in git jq node; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done
for required_file in "$draft_validator" "$result_assertion" "$redactor" \
    "$issue_body_verifier" "$stage20_skill"; do
    [[ -f "$required_file" ]] || fail "Required contract input not found: $required_file"
done

grep -Fq 'JSON root is an array' "$stage20_skill" ||
    fail "Stage-20 skill does not preserve the ledger array requirement."
grep -Fq 'capture output and then capture `$LASTEXITCODE` immediately' "$stage20_skill" ||
    fail "Stage-20 skill does not preserve native pipeline exit-code safety."

mkdir -p -- "$body_directory"
ledger_round_trip="$temp_directory/ledger-round-trip.json"
printf '[]\n' >"$ledger_round_trip"
jq -e 'type == "array" and length == 0' "$ledger_round_trip" >/dev/null ||
    fail "An empty creation ledger was read as one or more entries."
printf '[{"number":41,"body_verified":false,"linked":false}]\n' >"$ledger_round_trip"
jq -e 'type == "array" and length == 1 and .[0].number == 41' "$ledger_round_trip" >/dev/null ||
    fail "A single-entry creation ledger did not remain a flat one-entry array."
jq '. + [{"number":42,"body_verified":true,"linked":true}]' \
    "$ledger_round_trip" >"$ledger_round_trip.next"
mv -- "$ledger_round_trip.next" "$ledger_round_trip"
jq -e 'type == "array" and length == 2 and map(.number) == [41,42] and
    all(.[]; type == "object")' "$ledger_round_trip" >/dev/null ||
    fail "A multiple-entry creation ledger did not remain a flat ordered array."
printf '[[],{"number":41}]\n' >"$ledger_round_trip"
if jq -e 'type == "array" and all(.[]; type == "object")' "$ledger_round_trip" >/dev/null; then
    fail "Creation ledger accepted a nested array entry."
fi

valid_body="$(cat <<'EOF'
## Campaign context and required reading

Read the plan.

## Branch and execution order

Work serially.

## Implement

Implement the task.

## Completion gates

Run the tests.

## Out of scope

Do not expand scope.
EOF
)"
body_path="$body_directory/01-task-body.md"
printf '%s\n' "$valid_body" >"$body_path"
"$draft_validator" "$body_directory" 1 off >/dev/null
printf '%s' "$valid_body" | tr '\n' ' ' >"$body_path"
expect_failure "physical Markdown lines" "$draft_validator" "$body_directory" 1 off

ledger_path="$temp_directory/creation-ledger.json"
result_path="$temp_directory/stage-20-result.json"
cat >"$ledger_path" <<'EOF'
[
  {"number":41,"body_verified":true,"linked":true},
  {"number":42,"body_verified":true,"linked":true}
]
EOF
printf '{"schemaVersion":1,"status":"complete","ledgerFile":"creation-ledger.json","operationError":null}\n' >"$result_path"
"$result_assertion" "$result_path" >/dev/null
printf '{"schemaVersion":1,"status":"failed","ledgerFile":"creation-ledger.json","operationError":"Body verification failed."}\n' >"$result_path"
expect_failure "did not report completion" "$result_assertion" "$result_path"
rm -- "$result_path"
expect_failure "did not write its required result document" "$result_assertion" "$result_path"

printf '{"schemaVersion":1,"status":"complete","ledgerFile":"creation-ledger.json","operationError":null}\n' >"$result_path"
telemetry_path="$temp_directory/telemetry.json"
printf '{"issueNumbers":[12,13],"flags":[true,false],"secret":"sensitive"}\n' >"$telemetry_path"
"$redactor" "$temp_directory" >/dev/null
jq -e '.issueNumbers == [12,13] and .flags == [true,false] and .secret == "[REDACTED]"' \
    "$telemetry_path" >/dev/null ||
    fail "Redaction corrupted scalar arrays or failed to redact a sensitive field."
jq -e 'map(.number) == [41,42] and all(.[]; .body_verified == true)' \
    "$ledger_path" >/dev/null ||
    fail "Redaction corrupted the creation ledger."

mock_state="$temp_directory/mock-gh-state.txt"
mock_gh="$temp_directory/mock-gh"
cat >"$mock_gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
state="${SHEPHERD_MOCK_GH_STATE:?}"
count=1
[[ ! -f "$state" ]] || count=$(( $(cat "$state") + 1 ))
printf '%s' "$count" >"$state"
if [[ "${SHEPHERD_MOCK_GH_MODE:-body}" == terminal ]]; then
    echo 'HTTP 403: Resource not accessible' >&2
    exit 1
fi
fresh="${SHEPHERD_MOCK_GH_FRESH_ATTEMPT:-1}"
if (( count < fresh )); then
    body="${SHEPHERD_MOCK_GH_STALE_BODY:-stale body}"
else
    body="${SHEPHERD_MOCK_GH_BODY:-}"
fi
jq -n --arg body "$body" '{number:41,state:"open",body:$body}'
EOF
chmod +x "$mock_gh"
export GH_COMMAND="$mock_gh"
export SHEPHERD_MOCK_GH_STATE="$mock_state"
export SHEPHERD_MOCK_GH_MODE=body
export SHEPHERD_MOCK_GH_STALE_BODY='stale body'

verification_body="$temp_directory/verification-body.md"
printf 'expected\nbody' >"$verification_body"
export SHEPHERD_MOCK_GH_BODY=$'expected\nbody'
export SHEPHERD_MOCK_GH_FRESH_ATTEMPT=2
rm -f -- "$mock_state"
verified="$("$issue_body_verifier" owner/repository 41 "$verification_body" 2 0)"
[[ "$(jq -r '.body' <<<"$verified")" == $'expected\nbody' && "$(cat "$mock_state")" == 2 ]] ||
    fail "Issue body verifier did not recover from a stale first REST response."

printf 'expected — body' >"$verification_body"
export SHEPHERD_MOCK_GH_BODY='expected — body'
export SHEPHERD_MOCK_GH_FRESH_ATTEMPT=1
rm -f -- "$mock_state"
"$issue_body_verifier" owner/repository 41 "$verification_body" 1 0 >/dev/null ||
    fail "Issue body verifier corrupted UTF-8 output."

printf 'expected\r\nbody' >"$verification_body"
export SHEPHERD_MOCK_GH_BODY=$'expected\nbody'
rm -f -- "$mock_state"
"$issue_body_verifier" owner/repository 41 "$verification_body" 1 0 >/dev/null
printf 'expected' >"$verification_body"
export SHEPHERD_MOCK_GH_BODY=$'expected\n'
rm -f -- "$mock_state"
"$issue_body_verifier" owner/repository 41 "$verification_body" 1 0 >/dev/null

diagnostic_path="$temp_directory/body-verification-failure.json"
export SHEPHERD_MOCK_GH_BODY=$'expected\n\n'
rm -f -- "$mock_state"
expect_failure "failed after 1 attempts" \
    "$issue_body_verifier" owner/repository 41 "$verification_body" 1 0 "$diagnostic_path"
jq -e '.attempts == 1 and .expectedSha256 != .actualSha256 and
    .expectedLength != .actualLength' "$diagnostic_path" >/dev/null ||
    fail "Persistent body mismatch diagnostics are incomplete."

export SHEPHERD_MOCK_GH_BODY='always wrong'
rm -f -- "$mock_state"
expect_failure "failed after 3 attempts" \
    "$issue_body_verifier" owner/repository 41 "$verification_body" 3 0
[[ "$(cat "$mock_state")" == 3 ]] ||
    fail "Persistent body mismatch did not exhaust the configured retry count."

export SHEPHERD_MOCK_GH_MODE=terminal
rm -f -- "$mock_state"
expect_failure "unable to fetch issue #41" \
    "$issue_body_verifier" owner/repository 41 "$verification_body" 3 0
[[ "$(cat "$mock_state")" == 1 ]] ||
    fail "Terminal GitHub failure was retried."

echo "Stage-20 Bash artifact contract tests passed."
