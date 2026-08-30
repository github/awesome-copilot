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
CLI="$SCRIPT_DIR/smart-ide-migration.sh"
LEGACY="$SCRIPT_DIR/legacy-smart-ide-migration.sh"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
WORKSPACE="$TMP_ROOT/workspace"
mkdir -p \
    "$TEST_HOME/.cline/skills/demo" \
    "$WORKSPACE/.cursor" \
    "$WORKSPACE/.cline/skills/project-demo"
printf '%s\n' '---' 'name: demo' 'description: Gate fixture.' '---' '# Demo' \
    > "$TEST_HOME/.cline/skills/demo/SKILL.md"
printf '%s\n' '---' 'name: project-demo' 'description: Gate fixture.' '---' '# Demo' \
    > "$WORKSPACE/.cline/skills/project-demo/SKILL.md"
printf '%s\n' '{"mcpServers":{"demo":{"command":"demo"}}}' \
    > "$WORKSPACE/.cursor/mcp.json"

if HOME="$(native_path "$TEST_HOME")" bash "$CLI" --print-path cline mcp \
    > "$TMP_ROOT/implicit.out" 2>"$TMP_ROOT/implicit.err"; then
    echo "FAIL: implicit legacy flags were accepted" >&2
    exit 1
fi
grep -Fq "implicit legacy flags are disabled" "$TMP_ROOT/implicit.err"

if HOME="$(native_path "$TEST_HOME")" bash "$CLI" legacy \
    --source cline --target windsurf --objects skills --dry-run --yes \
    > "$TMP_ROOT/mixed.out" 2>"$TMP_ROOT/mixed.err"; then
    echo "FAIL: legacy --yes was accepted when combined with --dry-run" >&2
    exit 1
fi
grep -Fq 'legacy writes are disabled' "$TMP_ROOT/mixed.err"

if HOME="$(native_path "$TEST_HOME")" bash "$CLI" \
    legacy --source cline --target windsurf --objects skills --yes --strategy overwrite \
    > "$TMP_ROOT/skills.out" 2>"$TMP_ROOT/skills.err"; then
    echo "FAIL: public legacy write reached the compatibility engine" >&2
    exit 1
fi
grep -Fq 'legacy writes are disabled' "$TMP_ROOT/skills.err"
[[ ! -e "$TEST_HOME/.codeium/windsurf/skills/demo/SKILL.md" ]]

mkdir -p "$WORKSPACE/.cline/rules"
printf '%s\n' '# reviewed project rule' > "$WORKSPACE/.cline/rules/reviewed.md"
HOME="$(native_path "$TEST_HOME")" bash "$CLI" \
    legacy --source cline --target windsurf --workspace "$WORKSPACE" \
    --objects rules --strategy overwrite --dry-run >"$TMP_ROOT/rules.log"
grep -Fq 'Windsurf rules use scoped files' "$TMP_ROOT/rules.log"
[[ ! -e "$WORKSPACE/.windsurf/rules/reviewed.md" ]]

mkdir -p "$WORKSPACE/.cline"
printf '%s\n' '{"mcpServers":{"demo":{"command":"demo"}}}' \
    > "$WORKSPACE/.cline/mcp.json"
if HOME="$(native_path "$TEST_HOME")" bash "$CLI" \
    legacy --source cline --target windsurf --workspace "$WORKSPACE" \
    --objects project-mcp --scope project --strategy overwrite --yes \
    >"$TMP_ROOT/project-mcp.out" 2>"$TMP_ROOT/project-mcp.err"; then
    echo "FAIL: project MCP was authorized from unrelated user-scope surfaces" >&2
    exit 1
fi
grep -Fq 'legacy writes are disabled' "$TMP_ROOT/project-mcp.err"

for target in codely roo-code bolt-new pieces emacs codeium; do
    if HOME="$(native_path "$TEST_HOME")" bash "$CLI" \
        legacy --source cline --target "$target" --workspace "$WORKSPACE" \
        --objects skills --scope project --yes --strategy overwrite \
        > "$TMP_ROOT/$target.log" 2>&1; then
        echo "FAIL: Registry-restricted legacy target was writable: $target" >&2
        exit 1
    fi
    grep -Fq 'legacy writes are disabled' "$TMP_ROOT/$target.log"
done

if HOME="$(native_path "$TEST_HOME")" bash "$CLI" \
    legacy --source cursor --target codely --workspace "$WORKSPACE" \
    --objects project-mcp --scope project --yes --strategy overwrite \
    > "$TMP_ROOT/codely-mcp.log" 2>&1; then
    echo "FAIL: unverified Codely MCP target bypassed Registry v2" >&2
    exit 1
fi
[[ ! -e "$WORKSPACE/.codely-cli/settings.json" ]]

if bash "$LEGACY" --help > "$TMP_ROOT/direct.log" 2>&1; then
    echo "FAIL: internal legacy engine was directly executable" >&2
    exit 1
fi
grep -Fq 'is internal' "$TMP_ROOT/direct.log"

echo "Legacy Registry authorization test passed"
