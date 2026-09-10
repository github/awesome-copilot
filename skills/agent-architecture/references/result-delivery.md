# Completing Design and Diagnosis: PDF and Diagram

This contract applies to results of using agent-architecture on the user's task. A report on developing/updating the skill itself does not replace that result. By default, finish with actual local artifacts, not an offer to export later. Explicit requests for another format or no files take precedence.

## Content by mode

| Mode | Required final PDF content | What the visualization explains |
|---|---|---|
| Design | Goal/requirements and status; selected decisions/alternatives; domain capabilities, methods, context; applicable contracts, limits, authority; populated examples; acceptance/open limitations | Proposed agent, responsibility/data boundaries, main execution path |
| Audit or diagnosis | Object/version/review scope; actual evidence; prioritized findings; failure chain/hypotheses; minimal corrections/closure checks; unknowns/conclusion limits | Actual path, first observable discrepancy, control that missed it; explicitly labeled proposed change |
| Follow-up review | Previous finding statuses, inspected diff/new evidence, closed and still unknown items | Affected path or control change, without a new full redesign |

Scale to the task: a small case may have a compact report. The PDF contains the substantive result, not just a summary linking an absent architecture. Detailed tables/evidence may be appendices or a companion editable document if the PDF makes their purpose and decision links clear. Preserve source links/versions and “requirement / proposal / assumption” and “designed / inspected / verified” statuses. Report date does not replace evidence date. Exclude secrets and sensitive raw data.

## Structure for two readers

Start with a brief **owner decision page**: what changes, first/deferred scope, chosen approach and why, who uses/supports/accepts, deadline/resources (or their unknown status), significant tradeoffs, owner decisions, and next action/owner. For diagnosis, instead of a product plan: what was checked, main conclusion/consequences, first action, and what remains unproven. This page does not replace technical substance or ask for blanket approval of the entire document with one “yes.”

Then build a proportionate technical package in a stable order:

1. **Basis and boundaries:** requirements with sources/IDs, coverage map, assumptions, deferred scope.
2. **Decisions and structure:** components, domain methods/skills, output contracts, existing platform capabilities/additions; diagram, alternatives, selection reasons.
3. **End-to-end work:** populated normal/material failure cases, data/state/authority, human path, control/notification example.
4. **Controls and verification:** applicable budgets and setting consequences, failures/recovery, acceptance criteria/evidence; requirement → decision → check.
5. **Handoff:** independent approval/readiness statuses, blockers/owners, first-scope implementation/validation sequence. This plan does not authorize code.

For audits, keep the same readability principle: basis/scope → actual system → findings/causal chains → correction/validation plan → conclusion limits. Include checked-path coverage; distinguish executed from future checks. Do not replace an audit report with a new design.

A small case may combine sections; do not create empty chapters. A large case may use detailed-contract appendices. One package should let the owner assess decisions and a developer understand the method without inventing missing core work. Entity names, requirement IDs, and statuses must match across summary, tables, and diagrams. Archives, installers, platform profiles, and dozens of template files are not mandatory architecture deliverables.

## Diagram selection

Include applicable new contracts substantively: value and its verification, human decisions, validation loop/Evidence Bundle, checkpoint/handoff, composite version, and disable. In design: decisions/future checks; in diagnosis: actual evidence, unknowns, closure checks. No separate section for every name is required; do not add empty inapplicable chapters. Document and manifest must point to the same current result version.

- For a small agent, workflow, states, and event sequence, use a Mermaid flowchart, state, or sequence diagram.
- For system boundaries, external participants, applications/stores, and responsibilities, use C4 at a suitable level: Context or Container; Component only when it aids a decision. C4 is a view model; Mermaid can be its notation. Do not add C4 levels merely for a complete set.
- In diagnosis, an actual failure sequence is usually more useful than an ideal-system diagram. If showing a correction, distinguish “as is” from “proposed” with labels/notation, not color alone. Do not draw inaccessible internals as established facts. Without traces, visualize known parts and mark unknown segments or show hypotheses.

For validation loops, show placement relative to external effects; for continuation, checkpoint, handoff, and next permissible step; for significant competition/archival, queue, supervisor, and state loading with recovery objectives; for disable, trigger sources and active-operation fate. Show applicable storage, budget, and asynchronous-review decisions. Choose one most useful view, or several if needed, rather than a complete formal diagram set.

The diagram represents the specific agent/failure under consideration, not this skill's generic work process. Use consistent component, action, and state names. Insert a **rendered** diagram with readable labels into the PDF; a Mermaid code block in place of an image does not complete visualization. Retain the `.mmd` source or other used C4 format alongside it for editing.

## Creation and verification

1. Finish substantive content and choose a permitted output directory: the agreed task directory or the environment's normal artifact location. Do not save user reports inside the installed skill or overwrite unrelated files. Local export is part of completion; external uploads/publication need their own authority.
2. Prepare editable text (usually Markdown), diagram source, SVG/PNG, and PDF from one current substantive result. Open questions do not block export: identify impact/readiness. Do not delay the report for another interview or perfect formatting.
3. If a PDF skill is available, read/use it; otherwise use an existing local PDF generator and diagram renderer. An export helper script is allowed and is not implementation of the reviewed agent. Do not bind the process to one provider, OS, or host-specific path; do not send data to a public renderer without permission.
4. After generation, open the PDF, check text, page count, material conclusions, and diagram/document consistency. Render pages and visually inspect Cyrillic text, tables, labels, wrapping, cropping, and diagram readability. Fix discovered defects. A successful generation command does not replace outcome verification.
5. The final answer leads with the main conclusion/work status, then provides access to PDF, editable text, and diagram/source under environment rules. Report only checks actually performed. Do not finish with “I can prepare a PDF” when tools are available.

If PDF creation or rendering is unavailable, deliver completed substantive content, editable text, and diagram source; identify the exact missing mechanism and what remains uncreated/unverified. Do not call Markdown a PDF, claim the package fully ready, or restart requirements gathering. This fallback preserves the result but does not count as successful export.
