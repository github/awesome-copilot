#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Native Windows Python ignores MSYS-style env values; convert HOME
# fixtures so $HOME resolution sees a real directory on every platform.

# Pin surface resolution to the POSIX layout the fixtures create;
# otherwise windows-latest would resolve $APPDATA-style overrides.
export AGENT_SKILLS_PLATFORM=linux

native_path() {
    if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
MIGRATION_SCRIPT="$SCRIPT_DIR/legacy-smart-ide-migration.sh"
export AGENT_SKILLS_SETUP_INTERNAL_LEGACY=1
TMP_ROOT="$(mktemp -d /tmp/migration-evidence-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
WORKSPACE="$TMP_ROOT/workspace"
SOURCE_FILE="$TMP_ROOT/cursor-mcp.json"
DRY_REPORT="$TMP_ROOT/dry-run.json"
APPLY_REPORT="$TMP_ROOT/apply.json"
mkdir -p "$TEST_HOME" "$WORKSPACE"

printf '%s\n' '{"mcpServers":{"fixture":{"command":"node","args":["server.js"]}}}' > "$SOURCE_FILE"

# Explicit file/workspace arguments must cross into the engine natively;
# MSYS does not translate values after unknown options.
if command -v cygpath >/dev/null 2>&1; then
    WS_ARG="$(cygpath -w "$WORKSPACE")"; SRC_ARG="$(cygpath -w "$SOURCE_FILE")"
else
    WS_ARG="$WORKSPACE"; SRC_ARG="$SOURCE_FILE"
fi

HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target opencode --workspace "$WS_ARG" \
    --objects project-mcp --source-mcp-file "$SRC_ARG" \
    --strategy backup --dry-run --json > "$DRY_REPORT" 2>/dev/null

python3 - "$DRY_REPORT" "$SOURCE_FILE" "$WORKSPACE/opencode.json" <<'PYEOF'
import json
import pathlib
import sys

report = json.load(open(sys.argv[1]))
source = str(pathlib.Path(sys.argv[2]).resolve())
target = str(pathlib.Path(sys.argv[3]).resolve())
assert report["mode"] == "dry-run"
assert report["scope"] == "project"
assert report["objects"] == ["project-mcp"]
evidence = report["evidence"]["mcp"][0]
assert evidence["scope"] == "project"
if evidence["source_path"] != source:
    raise SystemExit(
        f"source_path mismatch:\n  evidence={evidence['source_path']!r}\n"
        f"  expected={source!r}\n  target={target!r} evidence_target={evidence.get('target_path')!r}"
    )
assert evidence["target_path"] == target
assert evidence["source_unchanged"] is True
assert evidence["target_exists"] is False
assert evidence["target_validation"] == "absent"
if len(evidence["source_sha256_before"]) != 64:
    raise SystemExit(f"unexpected evidence record: {json.dumps(evidence)}")
assert len(evidence["source_sha256_before"]) == 64
if evidence["source_sha256_before"] != evidence["source_sha256_after"]:
    raise SystemExit(
        f"source hash drifted: before={evidence['source_sha256_before']!r} "
        f"after={evidence['source_sha256_after']!r} "
        f"unchanged_flag={evidence.get('source_unchanged')!r}"
    )
PYEOF

HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target opencode --workspace "$WS_ARG" \
    --objects project-mcp --source-mcp-file "$SRC_ARG" \
    --strategy backup --yes --json > "$APPLY_REPORT" 2>/dev/null

python3 - "$APPLY_REPORT" <<'PYEOF'
import json
import sys

report = json.load(open(sys.argv[1]))
assert report["mode"] == "apply"
evidence = report["evidence"]["mcp"][0]
assert evidence["source_unchanged"] is True
assert evidence["target_exists"] is True
assert evidence["target_validation"] == "valid-json"
assert len(evidence["target_sha256"]) == 64
PYEOF

echo "PASS: JSON report contains deterministic MCP migration evidence"
