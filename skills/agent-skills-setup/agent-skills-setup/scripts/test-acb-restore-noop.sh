#!/usr/bin/env bash

# Verify audit #2 (no silent no-op) and #5 (temp staging dir cleanup) for
# context-migrator restore. A bundle that carries matching objects but resolves
# no eligible items must FAIL (never report success), unless --allow-noop is
# given. The temp staging directory must never leak to /tmp.

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

TMP_ROOT="$(mktemp -d /tmp/acb-restore-noop.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

BUNDLE="$TMP_ROOT/device-a.acb"
HOME_A="$TMP_ROOT/home_device_a"
WS_A="$TMP_ROOT/ws_device_a"
HOME_B="$TMP_ROOT/home_device_b"
WS_B="$TMP_ROOT/ws_device_b"

mkdir -p "$HOME_A/.cline/skills/awesome-skill" "$WS_A"
mkdir -p "$HOME_B" "$WS_B"

cat > "$HOME_A/.cline/skills/awesome-skill/SKILL.md" <<'EOF'
---
name: awesome-skill
description: Skill captured on Device A
metadata:
  version: "1.0.0"
---
# Awesome Skill from Device A
EOF

# Snapshot a USER-scope skill on Device A.
HOME="$(native_path "$HOME_A")" "$WRAPPER" snapshot \
    --workspace "$WS_A" \
    --source cline/ide --target forge/cli \
    --scope user \
    --output "$BUNDLE" \
    --json >/dev/null

echo "OK Device A snapshot generated"

# Restore on a clean Device B with a MISMATCHED scope (project). The bundle
# only has user-scope objects, so staging resolves nothing eligible. This must
# be a hard failure, not a silent no-op.
set +e
HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --source cline/ide --target forge/cli \
    --scope project \
    --apply-safe \
    --yes \
    --json >"$TMP_ROOT/restore.json" 2>&1
RC=$?
set -e

[[ $RC -ne 0 ]] || {
    echo "FAIL: restore with no eligible items should fail (got rc=$RC)"
    cat "$TMP_ROOT/restore.json"
    exit 1
}
grep -q '"ok": *false' "$TMP_ROOT/restore.json" || {
    echo "FAIL: expected ok:false in output"
    cat "$TMP_ROOT/restore.json"
    exit 1
}
echo "OK restore refused silent no-op (rc=$RC, ok:false)"

# --allow-noop must let it succeed (informational, zero applied).
set +e
HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --source cline/ide --target forge/cli \
    --scope project \
    --apply-safe \
    --yes \
    --allow-noop \
    --json >"$TMP_ROOT/restore_noop.json" 2>&1
RC2=$?
set -e

[[ $RC2 -eq 0 ]] || {
    echo "FAIL: --allow-noop should succeed (got rc=$RC2)"
    cat "$TMP_ROOT/restore_noop.json"
    exit 1
}
echo "OK --allow-noop permitted empty restore"

# Temp staging directory must not leak to /tmp.
LEAK="$(ls -d /tmp/acb-source-stage-* 2>/dev/null | head -1 || true)"
[[ -z "$LEAK" ]] || {
    echo "FAIL: temp staging dir leaked: $LEAK"
    exit 1
}
echo "OK no /tmp/acb-source-stage-* leak after restore"

echo
echo "ACB restore no-op guard + temp cleanup tests passed"
