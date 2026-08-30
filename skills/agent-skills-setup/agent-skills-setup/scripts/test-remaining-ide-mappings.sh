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
TMP_ROOT="$(mktemp -d /tmp/agent-skills-remaining-ide-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
PROJECT="$TMP_ROOT/project"
OUTPUT="$TMP_ROOT/output.txt"
mkdir -p "$TEST_HOME" "$PROJECT"

assert_path() {
    local ide="$1"
    local object="$2"
    local expected="$3"
    local actual
    actual="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --print-path "$ide" "$object" 2>/dev/null || true)"
    [[ "$actual" == "$expected" ]] || {
        echo "FAIL: ${ide}/${object} expected '${expected}', got '${actual}'" >&2
        exit 1
    }
}

assert_contains() {
    local file="$1"
    local text="$2"
    grep -Fq "$text" "$file" || {
        echo "FAIL: expected '$text' in $file" >&2
        exit 1
    }
}

assert_not_contains() {
    local file="$1"
    local text="$2"
    if grep -Fq "$text" "$file"; then
        echo "FAIL: did not expect '$text' in $file" >&2
        exit 1
    fi
}

assert_path opencode global "~/.config/opencode/skills"
assert_path opencode project-skills ".opencode/skills"
assert_path opencode rules "AGENTS.md"
assert_path opencode mcp "~/.config/opencode/opencode.json"
assert_path opencode project-mcp "opencode.json"
assert_path opencode project-config "opencode.json"
assert_path opencode config "~/.config/opencode/opencode.json"

assert_path kilocode project ".kilo"
assert_path kilocode global "~/.kilo/skills"
assert_path kilocode project-skills ".kilo/skills"
assert_path kilocode rules "AGENTS.md"
assert_path kilocode mcp "~/.config/kilo/kilo.jsonc"
assert_path kilocode project-mcp ".kilo/kilo.jsonc"
assert_path kilocode project-config ".kilo/kilo.jsonc"
assert_path kilocode config "~/.config/kilo/kilo.jsonc"

assert_path kimiai global "~/.kimi-code/skills"
assert_path kimiai project-skills ".kimi-code/skills"
assert_path kimiai rules "AGENTS.md"
assert_path kimiai mcp "~/.kimi-code/mcp.json"
assert_path kimiai project-mcp ".kimi-code/mcp.json"
assert_path kimiai config "~/.kimi-code/config.toml"

assert_path jetbrains global "~/.junie/skills"
assert_path jetbrains project-skills ".junie/skills"
assert_path jetbrains rules ".junie/AGENTS.md"
assert_path jetbrains mcp "~/.junie/mcp/mcp.json"
assert_path jetbrains project-mcp ".junie/mcp/mcp.json"
assert_path jetbrains config ""

assert_path workbuddy project ".workbuddy"
assert_path workbuddy global ""
assert_path workbuddy project-skills ""
assert_path workbuddy rules ""
assert_path workbuddy mcp "~/.workbuddy/mcp.json"
assert_path workbuddy project-mcp ".workbuddy/mcp.json"
assert_path workbuddy project-config ""
assert_path workbuddy config ""

assert_path kiro global "~/.kiro/skills"
assert_path kiro project-skills ".kiro/skills"
assert_path kiro rules ".kiro/steering"
assert_path kiro mcp "~/.kiro/settings/mcp.json"
assert_path kiro project-mcp ".kiro/settings/mcp.json"
assert_path kiro config ""

assert_path augment-code global "~/.augment/skills"
assert_path augment-code project-skills ".augment/skills"
assert_path augment-code rules ".augment/rules"
assert_path augment-code mcp "~/.augment/settings.json"
assert_path augment-code project-mcp ".augment/settings.json"
assert_path augment-code project-config ".augment/settings.json"
assert_path augment-code config "~/.augment/settings.json"

assert_path void-editor global ""
assert_path void-editor project ""
assert_path void-editor project-skills ""
assert_path void-editor rules ".voidrules"
assert_path void-editor mcp "~/.void-editor/mcp.json"
assert_path void-editor project-mcp ".vscode/mcp.json"
assert_path void-editor config ""

VOID_SKILLS_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source void-editor --target claude --workspace "$PROJECT" \
    --objects skills --dry-run 2>&1)"
grep -Fq 'Void: `.voidrules` is a rules file, not Agent Skills' <<< "$VOID_SKILLS_OUTPUT"

assert_path baidu-comate global "~/.comate/skills"
assert_path baidu-comate project-skills ".comate/skills"
assert_path baidu-comate rules ""
assert_path baidu-comate mcp "~/.comate/mcp.json"
assert_path baidu-comate project-mcp ".comate/mcp.json"
assert_path baidu-comate config ""

assert_path tencent-codebuddy global "~/.codebuddy/skills"
assert_path tencent-codebuddy project-skills ".codebuddy/skills"
assert_path tencent-codebuddy rules "CODEBUDDY.md"
assert_path tencent-codebuddy mcp "~/.codebuddy/.mcp.json"
assert_path tencent-codebuddy project-mcp ".mcp.json"
assert_path tencent-codebuddy project-config ".codebuddy/settings.json"
assert_path tencent-codebuddy config "~/.codebuddy/settings.json"

assert_path zcode global "~/.zcode/skills"
assert_path zcode project-skills ""
assert_path zcode rules "AGENTS.md"
assert_path zcode mcp "~/.zcode/cli/config.json"
assert_path zcode project-mcp ".zcode/config.json"
assert_path zcode project-config ".zcode/config.json"
assert_path zcode config "~/.zcode/cli/config.json"
assert_path roo-code project-mcp ".roo/mcp.json"
assert_path roo-code mcp ""

write_claude_fixture() {
    printf '%s\n' '{"mcpServers":{"local":{"command":"node","args":["server.js","--token","live-token"],"env":{"API_KEY":"live-api-key"}},"remote":{"type":"sse","url":"https://example.invalid/mcp","headers":{"Authorization":"Bearer live-bearer"}}}}' > "$TEST_HOME/.claude.json"
}

write_workbuddy_fixture() {
    printf '%s\n' '{"mcpServers":{"local":{"command":"node","args":["server.js","--token","workbuddy-token"],"env":{"API_KEY":"workbuddy-api-key"}}}}' > "$TEST_HOME/.claude.json"
}

mcp_target_path() {
    case "$1" in
        opencode) echo "$TEST_HOME/.config/opencode/opencode.json" ;;
        kilocode) echo "$TEST_HOME/.config/kilo/kilo.jsonc" ;;
        kimiai) echo "$TEST_HOME/.kimi-code/mcp.json" ;;
        jetbrains) echo "$TEST_HOME/.junie/mcp/mcp.json" ;;
        workbuddy) echo "$TEST_HOME/.workbuddy/mcp.json" ;;
        void-editor) echo "$TEST_HOME/.void-editor/mcp.json" ;;
        kiro) echo "$TEST_HOME/.kiro/settings/mcp.json" ;;
        augment-code) echo "$TEST_HOME/.augment/settings.json" ;;
        zcode) echo "$TEST_HOME/.zcode/cli/config.json" ;;
        roo-code) echo "$PROJECT/.roo/mcp.json" ;;
        baidu-comate) echo "$TEST_HOME/.comate/mcp.json" ;;
        tencent-codebuddy) echo "$TEST_HOME/.codebuddy/.mcp.json" ;;
    esac
}

run_mcp() {
    local target="$1"
    if [[ "$target" == "workbuddy" || "$target" == "void-editor" || "$target" == "jetbrains" ]]; then
        write_workbuddy_fixture
    else
        write_claude_fixture
    fi
    HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
        --source claude --target "$target" --workspace "$PROJECT" \
        --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1
    assert_contains "$OUTPUT" "MCP config"
}

for target in opencode kilocode kimiai jetbrains workbuddy void-editor kiro augment-code zcode tencent-codebuddy; do
    run_mcp "$target"
    target_file="$(mcp_target_path "$target")"
    [[ -s "$target_file" ]] || {
        echo "FAIL: ${target} MCP target was not written" >&2
        exit 1
    }
    python3 -m json.tool "$target_file" >/dev/null
    assert_not_contains "$target_file" "live-token"
    assert_not_contains "$target_file" "live-api-key"
    assert_not_contains "$target_file" "live-bearer"
done

printf '%s\n' '{"mcpServers":{"roo-project":{"command":"node","args":["server.js"],"env":{"API_KEY":"__roo_project_inert_fixture__"}}}}' > "$PROJECT/.mcp.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target roo-code --workspace "$PROJECT" \
    --scope project --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1
assert_contains "$OUTPUT" "MCP config"
python3 -m json.tool "$PROJECT/.roo/mcp.json" >/dev/null
assert_contains "$PROJECT/.roo/mcp.json" '"roo-project"'
assert_not_contains "$PROJECT/.roo/mcp.json" "__roo_project_inert_fixture__"
ROO_GLOBAL_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target roo-code --objects mcp --dry-run 2>&1)"
grep -Fq 'Roo Code global MCP is extension-storage/UI managed' <<< "$ROO_GLOBAL_OUTPUT"

assert_contains "$(mcp_target_path opencode)" '"mcp"'
assert_contains "$(mcp_target_path opencode)" '"type": "local"'
assert_contains "$(mcp_target_path opencode)" '"command": ['
assert_contains "$(mcp_target_path opencode)" '"environment"'
assert_contains "$(mcp_target_path kilocode)" '"mcp"'
assert_contains "$(mcp_target_path kilocode)" '"type": "remote"'
assert_contains "$(mcp_target_path kimiai)" '"mcpServers"'
assert_contains "$(mcp_target_path kimiai)" '"transport": "sse"'
assert_contains "$(mcp_target_path jetbrains)" '"mcpServers"'
assert_contains "$(mcp_target_path workbuddy)" '"mcpServers"'
assert_contains "$(mcp_target_path void-editor)" '"mcpServers"'
assert_contains "$(mcp_target_path kiro)" '"mcpServers"'
assert_contains "$(mcp_target_path augment-code)" '"mcpServers"'
assert_contains "$(mcp_target_path augment-code)" '"type": "sse"'
assert_contains "$(mcp_target_path zcode)" '"mcp"'
assert_contains "$(mcp_target_path zcode)" '"servers"'
assert_contains "$(mcp_target_path tencent-codebuddy)" '"mcpServers"'

rm -f "$(mcp_target_path workbuddy)"
printf '%s\n' '{"mcpServers":{"remote":{"type":"sse","url":"https://example.invalid/mcp","headers":{"Authorization":"Bearer __workbuddy_inert_fixture__"}}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target workbuddy --workspace "$PROJECT" \
    --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1
assert_contains "$OUTPUT" "WorkBuddy desktop MCP schema"
[[ ! -e "$(mcp_target_path workbuddy)" ]] || {
    echo "FAIL: WorkBuddy wrote a target for undocumented remote MCP" >&2
    exit 1
}

rm -f "$(mcp_target_path void-editor)"
printf '%s\n' '{"mcpServers":{"remote":{"url":"https://example.invalid/mcp","headers":{"Authorization":"Bearer __void_inert_fixture__"}}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target void-editor --workspace "$PROJECT" \
    --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1
assert_contains "$OUTPUT" "Void MCP schema"
[[ ! -e "$(mcp_target_path void-editor)" ]] || {
    echo "FAIL: Void wrote a target for header-bearing remote MCP" >&2
    exit 1
}

printf '%s\n' '{"mcpServers":{"remote":{"url":"https://example.invalid/mcp"}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target void-editor --workspace "$PROJECT" \
    --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1
python3 -m json.tool "$(mcp_target_path void-editor)" >/dev/null
assert_contains "$(mcp_target_path void-editor)" '"url": "https://example.invalid/mcp"'

rm -f "$(mcp_target_path jetbrains)"
printf '%s\n' '{"mcpServers":{"remote":{"type":"sse","url":"https://example.invalid/mcp","headers":{"Authorization":"Bearer __junie_inert_fixture__"}}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target jetbrains --workspace "$PROJECT" \
    --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1
assert_contains "$OUTPUT" "Junie MCP schema"
[[ ! -e "$(mcp_target_path jetbrains)" ]] || {
    echo "FAIL: Junie wrote a target for undocumented remote MCP" >&2
    exit 1
}

printf '%s\n' '{"mcpServers":{"local":{"type":"stdio","command":"node","args":["server.js"],"env":{"API_KEY":"__comate_inert_fixture__"}},"remote":{"type":"sse","url":"https://example.invalid/mcp","headers":{"Authorization":"Bearer __comate_inert_fixture__"}}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target baidu-comate --workspace "$PROJECT" \
    --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1
python3 -m json.tool "$TEST_HOME/.comate/mcp.json" >/dev/null
assert_contains "$TEST_HOME/.comate/mcp.json" '"type": "stdio"'
assert_contains "$TEST_HOME/.comate/mcp.json" '"type": "sse"'
assert_not_contains "$TEST_HOME/.comate/mcp.json" "__comate_inert_fixture__"

mkdir -p "$TEST_HOME/.config/kilo"
printf '%s\n' '// Kilo JSONC fixture' '{' '  "mcp": {' '    "fixture": {' '      "type": "local",' '      "command": ["node", "server.js"],' '      "environment": {"API_KEY": ""},' '    },' '  },' '}' > "$TEST_HOME/.config/kilo/kilo.jsonc"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source kilocode --target opencode --workspace "$PROJECT" \
    --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1
python3 -m json.tool "$TEST_HOME/.config/opencode/opencode.json" >/dev/null
assert_contains "$TEST_HOME/.config/opencode/opencode.json" '"fixture"'

COMATE_BEFORE="$TMP_ROOT/comate-before.json"
cp "$TEST_HOME/.comate/mcp.json" "$COMATE_BEFORE"
printf '%s\n' '{"mcpServers":{"ambiguous":{"command":"node"}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target baidu-comate --workspace "$PROJECT" \
    --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1 || true
assert_contains "$OUTPUT" 'Comate MCP schema is invalid'
cmp -s "$COMATE_BEFORE" "$TEST_HOME/.comate/mcp.json" || {
    echo "FAIL: invalid Comate MCP fixture mutated the existing target" >&2
    exit 1
}

ZCODE_BEFORE="$TMP_ROOT/zcode-before.json"
cp "$TEST_HOME/.zcode/cli/config.json" "$ZCODE_BEFORE"
printf '%s\n' '{"mcpServers":{"ambiguous":{"command":["node","server.js"],"args":"not-an-array"}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target zcode --workspace "$PROJECT" \
    --objects mcp --yes --strategy overwrite > "$OUTPUT" 2>&1 || true
assert_contains "$OUTPUT" 'MCP mcpServers/schema is invalid'
cmp -s "$ZCODE_BEFORE" "$TEST_HOME/.zcode/cli/config.json" || {
    echo "FAIL: invalid args fixture mutated the existing ZCode target" >&2
    exit 1
}

mkdir -p "$TEST_HOME/.claude/skills/code-review/scripts"
printf '%s\n' '---' 'name: code-review' 'description: Review code' '---' 'Review the code.' > "$TEST_HOME/.claude/skills/code-review/SKILL.md"
printf '%s\n' '#!/usr/bin/env bash' 'echo review' > "$TEST_HOME/.claude/skills/code-review/scripts/review.sh"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target tencent-codebuddy --workspace "$PROJECT" \
    --objects skills --yes --strategy overwrite > "$OUTPUT" 2>&1
[[ -f "$TEST_HOME/.codebuddy/skills/code-review/SKILL.md" ]] || {
    echo "FAIL: CodeBuddy global Skill was not migrated" >&2
    exit 1
}
[[ -f "$TEST_HOME/.codebuddy/skills/code-review/scripts/review.sh" ]] || {
    echo "FAIL: CodeBuddy Skill resources were not migrated" >&2
    exit 1
}

printf '%s\n' 'Junie project instruction' > "$PROJECT/CLAUDE.md"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target jetbrains --workspace "$PROJECT" \
    --objects rules --yes --strategy overwrite > "$OUTPUT" 2>&1
assert_contains "$PROJECT/.junie/AGENTS.md" "Junie project instruction"

rm -rf "$TEST_HOME/.workbuddy/skills"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target workbuddy --workspace "$PROJECT" \
    --objects skills --yes --strategy overwrite > "$OUTPUT" 2>&1
assert_contains "$OUTPUT" "WorkBuddy"
[[ ! -e "$TEST_HOME/.workbuddy/skills" ]] || {
    echo "FAIL: WorkBuddy created an undocumented filesystem Skills target" >&2
    exit 1
}

printf '%s\n' 'Void workspace instruction' > "$PROJECT/CLAUDE.md"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target void-editor --workspace "$PROJECT" \
    --objects rules --yes --strategy overwrite > "$OUTPUT" 2>&1
assert_contains "$PROJECT/.voidrules" "Void workspace instruction"

for source in roo-code void-editor trae trae-cn jetbrains opencode kilocode kimiai workbuddy kiro augment-code baidu-comate tencent-codebuddy zcode; do
    PROJECT_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
        --source "$source" --target claude --workspace "$PROJECT" \
        --objects project --dry-run 2>&1)"
    grep -Fq 'automatic whole-project configuration migration is unsupported' <<< "$PROJECT_OUTPUT"
done

echo "Remaining IDE mapping tests passed"
