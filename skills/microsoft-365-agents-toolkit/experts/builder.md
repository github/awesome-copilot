# builder

## purpose

Guided workflow for creating new micro-experts — from scoping and research through drafting, validation, and wiring into the routing system.

## rules

1. **One expert, one topic.** Each expert file covers a single, well-bounded topic. If the scope needs an "and" to describe it, split into two experts.
2. **Minimum depth threshold.** Only create a standalone expert if the topic warrants 8+ rules and 2+ code patterns. Below that threshold, add the knowledge to an existing expert instead.
3. **Reusability over specificity.** The expert must apply to future tasks, not just the current one-off request. If the knowledge is project-specific, it belongs in a CLAUDE.md or README, not an expert.
4. **Research before writing.** Never draft rules or patterns from memory alone. Every rule must trace to official docs, SDK source, or verified behavior. If you cannot confirm a claim, mark it `[unverified]`.
5. **Language-agnostic filenames when appropriate.** Use `{topic}-ts.md` when the expert is TypeScript-specific. Use `{topic}.md` (no language suffix) when the expert applies regardless of language (e.g., architecture patterns, workflow guides, platform concepts).
6. **Canonical section order.** Every expert MUST follow the section layout in the expert structure reference below. Omit optional sections entirely rather than leaving them empty.
7. **Rules are imperatives, not observations.** Write "Always call `ack()` before async work" not "ack is important." Each rule must tell the reader exactly what to do or avoid.
8. **Patterns are minimal and self-contained.** Each code snippet demonstrates one concept with all necessary imports. No "see above" references between patterns.
9. **Pitfalls earn their place.** Only include pitfalls that are non-obvious, have bitten real users, or contradict reasonable assumptions. "Don't forget to save the file" is not a pitfall.
10. **No fabricated API signatures.** If a web search yields no confirmation for an API shape, omit it or mark it `[unverified]`. Wrong patterns are worse than missing patterns.
11. **Wire it or it doesn't exist.** An expert that isn't reachable through the routing system (domain `index.md` + root `index.md` signals) will never be loaded. Integration is not optional.
12. **Keep files under 300 lines.** If an expert grows beyond 300 lines, split it into focused sub-experts under the same domain.

## interview

### Q1 — Topic & Language
```
question: "What topic should this expert cover, and is it language-specific?"
header: "Topic"
options:
  - label: "TypeScript-specific"
    description: "Expert targets TypeScript patterns and APIs. File will be named {topic}-ts.md."
  - label: "Language-agnostic"
    description: "Expert covers concepts that apply across languages. File will be named {topic}.md."
  - label: "You Decide Everything"
    description: "Accept recommended defaults for all decisions and skip remaining questions."
multiSelect: false
```

### Q2 — Research Depth
```
question: "How much research should go into this expert before drafting?"
header: "Research"
options:
  - label: "Full deep research (Recommended)"
    description: "Web search official docs, SDK source, and community guides for each rule and pattern. Thorough but slower."
  - label: "Light research"
    description: "Quick scan of official docs only. Good when you already have strong domain knowledge."
  - label: "Stub only"
    description: "Create the file structure with a research prompt but no content yet. Fill in later with the researcher workflow."
multiSelect: false
```

### Q3 — Placement
```
question: "Where should this expert live in the folder structure?"
header: "Placement"
options:
  - label: "Existing domain folder"
    description: "Place in an existing domain (languages/, tools/, .project/). You'll specify which."
  - label: "New domain folder"
    description: "Create a new domain folder. Only if 3+ experts will belong to it and it has distinct signal words."
  - label: "Root .experts/ folder"
    description: "Place at the root level alongside fallback.md. For system-level utilities only."
multiSelect: false
```

### defaults table

| Question | Default |
|---|---|
| Q1 | TypeScript-specific (`{topic}-ts.md`) |
| Q2 | Full deep research |
| Q3 | Existing domain folder |

## workflow

### phase 1 — scope

1. Run the interview above (or use defaults if the developer opted out).
2. Confirm the topic doesn't overlap with an existing expert. Read the target domain's `index.md` file inventory and scan for coverage.
3. If overlap exists, recommend updating the existing expert instead and stop.
4. Decide the filename: `{topic}-ts.md` (language-specific) or `{topic}.md` (language-agnostic).
5. Decide the target folder: existing domain, new domain, or root `.experts/`.

### phase 2 — research

1. Write a Deep Research prompt for the topic. Include: SDK/platform name, key concepts, specific APIs to cover, and pattern areas.
2. Execute the prompt as a series of targeted web searches:
   - Break into discrete topics (one per API surface, concept, or pattern area).
   - Search each individually. Prefer official docs, SDK source, and type definitions.
   - For each result, capture: API signatures, parameter types, return types, defaults, and gotchas.
3. If interview answer was "Stub only," write the research prompt into `## research` and skip to phase 5 (integration). The expert will be a stub.
4. If interview answer was "Light research," do a quick scan of official docs only — skip community guides and deep dives.

### phase 3 — draft

Write the expert file following the canonical section layout from the expert structure reference below.

1. **`## purpose`** — One line. What does this expert cover?
2. **`## rules`** — Numbered list of actionable imperatives. Minimum 8 rules for a non-stub expert. Each rule should cite its source (doc link or observed SDK behavior).
3. **`## interview`** (optional) — Include only if the expert requires developer decisions before implementation. Follow the AskUserQuestion format shown in the expert structure reference below.
4. **`## patterns`** — Code snippets showing canonical usage. Each snippet is self-contained with imports. Minimum 2 patterns for a non-stub expert.
5. **`## pitfalls`** — Non-obvious mistakes, breaking changes, version gotchas.
6. **`## references`** — URLs to official docs and SDK source used during research.
7. **`## instructions`** — When to use this expert, what it pairs with (`Pair with: {other-expert}`).
8. **`## research`** — The Deep Research prompt (preserved for future re-research).

### phase 4 — validate

Run through this checklist before considering the expert done:

- [ ] **Minimum depth**: 8+ rules, 2+ patterns (unless intentionally a stub).
- [ ] **Pattern isolation**: Every code snippet compiles in isolation (imports included, no "see above").
- [ ] **No fabrication**: Every API signature confirmed via research. Unverified claims marked `[unverified]`.
- [ ] **File size**: Under 300 lines. If over, identify split points.
- [ ] **Section completeness**: All required sections present (`purpose`, `rules`, `instructions`, `research`). Optional sections either fully populated or entirely absent.
- [ ] **Rules are imperatives**: Each rule tells the reader what to do/avoid, not what "is" or "exists."
- [ ] **Pitfalls are non-obvious**: No trivial advice. Each pitfall would surprise a competent developer.
- [ ] **Cross-references set**: `## instructions` includes `Pair with:` entries for related experts.

### phase 5 — integrate

Wire the new expert into the routing system so it's reachable:

1. **Domain `index.md`** — Open the target domain's `index.md`:
   - Add the file to the appropriate task cluster's `Read:` list (or create a new cluster with a `When:` description).
   - Add `Depends on:` / `Cross-domain deps:` if applicable.
   - Add the filename to `## file inventory` in alphabetical order.
2. **Root `index.md`** — Open `.experts/index.md`:
   - If the new expert introduces signal words not already in the domain's `Signals:` line, add them.
   - If this is a new domain, add a full routing entry under `## routing rules`.
3. **Verify routing** — Mentally trace a request that should reach this expert: root router signals → domain router → task cluster → expert file. Confirm the path is unbroken.

## expert structure reference

This is the canonical section layout every expert must follow. Required sections are marked; optional sections should be omitted entirely if not needed.

```
# {topic}-ts | {topic}                    ← filename without .md

## purpose                                 ← REQUIRED. One line.

## rules                                   ← REQUIRED. Numbered imperatives.

## interview                               ← OPTIONAL. Delete if no upfront decisions needed.
### Q1 — {Decision}
(AskUserQuestion format)
### defaults table
(Required if interview exists)

## patterns                                ← REQUIRED for non-stubs. Code snippets.

## pitfalls                                ← RECOMMENDED. Non-obvious gotchas.

## references                              ← RECOMMENDED. Source URLs.

## instructions                            ← REQUIRED. When to use, Pair with.

## research                                ← REQUIRED. Deep Research prompt.
```

## pitfalls

- **Creating experts for one-off knowledge.** If the topic won't come up again, don't create an expert. Add a note to the relevant domain expert or CLAUDE.md instead.
- **Skipping integration (phase 5).** The most common failure mode. An expert that isn't wired into the routing system is invisible and will never be loaded.
- **Writing rules from memory without research.** Even experienced developers misremember API details. Always verify against current docs — APIs change between SDK versions.
- **Cramming multiple topics into one file.** An expert on "state management and adaptive cards and function calling" should be three experts. The scope test: can you describe it without "and"?
- **Empty optional sections.** An empty `## pitfalls` section signals the author didn't try. Either populate it with real gotchas or omit the section entirely.
- **Forgetting the language suffix decision.** A TypeScript-specific expert named `caching.md` (without `-ts`) will confuse future users about whether it's language-agnostic. Be deliberate about the naming.

## instructions

Use this expert when creating any new micro-expert file.

**Trigger phrases:** "create expert," "new expert," "build expert," "add expert," "make expert," "write expert."

Pair with: `fallback.md` (if the builder is invoked because fallback detected a knowledge gap that warrants a new expert).

## research

Deep Research prompt:

"Write a meta-expert for creating micro-expert prompt files in a modular AI expert system. Cover: scoping criteria (when to create vs. update), research methodology (web search strategies for SDK docs, source code, type definitions), canonical section layout for expert files, quality validation checklists (minimum rules, pattern isolation, no fabrication), integration steps (domain router wiring, signal word updates), and common failure modes in expert authoring. Include guidance on language-agnostic vs. language-specific naming conventions."
