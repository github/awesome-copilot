#!/usr/bin/env bash

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LEGACY_SCRIPT="$SCRIPT_DIR/legacy-smart-ide-migration.sh"
export AGENT_SKILLS_SETUP_INTERNAL_LEGACY=1

TMP_ROOT="$(mktemp -d /tmp/agent-skills-migration-test.XXXXXX)"
export HOME="$TMP_ROOT/home"
mkdir -p "$HOME"

OUT_FILE="$TMP_ROOT/last.out"

safe_remove_fixture_path() {
    local candidate="$1"

    case "$candidate" in
        "$TMP_ROOT"/*) ;;
        *) return 1 ;;
    esac
    [[ -e "$candidate" || -L "$candidate" ]] || return 0
    find "$candidate" -depth -delete
}

cleanup() {
    [[ -d "$TMP_ROOT" && "$TMP_ROOT" == /tmp/agent-skills-migration-test.* ]] || return 0
    find "$TMP_ROOT" -depth -delete
}
trap cleanup EXIT

CHECKS=0
FAIL=0

check_pass() { CHECKS=$((CHECKS + 1)); echo "PASS: $1"; }
check_fail() { CHECKS=$((CHECKS + 1)); FAIL=$((FAIL + 1)); echo "FAIL: $1" >&2; }

assert_file() {
    local p="$1" d="$2"
    if [[ -e "$p" ]]; then check_pass "$d"; else check_fail "$d (missing: $p)"; fi
}
assert_dir() {
    local p="$1" d="$2"
    if [[ -d "$p" ]]; then check_pass "$d"; else check_fail "$d (missing dir: $p)"; fi
}
assert_not_exists() {
    local p="$1" d="$2"
    if [[ ! -e "$p" ]]; then check_pass "$d"; else check_fail "$d (unexpected path exists: $p)"; fi
}
assert_contains() {
    local f="$1" pat="$2" d="$3"
    if grep -Fq "$pat" "$f"; then check_pass "$d"; else check_fail "$d (no '$pat' in $f)"; fi
}
assert_eq() {
    local a="$1" b="$2" d="$3"
    if [[ "$a" == "$b" ]]; then check_pass "$d"; else check_fail "$d (got '$a', want '$b')"; fi
}
assert_not_contains() {
    local f="$1" pat="$2" d="$3"
    if grep -Fq "$pat" "$f"; then check_fail "$d (unexpected '$pat' in $f)"; else check_pass "$d"; fi
}

run() {
    "$@" > "$OUT_FILE" 2>&1
    LAST_RC=$?
}


SRC_SKILL="$HOME/.claude/skills/demo-skill"
mkdir -p "$SRC_SKILL/scripts" "$SRC_SKILL/references"
cat > "$SRC_SKILL/SKILL.md" <<'EOF'
---
name: demo-skill
description: Fake skill used by migration tests.
---
EOF
cat > "$SRC_SKILL/scripts/run.sh" <<'EOF'
#!/usr/bin/env bash
echo hi
EOF
cat > "$SRC_SKILL/references/notes.md" <<'EOF'
Reference content.
EOF

WS="$TMP_ROOT/workspace"
mkdir -p "$WS"
cat > "$WS/CLAUDE.md" <<'EOF'
EOF
cat > "$HOME/.claude/settings.json" <<'EOF'
{ "foo": "bar" }
EOF
cat > "$HOME/.claude.json" <<'EOF'
{
  "mcpServers": {
    "demo-server": {
      "command": "echo",
      "args": [],
      "autoApprove": ["shell"],
      "enabledTools": ["read"],
      "disabledTools": ["write"]
    }
  }
}
EOF


echo ""
echo "== A. smart-ide-migration.sh =="

run bash "$LEGACY_SCRIPT" \
    --source claude --target kimiai \
    --workspace "$WS" \
    --objects skills,rules,mcp,config \
    --dry-run
assert_eq "$LAST_RC" "0" "A1: dry-run exits 0"

assert_contains "$OUT_FILE" ".kimi-code/skills" "A1: dry-run target path is registry-correct (~/.kimi-code/skills)"

assert_contains "$OUT_FILE" "skills"  "A1: plan mentions skills"
assert_contains "$OUT_FILE" "rules"   "A1: plan mentions rules"
assert_contains "$OUT_FILE" "mcp"     "A1: plan mentions mcp"
assert_contains "$OUT_FILE" "config"  "A1: plan mentions config"

assert_contains "$OUT_FILE" "DRY-RUN: converting MCP config" "A1: mcp plan printed in dry-run"
assert_not_contains "$OUT_FILE" "MCP config converted"     "A1: mcp NOT marked success in dry-run (C1)"
assert_contains "$OUT_FILE" "automatic whole-IDE config migration is unsupported" "A1: config manual boundary printed"
assert_not_contains "$OUT_FILE" "config file copied"       "A1: config NOT marked success in dry-run (C2)"

for target in kimiai copilot codex; do
    run bash "$LEGACY_SCRIPT" \
        --source claude --target "$target" \
        --workspace "$WS" \
        --objects skills --yes
    assert_eq "$LAST_RC" "0" "A2: real migration to $target exits 0"
done

assert_file "$HOME/.kimi-code/skills/demo-skill/SKILL.md"   "A2: kimiai  -> ~/.kimi-code/skills/demo-skill/"
assert_file "$HOME/.copilot/skills/demo-skill/SKILL.md"     "A2: copilot -> ~/.copilot/skills/demo-skill/"
assert_file "$HOME/.agents/skills/demo-skill/SKILL.md"      "A2: codex   -> ~/.agents/skills/demo-skill/"

assert_dir "$HOME/.copilot/skills/demo-skill/scripts"    "A3: copilot preserves scripts/ subdir (H4)"
assert_dir "$HOME/.copilot/skills/demo-skill/references" "A3: copilot preserves references/ subdir (H4)"

run bash "$LEGACY_SCRIPT" \
    --source claude --target kimiai \
    --workspace "$WS" \
    --objects mcp --yes
assert_eq "$LAST_RC" "0" "A4: mcp migration exits 0"

assert_file "$HOME/.kimi-code/mcp.json" "A4: mcp target file was written"
assert_contains "$HOME/.kimi-code/mcp.json" "demo-server" "A4: mcp server present in target file"
assert_not_contains "$OUT_FILE" "[✗] mcp" "A4: mcp not failed"
assert_contains "$OUT_FILE" "mcp" "A4: mcp reported in output"

assert_not_contains "$HOME/.kimi-code/mcp.json" "autoApprove" "A4: MCP strips autoApprove grants"
assert_not_contains "$HOME/.kimi-code/mcp.json" "enabledTools" "A4: MCP strips enabledTools grants"
assert_not_contains "$HOME/.kimi-code/mcp.json" "disabledTools" "A4: MCP strips disabledTools grants"

CONFIG_TGT="$HOME/.cursor/settings.json"
run bash "$LEGACY_SCRIPT" \
    --source claude --target cursor \
    --workspace "$WS" \
    --objects config --yes
assert_eq "$LAST_RC" "0" "A5: config boundary exits 0"
assert_not_exists "$CONFIG_TGT" "A5: generic config boundary creates no target config"
assert_contains "$OUT_FILE" "automatic whole-IDE config migration is unsupported" "A5: generic config boundary explains manual review"


echo ""
echo "== C. confirmation gate (--yes) =="

GATE_TGT="$HOME/.codeium/windsurf"
safe_remove_fixture_path "$GATE_TGT"
run bash "$LEGACY_SCRIPT" \
    --source claude --target windsurf \
    --workspace "$WS" \
    --objects skills </dev/null
assert_eq "$LAST_RC" "2" "C1: non-interactive without --yes aborts with rc=2"
assert_not_exists "$GATE_TGT" "C1: gate abort leaves zero writes (no target dir created)"

run bash "$LEGACY_SCRIPT" \
    --source claude --target windsurf \
    --workspace "$WS" \
    --objects skills --yes </dev/null
assert_eq "$LAST_RC" "0" "C2: --yes proceeds (rc=0)"
assert_file "$GATE_TGT/skills/demo-skill/SKILL.md" "C2: --yes migration wrote target skill"

safe_remove_fixture_path "$GATE_TGT"
run bash "$LEGACY_SCRIPT" \
    --source claude --target windsurf \
    --workspace "$WS" \
    --objects skills --dry-run </dev/null
assert_eq "$LAST_RC" "0" "C3: dry-run exits 0 without --yes"
assert_not_exists "$GATE_TGT" "C3: dry-run performs zero writes (no target dir created)"


echo ""
echo "== D. project object (manual boundary) =="

SRC_PROJ="$WS/.claude"
safe_remove_fixture_path "$SRC_PROJ"
mkdir -p "$SRC_PROJ"
printf 'API_KEY=EXAMPLE_SECRET_VALUE_1234567890\nPASSWORD=example-password-xyz\n' > "$SRC_PROJ/.env"
printf '{ "token": "example-token-value-1234567890", "name": "ok" }\n' > "$SRC_PROJ/svc.json"
printf 'name: demo\n' > "$SRC_PROJ/notes.yaml"

D_TGT="$WS/.agents"
safe_remove_fixture_path "$D_TGT"
for backup_path in "$WS"/.agents.bak.*; do
    [[ -e "$backup_path" || -L "$backup_path" ]] || continue
    safe_remove_fixture_path "$backup_path"
done

run bash "$LEGACY_SCRIPT" \
    --source claude --target codex \
    --workspace "$WS" \
    --objects project --dry-run
assert_eq "$LAST_RC" "0" "D1: project dry-run exits 0"
assert_not_exists "$D_TGT" "D1: project dry-run performs ZERO writes"
assert_contains "$OUT_FILE" "automatic whole-project configuration migration is unsupported" "D1: project dry-run explains manual boundary"

run bash "$LEGACY_SCRIPT" \
    --source claude --target codex \
    --workspace "$WS" \
    --objects project --yes
assert_eq "$LAST_RC" "0" "D2: project migration exits 0"
assert_not_exists "$D_TGT" "D2: project boundary creates no target tree"
assert_contains "$OUT_FILE" "automatic whole-project configuration migration is unsupported" "D2: project boundary explains manual review"
assert_contains "$SRC_PROJ/.env" "EXAMPLE_SECRET_VALUE_1234567890" "D2: SOURCE secret untouched"
assert_contains "$SRC_PROJ/svc.json" "example-token-value-1234567890" "D2: SOURCE json secret untouched"

if grep -Eq 'rm[[:space:]]+-r[f][[:space:]]+"\$D_TGT"[[:space:]]+"\$WS"/.agents.bak.\*' "$0"; then
    check_fail "D3: project-fixture cleanup avoids recursive variable/glob deletion"
else
    check_pass "D3: project-fixture cleanup avoids recursive variable/glob deletion"
fi

if grep -Eq 'rm -rf "\$\{target_(global|path):\?\}/\$\{skill_name:\?\}"' "$SCRIPT_DIR/smart-ide-migration.sh"; then
    check_fail "D6: redaction failure cleanup bypasses safe_remove_skill_dir"
else
    check_pass "D6: redaction failure cleanup uses guarded deletion"
fi
if grep -Fq 'rm -rf "$target_path"' "$SCRIPT_DIR/smart-ide-migration.sh"; then
    check_fail "D7: project overwrite or failure cleanup bypasses containment guard"
else
    check_pass "D7: project tree deletion uses containment guard"
fi
if grep -Fq 'read -r _confirm_reply' "$SCRIPT_DIR/smart-ide-migration.sh"; then
    check_fail "D8: agent entry point must not block on interactive confirmation"
else
    check_pass "D8: agent entry point is non-interactive and uses --yes as the write gate"
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
    echo "ALL CHECKS PASSED ($CHECKS checks)"
    exit 0
else
    echo "$FAIL / $CHECKS checks FAILED" >&2
    exit 1
fi
