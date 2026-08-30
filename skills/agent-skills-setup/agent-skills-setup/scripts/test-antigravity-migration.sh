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
TMP_ROOT="$(mktemp -d /tmp/agent-skills-antigravity-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
WORKSPACE="$TMP_ROOT/workspace"
CURSOR_MCP="$TEST_HOME/.cursor/mcp.json"
ANTIGRAVITY_MCP="$TEST_HOME/.gemini/config/mcp_config.json"

assert_path() {
    local object="$1"
    local expected="$2"
    local actual

    actual="$(HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy --print-path antigravity "$object")"
    [[ "$actual" == "$expected" ]]
}

assert_path global "~/.gemini/config/skills"
assert_path project ".agents"
assert_path project-skills ".agents/skills"
assert_path rules ".agents/rules"
assert_path mcp "~/.gemini/config/mcp_config.json"

LEGACY_HOME="$TMP_ROOT/legacy-home"
mkdir -p "$LEGACY_HOME/.gemini/antigravity/skills"
LEGACY_SKILLS_PATH="$(HOME="$(native_path "$LEGACY_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy --print-path antigravity global)"
[[ "$LEGACY_SKILLS_PATH" == "~/.gemini/antigravity/skills" ]] || {
    echo "FAIL: Antigravity legacy Skills tree was not preserved" >&2
    exit 1
}

if HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy --print-path antigravity config >/dev/null 2>&1; then
    echo "FAIL: Antigravity IDE unexpectedly exposes a standalone config migration target" >&2
    exit 1
fi

mkdir -p "$WORKSPACE/.agents/rules"
printf '%s\n' 'Use the documented workspace rules directory.' > "$WORKSPACE/.agents/rules/style.md"
RULES_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy \
    --source antigravity \
    --target cursor \
    --workspace "$WORKSPACE" \
    --objects rules \
    --dry-run 2>&1)"
grep -Fq "Antigravity IDE rules use a directory; manual migration required" <<< "$RULES_OUTPUT"

PROJECT_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy \
    --source antigravity \
    --target cursor \
    --workspace "$WORKSPACE" \
    --objects project \
    --dry-run 2>&1)"
grep -Fq "automatic whole-project configuration migration is unsupported" <<< "$PROJECT_OUTPUT"

mkdir -p "$(dirname "$CURSOR_MCP")"
printf '%s\n' \
    '{' \
    '  "mcpServers": {' \
    '    "official-remote": {"url": "https://example.invalid/mcp"}' \
    '  }' \
    '}' > "$CURSOR_MCP"

if HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy \
    --source cursor \
    --target antigravity \
    --objects mcp \
    --strategy overwrite \
    --yes >"$TMP_ROOT/canonical.out" 2>"$TMP_ROOT/canonical.err"; then
    echo "FAIL: canonical entry point wrote to the unverified Antigravity profile" >&2
    exit 1
fi
grep -Fq "legacy writes are disabled" "$TMP_ROOT/canonical.err"
[[ ! -e "$ANTIGRAVITY_MCP" ]] || {
    echo "FAIL: blocked canonical migration still created an Antigravity MCP file" >&2
    exit 1
}

# Exercise the retained converter only as an explicitly internal compatibility test.
AGENT_SKILLS_SETUP_INTERNAL_LEGACY=1 HOME="$(native_path "$TEST_HOME")" \
    bash "$SCRIPT_DIR/legacy-smart-ide-migration.sh" \
        --source cursor \
        --target antigravity \
        --objects mcp \
        --strategy overwrite \
        --yes >/dev/null

python3 - "$ANTIGRAVITY_MCP" <<'PYEOF'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    server = json.load(handle)["mcpServers"]["official-remote"]

assert server["serverUrl"] == "https://example.invalid/mcp"
assert "url" not in server
PYEOF

echo "Antigravity IDE migration test passed"
