#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

python3 - "$SCRIPT_DIR" "$SKILL_DIR/references/registry-v2.json" "$TMP_ROOT" <<'PY'
import json
import sys
from pathlib import Path

sys.path.insert(0, sys.argv[1])
from migration_core import (
    Registry,
    build_plan,
    build_plan_document,
    emit_mcp_document,
    mcp_adapter,
    parse_mcp_document,
)

jsonc = r'''
{
  // a comment outside strings
  "mcpServers": {
    "demo": {
      "command": "demo//literal",
      "args": ["--safe",],
    },
  },
}
'''
servers = parse_mcp_document(jsonc, "jsonc:mcpServers")
assert len(servers) == 1
assert servers[0].command == "demo//literal"
assert servers[0].args == ["--safe"]
rendered_jsonc, _ = emit_mcp_document(servers, "jsonc:servers")
assert set(json.loads(rendered_jsonc)) == {"servers"}

for source_format in (
    "json5:mcpServers",
    "toml:mcp_servers",
    "yaml:mcpServers",
    "xml:mcpServers",
    "lua:mcpServers",
):
    adapter = mcp_adapter(source_format)
    assert adapter["automatic"] is False
    try:
        parse_mcp_document("{}", source_format)
    except ValueError as error:
        assert "dedicated reviewed reconstruction adapter" in str(error)
    else:
        raise AssertionError(f"{source_format} used a generic JSON fallback")

workspace = Path(sys.argv[3]) / "workspace"
home = Path(sys.argv[3]) / "home"
workspace.mkdir()
home.mkdir()
(workspace / ".cline").mkdir()
(workspace / ".cline/skills").mkdir()
(workspace / ".cline/skills/fixture-skill").mkdir()
(workspace / ".cline/skills/fixture-skill/SKILL.md").write_text(
    "---\nname: fixture-skill\ndescription: Test skill\nmetadata:\n  version: '1'\n---\n# fixture\n",
    encoding="utf-8",
)
(workspace / ".cline/rules").mkdir()
(workspace / ".cline/rules/rule.md").write_text(
    "# Rule\n",
    encoding="utf-8",
)
(workspace / ".cline/mcp.json").write_text(
    '{"mcpServers":{"demo":{"command":"demo"}}}\n',
    encoding="utf-8",
)
registry = Registry(Path(sys.argv[2]), workspace, home)

plan, _ = build_plan(
    registry,
    "cline/ide",
    "codex/cli",
    ["mcp"],
    "project",
)
assert plan[0].status == "manual-rebuild"
assert "manual-template" in plan[0].reason
assert plan[0].manual_actions

cloud = build_plan_document(
    registry,
    "cline/ide",
    "trae/ide",
    ["skills", "instructions", "mcp"],
    "project",
)
# trae/ide: skills -> ready, instructions -> manual-rebuild (format mismatch),
# mcp -> manual-rebuild (not mapped)
statuses = {item["status"] for item in cloud["items"]}
assert "ready" in statuses, statuses
assert "manual-rebuild" in statuses, statuses
assert "invalid" not in statuses, statuses
# Rebuild manifest includes manual-rebuild items (may have empty actions for unmapped)
assert len(cloud["rebuild_manifest"]["items"]) >= 1
assert "literal-secret" not in json.dumps(cloud)

(workspace / ".cline/mcp.json").write_text(
    '{"mcpServers":{"remote":{"type":"streamableHttp","url":"https://example.test/mcp","headers":{"Authorization":"Bearer literal-secret"}}}}\n',
    encoding="utf-8",
)
remote = build_plan_document(
    registry,
    "cline/ide",
    "forge/cli",
    ["mcp"],
    "project",
)
assert remote["items"][0]["status"] == "manual-rebuild"
assert "dedicated target-profile transport adapter" in remote["items"][0]["reason"]
assert "literal-secret" not in json.dumps(remote)
PY

echo "MCP adapter and cloud rebuild tests passed"
