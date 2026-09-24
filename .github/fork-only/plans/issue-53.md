---
issue: 53
title: 'Update Custom Agent Model to Claude Sonnet 5'
scope: agent
status: approved
---

## Issue summary

- **Requested behavior** — change only the agent's `model` frontmatter value to the canonical Claude Sonnet 5 identifier, `claude-sonnet-5`.
- **Current defect** — the current value, `'Claude Sonnet 5.0 (copilot)'`, is a non-canonical display-style string rather than the identifier already used by this fork's orchestration agents.
- **Upstream confirmed** — the checked local `upstream/main` manifest is still version `1.1.0`. This fork's manifest is `1.1.1`, so the planned `1.1.2` bump remains a fork-only release increment required for promotion.
- **Issue-comment limitation** — GitHub CLI is not installed in this environment, so issue comments could not be fetched. The user's direct clarification supersedes the earlier plan's open scope choices.

## Grilling

### Ambiguities

- **Resolved: identifier** — use the canonical single identifier `claude-sonnet-5`, as the user requested.
- **Resolved: fallback behavior** — do not add a fallback list; the requested change is only the model value.
- **Resolved: skills** — no skills need changes because none own the agent's model configuration.
- **Remaining operational uncertainty** — no runtime error message is available, so local validation can prove formatting and plugin structure, but a Copilot client must ultimately resolve the model.

### Scope

- **IN** — update the `model:` field in `agents/oracle-to-postgres-migration-expert.agent.md` to `claude-sonnet-5`.
- **IN** — bump `plugins/oracle-to-postgres-migration-expert/plugin.json` from `1.1.1` to `1.1.2`, required by the fork's promotion contract.
- **OUT** — every other agent frontmatter field, agent instruction, plugin metadata field, skill, workflow, or fork-only tooling file.

### Constraints

- **Upstream promotion rule** — `.github/fork-only/README.md` documents that `fork-bundle-upstream-pr` "fails hard if ... the version was not bumped," so `plugin.json` `version` must increase from `1.1.1`.
- **Canonical local precedent** — `.github/agents/dev-orchestrator.agent.md` and `.github/agents/plan-reviewer.agent.md` already use `claude-sonnet-5`.
- **Patch release** — this is a configuration correction with no skill or capability change, so `1.1.1` to `1.1.2` is appropriate.
- **Fork-only plan exception** — this plan file is updated as required by the orchestration workflow; it is not promoted upstream.

### Assumptions I am making

- The user’s statement that they “only wanted the model to be changed” means no behavioral or content edits beyond the model value.
- `claude-sonnet-5` is the canonical identifier intended by the request, and must remain a single scalar value.
- The required patch version bump is release metadata, not an expansion of functional scope.

## Plan

1. **`agents/oracle-to-postgres-migration-expert.agent.md`** (frontmatter, line 3):
   - Change only `model: 'Claude Sonnet 5.0 (copilot)'` to `model: claude-sonnet-5`.
2. **`plugins/oracle-to-postgres-migration-expert/plugin.json`** (`version` field):
   - Bump `"version": "1.1.1"` to `"version": "1.1.2"`, a patch increment required by promotion tooling.
3. **No additional changes** — do not modify skills, other frontmatter, agent content, or other plugin metadata.

## Acceptance criteria

- [ ] The agent's `model:` field is exactly `claude-sonnet-5`.
- [ ] The plugin version is exactly `1.1.2`; upstream remains confirmed at `1.1.0`.
- [ ] No fields except the agent model and plugin version differ from the pre-change files.
- [ ] `npm run build`, `npm run plugin:validate`, and `bash eng/fix-line-endings.sh` all pass cleanly.
- [ ] A Copilot client resolves `claude-sonnet-5` without an unsupported-model error.

## Open questions

- None for implementation. Runtime availability remains a post-change client verification, not a design decision.

## Verification

- `npm run build` — regenerate README/marketplace after edits.
- `bash eng/fix-line-endings.sh` — normalize line endings.
- `npm run plugin:validate` — confirm `plugin.json` version bump and structure are valid.
- `npm run skill:validate` — no skill files touched, but run for completeness since this agent's plugin bundles skills.
- Manual: open the agent in Copilot CLI/VS Code and confirm the model picker resolves `claude-sonnet-5` without falling back or erroring.
