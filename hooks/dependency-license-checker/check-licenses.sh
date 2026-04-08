#!/bin/bash

# Dependency License Checker Hook
# Scans newly added dependencies for license compliance (GPL, AGPL, etc.)
# at session end, before they get committed.
#
# Environment variables:
#   LICENSE_MODE        - "warn" (log only) or "block" (exit non-zero on violations) (default: warn)
#   SKIP_LICENSE_CHECK  - "true" to disable entirely (default: unset)
#   LICENSE_LOG_DIR     - Directory for check logs (default: logs/copilot/license-checker)
#   BLOCKED_LICENSES    - Comma-separated SPDX IDs to flag (default: copyleft set)
#   LICENSE_ALLOWLIST   - Comma-separated package names to skip (default: unset)

set -euo pipefail

# ---------------------------------------------------------------------------
# Early exit if disabled
# ---------------------------------------------------------------------------
if [[ "${SKIP_LICENSE_CHECK:-}" == "true" ]]; then
  echo "⏭️  License check skipped (SKIP_LICENSE_CHECK=true)"
  exit 0
fi

# Ensure we are in a git repository
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "⚠️  Not in a git repository, skipping license check"
  exit 0
fi

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODE="${LICENSE_MODE:-warn}"
LOG_DIR="${LICENSE_LOG_DIR:-logs/copilot/license-checker}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FINDING_COUNT=0

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/check.log"

# Default blocked licenses (copyleft / restrictive)
DEFAULT_BLOCKED="GPL-2.0,GPL-2.0-only,GPL-2.0-or-later,GPL-3.0,GPL-3.0-only,GPL-3.0-or-later,AGPL-1.0,AGPL-3.0,AGPL-3.0-only,AGPL-3.0-or-later,LGPL-2.0,LGPL-2.1,LGPL-2.1-only,LGPL-2.1-or-later,LGPL-3.0,LGPL-3.0-only,LGPL-3.0-or-later,SSPL-1.0,EUPL-1.1,EUPL-1.2,OSL-3.0,CPAL-1.0,CPL-1.0,CC-BY-SA-4.0,CC-BY-NC-4.0,CC-BY-NC-SA-4.0"

BLOCKED_LIST=()
IFS=',' read -ra BLOCKED_LIST <<< "${BLOCKED_LICENSES:-$DEFAULT_BLOCKED}"

# Parse allowlist
ALLOWLIST=()
if [[ -n "${LICENSE_ALLOWLIST:-}" ]]; then
  IFS=',' read -ra ALLOWLIST <<< "$LICENSE_ALLOWLIST"
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g'
}

is_allowlisted() {
  local pkg="$1"
  for entry in "${ALLOWLIST[@]}"; do
    entry=$(printf '%s' "$entry" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [[ -z "$entry" ]] && continue
    if [[ "$pkg" == "$entry" ]]; then
      return 0
    fi
  done
  return 1
}

is_blocked_license() {
  local license="$1"
  local license_lower
  license_lower=$(printf '%s' "$license" | tr '[:upper:]' '[:lower:]')
  for blocked in "${BLOCKED_LIST[@]}"; do
    blocked=$(printf '%s' "$blocked" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [[ -z "$blocked" ]] && continue
    local blocked_lower
    blocked_lower=$(printf '%s' "$blocked" | tr '[:upper:]' '[:lower:]')
    # Substring match to handle SPDX variants and compound expressions
    if [[ "$license_lower" == *"$blocked_lower"* ]]; then
      return 0
    fi
  done
  return 1
}

# ---------------------------------------------------------------------------
# Phase 1: Detect new dependencies per ecosystem
# ---------------------------------------------------------------------------
NEW_DEPS=()

# npm / yarn / pnpm — package.json
if git diff HEAD -- package.json &>/dev/null; then
  while IFS= read -r line; do
    # Match added lines like:  "package-name": "^1.0.0"
    pkg=$(printf '%s' "$line" | sed -n 's/^+[[:space:]]*"\([^"]*\)"[[:space:]]*:[[:space:]]*"[^"]*".*/\1/p')
    if [[ -n "$pkg" && "$pkg" != "name" && "$pkg" != "version" && "$pkg" != "description" && "$pkg" != "main" && "$pkg" != "scripts" && "$pkg" != "dependencies" && "$pkg" != "devDependencies" && "$pkg" != "peerDependencies" && "$pkg" != "optionalDependencies" ]]; then
      NEW_DEPS+=("npm:$pkg")
    fi
  done < <(git diff HEAD -- package.json 2>/dev/null | grep '^+' | grep -v '^+++')
fi

# pip — requirements.txt
if git diff HEAD -- requirements.txt &>/dev/null; then
  while IFS= read -r line; do
    # Skip comments and blank lines
    clean=$(printf '%s' "$line" | sed 's/^+//')
    [[ "$clean" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$clean" ]] && continue
    # Extract package name before ==, >=, <=, ~=, !=, etc.
    pkg=$(printf '%s' "$clean" | sed 's/[[:space:]]*[><=!~].*//' | sed 's/[[:space:]]*//')
    if [[ -n "$pkg" ]]; then
      NEW_DEPS+=("pip:$pkg")
    fi
  done < <(git diff HEAD -- requirements.txt 2>/dev/null | grep '^+' | grep -v '^+++')
fi

# pip — pyproject.toml
if git diff HEAD -- pyproject.toml &>/dev/null; then
  while IFS= read -r line; do
    # Match added lines with quoted dependency strings
    pkg=$(printf '%s' "$line" | sed -n 's/^+[[:space:]]*"\([A-Za-z0-9_-]*\).*/\1/p')
    if [[ -n "$pkg" ]]; then
      NEW_DEPS+=("pip:$pkg")
    fi
  done < <(git diff HEAD -- pyproject.toml 2>/dev/null | grep '^+' | grep -v '^+++')
fi

# Go — go.mod
if git diff HEAD -- go.mod &>/dev/null; then
  while IFS= read -r line; do
    # Match added require entries like: +	github.com/foo/bar v1.2.3
    pkg=$(printf '%s' "$line" | sed -n 's/^+[[:space:]]*\([a-zA-Z0-9._/-]*\.[a-zA-Z0-9._/-]*\)[[:space:]].*/\1/p')
    if [[ -n "$pkg" && "$pkg" != "module" && "$pkg" != "go" && "$pkg" != "require" ]]; then
      NEW_DEPS+=("go:$pkg")
    fi
  done < <(git diff HEAD -- go.mod 2>/dev/null | grep '^+' | grep -v '^+++')
fi

# Ruby — Gemfile
if git diff HEAD -- Gemfile &>/dev/null; then
  while IFS= read -r line; do
    # Match added gem lines like: +gem 'package-name'
    pkg=$(printf '%s' "$line" | sed -n "s/^+[[:space:]]*gem[[:space:]]*['\"\`]\([^'\"\`]*\)['\"\`].*/\1/p")
    if [[ -n "$pkg" ]]; then
      NEW_DEPS+=("ruby:$pkg")
    fi
  done < <(git diff HEAD -- Gemfile 2>/dev/null | grep '^+' | grep -v '^+++')
fi

# Rust — Cargo.toml
if git diff HEAD -- Cargo.toml &>/dev/null; then
  while IFS= read -r line; do
    # Match added dependency entries like: +package-name = "1.0"  or  +package-name = { version = "1.0" }
    pkg=$(printf '%s' "$line" | sed -n 's/^+[[:space:]]*\([a-zA-Z0-9_-]*\)[[:space:]]*=.*/\1/p')
    if [[ -n "$pkg" && "$pkg" != "name" && "$pkg" != "version" && "$pkg" != "edition" && "$pkg" != "authors" && "$pkg" != "description" && "$pkg" != "license" && "$pkg" != "repository" && "$pkg" != "rust-version" ]]; then
      NEW_DEPS+=("rust:$pkg")
    fi
  done < <(git diff HEAD -- Cargo.toml 2>/dev/null | grep '^+' | grep -v '^+++')
fi

# Exit clean if no new dependencies found
if [[ ${#NEW_DEPS[@]} -eq 0 ]]; then
  echo "✅ No new dependencies detected"
  printf '{"timestamp":"%s","event":"license_check_complete","mode":"%s","status":"clean","dependencies_checked":0}\n' \
    "$TIMESTAMP" "$MODE" >> "$LOG_FILE"
  exit 0
fi

echo "🔍 Checking licenses for ${#NEW_DEPS[@]} new dependency(ies)..."

# ---------------------------------------------------------------------------
# Phase 2: Check license per dependency
# ---------------------------------------------------------------------------
RESULTS=()

get_license() {
  local ecosystem="$1"
  local pkg="$2"
  local license="UNKNOWN"

  case "$ecosystem" in
    npm)
      # Primary: check node_modules
      if [[ -f "node_modules/$pkg/package.json" ]]; then
        if command -v jq &>/dev/null; then
          license=$(jq -r '.license // "UNKNOWN"' "node_modules/$pkg/package.json" 2>/dev/null || echo "UNKNOWN")
        else
          license=$(grep -oE '"license"\s*:\s*"[^"]*"' "node_modules/$pkg/package.json" 2>/dev/null | head -1 | sed 's/.*"license"\s*:\s*"//;s/"//' || echo "UNKNOWN")
        fi
      fi
      # Fallback: npm view
      if [[ "$license" == "UNKNOWN" ]] && command -v npm &>/dev/null; then
        license=$(timeout 5 npm view "$pkg" license 2>/dev/null || echo "UNKNOWN")
      fi
      ;;
    pip)
      # Primary: pip show
      if command -v pip &>/dev/null; then
        license=$(timeout 5 pip show "$pkg" 2>/dev/null | grep -i '^License:' | sed 's/^[Ll]icense:[[:space:]]*//' || echo "UNKNOWN")
      elif command -v pip3 &>/dev/null; then
        license=$(timeout 5 pip3 show "$pkg" 2>/dev/null | grep -i '^License:' | sed 's/^[Ll]icense:[[:space:]]*//' || echo "UNKNOWN")
      fi
      ;;
    go)
      # Check module cache for LICENSE file
      local gopath="${GOPATH:-$HOME/go}"
      local mod_dir="$gopath/pkg/mod/$pkg"
      # Try to find the latest version directory
      if [[ -d "$gopath/pkg/mod" ]]; then
        local found_dir
        found_dir=$(find "$gopath/pkg/mod" -maxdepth 4 -path "*${pkg}@*" -type d 2>/dev/null | head -1)
        if [[ -n "$found_dir" ]]; then
          local lic_file
          lic_file=$(find "$found_dir" -maxdepth 1 -iname 'LICENSE*' -type f 2>/dev/null | head -1)
          if [[ -n "$lic_file" ]]; then
            # Keyword match against common license identifiers
            if grep -qiE 'GNU GENERAL PUBLIC LICENSE' "$lic_file" 2>/dev/null; then
              if grep -qiE 'Version 3' "$lic_file" 2>/dev/null; then
                license="GPL-3.0"
              elif grep -qiE 'Version 2' "$lic_file" 2>/dev/null; then
                license="GPL-2.0"
              else
                license="GPL"
              fi
            elif grep -qiE 'GNU LESSER GENERAL PUBLIC' "$lic_file" 2>/dev/null; then
              license="LGPL"
            elif grep -qiE 'GNU AFFERO GENERAL PUBLIC' "$lic_file" 2>/dev/null; then
              license="AGPL-3.0"
            elif grep -qiE 'MIT License' "$lic_file" 2>/dev/null; then
              license="MIT"
            elif grep -qiE 'Apache License' "$lic_file" 2>/dev/null; then
              license="Apache-2.0"
            elif grep -qiE 'BSD' "$lic_file" 2>/dev/null; then
              license="BSD"
            fi
          fi
        fi
      fi
      ;;
    ruby)
      # gem spec
      if command -v gem &>/dev/null; then
        license=$(timeout 5 gem spec "$pkg" license 2>/dev/null | grep -v '^---' | grep -v '^\.\.\.' | sed 's/^- //' | head -1 || echo "UNKNOWN")
        [[ -z "$license" ]] && license="UNKNOWN"
      fi
      ;;
    rust)
      # cargo metadata
      if command -v cargo &>/dev/null; then
        if command -v jq &>/dev/null; then
          license=$(timeout 5 cargo metadata --format-version 1 2>/dev/null | jq -r ".packages[] | select(.name == \"$pkg\") | .license // \"UNKNOWN\"" 2>/dev/null | head -1 || echo "UNKNOWN")
        fi
      fi
      ;;
  esac

  # Normalize empty / whitespace-only to UNKNOWN
  license=$(printf '%s' "$license" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [[ -z "$license" ]] && license="UNKNOWN"

  printf '%s' "$license"
}

for dep in "${NEW_DEPS[@]}"; do
  ecosystem="${dep%%:*}"
  pkg="${dep#*:}"

  license=$(get_license "$ecosystem" "$pkg")
  RESULTS+=("$ecosystem	$pkg	$license")
done

# ---------------------------------------------------------------------------
# Phase 3 & 4: Check against blocked list and allowlist
# ---------------------------------------------------------------------------
VIOLATIONS=()

for result in "${RESULTS[@]}"; do
  IFS=$'\t' read -r ecosystem pkg license <<< "$result"

  # Phase 4: Skip allowlisted packages
  if [[ ${#ALLOWLIST[@]} -gt 0 ]] && is_allowlisted "$pkg"; then
    continue
  fi

  # Phase 3: Check against blocked list
  if is_blocked_license "$license"; then
    VIOLATIONS+=("$pkg	$ecosystem	$license	BLOCKED")
    FINDING_COUNT=$((FINDING_COUNT + 1))
  fi
done

# ---------------------------------------------------------------------------
# Phase 5: Output & logging
# ---------------------------------------------------------------------------
echo ""
printf "  %-30s %-12s %-30s %s\n" "PACKAGE" "ECOSYSTEM" "LICENSE" "STATUS"
printf "  %-30s %-12s %-30s %s\n" "-------" "---------" "-------" "------"

for result in "${RESULTS[@]}"; do
  IFS=$'\t' read -r ecosystem pkg license <<< "$result"

  status="OK"
  if [[ ${#ALLOWLIST[@]} -gt 0 ]] && is_allowlisted "$pkg"; then
    status="ALLOWLISTED"
  elif is_blocked_license "$license"; then
    status="BLOCKED"
  fi

  printf "  %-30s %-12s %-30s %s\n" "$pkg" "$ecosystem" "$license" "$status"
done

echo ""

# Build JSON findings array
FINDINGS_JSON="["
FIRST=true
for violation in "${VIOLATIONS[@]}"; do
  IFS=$'\t' read -r pkg ecosystem license status <<< "$violation"
  if [[ "$FIRST" != "true" ]]; then
    FINDINGS_JSON+=","
  fi
  FIRST=false
  FINDINGS_JSON+="{\"package\":\"$(json_escape "$pkg")\",\"ecosystem\":\"$(json_escape "$ecosystem")\",\"license\":\"$(json_escape "$license")\",\"status\":\"$(json_escape "$status")\"}"
done
FINDINGS_JSON+="]"

# Write structured log entry
printf '{"timestamp":"%s","event":"license_check_complete","mode":"%s","dependencies_checked":%d,"violation_count":%d,"violations":%s}\n' \
  "$TIMESTAMP" "$MODE" "${#RESULTS[@]}" "$FINDING_COUNT" "$FINDINGS_JSON" >> "$LOG_FILE"

if [[ $FINDING_COUNT -gt 0 ]]; then
  echo "⚠️  Found $FINDING_COUNT license violation(s):"
  echo ""
  for violation in "${VIOLATIONS[@]}"; do
    IFS=$'\t' read -r pkg ecosystem license status <<< "$violation"
    echo "  - $pkg ($ecosystem): $license"
  done
  echo ""

  if [[ "$MODE" == "block" ]]; then
    echo "🚫 Session blocked: resolve license violations above before committing."
    echo "   Set LICENSE_MODE=warn to log without blocking, or add packages to LICENSE_ALLOWLIST."
    exit 1
  else
    echo "💡 Review the violations above. Set LICENSE_MODE=block to prevent commits with license issues."
  fi
else
  echo "✅ All ${#RESULTS[@]} dependencies have compliant licenses"
fi

exit 0
