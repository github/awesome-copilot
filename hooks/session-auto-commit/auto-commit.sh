#!/bin/bash

# Session Auto-Commit Hook
# Automatically commits and pushes changes when a Copilot session ends
# Requires AUTO_COMMIT=1 to be set explicitly to prevent silent commits.

set -euo pipefail

# Require explicit opt-in
if [[ "${AUTO_COMMIT:-}" != "1" ]]; then
  echo "⏭️  Auto-commit skipped (set AUTO_COMMIT=1 to enable)"
  exit 0
fi

# Check if SKIP_AUTO_COMMIT is set
if [[ "${SKIP_AUTO_COMMIT:-}" == "true" ]]; then
  echo "⏭️  Auto-commit skipped (SKIP_AUTO_COMMIT=true)"
  exit 0
fi

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "⚠️  Not in a git repository"
  exit 0
fi

# Check for uncommitted changes
if [[ -z "$(git status --porcelain)" ]]; then
  echo "✨ No changes to commit"
  exit 0
fi

echo "📦 Auto-committing changes from Copilot session..."

# Stage only tracked/modified files — not untracked files
git add -u

# Create timestamped commit (no --no-verify: allow pre-commit hooks including secrets-scanner)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "auto-commit: $TIMESTAMP" 2>/dev/null || {
  echo "⚠️  Commit failed"
  exit 0
}

# Attempt to push
if git push 2>/dev/null; then
  echo "✅ Changes committed and pushed successfully"
else
  echo "⚠️  Push failed - changes committed locally"
fi

exit 0
