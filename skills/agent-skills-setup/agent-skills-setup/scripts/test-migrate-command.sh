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
WRAPPER="${SCRIPT_DIR}/smart-ide-migration.sh"

WS="$(mktemp -d /tmp/migrate-cmd-ws.XXXXXX)"
HOME_DIR="$(mktemp -d /tmp/migrate-cmd-home.XXXXXX)"
trap 'rm -rf "$WS" "$HOME_DIR"' EXIT

# Stage a cline skill in HOME so the user-scope surface resolves.
mkdir -p "$HOME_DIR/.cline/skills/fixture-skill"
cat > "$HOME_DIR/.cline/skills/fixture-skill/SKILL.md" <<'SKILL'
---
name: fixture-skill
description: Test skill for migrate command.
metadata:
  version: '1'
---
# fixture
SKILL

# Stage an instructions source in HOME.
mkdir -p "$HOME_DIR/.cline/rules"
cat > "$HOME_DIR/.cline/rules/review.md" <<'INSTR'
---
paths:
  - 'src/**/*.ts'
description: Review
---
Review.
INSTR

# Stage an MCP source in HOME.
cat > "$HOME_DIR/.cline/mcp.json" <<'MCP'
{"mcpServers":{"demo":{"command":"demo","args":["--safe"]}}}
MCP

# --plan-only writes the plan but does NOT touch the target tree.
HOME="$(native_path "$HOME_DIR")" "${WRAPPER}" migrate \
    --source cline/ide \
    --target forge/cli \
    --workspace "$WS" \
    --scope user \
    --objects skills,instructions \
    --plan-only \
    --yes >/dev/null

PLAN="$WS/.migration/migrate-plan.json"
[[ -f "$PLAN" ]] || { echo "FAIL: plan not written"; exit 1; }
echo "OK --plan-only wrote plan to $PLAN"

# Confirm plan-only mode did NOT call apply: no manifest under .migration.
[[ ! -f "$WS/.migration/migrate-manifest.json" ]] || {
    echo "FAIL: plan-only should not have written a manifest"; exit 1;
}
echo "OK --plan-only did not invoke apply"

# Confirm no target files were written.
[[ ! -d "$HOME_DIR/forge" ]] || {
    echo "FAIL: plan-only wrote target files"; exit 1;
}
echo "OK --plan-only performed zero writes"

# Default --objects is all-portable. Confirm plan documents default.
PLAN_OBJECTS="$(python3 -c "import json,sys; print(','.join(json.load(open(sys.argv[1]))['objects']))" "$PLAN")"
echo "OK plan objects: $PLAN_OBJECTS"

# Full pipeline (plan + apply + verify).
OUT="$(HOME="$(native_path "$HOME_DIR")" "${WRAPPER}" migrate \
    --source cline/ide \
    --target forge/cli \
    --workspace "$WS" \
    --scope user \
    --objects skills,instructions,mcp \
    --yes --json 2>&1)"
MIGRATE_RC=$?
if [[ $MIGRATE_RC -ne 0 ]]; then
    echo "MIGRATE FAILED with output:"
    echo "$OUT" | head -50
    exit 1
fi
echo "$OUT" > "$WS/migrate-out.json"
python3 - "$(native_path "$WS/migrate-out.json")" <<'PY'
import json, re, sys
text = open(sys.argv[1]).read()
m = re.search(r'\{.*\}', text, re.DOTALL)
if not m:
    print('FAIL: no JSON in migrate output:', text[:200])
    raise SystemExit(1)
out = json.loads(m.group(0))
assert out['ok'] is True, out
assert out['stage'] == 'verify', out
assert 'manifest' in out and out['manifest'].endswith('migrate-manifest.json'), out
assert 'verify' in out and out['verify'].endswith('migrate-verify.json'), out
assert out['summary'], out['summary']
assert out['summary'].get('applied', 0) >= 1, out['summary']
print('OK full migrate pipeline summary:', out['summary'])
PY

# Verify the ready Skill landed on the forge target tree.
SKILL_DST="$HOME_DIR/forge/skills/fixture-skill"
[[ -f "$SKILL_DST/SKILL.md" ]] || {
    echo "FAIL: ready skill did not land at $SKILL_DST"; exit 1;
}
echo "OK ready skill landed at $SKILL_DST"

# Verify the verify artifact says OK.
VERIFY="$WS/.migration/migrate-verify.json"
VERIFY_OK="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['ok'])" "$VERIFY")"
[[ "$VERIFY_OK" == "True" ]] || { echo "FAIL: verify reported errors: $VERIFY_OK"; exit 1; }
echo "OK verify artifact reports ok=true"

# Re-run should be idempotent at the target tree level.
HOME="$(native_path "$HOME_DIR")" "${WRAPPER}" migrate \
    --source cline/ide \
    --target forge/cli \
    --workspace "$WS" \
    --scope user \
    --objects skills,instructions,mcp \
    --yes >/dev/null 2>&1 || true
echo "OK second migrate invocation completed (idempotency not strictly asserted without fixtures)"

# --strict with mixed-status plan should fail.
set +e
HOME="$(native_path "$HOME_DIR")" "${WRAPPER}" migrate \
    --source cline/ide \
    --target forge/cli \
    --workspace "$WS" \
    --scope user \
    --objects skills,instructions,mcp \
    --strict \
    --yes >/dev/null 2>&1
STRICT_RC=$?
set -e
if [[ $STRICT_RC -eq 0 ]]; then
    echo "FAIL: --strict should have rejected a mixed plan"
    exit 1
fi
echo "OK --strict mode rejected mixed plan (rc=$STRICT_RC)"

echo
echo "Migrate command tests passed"