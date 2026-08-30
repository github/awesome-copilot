#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_PATH="${SCRIPT_DIR}/../references/registry-v2.json"

WS="$(mktemp -d /tmp/partial-safe-apply-ws.XXXXXX)"
HOME_DIR="$(mktemp -d /tmp/partial-safe-apply-home.XXXXXX)"
trap 'rm -rf "$WS" "$HOME_DIR"' EXIT

cd "$SCRIPT_DIR"

python3 - "$REGISTRY_PATH" "$WS" "$HOME_DIR" <<'PYEOF'
import json
import sys
from pathlib import Path

registry_path = Path(sys.argv[1])
workspace = Path(sys.argv[2])
home = Path(sys.argv[3])
sys.path.insert(0, str(registry_path.parent.parent / "scripts"))

from migration_core import (  # noqa: E402
    ItemStatus,
    PlanItem,
    Registry,
    SurfacePath,
    apply_plan,
    normalize_status,
)

# Build a fixture plan covering every status state.
plan = [
    PlanItem(
        object_type="skills",
        status=ItemStatus.READY.value,
        reason="ready fixture",
        source=SurfacePath(
            product="cline",
            profile="ide",
            object_type="skills",
            scope="user",
            storage="directory",
            path="~/.cline/skills",
            resolved_path=home / ".cline" / "skills",
            boundary=home,
            source_format="agent-skill",
            policy="validate-then-atomic-copy",
            location_role="canonical",
            canonical_path="~/.cline/skills",
            precedence=0,
        ),
        target=SurfacePath(
            product="cursor",
            profile="ide",
            object_type="skills",
            scope="user",
            storage="directory",
            path="~/.cursor/skills",
            resolved_path=home / ".cursor" / "skills",
            boundary=home,
            source_format="agent-skill",
            policy="validate-then-atomic-copy",
            location_role="canonical",
            canonical_path="~/.cursor/skills",
            precedence=0,
        ),
    ),
    PlanItem(
        object_type="hooks",
        status=ItemStatus.DRAFT_DISABLED.value,
        reason="hooks are draft-only",
        source=SurfacePath(
            product="cline",
            profile="ide",
            object_type="hooks",
            scope="user",
            storage="directory",
            path="~/.cline/hooks",
            resolved_path=home / ".cline" / "hooks",
            boundary=home,
            source_format="cline-hook",
            policy="disabled-draft-only",
            location_role="canonical",
            canonical_path="~/.cline/hooks",
            precedence=0,
        ),
        target=SurfacePath(
            product="cursor",
            profile="ide",
            object_type="hooks",
            scope="user",
            storage="directory",
            path="~/.cursor/hooks",
            resolved_path=home / ".cursor" / "hooks",
            boundary=home,
            source_format="cursor-hook",
            policy="disabled-draft-only",
            location_role="canonical",
            canonical_path="~/.cursor/hooks",
            precedence=0,
        ),
    ),
    PlanItem(
        object_type="mcp",
        status=ItemStatus.MANUAL_REBUILD.value,
        reason="OAuth MCP requires re-auth on target",
        source=SurfacePath(
            product="cline",
            profile="ide",
            object_type="mcp",
            scope="user",
            storage="file",
            path="~/.cline/data/settings/cline_mcp_settings.json",
            resolved_path=home / ".cline" / "mcp.json",
            boundary=home,
            source_format="json:mcpServers",
            policy="profile-version-adapter",
            location_role="canonical",
            canonical_path="~/.cline/mcp.json",
            precedence=0,
        ),
        target=SurfacePath(
            product="cursor",
            profile="ide",
            object_type="mcp",
            scope="user",
            storage="file",
            path="~/.cursor/mcp.json",
            resolved_path=home / ".cursor" / "mcp.json",
            boundary=home,
            source_format="json:mcpServers",
            policy="profile-version-adapter",
            location_role="canonical",
            canonical_path="~/.cursor/mcp.json",
            precedence=0,
        ),
    ),
    PlanItem(
        object_type="instructions",
        status=ItemStatus.READY_LOSSY.value,
        reason="instructions carry some loss",
        source=SurfacePath(
            product="cline",
            profile="ide",
            object_type="instructions",
            scope="user",
            storage="directory",
            path="~/.cline/rules",
            resolved_path=home / ".cline" / "rules",
            boundary=home,
            source_format="cline-rule",
            policy="semantic-ir-with-loss-report",
            location_role="canonical",
            canonical_path="~/.cline/rules",
            precedence=0,
        ),
        target=SurfacePath(
            product="cursor",
            profile="ide",
            object_type="instructions",
            scope="user",
            storage="directory",
            path="~/.cursor/rules",
            resolved_path=home / ".cursor" / "rules",
            boundary=home,
            source_format="cursor-mdc",
            policy="semantic-ir-with-loss-report",
            location_role="canonical",
            canonical_path="~/.cursor/rules",
            precedence=0,
        ),
    ),
    PlanItem(
        object_type="skills",
        status=ItemStatus.CONFLICT.value,
        reason="skill name collision",
        source=SurfacePath(
            product="cline",
            profile="ide",
            object_type="skills",
            scope="user",
            storage="directory",
            path="~/.cline/skills",
            resolved_path=home / ".cline" / "skills",
            boundary=home,
            source_format="agent-skill",
            policy="validate-then-atomic-copy",
            location_role="canonical",
            canonical_path="~/.cline/skills",
            precedence=0,
        ),
        target=SurfacePath(
            product="cursor",
            profile="ide",
            object_type="skills",
            scope="user",
            storage="directory",
            path="~/.cursor/skills-conflict",
            resolved_path=home / ".cursor" / "skills-conflict",
            boundary=home,
            source_format="agent-skill",
            policy="validate-then-atomic-copy",
            location_role="canonical",
            canonical_path="~/.cursor/skills-conflict",
            precedence=0,
        ),
    ),
    PlanItem(
        object_type="cloud-knowledge",
        status=ItemStatus.FORBIDDEN.value,
        reason="generated memory; never copied",
        source=SurfacePath(
            product="cline",
            profile="ide",
            object_type="cloud-knowledge",
            scope="user",
            storage="directory",
            path="~/.cline/memory",
            resolved_path=home / ".cline" / "memory",
            boundary=home,
            source_format="cline-memory",
            policy="forbidden-regenerate",
            location_role="canonical",
            canonical_path="~/.cline/memory",
            precedence=0,
        ),
        target=SurfacePath(
            product="cursor",
            profile="ide",
            object_type="cloud-knowledge",
            scope="user",
            storage="directory",
            path="~/.cursor/memory",
            resolved_path=home / ".cursor" / "memory",
            boundary=home,
            source_format="cursor-memory",
            policy="forbidden-regenerate",
            location_role="canonical",
            canonical_path="~/.cursor/memory",
            precedence=0,
        ),
    ),
]


# Sanity: status_enum property normalizes legacy strings.
legacy = PlanItem(
    object_type="instructions",
    status="manual",
    reason="legacy string",
)
assert legacy.status_enum is ItemStatus.MANUAL_REBUILD
legacy2 = PlanItem(
    object_type="instructions",
    status="blocked",
    reason="legacy string",
)
assert legacy2.status_enum is ItemStatus.INVALID
assert normalize_status("ready-lossy") is ItemStatus.READY_LOSSY
assert normalize_status("draft-disabled") is ItemStatus.DRAFT_DISABLED
print("OK normalize_status accepts legacy and modern strings")

# Create a real on-disk Skill source so the ready item can land.
skill_src = home / ".cline" / "skills" / "fixture-skill"
skill_src.mkdir(parents=True, exist_ok=True)
(skill_src / "SKILL.md").write_text(
    "---\nname: fixture-skill\ndescription: Test skill.\nmetadata:\n  version: '1'\n---\n# fixture\n",
    encoding="utf-8",
)

# Create a lossy instruction source so include_lossy=True can write it.
rules_src = home / ".cline" / "rules"
rules_src.mkdir(parents=True, exist_ok=True)
(rules_src / "review.md").write_text(
    "---\npaths:\n  - 'src/**/*.ts'\ndescription: Review\n---\nReview.\n",
    encoding="utf-8",
)

# Default safe apply: ready skills + draft-disabled hooks eligible; lossy skipped.
manifest_path = workspace / "manifest-default.json"
manifest, mp = apply_plan(plan, workspace, manifest_path)

assert manifest["apply_safe"] is True
assert manifest["include_lossy"] is False
assert manifest["strict"] is False
assert manifest["summary"].get("applied", 0) >= 1, manifest["summary"]
assert manifest["summary"].get("lossy-skipped", 0) >= 1
assert manifest["summary"].get("manual-rebuild", 0) >= 1
assert manifest["summary"].get("forbidden", 0) >= 1
assert manifest["summary"].get("conflict", 0) >= 1
# Hooks draft with unknown object_type stays as draft-only (no eligible hook
# adapter yet).  Future PRs will add a hook staging path.
assert manifest["summary"].get("draft-only", 0) >= 1
print(f"OK default safe apply summary: {manifest['summary']}")

# Verify the skill landed.
skill_dst = home / ".cursor" / "skills" / "fixture-skill"
assert skill_dst.exists(), f"skill not written to {skill_dst}"
assert (skill_dst / "SKILL.md").exists()
print("OK ready skill landed on target tree")

# Verify the lossy item was NOT written.
assert not (home / ".cursor" / "rules").exists() or not any(
    (home / ".cursor" / "rules").iterdir()
), "lossy item should not have written files"
print("OK lossy instructions were skipped under --apply-safe")

# Forbidden memory target must NOT exist.
assert not (home / ".cursor" / "memory").exists()
print("OK forbidden cloud-knowledge target untouched")

# Now rerun with include_lossy=True and accept_loss_ids empty.
manifest_path2 = workspace / "manifest-lossy.json"
manifest2, _ = apply_plan(
    plan, workspace, manifest_path2,
    include_lossy=True,
)
assert manifest2["include_lossy"] is True
assert manifest2["summary"].get("applied-lossy", 0) >= 1
assert manifest2["summary"].get("lossy-skipped", 0) == 0
print(f"OK include_lossy=True summary: {manifest2['summary']}")
rules_dst = home / ".cursor" / "rules"
assert rules_dst.exists()
print("OK lossy instructions landed under include_lossy=True")

# Strict mode rejects non-ready items.
try:
    apply_plan(
        plan, workspace, workspace / "manifest-strict.json", strict=True,
    )
except ValueError as exc:
    assert "non-applicable" in str(exc), exc
    print(f"OK strict mode rejects: {exc}")
else:
    raise AssertionError("strict mode accepted a mixed-status plan")

# Verify --strict false again does not require all-ready.
manifest3, _ = apply_plan(
    plan, workspace, workspace / "manifest-relaxed.json", strict=False,
)
assert manifest3["summary"]
print("OK strict=False accepts mixed plan")

# Audit SDI-4 regression: an executable surface (hooks) that somehow
# arrives eligible must fail closed — no write to the live product path
# and no "applied" manifest entry.
hook_src = home / ".cline" / "hooks" / "pre.json"
hook_src.parent.mkdir(parents=True, exist_ok=True)
hook_src.write_text('{"event": "PreToolUse", "command": "echo hi"}\n', encoding="utf-8")
hooks_ready = PlanItem(
    object_type="hooks",
    status=ItemStatus.READY.value,
    reason="replayed-plan fixture for SDI-4",
    source=SurfacePath(
        product="cline",
        profile="ide",
        object_type="hooks",
        scope="user",
        storage="directory",
        path="~/.cline/hooks/pre.json",
        resolved_path=hook_src,
        boundary=home,
        source_format="cline-hook",
        policy="validate-then-atomic-copy",
        location_role="canonical",
        canonical_path="~/.cline/hooks/pre.json",
        precedence=0,
    ),
    target=SurfacePath(
        product="cursor",
        profile="ide",
        object_type="hooks",
        scope="user",
        storage="directory",
        path="~/.cursor/hooks/pre.json",
        resolved_path=home / ".cursor" / "hooks" / "pre.json",
        boundary=home,
        source_format="cursor-hook",
        policy="disabled-draft-only",
        location_role="canonical",
        canonical_path="~/.cursor/hooks/pre.json",
        precedence=0,
    ),
)
try:
    apply_plan([hooks_ready], workspace, workspace / "manifest-hooks.json")
except ValueError as exc:
    assert "no automatic writer" in str(exc), exc
    print(f"OK eligible hooks item fails closed: {exc}")
else:
    raise AssertionError("apply_plan wrote an executable hook surface")
assert not (home / ".cursor" / "hooks" / "pre.json").exists(), (
    "hook file reached the live target path"
)

# Same fail-closed contract for agents (never had a writer; previously a
# silent applied-with-no-writes gap).
(home / ".cline" / "agents").mkdir(parents=True, exist_ok=True)
agents_ready = PlanItem(
    object_type="agents",
    status=ItemStatus.READY.value,
    reason="replayed-plan fixture for SDI-1",
    source=SurfacePath(
        product="cline",
        profile="ide",
        object_type="agents",
        scope="user",
        storage="directory",
        path="~/.cline/agents",
        resolved_path=home / ".cline" / "agents",
        boundary=home,
        source_format="cline-agent",
        policy="manual-template",
        location_role="canonical",
        canonical_path="~/.cline/agents",
        precedence=0,
    ),
    target=SurfacePath(
        product="cursor",
        profile="ide",
        object_type="agents",
        scope="user",
        storage="directory",
        path="~/.cursor/agents",
        resolved_path=home / ".cursor" / "agents",
        boundary=home,
        source_format="cursor-agent",
        policy="manual-template",
        location_role="canonical",
        canonical_path="~/.cursor/agents",
        precedence=0,
    ),
)
try:
    apply_plan([agents_ready], workspace, workspace / "manifest-agents.json")
except ValueError as exc:
    assert "no automatic writer" in str(exc), exc
    print(f"OK eligible agents item fails closed: {exc}")
else:
    raise AssertionError("apply_plan silently accepted an unwritable agent surface")

print()
print("Partial safe apply tests passed")
PYEOF