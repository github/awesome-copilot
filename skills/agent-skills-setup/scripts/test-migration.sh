#!/usr/bin/env bash
#
# test-migration.sh — isolated tests for the migration + sync engines.
#
# Exercises BOTH smart-ide-migration.sh and sync-global-skills.sh using FAKE
# data and a TEMP HOME. The real user home is never touched: HOME is pointed at
# a mktemp tree for the entire run, and the sync engine's target dirs are routed
# to temp dirs via the AGENT_SKILLS_*_DIR env overrides.
#
# Mirrors the isolation style of test-openclaw-support.sh:
#   - temp HOME (mktemp)
#   - cleanup trap
#   - clear per-check PASS/FAIL
#   - non-zero exit on any failure

# No `set -e`: we want to ACCUMULATE failures across checks and report them,
# then exit non-zero at the end. The scripts-under-test carry their own
# `set -euo pipefail` internally.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Isolation: TEMP HOME ----------------------------------------------------
# Everything the engines write (via ${HOME}/...) lands here. The real ~ is never
# referenced because we export HOME to this tree before invoking the scripts.
TMP_ROOT="$(mktemp -d /tmp/agent-skills-migration-test.XXXXXX)"
export HOME="$TMP_ROOT/home"
mkdir -p "$HOME"

# Temp output capture for the last script invocation.
OUT_FILE="$TMP_ROOT/last.out"

cleanup() {
    rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

# --- Check accounting ---------------------------------------------------------
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

# Run a script, capturing stdout+stderr and its exit code.
run() {
    "$@" > "$OUT_FILE" 2>&1
    LAST_RC=$?
}

# ===========================================================================
# Fake source fixtures
# ===========================================================================

# A rich fake skill: SKILL.md + scripts/ + references/ (tests subdir preservation).
SRC_SKILL="$HOME/.claude/skills/demo-skill"
mkdir -p "$SRC_SKILL/scripts" "$SRC_SKILL/references"
cat > "$SRC_SKILL/SKILL.md" <<'EOF'
---
name: demo-skill
description: Fake skill used by migration tests.
---
# Demo Skill
EOF
cat > "$SRC_SKILL/scripts/run.sh" <<'EOF'
#!/usr/bin/env bash
echo hi
EOF
cat > "$SRC_SKILL/references/notes.md" <<'EOF'
Reference content.
EOF

# A workspace root (for the rules object) and source rule/config/mcp files so the
# dry-run plan exercises all four object kinds.
WS="$TMP_ROOT/workspace"
mkdir -p "$WS"
cat > "$WS/CLAUDE.md" <<'EOF'
# Project rules
EOF
cat > "$HOME/.claude/settings.json" <<'EOF'
{ "foo": "bar" }
EOF
cat > "$HOME/.claude.json" <<'EOF'
{
  "mcpServers": {
    "demo-server": { "command": "echo", "args": [] }
  }
}
EOF

# ===========================================================================
# A. smart-ide-migration.sh
# ===========================================================================

echo ""
echo "== A. smart-ide-migration.sh =="

# --- A1. Dry-run plan assertion (source claude -> target kimiai) ------------
run bash "$SCRIPT_DIR/smart-ide-migration.sh" \
    --source claude --target kimiai \
    --workspace "$WS" \
    --objects skills,rules,mcp,config \
    --dry-run
assert_eq "$LAST_RC" "0" "A1: dry-run exits 0"

# Target path must be registry-correct: ~/.kimi-code/skills
assert_contains "$OUT_FILE" ".kimi-code/skills" "A1: dry-run target path is registry-correct (~/.kimi-code/skills)"

# Plan must mention all four object kinds.
assert_contains "$OUT_FILE" "skills"  "A1: plan mentions skills"
assert_contains "$OUT_FILE" "rules"   "A1: plan mentions rules"
assert_contains "$OUT_FILE" "mcp"     "A1: plan mentions mcp"
assert_contains "$OUT_FILE" "config"  "A1: plan mentions config"

# MCP: dry-run must print a PLAN, never a (false) success. The fixed logic sets
# status "skipped" for mcp in dry-run; the success wording only appears on a real
# conversion. Same for config.
assert_contains "$OUT_FILE" "DRY-RUN: 转换MCP配置"      "A1: mcp plan printed in dry-run"
assert_not_contains "$OUT_FILE" "MCP配置已转换"          "A1: mcp NOT marked success in dry-run (C1)"
assert_contains "$OUT_FILE" "DRY-RUN: 复制配置文件"      "A1: config plan printed in dry-run"
assert_not_contains "$OUT_FILE" "配置文件已复制"         "A1: config NOT marked success in dry-run (C2)"

# --- A2. Real execution lands in correct locations (4 targets) --------------
for target in kimiai copilot codex workbuddy; do
    run bash "$SCRIPT_DIR/smart-ide-migration.sh" \
        --source claude --target "$target" \
        --workspace "$WS" \
        --objects skills
    assert_eq "$LAST_RC" "0" "A2: real migration to $target exits 0"
done

assert_file "$HOME/.kimi-code/skills/demo-skill/SKILL.md"   "A2: kimiai  -> ~/.kimi-code/skills/demo-skill/"
assert_file "$HOME/.copilot/skills/demo-skill/SKILL.md"     "A2: copilot -> ~/.copilot/skills/demo-skill/"
assert_file "$HOME/.agents/skills/demo-skill/SKILL.md"      "A2: codex   -> ~/.agents/skills/demo-skill/"
assert_file "$HOME/.workbuddy/skills/demo-skill/SKILL.md"   "A2: workbuddy -> ~/.workbuddy/skills/demo-skill/"

# --- A3. Copilot preserves subdirs (H4) ------------------------------------
assert_dir "$HOME/.copilot/skills/demo-skill/scripts"    "A3: copilot preserves scripts/ subdir (H4)"
assert_dir "$HOME/.copilot/skills/demo-skill/references" "A3: copilot preserves references/ subdir (H4)"

# --- A4. MCP honest status (C1) --------------------------------------------
# Source claude has a real MCP file; target kimiai supports mcpServers JSON.
run bash "$SCRIPT_DIR/smart-ide-migration.sh" \
    --source claude --target kimiai \
    --workspace "$WS" \
    --objects mcp
assert_eq "$LAST_RC" "0" "A4: mcp migration exits 0"

# The fixed logic NEVER reports success/copied without actually writing the file.
# So: status must be success/copied AND the target file must exist + be non-empty
# AND contain the converted server.
assert_file "$HOME/.kimi-code/mcp.json" "A4: mcp target file was written"
assert_contains "$HOME/.kimi-code/mcp.json" "demo-server" "A4: mcp server present in target file"
assert_not_contains "$OUT_FILE" "[✗] mcp" "A4: mcp not failed"
assert_contains "$OUT_FILE" "mcp" "A4: mcp reported in output"

# ===========================================================================
# B. sync-global-skills.sh — all 7 targets
# ===========================================================================

echo ""
echo "== B. sync-global-skills.sh =="

SYNC_SRC="$TMP_ROOT/sync-src"
mkdir -p "$SYNC_SRC/demo-a" "$SYNC_SRC/demo-b/scripts" "$SYNC_SRC/demo-b/references"
cat > "$SYNC_SRC/demo-a/SKILL.md" <<'EOF'
---
name: demo-a
description: Sync source skill A.
---
# Demo A
EOF
cat > "$SYNC_SRC/demo-b/SKILL.md" <<'EOF'
---
name: demo-b
description: Sync source skill B with subdirs.
---
# Demo B
EOF
cat > "$SYNC_SRC/demo-b/scripts/build.sh" <<'EOF'
#!/usr/bin/env bash
echo build
EOF
cat > "$SYNC_SRC/demo-b/references/doc.md" <<'EOF'
Doc.
EOF

# Route every target to a temp dir via the documented env overrides.
T_CLAUDE="$TMP_ROOT/t/claude"
T_CODEX="$TMP_ROOT/t/codex"
T_COPILOT="$TMP_ROOT/t/copilot"
T_OPENCLAW="$TMP_ROOT/t/openclaw"
T_TRAE="$TMP_ROOT/t/trae"
T_TRAE_CN="$TMP_ROOT/t/trae-cn"
T_WORKBUDDY="$TMP_ROOT/t/workbuddy"
mkdir -p "$T_CLAUDE" "$T_CODEX" "$T_COPILOT" "$T_OPENCLAW" "$T_TRAE" "$T_TRAE_CN" "$T_WORKBUDDY"

run env \
    AGENT_SKILLS_SOURCE_DIR="$SYNC_SRC" \
    AGENT_SKILLS_CLAUDE_DIR="$T_CLAUDE" \
    AGENT_SKILLS_CODEX_DIR="$T_CODEX" \
    AGENT_SKILLS_COPILOT_DIR="$T_COPILOT" \
    AGENT_SKILLS_OPENCLAW_DIR="$T_OPENCLAW" \
    AGENT_SKILLS_TRAE_DIR="$T_TRAE" \
    AGENT_SKILLS_TRAE_CN_DIR="$T_TRAE_CN" \
    AGENT_SKILLS_WORKBUDDY_DIR="$T_WORKBUDDY" \
    bash "$SCRIPT_DIR/sync-global-skills.sh" \
    --targets claude,codex,copilot,openclaw,trae,trae-cn,workbuddy
assert_eq "$LAST_RC" "0" "B5: sync of all 7 targets exits 0 (verify passed)"

# Each target should have received the synced skills (full-dir targets keep subdirs).
for tv in claude codex openclaw trae trae-cn workbuddy; do
    case "$tv" in
        claude)     d="$T_CLAUDE" ;;
        codex)      d="$T_CODEX" ;;
        openclaw)   d="$T_OPENCLAW" ;;
        trae)       d="$T_TRAE" ;;
        trae-cn)    d="$T_TRAE_CN" ;;
        workbuddy)  d="$T_WORKBUDDY" ;;
    esac
    assert_file "$d/demo-a/SKILL.md"          "B5: $tv received demo-a"
    assert_file "$d/demo-b/SKILL.md"          "B5: $tv received demo-b"
    assert_dir  "$d/demo-b/scripts"           "B5: $tv preserved demo-b/scripts"
    assert_dir  "$d/demo-b/references"        "B5: $tv preserved demo-b/references"
done

# Copilot mirrors full skill directories (consistent with smart-ide-migration.sh H4).
assert_dir  "$T_COPILOT/demo-a"          "B5: copilot received demo-a/ (dir mirror)"
assert_dir  "$T_COPILOT/demo-b"          "B5: copilot received demo-b/ (dir mirror)"
assert_dir  "$T_COPILOT/demo-b/scripts"    "B5: copilot preserved demo-b/scripts"
assert_dir  "$T_COPILOT/demo-b/references" "B5: copilot preserved demo-b/references"

# No sync may land on a wrong/stale path.
assert_not_exists "$HOME/.copilot-skills" "B5: never syncs to stale ~/.copilot-skills"
assert_not_exists "$HOME/.codex/skills"  "B5: never syncs to stale ~/.codex/skills"

# ===========================================================================
# Summary
# ===========================================================================
echo ""
if [[ $FAIL -eq 0 ]]; then
    echo "ALL CHECKS PASSED ($CHECKS checks)"
    exit 0
else
    echo "$FAIL / $CHECKS checks FAILED" >&2
    exit 1
fi
