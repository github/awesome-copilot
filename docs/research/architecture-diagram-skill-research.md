# Research: Markdown-first, architecture-first diagram-generation skill

Date: 2026-11-14. Repo commit inspected: `8ecd5b17`. Scope: C4 and complementary diagrams, Markdown renderer tradeoffs, skill precedents, contribution requirements. The skill is **not** implemented here.

## Recommendations (summary)

1. **Model first, render second.** C4 is "abstraction-first" and notation independent ([abstractions](https://c4model.com/abstractions), [notation](https://c4model.com/diagrams/notation)). The skill should have the agent identify people/systems/containers/components from the code or request *before* choosing syntax.
2. **Default to System Context + Container.** c4model.com says you "don't need to use all 4 levels" and that those two "are sufficient for most software development teams" ([diagrams](https://c4model.com/diagrams)). Context is "recommended for all" ([system-context](https://c4model.com/diagrams/system-context)). Deployment is marked "Yes" recommended ([deployment](https://c4model.com/diagrams/deployment)).
3. **Treat Dynamic as optional and Code as discouraged.** Dynamic: "No… used sparingly" ([dynamic](https://c4model.com/diagrams/dynamic)). Code: "not recommended for anything but the most important or complex components", ideally tool-generated ([code](https://c4model.com/diagrams/code)).
4. **Complementary Mermaid types** (use only when they answer a question C4 does not):
   - Runtime interaction → `sequenceDiagram` (C4 says dynamic diagrams are similar to UML sequence diagrams and either style is fine: [dynamic](https://c4model.com/diagrams/dynamic)).
   - Lifecycle/status → `stateDiagram-v2` ([Mermaid state](https://mermaid.js.org/syntax/stateDiagram.html)).
   - Data model → `erDiagram` ([Mermaid syntax ref](https://mermaid.js.org/intro/syntax-reference.html) shows an ER example); C4's code level itself names "entity relationship diagrams" ([code](https://c4model.com/diagrams/code)).
   - Process/flow → `flowchart` (GitHub's own example, [GitHub docs](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)).
   - Cloud topology → Mermaid `architecture-beta` is an option but **beta** and "may still change in a backwards-incompatible way" ([Mermaid architecture](https://mermaid.js.org/syntax/architecture.html)). Prefer C4 deployment or a flowchart with subgraphs for stability (my inference).
5. **Enforce C4 notation rules in the skill's checklist** (from [notation](https://c4model.com/diagrams/notation)): title with type and scope; key/legend; every element typed and described; containers/components carry technology; every line is unidirectional and labelled (avoid bare "Uses"); inter-container lines name the protocol. The site also has a [review checklist](https://c4model.com/diagrams/checklist).

## Markdown renderer / tool tradeoffs

| Option | Evidence | Tradeoff |
|---|---|---|
| Mermaid fenced block ```` ```mermaid ```` | GitHub renders it in Markdown files, issues, PRs, wikis, discussions ([GitHub docs](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)). | Zero-install, diffable text. GitHub's Mermaid version can lag; the docs advise running a `mermaid` block containing `info` to check the version. Third-party Mermaid plugins may cause errors (same page). |
| Mermaid native C4 (`C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment`) | Supported; syntax is PlantUML-compatible ([Mermaid C4](https://mermaid.js.org/syntax/c4.html)). | The page says layout is **not** automatic: shape position follows statement order, tuned via `UpdateLayoutConfig`; sprites, tags, links and legends are unsupported ("not supported in the short term"). Fixed styling. So C4 legend rules must be met manually (e.g. a Markdown legend table beside the diagram). I did not verify any beta flag for C4 (see follow-up: none appears in the doc source). |
| Mermaid `flowchart` with C4 conventions | Inference, not a documented Mermaid feature. | Automatic layout and widest support; gives up C4 keywords. A reasonable fallback if C4 layout is poor. |
| Structurizr DSL | Text DSL that defines a C4-based model ([docs](https://docs.structurizr.com/dsl)). | One model yields many views, but needs Structurizr tooling to render; not shown inline on GitHub. Good optional "export" target, not the default. |
| draw.io / Excalidraw | Existing skills in this repo (below). | Visual editing, but XML/JSON files; poor review diffs; not Markdown-first. |

Syntax caveat from Mermaid: "Unknown words and misspellings will break a diagram, while parameters silently fail" ([syntax reference](https://mermaid.js.org/intro/syntax-reference.html)). The skill should tell the agent to validate (e.g. a render check) where tooling exists, and avoid `{}` inside `%%` comments (same page).

## Existing precedents

In this repo (`skills/`, inspected locally):
- `architecture-blueprint-generator` – takes a `${DIAGRAM_TYPE="C4|UML|Flow|Component|None"}` variable but only a few lines of generic diagram guidance (`SKILL.md` lines 11, 42-46); no C4 level selection or notation rules. This is the gap.
- `excalidraw-diagram-generator` – SKILL.md plus `references/`, `scripts/`, `templates/` (flowchart, sequence, ER, class, data-flow, swimlane).
- `drawio` / `draw-io-diagram-generator` – XML output and PNG/SVG export script.
- `plantuml-ascii` – text-mode diagrams; frontmatter includes `license` and `allowed-tools`.
- `markdown-to-word-mermaid` – Mermaid-fence export with `scripts/`, `tests/`, `references/`, `assets/`; shows a bundled-resource layout and a "Not for…" boundary in its description.
- `create-architectural-decision-record`, `azure-architecture-autopilot` – related architecture skills to cross-link rather than duplicate.
- No existing skill's SKILL.md contains `C4Context`, `C4Container`, or `structurizr` (grep of `skills/*/SKILL.md`).

Community (found via `gh search code "c4" --filename SKILL.md`; not vetted for quality or licence):
- [droosma/skills `skills/c4/SKILL.md`](https://github.com/droosma/skills/blob/main/skills/c4/SKILL.md) – separates *what to draw* (C4 modelling workflow, level selection, reverse-engineering a repo) from *rendering* (defers to a separate `mermaid` skill and `references/output-formats.md`). Closest match to the proposed design.
- [resilens/agentskills `c4-diagrams`](https://github.com/resilens/agentskills/tree/main/c4-diagrams) – SKILL.md with `assets/`, `references/`, `scripts/`, `Makefile`.
- `xfstudio/skills`, `n2g7/agent-skills`, `jsoehner/skills-backup` – per-level skills (`c4-context`, `c4-code`). Per-level splitting is an alternative to one skill; not read.

## Contribution requirements (CONTRIBUTING.md / AGENTS.md)

- Skills live in `skills/<name>/SKILL.md`; create with `npm run skill:create -- --name <skill-name> --description "<…>"`. `name` must match the folder (lowercase, hyphens); `description` non-empty; assets < 5 MB each and referenced from SKILL.md; then `npm run skill:validate` and `npm run build` to regenerate README tables (CONTRIBUTING.md, "Adding Skills", ~lines 133-140).
- Not accepted: content that "duplicate[s] existing model strengths without meaningful uplift" (generic guidance). Implication: encode the specific value-add (C4 level selection, notation checklist, renderer limits, validation), not "how to write Mermaid". Also no Responsible-AI/security bypasses (CONTRIBUTING.md rejection list).
- Quality guidelines: be specific, test with Copilot, keep focused (CONTRIBUTING.md).
- Plugins are separate (`plugin.json`; CI runs `vally lint` incl. Agent Skills spec); only relevant if bundled later.
- Overlap risk: `architecture-blueprint-generator` and the diagram skills above; the PR description should state the distinction.

## Note location

No research-note convention exists in this repo: `docs/` only holds generated `README.*.md` indexes and a `.gitkeep`. This note is placed in a new `docs/research/` folder. It is not a skill, agent or instruction, so it should probably stay out of the skill's PR. `npm run build` was not run to check whether it affects generated docs.

## Follow-up (2026-11-14): full Mermaid C4 source and droosma/skills C4 skill

Sources read in full: Mermaid's C4 doc source, [`packages/mermaid/src/docs/syntax/c4.md`](https://github.com/mermaid-js/mermaid/blob/develop/packages/mermaid/src/docs/syntax/c4.md) on `develop` (the file behind https://mermaid.js.org/syntax/c4.html); and `skills/c4/SKILL.md` in [droosma/skills](https://github.com/droosma/skills) (blob SHA of last commit touching it: `8765e072`), plus its README and repo tree.

### Mermaid C4: what the full doc substantiates

- **Five diagram keywords:** `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment`. There is **no** keyword for System Landscape or Code. Use `classDiagram`/`erDiagram` for code level, and C4Context (or a flowchart) for landscape. (The second half is my inference.)
- **No beta/experimental marker** appears anywhere in the doc. This resolves my earlier uncertainty. It does say "unfinished features are not supported in the short term".
- **No automatic layout:** "The position of shapes is adjusted by changing the order in which statements are written." `UpdateLayoutConfig($c4ShapeInRow, $c4BoundaryInRow)` has defaults 4 and 2. `Lay_U/D/L/R` are not planned.
- **Unsupported (unchecked in the doc):** sprites, tags, links, legend, `AddElementTag`, `AddRelTag`, `RoundedBoxShape`, `EightSidedShape`, `DashedLine`, `DottedLine`, `BoldLine`. The doc's own Container example passes `$tags="v1.0"`, but tags are listed as unsupported, so don't rely on them. **Legends must be written manually.** This supports the earlier "manual legend" recommendation.
- **`UpdateElementStyle` / `UpdateRelStyle` are supported** and create no legend entry. Colour coding therefore needs a legend in surrounding Markdown (C4 notation requires a key: https://c4model.com/diagrams/notation). `UpdateRelStyle` also takes `$offsetX/$offsetY` to nudge labels, which is the main manual layout lever.
- **Dynamic diagrams:** `RelIndex(index, …)` is accepted but "ignores the index parameter"; numbering comes from statement order. Write relationships in sequence order.
- **Deployment:** `Deployment_Node` / `Node` / `Node_L` / `Node_R`, nestable (the example nests device → browser → container). Container-level `Container`/`ContainerDb` go inside nodes.
- **Text wrapping:** since v11.17.1 wrapping is on by default; disable with `config: c4: wrap: false`. Before that it was off by default. Combined with GitHub's possibly older Mermaid, long descriptions may render differently (GitHub's version is still unverified).
- **Syntax:** parameters with `?` can be positional or named with a `$` prefix (e.g. `$offsetY="60"`). The doc points to [C4-PlantUML's README](https://github.com/plantuml-stdlib/C4-PlantUML/blob/master/README.md) for how to write C4 diagrams.

### droosma/skills `c4` skill: what it does, and which of my recommendations it supports

Structure (SKILL.md, full read): 6-step workflow (clarify scope → pick levels → populate abstractions → draw relationships → review checklist → render); a four-level table; a quick abstraction reference; "what makes a good diagram"; "when not to use C4"; a code-to-C4 extraction procedure that cites evidence and flags guesses; and an output-format table. It delegates Mermaid rendering to a separate `mermaid` skill in the same repo. Bundled: `references/` (8 files: c4-model, diagram-types, notation, anti-patterns, code-to-c4, output-formats, when-not-to-use, review-checklist) and `assets/examples/`. I read the references' headers only, not in full.

| Recommendation in this note | Primary-source support | Status |
|---|---|---|
| Model first, render second | c4model.com abstractions/notation; droosma's skill states "this skill focuses on what to put on the diagram … not on how to render it" | **Substantiated** (as a precedent for the design; the principle itself is from c4model.com) |
| Default to Context + Container | https://c4model.com/diagrams ("sufficient for most software development teams"); droosma repeats it | **Substantiated** by c4model.com |
| Dynamic/Deployment/Landscape only when the question needs them; Code only on demand | https://c4model.com/diagrams/dynamic and /code | **Substantiated** by c4model.com. Note c4model.com marks Deployment as "Recommended: Yes"; droosma's skill puts it under "where the question requires them", which is slightly softer. |
| Notation checklist (title, key, typed/described elements, technology, labelled unidirectional lines, protocol) | https://c4model.com/diagrams/notation. droosma's skill attributes its checklist to Simon Brown's book (*Visualising Software Architecture*, Appendix A). | **Substantiated** for the listed items. The skill's extras (≈20 shapes max, "prefer preposition endings", consistent placement across diagrams) were **not found** on the c4model.com pages I read, so I'm not recommending them as C4 rules. They may come from the book, which I did not read. |
| Extract architecture from a repo with cited evidence and flagged assumptions | Design precedent only (droosma `SKILL.md`). It is not from any C4 spec. | **Precedent, not a standard.** The file-to-container heuristics (Dockerfile, compose, IaC, SDK imports) are the skill author's, unverified. |
| Split modelling from rendering | Mermaid doc confirms its C4 renderer lacks legend, tags and auto-layout, which is why modelling rules cannot live in the renderer | **Supported** (inference from the two sources) |

### License / provenance caveat for droosma/skills

- The repository has **no licence**: GitHub's license API returns 404 / `license: null` for `droosma/skills`, and the recursive tree has no `LICENSE`, `COPYING` or `NOTICE` file at the root or in `skills/c4/`. The only licence file anywhere is `skills/write-for-audience/references/LICENSE-ste100`, which is unrelated to `c4`. Without a licence, all rights are reserved by default. **Do not copy text, structure, tables or examples from it into awesome-copilot.** Treat it as inspiration for ideas only, and write original content from c4model.com and Mermaid docs.
- **Derived content:** the skill says its notation rules are "straight from the book" and its checklist is "derived from *Visualising Software Architecture* Appendix A", and `assets/examples/` reproduces the book's fictional "Internet Banking System" (the same example also appears in Mermaid's docs). Upstream copyright status of those passages is unclear. This adds a second reason not to copy.
- The README describes the repo as a personal "Dumping ground for some of my custom skills" (GitHub repo description), i.e. a personal config repo, not a published/maintained library.
- c4model.com content licensing was not checked. Citing and linking is fine, but verbatim reuse of its wording or diagrams should be avoided until its licence is confirmed. This matters for the awesome-copilot repo, which has its own `LICENSE`.

## Uncertainties

- GitHub's bundled Mermaid version, and so whether C4 text wrapping, `architecture-beta` or newer themes render there, was not verified; the docs only say to check with `info`.
- I read the `develop`-branch Mermaid doc source. It could differ slightly from a released version's doc. It matched the published page fragments I saw earlier, but I did not diff them fully.
- droosma's `references/*` and `assets/examples/*` were not read in full, so claims about them rest on SKILL.md's description and file headers.
- Other community skills (`resilens`, `xfstudio`, `n2g7`, `jsoehner`) were not read, and their licences are unchecked.
- Structurizr's rendering requirements (Lite/CLI) were not read in detail.
- The ≈20-shape limit and "preposition endings" guidance in droosma's skill are unverified against the C4 book or site.
