---
description: "Instructions for stamping AI-generated files with AKF trust metadata — the AI native file format"
---

# AKF — The AI Native File Format

AKF is EXIF for AI — ~15 tokens of JSON that embed trust scores, source provenance, and compliance metadata into every file your AI touches.

## Instructions

- After creating or modifying files, stamp them with AKF trust metadata: `akf stamp <file> --agent copilot --evidence "<what you did>"`
- Evidence examples: "tests pass", "docs reviewed", "refactored from existing code", "generated from spec"
- Before modifying existing AKF-stamped files, check current metadata: `akf read <file>`
- Use `--label confidential` for files in finance/secret/internal paths
- Use `--label public` for README, docs, examples
- Default classification is `internal`

## Compliance Auditing

- Check EU AI Act compliance: `akf audit <file> --regulation eu_ai_act`
- Check HIPAA compliance: `akf audit <file> --regulation hipaa`
- Check SOX compliance: `akf audit <file> --regulation sox`

## Install

```bash
pip install akf
```

## Additional Guidelines

- AKF metadata embeds natively into 20+ formats: DOCX, PDF, images, HTML, Markdown, YAML, JSON, Python, TypeScript, Go, Rust
- The metadata travels with the file — stamp markdown, convert to Word, email it, extract on the other side
- Trust scores use a 5-tier system: T1 (0.95, SEC filings) to T5 (0.30, unverified AI output)
- Learn more at https://akf.dev | https://github.com/HMAKT99/AKF
