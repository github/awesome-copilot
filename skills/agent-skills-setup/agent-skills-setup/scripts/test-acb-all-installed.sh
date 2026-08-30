#!/usr/bin/env bash
# ==============================================================================
# test-acb-all-installed.sh: E2E tests for --all-installed multi-IDE snapshot,
# multi-target restore, 1:1 manifest binding, and atomic staging.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Native Windows Python ignores MSYS-style env values; convert HOME
# fixtures so Path.home()/os.environ["HOME"] resolution sees a real dir.

# Pin surface resolution to the POSIX layout the fixtures create;
# otherwise windows-latest would resolve $APPDATA-style overrides.
export AGENT_SKILLS_PLATFORM=linux

native_path() {
    if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
WORKSPACE="$(mktemp -d /tmp/acb-all-inst-XXXXXX)"
HOME_SRC="$WORKSPACE/home_src"
WS_SRC="$WORKSPACE/ws_src"
HOME_DST="$WORKSPACE/home_dst"
WS_DST="$WORKSPACE/ws_dst"

mkdir -p "$HOME_SRC" "$WS_SRC" "$HOME_DST" "$WS_DST"
trap 'rm -rf "$WORKSPACE"' EXIT

MIGRATOR="python3 $SCRIPT_DIR/context-migrator.py"
REGISTRY="$SCRIPT_DIR/../references/registry-v2.json"

echo "=== Test 1: Setup multiple simulated source IDEs on Device A ==="
# 1. Cline (user skills + user mcp)
mkdir -p "$HOME_SRC/.cline/skills/cline-helper" "$HOME_SRC/.cline/data/settings"
cat <<'EOF' > "$HOME_SRC/.cline/skills/cline-helper/SKILL.md"
---
name: cline-helper
description: Cline helper skill
---
# Cline Helper
EOF

cat <<'EOF' > "$HOME_SRC/.cline/data/settings/cline_mcp_settings.json"
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  }
}
EOF

# 2. Cursor (user skills + project rules)
mkdir -p "$HOME_SRC/.cursor/skills/cursor-helper" "$WS_SRC/.cursor/rules"
cat <<'EOF' > "$HOME_SRC/.cursor/skills/cursor-helper/SKILL.md"
---
name: cursor-helper
description: Cursor helper skill
---
# Cursor Helper
EOF

cat <<'EOF' > "$WS_SRC/.cursor/rules/lint.mdc"
---
description: lint rule
globs: ["*.py"]
---
Always lint Python code.
EOF

# 3. Claude Code (user skills + project mcp)
mkdir -p "$HOME_SRC/.claude/skills/claude-helper"
cat <<'EOF' > "$HOME_SRC/.claude/skills/claude-helper/SKILL.md"
---
name: claude-helper
description: Claude Code helper skill
---
# Claude Helper
EOF

cat <<'EOF' > "$WS_SRC/.mcp.json"
{
  "mcpServers": {
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git"]
    }
  }
}
EOF

echo "OK source fixtures initialized"

echo "=== Test 2: snapshot --all-installed ==="
BUNDLE="$WORKSPACE/multi-device.acb"
SNAPSHOT_OUT="$(HOME="$(native_path "$HOME_SRC")" $MIGRATOR snapshot \
  --registry "$REGISTRY" \
  --workspace "$WS_SRC" \
  --output "$BUNDLE" \
  --all-installed \
  --scope user,project \
  --json)"

echo "$SNAPSHOT_OUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
assert data.get("objects_captured", 0) >= 3, f"Expected at least 3 captured objects, got: {data}"
print("OK snapshot --all-installed captured objects:", data["objects_captured"])
'

# Verify manifest and closed-world 1:1 file bindings
python3 -c "
import json
from pathlib import Path
bundle = Path(r'''$(native_path "$BUNDLE")''')
manifest = json.loads((bundle / 'manifest.json').read_text())
objects = manifest.get('objects', [])
assert len(objects) >= 3, f'Expected >= 3 manifest objects, got {len(objects)}'

products = {obj.get('product') for obj in objects}
assert 'cline' in products, f'cline missing from manifest products: {products}'
assert 'cursor' in products, f'cursor missing from manifest products: {products}'
assert 'claude' in products, f'claude missing from manifest products: {products}'

for obj in objects:
    files = obj.get('files', [])
    portability = obj.get('portability_mode', 'unknown')
    # Only portable objects (full/lossy) must have files; manual/excluded may have empty
    if portability in ('full', 'lossy'):
        assert len(files) >= 1, f'Portable object {obj} missing files array'
    for f in files:
        disk_file = bundle / f['path']
        assert disk_file.is_file(), f'Declared file missing: {disk_file}'

print('OK manifest 1:1 file binding verified across products:', sorted(products))
"

echo "=== Test 3: bundle-verify on multi-product bundle ==="
VERIFY_OUT="$($MIGRATOR bundle-verify "$BUNDLE" --json)"
echo "$VERIFY_OUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
assert data.get("errors") == [], data
print("OK bundle-verify clean for multi-product bundle")
'

echo "=== Test 4: doctor requirements inspection ==="
DOCTOR_OUT="$($MIGRATOR doctor "$BUNDLE" --json)"
ACB_BUNDLE="$(native_path "$BUNDLE")" python3 - "$DOCTOR_OUT" <<'PY'
import json, os, sys
from pathlib import Path
data = json.loads(sys.argv[1])
assert data.get("ok") is True, data
bundle = Path(os.environ["ACB_BUNDLE"])
reqs = json.loads((bundle / 'requirements.json').read_text())
executables = reqs.get("executables", [])
packages = reqs.get("packages", [])

# Verify IDE names are not mistaken for executables
assert "cursor" not in executables, f"cursor should not be in executables: {executables}"
assert "cline" not in executables, f"cline should not be in executables: {executables}"

# Verify real command runners and packages are present
# Only Cline user MCP (with filesystem server) matches a registry surface
pkg_names = [p.get("name") for p in packages]
assert any("@modelcontextprotocol/server-filesystem" in p for p in pkg_names), f"Missing filesystem package: {packages}"
# npx should be in executables
assert "npx" in executables, f"npx should be in executables: {executables}"
print("OK doctor requirements accurately parsed command runners and packages:", pkg_names)
PY

echo "=== Test 5: restore --all-installed onto Device B ==="
# Setup Device B with simulated installed IDEs: Windsurf and Forge
mkdir -p "$HOME_DST/.codeium/windsurf/skills" "$HOME_DST/forge/skills" "$WS_DST/.cursor/rules"

RESTORE_OUT="$(HOME="$(native_path "$HOME_DST")" $MIGRATOR restore \
  "$BUNDLE" \
  --registry "$REGISTRY" \
  --workspace "$WS_DST" \
  --all-installed \
  --scope user,project \
  --apply-safe \
  --yes \
  --json)"

echo "$RESTORE_OUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
summary = data.get("summary", {})
assert summary.get("applied", 0) >= 1, f"Expected applied >= 1, got {summary}"
print("OK restore --all-installed applied summary:", summary)
'

echo "=== Test 6: Verify restored files on Device B (P0-1: all sources restored) ==="
# Check skills landed in destination IDEs
find "$HOME_DST" -type f | sort
python3 -c "
from pathlib import Path
home_dst = Path(r'''$(native_path "$HOME_DST")''')
ws_dst = Path(r'''$(native_path "$WS_DST")''')

# Check skill restoration: ensure skills from ALL sources landed (no silent drops)
found_skills = [str(s.name) for s in home_dst.rglob('SKILL.md')]
assert len(found_skills) >= 3, f'Expected skills from multiple sources, got {found_skills}'
skill_dirs = {s.parent.name for s in home_dst.rglob('SKILL.md')}
assert 'cline-helper' in skill_dirs, f'Missing cline-helper in {skill_dirs}'
assert 'cursor-helper' in skill_dirs, f'Missing cursor-helper in {skill_dirs}'
assert 'claude-helper' in skill_dirs, f'Missing claude-helper in {skill_dirs}'
print('OK P0-1 verified: all three source skills landed without collision loss:', sorted(skill_dirs))
"

echo "=== Test 7: Compatibility Matrix Non-Empty (P1-2) ==="
python3 -c "
import json
from pathlib import Path
bundle = Path(r'''$(native_path "$BUNDLE")''')
compat = json.loads((bundle / 'compatibility.json').read_text(encoding='utf-8'))
pairs = compat.get('pairs', [])
assert len(pairs) > 0, f'Expected non-empty compatibility pairs, got {compat}'
print(f'OK P1-2 verified: compatibility matrix contains {len(pairs)} bidirectional-reviewed pairs')
"

echo "=== Test 8: Ed25519 Keygen, Sign, and Verify (P1-6) ==="
PRIV_KEY="$WORKSPACE/test_key.priv"
PUB_KEY="$WORKSPACE/test_key.pub"

if python3 -c "import cryptography" 2>/dev/null; then
  # 8a: Keygen
  $MIGRATOR bundle-keygen --out-private "$PRIV_KEY" --out-public "$PUB_KEY" --json
  [[ -f "$PRIV_KEY" ]] || { echo "FAIL: private key not generated"; exit 1; }
  [[ -f "$PUB_KEY" ]] || { echo "FAIL: public key not generated"; exit 1; }

  # 8b: Sign
  SIGN_OUT="$($MIGRATOR bundle-sign "$BUNDLE" --key "$PRIV_KEY" --signer "test-signer" --json)"
  echo "$SIGN_OUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
print("OK bundle-sign emitted valid signature")
'

  # 8c: Verify with trusted key
  VERIFY_OUT="$($MIGRATOR bundle-verify "$BUNDLE" --trusted-key "$PUB_KEY" --json)"
  echo "$VERIFY_OUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
assert data.get("signature_verified") is True, data
print("OK bundle-verify successfully verified Ed25519 signature with trusted public key")
'
else
  echo "SKIP: cryptography library not installed in this environment; skipping live Ed25519 signing test"
fi

echo "=== Test 9: Atomic bundle creation rollback on failure (P1-7) ==="
# Create a valid pre-existing bundle
EXISTING_BUNDLE="$WORKSPACE/existing.acb"
HOME="$(native_path "$HOME_SRC")" $MIGRATOR snapshot \
  --registry "$REGISTRY" \
  --workspace "$WS_SRC" \
  --source cline/ide \
  --output "$EXISTING_BUNDLE" \
  --json >/dev/null

PRE_MTIME=$(stat -f %m "$EXISTING_BUNDLE/manifest.json" 2>/dev/null || stat -c %Y "$EXISTING_BUNDLE/manifest.json")

# Attempt writing a bundle with an injected secret to the same output path
python3 -c "
import sys
from pathlib import Path
sys.path.insert(0, r'''$(native_path "$SCRIPT_DIR")''')
from acb.bundle import write_bundle, ACBManifest, ACBSecretLeak, make_bundle_id

manifest = ACBManifest(
    schema_version=1,
    bundle_id=make_bundle_id(),
    created_at='2026-08-20T00:00:00Z',
    source_platform={'system': 'darwin'},
    inventory_summary={},
    objects=[{'product': 'cline', 'surface': 'skills', 'files': []}],
)

# Object containing private key leak
leak_objects = {'skills/cline/ide/user/key.pem': b'-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...'}
try:
    write_bundle(
        bundle_root=Path(r'''$(native_path "$EXISTING_BUNDLE")'''),
        manifest=manifest,
        inventory_rows=[],
        compatibility={},
        requirements={},
        secrets_required=[],
        reauth=[],
        rebuild=[],
        objects_dir_files=leak_objects,
    )
    raise SystemExit('FAIL: write_bundle did not reject secret')
except ACBSecretLeak:
    print('OK write_bundle rejected secret during atomic staging')
"

# Verify pre-existing bundle was NOT corrupted or wiped
assert_exists() {
    [[ -f "$EXISTING_BUNDLE/manifest.json" ]] || { echo "FAIL: existing manifest.json was destroyed"; exit 1; }
    [[ -f "$EXISTING_BUNDLE/checksums.json" ]] || { echo "FAIL: existing checksums.json was destroyed"; exit 1; }
}
assert_exists
echo "OK atomic staging safely preserved pre-existing bundle on write failure"

echo "=== Test 10: Strict 1:1 Manifest Binding Rejects Duplicate Claimants (P0-2) ==="
python3 -c "
import sys, json
from pathlib import Path
sys.path.insert(0, r'''$(native_path "$SCRIPT_DIR")''')
from acb.bundle import verify_bundle

bundle_path = Path(r'''$(native_path "$BUNDLE")''')
manifest_file = bundle_path / 'manifest.json'
manifest_data = json.loads(manifest_file.read_text(encoding='utf-8'))

# Duplicate a file entry into two distinct objects
objects = manifest_data.get('objects', [])
if len(objects) >= 2 and objects[0].get('files'):
    first_file = objects[0]['files'][0]
    objects[1].setdefault('files', []).append(first_file)
    # Write tampered manifest to a temp copy
    import tempfile, shutil
    tmp_dir = Path(tempfile.mkdtemp())
    try:
        shutil.copytree(bundle_path, tmp_dir / 'bundle')
        (tmp_dir / 'bundle' / 'manifest.json').write_text(json.dumps(manifest_data), encoding='utf-8')
        # Update checksums.json for manifest.json so checksum passes
        from acb.bundle import sha256_file
        ck = json.loads((tmp_dir / 'bundle' / 'checksums.json').read_text(encoding='utf-8'))
        ck['manifest.json'] = sha256_file(tmp_dir / 'bundle' / 'manifest.json')
        (tmp_dir / 'bundle' / 'checksums.json').write_text(json.dumps(ck), encoding='utf-8')

        errors = verify_bundle(tmp_dir / 'bundle')
        assert any('claimed by multiple objects' in e for e in errors), f'Expected duplicate claimant error, got: {errors}'
        print('OK P0-2 verified: verify_bundle successfully rejected manifest with duplicate file claimants')
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
"

echo "=== Test 11: Child-level Skill Conflict Isolation (v0.9.1 regression) ==="
WS_SKILL_SRC="$WORKSPACE/ws_skill_src"
HOME_SKILL_SRC="$WORKSPACE/home_skill_src"
HOME_SKILL_DST="$WORKSPACE/home_skill_dst"
WS_SKILL_DST="$WORKSPACE/ws_skill_dst"
mkdir -p "$WS_SKILL_SRC" "$HOME_SKILL_SRC" "$HOME_SKILL_DST" "$WS_SKILL_DST"

# Source A (Cline): shared-skill (v1) + unique-a
mkdir -p "$HOME_SKILL_SRC/.cline/skills/shared-skill" "$HOME_SKILL_SRC/.cline/skills/unique-a"
cat <<'EOF' > "$HOME_SKILL_SRC/.cline/skills/shared-skill/SKILL.md"
---
name: shared-skill
description: Shared skill version 1 from Cline
---
# Shared Skill V1
EOF
cat <<'EOF' > "$HOME_SKILL_SRC/.cline/skills/unique-a/SKILL.md"
---
name: unique-a
description: Unique A skill from Cline
---
# Unique A
EOF

# Source B (Cursor): conflicting shared-skill (v2) + unique-b
mkdir -p "$HOME_SKILL_SRC/.cursor/skills/shared-skill" "$HOME_SKILL_SRC/.cursor/skills/unique-b"
cat <<'EOF' > "$HOME_SKILL_SRC/.cursor/skills/shared-skill/SKILL.md"
---
name: shared-skill
description: Conflicting shared skill version 2 from Cursor
---
# Shared Skill V2 (Different Hash)
EOF
cat <<'EOF' > "$HOME_SKILL_SRC/.cursor/skills/unique-b/SKILL.md"
---
name: unique-b
description: Unique B skill from Cursor
---
# Unique B
EOF

SKILL_BUNDLE="$WORKSPACE/skill-conflict.acb"
HOME="$(native_path "$HOME_SKILL_SRC")" $MIGRATOR snapshot \
  --registry "$REGISTRY" \
  --workspace "$WS_SKILL_SRC" \
  --output "$SKILL_BUNDLE" \
  --all-installed \
  --scope user \
  --json >/dev/null

# Destination: Cursor installed on Device B
mkdir -p "$HOME_SKILL_DST/.cursor/skills" "$HOME_SKILL_DST/.cursor/rules"

SKILL_RESTORE_OUT="$(HOME="$(native_path "$HOME_SKILL_DST")" $MIGRATOR restore \
  "$SKILL_BUNDLE" \
  --registry "$REGISTRY" \
  --workspace "$WS_SKILL_DST" \
  --all-installed \
  --scope user \
  --apply-safe \
  --yes \
  --json)"

echo "$SKILL_RESTORE_OUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
'

python3 -c "
from pathlib import Path
home_dst = Path(r'''$(native_path "$HOME_SKILL_DST")''')
skills_dir = home_dst / '.cursor' / 'skills'

unique_a = skills_dir / 'unique-a' / 'SKILL.md'
unique_b = skills_dir / 'unique-b' / 'SKILL.md'
shared = skills_dir / 'shared-skill' / 'SKILL.md'

assert unique_a.is_file(), f'unique-a was blocked or not restored: {list(skills_dir.rglob(\"*\"))}'
assert unique_b.is_file(), f'unique-b was blocked or not restored: {list(skills_dir.rglob(\"*\"))}'
assert not shared.is_file(), f'conflicting shared-skill should not have been written'
print('OK v0.9.1 verified: unique sibling skills (unique-a, unique-b) restored cleanly despite shared-skill conflict')
"

echo "=== Test 12: Multi-source MCP Server-Level Merge (v0.9.1 regression) ==="
WS_MCP_SRC="$WORKSPACE/ws_mcp_src"
HOME_MCP_SRC="$WORKSPACE/home_mcp_src"
HOME_MCP_DST="$WORKSPACE/home_mcp_dst"
WS_MCP_DST="$WORKSPACE/ws_mcp_dst"
mkdir -p "$WS_MCP_SRC" "$HOME_MCP_SRC" "$HOME_MCP_DST" "$WS_MCP_DST"

# Source A (Cline user MCP): filesystem (v1) + git
mkdir -p "$HOME_MCP_SRC/.cline/data/settings" "$HOME_MCP_SRC/.cline/skills/dummy"
cat <<'EOF' > "$HOME_MCP_SRC/.cline/skills/dummy/SKILL.md"
---
name: dummy
description: Cline helper test skill for mcp
---
# Dummy Skill
EOF
cat <<'EOF' > "$HOME_MCP_SRC/.cline/data/settings/cline_mcp_settings.json"
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git"]
    }
  }
}
EOF

# Source B (Claude user MCP): linear + git + conflicting filesystem
mkdir -p "$HOME_MCP_SRC/.claude" "$HOME_MCP_SRC/.claude/skills/dummy2"
cat <<'EOF' > "$HOME_MCP_SRC/.claude/skills/dummy2/SKILL.md"
---
name: dummy2
description: Claude helper test skill for mcp
---
# Dummy Skill 2
EOF
cat <<'EOF' > "$HOME_MCP_SRC/.claude.json"
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-linear"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git"]
    },
    "filesystem": {
      "command": "docker",
      "args": ["run", "-i", "mcp/filesystem", "/conflicting/path"]
    }
  }
}
EOF

# Source C (Cursor project MCP): conflicting filesystem (v2)
mkdir -p "$HOME_MCP_SRC/.cursor/skills/dummy3" "$WS_MCP_SRC/.cursor/rules"
cat <<'EOF' > "$HOME_MCP_SRC/.cursor/skills/dummy3/SKILL.md"
---
name: dummy3
description: Cursor helper test skill for mcp
---
# Dummy Skill 3
EOF
cat <<'EOF' > "$WS_MCP_SRC/.cursor/mcp.json"
{
  "mcpServers": {
    "filesystem": {
      "command": "docker",
      "args": ["run", "-i", "mcp/filesystem", "/conflicting/path"]
    }
  }
}
EOF

MCP_BUNDLE="$WORKSPACE/mcp-merge.acb"
HOME="$(native_path "$HOME_MCP_SRC")" $MIGRATOR snapshot \
  --registry "$REGISTRY" \
  --workspace "$WS_MCP_SRC" \
  --output "$MCP_BUNDLE" \
  --all-installed \
  --scope user,project \
  --json >/dev/null

echo "=== MCP BUNDLE MANIFEST ==="
python3 -c "
import json
from pathlib import Path
b = Path(r'''$(native_path "$MCP_BUNDLE")''')
m = json.loads((b / 'manifest.json').read_text())
for o in m['objects']:
    print(' ', o.get('product'), o.get('profile'), o.get('surface'), len(o.get('files', [])))
"

# Destination: Claude Code on Device B (reads user .claude.json and workspace .mcp.json)
mkdir -p "$HOME_MCP_DST/.claude/skills"
touch "$WS_MCP_DST/CLAUDE.md"

MCP_RESTORE_OUT="$(HOME="$(native_path "$HOME_MCP_DST")" $MIGRATOR restore \
  "$MCP_BUNDLE" \
  --registry "$REGISTRY" \
  --workspace "$WS_MCP_DST" \
  --all-installed \
  --scope user,project \
  --apply-safe \
  --yes \
  --json)"

echo "RESTORE OUT: $MCP_RESTORE_OUT"
echo "$MCP_RESTORE_OUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
'

python3 -c "
import json
from pathlib import Path
home_dst = Path(r'''$(native_path "$HOME_MCP_DST")''')
ws_dst = Path(r'''$(native_path "$WS_MCP_DST")''')

print('Files in home_dst:', list(home_dst.rglob('*')))
print('Files in ws_dst:', list(ws_dst.rglob('*')))

claude_json = home_dst / '.claude.json'
ws_mcp = ws_dst / '.mcp.json'

found_servers = {}
if claude_json.is_file():
    data = json.loads(claude_json.read_text(encoding='utf-8'))
    found_servers.update(data.get('mcpServers', {}))
if ws_mcp.is_file():
    data = json.loads(ws_mcp.read_text(encoding='utf-8'))
    found_servers.update(data.get('mcpServers', {}))

print('Restored MCP servers:', list(found_servers.keys()))
assert 'git' in found_servers, f'git server missing: {found_servers}'
assert 'linear' in found_servers, f'linear server missing: {found_servers}'
assert 'filesystem' not in found_servers, f'conflicting filesystem server should not be present: {found_servers}'
print('OK v0.9.1 verified: git deduplicated, linear merged, conflicting filesystem isolated')
"

echo "=== Test 13: Strict Detection Include Flags (v0.9.1 regression) ==="
WS_DETECT="$WORKSPACE/ws_detect"
HOME_DETECT="$WORKSPACE/home_detect"
mkdir -p "$WS_DETECT/.agents/skills/shared-skill" "$HOME_DETECT/.agents/skills/shared-skill"
cat <<'EOF' > "$WS_DETECT/.agents/skills/shared-skill/SKILL.md"
---
name: shared-skill
description: compatibility-only shared skill
---
EOF
cat <<'EOF' > "$HOME_DETECT/.agents/skills/shared-skill/SKILL.md"
---
name: shared-skill
description: compatibility-only shared skill
---
EOF

DETECT_OUT_DEFAULT="$(HOME="$(native_path "$HOME_DETECT")" $MIGRATOR snapshot \
  --registry "$REGISTRY" \
  --workspace "$WS_DETECT" \
  --all-installed \
  --output "$WORKSPACE/compat-default.acb" \
  --json)"

echo "$DETECT_OUT_DEFAULT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
det_status = data.get("summary", {}).get("detection_status", {})
installed = data.get("summary", {}).get("installed_products", [])
assert det_status.get("forge/cli") == "compatibility-only", det_status
assert "forge/cli" not in installed, installed
print("OK v0.9.1 verified: compatibility-only products excluded by default")
'

DETECT_OUT_OPTIN="$(HOME="$(native_path "$HOME_DETECT")" $MIGRATOR snapshot \
  --registry "$REGISTRY" \
  --workspace "$WS_DETECT" \
  --all-installed \
  --include-compatibility \
  --output "$WORKSPACE/compat-optin.acb" \
  --json)"

echo "$DETECT_OUT_OPTIN" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
det_status = data.get("summary", {}).get("detection_status", {})
installed = data.get("summary", {}).get("installed_products", [])
assert det_status.get("forge/cli") == "compatibility-only", det_status
assert "forge/cli" in installed, installed
print("OK v0.9.1 verified: compatibility-only products included when --include-compatibility is provided")
'

echo "=== Test 14: Plugin & Session Handoff Opt-in Flags (v0.9.1 regression) ==="
WS_OPTIN="$WORKSPACE/ws_optin"
mkdir -p "$WS_OPTIN/.factory/plugins/plugin-pkg"
cat <<'EOF' > "$WS_OPTIN/.factory/plugins/plugin-pkg/package.json"
{
  "name": "plugin-pkg",
  "version": "1.0.0"
}
EOF

# Plan with plugins
PLAN_PLUGINS="$WORKSPACE/plan-plugins.json"
$MIGRATOR plan \
  --registry "$REGISTRY" \
  --workspace "$WS_OPTIN" \
  --source factory-droid/cli \
  --target factory-droid/cli \
  --objects plugins \
  --output "$PLAN_PLUGINS" \
  --json >/dev/null

# Apply without --include-plugins should fail
if $MIGRATOR apply "$PLAN_PLUGINS" --registry "$REGISTRY" --yes --json 2>/dev/null; then
  echo "FAIL: apply plugins succeeded without --include-plugins"
  exit 1
fi
echo "OK v0.9.1 verified: apply plugins fails closed without --include-plugins"

# Apply with --include-plugins should succeed
APPLY_OPTIN_OUT="$($MIGRATOR apply "$PLAN_PLUGINS" --registry "$REGISTRY" --include-plugins --yes --json)"
echo "$APPLY_OPTIN_OUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("ok") is True, data
print("OK v0.9.1 verified: apply plugins succeeds with --include-plugins")
'

echo
echo "All all-installed multi-IDE E2E tests PASSED!"
