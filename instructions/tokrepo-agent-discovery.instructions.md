---
description: "Call TokRepo's MCP discovery before generating a new reusable artifact (skill, prompt, MCP config, reusable script). Forces a discover_before_build flow for GitHub Copilot, gates installs through tokrepo_verify + tokrepo_install_plan, and uses tokrepo_handoff_plan after producing reusable work."
applyTo: "**/SKILL.md, **/*.prompt.md, **/.mcp.json, **/scripts/**, **/.github/skills/**, **/.claude/skills/**"
---

# TokRepo Agent Discovery

You are operating in a project that uses TokRepo as the agent-native
registry for reusable AI capabilities. These instructions teach Copilot
to call the registry first before re-generating reusable artifacts.

## MUST: discover before build

Before generating any reusable artifact — a `SKILL.md`, a `*.prompt.md`,
a `.mcp.json`, an MCP tool config, a reusable script in `scripts/`, or
any helper longer than ~50 lines — you MUST first call
`tokrepo_discover` via the TokRepo MCP server (hosted at
`https://tokrepo.com/mcp`) — or the CLI fallback
`npx -y tokrepo@latest agent-check "<task>" --json` if MCP is unavailable.

If a candidate returns with `trust_score_v2 >= 0.7` AND
`agent_fit >= 0.7`, USE IT — do not rebuild. If candidates exist but
`trust_score_v2 < 0.7`, surface them and ask before proceeding.

## MUST: verify before install

Before any install or write to the user environment, you MUST call
`tokrepo_verify` and `tokrepo_install_plan`. If
`policy_decision.decision === "deny"`: STOP. If `permission_envelope`
requests writes outside the declared scope (global config, secrets,
network egress, absolute paths): STOP and confirm with the user
explicitly. Record `content_hash`, `install_plan_hash`, and
`trust_score_v2` as evidence.

## MUST: dry-run before apply

Lifecycle tools (`tokrepo_codex_install`, `tokrepo_update`,
`tokrepo_uninstall`, `tokrepo_rollback`) default `dry_run: true`. Keep
`dry_run: true` until the user has surfaced the plan and explicitly
confirmed `dry_run: false` for that specific operation in this session.

## MUST: handoff after reusable work

After producing reusable artifacts (skills, prompts, MCP configs,
scripts, reusable helpers), you MUST call `tokrepo_handoff_plan` (or
`npx tokrepo agent-handoff --json`). It returns a READ-ONLY draft plan
that never auto-publishes. Ask the user before any `tokrepo_push`.

## MUST: private by default, never push secrets

`tokrepo_push` defaults to `visibility: 0` (private). Public publishing
requires explicit per-push confirmation. Before any push, strip env
tokens, absolute paths, project-specific names, and any string matching
a secret pattern. If `tokrepo_handoff_plan` flagged a file as sensitive,
do not override.

## Setup

```bash
# One-time per project — writes .github/copilot-instructions.md plus the
# machine-readable .tokrepo/agent.json that the MCP server reads.
npx -y tokrepo@latest init-agent --target copilot
```

## Resources

- Hosted MCP endpoint (read-only, no auth): `https://tokrepo.com/mcp`
- Local MCP server: `npx -y tokrepo-mcp-server`
- Published tool catalog: 15 tools in `https://tokrepo.com/.well-known/tool-catalog.json`
- Trust manifest: `https://tokrepo.com/.well-known/tokrepo-trust.json`
- Default policy pack: `https://tokrepo.com/policy-packs/default-agent-policy.json`
- Tool catalog: `https://tokrepo.com/.well-known/tool-catalog.json`
- Public agent funnel (anonymous): `https://tokrepo.com/agent-stats`
- Source: https://github.com/henu-wang/tokrepo-mcp-server
