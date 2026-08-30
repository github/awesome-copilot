#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

python3 - "$SCRIPT_DIR" <<'PYEOF'
import dataclasses
import sys
from pathlib import Path

script_dir = Path(sys.argv[1])
sys.path.insert(0, str(script_dir))

from migration_core import (  # noqa: E402
    AgentIR,
    CommandIR,
    HookIR,
    MCPServerIR,
    PromptIR,
)


def _roundtrip(cls, instance):
    d = dataclasses.asdict(instance)
    rebuilt = cls(**d)
    assert rebuilt == instance, (cls, d)


# MCPServerIR: extra MCP transport fields.
mcp = MCPServerIR(
    name="linear",
    transport="stdio",
    command="npx",
    args=["-y", "@modelcontextprotocol/server-linear"],
    env={"LINEAR_API_KEY": "${LINEAR_API_KEY}"},
    cwd="/srv/linear",
    timeout_seconds=30,
    startup_timeout_seconds=10,
    enabled=True,
    tool_allowlist=["create_issue"],
    auth={"type": "oauth", "scopes": ["read", "write"]},
    mtls={"enabled": False},
    target_schema_version="2026-08",
)
_roundtrip(MCPServerIR, mcp)
assert mcp.tool_allowlist == ["create_issue"]
assert mcp.auth["type"] == "oauth"
print(f"OK MCPServerIR with cwd={mcp.cwd}, oauth={mcp.auth['type']}")


# PromptIR
prompt = PromptIR(
    name="review",
    description="Code review",
    arguments=[{"name": "focus", "required": False}],
    body="Review the staged diff.",
    model="claude-sonnet",
    agent="code-reviewer",
    file_references=["CHANGELOG.md"],
    scope="project",
    auto_invocation=True,
)
_roundtrip(PromptIR, prompt)
assert prompt.auto_invocation is True
print(f"OK PromptIR with model={prompt.model}, agent={prompt.agent}")


# CommandIR
cmd = CommandIR(
    name="lint",
    description="Run linters",
    invocation="/lint",
    body="cargo clippy --workspace --all-targets",
    tool_blocks=[{"name": "Bash", "input": {"command": "cargo clippy"}}],
    file_references=["Cargo.toml"],
    scope="user",
)
_roundtrip(CommandIR, cmd)
assert cmd.invocation == "/lint"
print(f"OK CommandIR with invocation={cmd.invocation}")


# AgentIR
agent = AgentIR(
    name="reviewer",
    description="Reviews staged changes",
    system_prompt="You are a careful reviewer.",
    tools=["Read", "Grep", "Bash"],
    model="claude-opus",
    permissions=["fs:read"],
    mcp=["linear"],
    subagents=["linter"],
    handoffs=["reviewer->fixer"],
    isolation="worktree",
    worktree=True,
    memory_policy="ephemeral",
    hooks=[{"event": "PreToolUse", "matcher": "Bash"}],
)
_roundtrip(AgentIR, agent)
assert agent.worktree is True
assert "linear" in agent.mcp
print(f"OK AgentIR with {len(agent.tools)} tools, worktree={agent.worktree}")


# HookIR
hook = HookIR(
    event="PreToolUse",
    matcher="Bash",
    command="/hooks/pre-bash.sh",
    cwd="${workspace}",
    env={"HOOK_NAME": "pre-bash"},
    stdin_schema="PreToolUseRequest",
    stdout_schema="PreToolUseResponse",
    blocking=True,
    exit_code=0,
    timeout_seconds=10,
    async_run=False,
    os_overrides={"windows": {"command": "C:\\hooks\\pre-bash.cmd"}},
    target_script_references=["hooks/pre-bash.sh"],
)
_roundtrip(HookIR, hook)
assert hook.event == "PreToolUse"
assert "windows" in hook.os_overrides
print(f"OK HookIR with os_overrides keys: {list(hook.os_overrides)}")

print()
print("Object IR schema tests passed")
PYEOF