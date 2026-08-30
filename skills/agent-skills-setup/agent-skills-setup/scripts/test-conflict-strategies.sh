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

# shasum(1) is macOS-only; Git Bash ships sha256sum, and python3 is the
# portable last resort.
sha256_file() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | awk '{print $1}'
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$1" | awk '{print $1}'
    else
        python3 -c 'import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())' "$1"
    fi
}
# Conflict-strategy mechanics belong to the retained compatibility engine. The
# public entry point is covered separately by test-legacy-registry-gate.sh.
MIGRATION_SCRIPT="$SCRIPT_DIR/legacy-smart-ide-migration.sh"
export AGENT_SKILLS_SETUP_INTERNAL_LEGACY=1
TMP_ROOT="$(mktemp -d /tmp/conflict-strategies-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
SOURCE_FILE="$TMP_ROOT/cursor-mcp.json"
mkdir -p "$TEST_HOME/.config/opencode"

printf '%s\n' '{"mcpServers":{"same":{"command":"new-server"}}}' > "$SOURCE_FILE"

SOURCE_SKILL="$TEST_HOME/.cursor/skills/demo"
TARGET_SKILL="$TEST_HOME/.claude/skills/demo"
mkdir -p "$SOURCE_SKILL" "$TARGET_SKILL"
printf '%s\n' 'source skill' > "$SOURCE_SKILL/SKILL.md"
printf '%s\n' 'existing target skill' > "$TARGET_SKILL/SKILL.md"
TARGET_HASH_BEFORE="$(sha256_file "$TARGET_SKILL/SKILL.md")"

set +e
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target claude --objects skills \
    --strategy typo --yes >"$TMP_ROOT/invalid-strategy.log" 2>&1
INVALID_STRATEGY_RC=$?
set -e

if [[ $INVALID_STRATEGY_RC -eq 0 ]]; then
    echo "FAIL: unknown strategy exited successfully" >&2
    exit 1
fi

TARGET_HASH_AFTER="$(sha256_file "$TARGET_SKILL/SKILL.md")"
if [[ "$TARGET_HASH_AFTER" != "$TARGET_HASH_BEFORE" ]]; then
    echo "FAIL: unknown strategy modified the existing target" >&2
    exit 1
fi

if find "$TEST_HOME/.claude/skills" -maxdepth 1 -type d -name 'demo.bak.*' -print -quit | grep -q .; then
    echo "FAIL: unknown strategy created a backup before rejection" >&2
    exit 1
fi

if ! grep -q 'invalid strategy' "$TMP_ROOT/invalid-strategy.log"; then
    echo "FAIL: unknown strategy did not produce a clear validation error" >&2
    exit 1
fi

echo "PASS: unknown strategy fails before modifying an existing target"

WORKSPACE="$TMP_ROOT/workspace"
mkdir -p "$WORKSPACE/.claude/commands" "$WORKSPACE/.opencode/commands"
printf '%s\n' 'source rule' > "$WORKSPACE/CLAUDE.md"
printf '%s\n' 'existing target rule' > "$WORKSPACE/AGENTS.md"
printf '%s\n' 'source prompt' > "$WORKSPACE/.claude/commands/demo.md"
printf '%s\n' 'existing target prompt' > "$WORKSPACE/.opencode/commands/demo.md"

HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target opencode --workspace "$WORKSPACE" \
    --objects rules,prompts --strategy backup --yes >"$TMP_ROOT/rules-prompts-backup.log" 2>&1

grep -Fxq 'source rule' "$WORKSPACE/AGENTS.md" || {
    echo "FAIL: backup strategy did not migrate the rule" >&2
    exit 1
}
RULE_BACKUP="$(find "$WORKSPACE" -maxdepth 1 -name 'AGENTS.md.bak.*' -print -quit)"
[[ -n "$RULE_BACKUP" ]] || {
    echo "FAIL: backup strategy did not preserve the existing rule" >&2
    exit 1
}
grep -Fxq 'existing target rule' "$RULE_BACKUP" || {
    echo "FAIL: rule backup did not preserve existing content" >&2
    exit 1
}
grep -Fxq 'source prompt' "$WORKSPACE/.opencode/commands/demo.md" || {
    echo "FAIL: backup strategy did not migrate the prompt" >&2
    exit 1
}
PROMPT_BACKUP="$(find "$WORKSPACE/.opencode" -maxdepth 1 -type d -name 'commands.bak.*' -print -quit)"
[[ -n "$PROMPT_BACKUP" ]] || {
    echo "FAIL: backup strategy did not preserve the existing prompt directory" >&2
    exit 1
}
grep -Fxq 'existing target prompt' "$PROMPT_BACKUP/demo.md" || {
    echo "FAIL: prompt backup did not preserve existing content" >&2
    exit 1
}

echo "PASS: rules and prompts honor the backup conflict strategy"

write_existing_target() {
    printf '%s\n' '{"theme":"dark","mcp":{"keep":{"type":"local","command":["keep-server"]},"same":{"type":"local","command":["old-server"]}}}' \
        > "$TEST_HOME/.config/opencode/opencode.json"
}

write_existing_target
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target opencode --objects mcp \
    --source-mcp-file "$SOURCE_FILE" --strategy backup --yes >/dev/null

python3 - "$TEST_HOME/.config/opencode/opencode.json" <<'PYEOF'
import json
import sys

data = json.load(open(sys.argv[1]))
assert data["theme"] == "dark"
assert data["mcp"]["keep"]["command"] == ["keep-server"]
assert data["mcp"]["same"]["command"] == ["new-server"]
PYEOF

BACKUP_FILE="$(find "$TEST_HOME/.config/opencode" -maxdepth 1 -name 'opencode.json.bak.*' -print -quit)"
python3 - "$BACKUP_FILE" <<'PYEOF'
import json
import sys

data = json.load(open(sys.argv[1]))
assert data["theme"] == "dark"
assert data["mcp"]["same"]["command"] == ["old-server"]
PYEOF

rm -f "$TEST_HOME/.config/opencode"/opencode.json.bak.*
write_existing_target
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target opencode --objects mcp \
    --source-mcp-file "$SOURCE_FILE" --strategy overwrite --yes >/dev/null

python3 - "$TEST_HOME/.config/opencode/opencode.json" <<'PYEOF'
import json
import sys

data = json.load(open(sys.argv[1]))
assert data["theme"] == "dark", "overwrite removed an unrelated top-level setting"
assert set(data["mcp"]) == {"same"}, "overwrite did not replace only the selected MCP map"
assert data["mcp"]["same"]["command"] == ["new-server"]
PYEOF

if find "$TEST_HOME/.config/opencode" -maxdepth 1 -name 'opencode.json.bak.*' -print -quit | grep -q .; then
    echo "FAIL: overwrite unexpectedly created a backup" >&2
    exit 1
fi

echo "PASS: MCP backup/overwrite conflict strategies preserve their documented boundaries"
