#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_FILE="$SCRIPT_DIR/../SKILL.md"

python3 - "$SKILL_FILE" <<'PY'
from pathlib import Path
import re
import sys

skill = Path(sys.argv[1]).read_text(encoding="utf-8")
if not skill.startswith("---\n"):
    raise SystemExit("FAIL: Skill metadata must start with YAML frontmatter")
end = skill.find("\n---\n", 4)
if end < 0:
    raise SystemExit("FAIL: Skill metadata has no closing frontmatter marker")
frontmatter = skill[4:end]

top_level = {
    match.group(1)
    for match in re.finditer(r"(?m)^([A-Za-z0-9-]+):", frontmatter)
}
allowed = {
    "name", "description", "license", "compatibility", "metadata", "allowed-tools"
}
unknown = top_level - allowed
if unknown:
    raise SystemExit(f"FAIL: unknown Agent Skills fields: {sorted(unknown)}")
# A top-level ``permissions:`` field is not part of the Agent Skills spec;
# capability declarations belong under the free-form ``metadata`` map (as
# dotted ``permissions.*`` keys) or in a body section.
if re.search(r"(?m)^permissions:", frontmatter):
    raise SystemExit("FAIL: non-standard permissions frontmatter field must not be declared")
permissions_keys = re.findall(r"(?m)^  (permissions\.[a-z_]+):\s*.+$", frontmatter)
for required_key in (
    "permissions.shell",
    "permissions.env",
    "permissions.file_read",
    "permissions.file_write",
    "permissions.network",
):
    if required_key not in permissions_keys:
        raise SystemExit(f"FAIL: metadata is missing explicit permission key: {required_key}")
if not re.search(r'(?m)^  permissions\.network:\s*"denied"\s*$', frontmatter):
    raise SystemExit('FAIL: permissions.network must be quoted "denied"')
if "## Permissions" not in skill:
    raise SystemExit("FAIL: body must carry an explicit ## Permissions section")

version = re.search(r'(?m)^  version:\s*"([^"]+)"\s*$', frontmatter)
if version is None or version.group(1) != "0.9.2":
    raise SystemExit("FAIL: metadata.version must be the quoted release version (0.9.2)")

compatibility = re.search(r"(?m)^compatibility:\s*(.*)$", frontmatter)
if compatibility is None:
    raise SystemExit("FAIL: compatibility must describe the local capability surface")
compatibility_text = compatibility.group(1).lower()
if "no network" not in compatibility_text or "filesystem" not in compatibility_text:
    raise SystemExit("FAIL: compatibility must mention filesystem access and no network")

description = re.search(r"(?ms)^description:\s*>[-\s]*\n(.*?)(?=\n\S|\Z)", frontmatter)
if description is None:
    raise SystemExit("FAIL: description is missing")
description_text = " ".join(line.strip() for line in description.group(1).splitlines())
for capability in (
    "migrate",
    "restore",
    "Cursor",
    "Claude Code",
    "Skills",
    "MCP",
    "secret redaction",
    "rollback",
):
    if capability.lower() not in description_text.lower():
        raise SystemExit(f"FAIL: description omits capability: {capability}")
for generic in ("copy", "sync"):
    if re.search(rf"\b{re.escape(generic)}\b", description_text, re.IGNORECASE):
        raise SystemExit(f"FAIL: generic trigger word is too broad: {generic}")

print("Skill metadata test passed")
PY
