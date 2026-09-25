#!/usr/bin/env bash
# shepherd-task-version: 1.0.5
#
# shepherd-task-inspect-otel-token-summary.sh — Summarize token usage from OTel JSONL exports.
#
# Usage: ./shepherd-task-inspect-otel-token-summary.sh <otel-jsonl-file|directory>
#   otel-jsonl-file: path to a single OTel JSONL file
#   directory:       path to a log directory; processes all *.jsonl files within

set -euo pipefail

TARGET="${1:?Usage: $0 <otel-jsonl-file|directory>}"

summarize_file() {
    local file="$1"
    local basename
    basename=$(basename "$file")

    local summary
    summary=$(jq -sc '
        def token_sum($key):
            [
                .[]
                | ..
                | objects
                | select(.key? == $key)
                | (.value.intValue // .value.stringValue // 0)
                | tonumber
            ]
            | add // 0;
        {
            input: token_sum("gen_ai.usage.input_tokens"),
            output: token_sum("gen_ai.usage.output_tokens"),
            calls: (
                [
                    .[]
                    | ..
                    | objects
                    | select((.name? // "") | test("^chat "))
                ]
                | length
            )
        }
    ' "$file" 2>/dev/null) || summary='{"input":0,"output":0,"calls":0}'

    SUMMARY_INPUT=$(jq -r '.input' <<<"$summary")
    SUMMARY_OUTPUT=$(jq -r '.output' <<<"$summary")
    SUMMARY_CALLS=$(jq -r '.calls' <<<"$summary")

    printf "%-50s  %8s input  %8s output  %4s calls\n" \
        "$basename" "$SUMMARY_INPUT" "$SUMMARY_OUTPUT" "$SUMMARY_CALLS"
}

echo "=== OTel Token Usage Summary ==="
echo ""

total_input=0
total_output=0
total_calls=0

if [[ -d "$TARGET" ]]; then
    files=("$TARGET"/*.jsonl)
    if [[ ${#files[@]} -eq 0 || ! -e "${files[0]}" ]]; then
        echo "No .jsonl files found in $TARGET"
        exit 1
    fi
    for f in "${files[@]}"; do
        summarize_file "$f"
        total_input=$((total_input + SUMMARY_INPUT))
        total_output=$((total_output + SUMMARY_OUTPUT))
        total_calls=$((total_calls + SUMMARY_CALLS))
    done
    echo ""
    echo "--- TOTALS ---"
    printf "%-50s  %8s input  %8s output  %4s calls\n" "ALL FILES" "$total_input" "$total_output" "$total_calls"
else
    summarize_file "$TARGET"
fi
