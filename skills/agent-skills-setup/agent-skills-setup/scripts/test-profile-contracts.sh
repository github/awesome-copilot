#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

python3 - \
    "$SCRIPT_DIR" \
    "$SKILL_DIR/references/registry-v2.json" \
    "$SKILL_DIR/evals/profile-contracts.json" <<'PY'
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, sys.argv[1])
from migration_core import (
    AUTOMATIC_SURFACE_POLICIES,
    FORMAT_FEATURES,
    Registry,
    emit_instruction,
    emit_mcp_document,
    mcp_adapter,
    parse_instruction,
    parse_mcp_document,
    preflight_skill_source,
)

registry = Registry(Path(sys.argv[2]), Path("/tmp/profile-workspace"), Path("/tmp/profile-home"))
contracts = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))
assert contracts["schema_version"] == 1
assert set(contracts["fixture_classes"]) == {
    "minimal-valid",
    "complete-valid",
    "legacy-version",
    "invalid",
    "literal-secret",
    "alias-conflict",
}

actual = {}
for product_id, product in registry.products.items():
    for profile_id in product.get("profiles", {}):
        selector = f"{product_id}/{profile_id}"
        _, _, profile = registry.profile(selector)
        if profile.get("support_level") != "partial":
            continue
        surfaces = {}
        for object_type, entries in profile.get("surfaces", {}).items():
            formats = []
            for entry in entries:
                if entry["policy"] not in AUTOMATIC_SURFACE_POLICIES:
                    continue
                source_format = entry.get("format", "unknown")
                if object_type == "mcp" and not mcp_adapter(source_format)["automatic"]:
                    continue
                formats.append(source_format)
            if formats:
                surfaces[object_type] = sorted(set(formats))
        actual[selector] = surfaces

assert actual == contracts["profiles"], (
    "profile fixture contract drift:\n"
    + json.dumps({"expected": contracts["profiles"], "actual": actual}, indent=2)
)

instruction_fixtures = {
    "agents-md": "# Review\n\nReview every external input.\n",
    "amazon-q-rule": "# Review\n\nReview every external input.\n",
    "plain-markdown": "# Review\n\nReview every external input.\n",
    "augment-rule": (
        "---\ntype: agent_requested\ndescription: Review input boundaries\n---\nReview.\n"
    ),
    "cline-rule": "---\npaths:\n  - 'src/**/*.ts'\n---\nReview.\n",
    "claude-rule": "---\npaths: ['src/**/*.ts']\n---\nReview.\n",
    "cursor-mdc": (
        "---\ndescription: Review TypeScript\nglobs: 'src/**/*.ts'\n"
        "alwaysApply: false # native boolean\n---\nReview.\n"
    ),
    "continue-rule": (
        "---\nname: TypeScript review\ndescription: Review TypeScript\n"
        "globs: ['src/**/*.ts']\nalwaysApply: false\n---\nReview.\n"
    ),
    "kiro-steering": (
        "---\ninclusion: fileMatch\nfileMatchPattern: 'src/**/*.ts'\n---\n"
        "#[[file:SECURITY.md]]\nReview.\n"
    ),
    "copilot-instructions": (
        "---\napplyTo: 'src/**/*.ts,tests/**/*.ts'\n---\nReview.\n"
    ),
    "windsurf-rule": (
        "---\ntrigger: glob\nglobs: 'src/**/*.ts,tests/**/*.ts'\n---\nReview.\n"
    ),
    "trae-rule": "# Review\n\nReview every external input.\n",
    "qoder-rule": "# Review\n\nReview every external input.\n",
}
assert set(instruction_fixtures) == set(FORMAT_FEATURES)

native_markers = {
    "augment-rule": "type:",
    "cline-rule": "paths:",
    "claude-rule": "paths:",
    "cursor-mdc": "alwaysApply:",
    "continue-rule": "alwaysApply:",
    "kiro-steering": "inclusion:",
    "copilot-instructions": "applyTo:",
    "windsurf-rule": "trigger:",
}
for source_format, fixture in instruction_fixtures.items():
    instruction = parse_instruction(fixture, source_format)
    rendered, report = emit_instruction(instruction, source_format)
    reparsed = parse_instruction(rendered, source_format)
    assert "Review" in rendered
    assert reparsed.activation == instruction.activation
    assert reparsed.globs == instruction.globs
    assert reparsed.imports == instruction.imports
    assert report.lossy is False
    if source_format in {"agents-md", "amazon-q-rule", "plain-markdown", "trae-rule", "qoder-rule"}:
        assert not rendered.startswith("---")
    else:
        assert native_markers[source_format] in rendered

conditional = parse_instruction(instruction_fixtures["cline-rule"], "cline-rule")
try:
    emit_instruction(conditional, "agents-md")
except ValueError as error:
    assert "cannot safely represent glob activation" in str(error)
else:
    raise AssertionError("conditional native rule was silently flattened")

unknown = parse_instruction(
    "---\ndescription: Review\nglobs: ''\nalwaysApply: false\nfutureField: value\n---\nReview.\n",
    "cursor-mdc",
)
_, unknown_report = emit_instruction(unknown, "cursor-mdc")
assert {item.field for item in unknown_report.items} == {"futureField"}

for profile in actual.values():
    for source_format in profile.get("instructions", []):
        assert source_format in instruction_fixtures
    for source_format in profile.get("mcp", []):
        minimal = '{"mcpServers":{"demo":{"command":"demo"}}}'
        if source_format == "json:mcp":
            minimal = '{"mcp":{"demo":{"command":"demo"}}}'
        servers = parse_mcp_document(minimal, source_format)
        rendered, _ = emit_mcp_document(servers, source_format)
        assert parse_mcp_document(rendered, source_format)

complete = parse_mcp_document(
    '{"mcpServers":{"local":{"command":"demo","args":["--token","literal-secret"],"env":{"API_TOKEN":"literal-secret","MODE":"safe"},"autoApprove":["unsafe-tool"]}}}',
    "json:mcpServers",
)
rendered, report = emit_mcp_document(complete, "json:mcpServers")
assert report.lossy is True
assert "literal-secret" not in rendered
assert '"MODE": "safe"' in rendered
assert "autoApprove" not in rendered
assert any(item.field == "local.autoApprove" for item in report.items)

remote = parse_mcp_document(
    '{"mcpServers":{"remote":{"type":"sse","url":"https://example.test/mcp"}}}',
    "json:mcpServers",
)
try:
    emit_mcp_document(remote, "json:mcpServers")
except ValueError as error:
    assert "target-profile transport adapter" in str(error)
else:
    raise AssertionError("remote MCP used an unreviewed generic transport adapter")

for invalid in (
    '{"mcpServers":{"bad":{"args":[1]}}}',
    '{"mcpServers":{"bad":{}}}',
    '{"mcpServers":{"bad":{"command":"demo","url":"https://example.test"}}}',
    '{"mcpServers":{},"servers":{}}',
    '{"unknown":{}}',
):
    try:
        parse_mcp_document(invalid, "json:mcpServers")
    except ValueError:
        pass
    else:
        raise AssertionError("invalid or alias-conflicting MCP fixture was accepted")

try:
    parse_mcp_document(
        '{"mcpServers":{"demo":{"command":"demo"}}}',
        "json:servers",
    )
except ValueError as error:
    assert "requires root key servers" in str(error)
else:
    raise AssertionError("profile-specific MCP root key was not enforced")

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    valid = root / "valid"
    valid.mkdir()
    (valid / "SKILL.md").write_text(
        "---\nname: valid\ndescription: Valid fixture.\nmetadata:\n  version: '1'\n---\n",
        encoding="utf-8",
    )
    preflight_skill_source(valid)
    invalid = root / "invalid"
    invalid.mkdir()
    (invalid / "SKILL.md").write_text("# Missing metadata\n", encoding="utf-8")
    try:
        preflight_skill_source(invalid)
    except ValueError as error:
        assert "missing frontmatter" in str(error)
    else:
        raise AssertionError("invalid Skill fixture was accepted")

assert not any(
    profile.get("support_level") == "full"
    for product in registry.products.values()
    for profile in product.get("profiles", {}).values()
)
PY

echo "Profile adapter contract tests passed"
