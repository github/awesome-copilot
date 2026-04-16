#!/bin/bash

# Log session end to ~/.copilot-work-log/sessions.jsonl

set -euo pipefail

# Skip if logging disabled
if [[ "${SKIP_WORK_LOG:-}" == "true" ]]; then
  exit 0
fi

# Read input from Copilot (required by hook protocol)
INPUT=$(cat)

# Configurable log directory
LOG_DIR="${WORK_LOG_DIR:-$HOME/.copilot-work-log}"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Write JSON record
printf '{"timestamp":"%s","event":"session_end","pid":%d}\n' \
  "$TIMESTAMP" "$$" \
  >> "$LOG_DIR/sessions.jsonl"

exit 0
