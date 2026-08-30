#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL_FILE="$SKILL_ROOT/SKILL.md"

fail() {
    echo "FAIL: $*" >&2
    exit 1
}

[[ $(wc -l < "$SKILL_FILE") -le 100 ]] || \
    fail "SKILL.md must keep its always-loaded workflow to 100 lines or fewer"
[[ $(wc -w < "$SKILL_FILE") -le 600 ]] || \
    fail "SKILL.md must keep its always-loaded workflow to 600 words or fewer"

for reference in \
    references/migration-safety.md \
    references/mcp-migration.md \
    references/object-migration.md \
    references/verification.md; do
    [[ -f "$SKILL_ROOT/$reference" ]] || \
        fail "missing progressively loaded reference: $reference"
    grep -F "$reference" "$SKILL_FILE" >/dev/null || \
        fail "SKILL.md does not state when to load $reference"
done

grep -F 'references/ides/<source>.md' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must route source reads to one IDE reference"
grep -F 'references/ides/<target>.md' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must route target reads to one IDE reference"
grep -F 'Save the plan, review its diff/rebuild manifest' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must retain saved-plan review before apply"
grep -F 'legacy writes are disabled' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must retain the legacy-write boundary"
grep -F 'apply that exact file' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must require replay of the reviewed plan"
grep -F -- '--yes' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must retain the explicit approval gate"
grep -F 'generic migration request authorizes planning only' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must make generic migration requests plan-only"
grep -F 'separate explicit user approval' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must require separate user approval for writes"
grep -F 'explicit `legacy` subcommand' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must require explicit legacy routing"
grep -F 'network access is forbidden' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md must disclose its no-network capability boundary"

echo "Progressive disclosure test passed"
