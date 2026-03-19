#!/bin/bash

# Tool Guardian Hook
# Blocks dangerous tool operations (destructive file ops, force pushes, DB drops,
# etc.) before the Copilot coding agent executes them.
#
# Environment variables:
#   GUARD_MODE           - "warn" (log only) or "block" (exit non-zero on threats) (default: block)
#   SKIP_TOOL_GUARD      - "true" to disable entirely (default: unset)
#   TOOL_GUARD_LOG_DIR   - Directory for guard logs (default: logs/copilot/tool-guardian)
#   TOOL_GUARD_ALLOWLIST - Comma-separated patterns to skip (default: unset)

set -euo pipefail

# ---------------------------------------------------------------------------
# Early exit if disabled
# ---------------------------------------------------------------------------
if [[ "${SKIP_TOOL_GUARD:-}" == "true" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Read tool invocation from stdin (JSON with toolName + toolInput)
# ---------------------------------------------------------------------------
INPUT=$(cat)

MODE="${GUARD_MODE:-block}"
LOG_DIR="${TOOL_GUARD_LOG_DIR:-.github/logs/copilot/tool-guardian}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/guard.log"

# ---------------------------------------------------------------------------
# Extract tool name and input text
# ---------------------------------------------------------------------------
TOOL_NAME=""
TOOL_INPUT=""

if command -v jq &>/dev/null; then
  TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.toolName // empty' 2>/dev/null || echo "")
  TOOL_INPUT=$(printf '%s' "$INPUT" | jq -r '.toolInput // empty' 2>/dev/null || echo "")
fi

# Fallback: extract with grep/sed if jq unavailable or fields empty
if [[ -z "$TOOL_NAME" ]]; then
  TOOL_NAME=$(printf '%s' "$INPUT" | grep -oE '"toolName"\s*:\s*"[^"]*"' | head -1 | sed 's/.*"toolName"\s*:\s*"//;s/"//')
fi
if [[ -z "$TOOL_INPUT" ]]; then
  TOOL_INPUT=$(printf '%s' "$INPUT" | grep -oE '"toolInput"\s*:\s*"[^"]*"' | head -1 | sed 's/.*"toolInput"\s*:\s*"//;s/"//')
fi

# Combine for pattern matching
COMBINED="${TOOL_NAME} ${TOOL_INPUT}"

# ---------------------------------------------------------------------------
# Parse allowlist
# ---------------------------------------------------------------------------
ALLOWLIST=()
if [[ -n "${TOOL_GUARD_ALLOWLIST:-}" ]]; then
  IFS=',' read -ra ALLOWLIST <<< "$TOOL_GUARD_ALLOWLIST"
fi

is_allowlisted() {
  local text="$1"
  for pattern in "${ALLOWLIST[@]}"; do
    pattern=$(printf '%s' "$pattern" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [[ -z "$pattern" ]] && continue
    if [[ "$text" == *"$pattern"* ]]; then
      return 0
    fi
  done
  return 1
}

# Check allowlist early — if the combined text matches, skip all scanning
if [[ ${#ALLOWLIST[@]} -gt 0 ]] && is_allowlisted "$COMBINED"; then
  printf '{"timestamp":"%s","event":"guard_skipped","reason":"allowlisted","tool":"%s"}\n' \
    "$TIMESTAMP" "$TOOL_NAME" >> "$LOG_FILE"
  exit 0
fi

# ---------------------------------------------------------------------------
# Threat patterns (6 categories, ~20 patterns)
#
# Each entry: "CATEGORY:::SEVERITY:::REGEX:::SUGGESTION"
# Uses ::: as delimiter to avoid conflicts with regex pipe characters
# ---------------------------------------------------------------------------
PATTERNS=(
  # Destructive file operations
  "destructive_file_ops:::critical:::rm -rf /:::Use targeted 'rm' on specific paths instead of root"
  "destructive_file_ops:::critical:::rm -rf ~:::Use targeted 'rm' on specific paths instead of home directory"
  "destructive_file_ops:::critical:::rm -rf \.:::Use targeted 'rm' on specific files instead of current directory"
  "destructive_file_ops:::critical:::rm -rf \.\.:::Never remove parent directories recursively"
  "destructive_file_ops:::critical:::(rm|del|unlink).*\.env:::Use 'mv' to back up .env files before removing"
  "destructive_file_ops:::critical:::(rm|del|unlink).*\.git[^i]:::Never delete .git directory — use 'git' commands to manage repo state"

  # Destructive git operations
  "destructive_git_ops:::critical:::git push --force.*(main|master):::Use 'git push --force-with-lease' or push to a feature branch"
  "destructive_git_ops:::critical:::git push -f.*(main|master):::Use 'git push --force-with-lease' or push to a feature branch"
  "destructive_git_ops:::high:::git reset --hard:::Use 'git stash' to preserve changes, or 'git reset --soft'"
  "destructive_git_ops:::high:::git clean -fd:::Use 'git clean -n' (dry run) first to preview what will be deleted"

  # Database destruction
  "database_destruction:::critical:::DROP TABLE:::Use 'ALTER TABLE' or create a migration with rollback support"
  "database_destruction:::critical:::DROP DATABASE:::Create a backup first; consider revoking DROP privileges"
  "database_destruction:::critical:::TRUNCATE:::Use 'DELETE FROM ... WHERE' with a condition for safer data removal"
  "database_destruction:::high:::DELETE FROM [a-zA-Z_]+ *;:::Add a WHERE clause to 'DELETE FROM' to avoid deleting all rows"

  # Permission abuse
  "permission_abuse:::high:::chmod 777:::Use 'chmod 755' for directories or 'chmod 644' for files"
  "permission_abuse:::high:::chmod -R 777:::Use specific permissions ('chmod -R 755') and limit scope"

  # Network exfiltration
  "network_exfiltration:::critical:::curl.*\|.*bash:::Download the script first, review it, then execute"
  "network_exfiltration:::critical:::wget.*\|.*sh:::Download the script first, review it, then execute"
  "network_exfiltration:::high:::curl.*--data.*@:::Review what data is being sent before using 'curl --data @file'"

  # System danger
  "system_danger:::high:::sudo :::Avoid 'sudo' — run commands with the least privilege needed"
  "system_danger:::high:::npm publish:::Use 'npm publish --dry-run' first to verify package contents"
)

# ---------------------------------------------------------------------------
# Escape a string for safe JSON embedding
# ---------------------------------------------------------------------------
json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g'
}

# ---------------------------------------------------------------------------
# Scan combined text against threat patterns
# ---------------------------------------------------------------------------
THREATS=()
THREAT_COUNT=0

for entry in "${PATTERNS[@]}"; do
  category="${entry%%:::*}"
  rest="${entry#*:::}"
  severity="${rest%%:::*}"
  rest="${rest#*:::}"
  regex="${rest%%:::*}"
  suggestion="${rest#*:::}"

  if printf '%s\n' "$COMBINED" | grep -qiE "$regex" 2>/dev/null; then
    local_match=$(printf '%s\n' "$COMBINED" | grep -oiE "$regex" 2>/dev/null | head -1)
    THREATS+=("${category}	${severity}	${local_match}	${suggestion}")
    THREAT_COUNT=$((THREAT_COUNT + 1))
  fi
done

# ---------------------------------------------------------------------------
# Output and logging
# ---------------------------------------------------------------------------
if [[ $THREAT_COUNT -gt 0 ]]; then
  echo ""
  echo "🛡️  Tool Guardian: $THREAT_COUNT threat(s) detected in '$TOOL_NAME' invocation"
  echo ""
  printf "  %-24s %-10s %-40s %s\n" "CATEGORY" "SEVERITY" "MATCH" "SUGGESTION"
  printf "  %-24s %-10s %-40s %s\n" "--------" "--------" "-----" "----------"

  # Build JSON findings array
  FINDINGS_JSON="["
  FIRST=true
  for threat in "${THREATS[@]}"; do
    IFS=$'\t' read -r category severity match suggestion <<< "$threat"

    # Truncate match for display
    display_match="$match"
    if [[ ${#match} -gt 38 ]]; then
      display_match="${match:0:35}..."
    fi
    printf "  %-24s %-10s %-40s %s\n" "$category" "$severity" "$display_match" "$suggestion"

    if [[ "$FIRST" != "true" ]]; then
      FINDINGS_JSON+=","
    fi
    FIRST=false
    FINDINGS_JSON+="{\"category\":\"$(json_escape "$category")\",\"severity\":\"$(json_escape "$severity")\",\"match\":\"$(json_escape "$match")\",\"suggestion\":\"$(json_escape "$suggestion")\"}"
  done
  FINDINGS_JSON+="]"

  echo ""

  # Write structured log entry
  printf '{"timestamp":"%s","event":"threats_detected","mode":"%s","tool":"%s","threat_count":%d,"threats":%s}\n' \
    "$TIMESTAMP" "$MODE" "$(json_escape "$TOOL_NAME")" "$THREAT_COUNT" "$FINDINGS_JSON" >> "$LOG_FILE"

  if [[ "$MODE" == "block" ]]; then
    echo "🚫 Operation blocked: resolve the threats above or adjust TOOL_GUARD_ALLOWLIST."
    echo "   Set GUARD_MODE=warn to log without blocking."
    exit 1
  else
    echo "⚠️  Threats logged in warn mode. Set GUARD_MODE=block to prevent dangerous operations."
  fi
else
  # Log clean result
  printf '{"timestamp":"%s","event":"guard_passed","mode":"%s","tool":"%s"}\n' \
    "$TIMESTAMP" "$MODE" "$(json_escape "$TOOL_NAME")" >> "$LOG_FILE"
fi

exit 0
