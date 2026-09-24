#!/usr/bin/env bash
# shepherd-task-version: 1.0.4

set -euo pipefail

[[ $# -eq 2 && "$2" =~ ^[1-9][0-9]*$ ]] || {
    echo "Usage: $0 <stage-20-result.json> <expected-task-count>" >&2
    exit 1
}

result_path="$1"
expected_task_count="$2"
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
jq -e --argjson expectedTaskCount "$expected_task_count" '
    type == "array" and
    length == $expectedTaskCount and
    all(.[];
        type == "object" and
        (keys | sort) == ([
            "implementationSubsection",
            "bodyFile",
            "id",
            "number",
            "title",
            "url",
            "body_verified",
            "linked"
        ] | sort) and
        (.implementationSubsection | type == "string" and length > 0) and
        (.bodyFile | type == "string" and length > 0) and
        (.id | type == "number" and . > 0 and floor == .) and
        (.number | type == "number" and . > 0 and floor == .) and
        (.title | type == "string" and length > 0) and
        (.url | type == "string" and length > 0) and
        .body_verified == true and
        .linked == true
    ) and
    ((map(.number) | unique | length) == length)
' "$ledger_path" >/dev/null || {
    echo "Completed stage 20 ledger does not contain exactly $expected_task_count complete entries: $ledger_path" >&2
    exit 1
}
