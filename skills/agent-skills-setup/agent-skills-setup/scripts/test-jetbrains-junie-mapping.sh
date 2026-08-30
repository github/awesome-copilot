#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_SCRIPT="${SCRIPT_DIR}/smart-ide-migration.sh"
PATHS_FILE="${SCRIPT_DIR}/../references/ide-paths.json"
IDE_REFERENCE="${SCRIPT_DIR}/../references/ides/jetbrains.md"
TMP_ROOT="$(mktemp -d /tmp/agent-skills-jetbrains-fixture.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

assert_path() {
    local object="$1"
    local expected="$2"
    local actual
    actual="$(HOME="$TMP_ROOT/home" bash "$MIGRATION_SCRIPT" legacy --print-path jetbrains "$object")"
    [[ "$actual" == "$expected" ]] || {
        echo "FAIL: jetbrains/${object}: expected ${expected}, got ${actual}" >&2
        exit 1
    }
}

assert_unsupported() {
    local object="$1"
    if HOME="$TMP_ROOT/home" bash "$MIGRATION_SCRIPT" legacy --print-path jetbrains "$object" >/dev/null 2>&1; then
        echo "FAIL: jetbrains/${object} unexpectedly has a portable path" >&2
        exit 1
    fi
}

assert_path global "~/.junie/skills"
assert_path project ".junie"
assert_path project-skills ".junie/skills"
assert_path rules ".junie/AGENTS.md"
assert_path mcp "~/.junie/mcp/mcp.json"
assert_path project-mcp ".junie/mcp/mcp.json"
assert_unsupported config

python3 - "$PATHS_FILE" <<'PYEOF'
import json
import sys

entry = json.load(open(sys.argv[1], encoding="utf-8"))["jetbrains"]
expected = {
    "global_skills": "~/.junie/skills",
    "project_skills": ".junie/skills",
    "rules": ".junie/AGENTS.md",
    "mcp": "~/.junie/mcp/mcp.json",
    "project_mcp": ".junie/mcp/mcp.json",
    "config": "",
}
assert entry == expected, (entry, expected)
PYEOF

for path in '~/.junie/skills' '.junie/skills' '.junie/AGENTS.md' '~/.junie/mcp/mcp.json' '.junie/mcp/mcp.json'; do
    grep -Fq "$path" "$IDE_REFERENCE"
done

if grep -Fq -- '- **rules**: project `.junie/guidelines.md`' "$IDE_REFERENCE"; then
    echo "FAIL: stale JetBrains IDE guidelines mapping remains" >&2
    exit 1
fi

echo "JetBrains Junie mapping fixture passed"
