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
    .status == "complete"
' "$result_path" >/dev/null || {
    status="$(jq -r '.status // "missing"' "$result_path" 2>/dev/null || printf 'invalid')"
    operation_error="$(jq -r '.operationError // "No operation error was recorded."' "$result_path" 2>/dev/null || printf 'Invalid JSON.')"
    echo "Stage 20 did not report completion (status: $status): $operation_error" >&2
    exit 1
}

ledger_path="$(dirname "$result_path")/creation-ledger.json"
jq -e '
    type == "array" and
    length > 0 and
    all(.[];
        (.number | type == "number" and . > 0 and floor == .) and
        .body_verified == true and
        .linked == true
    ) and
    ((map(.number) | unique | length) == length)
' "$ledger_path" >/dev/null || {
    echo "Completed stage 20 has a missing, invalid, or incomplete creation ledger: $ledger_path" >&2
    exit 1
}
