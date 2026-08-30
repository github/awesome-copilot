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
TMP_ROOT="$(mktemp -d /tmp/windsurf-mapping-fixture.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
WORKSPACE="$TMP_ROOT/workspace"
mkdir -p "$TEST_HOME/.cursor" "$WORKSPACE/.windsurf/rules"

assert_path() {
    local object="$1"
    local expected="$2"
    local actual
    actual="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --print-path windsurf "$object")"
    [[ "$actual" == "$expected" ]] || {
        echo "FAIL: windsurf/${object}: expected '${expected}', got '${actual}'" >&2
        exit 1
    }
}

assert_path global '~/.codeium/windsurf/skills'
assert_path project-skills '.windsurf/skills'
assert_path mcp '~/.codeium/windsurf/mcp_config.json'
assert_path rules '.windsurf/rules'
if HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --print-path windsurf project >/dev/null 2>&1; then
    echo "FAIL: windsurf/project must remain unsupported for mixed .windsurf namespace" >&2
    exit 1
fi

cat > "$TEST_HOME/.cursor/mcp.json" <<'JSON'
{
  "mcpServers": {
    "server-url": {"serverUrl": "https://example.test/mcp"},
    "url": {"url": "https://example.test/legacy"}
  }
}
JSON

HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target windsurf --workspace "$WORKSPACE" \
    --objects mcp --yes --strategy overwrite >/dev/null

python3 - "$TEST_HOME/.codeium/windsurf/mcp_config.json" <<'PY'
import json, sys
servers = json.load(open(sys.argv[1]))["mcpServers"]
assert servers["server-url"]["serverUrl"] == "https://example.test/mcp"
assert servers["url"]["url"] == "https://example.test/legacy"
PY

WINDSURF_TARGET_BEFORE="$TMP_ROOT/windsurf-mcp-before.json"
cp "$TEST_HOME/.codeium/windsurf/mcp_config.json" "$WINDSURF_TARGET_BEFORE"
cat > "$TEST_HOME/.cursor/mcp.json" <<'JSON'
{
  "mcpServers": {
    "foreign-type": {
      "type": "http",
      "url": "https://example.test/foreign"
    }
  }
}
JSON
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target windsurf --workspace "$WORKSPACE" \
    --objects mcp --yes --strategy overwrite > "$TMP_ROOT/foreign.txt" 2>&1 || true
grep -Fq 'Windsurf MCP schema is invalid or ambiguous' "$TMP_ROOT/foreign.txt"
cmp -s "$WINDSURF_TARGET_BEFORE" "$TEST_HOME/.codeium/windsurf/mcp_config.json" || {
    echo "FAIL: foreign VS Code transport mutated the existing Windsurf target" >&2
    exit 1
}

printf '%s\n' 'rule fixture' > "$WORKSPACE/.windsurf/rules/example.md"
RULE_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source windsurf --target cursor --workspace "$WORKSPACE" \
    --objects rules --dry-run 2>&1)"
grep -Fq 'Windsurf rules use scoped files; automatic migration is unsupported' <<< "$RULE_OUTPUT"

PROJECT_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source windsurf --target cursor --workspace "$WORKSPACE" \
    --objects project --dry-run 2>&1)"
grep -Fq 'automatic whole-project configuration migration is unsupported' <<< "$PROJECT_OUTPUT"

PROMPT_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source windsurf --target cursor --workspace "$WORKSPACE" \
    --objects prompts --dry-run 2>&1)"
grep -Fq 'Windsurf workflows use a product-specific directory and invocation model' <<< "$PROMPT_OUTPUT"

echo 'Windsurf mapping fixture passed'
