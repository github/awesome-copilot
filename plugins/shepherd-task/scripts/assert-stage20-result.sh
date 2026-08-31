#!/usr/bin/env bash

set -euo pipefail

[[ $# -eq 1 ]] || {
    echo "Usage: $0 <stage-20-result.json>" >&2
    exit 1
}

result_path="$1"
[[ -f "$result_path" ]] || {
    echo "Stage 20 did not write its required result document: $result_path" >&2
    exit 1
}

jq -e '
    .schemaVersion == 1 and
    .ledgerFile == "creation-ledger.json" and
    .status == "complete" and
    (.issueNumbers | type == "array" and length > 0) and
    ([.issueNumbers[] | select(type != "number" or . <= 0 or floor != .)] | length == 0) and
    ((.issueNumbers | unique | length) == (.issueNumbers | length))
' "$result_path" >/dev/null || {
    status="$(jq -r '.status // "missing"' "$result_path" 2>/dev/null || printf 'invalid')"
    operation_error="$(jq -r '.operationError // "No operation error was recorded."' "$result_path" 2>/dev/null || printf 'Invalid JSON.')"
    echo "Stage 20 did not report completion (status: $status): $operation_error" >&2
    exit 1
}
