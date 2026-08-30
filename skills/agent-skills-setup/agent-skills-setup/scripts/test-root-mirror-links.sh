#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MIRROR="$REPO_ROOT/SKILL.md"
TEMP_MIRROR="$(mktemp)"
sha256_of() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | awk '{print $1}'
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$1" | awk '{print $1}'
    else
        python3 -c 'import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())' "$1"
    fi
}
trap 'rm -f "$TEMP_MIRROR"' EXIT
MIRROR_HASH_BEFORE="$(sha256_of "$MIRROR")"

bash "$REPO_ROOT/scripts/sync-root-mirror.sh" --output "$TEMP_MIRROR"

[[ "$(head -n 1 "$TEMP_MIRROR")" == "<!--" ]] || {
    echo "FAIL: generated root pointer must begin with a generated-file comment" >&2
    exit 1
}

if grep -Eq '^name:|^---$' "$TEMP_MIRROR"; then
    echo "FAIL: root pointer must not look like a publishable Skill" >&2
    exit 1
fi

if ! grep -F '](skills/agent-skills-setup/SKILL.md)' "$TEMP_MIRROR" >/dev/null; then
    echo "FAIL: generated pointer does not link to the canonical Skill" >&2
    exit 1
fi

[[ "$MIRROR_HASH_BEFORE" == "$(sha256_of "$MIRROR")" ]] || {
    echo "FAIL: pointer test changed the checked-in root file" >&2
    exit 1
}

echo "Root non-Skill pointer test passed"
