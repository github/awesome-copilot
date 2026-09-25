---
# shepherd-task-version: 1.0.5
name: shepherd-task-10-create-ignorance-reduction-plan
description: 'Stage 10 of the shepherd-task campaign lifecycle (campaign planning). Use this skill when creating a new ignorance reduction plan — a structured document that maps unknowns, spikes, and phased implementation steps for a multi-day engineering campaign. Skip this stage when suitable implementation issues already exist.'
---

# Skill: Create Ignorance Reduction Plan (shepherd-task stage 10 — campaign planning)

## Purpose

This is stage 10 of the ordered shepherd-task campaign lifecycle (00 → 10 → 15 → 20 → 25 → 30 → 40 → 50): campaign planning. Generate a structured **ignorance reduction plan** — a markdown document that identifies unknowns, formulates precise questions, and lays out phased implementation steps for a multi-day engineering campaign. The plan is created with **empty Resolution sections**; a human expert later fills in each resolution, sometimes producing engineering "spike" work that resides alongside the plan.

This stage (and stage 20) is only needed when a campaign does not yet have an ordered set of implementation issues. If suitable issues already exist, skip directly to stage 30 (`shepherd-task-30-from-assignment-to-ready`).

## Inputs

- `FILENAME`: The full relative path for the output markdown file. Its basename must end in `ignorance-reduction-plan.md` (e.g., `my-project/1234-feature-remove-before-merge/1234-ignorance-reduction-plan.md`) so stage 20 can discover it without an interview.
- `CONTEXT`: The user will have already loaded sufficient context (chat history, ADRs, issues, PRs, prior plans) into the conversation before invoking this skill. The skill uses that loaded context to formulate high-quality questions.

## Prerequisites

- The LLM must already have enough context loaded to reason deeply about what is being built. This skill does NOT gather context — it synthesizes what is already available into a structured plan.
- The user may specify which phases are already completed (mark them ✅).
- The user may specify constraints on which sections to produce (e.g., "only do phases before Phase 1" or "skip the Completed Phases section").

---

## Output Structure

The generated plan MUST follow the structure below. Study the embedded examples carefully to understand the level of detail, the tone, and the formatting conventions.

### Required Sections (in order)

1. **Title line** — `# Implementation plan: <descriptive title> (<issue/tracking reference>)`
2. **Metadata block** — Human DRI, relevant ADRs/references, issue links, related directories
3. **Goal section** (when the campaign is large enough to warrant one) — concise statement of what success looks like, optionally with a technology stack table and a list of SDK/framework features to exercise
4. **Completed phases** — phases already done, marked ✅, with brief summaries of what was accomplished and decided
5. **Ignorance reduction phase** — exactly one level-two (`##`) heading containing the phrase `Ignorance reduction`. This is the core of the plan. It contains a numbered list of questions/spikes, each with:
   - `### N.M — Short title`
   - `**Question:** <precise question about an unknown>`
   - Context paragraph explaining why this matters, options considered, trade-offs
   - Optional table of options
   - `**Spike needed:**` (when hands-on verification is required)
   - `**Recommendation:**` (the plan author's suggested answer, when one exists)
   - `**Resolution:**` (LEFT EMPTY — the human fills this in later)
6. **Implementation phase** — exactly one level-two (`##`) heading containing the word `Implementation` that has direct level-three (`###`) task headings beneath it. Other level-two headings may mention implementation only when they have no direct task headings. Put every ordered build step directly beneath the implementation phase heading. Each step includes:
   - What to build
   - Files to create/modify
   - Tests to write
   - Gating criteria
7. **Optional trailing sections** — Documentation phase, reference material, cross-cutting concerns

---

## Key Principles for Question Quality

1. **Be specific** — "How should X work?" is too vague. "Should `@Foo` use `RUNTIME` or `SOURCE` retention, given that ADR-005 says 'compile-time preferred, runtime fallback'?" is good.
2. **Show your work** — Each question should include the options you've identified, the trade-offs, and a recommendation when possible.
3. **Include code sketches** — When the question is about API shape, include proposed code.
4. **Identify spikes** — When a question can only be answered by writing code, say "**Spike needed:**" and describe what to verify.
5. **Order questions by dependency** — Earlier questions inform later ones.
6. **Be exhaustive but not redundant** — Cover every genuine unknown; skip things that are already decided in ADRs or prior phases.

---

## Embedded Examples

Before creating a plan, read and study
[`references/embedded-examples.md`](references/embedded-examples.md). It contains
three completed plans that define the required depth, formatting, question
quality, and tone. For every new plan, keep all implementation-gating
**Resolution:** sections empty for the human to complete.

## Procedure

When this skill is invoked:

### Step 1: Verify context is sufficient

Before generating the plan, confirm that you have enough loaded context to formulate **specific, actionable questions**. The questions must be grounded in real code, real APIs, real trade-offs — not generic placeholders.

If context is insufficient, tell the user what additional context you need before proceeding.

### Step 2: Identify the plan structure

Based on the user's instructions, determine:
- What phases are already completed (mark ✅)
- What the ignorance reduction questions should cover
- What implementation phases follow
- Any constraints the user specified (e.g., "only phases before Phase 1")

### Step 3: Generate the plan

Write the ignorance reduction plan to the specified `FILENAME`. Follow these rules:

1. **All `Resolution:` sections must be empty** (no text after the label).
2. **Questions must be specific and grounded** in the loaded context — reference actual class names, method signatures, ADRs, configuration options, etc.
3. **Include code sketches** where relevant (proposed API shapes, configuration examples).
4. **Include tables** for comparing options.
5. **Mark spikes** when a question requires hands-on verification.
6. **Include recommendations** — your best assessment of the right answer, clearly labeled as a recommendation (the human may disagree).
7. **Order questions by dependency** — answers to earlier questions inform later ones.
8. **Implementation phases** should have concrete file paths, gating criteria, and test descriptions.
9. **Use the exact formatting conventions** shown in the examples (heading levels, bold labels, horizontal rules, code fences).

### Step 4: Confirm completion

After writing the file, report:
- The filename written
- The number of ignorance reduction questions generated
- A one-line summary of the plan's scope

---

## Anti-patterns to avoid

- ❌ Generic questions like "What framework should we use?" (this should already be decided)
- ❌ Questions that are already answered in loaded ADRs or prior plans
- ❌ Filling in Resolution sections (they must be empty)
- ❌ Skipping code sketches for API design questions
- ❌ Vague implementation phases without file paths or gating criteria
- ❌ Producing a plan without sufficient context (ask for more context instead)
