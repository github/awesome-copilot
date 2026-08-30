#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_SCRIPT="$SCRIPT_DIR/smart-ide-migration.sh"
PATHS_FILE="$SCRIPT_DIR/../references/ide-paths.json"
IDE_REFERENCE="$SCRIPT_DIR/../references/ides/cursor.md"

assert_path() {
    local object="$1" expected="$2" actual
    actual="$(bash "$MIGRATION_SCRIPT" legacy --print-path cursor "$object" 2>/dev/null || true)"
    [[ "$actual" == "$expected" ]] || {
        echo "FAIL: cursor/${object}; expected '${expected}', got '${actual}'" >&2
        exit 1
    }
}

assert_path global '~/.cursor/skills'
assert_path project '.cursor'
assert_path project-skills '.cursor/skills'
assert_path rules '.cursor/rules'
assert_path mcp '~/.cursor/mcp.json'
assert_path project-mcp '.cursor/mcp.json'
assert_path config ''

python3 - "$PATHS_FILE" <<'PYEOF'
import json, sys
cursor = json.load(open(sys.argv[1], encoding="utf-8"))["cursor"]
expected = {
    "global_skills": "~/.cursor/skills",
    "project_skills": ".cursor/skills",
    "rules": ".cursor/rules",
    "mcp": "~/.cursor/mcp.json",
    "project_mcp": ".cursor/mcp.json",
    "config": "",
}
if cursor != expected:
    raise SystemExit(f"unexpected Cursor mapping: {cursor!r}")
PYEOF

for expected_text in \
    '.cursor/mcp.json' \
    '~/.cursor/mcp.json' \
    '.cursor/rules' \
    '.cursor/skills' \
    '.cursor/commands' \
    'remain manual'; do
    grep -Fq "$expected_text" "$IDE_REFERENCE" || {
        echo "FAIL: Cursor reference lacks '${expected_text}'" >&2
        exit 1
    }
done

FIXTURE_ROOT="$(mktemp -d /tmp/cursor-mapping.XXXXXX)"
trap 'rm -rf "$FIXTURE_ROOT"' EXIT
WORKSPACE="$FIXTURE_ROOT/workspace"
mkdir -p "$WORKSPACE/.cursor/rules"
printf '%s\n' '---' 'description: fixture' 'alwaysApply: true' '---' 'Use the fixture.' > "$WORKSPACE/.cursor/rules/fixture.mdc"

OUTPUT="$(bash "$MIGRATION_SCRIPT" legacy --source cursor --target claude \
    --workspace "$WORKSPACE" --objects rules --dry-run 2>&1)"
grep -Fq 'manual' <<<"$OUTPUT"
grep -Fq '.cursor/rules' <<<"$OUTPUT"

echo "Cursor mapping and directory-safety fixture passed"
