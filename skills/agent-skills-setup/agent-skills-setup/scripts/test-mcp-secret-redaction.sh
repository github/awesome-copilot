#!/usr/bin/env bash

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIG="$SCRIPT_DIR/legacy-smart-ide-migration.sh"
LEGACY_MIG="$SCRIPT_DIR/legacy-smart-ide-migration.sh"
export AGENT_SKILLS_SETUP_INTERNAL_LEGACY=1

TMP_ROOT="$(mktemp -d /tmp/agent-skills-redact-test.XXXXXX)"
export HOME="$TMP_ROOT/home"
mkdir -p "$HOME"

OUT_FILE="$TMP_ROOT/last.out"
cleanup() { rm -rf "$TMP_ROOT"; }
trap cleanup EXIT

CHECKS=0
FAIL=0
check_pass() { CHECKS=$((CHECKS + 1)); echo "PASS: $1"; }
check_fail() { CHECKS=$((CHECKS + 1)); FAIL=$((FAIL + 1)); echo "FAIL: $1" >&2; }

run() { "$@" > "$OUT_FILE" 2>&1; LAST_RC=$?; }

run_goose_manual_mcp() {
    local label="$1"
    rm -f "$HOME/.cursor/mcp.json"
    run bash "$MIG" --source goose-cli --target cursor --objects mcp --strategy overwrite --yes
    if [[ $LAST_RC -eq 0 && ! -e "$HOME/.cursor/mcp.json" ]] && \
       grep -Fq 'Goose config.yaml uses YAML extensions; automatic MCP migration is unsupported' "$OUT_FILE"; then
        check_pass "$label: Goose YAML MCP fails closed without a JSON target"
    else
        check_fail "$label: Goose YAML MCP boundary was not fail-closed"
    fi
}

assert_valid_json() {
    local f="$1" d="$2"
    if python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$f" 2>/dev/null; then
        check_pass "$d (valid JSON)"
    else
        check_fail "$d (invalid JSON): $(cat "$f" 2>/dev/null | head -3)"
    fi
}

assert_json_val() {
    local f="$1" server="$2" keypath="$3" expected="$4" d="$5"
    local got
    got=$(python3 - "$f" "$server" "$keypath" "$expected" <<'PY'
import json, sys
f, server, keypath, expected = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
node = json.load(open(f))["mcpServers"][server]
for part in keypath.split("."):
    node = node[part]
got = "" if node is None else str(node)
print("OK" if got == expected else "MISMATCH got=%r want=%r" % (got, expected))
PY
)
    if [[ "$got" == "OK" ]]; then check_pass "$d"; else check_fail "$d ($got)"; fi
}

echo ""
echo "== 1. JSON -> JSON redaction (claude -> cursor, mcp) =="
S1="$HOME/.claude.json"
cat > "$S1" <<'EOF'
{
  "mcpServers": {
    "secret-env": {
      "command": "npx",
      "env": {
        "API_KEY": "EXAMPLE_API_KEY_VALUE",
        "GITHUB_TOKEN": "EXAMPLE_GITHUB_TOKEN_VALUE",
        "NORMAL_VAR": "just-a-normal-value",
        "DATABASE_URL": "postgres://user:pass@localhost:5432/db"
      }
    },
    "bearer": {
      "url": "https://mcp.example.com/sse",
      "headers": { "Authorization": "Bearer eyJhbGc.secretpart" }
    },
    "urlcred": { "url": "https://user:password@api.example.com/mcp" },
    "querycred": { "url": "https://api.example.com/mcp?key=TOKENABCDEF123456&other=keep" }
  }
}
EOF

run bash "$MIG" --source claude --target cursor --objects mcp --strategy overwrite --yes
assert_valid_json "$HOME/.cursor/mcp.json" "1: destination is valid JSON"
assert_json_val "$HOME/.cursor/mcp.json" secret-env "env.API_KEY" "" "1: API_KEY blanked"
assert_json_val "$HOME/.cursor/mcp.json" secret-env "env.GITHUB_TOKEN" "" "1: GITHUB_TOKEN blanked"
assert_json_val "$HOME/.cursor/mcp.json" secret-env "env.NORMAL_VAR" "just-a-normal-value" "1: NORMAL_VAR preserved"
assert_json_val "$HOME/.cursor/mcp.json" secret-env "env.DATABASE_URL" "" "1: DATABASE_URL (postgres cred) blanked"
assert_json_val "$HOME/.cursor/mcp.json" bearer "headers.Authorization" "" "1: Authorization bearer blanked"
assert_json_val "$HOME/.cursor/mcp.json" bearer "url" "https://mcp.example.com/sse" "1: benign bearer url kept"
assert_json_val "$HOME/.cursor/mcp.json" urlcred "url" "" "1: user:pass@ url blanked"
assert_json_val "$HOME/.cursor/mcp.json" querycred "url" "" "1: ?key= query-string cred blanked"
if grep -Fq "[SECURITY]" "$OUT_FILE"; then check_pass "1: [SECURITY] warning printed when secrets redacted"; else check_fail "1: [SECURITY] warning missing despite redaction"; fi
[[ $LAST_RC -eq 0 ]] && check_pass "1: migration exited rc=0" || check_fail "1: migration exited rc=$LAST_RC (expected 0)"

echo ""
echo "== 2. Honest count: secret-free mcp config -> NO [SECURITY] warning =="
S2="$HOME/.claude.json"
cat > "$S2" <<'EOF'
{ "mcpServers": { "demo-server": { "command": "echo", "args": [] } } }
EOF
run bash "$MIG" --source claude --target cursor --objects mcp --strategy overwrite --yes
assert_valid_json "$HOME/.cursor/mcp.json" "2: destination is valid JSON"
if grep -Fq "demo-server" "$HOME/.cursor/mcp.json"; then check_pass "2: demo-server migrated"; else check_fail "2: demo-server missing"; fi
if grep -Fq "[SECURITY]" "$OUT_FILE"; then check_fail "2: [SECURITY] should NOT print for secret-free config"; else check_pass "2: no false [SECURITY] warning"; fi

echo ""
echo "== 3. Goose YAML MCP is unsupported/fail-closed =="
mkdir -p "$HOME/.config/goose"
cat > "$HOME/.config/goose/config.yaml" <<'EOF'
extensions:
  mcp:
    servers:
      secret-server:
        command: npx
        env:
          API_KEY: "EXAMPLE_API_KEY_VALUE"
          NORMAL_VAR: "keep-this-value"
          DB_URL: "postgres://u:p@localhost/db"
EOF
run_goose_manual_mcp "3"
if grep -Fq 'EXAMPLE_API_KEY_VALUE' "$HOME/.config/goose/config.yaml"; then
    check_pass "3: Goose source YAML remains untouched"
else
    check_fail "3: Goose source YAML was modified"
fi

echo ""
echo "== 4. Default scope excludes mcp (audit hardening) =="
S4="$HOME/.claude.json"
cat > "$S4" <<'EOF'
{ "mcpServers": { "secret-env": { "env": { "API_KEY": "EXAMPLE_API_KEY_VALUE" } } } }
EOF
mkdir -p "$HOME/.claude/skills/demo-skill"
printf '%s\n' '---' 'name: demo-skill' 'description: fixture' '---' > "$HOME/.claude/skills/demo-skill/SKILL.md"

run bash "$MIG" --source claude --target cursor --yes
if [[ -f "$HOME/.cursor/skills/demo-skill/SKILL.md" ]]; then check_pass "4: low-risk skill migrated by default"; else check_fail "4: default migration did not move skills"; fi
if [[ -e "$HOME/.cursor/mcp.json" ]]; then
    if grep -Fq "EXAMPLE_API_KEY_VALUE" "$HOME/.cursor/mcp.json"; then
        check_fail "4: DEFAULT scope copied a live secret (mcp must be opt-in)"
    else
        check_pass "4: secret mcp not copied by default (no live secret present)"
    fi
else
    check_pass "4: secret mcp NOT migrated by default (file absent)"
fi
if grep -Fq "global migrations default to skills" "$OUT_FILE"; then check_pass "4: global default is reported"; else check_fail "4: global default notice missing"; fi

echo ""
echo "== 5. Array secrets: secret-named key with LIST value (JSON path) =="
S5="$HOME/.claude.json"
cat > "$S5" <<'EOF'
{
  "mcpServers": {
    "arr-server": {
      "command": "npx",
      "env": { "NORMAL_VAR": "keep-me" },
      "API_KEYS": ["EXAMPLE_ARRAY_KEY_1", "EXAMPLE_ARRAY_KEY_2"],
      "args": ["--port", "8080", "--token", "EXAMPLE_ARGV_TOKEN", "--api-key=EXAMPLE_EQ_TOKEN"]
    }
  }
}
EOF
run bash "$MIG" --source claude --target cursor --objects mcp --strategy overwrite --yes
assert_valid_json "$HOME/.cursor/mcp.json" "5: destination is valid JSON"
if grep -Fq "EXAMPLE_ARRAY_KEY_1" "$HOME/.cursor/mcp.json"; then check_fail "5: API_KEYS[0] leaked"; else check_pass "5: API_KEYS[0] blanked"; fi
if grep -Fq "EXAMPLE_ARRAY_KEY_2" "$HOME/.cursor/mcp.json"; then check_fail "5: API_KEYS[1] leaked"; else check_pass "5: API_KEYS[1] blanked"; fi
if grep -Fq "EXAMPLE_ARGV_TOKEN" "$HOME/.cursor/mcp.json"; then check_fail "5: --token argv value leaked"; else check_pass "5: --token argv value blanked"; fi
if grep -Fq "EXAMPLE_EQ_TOKEN" "$HOME/.cursor/mcp.json"; then check_fail "5: --api-key=... value leaked"; else check_pass "5: --api-key=... value blanked"; fi
if grep -Fq '"--token"' "$HOME/.cursor/mcp.json"; then check_pass "5: --token flag itself preserved"; else check_fail "5: --token flag lost"; fi
if grep -Fq '"8080"' "$HOME/.cursor/mcp.json"; then check_pass "5: benign argv (8080) preserved"; else check_fail "5: benign argv lost"; fi

echo ""
echo "== 6. Goose YAML arrays remain behind the fail-closed boundary =="
mkdir -p "$HOME/.config/goose"
cat > "$HOME/.config/goose/config.yaml" <<'EOF'
extensions:
  arr:
    command: npx
    api_keys: ["EXAMPLE_YAML_ARR_KEY_1", "EXAMPLE_YAML_ARR_KEY_2"]
    args: ["--token", "EXAMPLE_YAML_ARGV_TOKEN"]
    keep: ["normal-item"]
EOF
run_goose_manual_mcp "6"
if grep -Fq 'EXAMPLE_YAML_ARGV_TOKEN' "$HOME/.config/goose/config.yaml"; then
    check_pass "6: Goose YAML array source remains untouched"
else
    check_fail "6: Goose YAML array source was modified"
fi

echo ""
echo "== 7. Whole-config migration is a manual boundary =="
mkdir -p "$HOME/.claude"
cat > "$HOME/.claude/settings.json" <<'EOF'
{
  "editor.fontSize": 14,
  "apiKey": "EXAMPLE_SETTINGS_API_KEY",
  "telemetry": "off"
}
EOF
run bash "$MIG" --source claude --target openclaw --objects config --strategy overwrite --yes
if [[ ! -e "$HOME/.openclaw/openclaw.json" ]]; then
    check_pass "7: config boundary creates no target file"
else
    check_fail "7: config boundary unexpectedly wrote a target file"
fi
if grep -Fq "automatic whole-IDE config migration is unsupported" "$OUT_FILE"; then check_pass "7: config boundary explains manual review"; else check_fail "7: config boundary message missing"; fi
[[ $LAST_RC -eq 0 ]] && check_pass "7: boundary exits rc=0" || check_fail "7: boundary exited rc=$LAST_RC (expected 0)"

echo ""
echo "== 8. copilot/vscode MCP paths wired (no silent skip) =="
S8="$HOME/.claude.json"
cat > "$S8" <<'EOF'
{ "mcpServers": { "demo-server": { "command": "echo", "args": [], "tools": ["*"] } } }
EOF
run bash "$MIG" --source claude --target copilot --objects mcp --strategy overwrite --yes
if [[ -f "$HOME/.copilot/mcp-config.json" ]] && grep -Fq "demo-server" "$HOME/.copilot/mcp-config.json"; then
    check_pass "8: claude -> copilot mcp migrated to ~/.copilot/mcp-config.json"
else
    check_fail "8: claude -> copilot mcp still skipped"
fi
VSCODE_WORKSPACE="$TMP_ROOT/vscode-workspace"
rm -rf "$VSCODE_WORKSPACE"
mkdir -p "$VSCODE_WORKSPACE"
cp "$S8" "$VSCODE_WORKSPACE/.mcp.json"
run bash "$MIG" --source claude --target vscode --workspace "$VSCODE_WORKSPACE" --objects mcp --scope project --strategy overwrite --yes
VSCODE_MCP="$VSCODE_WORKSPACE/.vscode/mcp.json"
if [[ -f "$VSCODE_MCP" ]]; then
    if python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); assert "demo-server" in d.get("servers", {})' "$VSCODE_MCP" 2>/dev/null; then
        check_pass "8: claude -> vscode mcp under root key servers"
    else
        check_fail "8: vscode mcp.json missing servers.demo-server"
    fi
else
    check_fail "8: claude -> vscode mcp produced no file"
fi

echo ""
echo "== 9. Goose YAML short-secret flags remain behind the fail-closed boundary =="
mkdir -p "$HOME/.config/goose"
cat > "$HOME/.config/goose/config.yaml" <<'EOF'
extensions:
  mcp:
    servers:
      shortflag-inline:
        command: npx
        args: ["-p", "SHORT_P_VAL", "-t", "SHORT_T_VAL", "-k", "SHORT_K_VAL"]
      shortflag-cross:
        command: npx
        args:
          - -p
          - CROSS_P_VAL
          - -t
          - CROSS_T_VAL
EOF
run_goose_manual_mcp "9"

echo ""
echo "== 10. Vector ②: StopIteration crash on quoted-key inline array =="
S10="$HOME/.claude.json"
cat > "$S10" <<'EOF'
{
  "mcpServers": {
    "stopiter-server": {
      "command": "npx",
      "args": ["-p", "STOPITER_PWD", "--token", "STOPITER_TOK", "benign-arg"]
    }
  }
}
EOF
run bash "$MIG" --source claude --target cursor --objects mcp --strategy overwrite --yes
assert_valid_json "$HOME/.cursor/mcp.json" "10: destination valid JSON after line redaction"
if [[ $LAST_RC -eq 0 ]]; then check_pass "10: migration did NOT crash on quoted-key inline array (rc=0)"; else check_fail "10: migration aborted/crashed on quoted-key inline array (rc=$LAST_RC)"; fi
if grep -Fq "STOPITER_PWD" "$HOME/.cursor/mcp.json"; then check_fail "10: -p value leaked"; else check_pass "10: -p value blanked"; fi
if grep -Fq "STOPITER_TOK" "$HOME/.cursor/mcp.json"; then check_fail "10: --token value leaked"; else check_pass "10: --token value blanked"; fi
if grep -Fq '"benign-arg"' "$HOME/.cursor/mcp.json"; then check_pass "10: benign argv preserved"; else check_fail "10: benign argv lost"; fi

echo ""
echo "== 11. Goose YAML list-item secrets remain behind the fail-closed boundary =="
mkdir -p "$HOME/.config/goose"
cat > "$HOME/.config/goose/config.yaml" <<'EOF'
extensions:
  mcp:
    servers:
      yaml-list-server:
        command: npx
        env:
          - api_key: "secret123"
          - token: "tok-xyz-789"
          - normal_var: "keep-this"
EOF
run_goose_manual_mcp "11"

echo ""
echo "== 12. Goose YAML multi-line args remain behind the fail-closed boundary =="
mkdir -p "$HOME/.config/goose"
cat > "$HOME/.config/goose/config.yaml" <<'EOF'
extensions:
  mcp:
    servers:
      multiline-args-server:
        command: npx
        args:
          - --token
          - TOKVALUE-abcdef123456
          - -p
          - mypassword
          - normal-arg
EOF
run_goose_manual_mcp "12"

echo ""
echo "== 13. Compact config remains behind the manual boundary =="
mkdir -p "$HOME/.claude"
cat > "$HOME/.claude/settings.json" <<'EOF'
{
  "apiKey": "AK_SL", "token": "TOK_SL", "password": "PW_SL",
  "normalField": "keep-this-too",
  "nested": { "secret": "SEC_NESTED" }
}
EOF
run bash "$MIG" --source claude --target openclaw --objects config --strategy overwrite --yes
D13="$HOME/.openclaw/openclaw.json"
if [[ ! -e "$D13" ]]; then
    check_pass "13: compact config boundary creates no target file"
else
    check_fail "13: compact config boundary unexpectedly wrote a target file"
fi
if grep -Fq "automatic whole-IDE config migration is unsupported" "$OUT_FILE"; then check_pass "13: compact config boundary explains manual review"; else check_fail "13: compact config boundary message missing"; fi

echo ""
echo "== 14. Goose YAML keyed secrets remain behind the fail-closed boundary =="
mkdir -p "$HOME/.config/goose"
cat > "$HOME/.config/goose/config.yaml" <<'EOF'
extensions:
  mcp:
    servers:
      keyedline-server:
        command: npx
        token: "tok-xyz-789"
        apiKey: bare-val-42
        timeout: "30s"
EOF
run_goose_manual_mcp "14"

echo ""
echo "== 15. Goose YAML consecutive secret flags remain behind the fail-closed boundary =="
mkdir -p "$HOME/.config/goose"
cat > "$HOME/.config/goose/config.yaml" <<'EOF'
extensions:
  mcp:
    servers:
      consecutive-flags-server:
        command: npx
        args:
          - -p
          - -t
          - CONSEC_SECRET_VAL
          - --verbose
EOF
run_goose_manual_mcp "15"

echo ""
echo "== 16. Review-fix: fail-closed on redaction failure (vector ② hardening) =="
D16_DIR=$(mktemp -d "$TMP_ROOT/failclosed.XXXXXX")
D16="$D16_DIR/copy.json"
printf '{"apiKey": "FAILCLOSED_SECRET"}\n' > "$D16"
chmod 000 "$D16"
if [[ -r "$D16" ]]; then
    # Windows without POSIX semantics ignores permission bits; the
    # unreadable-input fail-closed path cannot be exercised here.
    echo "SKIP: 16 (permission bits not enforced on this host)"
    D16_SKIPPED=1
else
    D16_SKIPPED=0
fi
if [[ "$D16_SKIPPED" == "1" ]]; then
    chmod 644 "$D16" 2>/dev/null || true
else
    set +e
    D16_OUT=$(bash -c '
        eval "$(sed -n "/^REDACTOR_PY=/,/^}/p" "$1")"
        eval "$(sed -n "/^redact_secrets_in_file()/,/^}/p" "$1")"
        redact_secrets_in_file "$2"
    ' _ "$LEGACY_MIG" "$D16" 2>/dev/null)
    D16_RC=$?
    set -e
    if [[ $D16_RC -ne 0 ]]; then check_pass "16: fail-closed returns non-zero rc"; else check_fail "16: fail-closed returned rc=0"; fi
    if [[ "$D16_OUT" == "-1" ]]; then check_pass "16: fail-closed emits -1 sentinel"; else check_fail "16: fail-closed emitted '$D16_OUT' (expected -1)"; fi
    if [[ ! -e "$D16" ]]; then check_pass "16: secret-bearing copy deleted (fail closed)"; else check_fail "16: secret-bearing copy left on disk"; chmod 644 "$D16" 2>/dev/null || true; fi
fi

echo ""
echo "== 17. CR-001: provider-key VALUE formats redacted under non-secret key names =="
S17="$HOME/.claude.json"
cat > "$S17" <<'EOF'
{
  "mcpServers": {
    "provider-vals": {
      "command": "npx",
      "env": {
        "MY_KEY": "sk-ant-abcdefghijklmnopqrstuvw",
        "WEBHOOK_URL": "xoxb-1234567890-abcdefghij",
        "NORMAL_VAR": "keep-this-value"
      }
    }
  }
}
EOF
run bash "$MIG" --source claude --target cursor --objects mcp --strategy overwrite --yes
assert_valid_json "$HOME/.cursor/mcp.json" "17: mcp destination is valid JSON"
if grep -Fq "sk-ant-abcdefghijklmnopqrstuvw" "$HOME/.cursor/mcp.json"; then check_fail "17: provider value (sk-) under MY_KEY leaked"; else check_pass "17: sk- provider value blanked under non-secret key"; fi
if grep -Fq "xoxb-1234567890-abcdefghij" "$HOME/.cursor/mcp.json"; then check_fail "17: provider value (xoxb) under WEBHOOK_URL leaked"; else check_pass "17: xoxb provider value blanked under non-secret key"; fi
if grep -Fq "keep-this-value" "$HOME/.cursor/mcp.json"; then check_pass "17: non-secret value preserved"; else check_fail "17: non-secret value lost"; fi
[[ $LAST_RC -eq 0 ]] && check_pass "17: mcp migration exited rc=0" || check_fail "17: mcp migration exited rc=$LAST_RC (expected 0)"

mkdir -p "$HOME/.claude"
cat > "$HOME/.claude/settings.json" <<'EOF'
{
  "editor.fontSize": 14,
  "modelKey": "ghp_abcdefghijklmnopqrst",
  "svcAccount": "AKIAIOSFODNN7EXAMPLE",
  "telemetry": "off"
}
EOF
run bash "$MIG" --source claude --target openclaw --objects config --strategy overwrite --yes
D17="$HOME/.openclaw/openclaw.json"
if [[ ! -e "$D17" ]]; then
    check_pass "17: provider-bearing config boundary creates no target file"
else
    check_fail "17: provider-bearing config boundary unexpectedly wrote a target file"
fi
if grep -Fq "automatic whole-IDE config migration is unsupported" "$OUT_FILE"; then check_pass "17: provider-bearing config boundary explains manual review"; else check_fail "17: provider-bearing config boundary message missing"; fi

echo ""
echo "== 18. CR-002: fail-closed when python3 is unavailable (no silent leak) =="
T18_BIN="$(mktemp -d "$TMP_ROOT/no-py.XXXXXX")"
for b in /bin/* /usr/bin/*; do
    bn="$(basename "$b")"
    case "$bn" in python*) continue ;; esac
    ln -s "$b" "$T18_BIN/$bn" 2>/dev/null || true
done
run_no_python3() { PATH="$T18_BIN" "$@" > "$OUT_FILE" 2>&1; LAST_RC=$?; }

S18="$HOME/.claude.json"
cat > "$S18" <<'EOF'
{ "mcpServers": { "leak-test": { "env": { "API_KEY": "sk-ant-TOTALLYSECRETMUSTNOTLEAK" } } } }
EOF
run_no_python3 bash "$MIG" --source claude --target cursor --objects mcp --strategy overwrite --yes
if [[ ! -e "$HOME/.cursor/mcp.json" ]]; then
    check_pass "18a: MCP copy absent (fail-closed removed the un-redacted file)"
else
    if grep -Fq "sk-ant-TOTALLYSECRETMUSTNOTLEAK" "$HOME/.cursor/mcp.json"; then
        check_fail "18a: secret LEAKED despite missing python3"
    else
        check_fail "18a: copy left on disk without secret (should have been deleted)"
    fi
fi
if grep -Fq "[SECURITY]" "$OUT_FILE"; then check_pass "18a: [SECURITY] warning emitted when python3 missing"; else check_fail "18a: [SECURITY] warning missing for no-python3 path"; fi

mkdir -p "$HOME/.claude"
cat > "$HOME/.claude/settings.json" <<'EOF'
{ "apiKey": "sk-ant-CONFIGSECRETMUSTNOTLEAK", "telemetry": "off" }
EOF
run_no_python3 bash "$MIG" --source claude --target openclaw --objects config --strategy overwrite --yes
if [[ ! -e "$HOME/.openclaw/openclaw.json" ]]; then
    check_pass "18b: config boundary creates no file without python3"
else
    check_fail "18b: config boundary unexpectedly wrote a file without python3"
fi

echo ""
echo "== 19. MED-T3: malformed source JSON must not mutate the source =="
S19="$HOME/.claude.json"
printf '{ "mcpServers": ' > "$S19"
ORIG="$(cat "$S19")"
run bash "$MIG" --source claude --target cursor --objects mcp --strategy overwrite --yes
if [[ "$(cat "$S19")" == "$ORIG" ]]; then
    check_pass "19: malformed source config left UNCHANGED (fail-open-safe, recoverable)"
else
    check_fail "19: malformed source config was MUTATED by migration"
fi
if [[ "$LAST_RC" =~ ^[0-9]+$ ]]; then
    check_pass "19: migration returned a clean exit code (rc=$LAST_RC) on malformed input"
else
    check_fail "19: migration produced a non-numeric exit status on malformed input"
fi

echo ""
echo "== 20. Non-canonical MCP source file + safe environment references =="
S20_DIR="$TMP_ROOT/custom-source"
S20="$S20_DIR/cursor-export.json"
W20="$TMP_ROOT/custom-source-workspace"
mkdir -p "$S20_DIR" "$W20"
S20_RESOLVED="$(cd "$S20_DIR" && pwd -P)/$(basename "$S20")"
cat > "$S20" <<'EOF'
{
  "mcpServers": {
    "local-search": {
      "command": "npx",
      "args": ["-y", "@acme/search-mcp"],
      "env": {
        "ACME_API_KEY": "${env:ACME_API_KEY}",
        "UNSUPPORTED_TOKEN": "${UNSUPPORTED_TOKEN}",
        "LITERAL_TOKEN": "__literal_secret_should_blank__",
        "LOG_LEVEL": "info"
      }
    },
    "remote-docs": {
      "url": "https://mcp.acme.example/rpc?api_key=${env:ACME_QUERY_KEY}",
      "headers": {
        "Authorization": "Bearer ${env:ACME_BEARER_TOKEN}",
        "X-Workspace": "acme"
      }
    }
  }
}
EOF
S20_ORIG="$(cat "$S20")"

set +e
# Native Windows Python treats MSYS-style values as relative paths, so the
# explicit file/workspace arguments must cross into the engine natively.
if command -v cygpath >/dev/null 2>&1; then
    W20_ARG="$(cygpath -w "$W20")"; S20_ARG="$(cygpath -w "$S20")"
else
    W20_ARG="$W20"; S20_ARG="$S20"
fi
run bash "$MIG" --source cursor --target opencode --workspace "$W20_ARG" \
    --objects project-mcp --source-mcp-file "$S20_ARG" --dry-run
set -e
if [[ $LAST_RC -eq 0 ]]; then check_pass "20a: custom-source dry-run exits 0"; else check_fail "20a: custom-source dry-run exits rc=$LAST_RC"; fi
# The engine echoes the source path in its native view; under MSYS that is
# a drive-qualified Windows path while S20_RESOLVED is the POSIX view. The
# engine may print either separator, so accept all three spellings.
if command -v cygpath >/dev/null 2>&1; then
    S20_RESOLVED_MIXED="$(cygpath -m "$S20_RESOLVED")"
    S20_RESOLVED_WIN="$(cygpath -w "$S20_RESOLVED")"
else
    S20_RESOLVED_MIXED="$S20_RESOLVED"
    S20_RESOLVED_WIN="$S20_RESOLVED"
fi
if grep -Fq "source: $S20_RESOLVED" "$OUT_FILE" \
    || grep -Fq "source: $S20_RESOLVED_MIXED" "$OUT_FILE" \
    || grep -Fq "source: $S20_RESOLVED_WIN" "$OUT_FILE"; then
    if grep -Fq "validated MCP source" "$OUT_FILE"; then
        check_pass "20a: dry-run reads and validates the selected source file"
    else
        check_fail "20a: dry-run did not validate the selected source file"
    fi
else
    check_fail "20a: dry-run did not consume the selected source file"
fi
if [[ ! -e "$W20/opencode.json" ]]; then check_pass "20a: dry-run leaves target absent"; else check_fail "20a: dry-run wrote target config"; fi

run bash "$MIG" --source cursor --target opencode --workspace "$(cygpath -w "$W20" 2>/dev/null || printf '%s' "$W20")" \
    --objects project-mcp --source-mcp-file "$(cygpath -w "$S20" 2>/dev/null || printf '%s' "$S20")" --strategy overwrite --yes
D20="$W20/opencode.json"
if [[ $LAST_RC -eq 0 ]]; then check_pass "20b: custom-source apply exits 0"; else check_fail "20b: custom-source apply exits rc=$LAST_RC"; fi
if [[ ! -e "$D20" ]]; then
    # Diagnostic evidence for host-specific target resolution failures.
    echo "DIAG 20b: workspace contents:" >&2
    ls -la "$W20" >&2 || true
    echo "DIAG 20b: engine output tail:" >&2
    tail -5 "$OUT_FILE" >&2 || true
fi
assert_valid_json "$D20" "20b: custom-source destination is valid JSON"
S20_CHECK=$(python3 - "$D20" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))["mcp"]
assert d["local-search"]["type"] == "local"
assert d["local-search"]["command"] == ["npx", "-y", "@acme/search-mcp"]
assert d["local-search"]["environment"]["ACME_API_KEY"] == "{env:ACME_API_KEY}"
assert d["local-search"]["environment"]["UNSUPPORTED_TOKEN"] == ""
assert d["local-search"]["environment"]["LITERAL_TOKEN"] == ""
assert d["local-search"]["environment"]["LOG_LEVEL"] == "info"
assert d["remote-docs"]["type"] == "remote"
assert d["remote-docs"]["url"] == "https://mcp.acme.example/rpc?api_key={env:ACME_QUERY_KEY}"
assert d["remote-docs"]["headers"]["Authorization"] == "Bearer {env:ACME_BEARER_TOKEN}"
assert d["remote-docs"]["headers"]["X-Workspace"] == "acme"
print("OK")
PY
)
if [[ "$S20_CHECK" == "OK" ]]; then
    check_pass "20b: conversion preserves safe references and blanks literal credentials"
else
    check_fail "20b: converted MCP semantics are incorrect"
fi
if [[ "$(cat "$S20")" == "$S20_ORIG" ]]; then check_pass "20b: selected source file remains unchanged"; else check_fail "20b: selected source file was mutated"; fi

echo ""
echo "== 21. Explicit MCP source rejects ambiguous or foreign inputs =="
S21="$S20_DIR/foreign-schema.json"
W21="$TMP_ROOT/invalid-source-workspace"
mkdir -p "$W21"
cat > "$S21" <<'EOF'
{ "servers": { "wrong-root": { "command": "echo" } } }
EOF

set +e
run bash "$MIG" --source cursor --target opencode --workspace "$W21" \
    --objects project-mcp --source-mcp-file "$S21" --strategy overwrite --yes
set -e
if [[ $LAST_RC -ne 0 ]] && grep -Fq "failed strict schema validation" "$OUT_FILE"; then
    check_pass "21a: foreign source schema is reported as failed"
else
    check_fail "21a: foreign source schema was accepted"
fi
if [[ ! -e "$W21/opencode.json" ]]; then check_pass "21a: foreign schema leaves target absent"; else check_fail "21a: foreign schema wrote a target"; fi

set +e
run bash "$MIG" --source cursor --target opencode --workspace "$W21" \
    --objects rules --source-mcp-file "$S21" --dry-run
set -e
if [[ $LAST_RC -ne 0 ]] && grep -Fq "requires --objects mcp or project-mcp" "$OUT_FILE"; then
    check_pass "21b: override is rejected outside MCP objects"
else
    check_fail "21b: override was accepted outside MCP objects"
fi

set +e
run bash "$MIG" --source cursor --target opencode --workspace "$W21" \
    --objects mcp --scope both --source-mcp-file "$S21" --dry-run
set -e
if [[ $LAST_RC -ne 0 ]] && grep -Fq "cannot represent both global and project MCP scopes" "$OUT_FILE"; then
    check_pass "21c: override rejects ambiguous both-scope input"
else
    check_fail "21c: override accepted ambiguous both-scope input"
fi

S21_YAML="$S20_DIR/continue.yaml"
cat > "$S21_YAML" <<'EOF'
mcpServers: []
EOF
set +e
run bash "$MIG" --source continue --target opencode --workspace "$W21" \
    --objects project-mcp --source-mcp-file "$S21_YAML" --dry-run
set -e
if [[ $LAST_RC -ne 0 ]] && grep -Fq "accepts JSON or JSONC only" "$OUT_FILE"; then
    check_pass "21d: override rejects YAML/TOML format boundaries explicitly"
else
    check_fail "21d: override did not clearly reject a YAML input"
fi

echo ""
echo "== 22. Explicit-source JSONC parsing and symlink identity safety =="
S22_JSONC="$S20_DIR/cursor-export.jsonc"
cat > "$S22_JSONC" <<'EOF'
{
  // A real JSONC comment.
  "mcpServers": {
    "jsonc-local": {
      "command": "echo",
      "args": ["https://example.test/a/*literal*/", "literal // text /* x */"],
    },
  },
}
EOF
set +e
run bash "$MIG" --source cursor --target opencode --workspace "$W21" \
    --objects project-mcp --source-mcp-file "$S22_JSONC" --dry-run
set -e
if [[ $LAST_RC -eq 0 ]] && grep -Fq "validated MCP source: 1 server entries" "$OUT_FILE"; then
    check_pass "22a: JSONC comments/trailing commas do not corrupt string contents"
else
    check_fail "22a: valid JSONC source was rejected"
fi

W22_LINK="$TMP_ROOT/symlink-source-workspace"
mkdir -p "$W22_LINK"
D22_LINK="$W22_LINK/opencode.json"
cat > "$D22_LINK" <<'EOF'
{ "mcpServers": { "only-copy": { "command": "echo", "args": [] } } }
EOF
S22_LINK="$S20_DIR/link-to-target.json"
ln -s "$D22_LINK" "$S22_LINK"
if [[ ! -L "$S22_LINK" ]]; then
    echo "SKIP: 22b (symlinks unavailable on this host)"
else
    D22_ORIG="$(cat "$D22_LINK")"
    run bash "$MIG" --source cursor --target opencode --workspace "$W22_LINK" \
        --objects project-mcp --source-mcp-file "$S22_LINK" --strategy overwrite --yes
    if grep -Fq "source and target resolve to the same file" "$OUT_FILE"; then check_pass "22b: symlinked self-target is refused"; else check_fail "22b: symlinked self-target was not detected"; fi
    if [[ "$(cat "$D22_LINK")" == "$D22_ORIG" ]]; then check_pass "22b: symlink identity guard preserves the only copy"; else check_fail "22b: symlink identity guard allowed mutation"; fi
fi

echo ""
echo "== 23. Safe-reference URLs cannot hide a second literal credential =="
S23="$S20_DIR/mixed-url.json"
W23="$TMP_ROOT/mixed-url-workspace"
mkdir -p "$W23"
PROVIDER_PREFIX="sk-"
PROVIDER_BODY="ABCDEFGHIJKLMNOPQRSTUV"
cat > "$S23" <<EOF
{
  "mcpServers": {
    "mixed-remote": {
      "url": "https://example.test/mcp?api_key=\${env:SAFE_REF}&note=${PROVIDER_PREFIX}${PROVIDER_BODY}"
    }
  }
}
EOF
set +e
run bash "$MIG" --source cursor --target opencode --workspace "$W23" \
    --objects project-mcp --source-mcp-file "$S23" --strategy overwrite --yes
set -e
if [[ $LAST_RC -ne 0 && ! -e "$W23/opencode.json" ]]; then
    check_pass "23a: mixed-reference MCP URL fails closed with no target"
else
    check_fail "23a: MCP safe-reference exception leaked a second literal credential"
fi

mkdir -p "$HOME/.claude"
cat > "$HOME/.claude/settings.json" <<EOF
{ "webhook": "https://example.test/hook?api_key=\${env:SAFE_REF}&note=${PROVIDER_PREFIX}${PROVIDER_BODY}" }
EOF
run bash "$MIG" --source claude --target openclaw --objects config --strategy overwrite --yes
if [[ ! -e "$HOME/.openclaw/openclaw.json" ]]; then
    check_pass "23b: mixed-reference config remains unwritten at the manual boundary"
else
    check_fail "23b: generic config boundary unexpectedly wrote a target file"
fi

echo ""
echo "== 24. MCP targets reject symlinks before conversion or cleanup =="
S24="$S20_DIR/distinct-source.json"
W24="$TMP_ROOT/symlink-target-workspace"
D24_REAL="$TMP_ROOT/unrelated-config.json"
mkdir -p "$W24"
cat > "$S24" <<'EOF'
{ "mcpServers": { "source-entry": { "command": "echo", "args": [] } } }
EOF
cat > "$D24_REAL" <<'EOF'
{ "sentinel": "must remain unchanged" }
EOF
ln -s "$D24_REAL" "$W24/opencode.json"
if [[ ! -L "$W24/opencode.json" ]]; then
    # Windows without Developer Mode silently degrades ln -s to a copy;
    # the symlink-rejection guarantee is untestable on such hosts.
    echo "SKIP: 24 (symlinks unavailable on this host)"
    rm -f "$W24/opencode.json"
else
    D24_ORIG="$(cat "$D24_REAL")"
    set +e
    run bash "$MIG" --source cursor --target opencode --workspace "$W24" \
        --objects project-mcp --source-mcp-file "$S24" --strategy overwrite --yes
    set -e
fi
if [[ -L "$W24/opencode.json" ]]; then
    if [[ $LAST_RC -ne 0 ]] && grep -Fq "target is a symbolic link" "$OUT_FILE"; then
        check_pass "24: symlinked MCP target is rejected"
    else
        check_fail "24: symlinked MCP target was accepted"
    fi
    if [[ "$(cat "$D24_REAL")" == "$D24_ORIG" ]]; then
        check_pass "24: rejected symlink target and referent remain unchanged"
    else
        check_fail "24: symlink target rejection allowed mutation"
    fi
fi

echo ""
if [[ $FAIL -eq 0 ]]; then
    echo "ALL $CHECKS MCP SECRET-REDACTION CHECKS PASSED"
    exit 0
else
    echo "$FAIL / $CHECKS MCP SECRET-REDACTION CHECKS FAILED" >&2
    exit 1
fi
