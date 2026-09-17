---
name: agent-skill-stack
description: 'Find, evaluate, and assemble the smallest compatible set of AI Agent Skills for an end-to-end natural-language goal. Use when a user wants Skills for a multi-step workflow, asks which Skills fit a project, needs an installed-Skill audit or conflict check, has low Skill recall, wants indirect helpers such as humanizers or compliance checks, or wants a project-specific Skill Stack with controlled installation. Search local Skills, registries, GitHub, and OpenCLI; compare adoption, verified fit, safety, and overlap. Do not use for locating one known or common Skill; use the generic find-skills workflow.'
---

# Build an Agent Skill Stack

Build the smallest useful stack for the user's actual outcome. Never force a domain example or a fixed lifecycle onto a different request.

## 1. Choose the user-facing depth

Default to **plain-language mode**. Assume the user does not need to understand paths, revisions, hashes, manifests, static analysis, or runtime details.

In plain-language mode, show:

- what the user is trying to accomplish;
- the steps in everyday language;
- which capabilities are already available;
- which Skills are recommended, optional, overlapping, or unsuitable;
- how widely each candidate is used;
- whether it passed an installation safety check and a safe trial;
- what account access or external actions it may require.

Keep source paths, revisions, file fingerprints, raw scores, audit evidence, and dependency details in the internal record. Show them only when the user asks for technical details or when a specific technical fact is necessary for informed consent.

## 2. Derive the workflow dynamically

Read [references/workflow-model.md](references/workflow-model.md). Begin with the final result the user wants, not the domain words in the request.

Ask only questions whose answers materially change the result, access boundary, cost, or stack. Derive the workflow backward from success, then validate it forward from the available starting point.

Do not reuse a previous numbered flow. Do not assume that every request needs research, content creation, publishing, analytics, storage, or automation. Add a step only when the user's outcome requires it.

Stop decomposing when a step has one understandable action, one main result, one access boundary, and one observable success condition. Keep the technical capability cards internal; show the user a short plain-language flow.

## 3. Search the local index first

Read [references/local-index-and-profiles.md](references/local-index-and-profiles.md).

If a current local Skill index exists, search it before the filesystem or internet. If it is missing or stale, rebuild it from the relevant Skill roots:

```bash
python3 scripts/skill_index.py build \
  --root ~/.codex/skills \
  --root ~/.codex/plugins/cache \
  --root .codex/skills \
  --root ~/.agents/skills \
  --root ~/.hermes/skills \
  --output ~/.codex/skill-index.json
```

The index stores names, summaries, aliases, scope, capability terms, update time, and internal file fingerprints. It never executes a Skill and stores no usage history.

If the current project has `.codex/skill-stack.json`, treat its active Skills and routing rules as the first-choice stack. Search outside the profile only for an uncovered capability or when the user asks for alternatives. Treat same-name entries from different local roots as a review item; do not silently merge them.

## 4. Map capabilities, including indirect helpers

For every necessary step, record internally:

- required input, action, and output;
- constraints, frequency, and scale;
- local/read-external/write-external boundary;
- account, permission, and approval needs;
- success condition and fallback;
- predecessor and successor steps.

Then consider cross-cutting needs only where relevant: quality/style, accuracy, compliance, privacy, localization, data quality, orchestration, and observability.

Match Skills by `input -> operation -> output`, not by title similarity. This allows a Humanizer to match a natural-writing requirement even when the user's domain never appears in its name.

Do not force one Skill per step. A Skill may cover several steps; a step may need a tool, MCP, connector, or general agent capability rather than another Skill.

## 5. Search with four lenses

Read [references/discovery-ranking.md](references/discovery-ranking.md). Search each uncovered capability through:

1. **Direct need**: the user's domain and action.
2. **Underlying operation**: the actual transformation or data task.
3. **Supporting outcome**: quality, safety, style, compliance, evaluation, and monitoring.
4. **Connection method**: CLI, MCP, API, connector, browser automation, storage, and handoff.

Expand Chinese/English aliases, verbs, nouns, outputs, and adjacent terminology. Search titles, descriptions, headings, and full `SKILL.md` content when possible.

Use multiple sources because no registry is complete:

- the local Skill index and installed inventory;
- GitHub connector or GitHub file/repository search;
- `npx skills find <query>` and skills.sh;
- agentskill.sh or another registry when available;
- OpenCLI for broad web discovery and platform-specific research.

Run browser-backed OpenCLI searches sequentially. Do not log in, add credentials, or enable a connector without user approval.

## 6. Verify and rank candidates

Treat every search hit as a candidate, not a recommendation. Identify the canonical repository and exact Skill path. Read the full Skill and every executable file that installation would make reachable.

Reject or quarantine a candidate when:

- its source or claimed capability cannot be verified;
- its structure cannot be installed;
- mandatory dependencies are incompatible or unavailable;
- critical credential access, data upload, prompt injection, destructive action, or obfuscation remains unexplained;
- its only possible test would publish, send, purchase, delete, or change a real account;
- license or platform terms make the intended use materially uncertain.

Rank candidates that pass these gates with the rubric in [references/discovery-ranking.md](references/discovery-ranking.md). Real-world adoption and community evidence account for 25% of the score. Preserve unknown values as unknown.

Prefer the smallest stack that meets all required success conditions. Classify candidates as:

- **Required**: needed to complete the outcome.
- **Helpful**: improves quality, safety, or efficiency.
- **Alternative**: mutually exclusive substitute.
- **Not recommended**: blocked, redundant, incompatible, or too uncertain.

## 7. Analyze conflicts and scope

Read [references/security-installation.md](references/security-installation.md). Check identity, activation, instruction, resource, dependency, data-format, permission, and compliance conflicts.

Resolve overlap by selecting one primary Skill, defining a narrow handoff to helpers, keeping alternatives mutually exclusive, or not installing the redundant candidate.

Prefer project-local Skills and a project Skill Stack Profile for task-specific capabilities. Use global installation only for capabilities that should be available broadly.

## 8. Present recommendations in plain language

Default output:

1. **What you want to achieve**: one short restatement.
2. **How the work breaks down**: a short numbered flow derived for this request.
3. **What you already have**: existing useful Skills and uncovered gaps.
4. **Recommended combination**: Required, Helpful, Alternative, and Not recommended.
5. **Why these were chosen**: fit, adoption, safety check, safe trial, and conflicts in everyday language.
6. **What needs your decision**: account access, paid services, external publishing, or installation selection.

Use labels such as `已具备`, `推荐`, `可选`, `不建议`, `安全检查通过`, `安全试跑通过`, and `最近确认可用`. Do not show a hash or local path in the default response.

Offer `查看技术详情` when useful. The technical view may include canonical source, revision, file fingerprint, exact destination, raw evidence, dependencies, permissions, and rollback details.

When the user wants a reusable artifact, create a shareable recommendation card from structured JSON:

```bash
python3 scripts/render_stack_card.py \
  --input /path/to/stack-card.json \
  --output /path/to/stack-card.svg
```

Keep the card understandable without technical paths or raw hashes. Include the goal, selected Skills, each role and status, safety boundary, and verification date.

## 9. Install only after consent

Recommendation does not authorize installation. Follow [references/security-installation.md](references/security-installation.md) after the user chooses.

Default to staged installation. Allow a one-click batch only when every selected Skill passed the hard gates, has an exact pinned identity, has no unresolved conflict, will not overwrite an existing destination, and the user explicitly approves the batch.

For already downloaded and checked Skill directories, preview first:

```bash
python3 scripts/stage_install.py \
  --source /path/to/skill-a \
  --dest ~/.codex/skills \
  --manifest ./skill-stack-lock.json
```

Repeat with `--apply` only after approval. Never silently add credentials, accept new permissions, overwrite an installed Skill, or publish/send/delete external data.

After the user selects the stack, offer to create a project profile in dry-run mode:

```bash
python3 scripts/project_profile.py \
  --project /path/to/project \
  --name project-stack \
  --skill skill-a \
  --skill skill-b
```

Use `--apply` only after the user confirms the profile.

## 10. Run a recall check

After installation or profile changes, run a **recall check**, not a performance benchmark:

1. a direct request that names the task;
2. a natural paraphrase that uses different words;
3. a supporting request that should bring in a helper such as writing quality, fact checking, or compliance.

Confirm that the correct primary and supporting Skills are selected and unrelated Skills stay out. Report a simple result such as `3/3 种说法都能正确识别`; keep raw prompts and routing details in the technical view.

Do not collect or store user prompt history, hit/miss logs, or routing feedback.
