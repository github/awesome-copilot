---
name: op
description: 'Create, update, or review an Organizational Procedure (OP) document following the format and conventions used in this repository under docs/OP/. Use when the user asks to write an OP, update an existing OP, reformat an OP from PDF to clean markdown, review an OP for completeness, or cross-reference OP requirements into other documents. Covers the standard OP section structure (Aims, Version Management, Units in Charge, Key Concepts / Process Description, References, Organizational Process Position, Definitions and Acronyms, Annexes) and the formatting pipeline for converting PDF-to-text dumps into publication-ready markdown.'
---

# Organizational Procedure Authoring Skill

You are an expert process architect for the GICT organization. Your job is to produce, update, or reformat Organizational Procedure (OP) documents following the exact conventions used in this repository under `docs/OP/`.

## When to Use This Skill

- User asks to write, update, or review an Organizational Procedure
- User asks to reformat an OP from PDF to clean markdown
- User asks to cross-reference OP requirements into RA or ADR documents
- User mentions "OP", "organizational procedure", "reformat OP", "PDF to markdown", or "OP35"/"OP36"

## Prerequisites

- This repository opened as the active workspace
- Source document (PDF text dump, Word export, or original content) if creating/reformatting
- Familiarity with `docs/OP/` folder and existing OPs

## Context

This repository maintains Organizational Procedures under `docs/OP/`. OPs define roles, responsibilities, and operating methods for GICT processes within the Enel Group. They are **governing documents** that Reference Architectures (RAs) and Architecture Decision Records (ADRs) must comply with.

### Current OPs

| Document | Version | Scope |
|----------|---------|-------|
| [OP35 — Digital Initiatives Activation](in the source repository documentation/OP/OP35-Digital-Initiatives-Activation.md) | v8, 28/05/2025 | Investment activation, Buy/Make framework, initiative approval |
| [OP36 — Solutions Development & Release Management](in the source repository documentation/OP/OP36-Solutions-Development-Release-Management.md) | v7, 11/12/2024 | SDRM lifecycle, design-by-default compliance, Project/Change/Corrective processes |

### Relationship to Other Document Types

- **RA documents** (`docs/RA/`) reference OPs for compliance: OP35 §6.0 governs initiative technical evaluation; OP36 §4.6–§4.13 mandates seven design-by-default requirements.
- **ADR documents** (`docs/ADR/`) reference OPs for Buy/Make decisions and compliance checklists.
- When updating an OP, check whether downstream RA or ADR templates need corresponding updates.

## Before You Start

1. **Read existing OPs** — Scan `docs/OP/` to understand the document conventions and current versions.
2. **Ask clarifying questions** — Use the ask-questions tool to gather:
   - **Action** — Are you creating a new OP, updating an existing one, or reformatting a PDF-to-text dump?
   - **Source** — Is the source a PDF export, a Word document, or original content?
   - **Version** — What version number and date should appear?
   - **Authorized by** — Who authorizes this OP?
   - **Scope** — What GICT process does it govern?
3. **Check downstream references** — If modifying OP35 or OP36, verify that the RA skill (`../.github/skills/ra/SKILL.md`) and ADR skill (`../.github/skills/adr/SKILL.md`) reference the correct section numbers.

## OP Document Structure

Every OP follows this standard section layout:

```markdown
# OP <NN> — <Title>

| | |
|---|---|
| **Version** | <N> — <DD/MM/YYYY> |
| **Classification** | Internal Use |
| **Perimeter** | Global |
| **Service Function** | Global Information and Communication Technology |
| **Authorized by** | <Name> — <Title> |

---

## 1. Document Aims and Application Area

<Purpose of the procedure, applicability scope, and legal compliance note.>

---

## 2. Document Version Management

<Table with columns: Version | Date | Main Changes>

---

## 3. Units in Charge

<Responsible for drawing up and authorizing the document.>

---

## 4. <Key Concepts or Process Description>

<Core content. Subsections use ### headings.
For OP35: Process Description with RACI, Flowchart, Narratives.
For OP36: Key Concepts (§4.1–§4.13) and Process Description (§5).>

---

## 5–N. <Additional Sections>

<References, Organizational Process Position, Definitions and Acronyms.>

---

## Annexes

<## Annex N — TITLE for each annex.>
```

### Heading Hierarchy

| Level | Usage | Example |
|-------|-------|---------|
| `#` | Document title (one per file) | `# OP 36 — Solutions Development & Release Management` |
| `##` | Top-level sections and Annexes | `## 4. Key Concepts`, `## Annex 1 — TITLE` |
| `###` | Sub-sections | `### 4.6 Risk-Based and Cyber Security by Design Approach` |
| `####` | Sub-sub-sections | `#### 5.1.1 Project — SDRM Roles` |
| `#####` | Narrative steps / process steps | `##### 6.0 Evaluation of the technical solution` |

### Front-Matter Table

Every OP starts with a metadata table immediately below the `#` title. Fields:

| Field | Required | Notes |
|-------|----------|-------|
| Version | Yes | Format: `<N> — <DD/MM/YYYY>` |
| Classification | Yes | Typically `Internal Use` |
| Perimeter | Yes | `Global` or specific region |
| Service Function | Yes | `Global Information and Communication Technology` |
| Authorized by | Yes | Full name and title |

## PDF-to-Markdown Conversion Pipeline

When converting OPs from PDF-to-text dumps, follow this pipeline:

### Step 1 — Clean the Source

Create a cleaning script (`scripts/clean_op.py`) that:

1. **Strips repeated PDF headers** — Remove the header block that appears on every page (document title, classification, version info repeated per page).
2. **Strips page footers** — Remove page numbers and footer text (e.g., `<N> of <M>`, `Pag.`).
3. **Collapses excessive blank lines** — Reduce 3+ blank lines to 2.
4. **Preserves content** — Do NOT remove substantive text, tables, or section headers.

Pattern for PDF header detection:
```python
# Headers typically repeat these fields on every page:
# - Document title
# - "Organizational Procedure" or "Procedura Organizzativa"
# - Version/Classification
# - "Internal Use" / "Uso Interno"
```

### Step 2 — Convert to Structured Markdown

Create a formatting script (e.g., `scripts/format_opNN.py`) that:

1. **Normalizes smart quotes** — Convert `\u201c`/`\u201d` (""") to straight `"` and `\u2018`/`\u2019` ('') to straight `'` **early** in the pipeline, before pattern matching.
2. **Converts section headers** — Map ALL-CAPS section titles to `##` headings with proper title case.
3. **Converts sub-section headers** — Map indented or numbered sub-sections to `###`/`####` headings.
4. **Handles ANNEX headers** — Account for leading whitespace: `^\s*ANNEX (\d+)`.
5. **Cleans double-spacing** — PDF extraction often double-spaces words; collapse `  +` to single space **AFTER** all heading conversions to avoid breaking regex patterns.
6. **Adds horizontal rules** — Insert `---` separators before `##` headers.
7. **Collapses blank lines** — Reduce 3+ blank lines to 2.

**Critical ordering**: Smart quote normalization → heading conversions → double-space cleanup → separators → blank line collapse.

### Step 3 — Verify

After conversion, verify:
```bash
# Check all heading levels are present and properly nested
grep -n '^#' docs/OP/OP<NN>-<name>.md

# Check no raw PDF artifacts remain
grep -n 'Internal Use\|Uso Interno\|Pag\.\|of [0-9]' docs/OP/OP<NN>-<name>.md

# Build the site
.venv/bin/zensical build
```

### Known Pitfalls

| Issue | Cause | Fix |
|-------|-------|-----|
| Smart quotes (`""`) not matching regex `"` | PDF extraction preserves Unicode quotes | Normalize `\u201c`/`\u201d` to `"` before matching |
| `ANNEX` headers not converting | Leading spaces from PDF layout | Use `^\s*ANNEX` in regex |
| Double headings (`## 1. ## 1. Title`) | Section map replaces inline occurrences | Use line-anchored regex `re.sub(r'^\s*...\s*$', ..., flags=re.MULTILINE)` |
| Sub-sub-sections (e.g., `5.1.1.`) skipped | Double-space cleanup runs before regex | Move `re.sub(r'  +', ' ', text)` to AFTER heading conversions |
| Tables render as plain text | PDF extraction loses column alignment | Manually reconstruct as Markdown tables |

## Writing Conventions

- **Language**: Match the primary language of the source document. Use English for technical terms and table headers.
- **Tables**: Use Markdown pipe tables for RACI matrices, version management, and structured data. Always include a header row and separator.
- **RACI notation**: R = Responsible, A = Accountable, C = Consulted, I = Informed. Use single letters in tables.
- **Cross-references**: Use `§` prefix for internal section references (e.g., `§4.6`).
- **Dates**: Use `DD/MM/YYYY` format consistent with Enel corporate standards.
- **File naming**: `OP<NN>-<Kebab-Case-Title>.md` (e.g., `OP35-Digital-Initiatives-Activation.md`).

## File Naming

Output files must follow: `docs/OP/OP<NN>-<Kebab-Case-Title>.md`

- `<NN>` = OP number (e.g., `35`, `36`)
- `<Kebab-Case-Title>` = hyphenated title (e.g., `Digital-Initiatives-Activation`)

## Documentation Site Integration

After creating or updating an OP file:

- [ ] Add the file path to the `nav` in `zensical.toml` under the `"Organizational Procedures"` group
- [ ] Add or update the entry in `docs/index.md` under the **Organizational Procedures** section
- [ ] Verify the site builds cleanly: `.venv/bin/zensical build`
- [ ] Check heading structure renders correctly in the built HTML (`public/OP/`)

### Nav Entry Pattern

```toml
{ "Organizational Procedures" = [
    "OP/OP35-Digital-Initiatives-Activation.md",
    "OP/OP36-Solutions-Development-Release-Management.md",
    # Add new OP here, in numerical order
]}
```

## OP35 Quick Reference — Key Sections for Downstream Documents

These OP35 sections are most frequently referenced by RAs and ADRs:

| Section | Content | Referenced By |
|---------|---------|---------------|
| §4.3 Narratives | Full process narrative with 13 steps | RA §21.1 compliance checklist |
| §4.3 / ##### 6.0 | Technical solution evaluation — Buy or Make | RA §9, §21.1; ADR Buy/Make section |
| §4.3 / ##### 9.0 | Investment Memo preparation and approval | RA §18, §21.1 |
| §4.1 RACI Matrix | Roles for each narrative | RA §21.1 unit involvement table |

## OP36 Quick Reference — Design-by-Default Requirements

These OP36 sections define mandatory compliance checks for all Projects and Changes:

| Section | Requirement | Policy Reference | RA/ADR Impact |
|---------|-------------|-------------------|---------------|
| §4.6 | Cyber Security by Design | PL No. 17, OP No. 2420 | RA §10, ADR Non-Functional |
| §4.7 | Digital Accessibility (WCAG 2.1 AA) | PL No. 1142 | RA §14, ADR Non-Functional |
| §4.8 | Personal Data Protection by Design | PL No. 344 | RA §11, ADR Privacy section |
| §4.9 | Adoption by Design | OP36 §4.9 | RA §20, ADR Adoption KPIs |
| §4.11 | Quality Management | ICT OI No. 3703 | RA §13, ADR Quality section |
| §4.12 | Data Security in Non-Production | OP36 §4.12 | RA §10, ADR Non-Functional |
| §4.13 | Intellectual Property by Design | OP No. 2059, OP No. 1785 | RA §9, ADR IP Assessment |

## OP36 Process Types Quick Reference

OP36 §5 defines three SDRM process types, each with its own Roles, RACI Matrix, and Narratives:

| Type | Section | When Used |
|------|---------|-----------|
| **Project** | §5.1 (§5.1.1–§5.1.4) | New solution development, both Waterfall and Agile |
| **Change** | §5.2 (§5.2.1–§5.2.3) | Modifications to existing solutions |
| **Corrective** | §5.3 (§5.3.1–§5.3.3) | Bug fixes and urgent corrections |

## Quality Checklist

Before finalizing, verify:

**Structure**
- [ ] Front-matter metadata table present with all required fields
- [ ] All standard sections present (Aims, Version Management, Units in Charge, etc.)
- [ ] Heading hierarchy is correct (`#` → `##` → `###` → `####` → `#####`)
- [ ] Horizontal rules (`---`) between top-level sections
- [ ] No duplicate headings or raw PDF artifacts

**Tables**
- [ ] RACI matrices use proper Markdown table format
- [ ] Version Management table is complete and chronological
- [ ] All tables have header rows and separator lines

**Content**
- [ ] Smart quotes normalized to straight quotes
- [ ] No double-spaced words (PDF artifact)
- [ ] No page headers/footers remaining
- [ ] Cross-references use `§` notation
- [ ] Annex headers use `## Annex N — TITLE` format

**Integration**
- [ ] File added to `zensical.toml` nav
- [ ] Entry added to `docs/index.md`
- [ ] Site builds without errors
- [ ] HTML output renders headings and tables correctly

## References

- [OP35 — Digital Initiatives Activation](in the source repository documentation/OP/OP35-Digital-Initiatives-Activation.md)
- [OP36 — Solutions Development & Release Management](in the source repository documentation/OP/OP36-Solutions-Development-Release-Management.md)
- [RA Authoring Skill](../ra/SKILL.md) — References OP35/OP36 for compliance
- [ADR Authoring Skill](../adr/SKILL.md) — References OP35/OP36 for compliance
