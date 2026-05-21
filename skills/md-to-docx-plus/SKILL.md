---
name: md-to-docx-plus
description: "Convert Markdown files to Word (.docx) with editable OMML math equations. Handles LaTeX formulas ($...$ and $$...$$), producing natively editable equations in Word. Use this skill whenever converting markdown to docx where the content contains math formulas, equations, scientific notation, or LaTeX expressions — even if the user just says 'convert this md to docx' and the file might contain math."
---

# Markdown to Word (.docx) with Editable Equations

Convert Markdown (`.md`) files into professionally formatted Word (`.docx`) documents with **editable OMML equations** derived from LaTeX math notation. Uses Python (`python-docx` + `latex2word` + `latex2mathml`) — no Pandoc, LibreOffice, or MS Office required.

The key difference from `md-to-docx`: LaTeX math expressions (`$inline$` and `$$display$$`) are converted into **native Word OMML equations** that are fully editable in Word's equation editor — not images, not plain text.

## How to Convert

```bash
# Install dependencies (one-time)
pip install python-docx latex2word latex2mathml lxml

# Convert (run from workspace root)
python3 skills/md-to-docx-plus/scripts/md_to_docx_plus.py <input.md> [output.docx]
```

If `output.docx` is omitted, it defaults to `<input-basename>.docx`.

## Skill Folder Contents

| File | Purpose |
|------|---------|
| `SKILL.md` | This instruction file |
| `scripts/md_to_docx_plus.py` | Python Markdown-to-Word converter with equation support |
| `scripts/requirements.txt` | Python dependencies |

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Python** | 3.10+ | Required runtime |
| **python-docx** | 1.1+ | Word document generation |
| **latex2word** | 1.0+ | LaTeX to OMML conversion |
| **latex2mathml** | 3.77+ | LaTeX to MathML (used by latex2word) |
| **lxml** | 5.0+ | XML processing |

Works on Windows, macOS, and Linux. No system-level installs beyond Python packages.

## Features

The converter:

- **Converts LaTeX math to editable Word equations** — `$inline$` and `$$display$$` notation becomes native OMML
- **Extracts YAML front-matter** — uses `title`, `date`, `version`, `audience` for the title page
- **Generates a title page** — with project name, subtitle, date, version, and audience
- **Generates a table of contents** — built from H1-H3 headings
- **Embeds PNG images** — resolves `![alt](path)` references relative to the input `.md` file
- **Styled output** — Calibri body, Cambria Math for equations, Consolas for code, colored headings
- **Handles all Markdown elements** — headings, paragraphs, tables, code blocks, lists, images, links, horizontal rules

## LaTeX Math Support

Inline math uses single `$...$`:

```markdown
The loss function $L = -\sum_{i} y_i \log(\hat{y}_i)$ measures cross-entropy.
```

Display (block) math uses double `$$...$$`:

```markdown
$$
\theta_{t+1} = \theta_t - \alpha \nabla_\theta J(\theta)
$$
```

Both produce **editable OMML equations** in Word — click to edit, same as inserting an equation via Word's ribbon.

Supported LaTeX constructs: fractions, subscripts, superscripts, square roots, summations, integrals, matrices, piecewise functions, Greek letters, operators, limits, and more.

## Front-Matter Format

```yaml
---
title: Project Name — Project Summary
date: 2025-01-15
version: 1.0
audience: Engineering Team
---
```

The title is split on `—` or `–` into main title and subtitle for the title page.
