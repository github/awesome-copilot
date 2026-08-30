#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Native Windows Python ignores MSYS-style env values; convert HOME
# fixtures so $HOME resolution sees a real directory on every platform.

# Pin surface resolution to the POSIX layout the fixtures create;
# otherwise windows-latest would resolve $APPDATA-style overrides.
export AGENT_SKILLS_PLATFORM=linux

native_path() {
    if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
TMP_ROOT="$(mktemp -d /tmp/agent-skills-default-scope.XXXXXX)"
TEST_HOME="$TMP_ROOT/home"
WORKSPACE="$TMP_ROOT/workspace"

cleanup() {
    rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

mkdir -p "$TEST_HOME" "$WORKSPACE"

DEFAULT_OUTPUT="$(
    cd "$WORKSPACE"
    HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy \
        --source claude --target codex --dry-run 2>&1
)"
if ! grep -Fq 'migration content: skills' <<<"$DEFAULT_OUTPUT"; then
    echo "FAIL: a global migration without --objects must default to skills only" >&2
    exit 1
fi
if grep -Fq 'migration content: skills,rules' <<<"$DEFAULT_OUTPUT"; then
    echo "FAIL: a global migration unexpectedly included project objects" >&2
    exit 1
fi

if (
    cd "$WORKSPACE"
    HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy \
        --source claude --target codex --objects rules --dry-run
) >"$TMP_ROOT/implicit-workspace.log" 2>&1; then
    echo "FAIL: project-backed objects must require an explicit --workspace" >&2
    exit 1
fi
grep -Fq 'explicit --workspace' "$TMP_ROOT/implicit-workspace.log" || {
    echo "FAIL: missing actionable error for an implicit project workspace" >&2
    exit 1
}

HOME="$(native_path "$TEST_HOME")" bash "$SCRIPT_DIR/smart-ide-migration.sh" legacy \
    --source claude --target codex --workspace "$WORKSPACE" \
    --objects rules --dry-run >/dev/null

echo "Migration default scope test passed"
