#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_ROOT="$(mktemp -d /tmp/agent-skills-migration-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

TEST_HOME="$TMP_ROOT/home"
VALID_SKILL="$TEST_HOME/.agents/skills/demo-skill"
NON_SKILL="$TEST_HOME/.agents/skills/not-a-skill"
PRIVATE_STATE="$TEST_HOME/.codex/sessions"
OUTPUT="$TMP_ROOT/dry-run.txt"

mkdir -p "$VALID_SKILL" "$NON_SKILL" "$PRIVATE_STATE"

printf '%s\n' '---' 'name: demo-skill' 'description: Isolated migration fixture.' '---' > "$VALID_SKILL/SKILL.md"
printf '%s\n' 'must not migrate' > "$NON_SKILL/state.txt"
printf '%s\n' 'private session fixture' > "$PRIVATE_STATE/session.jsonl"

HOME="$TEST_HOME" bash "$SCRIPT_DIR/smart-ide-migration.sh" \
    --source codex \
    --target openclaw \
    --objects skills \
    --dry-run > "$OUTPUT"

grep -Fq "$VALID_SKILL" "$OUTPUT"

if grep -Fq "$NON_SKILL" "$OUTPUT"; then
    echo "FAIL: directory without SKILL.md was treated as a skill" >&2
    exit 1
fi

if grep -Fq "$PRIVATE_STATE" "$OUTPUT"; then
    echo "FAIL: private Codex state was treated as a skill" >&2
    exit 1
fi

grep -Fq '成功迁移 1 个技能' "$OUTPUT"
echo "Smart IDE migration isolation test passed"
