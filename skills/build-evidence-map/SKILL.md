---
name: build-evidence-map
description: 'Build an auditable evidence map for a contested technical choice, research synthesis, proposal review, or consequential decision. Use when Copilot must preserve supporting, contradicting, qualifying, and missing evidence with exact source regions instead of collapsing disagreement into prose.'
---

# Build Evidence Map

Turn one contested question into a portable decision artifact that shows what
supports the current position, what pushes against it, and what remains unknown.
Do not use a graph to decorate an answer that has not been sourced.

For a simple factual claim or a general fact-checking request, use a verification
workflow such as `doublecheck` instead. Use this skill when the relationships
between evidence, intermediate claims, trade-offs, and missing facts matter.

## Workflow

1. **Frame one decision.** Write one falsifiable question and one provisional
   position. Narrow the question until a reader can identify what action or
   belief the map is testing.
2. **Collect bounded source regions.** Prefer direct observations and primary
   sources. Record the URL or absolute local path, publisher, publication date,
   retrieval date, section/page/line/timestamp locator, and a short checkable
   excerpt. Read [references/evidence-ladder.md](references/evidence-ladder.md)
   when source quality is disputed.
3. **Atomize the reasoning.** Create only four node types:
   - `position`: the single current verdict;
   - `claim`: an intermediate proposition;
   - `evidence`: a faithful statement of one source region;
   - `unknown`: a specific missing fact that could change the verdict.
4. **Type every edge.** Use `supports`, `contradicts`, `qualifies`, or
   `missing`. Add a plain-language note explaining why the source node bears on
   the target. Topical similarity is not support. Different scope, date, or
   population is not automatically a contradiction.
5. **Preserve counterevidence.** Do not delete contrary evidence because the
   provisional verdict survives it. Represent scope differences with
   `qualifies` edges.
6. **Express uncertainty structurally.** Do not invent confidence percentages.
   Add an `unknown`, narrow the position, or qualify a claim.
7. **Write UTF-8 JSON** with a `.doubt.json` suffix. Follow
   [references/map-schema.md](references/map-schema.md). Keep IDs short,
   stable, and semantic.
8. **Validate fail-closed.** Resolve
   `scripts/validate.mjs` relative to this `SKILL.md`, then run it with Node.js
   18 or newer:

   ```bash
   node <skill-directory>/scripts/validate.mjs decision.doubt.json
   ```

   The bundled validator uses only Node.js built-ins and does not require npm or
   network access. Fix every finding before reporting success. Only say the map
   is valid when the command exits `0` and prints `VALID` followed by a
   64-character receipt. A file hash, node count, JSON parse, or manual schema
   review is not a Doubt receipt. If deterministic validation cannot run, report
   that block instead of inventing success.

   Render the validated map only when the user has already installed
   `doubt-ai@0.8.0`; do not install or execute a remote package implicitly:

   ```bash
   doubt map decision.doubt.json --out decision.html
   ```
9. **Verify source snapshots only with explicit network permission.** The
   following command retrieves each recorded HTTP(S) source and fails closed if
   an excerpt cannot be matched:

   ```bash
   doubt verify decision.doubt.json \
     --out decision.verified.doubt.json
   ```

   Never run this command implicitly. Local file verification does not use the
   network. Do not write a `verification` object by hand or hide a mismatch.
10. **Inspect the deliverable.** Confirm that the question, verdict,
    counterevidence, unknowns, edge notes, and exact source regions remain
    readable. Treat JSON as the canonical editable artifact; HTML is a
    shareable view.

## Quality gates

A finished map must satisfy all of these:

- exactly one `position` has incoming reasoning;
- every evidence node names one source and participates in an edge;
- every source is used and has dates, a bounded locator, and a substantive
  excerpt;
- every non-position node has a directed path to the position;
- the reasoning graph has no duplicate edges or directed cycles;
- contrary or qualifying evidence is present when the source set contains it;
- each decision-changing gap is an explicit `unknown` node;
- every edge note explains support, contradiction, qualification, or absence;
- the verdict is no broader than the evidence.

## Deliver the result

Report:

- the current position in one sentence;
- the strongest counterevidence or qualification;
- the most important unresolved unknown;
- paths to the canonical JSON and any rendered HTML;
- whether deterministic validation and explicit source verification ran.

Never describe a structurally valid map as proven true. Validation establishes
traceability and graph integrity; source quality and inference quality still
require human review.
