#!/usr/bin/env bash

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
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

python3 "$SCRIPT_DIR/sync-ide-reference-summaries.py" --check \
    --paths "$SKILL_ROOT/references/ide-paths.json" \
    --references "$SKILL_ROOT/references/ides" \
    --resolver "$SCRIPT_DIR/ide-paths.tsv"

if grep -n '[[:blank:]]$' "$SCRIPT_DIR/ide-paths.tsv" >/dev/null; then
    echo "FAIL: generated resolver contains trailing whitespace" >&2
    exit 1
fi

TMP_HOME="$(mktemp -d /tmp/ide-path-resolver-test.XXXXXX)"
trap 'rm -rf "$TMP_HOME"' EXIT
ACTUAL_PATH="$(HOME="$(native_path "$TMP_HOME")" bash -c 'source "$1"; get_global_path gemini-cli' _ "$SCRIPT_DIR/legacy-smart-ide-migration.sh")"
# The engine echoes $HOME verbatim (a native Windows path under MSYS);
# map it back to the POSIX view before comparing with TMP_HOME.
if command -v cygpath >/dev/null 2>&1; then
    ACTUAL_PATH="$(cygpath -u "$ACTUAL_PATH")"
fi
[[ "$ACTUAL_PATH" == "$TMP_HOME/.gemini/skills" ]] || {
    echo "FAIL: generated resolver did not expand ~/ against HOME" >&2
    exit 1
}

EMPTY_PATH="$(HOME="$(native_path "$TMP_HOME")" bash -c 'source "$1"; get_global_path aider' _ "$SCRIPT_DIR/legacy-smart-ide-migration.sh")"
[[ -z "$EMPTY_PATH" ]] || {
    echo "FAIL: empty generated resolver path must stay unsupported" >&2
    exit 1
}

echo "IDE reference summary generation test passed"
