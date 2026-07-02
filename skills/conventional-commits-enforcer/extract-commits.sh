#!/usr/bin/env bash
# extract-commits.sh
# Extracts commit history in a machine-parseable format for the
# conventional-commits-enforcer skill to validate and turn into a changelog.
#
# Usage:
#   ./extract-commits.sh                 # commits since last tag
#   ./extract-commits.sh <since>..<until> # explicit git range
#
# Output format per line: <sha>|||<subject>|||<body-with-\\n-escaped>

set -euo pipefail

RANGE="${1:-}"

if [ -z "$RANGE" ]; then
  LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"
  if [ -n "$LAST_TAG" ]; then
    RANGE="${LAST_TAG}..HEAD"
  else
    RANGE="HEAD"
  fi
fi

git log --no-merges "$RANGE" \
  --pretty=format:'%H|||%s|||%b%x00' \
  | tr '\n' ' ' \
  | tr '\0' '\n' \
  | sed '/^\s*$/d'
