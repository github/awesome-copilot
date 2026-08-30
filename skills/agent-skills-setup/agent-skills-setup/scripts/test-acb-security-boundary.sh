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

TMP_ROOT="$(mktemp -d /tmp/acb-security-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

BUNDLE="$TMP_ROOT/valid.acb"
HOME_DIR="$TMP_ROOT/home"
WS_DIR="$TMP_ROOT/ws"
mkdir -p "$HOME_DIR/.cline/skills/test-skill" "$WS_DIR"

cat > "$HOME_DIR/.cline/skills/test-skill/SKILL.md" <<'EOF'
---
name: test-skill
description: Clean test skill
metadata:
  version: "1.0.0"
---
# Clean skill
EOF

# 1. Snapshot a clean bundle
HOME="$(native_path "$HOME_DIR")" "$WRAPPER" snapshot \
    --workspace "$WS_DIR" \
    --source cline/ide --target forge/cli \
    --scope user \
    --output "$BUNDLE" \
    --json >/dev/null

echo "OK clean snapshot generated"

# 2. Verify clean bundle passes
python3 - "$BUNDLE" "$SCRIPT_DIR" <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[2])
from acb.bundle import verify_bundle

errors = verify_bundle(Path(sys.argv[1]))
assert not errors, f"clean bundle should have no errors: {errors}"
print("OK clean bundle verified with 0 errors")
PY

# 3. P0-3: Test closed-world integrity by injecting an extra file into bundle
EXTRA_FILE="$BUNDLE/objects/extra_unlisted_file.txt"
echo "malicious payload" > "$EXTRA_FILE"
python3 - "$BUNDLE" "$SCRIPT_DIR" <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[2])
from acb.bundle import verify_bundle

errors = verify_bundle(Path(sys.argv[1]))
assert any("unexpected extra file" in e for e in errors), f"expected extra file error, got: {errors}"
print("OK verify_bundle detected and rejected extra unlisted file in bundle")
PY
rm -f "$EXTRA_FILE"

# 4. P0-3: Test missing file is rejected
MANIFEST_FILE="$BUNDLE/manifest.json"
MANIFEST_BACKUP="$TMP_ROOT/manifest.bak"
mv "$MANIFEST_FILE" "$MANIFEST_BACKUP"
python3 - "$BUNDLE" "$SCRIPT_DIR" <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[2])
from acb.bundle import verify_bundle

errors = verify_bundle(Path(sys.argv[1]))
assert any("missing file" in e for e in errors), f"expected missing file error, got: {errors}"
print("OK verify_bundle rejected missing expected file")
PY
mv "$MANIFEST_BACKUP" "$MANIFEST_FILE"

# 5. P0-2: Test secret scanning on raw object bytes
python3 - "$TMP_ROOT" "$SCRIPT_DIR" <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[2])
from acb.bundle import (
    ACB_SCHEMA_VERSION,
    ACBManifest,
    write_bundle,
    ACBSecretLeak,
    make_bundle_id,
)

tmp_bundle = Path(sys.argv[1]) / "secret-leak.acb"
manifest = ACBManifest(
    schema_version=ACB_SCHEMA_VERSION,
    bundle_id=make_bundle_id(),
    created_at="2026-08-17T00:00:00Z",
    source_platform={"system": "darwin"},
    inventory_summary={},
    objects=[],
)

# A: Private key in raw bytes
try:
    write_bundle(
        bundle_root=tmp_bundle,
        manifest=manifest,
        inventory_rows=[],
        compatibility={},
        requirements={},
        secrets_required=[],
        reauth=[],
        rebuild=[],
        objects_dir_files={
            "skills/key.pem": b"-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...",
        },
    )
except ACBSecretLeak:
    print("OK write_bundle rejected raw object containing RSA private key")
else:
    raise SystemExit("FAIL: write_bundle accepted private key in raw object")

# B: .env sensitive filename
try:
    write_bundle(
        bundle_root=tmp_bundle,
        manifest=manifest,
        inventory_rows=[],
        compatibility={},
        requirements={},
        secrets_required=[],
        reauth=[],
        rebuild=[],
        objects_dir_files={
            "skills/.env": b"DATABASE_URL=postgres://...",
        },
    )
except ACBSecretLeak:
    print("OK write_bundle rejected .env file in raw objects")
else:
    raise SystemExit("FAIL: write_bundle accepted .env file in raw objects")

# C: Provider credential in raw text
try:
    write_bundle(
        bundle_root=tmp_bundle,
        manifest=manifest,
        inventory_rows=[],
        compatibility={},
        requirements={},
        secrets_required=[],
        reauth=[],
        rebuild=[],
        objects_dir_files={
            "skills/config.json": b'{"api_key": "sk-1234567890abcdef1234567890"}',
        },
    )
except ACBSecretLeak:
    print("OK write_bundle rejected provider API key in raw object bytes")
else:
    raise SystemExit("FAIL: write_bundle accepted provider API key in raw objects")

# D: Executable binary (ELF header)
try:
    write_bundle(
        bundle_root=tmp_bundle,
        manifest=manifest,
        inventory_rows=[],
        compatibility={},
        requirements={},
        secrets_required=[],
        reauth=[],
        rebuild=[],
        objects_dir_files={
            "skills/malicious_bin": b"\x7fELF\x02\x01\x01\x00...",
        },
    )
except ACBSecretLeak:
    print("OK write_bundle rejected executable ELF binary in raw objects")
else:
    raise SystemExit("FAIL: write_bundle accepted executable binary in raw objects")
PY

# 6. P0-7: Test portable inventory contains NO machine-specific paths
python3 - "$BUNDLE" <<'PY'
import json, sys
from pathlib import Path

inv_path = Path(sys.argv[1]) / "inventory.json"
inventory = json.loads(inv_path.read_text(encoding="utf-8"))
for row in inventory.get("rows", []):
    assert "resolved_path" not in row, f"resolved_path leaked into portable bundle: {row}"
    assert "boundary" not in row, f"boundary leaked into portable bundle: {row}"
    assert "git_root" not in row, f"git_root leaked into portable bundle: {row}"
print("OK portable inventory contains no resolved_path or machine-specific leakage")
PY

# 7. P0-6: Test dry-run guarantees zero writes
RESTORE_TARGET="$TMP_ROOT/dry_run_target"
"$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_DIR" \
    --restore-root "$RESTORE_TARGET" \
    --source cline/ide --target forge/cli \
    --scope user \
    --dry-run \
    --json >/dev/null

if [[ -d "$RESTORE_TARGET" ]] && [[ -n "$(ls -A "$RESTORE_TARGET" 2>/dev/null)" ]]; then
    echo "FAIL: restore --dry-run wrote files to $RESTORE_TARGET"
    exit 1
fi
echo "OK restore --dry-run wrote zero files to disk"

echo
echo "ACB security boundary tests passed"
