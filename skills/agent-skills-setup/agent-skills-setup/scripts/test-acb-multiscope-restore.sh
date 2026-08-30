#!/usr/bin/env bash
#
# Audit #3 regression test: multi-scope (user + project) ACB restore.
# A bundle captured with --scope user,project must restore BOTH a user-scope
# skill (lands under ~) and a project-scope skill (lands under the workspace),
# because the staged source tree serves as both the home and workspace root.
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

TMP_ROOT="$(mktemp -d /tmp/acb-multiscope.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

BUNDLE="$TMP_ROOT/device-a.acb"
HOME_A="$TMP_ROOT/home_device_a"
WS_A="$TMP_ROOT/ws_device_a"
HOME_B="$TMP_ROOT/home_device_b"
WS_B="$TMP_ROOT/ws_device_b"

# User-scope skill (under ~) and project-scope skill (under workspace).
mkdir -p "$HOME_A/.cline/skills/user-skill" "$WS_A/.cline/skills/proj-skill"
mkdir -p "$HOME_B" "$WS_B"

cat > "$HOME_A/.cline/skills/user-skill/SKILL.md" <<'EOF'
---
name: user-skill
description: User-scope skill on Device A
metadata:
  version: "1.0.0"
---
# User Skill
EOF

cat > "$WS_A/.cline/skills/proj-skill/SKILL.md" <<'EOF'
---
name: proj-skill
description: Project-scope skill on Device A
metadata:
  version: "1.0.0"
---
# Project Skill
EOF

# 1. Snapshot BOTH scopes.
HOME="$(native_path "$HOME_A")" "$WRAPPER" snapshot \
    --workspace "$WS_A" \
    --source cline/ide --target forge/cli \
    --scope user,project \
    --output "$BUNDLE" \
    --json >/dev/null
echo "OK Device A multi-scope snapshot generated"

# 2. Restore on clean Device B across both scopes.
HOME="$(native_path "$HOME_B")" "$WRAPPER" restore \
    "$BUNDLE" \
    --workspace "$WS_B" \
    --source cline/ide --target forge/cli \
    --scope user,project \
    --apply-safe \
    --yes \
    --json >"$TMP_ROOT/restore.json"

python3 - "$TMP_ROOT/restore.json" <<'PY'
import json, re, sys
text = open(sys.argv[1]).read()
out = json.loads(re.search(r'\{.*\}', text, re.DOTALL).group(0))
assert out['ok'] is True, out
applied = out.get('summary', {}).get('applied', 0)
assert applied >= 2, f"expected >=2 applied items (user+project), got {applied}: {out['summary']}"
print(f"OK restore applied {applied} item(s) across scopes")
PY

# 3. Both skills landed on the correct TARGET (forge/cli) roots:
#    user-scope -> ~/forge/skills, project-scope -> .forge/skills
USER_TARGET="$HOME_B/forge/skills/user-skill/SKILL.md"
PROJ_TARGET="$WS_B/.forge/skills/proj-skill/SKILL.md"

[[ -f "$USER_TARGET" ]] || { echo "FAIL: user-scope skill not restored under ~/forge/skills"; exit 1; }
[[ -f "$PROJ_TARGET" ]] || { echo "FAIL: project-scope skill not restored under .forge/skills"; exit 1; }
echo "OK user-scope skill restored under ~ and project-scope skill under workspace"

echo
echo "ACB multi-scope restore tests passed"
