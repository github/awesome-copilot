#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_PATH="${SCRIPT_DIR}/../references/registry-v2.json"

cd "$SCRIPT_DIR"

python3 - "$REGISTRY_PATH" "$SCRIPT_DIR" <<'PYEOF'
import sys
from pathlib import Path

registry_path = Path(sys.argv[1])
script_dir = Path(sys.argv[2])
sys.path.insert(0, str(registry_path.parent.parent / "scripts"))

from detect.probes import (  # noqa: E402
    InstallState,
    detect_profile,
    probe_binary,
    probe_file_signature,
    probe_app_bundle,
)

# App bundle probe: test bundle ID allowlist rejects injection attempts
res = probe_app_bundle("test", "ide", darwin_bundle_id="com.example.app' || rm -rf /")
assert res.state is InstallState.NOT_DETECTED, res
res = probe_app_bundle("test", "ide", darwin_bundle_id="valid-bundle.id-123")
# Should not crash or inject
print("OK probe_app_bundle rejects invalid bundle ID injection")

# Binary probe: python3 is always available; cline likely is not.
res = probe_binary("cline", "ide", ["cline"])
assert res.state is InstallState.NOT_DETECTED, res
print("OK probe_binary returns not-detected for missing binary")

res = probe_binary("python-mock", "ide", ["python3"], version_command=["python3", "--version"])
assert res.state is InstallState.INSTALLED, res
assert any("binary:" in e for e in res.evidence), res.evidence
print(f"OK probe_binary found python3 with evidence: {res.evidence}")

# File-signature probe: use a guaranteed temporary test fixture.
import tempfile
tmp_home = Path(tempfile.mkdtemp(prefix="detect-probe-test-"))
fixture_file = tmp_home / ".config_fixture"
fixture_file.write_text("dummy", encoding="utf-8")

res = probe_file_signature(
    "test",
    "ide",
    [fixture_file, tmp_home / "__acb_probe_should_not_exist__"],
)
assert res.state is InstallState.INSTALLED, res
print("OK probe_file_signature found fixture file")

# detect_profile convenience wrapper.
res = detect_profile(
    "python-mock",
    "ide",
    binaries=["python3"],
    version_command=["python3", "--version"],
    home=tmp_home,
)
assert res.state is InstallState.INSTALLED, res
print("OK detect_profile composes binary + version probes")

# detect_profile falls back to file-signature when binary missing.
res = detect_profile(
    "fs-only",
    "ide",
    binaries=["this-binary-does-not-exist"],
    file_signatures=[str(fixture_file)],
    home=tmp_home,
)
assert res.state is InstallState.INSTALLED, res
print("OK detect_profile falls back to file signature")

# All probe states are distinct.
states = {s.value for s in InstallState}
assert len(states) == len(InstallState), states
print(f"OK InstallState has {len(InstallState)} distinct values: {sorted(states)}")

print()
print("Detection probe tests passed")
PYEOF