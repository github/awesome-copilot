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
MIGRATION_SCRIPT="${SCRIPT_DIR}/smart-ide-migration.sh"
PATHS_FILE="${SCRIPT_DIR}/../references/ide-paths.json"
IDE_REFERENCE="${SCRIPT_DIR}/../references/ides/claude.md"

failures=0

check_path() {
    local object="$1"
    local expected="$2"
    local actual
    if ! actual="$(bash "$MIGRATION_SCRIPT" legacy --print-path claude "$object")"; then
        actual=""
    fi

    if [[ "$actual" == "$expected" ]]; then
        echo "PASS: claude/${object} -> ${actual}"
    else
        echo "FAIL: claude/${object}; expected '${expected}', got '${actual}'" >&2
        failures=$((failures + 1))
    fi
}

check_path global '~/.claude/skills'
check_path project '.claude'
check_path project-skills '.claude/skills'
check_path rules 'CLAUDE.md'
check_path mcp '~/.claude.json'
check_path project-mcp '.mcp.json'
check_path config '~/.claude/settings.json'

if python3 - "$PATHS_FILE" <<'PYEOF'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    claude = json.load(handle)["claude"]

expected = {
    "global_skills": "~/.claude/skills",
    "project_skills": ".claude/skills",
    "rules": "CLAUDE.md",
    "mcp": "~/.claude.json",
    "project_mcp": ".mcp.json",
    "project_config": ".claude/settings.json",
    "config": "~/.claude/settings.json",
}
if claude != expected:
    raise SystemExit(f"unexpected Claude Code mapping: {claude!r}")
PYEOF
then
    echo "PASS: ide-paths.json has the Claude Code canonical mapping"
else
    echo "FAIL: ide-paths.json does not have the Claude Code canonical mapping" >&2
    failures=$((failures + 1))
fi

for expected_text in \
    '.mcp.json' \
    '.claude/settings.local.json' \
    'legacy compatibility' \
    'Do not auto-migrate auto memory'; do
    if grep -Fq "$expected_text" "$IDE_REFERENCE"; then
        echo "PASS: Claude reference documents '${expected_text}'"
    else
        echo "FAIL: Claude reference lacks '${expected_text}'" >&2
        failures=$((failures + 1))
    fi
done

FIXTURE_ROOT="$(mktemp -d /tmp/claude-code-mapping.XXXXXX)"
trap 'rm -rf "$FIXTURE_ROOT"' EXIT
FIXTURE_HOME="$FIXTURE_ROOT/home"
FIXTURE_WORKSPACE="$FIXTURE_ROOT/workspace"
mkdir -p "$FIXTURE_HOME/.cursor" "$FIXTURE_HOME/Library/Application Support/Cursor/User" "$FIXTURE_WORKSPACE"
printf '%s\n' '{"mcpServers":{"fixture":{"command":"echo"}}}' > "$FIXTURE_HOME/.cursor/mcp.json"
printf '%s\n' '{"editor.fontSize":14}' > "$FIXTURE_HOME/Library/Application Support/Cursor/User/settings.json"

MCP_SCOPE_OUTPUT="$(HOME="$(native_path "$FIXTURE_HOME")" bash "$MIGRATION_SCRIPT" legacy --source cursor --target claude --workspace "$FIXTURE_WORKSPACE" --objects mcp --dry-run 2>&1)"
if grep -Fq 'selected global/user scope' <<< "$MCP_SCOPE_OUTPUT" && grep -Fq 'project .mcp.json' <<< "$MCP_SCOPE_OUTPUT"; then
    echo "PASS: Claude MCP fixture preserves project and local scopes for manual review"
else
    echo "FAIL: Claude MCP fixture must label project/local scopes manual" >&2
    failures=$((failures + 1))
fi

CONFIG_SCOPE_OUTPUT="$(HOME="$(native_path "$FIXTURE_HOME")" bash "$MIGRATION_SCRIPT" legacy --source cursor --target claude --workspace "$FIXTURE_WORKSPACE" --objects config --dry-run 2>&1)"
if grep -Fq 'automatic whole-IDE config migration is unsupported' <<< "$CONFIG_SCOPE_OUTPUT"; then
    echo "PASS: Claude settings fixture preserves project/local scopes for manual review"
else
    echo "FAIL: Claude settings fixture must label project/local scopes manual" >&2
    failures=$((failures + 1))
fi

if [[ $failures -eq 0 ]]; then
    echo "Claude Code mapping test passed"
    exit 0
fi

echo "Claude Code mapping test failed: ${failures} assertion(s)" >&2
exit 1
