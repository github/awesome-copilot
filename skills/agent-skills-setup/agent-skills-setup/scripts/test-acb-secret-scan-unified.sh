#!/usr/bin/env bash
#
# Audit #6 / #7 regression tests:
#   #6  Every ACB object is scanned by the SAME generic scanner
#       (skill_secret_scanner.finding_reason) used for Skills, catching
#       password=, client_secret:, DATABASE_URL userinfo, Bearer tokens, etc.
#   #7  verify_bundle re-scans objects/ at verify time and re-enforces the
#       resource safety limits (file count, per-file size, total size, depth).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_ROOT="$(mktemp -d /tmp/acb-secret-scan.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

python3 - "$SCRIPT_DIR" "$TMP_ROOT" <<'PY'
import sys
from pathlib import Path

sys.path.insert(0, sys.argv[1])
from acb.bundle import (
    ACB_SCHEMA_VERSION,
    ACBManifest,
    write_bundle,
    verify_bundle,
    scan_object_bytes,
    ACBSecretLeak,
    make_bundle_id,
)
import skill_secret_scanner

script_dir = Path(sys.argv[1])
tmp = Path(sys.argv[2])


def manifest():
    return ACBManifest(
        schema_version=ACB_SCHEMA_VERSION,
        bundle_id=make_bundle_id(),
        created_at="2026-08-17T00:00:00Z",
        source_platform={"system": "darwin"},
        inventory_summary={},
        objects=[],
    )


def blank():
    return dict(
        bundle_root=tmp / "out.acb",
        manifest=manifest(),
        inventory_rows=[],
        compatibility={},
        requirements={},
        secrets_required=[],
        reauth=[],
        rebuild=[],
        objects_dir_files={},
    )


# --- #6: secret assignment forms caught by the unified scanner -------------
leak_cases = {
    "password=": b'config.toml: password = "' + b"super" + b"secret" + b"password123" + b'"\n',
    "client_secret:": b'{"client_secret": "' + b"abc123" + b"def456" + b"ghi789" + b"jklmno" + b'"}\n',
    "DATABASE_URL userinfo": b"DATABASE_URL=postgres://admin:" + b"s3cr3t" + b"P@ss" + b"@db.host:5432/app\n",
    "redis userinfo": b"redis://:" + b"top" + b"secret" + b"@cache.example:6379/0\n",
    "Bearer token": b"Authorization: Bearer " + b"eyJhbGciOi" + b"JIUzI1NiIsInR5cCI6IkpXVCJ9xxxx" + b"\n",
    "sk- provider": b'api_key="' + b"sk-" + b"1234567890abcdef" + b"1234567890abcd" + b'"\n',
    "private key": b"-----BEGIN " + b"RSA PRIVATE KEY-----\n" + b"MIIEowIBAAKCAQEA0\n" + b"-----END " + b"RSA PRIVATE KEY-----\n",
}

for label, payload in leak_cases.items():
    # (a) scan_object_bytes must raise on raw object bytes
    try:
        scan_object_bytes(payload, f"skills/x/{label}.txt")
    except ACBSecretLeak:
        pass
    else:
        raise SystemExit(f"FAIL #6: scan_object_bytes missed {label}")
    # (b) finding_reason must explain the reason
    reason = skill_secret_scanner.finding_reason(payload)
    assert reason is not None, f"FAIL #6: finding_reason missed {label}"
    print(f"OK #6 [{label}] rejected by unified scanner: {reason}")

# --- #6: benign content must NOT be flagged -------------------------------
benign_cases = {
    "placeholder password": b'password = "your_password_here"\n',
    "env reference": b'token = "${API_TOKEN}"\n',
    "plain prose": b'This skill reminds you to rotate your password every 90 days.\n',
    "allowlisted png": b"\x89PNG\r\n\x1a\n" + b"\x00" * 48,
    "normal json": b'{"name": "demo", "version": "1.0.0", "scope": "user"}\n',
}
for label, payload in benign_cases.items():
    reason = skill_secret_scanner.finding_reason(payload)
    assert reason is None, f"FAIL #6: false positive on {label}: {reason}"
    # scan_object_bytes should also accept (png is allowlisted binary)
    scan_object_bytes(payload, f"skills/x/{label}.txt" if not label.endswith("png") else "skills/x/icon.png")
    print(f"OK #6 [{label}] accepted as safe")

# --- #7: verify_bundle re-scans injected object secrets --------------------
inj = tmp / "secret-injected.acb"
write_bundle(
    bundle_root=inj,
    manifest=manifest(),
    inventory_rows=[],
    compatibility={},
    requirements={},
    secrets_required=[],
    reauth=[],
    rebuild=[],
    objects_dir_files={
        "skills/clean/SKILL.md": b"# Clean\nname: clean\ndescription: demo\n",
    },
)

# Inject a secret-laden object directly into the written bundle and verify.
leak_path = inj / "objects" / "skills" / "leak" / "config.txt"
leak_path.parent.mkdir(parents=True, exist_ok=True)
leak_path.write_bytes(b'password = "' + b"injected" + b"secret" + b'value123"\n')

errors = verify_bundle(inj)
assert any("secret/binary violation in object" in e for e in errors), \
    f"FAIL #7: verify_bundle did not re-scan injected object secret: {errors}"
print("OK #7 verify_bundle re-scanned objects/ and rejected injected secret")

# --- #7: verify_bundle re-enforces resource limits on objects -------------
size_bundle = tmp / "size.acb"
write_bundle(
    bundle_root=size_bundle,
    manifest=manifest(),
    inventory_rows=[],
    compatibility={},
    requirements={},
    secrets_required=[],
    reauth=[],
    rebuild=[],
    objects_dir_files={"skills/big/ok.png": b"\x89PNG\r\n" + b"\x00" * 16},
)
# Inject an oversized allowlisted binary; verify must flag the size limit.
big = size_bundle / "objects" / "skills" / "big" / "huge.png"
big.write_bytes(b"\x89PNG\r\n" + b"\x00" * (10 * 1024 * 1024 + 1024))
errors = verify_bundle(size_bundle)
assert any("object size exceeded limit" in e for e in errors), \
    f"FAIL #7: verify_bundle did not flag oversized object: {errors}"
print("OK #7 verify_bundle re-enforced per-object size limit on tampered object")

print()
print("ACB unified secret scan + verify rescan tests passed")
PY
