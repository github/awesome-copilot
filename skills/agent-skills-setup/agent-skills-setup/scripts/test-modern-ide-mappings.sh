#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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
TMP_ROOT="$(mktemp -d /tmp/modern-ide-mappings.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
WORKSPACE="$TMP_ROOT/workspace"
mkdir -p "$TEST_HOME" "$WORKSPACE"

assert_path() {
    local ide="$1" object="$2" expected="$3" actual
    actual="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --print-path "$ide" "$object" 2>/dev/null || true)"
    [[ "$actual" == "$expected" ]] || {
        echo "FAIL: $ide/$object expected '$expected', got '$actual'" >&2
        exit 1
    }
}

assert_path visual-studio global "~/.copilot/skills"
assert_path visual-studio project-skills ".github/skills"
assert_path visual-studio rules ".github/copilot-instructions.md"
assert_path visual-studio project-mcp ".mcp.json"
assert_path jetbrains-ai project-skills ".agents/skills"
assert_path android-studio global "~/.agents/skills"
assert_path android-studio project-skills ".agents/skills"
assert_path android-studio rules "AGENTS.md"
assert_path firebase-studio rules ".idx/airules.md"

mkdir -p "$WORKSPACE/.cursor"
printf '%s\n' '{"mcpServers":{"fixture":{"command":"node","args":["server.js"]}}}' > "$WORKSPACE/.cursor/mcp.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target visual-studio --workspace "$WORKSPACE" \
    --objects project-mcp --dry-run >/dev/null 2>&1
[[ ! -e "$WORKSPACE/.mcp.json" ]] || {
    echo "FAIL: Visual Studio MCP dry-run wrote the target" >&2
    exit 1
}
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target visual-studio --workspace "$WORKSPACE" \
    --objects project-mcp --yes --strategy overwrite >/dev/null 2>&1
python3 - "$WORKSPACE/.mcp.json" <<'PY'
import json
import sys

data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data == {"servers": {"fixture": {"command": "node", "args": ["server.js"]}}}
PY

MCP_FAIL_WORKSPACE="$TMP_ROOT/mcp-failure"
mkdir -p "$MCP_FAIL_WORKSPACE"
printf '%s\n' '{not-json' > "$MCP_FAIL_WORKSPACE/.mcp.json"
if HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target visual-studio --workspace "$MCP_FAIL_WORKSPACE" \
    --source-mcp-file "$WORKSPACE/.cursor/mcp.json" \
    --objects project-mcp --yes --strategy overwrite >/dev/null 2>&1; then
    echo "FAIL: Visual Studio accepted an invalid existing MCP target" >&2
    exit 1
fi
grep -Fxq '{not-json' "$MCP_FAIL_WORKSPACE/.mcp.json" || {
    echo "FAIL: Visual Studio failure path modified the invalid target" >&2
    exit 1
}

mkdir -p "$WORKSPACE/.cursor/skills/demo"
printf '%s\n' '---' 'name: demo' 'description: fixture' '---' 'Use it.' > "$WORKSPACE/.cursor/skills/demo/SKILL.md"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target android-studio --workspace "$WORKSPACE" \
    --objects skills --scope project --dry-run >/dev/null 2>&1
[[ ! -e "$WORKSPACE/.agents/skills/demo/SKILL.md" ]] || {
    echo "FAIL: Android Studio skill dry-run wrote the target" >&2
    exit 1
}
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target android-studio --workspace "$WORKSPACE" \
    --objects skills --scope project --yes --strategy overwrite >/dev/null 2>&1
[[ -f "$WORKSPACE/.agents/skills/demo/SKILL.md" ]] || {
    echo "FAIL: Android Studio project skill was not migrated" >&2
    exit 1
}

FIREBASE_WORKSPACE="$TMP_ROOT/firebase-workspace"
mkdir -p "$FIREBASE_WORKSPACE/.idx"
printf '%s\n' '# legacy Firebase fixture' > "$FIREBASE_WORKSPACE/.idx/airules.md"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source firebase-studio --target codex --workspace "$FIREBASE_WORKSPACE" \
    --objects rules --dry-run >/dev/null 2>&1
[[ ! -e "$FIREBASE_WORKSPACE/AGENTS.md" ]] || {
    echo "FAIL: Firebase Studio source dry-run wrote the target" >&2
    exit 1
}
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source firebase-studio --target codex --workspace "$FIREBASE_WORKSPACE" \
    --objects rules --yes --strategy overwrite >/dev/null 2>&1
grep -Fq 'legacy Firebase fixture' "$FIREBASE_WORKSPACE/AGENTS.md"

FIREBASE_TARGET_WORKSPACE="$TMP_ROOT/firebase-target"
mkdir -p "$FIREBASE_TARGET_WORKSPACE"
printf '%s\n' '# maintained fixture' > "$FIREBASE_TARGET_WORKSPACE/AGENTS.md"
if HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source codex --target firebase-studio --workspace "$FIREBASE_TARGET_WORKSPACE" \
    --objects rules --yes --strategy overwrite >/dev/null 2>&1; then
    echo "FAIL: Firebase Studio was accepted as a migration target" >&2
    exit 1
fi
[[ ! -e "$FIREBASE_TARGET_WORKSPACE/.idx/airules.md" ]] || {
    echo "FAIL: rejected Firebase Studio target was written" >&2
    exit 1
}

[[ -f "$SCRIPT_DIR/../references/ides/xcode.md" ]] || {
    echo "FAIL: missing manual Xcode reference" >&2
    exit 1
}

echo "Modern IDE mapping tests passed"
