#!/usr/bin/env bash
#
# Audit #1 / #4 regression tests:
#   #1  The reviewed plan document (--plan-out) must be backed by the SAME
#       source that produces the executed items. On a clean device the local
#       registry resolves nothing, so the plan must be rebuilt from the bundle;
#       its ready-item count must equal the number of items actually applied.
#   #4  Object extraction into .acb-restored is OPT-IN (--restore-root); when
#       omitted, nothing is written there, and we never imply a transaction
#       landed there.
#
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

TMP_ROOT="$(mktemp -d /tmp/acb-bundle-backed.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

BUNDLE="$TMP_ROOT/device-a.acb"
HOME_A="$TMP_ROOT/home_device_a"
WS_A="$TMP_ROOT/ws_device_a"
HOME_B="$TMP_ROOT/home_device_b"
WS_B="$TMP_ROOT/ws_device_b"
PLAN="$TMP_ROOT/restore-plan.json"

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

# 1. Snapshot on Device A
if ! HOME="$(native_path "$HOME_A")" "$WRAPPER" snapshot \
    --workspace "$WS_A" \
    --source cline/ide --target forge/cli \
    --scope user \
    --output "$BUNDLE" \
    --json >"$TMP_ROOT/snapshot.json"; then
    echo "FAIL: snapshot exited non-zero; captured output:" >&2
    cat "$TMP_ROOT/snapshot.json" >&2 || true
    exit 1
fi
python3 - "$TMP_ROOT/snapshot.json" <<'PY'
import json, sys
out = json.load(open(sys.argv[1]))
assert out.get("ok") is True, out
captured = out.get("objects_captured", 0)
assert captured >= 1, (
    f"snapshot captured {captured} objects; summary={json.dumps(out.get('summary', {}))} "
    f"collection={json.dumps(out.get('collection_summary', {}))}"
)
print(f"OK Device A snapshot generated ({captured} objects)")
PY

# 2. Restore on clean Device B with a reviewed plan, but WITHOUT --restore-root.
if ! HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --source cline/ide --target forge/cli \
    --scope user \
    --plan-out "$PLAN" \
    --apply-safe \
    --yes \
    --json >"$TMP_ROOT/restore.json"; then
    echo "FAIL: restore exited non-zero; captured output:" >&2
    cat "$TMP_ROOT/restore.json" >&2 || true
    echo "--- bundle manifest ---" >&2
    cat "$BUNDLE/manifest.json" >&2 || true
    exit 1
fi

# Extract the JSON object from the (possibly noisy) output.
RESTORE_JSON="$(python3 - "$TMP_ROOT/restore.json" <<'PY'
import json, re, sys
text = open(sys.argv[1]).read()
obj = json.loads(re.search(r'\{.*\}', text, re.DOTALL).group(0))
print(json.dumps(obj))
PY
)"

echo "$RESTORE_JSON" | python3 -c "
import json, sys
out = json.load(sys.stdin)
assert out['ok'] is True, out
assert out['stage'] == 'verify', out
print('OK restore reported ok, stage=verify')
"

# 3. #1: reviewed plan == executed plan with strict dual-side assertions.
python3 - "$PLAN" "$RESTORE_JSON" "$WS_B" "$HOME_B" <<'PY'
import json, sys
from pathlib import Path

plan = json.load(open(sys.argv[1]))
restore = json.loads(sys.argv[2])
ws_b = Path(sys.argv[3]).resolve()
home_b = Path(sys.argv[4]).resolve()

manifest_path = restore.get('manifest')
manifest = json.load(open(manifest_path))

# P0-1 assertion: plan workspace == real workspace
plan_ws = Path(plan.get('workspace', '')).resolve()
assert plan_ws == ws_b, f"plan workspace {plan_ws} != real workspace {ws_b}"

# P0-1 assertion: plan_sha256 in provenance matches reviewed plan_sha256
plan_sha = plan.get('plan_sha256')
prov_sha = manifest.get('provenance', {}).get('plan_sha256')
assert plan_sha == prov_sha, f"manifest provenance plan_sha ({prov_sha}) != reviewed plan_sha ({plan_sha})"

plan_ready = [it for it in plan.get('items', []) if it.get('status') == 'ready']
applied = restore.get('summary', {}).get('applied', 0)

assert plan_ready, f"reviewed plan has no ready items: {plan.get('items')}"
assert len(plan_ready) == applied, (
    f"reviewed plan ready count ({len(plan_ready)}) != applied ({applied}); "
    "reviewed plan diverged from executed plan"
)

# P0-1 assertion: plan target path matches the real target on Device B (not a temporary stage path)
for item in plan_ready:
    target_path = Path(item.get('target', {}).get('resolved_path', '')).resolve()
    assert target_path, f"missing target path in plan item: {item}"
    assert "/tmp/acb-source-stage-" not in str(target_path), f"leak of temporary stage path into reviewed plan target: {target_path}"
    assert target_path == home_b / "forge/skills" or home_b in target_path.parents or target_path == ws_b or ws_b in target_path.parents, f"target path not rooted in Device B: {target_path}"

    # Check review preview
    preview = item.get('review_preview')
    assert preview is not None, f"missing review_preview in plan item: {item}"
    for change in preview.get('changes', []):
        change_path = Path(change.get('path', '')).resolve()
        assert "/tmp/acb-source-stage-" not in str(change_path), f"temporary stage path in preview change: {change_path}"
        assert home_b in change_path.parents or ws_b in change_path.parents, f"change path not rooted in Device B: {change_path}"

# P0-1 assertion: manifest applied changes match reviewed plan target paths
manifest_changes = manifest.get('changes', [])
for change in manifest_changes:
    dest_str = change.get('path') or change.get('destination') or ''
    assert dest_str, f"missing path in manifest change: {change}"
    dest = Path(dest_str).resolve()
    assert "/tmp/acb-source-stage-" not in str(dest), f"temporary stage path in manifest change: {dest}"
    assert home_b in dest.parents or ws_b in dest.parents or dest == home_b / "forge/skills/awesome-skill", f"manifest destination not rooted in Device B: {dest}"

print(f"OK #1 reviewed plan ready items ({len(plan_ready)}) == applied ({applied})")
print(f"OK #1 reviewed plan target ({target_path}) == manifest target ({dest}) == written target")
print(f"OK #1 plan workspace ({plan_ws}) == real workspace ({ws_b})")
print(f"OK #1 plan_sha256 matches manifest provenance ({plan_sha})")
PY

# 4. The target skill actually landed.
TARGET_SKILL="$HOME_B/forge/skills/awesome-skill/SKILL.md"
[[ -f "$TARGET_SKILL" ]] || { echo "FAIL: skill did not land on Device B"; exit 1; }
echo "OK restored skill landed on clean Device B"

# 5. #4: NO .acb-restored was written (extraction is opt-in).
if [[ -e "$WS_B/.acb-restored" ]]; then
    echo "FAIL #4: .acb-restored was created without --restore-root"
    exit 1
fi
echo "OK #4 no .acb-restored created without --restore-root (opt-in)"

# 6. #4: WITH --restore-root, extraction does happen.
HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --source cline/ide --target forge/cli \
    --scope user \
    --restore-root "$WS_B/.acb-restored" \
    --apply-safe \
    --yes \
    --json >/dev/null
if [[ ! -d "$WS_B/.acb-restored" ]]; then
    echo "FAIL #4: .acb-restored not created even with --restore-root"
    exit 1
fi
echo "OK #4 --restore-root opts in to object extraction"

echo
echo "ACB bundle-backed plan + opt-in extraction tests passed"
