#!/usr/bin/env bash
#
# redact-secrets.sh — Redact secret-bearing fields from shepherd JSONL logs.
#
# Usage: ./redact-secrets.sh <log-directory>
#        ./redact-secrets.sh -
#   A directory contains .json* files produced by shepherd-task. With "-" the
#   script reads JSONL from stdin and writes redacted JSONL to stdout.

set -euo pipefail

TARGET="${1:?Usage: $0 <log-directory>}"

JQ_FILTER='
    def sensitive_key:
        test("(?i)(password|passwd|secret|token|api[-_]?key|authorization|credential|private[-_]?key|access[-_]?key|client[-_]?secret|connection[-_]?string)");
    def content_key:
        test("(?i)^(content|encryptedContent|reasoningOpaque|arguments|result|error|prompt|toolRequests|userContent|assistantContent|toolCompleteResultContent)$");
    def scrub_string:
        gsub("(?i)bearer[[:space:]]+[A-Za-z0-9._~+/-]+"; "Bearer [REDACTED]")
        | gsub("gh[opsu]_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+|xox[baprs]-[A-Za-z0-9-]+|AIza[0-9A-Za-z_-]+"; "[REDACTED]")
        | gsub("[A-Za-z0-9+/]{20,}[+/][A-Za-z0-9+/]{20,}={0,2}"; "[REDACTED]");
    def scrub:
        if type == "object" then
            with_entries(
                if ((.key | sensitive_key) or (.key | content_key)) then
                    .value = "[REDACTED]"
                else
                    .value |= scrub
                end
            )
        elif type == "array" then
            map(scrub)
        elif type == "string" then
            scrub_string
        else
            .
        end;
    scrub
'

redact_file() {
    local file="$1"
    local temp
    temp=$(mktemp "${file}.redact.XXXXXX")

    if ! while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ -z "$line" ]]; then
            printf '\n'
        else
            printf '%s\n' "$line" | jq -c "$JQ_FILTER"
        fi
    done <"$file" >"$temp"; then
        rm -f "$temp"
        echo "Invalid JSONL; left unchanged: $file" >&2
        exit 1
    fi

    chmod --reference="$file" "$temp"
    mv "$temp" "$file"
    echo "Redacted $file"
}

if [[ "$TARGET" == "-" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ -z "$line" ]]; then
            printf '\n'
        else
            printf '%s\n' "$line" | jq -c "$JQ_FILTER"
        fi
    done
    exit 0
fi

LOG_DIR="$TARGET"
if [[ ! -d "$LOG_DIR" ]]; then
    echo "Log directory not found: $LOG_DIR" >&2
    exit 1
fi

mapfile -d '' files < <(find "$LOG_DIR" -type f -name '*.json*' -print0)
if [[ ${#files[@]} -eq 0 ]]; then
    echo "No .json* files found in $LOG_DIR" >&2
    exit 1
fi

for file in "${files[@]}"; do
    redact_file "$file"
done
