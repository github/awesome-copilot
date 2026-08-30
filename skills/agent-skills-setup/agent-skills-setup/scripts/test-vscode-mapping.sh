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
TMP_ROOT="$(mktemp -d /tmp/vscode-mapping-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

assert_path() {
    local object="$1"
    local expected="$2"
    local actual
    actual="$(bash "$MIGRATION_SCRIPT" --print-path vscode "$object" 2>/dev/null || true)"
    if [[ "$expected" == "" ]]; then
        [[ -z "$actual" ]] || { echo "FAIL: vscode/$object expected unsupported/empty, got '$actual'" >&2; exit 1; }
    else
        [[ "$actual" == "$expected" ]] || { echo "FAIL: vscode/$object expected '$expected', got '$actual'" >&2; exit 1; }
    fi
}

assert_path global "~/.copilot/skills"
assert_path project-skills ".github/skills"
assert_path rules ".github/copilot-instructions.md"
assert_path project-mcp ".vscode/mcp.json"
assert_path mcp ""
assert_path config ""

TEST_HOME="$TMP_ROOT/home"
mkdir -p "$TEST_HOME"
printf '%s\n' '{"mcpServers":{"fixture":{"command":"node","args":["server.js"]}}}' > "$TEST_HOME/.claude.json"

OUTPUT="$TMP_ROOT/migration.txt"
mkdir -p "$TMP_ROOT/workspace"
cp "$TEST_HOME/.claude.json" "$TMP_ROOT/workspace/.mcp.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target vscode --objects mcp --scope project --yes --strategy backup \
    --workspace "$TMP_ROOT/workspace" > "$OUTPUT" 2>&1

python3 - "$TMP_ROOT/workspace/.vscode/mcp.json" <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
assert list(data) == ["servers"]
assert data["servers"]["fixture"]["command"] == "node"
PYEOF

printf '%s\n' '{"mcpServers":{"ambiguous":{"url":"https://example.invalid/mcp"}}}' > "$TEST_HOME/.claude.json"
cp "$TEST_HOME/.claude.json" "$TMP_ROOT/workspace/.mcp.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target vscode --objects mcp --scope project --yes --strategy backup \
    --workspace "$TMP_ROOT/workspace" > "$TMP_ROOT/ambiguous.txt" 2>&1
grep -Fq 'GitHub Copilot IDE MCP schema/transport is ambiguous or unsupported' "$TMP_ROOT/ambiguous.txt"

python3 - "$TMP_ROOT/workspace/.vscode/mcp.json" <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
assert "fixture" in data["servers"]
assert "ambiguous" not in data["servers"]
PYEOF

INVALID_WORKSPACE="$TMP_ROOT/invalid-workspace"
mkdir -p "$INVALID_WORKSPACE"
printf '%s' 'not-json' > "$INVALID_WORKSPACE/.mcp.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target vscode --objects mcp --scope project --yes --strategy overwrite \
    --workspace "$INVALID_WORKSPACE" > "$TMP_ROOT/invalid-source.txt" 2>&1 || true
grep -Fq 'VS Code MCP requires a JSON `servers` conversion' "$TMP_ROOT/invalid-source.txt"
[[ ! -e "$INVALID_WORKSPACE/.vscode/mcp.json" ]] || {
    echo "FAIL: invalid non-JSON source was written to VS Code MCP path" >&2
    exit 1
}

PROMPT_WORKSPACE="$TMP_ROOT/prompt-workspace"
mkdir -p "$PROMPT_WORKSPACE/.github/prompts"
printf '%s\n' '---' 'description: valid prompt' '---' 'Use the fixture.' > "$PROMPT_WORKSPACE/.github/prompts/valid.prompt.md"
printf '%s' '# not a VS Code prompt file' > "$PROMPT_WORKSPACE/.github/prompts/ignored.md"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source vscode --target claude --workspace "$PROMPT_WORKSPACE" \
    --objects prompts --yes --strategy overwrite > "$TMP_ROOT/prompts.txt" 2>&1
[[ -f "$PROMPT_WORKSPACE/.claude/commands/valid.prompt.md" ]] || {
    echo "FAIL: VS Code prompt file was not copied" >&2
    exit 1
}
[[ ! -e "$PROMPT_WORKSPACE/.claude/commands/ignored.md" ]] || {
    echo "FAIL: non-prompt Markdown file was copied from VS Code prompts" >&2
    exit 1
}

SKILL_WORKSPACE="$TMP_ROOT/project-skills-workspace"
mkdir -p "$SKILL_WORKSPACE/.cursor/skills/demo-skill/scripts" "$SKILL_WORKSPACE/.cursor/skills/demo-skill/references"
printf '%s\n' '---' 'name: demo-skill' 'description: project fixture' '---' 'Use the fixture.' > "$SKILL_WORKSPACE/.cursor/skills/demo-skill/SKILL.md"
printf '%s\n' '#!/usr/bin/env bash' 'exit 0' > "$SKILL_WORKSPACE/.cursor/skills/demo-skill/scripts/check.sh"
printf '%s\n' 'supporting reference' > "$SKILL_WORKSPACE/.cursor/skills/demo-skill/references/README.md"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target vscode --workspace "$SKILL_WORKSPACE" \
    --objects skills --scope project --yes --strategy overwrite > "$TMP_ROOT/project-skills.txt" 2>&1
[[ -f "$SKILL_WORKSPACE/.github/skills/demo-skill/SKILL.md" ]] || {
    echo "FAIL: project skill entrypoint was not migrated" >&2
    exit 1
}
[[ -f "$SKILL_WORKSPACE/.github/skills/demo-skill/scripts/check.sh" && \
   -f "$SKILL_WORKSPACE/.github/skills/demo-skill/references/README.md" ]] || {
    echo "FAIL: project skill supporting files were not preserved" >&2
    exit 1
}
[[ ! -e "$TEST_HOME/.github" && ! -e "$TEST_HOME/.copilot/skills" ]] || {
    echo "FAIL: project Skills scope touched a user-global path" >&2
    exit 1
}

PROJECT_MCP_WORKSPACE="$TMP_ROOT/project-mcp-workspace"
mkdir -p "$PROJECT_MCP_WORKSPACE"
printf '%s\n' '{"mcpServers":{"project-fixture":{"command":"node","args":["server.js"]}}}' > "$PROJECT_MCP_WORKSPACE/.mcp.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target cursor --workspace "$PROJECT_MCP_WORKSPACE" \
    --objects project-mcp --yes --strategy overwrite > "$TMP_ROOT/project-mcp.txt" 2>&1
python3 - "$PROJECT_MCP_WORKSPACE/.cursor/mcp.json" <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
assert data["mcpServers"]["project-fixture"]["command"] == "node"
PYEOF
[[ ! -e "$TEST_HOME/.cursor/mcp.json" ]] || {
    echo "FAIL: project MCP scope touched the user-global Cursor path" >&2
    exit 1
}

MANUAL_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target vscode --workspace "$TMP_ROOT/manual-workspace" \
    --objects agents,hooks,memory --dry-run 2>&1)"
grep -Fq 'agents: Agents/Subagents' <<< "$MANUAL_OUTPUT"
grep -Fq 'hooks: Hooks' <<< "$MANUAL_OUTPUT"
grep -Fq 'memory: Memory' <<< "$MANUAL_OUTPUT"
[[ ! -e "$TMP_ROOT/manual-workspace/.github" ]] || {
    echo "FAIL: manual-only objects created a project target" >&2
    exit 1
}

INVALID_SCOPE_OUTPUT="$({ HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target vscode --objects skills --scope unsupported --dry-run; } 2>&1 || true)"
grep -Fq 'invalid scope' <<< "$INVALID_SCOPE_OUTPUT"

echo "VS Code mapping fixture test passed"
