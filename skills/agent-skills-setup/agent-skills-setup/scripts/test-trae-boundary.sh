#!/usr/bin/env bash


set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Native Windows Python ignores MSYS-style env values; convert HOME
# fixtures so $HOME resolution sees a real directory on every platform.

# Pin surface resolution to the POSIX layout the fixtures create;
# otherwise windows-latest would resolve $APPDATA-style overrides.
export AGENT_SKILLS_PLATFORM=linux

native_path() {
    if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
TRAE_REFERENCE="$SCRIPT_DIR/../references/ides/trae.md"
TRAE_CN_REFERENCE="$SCRIPT_DIR/../references/ides/trae-cn.md"
MIGRATION="$SCRIPT_DIR/smart-ide-migration.sh"
WORKSPACE="$(mktemp -d /tmp/agent-skills-trae-boundary.XXXXXX)"
trap 'rm -rf "$WORKSPACE"' EXIT

CHECKS=0
FAIL=0

pass() { CHECKS=$((CHECKS + 1)); echo "PASS: $1"; }
fail() { CHECKS=$((CHECKS + 1)); FAIL=$((FAIL + 1)); echo "FAIL: $1" >&2; }

if grep -Fq 'bytedance/trae-agent' "$TRAE_REFERENCE" && grep -Fq 'bytedance/trae-agent' "$TRAE_CN_REFERENCE"; then
    pass "Trae references cite bytedance/trae-agent as a separate product"
else
    fail "Trae references do not mention bytedance/trae-agent; users may confuse Trae IDE with Trae Agent"
fi

if grep -Eq '`?~/.trae(-cn)?/argv\.json`?:? +(still |also |is |are )?(published|documented|valid|supported)|Trae +IDE +has +a +(global|published) +(CLI|argv|settings)' "$TRAE_REFERENCE" "$TRAE_CN_REFERENCE"; then
    fail "Trae references claim a global Trae-IDE CLI/argv/settings path exists"
else
    pass "Trae references do not assert a global Trae-IDE CLI/argv/settings file"
fi

if grep -Eq 'global +`?~/.trae(-cn)?/(trae_config\.yaml|trae_config\.json|settings\.json)`?' "$TRAE_REFERENCE" "$TRAE_CN_REFERENCE"; then
    fail "Trae references promote a Trae-Agent repo-local config file to global ~/.trae/ status"
else
    pass "Trae references do not promote trae_config.yaml to a global Trae IDE path"
fi

grep -Eq 'trae-agent|trae-cli|trae_agent' "$MIGRATION" \
    && fail "smart-ide-migration.sh references a Trae-Agent-specific key (trae-cli/trae-agent/trae_agent)" \
    || pass "smart-ide-migration.sh does not register a Trae-Agent surface as a mapper target"

mkdir -p "$WORKSPACE/.claude/skills/demo"
printf '%s\n' '---' 'name: demo' 'description: demo' '---' '# demo' > "$WORKSPACE/.claude/skills/demo/SKILL.md"
OUTPUT="$(HOME="$(native_path "$WORKSPACE")" bash "$MIGRATION" \
    legacy --source claude --target trae-cli --workspace "$WORKSPACE" \
    --objects skills --dry-run 2>&1 || true)"
if grep -Eq 'manual|unsupported|not +(a |an )(supported|registered)|unknown +target|invalid +target' <<< "$OUTPUT"; then
    pass "trae-cli is rejected as an unknown target (no path invention)"
else
    fail "trae-cli target output did not emit a manual/unsupported marker; got: $OUTPUT"
fi

OUTPUT2="$(HOME="$(native_path "$WORKSPACE")" bash "$MIGRATION" \
    legacy --source claude --target trae --workspace "$WORKSPACE" \
    --print-path trae config 2>/dev/null || true)"
if [[ -z "$OUTPUT2" ]]; then
    pass "trae|config resolves to empty (no fake global config file path)"
else
    fail "trae|config produced a non-empty path: '$OUTPUT2' (registry says no global config file exists)"
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
    echo "ALL CHECKS PASSED ($CHECKS checks)"
    exit 0
else
    echo "$FAIL / $CHECKS checks FAILED" >&2
    exit 1
fi
