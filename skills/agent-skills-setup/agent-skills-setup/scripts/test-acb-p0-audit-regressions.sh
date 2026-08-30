#!/usr/bin/env bash
#
# Regression tests for 0.8.22 P0 Audit items:
#   P0-1: Plan target == Executed target, pre-existing target shown as "replace",
#         target_state and previews reflect real destination device.
#   P0-2: Snapshot strict allowlist: excludes generated_memory, session, runtime,
#         and unrequested scopes/types even when files exist on disk.
#   P0-3: Restore always uses bundle as source: when Device B has a local source IDE
#         installed with conflicting content, the bundle content wins.
#   P0-4: Strict handoff whitelist: only reviewed_summary, git_branch, selected_files,
#         and patch survive; drops history, conversation, tokens, oauth_state, cwd, raw.
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

TMP_ROOT="$(mktemp -d /tmp/acb-p0-regressions.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

HOME_A="$TMP_ROOT/home_a"
WS_A="$TMP_ROOT/ws_a"
HOME_B="$TMP_ROOT/home_b"
WS_B="$TMP_ROOT/ws_b"
BUNDLE="$TMP_ROOT/device-a.acb"

mkdir -p "$HOME_A" "$WS_A" "$HOME_B" "$WS_B"

# -----------------------------------------------------------------------------
# Test 1: P0-2 Snapshot strict allowlist
# -----------------------------------------------------------------------------
echo "=== Test 1: P0-2 Snapshot strict allowlist ==="
# Setup Device A with:
# 1. Portable user skill (eligible)
# 2. Forbidden generated memory (~/.cline/data) (must be excluded)
# 3. Project rule (.clinerules)
mkdir -p "$HOME_A/.cline/skills/portable-skill"
cat > "$HOME_A/.cline/skills/portable-skill/SKILL.md" <<'EOF'
---
name: portable-skill
description: A portable skill from Device A
metadata:
  version: "1.0.0"
---
# Portable Skill
EOF

mkdir -p "$HOME_A/.cline/data"
cat > "$HOME_A/.cline/data/generated-state.json" <<'EOF'
{"session_history": "secret conversation", "memory": "forbidden generated memory"}
EOF

cat > "$WS_A/.clinerules" <<'EOF'
# Project Rules
EOF

# Snapshot with scope=user (should include portable-skill, but exclude .cline/data and project rules)
HOME="$(native_path "$HOME_A")" "$WRAPPER" snapshot \
    --workspace "$WS_A" \
    --source cline/ide --target forge/cli \
    --scope user \
    --output "$BUNDLE" \
    --json >/dev/null

python3 - "$BUNDLE" <<'PY'
import json, sys
from pathlib import Path

bundle_root = Path(sys.argv[1])
manifest = json.loads((bundle_root / "manifest.json").read_text())
checksums = json.loads((bundle_root / "checksums.json").read_text())

# Assert generated_memory was NOT collected
for key in checksums.keys():
    assert "generated_memory" not in key, f"forbidden generated_memory leaked into bundle: {key}"
    assert "data" not in key.split("/"), f"forbidden data directory leaked into bundle: {key}"
    assert "session" not in key, f"forbidden session leaked into bundle: {key}"

for obj in manifest.get("objects", []):
    assert obj.get("surface") != "generated_memory", f"manifest contains generated_memory: {obj}"
    assert obj.get("scope") == "user", f"user snapshot contains non-user scope: {obj}"

print("OK P0-2: snapshot excluded forbidden generated_memory and unrequested scopes")
PY

# -----------------------------------------------------------------------------
# Test 2: P0-3 Restore source precedence (bundle wins over Device B local source)
# -----------------------------------------------------------------------------
echo "=== Test 2: P0-3 Bundle wins over Device B local source ==="
# On Device B, also install Cline with DIFFERENT skill content:
mkdir -p "$HOME_B/.cline/skills/portable-skill"
cat > "$HOME_B/.cline/skills/portable-skill/SKILL.md" <<'EOF'
---
name: portable-skill
description: Skill on Device B that should NOT be used during bundle restore
metadata:
  version: "1.0.0"
---
# Device B local content (must NOT overwrite bundle)
EOF

PLAN_OUT="$TMP_ROOT/restore-plan.json"
HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --source cline/ide --target forge/cli \
    --scope user \
    --plan-out "$PLAN_OUT" \
    --apply-safe \
    --yes \
    --json >"$TMP_ROOT/restore_out.json"

TARGET_SKILL="$HOME_B/forge/skills/portable-skill/SKILL.md"
if ! grep -q "Portable Skill from Device A" "$TARGET_SKILL" 2>/dev/null && ! grep -q "A portable skill from Device A" "$TARGET_SKILL" 2>/dev/null; then
    echo "FAIL: restore wrote Device B local content instead of bundle content!"
    cat "$TARGET_SKILL"
    exit 1
fi
echo "OK P0-3: bundle content won over Device B local source"

# -----------------------------------------------------------------------------
# Test 3: P0-1 Plan target == Executed target, pre-existing target shown as replace
# -----------------------------------------------------------------------------
echo "=== Test 3: P0-1 Pre-existing target shown as replace and plan target matches ==="
# Now run restore again when the target ALREADY exists on Device B
PLAN_OUT_2="$TMP_ROOT/restore-plan-replace.json"
HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --source cline/ide --target forge/cli \
    --scope user \
    --plan-out "$PLAN_OUT_2" \
    --plan-only \
    --json >/dev/null

python3 - "$PLAN_OUT_2" "$HOME_B" <<'PY'
import json, sys
from pathlib import Path

plan = json.load(open(sys.argv[1]))
home_b = Path(sys.argv[2]).resolve()

item = [it for it in plan.get("items", []) if it.get("status") == "ready"][0]
target_state = item.get("target_state")
assert target_state is not None and target_state.get("exists") is True, f"target_state should exist: {target_state}"

preview = item.get("review_preview", {})
changes = preview.get("changes", [])
assert changes, f"missing preview changes: {preview}"
for change in changes:
    assert change.get("action") == "replace", f"action for existing target should be replace: {change}"
    existing_sha = change.get("target_sha256") or change.get("pre_sha256")
    assert existing_sha is not None, f"existing target sha should be present for replace: {change}"

target_path = Path(item.get("target", {}).get("resolved_path", "")).resolve()
assert "/tmp/acb-source-stage-" not in str(target_path), f"stage path leaked into plan target: {target_path}"
assert target_path == home_b / "forge/skills" or home_b in target_path.parents, f"target path not rooted in Device B: {target_path} vs {home_b}"

print("OK P0-1: existing target correctly evaluated as replace in reviewed plan")
PY

# -----------------------------------------------------------------------------
# Test 4: P0-4 Strict handoff whitelist serialization
# -----------------------------------------------------------------------------
echo "=== Test 4: P0-4 Strict handoff whitelist ==="
python3 - <<'PY'
import sys
from pathlib import Path

# Add scripts directory
sys.path.insert(0, str(Path("skills/agent-skills-setup/scripts").resolve()))
from migration_core import serialize_portable_handoff

dirty_session = {
    "summary": "Implement feature X",
    "raw": "SECRET_RAW_LOGS",
    "messages": [{"role": "user", "content": "hello"}],
    "history": [{"role": "system", "text": "system log"}],
    "conversation": "raw conversation text",
    "tool_calls": [{"name": "bash", "command": "rm -rf /"}],
    "oauth_state": {"token": "ya29.secret_token"},
    "tokens": 15000,
    "cwd": "/Users/victim/secret/project",
    "git_root": "/Users/victim/secret",
    "approval_state": {"approved": True},
    "session_state": {"active": True},
    "environment": {"AWS_SECRET_KEY": "AKIAEXAMPLE"},
    "selected_files": ["src/main.py", "README.md", "/etc/passwd", "../traversal.py"],
    "patch": "diff --git a/src/main.py b/src/main.py\n..."
}

clean = serialize_portable_handoff(dirty_session, workspace=None)

# Whitelist verification: only reviewed_summary, git_branch, selected_files, patch
allowed_keys = {"reviewed_summary", "git_branch", "selected_files", "patch"}
assert set(clean.keys()) == allowed_keys, f"unexpected keys in handoff: {set(clean.keys()) - allowed_keys}"
assert clean["reviewed_summary"] == "Implement feature X"
assert clean["patch"] is not None
# Absolute paths and traversal filtered from selected_files
assert clean["selected_files"] == ["README.md", "src/main.py"], f"file sanitization failed: {clean['selected_files']}"

print("OK P0-4: strict handoff whitelist successfully dropped all unsafe session fields")
PY

# -----------------------------------------------------------------------------
# Test 5: Replayable Restore Plan with --plan-out, --plan-in, and TOCTOU state guard
# -----------------------------------------------------------------------------
echo "=== Test 5: Replayable Restore Plan with --plan-in and TOCTOU state guard ==="
SAVED_PLAN="$TMP_ROOT/reviewed-replayable-plan.json"
HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --source cline/ide --target forge/cli \
    --scope user \
    --plan-out "$SAVED_PLAN" \
    --plan-only \
    --json >/dev/null

[ -f "$SAVED_PLAN" ] || { echo "FAIL: plan-out did not create plan file"; exit 1; }

# Replay the exact reviewed plan with --plan-in and --yes
HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --plan-in "$SAVED_PLAN" \
    --apply-safe \
    --yes \
    --json >"$TMP_ROOT/replay_applied.json"

grep -q '"stage": "verify"' "$TMP_ROOT/replay_applied.json" || {
    echo "FAIL: replay with --plan-in did not succeed:"
    cat "$TMP_ROOT/replay_applied.json"
    exit 1
}
echo "OK Test 5a: reviewed plan successfully replayed via --plan-in"

# Test TOCTOU state guard: modify destination file so expected_target_state mismatches
echo "tampered content" > "$HOME_B/forge/skills/portable-skill/SKILL.md"
if HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --plan-in "$SAVED_PLAN" \
    --apply-safe \
    --yes \
    --json >"$TMP_ROOT/toctou_tampered.json" 2>&1; then
    echo "FAIL: restore --plan-in did not abort when target was modified (TOCTOU violation)!"
    cat "$TMP_ROOT/toctou_tampered.json"
    exit 1
fi
echo "OK Test 5b: TOCTOU state guard rejected tampered target state"

# -----------------------------------------------------------------------------
# Test 6: Sub-object Field-Level Whitelist (config-subobject data minimization)
# -----------------------------------------------------------------------------
echo "=== Test 6: Sub-object Field-Level Whitelist (config-subobject isolation) ==="
HOME_MCP_A="$TMP_ROOT/home_mcp_a"
WS_MCP_A="$TMP_ROOT/ws_mcp_a"
HOME_MCP_B="$TMP_ROOT/home_mcp_b"
WS_MCP_B="$TMP_ROOT/ws_mcp_b"
BUNDLE_MCP="$TMP_ROOT/mcp-subobject.acb"
mkdir -p "$HOME_MCP_A/.augment" "$WS_MCP_A" "$HOME_MCP_B" "$WS_MCP_B"

# Write Augment settings.json with mcpServers AND unrelated/sensitive sibling keys
cat > "$HOME_MCP_A/.augment/settings.json" <<'EOF'
{
  "augment.apiKey": "sk-unrelated-provider-token-123456",
  "telemetry.enabled": true,
  "editor.theme": "dark-plus",
  "org_confidential_policy": "do-not-leak",
  "mcpServers": {
    "weather-server": {
      "command": "python3",
      "args": ["-m", "weather_mcp"]
    }
  }
}
EOF

HOME="$(native_path "$HOME_MCP_A")" "$WRAPPER" snapshot \
    --workspace "$WS_MCP_A" \
    --source augment-code/cli-ide --target cline/ide \
    --scope user \
    --output "$BUNDLE_MCP" \
    --json >/dev/null

python3 - "$BUNDLE_MCP" <<'PY'
import json, sys
from pathlib import Path

bundle_root = Path(sys.argv[1])
objects_dir = bundle_root / "objects"

# Find settings.json in bundle
settings_files = list(objects_dir.rglob("settings.json"))
assert settings_files, f"settings.json not found in bundle objects: {list(objects_dir.rglob('*'))}"
content = settings_files[0].read_text(encoding="utf-8")
parsed = json.loads(content)

# Sibling keys must NOT exist in the bundle
assert "augment.apiKey" not in parsed, "leaked sibling key augment.apiKey in bundle!"
assert "telemetry.enabled" not in parsed, "leaked sibling key telemetry.enabled in bundle!"
assert "org_confidential_policy" not in parsed, "leaked sibling key org_confidential_policy in bundle!"
assert "editor.theme" not in parsed, "leaked sibling key editor.theme in bundle!"

# Only mcpServers should be present
assert "mcpServers" in parsed, f"mcpServers missing from subobject export: {parsed}"
assert "weather-server" in parsed["mcpServers"], f"weather-server missing: {parsed}"
print("OK Test 6: config-subobject exported ONLY mcpServers slice without sibling config leakage")
PY

# -----------------------------------------------------------------------------
# Test 6b: Shared-settings MCP files are subobject-extracted even when the
# registry marks them storage=file (clawscan 0.8.30: "may copy more of a
# local settings file than the skill promises").
# -----------------------------------------------------------------------------
echo "=== Test 6b: storage=file shared settings get subobject extraction ==="
HOME_GEMINI="$TMP_ROOT/home_gemini"
WS_GEMINI="$TMP_ROOT/ws_gemini"
BUNDLE_GEMINI="$TMP_ROOT/gemini-subobject.acb"
mkdir -p "$HOME_GEMINI/.gemini" "$WS_GEMINI"

cat > "$HOME_GEMINI/.gemini/settings.json" <<'EOF'
{
  "model": "gemini-2.5-pro",
  "theme": "auto",
  "telemetry": {"enabled": true},
  "organization_internal_flag": "do-not-leak",
  "mcpServers": {
    "fixture-server": {
      "command": "python3",
      "args": ["-m", "fixture_mcp"]
    }
  }
}
EOF

HOME="$(native_path "$HOME_GEMINI")" "$WRAPPER" snapshot \
    --workspace "$WS_GEMINI" \
    --source gemini-cli/cli --target cline/ide \
    --scope user \
    --output "$BUNDLE_GEMINI" \
    --json >/dev/null

python3 - "$BUNDLE_GEMINI" <<'PY'
import json, sys
from pathlib import Path

bundle_root = Path(sys.argv[1])
objects_dir = bundle_root / "objects"

mcp_files = list(objects_dir.rglob("*.json"))
assert mcp_files, f"no MCP object exported from gemini settings: {list(objects_dir.rglob('*'))}"
parsed = json.loads(mcp_files[0].read_text(encoding="utf-8"))

for sibling in ("model", "theme", "telemetry", "organization_internal_flag"):
    assert sibling not in parsed, f"leaked sibling key {sibling!r} from shared settings file"

assert "mcpServers" in parsed or "servers" in parsed, f"MCP servers missing: {parsed}"
servers = parsed.get("mcpServers") or parsed.get("servers")
assert "fixture-server" in servers, f"fixture-server missing: {servers}"
print("OK Test 6b: storage=file gemini settings.json exported ONLY its mcpServers slice")
PY

# -----------------------------------------------------------------------------
# Test 7: Cross-Platform & Windows Path Resolver
# -----------------------------------------------------------------------------
echo "=== Test 7: Cross-Platform and Windows Path Resolver ==="
python3 - <<'PY'
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path("skills/agent-skills-setup/scripts").resolve()))
from migration_core import Registry, _expand_path_vars

fake_home = Path("/fake/home")
saved_env = {}
for var in ("APPDATA", "LOCALAPPDATA", "USERPROFILE", "HOMEPATH"):
    saved_env[var] = os.environ.pop(var, None)

def _assert_tail(res, tail):
    # Separator- and drive-agnostic: on native Windows the fake home
    # resolves against the current drive (C:/fake/home) with backslashes.
    res_posix = Path(res).as_posix().lower()
    assert res_posix.endswith(tail), f"unexpected expansion: {res}"

try:
    # With no environment overrides the vars fall back to the given home.
    appdata_res = _expand_path_vars("%APPDATA%/Code/User/settings.json", fake_home)
    _assert_tail(appdata_res, "fake/home/appdata/roaming/code/user/settings.json")

    userprofile_res = _expand_path_vars("%USERPROFILE%/.cursor/skills", fake_home)
    _assert_tail(userprofile_res, "fake/home/.cursor/skills")

    posix_appdata = _expand_path_vars("$APPDATA/app/config.json", fake_home)
    _assert_tail(posix_appdata, "fake/home/appdata/roaming/app/config.json")
finally:
    for var, value in saved_env.items():
        if value is not None:
            os.environ[var] = value

# When the environment defines APPDATA it wins over the home fallback.
if os.environ.get("APPDATA"):
    env_res = _expand_path_vars("%APPDATA%/x.json", fake_home)
    assert Path(env_res).as_posix().startswith(
        Path(os.environ["APPDATA"]).as_posix()
    ), f"expected real APPDATA to win: {env_res}"

print("OK Test 7: %APPDATA%, %USERPROFILE%, and $APPDATA correctly expanded across platforms")
PY

# -----------------------------------------------------------------------------
# Test 8: Detection Probe Fidelity (Shared Path Classification)
# -----------------------------------------------------------------------------
echo "=== Test 8: Detection Probe Fidelity ==="
python3 - <<'PY'
import sys
from pathlib import Path

sys.path.insert(0, str(Path("skills/agent-skills-setup/scripts").resolve()))
from detect.probes import probe_file_signature, InstallState

fake_tmp = Path("/tmp/fake-probe-test")
fake_tmp.mkdir(parents=True, exist_ok=True)
shared_file = fake_tmp / "AGENTS.md"
shared_file.write_text("# Shared agents")

# Probe against shared file
res = probe_file_signature("generic-ide", "default", [shared_file])
assert res.state == InstallState.COMPATIBILITY_ONLY, f"shared file should be COMPATIBILITY_ONLY, got: {res.state}"

# Probe against product-specific file
specific_file = fake_tmp / ".clinerules"
specific_file.write_text("# Cline rules")
res_specific = probe_file_signature("cline", "ide", [specific_file])
assert res_specific.state in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY), f"specific file state: {res_specific.state}"

print("OK Test 8: probe correctly classified shared paths as compatibility-only")
PY

echo
echo "All P0 Audit regression tests PASSED"
