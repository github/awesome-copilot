#!/usr/bin/env bash
# shepherd-task-version: 1.0.4

set -euo pipefail

test_directory="$(cd "$(dirname "$0")" && pwd)"
summary_script="$test_directory/../scripts/shepherd-task-inspect-otel-token-summary.sh"
temp_directory="$(mktemp -d "${TMPDIR:-/tmp}/shepherd-otel-summary.XXXXXX")"
trap 'rm -rf "$temp_directory"' EXIT

cat >"$temp_directory/first.jsonl" <<'EOF'
{"resourceSpans":[{"scopeSpans":[{"spans":[{"name":"chat first","attributes":[{"key":"gen_ai.usage.input_tokens","value":{"intValue":100}},{"key":"gen_ai.usage.output_tokens","value":{"intValue":20}}]}]}]}]}
{"resourceSpans":[{"scopeSpans":[{"spans":[{"name":"chat second","attributes":[{"key":"gen_ai.usage.input_tokens","value":{"stringValue":"200"}},{"key":"gen_ai.usage.output_tokens","value":{"intValue":30}}]}]}]}]}
EOF

cat >"$temp_directory/second.jsonl" <<'EOF'
{"resourceSpans":[{"scopeSpans":[{"spans":[{"name":"chat third","attributes":[{"key":"gen_ai.usage.input_tokens","value":{"intValue":50}},{"key":"gen_ai.usage.output_tokens","value":{"stringValue":"10"}}]}]}]}]}
EOF

single_output="$("$summary_script" "$temp_directory/first.jsonl")"
grep -Eq 'first\.jsonl +300 input +50 output +2 calls' <<<"$single_output" || {
    echo 'Single-file OTel summary did not aggregate all JSONL records.' >&2
    exit 1
}

directory_output="$("$summary_script" "$temp_directory")"
grep -Eq 'first\.jsonl +300 input +50 output +2 calls' <<<"$directory_output"
grep -Eq 'second\.jsonl +50 input +10 output +1 calls' <<<"$directory_output"
grep -Eq 'ALL FILES +350 input +60 output +3 calls' <<<"$directory_output" || {
    echo 'Directory OTel summary totals are incorrect.' >&2
    exit 1
}

echo 'OTel token summary contract tests passed.'
