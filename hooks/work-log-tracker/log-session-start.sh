#!/bin/bash

# Log session start with git context to ~/.copilot-work-log/sessions.jsonl

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
CWD=$(pwd)

# Detect git repo and branch (fail gracefully)
GIT_REPO=""
GIT_BRANCH=""
if command -v git &>/dev/null && git rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
  GIT_REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "")
  GIT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
fi

# Write JSON record (no jq dependency — pure bash)
printf '{"timestamp":"%s","event":"session_start","cwd":"%s","repo":"%s","branch":"%s","pid":%d}\n' \
  "$TIMESTAMP" "$CWD" "$GIT_REPO" "$GIT_BRANCH" "$$" \
  >> "$LOG_DIR/sessions.jsonl"

exit 0
