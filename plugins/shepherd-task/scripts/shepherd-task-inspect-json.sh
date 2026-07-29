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

jq -Rrc '
    select(contains("\"ephemeral\":true") | not)
    | select(contains("\"tool.execution_partial_result\"") | not)
    | fromjson?
' "$JSON_FILE" | tail -n "$COUNT" | while IFS= read -r line; do
    ts=$(echo "$line" | jq -r 'if .timestamp then .timestamp[11:19] else "--------" end')
    type=$(echo "$line" | jq -r '.type')

    case "$type" in
        user.message)
            content=$(echo "$line" | jq -r '(.data.content // "")[0:120]')
            echo "$ts | USER: $content"
            ;;
        assistant.message)
            content=$(echo "$line" | jq -r 'if (.data.content // "") != "" then .data.content[0:120] else "[tool calls: " + ([.data.toolRequests[]?.name] | join(", ")) + "]" end')
            echo "$ts | ASST: $content"
            ;;
        tool.execution_start)
            tool=$(echo "$line" | jq -r '.data.toolName')
            arguments=$(echo "$line" | jq -c '.data.arguments' | tr -d '\r\n')
            if [[ ${#arguments} -gt 80 ]]; then
                arguments="${arguments:0:77}..."
            fi
            echo "$ts | TOOL> $tool :: $arguments"
            ;;
        tool.execution_complete)
            status=$(echo "$line" | jq -r 'if .data.success then "OK" else "FAIL" end')
            echo "$ts | TOOL< $status"
            ;;
        assistant.reasoning)
            content=$(echo "$line" | jq -r '(.data.content // "")[0:120]')
            echo "$ts | THINK: $content"
            ;;
        assistant.turn_start|assistant.turn_end)
            ;;
        *)
            echo "$ts | $type"
            ;;
    esac
done
