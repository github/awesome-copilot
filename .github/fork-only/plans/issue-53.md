---
issue: 53
title: 'Update Custom Agent Model to Claude Sonnet 5'
scope: agent
status: draft
---

## Issue summary

- **Model is unsupported** — issue states "the model needs upgrading because the current one is no longer supported," implying the agent currently targets a deprecated/retired model.
- **Target is Claude Sonnet 5** — the issue title asks specifically for `agents/oracle-to-postgres-migration-expert.agent.md` to reference Claude Sonnet 5.
- **Restatement gap** — the file's `model` field already reads `'Claude Sonnet 5.0 (copilot)'` (set in the same merge, PR #52/`c84e240`), so the literal ask ("upgrade to Sonnet 5") appears to already be nominally satisfied by string content; the real defect is more likely that this exact string is malformed/non-canonical and not recognized as a valid Sonnet 5 reference by the agent picker or backing infra, which is what "no longer supported" is actually describing.
- **No other detail given** — the issue body is a single sentence with no reproduction steps, error message, or link to where the "not supported" failure was observed.

## Grilling

### Ambiguities

- **Which model actually failed** — the issue doesn't say whether "the current one" refers to the literal string in this file today (`Claude Sonnet 5.0 (copilot)`) or some earlier value the maintainer saw before PR #52 merged; no error text or screenshot is attached.
- **Why "5.0 (copilot)" if the ask is "Sonnet 5"** — the existing string is unlike every other `model` value in this repo (`agents/*.agent.md` uses bare names like `'Claude Sonnet 4.5'`, `GPT-4.1`, or hyphenated ids like `claude-sonnet-4-5`; the fork's own `.github/agents/dev-orchestrator.agent.md` and `.github/agents/plan-reviewer.agent.md` use plain `claude-sonnet-5`) — it's unclear if `.0` and `(copilot)` are meaningful qualifiers or accidental cruft from an editor/tool.
- **Single value vs. fallback list** — v1.0.83+ supports `model` as a list tried in order (see `website/src/content/docs/learning-hub/building-custom-agents.md`); the issue doesn't say whether a fallback list (e.g. `[claude-sonnet-5, 'Claude Sonnet 4.5']`) is wanted for resilience, or a single pinned value is preferred for determinism.
- **Skill files unaffected** — none of the 8 skills under `skills/*oracle-to-postgres*/SKILL.md` reference a model field, so there's nothing to change there; worth confirming that's expected and not an oversight in the issue.

### Scope

- **IN** — updating the `model:` frontmatter field in `agents/oracle-to-postgres-migration-expert.agent.md` to a canonical, currently-supported Claude Sonnet 5 identifier.
- **IN** — bumping `plugins/oracle-to-postgres-migration-expert/plugin.json` `version` per upstream promotion rules (any change to the promoted agent requires a version bump before `fork-bundle-upstream-pr` will accept it).
- **OUT** — rewriting agent persona, guidelines, or migration-phase instructions; the issue is purely about the model field.
- **OUT** — changing `tools:` array or any other frontmatter key.
- **OUT** — touching the fork-only agents (`dev-orchestrator.agent.md`, `plan-reviewer.agent.md`) even though they already use the plain `claude-sonnet-5` form as a naming precedent — they are not part of the promoted agent/plugin/skills surface.
- **OUT** — adding a fallback model list unless the maintainer says so in the open questions below (default plan below picks a single value).

### Constraints

- **Upstream promotion rule** — `.github/fork-only/README.md` documents that `fork-bundle-upstream-pr` "fails hard if ... the version was not bumped," so `plugin.json` `version` must increase from `1.1.1`.
- **CONTRIBUTING.md convention** — the repo's example agent format (`CONTRIBUTING.md`, "Adding an Agent" section) shows `model: "gpt-5"` as a bare quoted string, not a parenthetical/versioned one; matching that convention is lower-risk than inventing a new format.
- **No compatibility break** — a model-field change alone doesn't alter agent behavior/tools, so this is a low-risk, additive-only change (patch-level, not minor/major).
- **Fork tooling is out of scope for this issue** — nothing here touches `.github/fork-only/` or `.github/workflows/fork-*`.

### Assumptions I am making

- **"No longer supported" refers to the model string's format**, not to Claude Sonnet 5 itself being deprecated — Sonnet 5 is the fork's own stated standard (used by `dev-orchestrator.agent.md` and `plan-reviewer.agent.md`), so the fix is normalizing the string, not picking a different model family.
- **The canonical value to use is the plain hyphenated id `claude-sonnet-5`**, matching the two existing fork-only agents exactly, rather than a human-readable variant like `'Claude Sonnet 5'` — picking consistency with the fork's own working examples over the upstream `CONTRIBUTING.md` example (which shows an unrelated model, `gpt-5`, only as an illustration of quoting style, not a mandate on naming case).
- **A single pinned model value is wanted**, not a fallback list — the issue doesn't ask for resilience against rate limits, just for a working, supported reference.
- **Only the agent's own file needs edits** — no other file in the repo references the agent's model value by name (verified: no other `agents/*.agent.md`, `plugin.json`, or skill file mentions "Claude Sonnet 5.0" or similar), so this is a single-line change plus the version bump.
- **A patch-level version bump is correct** — `1.1.1` → `1.1.2` — because this is a wording/config correction with no new capability, no behavior change, and no new skill.

## Plan

1. **`agents/oracle-to-postgres-migration-expert.agent.md`** (frontmatter, line 3):
   - Change `model: 'Claude Sonnet 5.0 (copilot)'` to `model: claude-sonnet-5`.
   - Leave `description`, `tools`, and `name` untouched.
2. **`plugins/oracle-to-postgres-migration-expert/plugin.json`** (`version` field):
   - Bump `"version": "1.1.1"` → `"version": "1.1.2"` (patch — wording/config-only fix, no new capability or skill, no behavior change).
3. **No skill file changes** — none of the 8 skills under `plugin.json`'s `skills` array reference a model string.

## Acceptance criteria

- [ ] `agents/oracle-to-postgres-migration-expert.agent.md` frontmatter `model:` field is a single, canonical, currently-supported Claude Sonnet 5 identifier (recommend `claude-sonnet-5` to match `.github/agents/dev-orchestrator.agent.md` and `.github/agents/plan-reviewer.agent.md`).
- [ ] `plugins/oracle-to-postgres-migration-expert/plugin.json` `version` is bumped (recommend patch: `1.1.1` → `1.1.2`).
- [ ] No other frontmatter fields, persona text, or guidelines in the agent file changed.
- [ ] No skill files changed.
- [ ] `npm run build`, `npm run plugin:validate`, and `bash eng/fix-line-endings.sh` all pass cleanly.
- [ ] Maintainer has manually confirmed the new `model` value is selectable/functional in their Copilot CLI/VS Code session (this plan cannot verify runtime model availability).

## Open questions

- **Exact model identifier to use** — options: (a) `claude-sonnet-5` (plain hyphenated id, matches `.github/agents/dev-orchestrator.agent.md` and `.github/agents/plan-reviewer.agent.md` exactly), (b) `'Claude Sonnet 5'` (human-readable, matches the style of most `agents/*.agent.md` entries like `'Claude Sonnet 4.5'`), (c) keep a `(copilot)` suffix but fix the version number, e.g. `'Claude Sonnet 5 (copilot)'`. I would pick **(a) `claude-sonnet-5`** — it matches the two agents this same fork already runs successfully in Actions, removing any doubt about validity.
- **Single value vs. fallback list** — should `model` be a single string, or a fallback list (e.g. `[claude-sonnet-5, 'Claude Sonnet 4.5']`) per the v1.0.83+ feature, in case Sonnet 5 is rate-limited? I would pick **single value** — the issue asks for a specific upgrade, not resilience, and a fallback list adds a maintenance surface not requested.
- **Version bump size** — patch (`1.1.2`) vs. minor. I would pick **patch** — this is a config/wording correction with no new capability, matching the guidance in this plan's own semver rule ("patch for wording").
- **Was the current string ever actually broken, or is this issue stale relative to PR #52** — should the maintainer double check whether `'Claude Sonnet 5.0 (copilot)'` ever failed at runtime before merging a change, in case the real underlying bug is something else entirely (e.g. an infra-side model id mismatch)? I would pick **yes, verify once in a live session before merging** since no error text was provided in the issue.

## Verification

- `npm run build` — regenerate README/marketplace after edits.
- `bash eng/fix-line-endings.sh` — normalize line endings.
- `npm run plugin:validate` — confirm `plugin.json` version bump and structure are valid.
- `npm run skill:validate` — no skill files touched, but run for completeness since this agent's plugin bundles skills.
- Manual: open the agent in Copilot CLI/VS Code and confirm the model picker resolves `claude-sonnet-5` without falling back or erroring.
