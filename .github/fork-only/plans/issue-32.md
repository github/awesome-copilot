---
issue: 32
title: 'Update Oracle-to-Postgres Custom Agent Model'
scope: agent
status: draft
---

## Issue summary

- **Requested change** — the issue body says only "Update the model up to Claude Sonnet 5.0."
- **Target field** — the only place a model is pinned for this agent is the `model:` frontmatter key in `agents/oracle-to-postgres-migration-expert.agent.md`, currently `'Claude Sonnet 4.6 (copilot)'`.
- **My restatement** — bump that one frontmatter value to reference Claude Sonnet 5.0, matching whatever string form the repo's other agents use for Sonnet 5.x models.
- **Gap vs literal text** — the issue does not give an exact string (e.g. `'Claude Sonnet 5.0'` vs `'Claude Sonnet 5 (copilot)'` vs `claude-sonnet-5`); this repo has no existing precedent for a Sonnet 5.x value to copy, so the exact string is a judgment call, not a known fact.

## Grilling

### Ambiguities

- **Exact model string** — no other `*.agent.md` file in this repo uses "Sonnet 5" yet (closest precedents: `'Claude Sonnet 4.5'`, `'Claude Sonnet 4.6'`, `claude-sonnet-5` as this session's own model ID) — the maintainer needs to confirm the exact display string Copilot's agent picker expects.
- **`(copilot)` suffix** — the current value has a `(copilot)` suffix; some agents in the repo use it (`'Claude Sonnet 4.6 (copilot)'`, `'Technical Content Evaluator'` uses `Claude Sonnet 4.5 (copilot)`) and some don't (`'Claude Sonnet 4.5'`) — unclear if this is meaningful metadata or copy-paste drift, and whether it should be kept.
- **Scope of "Update the model"** — could mean only this one agent's frontmatter, or could imply reviewing whether any skill files, docs, or the plugin description also reference a model version — nothing else in the plugin/skills currently names a model, so I assume it's frontmatter-only.
- **Version bump size** — a model string change is a wording-level tweak with no behavioral contract change to the agent's instructions, so it plausibly maps to a `patch` bump — but the maintainer may consider "which LLM backs this agent" a capability-relevant fact worth a `minor` bump.

### Scope

- **IN** — updating the `model:` frontmatter field in `agents/oracle-to-postgres-migration-expert.agent.md`.
- **IN** — bumping `plugins/oracle-to-postgres-migration-expert/plugin.json` `version` per the upstream-promotion constraint.
- **OUT** — changing agent behavior, instructions, tools, phases, or skill content — issue only asks for a model update, not a functional change.
- **OUT** — touching any other agent file in the repo — issue is scoped to this fork's one agent.
- **OUT** — fork-only tooling (`.github/fork-only/`, `.github/workflows/fork-*`) — not implicated by this issue at all.

### Constraints

- **Upstream promotion rule** — `plugin.json` `version` must be bumped whenever the agent file changes, per `.github/fork-only/README.md`'s bundler behavior (`fork-bundle-upstream-pr` fails hard if the version wasn't bumped).
- **CONTRIBUTING.md convention** — plugin `version` must be a valid semver (`CONTRIBUTING.md` line ~239).
- **No downstream skill impact** — none of the eight skills in `plugin.json`'s `skills` array reference a model name, so this change is isolated to the agent frontmatter.
- **README regeneration** — `npm run build` must be re-run after any agent/plugin change so `docs/README.agent.md` and the root README stay in sync, per repo-wide convention.
- **Frontmatter format precedent** — other agents mix quoted and unquoted model strings (`'Claude Sonnet 4.5'`, `Claude Sonnet 4`, `"Claude Sonnet 4.6"`); the existing file already uses single quotes, so preserve that quoting style.

### Assumptions I am making

- The maintainer means the flagship "Claude Sonnet 5" model family, written to match this repo's existing naming pattern, i.e. `'Claude Sonnet 5.0 (copilot)'` (keeping the existing `(copilot)` suffix and quoting style since neither is called out for removal).
- No specific sub-version (5.0 vs 5.1 vs 5.2) is intended beyond what's literally stated ("5.0"), so the plan uses that exact number rather than inferring a different point release.
- This is a routine model-currency bump, not a signal that the agent's instructions need rewriting for new model capabilities (the issue text gives no indication of behavior change).
- A `patch` version bump is appropriate — no new agent capability, tool, or skill is being added, only the pinned model reference.
- The `tools:` list, phases, and all other frontmatter/body content are unaffected and should not be touched.

## Plan

1. **`agents/oracle-to-postgres-migration-expert.agent.md`** — frontmatter, line 3.
   - Change `model: 'Claude Sonnet 4.6 (copilot)'` to `model: 'Claude Sonnet 5.0 (copilot)'`.
   - No other frontmatter fields (`description`, `tools`, `name`) or body content change.
2. **`plugins/oracle-to-postgres-migration-expert/plugin.json`** — `version` field.
   - Bump `"version": "1.1.0"` → `"version": "1.1.1"` (**patch**), because this is a metadata/wording-level change to which model backs the agent, with no new capability, skill, tool, or behavior-breaking change to the agent's instructions.
3. **Regenerate generated docs** — run `npm run build` after the above two edits so `README.md` and `docs/README.agent.md` pick up the updated model string, and commit any resulting diff.

No other files are touched — no skill files reference a model name, and the plugin's `agents`/`skills` composition arrays are unaffected by this change.

## Acceptance criteria

- [ ] `agents/oracle-to-postgres-migration-expert.agent.md` frontmatter `model:` field references Claude Sonnet 5.0 (exact string confirmed by maintainer).
- [ ] `plugins/oracle-to-postgres-migration-expert/plugin.json` `version` is bumped (at minimum patch) from `1.1.0`.
- [ ] `npm run build` run and any generated README/doc diffs committed.
- [ ] `npm run plugin:validate` and `npm run skill:validate` pass.
- [ ] `bash eng/fix-line-endings.sh` run with no unexpected diff.
- [ ] No other agent, skill, or fork-only file changed.

## Skeptic's report

### Strengths

- **Correctly scoped** — the plan touches exactly the two files that need to change and explicitly excludes everything else, avoiding scope creep on a one-line-sounding request.
- **Flags the real ambiguity** — the plan doesn't invent a false-confident model string; it surfaces that no precedent for "Sonnet 5" exists in this repo and asks the maintainer to confirm it.
- **Correctly ties the version bump to the fork's own promotion rule** rather than skipping it because "it's just a string."

### Concerns

- **Issue**: The exact model identifier string is guessed (`'Claude Sonnet 5.0 (copilot)'`), and if Copilot's model picker uses a different canonical name (e.g. no "(copilot)" suffix, or "Claude Sonnet 5" without ".0"), the frontmatter will silently reference a model that doesn't resolve, degrading the agent to a fallback model with no visible error.
  - **Why it matters**: A wrong model string is worse than no explicit model — the agent's whole design (deep multi-phase, tool-heavy reasoning) assumes a capable-enough model resolves; silent fallback could exhibit subtly worse behavior with nothing in the diff obviously "broken."
  - **Suggested fix**: Before merging, the maintainer should check the model string against Copilot CLI's actual accepted model list (this session's own model identifies as `claude-sonnet-5`, suggesting the accepted form may be lowercase-hyphenated rather than the display string used in frontmatter — worth a quick manual test in the CLI's agent picker before committing).
- **Issue**: Patch-vs-minor version bump judgment call — the plan chose patch, but "which LLM this agent runs on" arguably changes its practical capability profile (a model swap can measurably change output quality/behavior even with identical instructions).
  - **Why it matters**: If upstream or downstream consumers treat plugin version bumps as a signal of what changed, calling a model swap "patch" under-signals it.
  - **Suggested fix**: Maintainer's call — this plan defaults to patch per semver's literal definition (no API/behavior contract change), but flags it as a judgment call rather than asserting certainty.
- **Issue**: No verification that Claude Sonnet 5.0 is actually GA / selectable in Copilot at time of merge — the issue may have been filed slightly ahead of general availability.
  - **Why it matters**: If unavailable, the frontmatter references a model users can't select, and the agent effectively can't run until the maintainer notices.
  - **Suggested fix**: Maintainer verifies availability in the Copilot CLI/VS Code model picker before merging; if unavailable, hold the branch open until it is.

### Confidence

**Medium** — the file/version changes themselves are trivial and low-risk, but the actual deliverable (the correct model string) is an unverified guess with no in-repo precedent to check against.

## Open questions

- **Exact model string** — what should the `model:` frontmatter value be exactly? Options: `'Claude Sonnet 5.0 (copilot)'` (keeps existing `(copilot)` suffix and quoting style), `'Claude Sonnet 5.0'` (drops the suffix, matching some other agents), or a different string entirely if Copilot's picker uses another canonical name. **I would pick** `'Claude Sonnet 5.0 (copilot)'`, matching the current file's own suffix/quoting convention, pending the maintainer's confirmation against the actual Copilot model picker.
- **Version bump size** — should `plugin.json` version go from `1.1.0` to `1.1.1` (patch) or `1.2.0` (minor)? Options: patch (no functional/behavioral change, just which model backs it) or minor (a model swap is capability-relevant even without instruction changes). **I would pick** patch (`1.1.1`), per semver's literal definition, but flag this as a judgment call the maintainer may override.
- **`(copilot)` suffix retention** — should the suffix be kept, dropped, or standardized across the whole file/repo as part of this change? **I would pick** keep it as-is (only change the version number), since the issue doesn't ask for a stylistic cleanup and touching more than the version risks unrelated scope creep.

## Verification

- `npm run build` — regenerate README.md and docs after the frontmatter/plugin.json edits.
- `bash eng/fix-line-endings.sh` — normalize line endings before commit.
- `npm run skill:validate` — confirm no skill regressions (unaffected by this change, but part of the standard gate).
- `npm run plugin:validate` — confirm `plugin.json` still validates after the version bump.
- Manual check — open the agent in Copilot CLI/VS Code's agent picker and confirm the `model:` value resolves to an actual selectable model rather than falling back silently.
