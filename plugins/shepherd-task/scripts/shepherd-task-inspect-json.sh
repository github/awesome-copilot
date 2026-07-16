#!/usr/bin/env bash
#
# shepherd-task-inspect-json.sh — Show the last N meaningful events from a copilot JSON log.
#
# Usage: ./shepherd-task-inspect-json.sh <json-file> [count]
#   json-file: path to the JSON log file
#   count:     number of messages to show (default: 20)

set -euo pipefail

JSON_FILE="${1:?Usage: $0 <json-file> [count]}"
COUNT="${2:-20}"

grep -v '"ephemeral":true' "$JSON_FILE" | tail -n "$COUNT" | while IFS= read -r line; do
    ts=$(echo "$line" | jq -r '.timestamp // empty' | xargs -I{} date -d {} +%H:%M:%S 2>/dev/null || echo "$line" | jq -r '.timestamp // "--------" | .[11:19]')
    type=$(echo "$line" | jq -r '.type')

    case "$type" in
        user.message)
            content=$(echo "$line" | jq -r '.data.content[0:80]')
            echo "$ts | USER: $content"
            ;;
        assistant.message)
            content=$(echo "$line" | jq -r 'if .data.content != "" then .data.content[0:80] else "[tool calls: " + ([.data.toolRequests[].name] | join(", ")) + "]" end')
            echo "$ts | ASST: $content"
            ;;
        tool.execution_start)
            tool=$(echo "$line" | jq -r '.data.toolName')
            desc=$(echo "$line" | jq -r '.data.arguments.description // ""')
            echo "$ts | TOOL> $tool :: $desc"
            ;;
        tool.execution_complete)
            status=$(echo "$line" | jq -r 'if .data.success then "OK" else "FAIL" end')
            echo "$ts | TOOL< $status"
            ;;
        assistant.reasoning)
            content=$(echo "$line" | jq -r '.data.content[0:80]')
            echo "$ts | THINK: $content"
            ;;
        *)
            echo "$ts | $type"
            ;;
    esac
done
