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
TMP_ROOT="$(mktemp -d /tmp/agent-skills-migration-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
VALID_SKILL="$TEST_HOME/.agents/skills/demo-skill"
NON_SKILL="$TEST_HOME/.agents/skills/not-a-skill"
PRIVATE_STATE="$TEST_HOME/.codex/sessions"
OUTPUT="$TMP_ROOT/dry-run.txt"

assert_path() {
    local ide="$1"
    local object="$2"
    local expected="$3"
    local actual

    actual="$(HOME="${4:-$TEST_HOME}" bash "$MIGRATION_SCRIPT" --print-path "$ide" "$object" 2>/dev/null || true)"
    if [[ "$actual" != "$expected" ]]; then
        echo "FAIL: ${ide}/${object} expected '${expected}', got '${actual}'" >&2
        exit 1
    fi
}

for object in global project project-skills rules mcp project-mcp project-config config; do
    assert_path codeium "$object" ""
done

mkdir -p "$TMP_ROOT/codeium-project/.codeium/skills/legacy-skill"
printf '%s\n' '---' 'name: legacy-skill' 'description: legacy fixture' '---' > "$TMP_ROOT/codeium-project/.codeium/skills/legacy-skill/SKILL.md"
CODEIUM_SKILLS_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source codeium --target cursor --workspace "$TMP_ROOT/codeium-project" --objects skills --dry-run 2>&1)"
grep -Fq 'source directory does not exist:' <<< "$CODEIUM_SKILLS_OUTPUT"

CODEIUM_PROJECT_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source codeium --target cursor --workspace "$TMP_ROOT/codeium-project" --objects project --dry-run 2>&1)"
grep -Fq 'automatic whole-project configuration migration is unsupported' <<< "$CODEIUM_PROJECT_OUTPUT"

for pieces_object in global project project-skills rules mcp project-mcp project-config config; do
    assert_path pieces "$pieces_object" ""
done

PIECES_PROJECT="$TMP_ROOT/pieces-project"
mkdir -p "$TEST_HOME/.pieces/skills/legacy-skill" "$PIECES_PROJECT/.pieces/rules"
printf '%s\n' '---' 'name: legacy-pieces-skill' 'description: stale fixture' '---' > "$TEST_HOME/.pieces/skills/legacy-skill/SKILL.md"
printf '%s\n' 'Use this stale Pieces rule.' > "$PIECES_PROJECT/.pieces/rules/legacy.md"
printf '%s\n' '{"mcpServers":{"legacy":{"command":"node","env":{"API_KEY":"__pieces_do_not_copy_fixture__"}}}}' > "$PIECES_PROJECT/.pieces/mcp.json"
PIECES_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source pieces --target cursor --workspace "$PIECES_PROJECT" \
    --objects skills,rules,prompts,mcp,config,project --yes --strategy overwrite 2>&1)"
for pieces_object in skills rules prompts mcp config project; do
    grep -Fq "${pieces_object}:" <<< "$PIECES_OUTPUT" || {
        echo "FAIL: Pieces ${pieces_object} boundary did not report a status"
        exit 1
    }
done
grep -Fq 'Pieces' <<< "$PIECES_OUTPUT"
[[ ! -e "$PIECES_PROJECT/.cursor" ]] || {
    echo "FAIL: unsupported Pieces fixture created a Cursor target"
    exit 1
}
grep -Fq '__pieces_do_not_copy_fixture__' "$PIECES_PROJECT/.pieces/mcp.json"

PIECES_TARGET_HOME="$TMP_ROOT/pieces-target-home"
PIECES_TARGET_PROJECT="$TMP_ROOT/pieces-target-project"
mkdir -p "$PIECES_TARGET_PROJECT/.codex" "$PIECES_TARGET_HOME"
PIECES_TARGET_OUTPUT="$(HOME="$(native_path "$PIECES_TARGET_HOME")" bash "$MIGRATION_SCRIPT" \
    --source codex --target pieces --workspace "$PIECES_TARGET_PROJECT" \
    --objects skills,rules,prompts,mcp,config,project --yes --strategy overwrite 2>&1)"
grep -Fq 'Pieces' <<< "$PIECES_TARGET_OUTPUT"
[[ ! -e "$PIECES_TARGET_HOME/.pieces" && ! -e "$PIECES_TARGET_PROJECT/.pieces" ]] || {
    echo "FAIL: unsupported Pieces target created a guessed path"
    exit 1
}

mkdir -p "$VALID_SKILL" "$NON_SKILL" "$PRIVATE_STATE"

printf '%s\n' '---' 'name: demo-skill' 'description: Isolated migration fixture.' '---' > "$VALID_SKILL/SKILL.md"
printf '%s\n' 'must not migrate' > "$NON_SKILL/state.txt"
printf '%s\n' 'private session fixture' > "$PRIVATE_STATE/session.jsonl"

assert_path codex project-skills ".agents/skills"
assert_path codex mcp "~/.codex/config.toml"
assert_path codex config "~/.codex/config.toml"

assert_path replit global ""
assert_path replit project ".replit"
assert_path replit project-skills ".agents/skills"
assert_path replit rules "replit.md"
assert_path replit project-mcp ""
assert_path replit project-config ".replit"
assert_path replit mcp ""
assert_path replit config ""

REPLIT_PROJECT="$TMP_ROOT/replit-project"
mkdir -p "$REPLIT_PROJECT/.agents/skills/demo-skill"
printf '%s\n' '---' 'name: demo-skill' 'description: Replit fixture skill.' '---' > "$REPLIT_PROJECT/.agents/skills/demo-skill/SKILL.md"
printf '%s\n' '# Replit fixture instructions' > "$REPLIT_PROJECT/replit.md"
printf '%s\n' 'run = "npm start"' > "$REPLIT_PROJECT/.replit"
printf '%s\n' '{ pkgs }: { deps = []; }' > "$REPLIT_PROJECT/replit.nix"

REPLIT_PROJECT_OUTPUT="$(bash "$MIGRATION_SCRIPT" \
    --source replit --target claude --workspace "$REPLIT_PROJECT" --objects project --dry-run 2>&1)"
grep -Fq 'automatic whole-project configuration migration is unsupported' <<< "$REPLIT_PROJECT_OUTPUT"
REPLIT_CONFIG_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source replit --target claude --workspace "$REPLIT_PROJECT" --objects config --dry-run 2>&1)"
grep -Fq 'automatic whole-IDE config migration is unsupported' <<< "$REPLIT_CONFIG_OUTPUT"
REPLIT_MCP_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source replit --target claude --workspace "$REPLIT_PROJECT" --objects mcp --dry-run 2>&1)"
grep -Fq 'Replit MCP connections are cloud/UI-managed through Integrations; no local MCP file is migrated' <<< "$REPLIT_MCP_OUTPUT"
printf '%s' '# source instructions' > "$REPLIT_PROJECT/CLAUDE.md"
REPLIT_RULE_OUTPUT="$(bash "$MIGRATION_SCRIPT" \
    --source claude --target replit --workspace "$REPLIT_PROJECT" \
    --objects rules --yes --strategy overwrite 2>&1)"
grep -Fq 'Replit replit.md is a project-root living document maintained by Agent; automatic overwrite is disabled' <<< "$REPLIT_RULE_OUTPUT"
grep -Fq '# Replit fixture instructions' "$REPLIT_PROJECT/replit.md"
! grep -Fq '# source instructions' "$REPLIT_PROJECT/replit.md"

assert_path continue global ""
assert_path continue project ".continue"
assert_path continue project-skills ""
assert_path continue rules ".continue/rules"
assert_path continue project-mcp ".continue/mcpServers"
assert_path continue config "~/.continue/config.yaml"

CONTINUE_OUTPUT="$(bash "$MIGRATION_SCRIPT" \
    --source claude --target continue --objects mcp,config --dry-run 2>&1)"
grep -Fq 'Continue uses YAML/array configuration; automatic MCP/config migration is unsupported' <<< "$CONTINUE_OUTPUT"

for pearai_object in global project project-skills rules mcp project-mcp project-config config; do
    assert_path pearai "$pearai_object" ""
done

PEARAI_SOURCE="$TMP_ROOT/pearai-source"
mkdir -p "$PEARAI_SOURCE/.agents/skills/demo-skill"
printf '%s\n' '{"mcpServers":{"fixture":{"command":"node","args":["server.js"]}}}' > "$TEST_HOME/.claude.json"
printf '%s\n' '{"provider":"fixture"}' > "$TEST_HOME/.codex/config.toml"
PEARAI_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source codex --target pearai --workspace "$PEARAI_SOURCE" \
    --objects skills,rules,prompts,mcp,config,project --yes --strategy overwrite 2>&1)"
grep -Fq 'mcp:' <<< "$PEARAI_OUTPUT"
grep -Fq 'config:' <<< "$PEARAI_OUTPUT"
[[ ! -e "$TEST_HOME/.pearai" ]] || {
    echo "FAIL: PearAI fixture created an undocumented ~/.pearai target" >&2
    exit 1
}
[[ ! -e "$PEARAI_SOURCE/.pearai" ]] || {
    echo "FAIL: PearAI fixture created an undocumented .pearai target" >&2
    exit 1
}

for supermaven_object in global project project-skills rules mcp project-mcp project-config config; do
    assert_path supermaven "$supermaven_object" ""
done

SUPERMAVEN_HOME="$TMP_ROOT/supermaven-home"
SUPERMAVEN_PROJECT="$TMP_ROOT/supermaven-project"
mkdir -p "$SUPERMAVEN_HOME/.supermaven/binary/fixture/darwin-arm64" "$SUPERMAVEN_PROJECT/.supermaven"
printf '%s\n' 'runtime binary fixture' > "$SUPERMAVEN_HOME/.supermaven/binary/fixture/darwin-arm64/sm-agent"
printf '%s\n' '*.secret' > "$SUPERMAVEN_PROJECT/.supermavenignore"
printf '%s\n' 'legacy project state' > "$SUPERMAVEN_PROJECT/.supermaven/state.json"

SUPERMAVEN_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source codex --target supermaven --workspace "$SUPERMAVEN_PROJECT" \
    --objects skills,rules,prompts,mcp,config,project --yes --strategy overwrite 2>&1)"
for supermaven_message in \
    'Supermaven has no documented portable Agent Skills directory' \
    'Supermaven has no documented portable instruction/rules file' \
    'Supermaven has no documented portable prompt-template directory' \
    'Supermaven has no documented portable MCP file or server schema' \
    'automatic whole-IDE config migration is unsupported' \
    'automatic whole-project configuration migration is unsupported'; do
    grep -Fq "$supermaven_message" <<< "$SUPERMAVEN_OUTPUT" || {
        echo "FAIL: missing Supermaven manual boundary: $supermaven_message"
        exit 1
    }
done
[[ ! -e "$TEST_HOME/.supermaven/SKILL.md" ]] || {
    echo "FAIL: unsupported Supermaven target created a Skills file"
    exit 1
}
[[ -f "$SUPERMAVEN_HOME/.supermaven/binary/fixture/darwin-arm64/sm-agent" ]] || {
    echo "FAIL: Supermaven runtime fixture was altered"
    exit 1
}
[[ "$(cat "$SUPERMAVEN_PROJECT/.supermavenignore")" == '*.secret' ]] || {
    echo "FAIL: .supermavenignore fixture was altered"
    exit 1
}

printf '%s\n' '{"mcpServers":{"sensitive":{"command":"node","args":[],"env":{"API_KEY":"__supermaven_inert_fixture__"}}}}' > "$TEST_HOME/.claude.json"
SUPERMAVEN_MCP_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target supermaven --objects mcp --yes --strategy overwrite 2>&1)"
grep -Fq 'Supermaven has no documented portable MCP file or server schema' <<< "$SUPERMAVEN_MCP_OUTPUT"
grep -Fq '__supermaven_inert_fixture__' "$TEST_HOME/.claude.json" || {
    echo "FAIL: unsupported Supermaven MCP boundary modified the source secret"
    exit 1
}
[[ ! -e "$TEST_HOME/.supermaven" ]] || {
    echo "FAIL: unsupported Supermaven MCP boundary created ~/.supermaven"
    exit 1
}

SUPERMAVEN_SOURCE_OUTPUT="$(HOME="$(native_path "$SUPERMAVEN_HOME")" bash "$MIGRATION_SCRIPT" \
    --source supermaven --target cursor --workspace "$SUPERMAVEN_PROJECT" \
    --objects skills,rules,prompts,mcp,config,project --yes --strategy overwrite 2>&1)"
grep -Fq 'Supermaven has no documented portable Agent Skills directory' <<< "$SUPERMAVEN_SOURCE_OUTPUT"
[[ ! -e "$SUPERMAVEN_PROJECT/.cursor" ]] || {
    echo "FAIL: unsupported Supermaven source created a Cursor target"
    exit 1
}

assert_path blackbox global ""
assert_path blackbox project ".blackbox"
assert_path blackbox project-skills ".blackbox/skills"
assert_path blackbox rules ""
assert_path blackbox mcp ""
assert_path blackbox project-mcp ""
assert_path blackbox project-config ""
assert_path blackbox config ""

BLACKBOX_HOME="$TMP_ROOT/blackbox-home"
BLACKBOX_PROJECT="$TMP_ROOT/blackbox-project"
BLACKBOX_TARGET="$TMP_ROOT/blackbox-target"
mkdir -p "$BLACKBOX_HOME/.agents/skills/from-codex" "$BLACKBOX_HOME/.codex" "$BLACKBOX_PROJECT/.blackbox/skills/from-blackbox"
printf '%s\n' '---' 'name: from-codex' 'description: source fixture' '---' > "$BLACKBOX_HOME/.agents/skills/from-codex/SKILL.md"
printf '%s\n' '---' 'name: from-blackbox' 'description: Blackbox project fixture' '---' > "$BLACKBOX_PROJECT/.blackbox/skills/from-blackbox/SKILL.md"
printf '%s\n' '{"apiKey":"__test_placeholder_value__"}' > "$BLACKBOX_PROJECT/.blackbox/private-state.json"
printf '%s\n' 'provider = "codex-fixture"' 'apiKey = "__test_placeholder_value__"' > "$BLACKBOX_HOME/.codex/config.toml"

BLACKBOX_TARGET_OUTPUT="$(HOME="$(native_path "$BLACKBOX_HOME")" bash "$MIGRATION_SCRIPT" \
    --source codex --target blackbox --workspace "$BLACKBOX_TARGET" \
    --objects skills,rules,prompts,mcp,config,project --yes --strategy overwrite 2>&1)"
grep -Fq 'Blackbox' <<< "$BLACKBOX_TARGET_OUTPUT"
grep -Fq 'project .blackbox/skills' <<< "$BLACKBOX_TARGET_OUTPUT"
[[ ! -e "$BLACKBOX_TARGET/.blackbox" ]] || {
    echo "FAIL: unsupported Blackbox target created an opaque .blackbox namespace"
    exit 1
}

BLACKBOX_SOURCE_OUTPUT="$(HOME="$(native_path "$BLACKBOX_HOME")" bash "$MIGRATION_SCRIPT" \
    --source blackbox --target codex --workspace "$BLACKBOX_PROJECT" \
    --objects skills,project --yes --strategy overwrite 2>&1)"
grep -Fq 'Blackbox' <<< "$BLACKBOX_SOURCE_OUTPUT"
[[ ! -e "$BLACKBOX_HOME/.agents/skills/from-blackbox" ]] || {
    echo "FAIL: Blackbox source project Skills were copied as global Skills"
    exit 1
}
grep -Fq '__test_placeholder_value__' "$BLACKBOX_PROJECT/.blackbox/private-state.json" || {
    echo "FAIL: Blackbox placeholder fixture was modified (redactor must blank only the value, not the key)"
    exit 1
}

assert_path gemini-cli global "~/.gemini/skills"
assert_path gemini-cli project ".gemini"
assert_path gemini-cli project-skills ".gemini/skills"
assert_path gemini-cli rules "GEMINI.md"
assert_path gemini-cli mcp "~/.gemini/settings.json"
assert_path gemini-cli project-mcp ".gemini/settings.json"
assert_path gemini-cli project-config ".gemini/settings.json"
assert_path gemini-cli config "~/.gemini/settings.json"

GEMINI_PROJECT="$TMP_ROOT/gemini-project"
mkdir -p "$GEMINI_PROJECT/.gemini/skills/demo-skill" "$GEMINI_PROJECT/.gemini/commands" "$GEMINI_PROJECT/.gemini/agents"
mkdir -p "$TEST_HOME/.gemini/skills/demo-skill"
printf '%s\n' '---' 'name: demo-skill' 'description: Gemini CLI fixture skill.' '---' > "$TEST_HOME/.gemini/skills/demo-skill/SKILL.md"
printf '%s\n' '# Gemini CLI fixture context' > "$GEMINI_PROJECT/GEMINI.md"
printf '%s\n' 'description = "fixture command"' 'prompt = "Review {{args}}"' > "$GEMINI_PROJECT/.gemini/commands/review.toml"
printf '%s\n' '---' 'name: fixture-agent' 'description: fixture subagent' '---' 'Review the fixture.' > "$GEMINI_PROJECT/.gemini/agents/fixture-agent.md"
printf '%s\n' '---' 'name: demo-skill' 'description: project fixture skill.' '---' > "$GEMINI_PROJECT/.gemini/skills/demo-skill/SKILL.md"

GEMINI_SKILLS_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source gemini-cli --target cursor --workspace "$GEMINI_PROJECT" --objects skills --dry-run 2>&1)"
grep -Fq 'successfully migrated 1 skills' <<< "$GEMINI_SKILLS_OUTPUT"
grep -Fq "$TEST_HOME/.gemini/skills/demo-skill" <<< "$GEMINI_SKILLS_OUTPUT"

GEMINI_RULE_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source gemini-cli --target openclaw --workspace "$GEMINI_PROJECT" --objects rules --dry-run 2>&1)"
grep -Fq 'GEMINI.md' <<< "$GEMINI_RULE_OUTPUT"
grep -Fq 'AGENTS.md' <<< "$GEMINI_RULE_OUTPUT"

for gemini_manual_object in prompts config project; do
    GEMINI_MANUAL_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
        --source gemini-cli --target cursor --workspace "$GEMINI_PROJECT" --objects "$gemini_manual_object" --dry-run 2>&1)"
    grep -Fq '[WARN]' <<< "$GEMINI_MANUAL_OUTPUT"
done
GEMINI_TARGET_MANUAL_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target gemini-cli --workspace "$GEMINI_PROJECT" --objects prompts --dry-run 2>&1)"
grep -Fq 'Gemini CLI commands use TOML' <<< "$GEMINI_TARGET_MANUAL_OUTPUT"

mkdir -p "$TEST_HOME/.gemini"
printf '%s\n' '{"mcpServers":{"local-server":{"command":"node","args":["server.js","--token","do-not-copy"],"env":{"GEMINI_API_KEY":"do-not-copy"}},"http-server":{"httpUrl":"https://example.invalid/mcp","headers":{"Authorization":"Bearer do-not-copy"},"includeTools":["safe"],"timeout":5000}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target gemini-cli --workspace "$GEMINI_PROJECT" --objects mcp --yes --strategy overwrite >/dev/null
python3 - "$TEST_HOME/.gemini/settings.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert set(data["mcpServers"]) == {"local-server", "http-server"}
assert data["mcpServers"]["local-server"]["env"]["GEMINI_API_KEY"] == ""
assert data["mcpServers"]["local-server"]["args"][-1] == ""
assert data["mcpServers"]["http-server"]["headers"]["Authorization"] == ""
assert data["mcpServers"]["http-server"]["httpUrl"] == "https://example.invalid/mcp"
PY

GEMINI_TARGET_BEFORE="$TMP_ROOT/gemini-settings-before.json"
cp "$TEST_HOME/.gemini/settings.json" "$GEMINI_TARGET_BEFORE"
printf '%s\n' '{"mcpServers":{"bad_server":{"command":"node","args":[]}}}' > "$TEST_HOME/.claude.json"
GEMINI_INVALID_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target gemini-cli --workspace "$GEMINI_PROJECT" --objects mcp --yes --strategy overwrite 2>&1)"
grep -Fq 'Gemini CLI MCP schema is invalid or ambiguous' <<< "$GEMINI_INVALID_OUTPUT"
cmp -s "$GEMINI_TARGET_BEFORE" "$TEST_HOME/.gemini/settings.json" || {
    echo "FAIL: invalid Gemini MCP alias mutated the existing settings file"
    exit 1
}

printf '%s\n' '{"mcpServers":{"fixture-server":{"command":"node","args":[]}}}' > "$TEST_HOME/.gemini/settings.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source gemini-cli --target cursor --workspace "$GEMINI_PROJECT" --objects mcp --yes --strategy overwrite >/dev/null
python3 - "$TEST_HOME/.cursor/mcp.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert set(data["mcpServers"]) == {"fixture-server"}
PY

mkdir -p "$TEST_HOME/.config/goose"
printf '%s\n' 'extensions:' '- fixture:' '-   name: fixture' > "$TEST_HOME/.config/goose/config.yaml"
NON_JSON_GEMINI_PROJECT="$TMP_ROOT/non-json-gemini"
mkdir -p "$NON_JSON_GEMINI_PROJECT"
NON_JSON_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source goose-cli --target gemini-cli --workspace "$NON_JSON_GEMINI_PROJECT" --objects mcp --yes --strategy overwrite 2>&1 || true)"
grep -Fq 'Goose config.yaml uses YAML extensions; automatic MCP migration is unsupported' <<< "$NON_JSON_OUTPUT"
[[ ! -e "$NON_JSON_GEMINI_PROJECT/.gemini/settings.json" ]] || {
    echo "FAIL: unsupported non-JSON Gemini MCP conversion created a target"
    exit 1
}

assert_path goose-cli global "~/.agents/skills"
assert_path goose-cli project ".goose"
assert_path goose-cli project-skills ".agents/skills"
assert_path goose-cli rules ".goosehints"
assert_path goose-cli mcp "~/.config/goose/config.yaml"
assert_path goose-cli project-mcp ""
assert_path goose-cli project-config ""
assert_path goose-cli config "~/.config/goose/config.yaml"

GOOSE_PROJECT="$TMP_ROOT/goose-project"
mkdir -p "$GOOSE_PROJECT/.goose/recipes" "$GOOSE_PROJECT/.goose/memory" "$GOOSE_PROJECT/.agents/skills/goose-project-skill" "$GOOSE_PROJECT/.claude/commands"
printf '%s\n' 'title: Goose fixture' 'description: Recipe is not a skill.' 'instructions: Use the fixture.' > "$GOOSE_PROJECT/.goose/recipes/fixture.yaml"
printf '%s\n' '{"category":"fixture","data":"review manually"}' > "$GOOSE_PROJECT/.goose/memory/fixture.json"
printf '%s\n' '---' 'name: goose-project-skill' 'description: Goose project skill fixture.' '---' > "$GOOSE_PROJECT/.agents/skills/goose-project-skill/SKILL.md"
printf '%s\n' '# Claude fixture command' > "$GOOSE_PROJECT/.claude/commands/fixture.md"
printf '%s\n' '# Goose fixture rules' > "$GOOSE_PROJECT/.goosehints"
printf '%s\n' '# Source rules fixture' > "$GOOSE_PROJECT/CLAUDE.md"

GOOSE_SKILL_HOME="$TMP_ROOT/goose-skill-home"
mkdir -p "$GOOSE_SKILL_HOME/.cursor/skills/goose-global-skill"
printf '%s\n' '---' 'name: goose-global-skill' 'description: Goose global skill fixture.' '---' > "$GOOSE_SKILL_HOME/.cursor/skills/goose-global-skill/SKILL.md"
HOME="$(native_path "$GOOSE_SKILL_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cursor --target goose-cli --objects skills --yes --strategy overwrite >/dev/null
[[ -f "$GOOSE_SKILL_HOME/.agents/skills/goose-global-skill/SKILL.md" ]] || {
    echo "FAIL: Goose global Agent Skill was not written to ~/.agents/skills" >&2
    exit 1
}
[[ ! -e "$GOOSE_SKILL_HOME/.config/goose/goose-global-skill" ]] || {
    echo "FAIL: Goose global Skill leaked into ~/.config/goose" >&2
    exit 1
}

GOOSE_PROJECT_OUTPUT="$(bash "$MIGRATION_SCRIPT" \
    --source goose-cli --target cursor --workspace "$GOOSE_PROJECT" --objects project --dry-run 2>&1)"
grep -Fq 'automatic whole-project configuration migration is unsupported' <<< "$GOOSE_PROJECT_OUTPUT"

GOOSE_RULE_OUTPUT="$(bash "$MIGRATION_SCRIPT" \
    --source claude --target goose-cli --workspace "$GOOSE_PROJECT" --objects rules --dry-run 2>&1)"
grep -Fq '.goosehints' <<< "$GOOSE_RULE_OUTPUT"

GOOSE_PROMPT_OUTPUT="$(bash "$MIGRATION_SCRIPT" \
    --source claude --target goose-cli --workspace "$GOOSE_PROJECT" --objects prompts --dry-run 2>&1)"
grep -Fq 'Goose prompt templates are global files and slash commands are config.yaml entries' <<< "$GOOSE_PROMPT_OUTPUT"
[[ ! -e "$GOOSE_PROJECT/.goose/prompts" ]] || {
    echo "FAIL: Goose prompt boundary created unsupported project prompt directory" >&2
    exit 1
}

mkdir -p "$TEST_HOME/.config/goose"
printf '%s\n' 'extensions:' '  fixture:' '    type: stdio' '    cmd: node' '    args: [server.js]' '    envs:' '      API_KEY: __goose_inert_fixture__' '    enabled: true' > "$TEST_HOME/.config/goose/config.yaml"
printf '%s\n' 'OPENAI_API_KEY: __goose_file_inert_fixture__' > "$TEST_HOME/.config/goose/secrets.yaml"
printf '%s\n' '{"mcpServers":{"fixture":{"command":"node","args":["server.js"],"env":{"API_KEY":"__json_inert_fixture__"}}}}' > "$TEST_HOME/.claude.json"
GOOSE_MCP_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target goose-cli --objects mcp --yes --strategy overwrite 2>&1)"
grep -Fq 'Goose config.yaml uses YAML extensions; automatic MCP migration is unsupported' <<< "$GOOSE_MCP_OUTPUT"
[[ "$(cat "$TEST_HOME/.config/goose/config.yaml")" == *'__goose_inert_fixture__'* ]] || {
    echo "FAIL: Goose source config was modified during fail-closed MCP audit" >&2
    exit 1
}
[[ ! -e "$TEST_HOME/.config/goose/config.yaml.bak."* ]] || {
    echo "FAIL: Goose MCP boundary unexpectedly created a config backup" >&2
    exit 1
}
GOOSE_CONFIG_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target goose-cli --objects config --yes --strategy overwrite 2>&1)"
grep -Fq 'automatic whole-IDE config migration is unsupported' <<< "$GOOSE_CONFIG_OUTPUT"
[[ "$(cat "$TEST_HOME/.config/goose/secrets.yaml")" == *'__goose_file_inert_fixture__'* ]] || {
    echo "FAIL: Goose secrets fixture was modified during config audit" >&2
    exit 1
}

assert_path roo-code global "~/.roo/skills"
assert_path roo-code project ".roo"
assert_path roo-code project-skills ".roo/skills"
assert_path roo-code project-mcp ".roo/mcp.json"
assert_path roo-code mcp ""
assert_path roo-code rules ".roorules"

ROO_MCP_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target roo-code --objects mcp --yes --strategy overwrite 2>&1)"
grep -Fq 'Roo Code global MCP is extension-storage/UI managed' <<< "$ROO_MCP_OUTPUT"

assert_path aider global ""
assert_path aider project ".aider.conf.yml"
assert_path aider project-skills ""
assert_path aider rules "CONVENTIONS.md"
assert_path aider mcp ""
assert_path aider project-mcp ""
assert_path aider project-config ""
assert_path aider config "~/.aider.conf.yml"

mkdir -p "$TMP_ROOT/aider-project"
printf '%s\n' 'Follow the fixture conventions.' > "$TMP_ROOT/aider-project/CLAUDE.md"
AIDER_RULE_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target aider --workspace "$TMP_ROOT/aider-project" --objects rules --dry-run 2>&1)"
grep -Fq 'CONVENTIONS.md' <<< "$AIDER_RULE_OUTPUT"
grep -Fq 'read:' <<< "$AIDER_RULE_OUTPUT"

AIDER_CONFIG_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target aider --workspace "$TMP_ROOT/aider-project" --objects config --dry-run 2>&1)"
grep -Fq 'automatic whole-IDE config migration is unsupported' <<< "$AIDER_CONFIG_OUTPUT"
[[ ! -e "$TMP_ROOT/aider-project/.aider.conf.yml" ]] || {
    echo "FAIL: Aider YAML config boundary created a file during dry-run" >&2
    exit 1
}

CLINE_MCP_EXPECTED="~/.cline/data/settings/cline_mcp_settings.json"
CLINE_MCP_TARGET="$TEST_HOME/.cline/data/settings/cline_mcp_settings.json"

assert_path cline global "~/.cline/skills"
assert_path cline project ""
assert_path cline project-skills ".cline/skills"
assert_path cline rules ".cline/rules"
assert_path cline project-mcp ".cline/mcp.json"
assert_path cline config ""
assert_path cline mcp "$CLINE_MCP_EXPECTED"
CLINE_CUSTOM_DATA="$TMP_ROOT/custom-cline-data"
CLINE_CUSTOM_MCP="$(HOME="$(native_path "$TEST_HOME")" CLINE_DATA_DIR="$CLINE_CUSTOM_DATA" \
    bash "$MIGRATION_SCRIPT" --print-path cline mcp)"
[[ "$CLINE_CUSTOM_MCP" == "$CLINE_CUSTOM_DATA/settings/cline_mcp_settings.json" ]] || {
    echo "FAIL: CLINE_DATA_DIR did not replace ~/.cline/data" >&2
    exit 1
}

printf '%s\n' '{"mcpServers":{"local":{"command":"node","args":["server.js"],"env":{"API_KEY":"do-not-copy"}},"remote":{"url":"https://example.invalid/mcp","transportType":"sse"}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target cline --objects mcp --yes --strategy overwrite >/dev/null
python3 - "$CLINE_MCP_TARGET" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert set(data["mcpServers"]) == {"local", "remote"}
assert data["mcpServers"]["local"]["command"] == "node"
assert data["mcpServers"]["local"]["env"]["API_KEY"] == ""
assert data["mcpServers"]["remote"]["transportType"] == "sse"
PY

CLINE_TARGET_BEFORE="$TMP_ROOT/cline-mcp-before.json"
cp "$CLINE_MCP_TARGET" "$CLINE_TARGET_BEFORE"
printf '%s\n' '{"mcpServers":{"ambiguous":{"args":["server.js"]}}}' > "$TEST_HOME/.claude.json"
INVALID_CLINE_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target cline --objects mcp --yes --strategy overwrite 2>&1)"
grep -Fq 'Cline MCP mcpServers schema is invalid or ambiguous' <<< "$INVALID_CLINE_OUTPUT" || {
    echo "FAIL: invalid Cline mcpServers entry was not rejected" >&2
    exit 1
}
cmp -s "$CLINE_TARGET_BEFORE" "$CLINE_MCP_TARGET" || {
    echo "FAIL: invalid Cline MCP conversion mutated the existing target" >&2
    exit 1
}

rm -f "$CLINE_MCP_TARGET"
mkdir -p "$(dirname "$CLINE_MCP_TARGET")"
CLINE_ALT_TARGET="$TEST_HOME/.cline/mcp.json"
mkdir -p "$TEST_HOME/.cline"
printf '%s\n' '{"mcpServers":{}}' > "$CLINE_MCP_TARGET"
printf '%s\n' '{"mcpServers":{}}' > "$CLINE_ALT_TARGET"
AMBIGUOUS_CLINE_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target cline --objects mcp --yes --strategy overwrite 2>&1)"
grep -Fq 'Cline has both the current data/settings MCP file' <<< "$AMBIGUOUS_CLINE_OUTPUT" || {
    echo "FAIL: Cline current+legacy ambiguity was not reported" >&2
    exit 1
}
rm -f "$CLINE_MCP_TARGET" "$CLINE_ALT_TARGET"

CLINE_PROJECT="$TMP_ROOT/cline-project"
mkdir -p "$CLINE_PROJECT"
printf '%s\n' '{"mcpServers":{"project-server":{"command":"node","args":["server.js"],"env":{"PROJECT_TOKEN":"do-not-copy"}}}}' > "$CLINE_PROJECT/.mcp.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target cline --workspace "$CLINE_PROJECT" \
    --scope project --objects mcp --yes --strategy overwrite >/dev/null
python3 - "$CLINE_PROJECT/.cline/mcp.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert data["mcpServers"]["project-server"]["env"]["PROJECT_TOKEN"] == ""
PY

assert_path amazon-q global ""
assert_path amazon-q project ".amazonq"
assert_path amazon-q project-skills ""
assert_path amazon-q rules ".amazonq/rules"
assert_path amazon-q mcp "~/.aws/amazonq/default.json"
assert_path amazon-q project-mcp ".amazonq/default.json"
assert_path amazon-q config ""

mkdir -p "$TMP_ROOT/project/.amazonq/rules" "$TEST_HOME/.aws/amazonq"
printf '%s\n' 'Use the fixture rule.' > "$TMP_ROOT/project/.amazonq/rules/style.md"
Q_RULE_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --source amazon-q --target cursor --workspace "$TMP_ROOT/project" --objects rules --dry-run 2>&1)"
grep -Fq 'Amazon Q rules use .amazonq/rules/*.md; manual migration required' <<< "$Q_RULE_OUTPUT"
Q_PROJECT_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --source amazon-q --target cursor --workspace "$TMP_ROOT/project" --objects project --dry-run 2>&1)"
grep -Fq 'automatic whole-project configuration migration is unsupported' <<< "$Q_PROJECT_OUTPUT"
Q_MCP_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --source amazon-q --target cursor --workspace "$TMP_ROOT/project" --objects mcp --dry-run 2>&1)"
grep -Fq 'Amazon Q: standard IDE MCP uses' <<< "$Q_MCP_OUTPUT"

printf '%s\n' '{"mcpServers":{}}' > "$TEST_HOME/.aws/amazonq/mcp.json"
assert_path amazon-q mcp "~/.aws/amazonq/mcp.json"
rm -f "$TEST_HOME/.aws/amazonq/mcp.json"
mkdir -p "$TEST_HOME/.aws/amazonq/agents"
printf '%s\n' '{"mcpServers":{}}' > "$TEST_HOME/.aws/amazonq/agents/default.json"
assert_path amazon-q mcp "~/.aws/amazonq/default.json"
Q_AGENT_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --source amazon-q --target cursor --workspace "$TMP_ROOT/project" --objects mcp --dry-run 2>&1)"
grep -Fq 'agents/default.json is a custom-agent definition, not IDE MCP configuration' <<< "$Q_AGENT_OUTPUT"
rm -f "$TEST_HOME/.aws/amazonq/agents/default.json"

assert_path neovim global ""
assert_path neovim project ""
assert_path neovim project-skills ""
assert_path neovim rules ""
assert_path neovim mcp ""
assert_path neovim config "~/.config/nvim/init.lua"

NEOVIM_CONFIG_FIXTURE="$TEST_HOME/.config/nvim/init.lua"
mkdir -p "$(dirname "$NEOVIM_CONFIG_FIXTURE")"
printf '%s\n' 'return {}' > "$NEOVIM_CONFIG_FIXTURE"
NEOVIM_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source codex --target neovim --objects config --yes --strategy overwrite 2>&1)"
grep -Fq 'automatic whole-IDE config migration is unsupported' <<< "$NEOVIM_OUTPUT"
[[ "$(cat "$NEOVIM_CONFIG_FIXTURE")" == 'return {}' ]] || {
    echo "FAIL: Neovim config fail-closed path modified the fixture" >&2
    exit 1
}

assert_path trae global "~/.trae/skills"
assert_path trae project ".trae"
assert_path trae project-skills ".trae/skills"
assert_path trae project-mcp ".trae/mcp.json"
assert_path trae mcp ""
assert_path trae config ""
assert_path trae rules ".trae/rules"
assert_path trae prompts ".trae/commands"
TRAE_MCP_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target trae --objects mcp --dry-run 2>&1)"
grep -Fq 'TRAE global MCP has an official settings/raw-JSON method' <<< "$TRAE_MCP_OUTPUT"

assert_path trae-cn global "~/.trae-cn/skills"
assert_path trae-cn project ".trae"
assert_path trae-cn project-skills ".trae/skills"
assert_path trae-cn project-mcp ".trae/mcp.json"
assert_path trae-cn rules ".trae/rules"
assert_path trae-cn mcp ""
assert_path trae-cn config ""
TRAE_CN_MCP_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target trae-cn --objects mcp --dry-run 2>&1)"
grep -Fq 'TRAE global MCP has an official settings/raw-JSON method' <<< "$TRAE_CN_MCP_OUTPUT"

mkdir -p "$TEST_HOME/.trae/skills/trae-regression"
printf '%s\n' '---' 'name: trae-regression' 'description: TRAE skill regression.' '---' > "$TEST_HOME/.trae/skills/trae-regression/SKILL.md"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source trae --target cursor --workspace "$TMP_ROOT/project" \
    --objects skills --yes --strategy overwrite >/dev/null 2>&1
[[ -f "$TEST_HOME/.cursor/skills/trae-regression/SKILL.md" ]] || {
    echo "FAIL: TRAE Skills migration was intercepted by Commands handling" >&2
    exit 1
}

for cody_object in global project project-skills rules mcp project-mcp project-config config; do
    assert_path cody "$cody_object" ""
done

CODY_PROJECT="$TMP_ROOT/cody-project"
mkdir -p "$CODY_PROJECT/.cody" "$CODY_PROJECT/.vscode"
printf '%s\n' 'legacy cody project state' > "$CODY_PROJECT/.cody/state.json"
printf '%s\n' 'legacy cody rules' > "$CODY_PROJECT/.codyrules"
printf '%s\n' '{"commands":{"legacy":{"prompt":"stale"}}}' > "$CODY_PROJECT/.vscode/cody.json"
CODY_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source cody --target cursor --workspace "$CODY_PROJECT" \
    --objects skills,rules,prompts,mcp,config,project --yes --strategy overwrite 2>&1)"
grep -Fq 'Cody' <<< "$CODY_OUTPUT"
grep -Fq 'manual' <<< "$CODY_OUTPUT"
[[ ! -e "$CODY_PROJECT/.cursor" ]] || {
    echo "FAIL: Cody unsupported fixture created a Cursor target" >&2
    exit 1
}

mkdir -p "$TMP_ROOT/project/.trae/commands" "$TMP_ROOT/project/.trae/rules"
printf '%s\n' '---' 'description: fixture command' '---' 'Summarize the fixture.' > "$TMP_ROOT/project/.trae/commands/summary.md"
printf '%s\n' '---' 'alwaysApply: true' '---' 'Use the fixture rule.' > "$TMP_ROOT/project/.trae/rules/fixture.md"
CN_PROMPT_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --source trae-cn --target cursor --workspace "$TMP_ROOT/project" --objects prompts,rules --dry-run 2>&1)"
grep -Fq '.trae/commands/*' <<< "$CN_PROMPT_OUTPUT"
grep -Eq '(Cursor rules|Trae CN rules)' <<< "$CN_PROMPT_OUTPUT"

CN_CONFIG_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --source trae-cn --target cursor --workspace "$TMP_ROOT/project" --objects config --dry-run 2>&1)"
grep -Fq 'automatic whole-IDE config migration is unsupported' <<< "$CN_CONFIG_OUTPUT"

if ! grep -Fq '**config/argv**: empty/unsupported' "$SCRIPT_DIR/../references/ides/trae-cn.md"; then
    echo "FAIL: Trae CN reference must mark config unsupported" >&2
    exit 1
fi

OPENCLAW_HOME_PATH="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --print-path openclaw global)"
[[ "$OPENCLAW_HOME_PATH" == "~/.openclaw/skills" ]] || { echo "FAIL: OpenClaw global skills path" >&2; exit 1; }
OPENCLAW_PROJECT_SKILLS="$(bash "$MIGRATION_SCRIPT" --print-path openclaw project-skills)"
[[ "$OPENCLAW_PROJECT_SKILLS" == "skills" ]] || { echo "FAIL: OpenClaw project skills path" >&2; exit 1; }
OPENCLAW_RULES="$(bash "$MIGRATION_SCRIPT" --print-path openclaw rules)"
[[ "$OPENCLAW_RULES" == "AGENTS.md" ]] || { echo "FAIL: OpenClaw AGENTS.md path" >&2; exit 1; }
if bash "$MIGRATION_SCRIPT" --print-path openclaw project >/dev/null 2>&1; then
    echo "FAIL: OpenClaw fixed project config root must be unsupported" >&2
    exit 1
fi

printf '%s\n' '{"mcpServers":{"fixture":{"command":"node","args":["server.js"]},"remote":{"url":"https://example.invalid/mcp","transport":"streamable-http"}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source claude --target openclaw --objects mcp --yes --strategy overwrite >/dev/null
python3 - "$TEST_HOME/.openclaw/openclaw.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert set(data["mcp"]["servers"]) == {"fixture", "remote"}
assert data["mcp"]["servers"]["remote"]["transport"] == "streamable-http"
PY

assert_path tabnine global ""
assert_path tabnine project-skills ""
assert_path tabnine rules ".tabnine/guidelines"
assert_path tabnine mcp "~/.tabnine/mcp_servers.json"
assert_path tabnine project-mcp ".tabnine/mcp_servers.json"
assert_path tabnine config ""

mkdir -p "$TMP_ROOT/tabnine-project/.tabnine/guidelines"
printf '%s\n' 'Follow the Tabnine guideline fixture.' > "$TMP_ROOT/tabnine-project/.tabnine/guidelines/style.md"
TABNINE_RULE_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --source tabnine --target cursor --workspace "$TMP_ROOT/tabnine-project" --objects rules --dry-run 2>&1)"
grep -Fq 'Tabnine guidelines use scoped .tabnine/guidelines/*.md files; automatic migration is unsupported' <<< "$TABNINE_RULE_OUTPUT"

printf '%s\n' '{"mcpServers":{"local":{"command":"node","args":["server.js"],"env":{"TABNINE_TOKEN":"do-not-copy"}},"remote":{"url":"https://example.invalid/mcp"}}}' > "$TEST_HOME/.claude.json"
HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --source claude --target tabnine --objects mcp --yes --strategy overwrite >/dev/null
python3 - "$TEST_HOME/.tabnine/mcp_servers.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert set(data["mcpServers"]) == {"local", "remote"}
assert data["mcpServers"]["local"]["env"]["TABNINE_TOKEN"] == ""
assert data["mcpServers"]["remote"]["url"] == "https://example.invalid/mcp"
PY

TABNINE_PROJECT_OUTPUT="$(HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" --source tabnine --target cursor --workspace "$TMP_ROOT/tabnine-project" --objects project --dry-run 2>&1)"
grep -Fq 'automatic whole-project configuration migration is unsupported' <<< "$TABNINE_PROJECT_OUTPUT"

HOME="$(native_path "$TEST_HOME")" bash "$MIGRATION_SCRIPT" \
    --source codex \
    --target openclaw \
    --objects skills \
    --dry-run > "$OUTPUT"

grep -Fq "$VALID_SKILL" "$OUTPUT"

if grep -Fq "$NON_SKILL" "$OUTPUT"; then
    echo "FAIL: directory without SKILL.md was treated as a skill" >&2
    exit 1
fi

if grep -Fq "$PRIVATE_STATE" "$OUTPUT"; then
    echo "FAIL: private Codex state was treated as a skill" >&2
    exit 1
fi

grep -Fq 'successfully migrated 1 skills' "$OUTPUT"
echo "Smart IDE migration isolation test passed"
