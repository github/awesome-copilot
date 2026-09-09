#!/usr/bin/env bash
# shepherd-task-version: 1.0.1

set -euo pipefail

fail() {
    echo "Error: $*" >&2
    exit 1
}

for command in git jq awk sed; do
    command -v "$command" >/dev/null 2>&1 || fail "Required command '$command' was not found."
done

script_dir="$(cd "$(dirname "$0")" && pwd)"
scripts_directory="$script_dir/../../scripts"
draft_validator="$scripts_directory/validate-stage20-drafts.sh"
result_assertion="$scripts_directory/assert-stage20-result.sh"
redactor="$scripts_directory/redact-secrets.sh"
issue_body_verifier="$scripts_directory/verify-github-issue-body.sh"
stage20_skill="$script_dir/../../../../skills/shepherd-task-20-create-issues-from-plan/SKILL.md"
for path in "$draft_validator" "$result_assertion" "$redactor" "$issue_body_verifier" "$stage20_skill"; do
    [[ -f "$path" ]] || fail "Required contract input not found: $path"
done

contract_root="$script_dir/.contract-work"
temp_directory="$contract_root/stage20-$$"
body_directory="$temp_directory/issue-bodies"
mkdir -p -- "$body_directory"
cleanup() {
    rm -rf -- "$temp_directory"
    rmdir -- "$contract_root" 2>/dev/null || true
}
trap cleanup EXIT
export TMPDIR="$temp_directory"

grep -Fq 'as a JSON array' "$stage20_skill" ||
    fail "Stage-20 skill does not preserve the Bash ledger array requirement."
grep -Fq 'capture output and then capture `$LASTEXITCODE` immediately' "$stage20_skill" ||
    fail "Stage-20 skill does not preserve the native exit-code safety requirement."

ledger="$temp_directory/ledger-round-trip.json"
printf '[]\n' >"$ledger"
jq -e 'type == "array" and length == 0' "$ledger" >/dev/null ||
    fail "An empty creation ledger was not a JSON array."
printf '[{"number":41,"body_verified":false,"linked":false}]\n' >"$ledger"
jq -e 'type == "array" and length == 1 and .[0].number == 41' "$ledger" >/dev/null ||
    fail "A single-entry creation ledger did not remain a flat array."
jq '. + [{"number":42,"body_verified":true,"linked":true}]' "$ledger" >"$ledger.next"
mv -- "$ledger.next" "$ledger"
jq -e 'length == 2 and map(.number) == [41,42] and all(.[]; type == "object")' "$ledger" >/dev/null ||
    fail "A multiple-entry creation ledger did not remain a flat ordered array."
printf '[[],{"number":41}]\n' >"$ledger"
if jq -e 'type == "array" and all(.[]; type == "object")' "$ledger" >/dev/null; then
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
if output="$("$draft_validator" "$body_directory" 1 off 2>&1)"; then
    fail "Draft validator accepted a flattened issue body: $output"
fi
[[ "$output" == *"physical Markdown lines"* ]] ||
    fail "Draft validator failed for an unexpected reason: $output"

ledger="$temp_directory/creation-ledger.json"
result="$temp_directory/stage-20-result.json"
cat >"$ledger" <<'EOF'
[
  {"number":41,"body_verified":true,"linked":true},
  {"number":42,"body_verified":true,"linked":true}
]
EOF
printf '%s\n' '{"schemaVersion":1,"status":"complete","ledgerFile":"creation-ledger.json","operationError":null}' >"$result"
"$result_assertion" "$result" >/dev/null
printf '%s\n' '{"schemaVersion":1,"status":"failed","ledgerFile":"creation-ledger.json","operationError":"Body verification failed."}' >"$result"
if output="$("$result_assertion" "$result" 2>&1)"; then
    fail "Result assertion accepted failed status: $output"
fi
[[ "$output" == *"status: failed"* ]] || fail "Result assertion failure omitted status: $output"
rm -- "$result"
if output="$("$result_assertion" "$result" 2>&1)"; then
    fail "Result assertion accepted a missing result document: $output"
fi
[[ "$output" == *"did not write its required result document"* ]] ||
    fail "Missing-result failure was unexpected: $output"

printf '%s\n' '{"schemaVersion":1,"status":"complete","ledgerFile":"creation-ledger.json","operationError":null}' >"$result"
cat >"$temp_directory/telemetry.json" <<'EOF'
{"issueNumbers":[12,13],"flags":[true,false],"secret":"sensitive"}
EOF
"$redactor" "$temp_directory" >/dev/null
jq -e '.issueNumbers == [12,13] and .flags == [true,false] and .secret == "[REDACTED]"' \
    "$temp_directory/telemetry.json" >/dev/null || fail "Redaction corrupted scalar arrays or failed to redact a secret."
jq -e 'map(.number) == [41,42] and all(.[].body_verified; . == true)' "$ledger" >/dev/null ||
    fail "Redaction corrupted the creation ledger."

state="$temp_directory/mock-gh-state"
mock_gh="$temp_directory/mock-gh"
cat >"$mock_gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
count=1
[[ ! -f "$SHEPHERD_MOCK_GH_STATE" ]] ||
    count=$(( $(cat "$SHEPHERD_MOCK_GH_STATE") + 1 ))
printf '%s' "$count" >"$SHEPHERD_MOCK_GH_STATE"
if [[ "$SHEPHERD_MOCK_GH_MODE" == terminal ]]; then
    echo 'HTTP 403: Resource not accessible' >&2
    exit 1
fi
body="$SHEPHERD_MOCK_GH_BODY"
if (( count < SHEPHERD_MOCK_GH_FRESH_ATTEMPT )); then
    body="$SHEPHERD_MOCK_GH_STALE_BODY"
fi
jq -n --arg body "$body" '{number:41,state:"open",body:$body}'
EOF
chmod +x "$mock_gh"
export GH_COMMAND="$mock_gh"
export SHEPHERD_MOCK_GH_STATE="$state"
export SHEPHERD_MOCK_GH_MODE=body
export SHEPHERD_MOCK_GH_STALE_BODY='stale body'
verification_body="$temp_directory/verification-body.md"
printf 'expected\nbody' >"$verification_body"
export SHEPHERD_MOCK_GH_BODY=$'expected\nbody'
export SHEPHERD_MOCK_GH_FRESH_ATTEMPT=2
verified="$("$issue_body_verifier" owner/repository 41 "$verification_body" 2 0)"
[[ "$(jq -r '.body' <<<"$verified")" == $'expected\nbody' && "$(cat "$state")" == 2 ]] ||
    fail "Issue body verifier did not recover from a stale first REST response."

printf 'expected' >"$verification_body"
export SHEPHERD_MOCK_GH_BODY=$'expected\n\n'
export SHEPHERD_MOCK_GH_FRESH_ATTEMPT=1
rm -f -- "$state"
diagnostic="$temp_directory/body-verification-failure.json"
if output="$("$issue_body_verifier" owner/repository 41 "$verification_body" 1 0 "$diagnostic" 2>&1)"; then
    fail "Issue body verifier accepted a persistent mismatch: $output"
fi
[[ "$output" == *"failed after 1 attempts"* ]] || fail "Mismatch failure was unexpected: $output"
jq -e '.attempts == 1 and .expectedSha256 != .actualSha256 and has("firstDifferenceOffset")' \
    "$diagnostic" >/dev/null || fail "Persistent body mismatch diagnostics are incomplete."

export SHEPHERD_MOCK_GH_MODE=terminal
rm -f -- "$state"
if output="$("$issue_body_verifier" owner/repository 41 "$verification_body" 3 0 2>&1)"; then
    fail "Issue body verifier accepted terminal GitHub failure: $output"
fi
[[ "$output" == *"unable to fetch issue #41"* && "$(cat "$state")" == 1 ]] ||
    fail "Terminal GitHub failure was retried or misreported: $output"

echo 'Stage-20 Bash artifact contract tests passed.'
