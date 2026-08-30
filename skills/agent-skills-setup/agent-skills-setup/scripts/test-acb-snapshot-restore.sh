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

WS_OLD="$(mktemp -d /tmp/acb-old.XXXXXX)"
HOME_OLD="$(mktemp -d /tmp/acb-home-old.XXXXXX)"
WS_NEW="$(mktemp -d /tmp/acb-new.XXXXXX)"
HOME_NEW="$(mktemp -d /tmp/acb-home-new.XXXXXX)"
BUNDLE="$(mktemp -d /tmp/acb-bundle.XXXXXX)"
trap 'rm -rf "$WS_OLD" "$HOME_OLD" "$WS_NEW" "$HOME_NEW" "$BUNDLE"' EXIT

# Stage a cline skill in the OLD device home.
mkdir -p "$HOME_OLD/.cline/skills/fixture-skill"
cat > "$HOME_OLD/.cline/skills/fixture-skill/SKILL.md" <<'SKILL'
---
name: fixture-skill
description: Test skill for ACB.
metadata:
  version: '1'
---
# fixture
SKILL

# Stage the same skill on the NEW device so the restore apply path can
# write it. (Full bundle-content restore arrives in a later PR; this
# test verifies the ACB snapshot/verify/restore orchestration.)
mkdir -p "$HOME_NEW/.cline/skills/fixture-skill"
cp "$HOME_OLD/.cline/skills/fixture-skill/SKILL.md" "$HOME_NEW/.cline/skills/fixture-skill/"

# --- snapshot ----------------------------------------------------------
SNAPSHOT_OUT="$(HOME="$(native_path "$HOME_OLD")" "$WRAPPER" snapshot \
    --workspace "$WS_OLD" \
    --source cline/ide --target forge/cli \
    --scope user \
    --output "$BUNDLE" \
    --json 2>&1)" || {
    echo "snapshot failed: $SNAPSHOT_OUT" | head -30
    exit 1
}

echo "$SNAPSHOT_OUT" | python3 -c "
import json, sys, re
text = sys.stdin.read()
m = re.search(r'\{.*\}', text, re.DOTALL)
out = json.loads(m.group(0))
assert out['ok'] is True, out
assert out['stage'] == 'snapshot', out
assert out['bundle'], out
assert out['objects_captured'] >= 1, out
print('OK snapshot bundle:', out['bundle'])
print('OK bundle_id:', out['bundle_id'])
print('OK objects_captured:', out['objects_captured'])
"

[[ -f "$BUNDLE/manifest.json" ]] || { echo "FAIL: manifest.json missing"; exit 1; }
[[ -f "$BUNDLE/inventory.json" ]] || { echo "FAIL: inventory.json missing"; exit 1; }
[[ -f "$BUNDLE/compatibility.json" ]] || { echo "FAIL: compatibility.json missing"; exit 1; }
[[ -f "$BUNDLE/requirements.json" ]] || { echo "FAIL: requirements.json missing"; exit 1; }
[[ -f "$BUNDLE/secrets.required.json" ]] || { echo "FAIL: secrets.required.json missing"; exit 1; }
[[ -f "$BUNDLE/reauth.json" ]] || { echo "FAIL: reauth.json missing"; exit 1; }
[[ -f "$BUNDLE/rebuild.json" ]] || { echo "FAIL: rebuild.json missing"; exit 1; }
[[ -f "$BUNDLE/checksums.json" ]] || { echo "FAIL: checksums.json missing"; exit 1; }
[[ -d "$BUNDLE/objects" ]] || { echo "FAIL: objects/ missing"; exit 1; }
# Verify the captured skill source bytes are in objects/ (object_id
# derived from product|profile|scope|canonical).
SKILL_IN_OBJECTS=$(find "$BUNDLE/objects" -name "SKILL.md" -path "*fixture-skill*" | head -1)
[[ -n "$SKILL_IN_OBJECTS" ]] || {
    echo "FAIL: SKILL.md not captured under objects/"
    exit 1
}
echo "OK ACB objects/ captured source bytes (SKILL.md under $(echo "$SKILL_IN_OBJECTS" | sed "s|$BUNDLE/objects/||"))"
echo "OK ACB layout complete (manifest/inventory/compatibility/requirements/secrets/reauth/rebuild/checksums/objects + captured objects)"

# --- bundle verify -----------------------------------------------------
VERIFY_OUT="$("$WRAPPER" bundle-verify "$BUNDLE" --json)"
echo "$VERIFY_OUT" | python3 -c "
import json, sys
out = json.load(sys.stdin)
assert out['ok'] is True, out
assert out['errors'] == [], out
print('OK bundle-verify clean')
"

# --- detect literal-secret leak ---------------------------------------
# Inject a synthetic bundle where the manifest payload contains a
# secret-looking string and ensure write_bundle refuses.
python3 - "$SCRIPT_DIR" <<'PY'
import sys
sys.path.insert(0, sys.argv[1])
from acb.bundle import (
    ACB_SCHEMA_VERSION,
    ACBManifest,
    write_bundle,
    ACBSecretLeak,
    make_bundle_id,
)
import tempfile, pathlib, json
tmp = pathlib.Path(tempfile.mkdtemp(prefix='acb-leak-'))
manifest = ACBManifest(
    schema_version=ACB_SCHEMA_VERSION,
    bundle_id=make_bundle_id(),
    created_at='2026-08-15T00:00:00Z',
    source_platform={'system': 'darwin'},
    inventory_summary={},
    objects=[{'product': 'demo', 'surface': 'mcp', 'secret': 'token=AKIA1234567890ABCDEF'}],
)
try:
    write_bundle(
        bundle_root=tmp,
        manifest=manifest,
        inventory_rows=[],
        compatibility={},
        requirements={},
        secrets_required=[],
        reauth=[],
        rebuild=[],
    )
except ACBSecretLeak:
    print('OK write_bundle refused literal secret leak')
else:
    print('FAIL: write_bundle accepted a literal secret leak')
    raise SystemExit(1)
PY

# --- restore -----------------------------------------------------------
RESTORE_OUT="$(HOME="$(native_path "$HOME_NEW")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_NEW" \
    --source cline/ide --target forge/cli \
    --scope user \
    --restore-root "$WS_NEW/.acb-restored" \
    --apply-safe \
    --yes --json 2>&1)" || {
    echo "restore failed: $RESTORE_OUT" | head -30
    exit 1
}
echo "$RESTORE_OUT" | python3 -c "
import json, sys, re
text = sys.stdin.read()
m = re.search(r'\{.*\}', text, re.DOTALL)
out = json.loads(m.group(0))
assert out['ok'] is True, out
assert out['stage'] == 'verify', out
assert out['summary'].get('applied', 0) >= 1, out['summary']
print('OK restore summary:', out['summary'])
"

# Verify the skill landed on the NEW device.
[[ -f "$HOME_NEW/forge/skills/fixture-skill/SKILL.md" ]] || {
    echo "FAIL: skill did not land on the new device"
    exit 1
}
echo "OK restore landed skill on new device"

# Verify objects/ were replayed into the restore-root.
RESTORE_ROOT="$WS_NEW/.acb-restored"
find "$RESTORE_ROOT" -name "SKILL.md" -path "*fixture-skill*" | grep -q . || {
    echo "FAIL: bundle/objects/ was not replayed into $RESTORE_ROOT"
    exit 1
}
echo "OK restore replayed bundle/objects/ into $RESTORE_ROOT (found SKILL.md under fixture-skill)"

# --- doctor ------------------------------------------------------------
DOCTOR_OUT="$("$WRAPPER" doctor "$BUNDLE" --json || true)"
echo "$DOCTOR_OUT" | python3 -c "
import json, sys
out = json.load(sys.stdin)
assert 'missing_executables' in out
assert 'reauth_actions' in out
assert 'rebuild_actions' in out
print('OK doctor bundle keys:', sorted(out.keys()))
"

echo
echo "ACB snapshot/restore tests passed"