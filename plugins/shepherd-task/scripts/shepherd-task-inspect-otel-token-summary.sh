#!/usr/bin/env bash
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

    local input_tokens output_tokens llm_calls
    input_tokens=$(jq -r '
        [.. | objects | select(.key == "gen_ai.usage.input_tokens") | .value.intValue // .value.stringValue // 0 | tonumber] | add // 0
    ' "$file" 2>/dev/null || echo 0)

    output_tokens=$(jq -r '
        [.. | objects | select(.key == "gen_ai.usage.output_tokens") | .value.intValue // .value.stringValue // 0 | tonumber] | add // 0
    ' "$file" 2>/dev/null || echo 0)

    llm_calls=$(jq -r '
        [.. | objects | select(.name? // "" | test("^chat ")) ] | length
    ' "$file" 2>/dev/null || echo 0)

    printf "%-50s  %8s input  %8s output  %4s calls\n" "$basename" "$input_tokens" "$output_tokens" "$llm_calls"
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
        input=$(jq -r '[.. | objects | select(.key == "gen_ai.usage.input_tokens") | .value.intValue // .value.stringValue // 0 | tonumber] | add // 0' "$f" 2>/dev/null || echo 0)
        output=$(jq -r '[.. | objects | select(.key == "gen_ai.usage.output_tokens") | .value.intValue // .value.stringValue // 0 | tonumber] | add // 0' "$f" 2>/dev/null || echo 0)
        calls=$(jq -r '[.. | objects | select(.name? // "" | test("^chat ")) ] | length' "$f" 2>/dev/null || echo 0)
        total_input=$((total_input + input))
        total_output=$((total_output + output))
        total_calls=$((total_calls + calls))
    done
    echo ""
    echo "--- TOTALS ---"
    printf "%-50s  %8s input  %8s output  %4s calls\n" "ALL FILES" "$total_input" "$total_output" "$total_calls"
else
    summarize_file "$TARGET"
fi
