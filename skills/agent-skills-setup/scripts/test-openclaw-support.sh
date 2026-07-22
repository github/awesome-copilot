#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_ROOT="$(mktemp -d /tmp/agent-skills-openclaw-test.XXXXXX)"
TEST_HOME="$TMP_ROOT/home"
SOURCE_DIR="$TEST_HOME/.gemini/antigravity/skills"
OPENCLAW_DIR="$TEST_HOME/.openclaw/skills"
WORKSPACE_DIR="$TMP_ROOT/workspace-home"
FAKE_BIN="$TMP_ROOT/bin"
CONFIG_PATH="$TEST_HOME/.openclaw/openclaw.json"
NPM_LOG="$TMP_ROOT/npm.log"
OPENCLAW_LOG="$TMP_ROOT/openclaw.log"
DOWNLOAD_SOURCE="$TMP_ROOT/download-source"
DOWNLOAD_ARCHIVE="$TMP_ROOT/download-cli.tar.gz"
DOWNLOAD_TARGET="$TMP_ROOT/download-target"

cleanup() {
    rm -rf "$TMP_ROOT"
}

trap cleanup EXIT

assert_file_exists() {
    [[ -e "$1" ]] || {
        echo "ASSERT FAIL: expected file to exist: $1" >&2
        exit 1
    }
}

assert_contains() {
    local file_path="$1"
    local pattern="$2"

    grep -Fq "$pattern" "$file_path" || {
        echo "ASSERT FAIL: expected '$pattern' in $file_path" >&2
        exit 1
    }
}

mkdir -p "$SOURCE_DIR/demo" "$FAKE_BIN"

cat > "$SOURCE_DIR/demo/SKILL.md" <<'EOF'
---
name: demo
description: Demo skill for OpenClaw support tests.
metadata: {"openclaw":{"requires":{"bins":["demo-cli"]},"install":[{"kind":"node","package":"demo-cli@1.0.0","bins":["demo-cli"]}]}}
---

# Demo

Test skill.
EOF

mkdir -p "$SOURCE_DIR/download-demo" "$DOWNLOAD_SOURCE"
cat > "$DOWNLOAD_SOURCE/download-cli" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$DOWNLOAD_SOURCE/download-cli"
tar -czf "$DOWNLOAD_ARCHIVE" -C "$DOWNLOAD_SOURCE" download-cli
DOWNLOAD_SHA256="$(shasum -a 256 "$DOWNLOAD_ARCHIVE" | awk '{print $1}')"
cat > "$SOURCE_DIR/download-demo/SKILL.md" <<EOF
---
name: download-demo
description: Demo checksum-verified download installer.
metadata: {"openclaw":{"requires":{"bins":["download-cli"]},"install":[{"kind":"download","url":"file://$DOWNLOAD_ARCHIVE","archive":"tar.gz","targetDir":"$DOWNLOAD_TARGET","bins":["download-cli"],"sha256":"$DOWNLOAD_SHA256"}]}}
---

# Download Demo

Test skill.
EOF

cat > "$FAKE_BIN/npm" <<EOF
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "\$*" >> "$NPM_LOG"
cat > "$FAKE_BIN/demo-cli" <<'SCRIPT'
#!/usr/bin/env bash
exit 0
SCRIPT
chmod +x "$FAKE_BIN/demo-cli"
EOF
chmod +x "$FAKE_BIN/npm"

cat > "$FAKE_BIN/openclaw" <<EOF
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "\$*" >> "$OPENCLAW_LOG"
EOF
chmod +x "$FAKE_BIN/openclaw"

cat > "$FAKE_BIN/clawhub" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exit 0
EOF
chmod +x "$FAKE_BIN/clawhub"

export PATH="$FAKE_BIN:$PATH"

AGENT_SKILLS_SOURCE_DIR="$SOURCE_DIR" \
AGENT_SKILLS_OPENCLAW_DIR="$OPENCLAW_DIR" \
bash "$SCRIPT_DIR/sync-global-skills.sh" --targets openclaw

assert_file_exists "$OPENCLAW_DIR/demo/SKILL.md"

AGENT_SKILLS_SOURCE_DIR="$SOURCE_DIR" \
OPENCLAW_STATE_DIR="$TEST_HOME/.openclaw" \
OPENCLAW_CONFIG_PATH="$CONFIG_PATH" \
bash "$SCRIPT_DIR/auto-configure-openclaw-skills.sh" \
    --yes \
    --skip-openclaw-install \
    --skip-clawhub-install \
    --managed-dir "$OPENCLAW_DIR" \
    --workspace "$WORKSPACE_DIR" \
    --agent home:"$WORKSPACE_DIR" \
    --default-agent home \
    --skills demo,download-demo \
    --env demo:DEMO_TOKEN=123 \
    --api-key-env demo:DEMO_TOKEN

assert_file_exists "$WORKSPACE_DIR/skills/demo/SKILL.md"
assert_file_exists "$CONFIG_PATH"
assert_contains "$CONFIG_PATH" '"workspace": "'$WORKSPACE_DIR'"'
assert_contains "$CONFIG_PATH" '"nodeManager": "npm"'
assert_contains "$CONFIG_PATH" '"DEMO_TOKEN": "123"'
assert_contains "$NPM_LOG" 'install -g demo-cli@1.0.0'
assert_contains "$OPENCLAW_LOG" 'doctor'
assert_file_exists "$DOWNLOAD_TARGET/download-cli"
assert_file_exists "$TEST_HOME/.openclaw/bin/download-cli"

perl -0pi -e 's/"sha256":"[0-9a-f]{64}"/"sha256":"0000000000000000000000000000000000000000000000000000000000000000"/' \
    "$SOURCE_DIR/download-demo/SKILL.md"
rm "$TEST_HOME/.openclaw/bin/download-cli"
if OPENCLAW_STATE_DIR="$TEST_HOME/.openclaw" \
    OPENCLAW_CONFIG_PATH="$CONFIG_PATH" \
    AGENT_SKILLS_SOURCE_DIR="$SOURCE_DIR" \
    bash "$SCRIPT_DIR/auto-configure-openclaw-skills.sh" \
        --yes \
        --skip-openclaw-install \
        --skip-clawhub-install \
        --skip-doctor \
        --managed-dir "$OPENCLAW_DIR" \
        --scope managed \
        --skills download-demo >"$TMP_ROOT/checksum-failure.log" 2>&1; then
    echo "ASSERT FAIL: expected mismatched download checksum to fail" >&2
    exit 1
fi
assert_contains "$TMP_ROOT/checksum-failure.log" 'SHA-256 mismatch for download-demo download'

printf '\nUpdated by test run.\n' >> "$SOURCE_DIR/demo/SKILL.md"

OPENCLAW_STATE_DIR="$TEST_HOME/.openclaw" \
AGENT_SKILLS_SOURCE_DIR="$SOURCE_DIR" \
bash "$SCRIPT_DIR/update-openclaw-skills.sh" \
    --skip-runtime \
    --skip-clawhub \
    --managed-dir "$OPENCLAW_DIR" \
    --workspace "$WORKSPACE_DIR" \
    --skills demo

assert_contains "$OPENCLAW_DIR/demo/SKILL.md" 'Updated by test run.'
assert_contains "$WORKSPACE_DIR/skills/demo/SKILL.md" 'Updated by test run.'

echo "OpenClaw support tests passed"
