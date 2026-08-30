#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GENERATOR="$SCRIPT_DIR/sync-ide-reference-summaries.py"
TMP_ROOT="$(mktemp -d /tmp/reference-composition-test.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

mkdir -p "$TMP_ROOT/ides"
printf '%s\n' '{"demo":{"global_skills":"~/.demo"}}' > "$TMP_ROOT/paths.json"
printf '%s\n' '# demo' '- manual note' > "$TMP_ROOT/ides/demo.md"

python3 "$GENERATOR" \
    --paths "$TMP_ROOT/paths.json" \
    --references "$TMP_ROOT/ides" >/dev/null

python3 - "$TMP_ROOT/ides/demo.md" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")
assert "<!-- GENERATED: ide-paths.json summary; do not edit this block -->" in text
assert "| Global skills | `~/.demo` |" in text
assert "- manual note" in text
assert "## Generated path summary" not in text
assert "This table is generated from" not in text
PY

mkdir -p "$TMP_ROOT/empty-ides"
printf '%s\n' '{"empty":{}}' > "$TMP_ROOT/empty-paths.json"
printf '%s\n' '# empty' '- manual note' > "$TMP_ROOT/empty-ides/empty.md"

python3 "$GENERATOR" \
    --paths "$TMP_ROOT/empty-paths.json" \
    --references "$TMP_ROOT/empty-ides" >/dev/null

python3 - "$TMP_ROOT/empty-ides/empty.md" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")
assert "All automatic paths are unsupported." in text
assert "| Object | Documented path |" not in text
assert "- manual note" in text
PY

[[ -f "$SKILL_ROOT/references/mcp-transport.md" ]] || {
    echo "FAIL: missing conditional MCP transport reference" >&2
    exit 1
}
grep -F 'mcp-transport.md' "$SKILL_ROOT/references/mcp-migration.md" >/dev/null || {
    echo "FAIL: MCP migration reference does not route transport-specific work" >&2
    exit 1
}

python3 - "$SKILL_ROOT" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
registry = (root / "references/ide-registry.md").read_text(encoding="utf-8")
shared = root / "references/ides/ui-only-mcp.md"
assert shared.is_file()
assert "[`iflycode`](ides/ui-only-mcp.md)" in registry
assert "[`raccoon-ai`](ides/ui-only-mcp.md)" in registry
assert not (root / "references/ides/iflycode.md").exists()
assert not (root / "references/ides/raccoon-ai.md").exists()

skill = (root / "SKILL.md").read_text(encoding="utf-8")
assert "ide-registry.md" in skill
assert "Resolve both product profiles" in skill
PY

echo "Reference composition test passed"
