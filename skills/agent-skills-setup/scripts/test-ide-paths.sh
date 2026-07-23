#!/usr/bin/env bash
#
# test-ide-paths.sh — Drift guard for per-IDE path mappings.
#
# SINGLE SOURCE OF TRUTH: skills/agent-skills-setup/references/ide-paths.json
# (which mirrors ide-registry.md). For every ide/object pair in that JSON we
# call smart-ide-migration.sh --print-path and assert the resolved path equals
# the JSON value. This catches drift between the script's hardcoded case
# tables and the canonical registry/JSON.
#
# Additionally, for the key IDEs (kimiai/copilot/codex/workbuddy) every
# non-empty JSON value must literally appear in ide-registry.md.
#
# Exits non-zero on ANY mismatch; exits 0 if all checks pass.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_FILE="${SCRIPT_DIR}/../references/ide-paths.json"
MIGRATION_SCRIPT="${SCRIPT_DIR}/smart-ide-migration.sh"
REGISTRY_FILE="${SCRIPT_DIR}/../references/ide-registry.md"

if [[ ! -f "$JSON_FILE" ]]; then
    echo "ERROR: cannot find ide-paths.json at $JSON_FILE" >&2
    exit 1
fi
if [[ ! -f "$MIGRATION_SCRIPT" ]]; then
    echo "ERROR: cannot find smart-ide-migration.sh at $MIGRATION_SCRIPT" >&2
    exit 1
fi

failures=0
checks=0

# Map JSON object keys -> --print-path object names and emit rows as
# TAB-separated: ide <TAB> json_key <TAB> script_object <TAB> expected
dump_rows() {
    python3 - "$JSON_FILE" "$@" <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
keymap = {"global_skills":"global","project_skills":"project","rules":"rules","mcp":"mcp","config":"config"}
key_filter = set(sys.argv[2:]) if len(sys.argv) > 2 else None
for ide in sorted(data.keys()):
    if key_filter is not None and ide not in key_filter:
        continue
    for jk in keymap:
        val = data[ide].get(jk, "")
        print(f"{ide}\t{jk}\t{keymap[jk]}\t{val}")
PYEOF
}

echo "========================================"
echo "Drift test: ide-paths.json vs script"
echo "========================================"
echo ""

ALL_ROWS="$(dump_rows)"
while IFS=$'\t' read -r ide jsonkey scriptobj expected; do
    [[ -z "$ide" ]] && continue
    checks=$((checks + 1))

    actual="$(bash "$MIGRATION_SCRIPT" --print-path "$ide" "$scriptobj" 2>/dev/null)"
    rc=$?

    if [[ -z "$expected" ]]; then
        # Unsupported object -> script may exit non-zero with empty stdout.
        if [[ -n "$actual" ]]; then
            echo "FAIL: ${ide}/${jsonkey} - expected empty, got: ${actual}"
            failures=$((failures + 1))
        else
            echo "PASS: ${ide}/${jsonkey} -> (unsupported/empty)"
        fi
    else
        if [[ $rc -ne 0 ]]; then
            echo "FAIL: ${ide}/${jsonkey} - script exited non-zero resolving object '${scriptobj}'"
            failures=$((failures + 1))
        elif [[ "$actual" != "$expected" ]]; then
            echo "FAIL: ${ide}/${jsonkey}"
            echo "  expected: ${expected}"
            echo "  actual:   ${actual}"
            failures=$((failures + 1))
        else
            echo "PASS: ${ide}/${jsonkey} -> ${actual}"
        fi
    fi
done <<< "$ALL_ROWS"

# --- Registry cross-check for key IDEs ---
# For kimiai/copilot/codex/workbuddy, every non-empty JSON value must literally
# appear somewhere in ide-registry.md (the canonical human-readable source).
if [[ -f "$REGISTRY_FILE" ]]; then
    echo ""
    echo "========================================"
    echo "Cross-check: key IDEs vs ide-registry.md"
    echo "========================================"
    echo ""

    KEY_ROWS="$(dump_rows kimiai copilot codex workbuddy)"
    while IFS=$'\t' read -r ide jsonkey _scriptobj expected; do
        [[ -z "$expected" ]] && continue
        checks=$((checks + 1))
        if grep -Fq "$expected" "$REGISTRY_FILE"; then
            echo "PASS (registry): ${ide}/${jsonkey} present in ide-registry.md"
        else
            echo "FAIL (registry): ${ide}/${jsonkey} value '${expected}' NOT found in ide-registry.md"
            failures=$((failures + 1))
        fi
    done <<< "$KEY_ROWS"
else
    echo "WARN: ide-registry.md not found at $REGISTRY_FILE; skipping registry cross-check" >&2
fi

echo ""
echo "========================================"
if [[ $failures -eq 0 ]]; then
    echo "ALL PASS: ${checks} checks matched ide-paths.json / ide-registry.md"
    echo "========================================"
    exit 0
else
    echo "DRIFT DETECTED: ${failures}/${checks} checks FAILED"
    echo "========================================"
    exit 1
fi
