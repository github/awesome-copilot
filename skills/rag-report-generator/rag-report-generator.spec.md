# SPEC: RAG Report Generator

**GitHub Spec Kit Enterprise Compliance**

---

## 1. Overview

| Attribute | Value |
|---|---|
| **Name** | rag-report-generator |
| **Purpose** | Generate professional DOCX executive reports |
| **Type** | Output Skill |
| **Tier** | 2 (Important — stakeholder communication) |
| **Input** | Report config (title, findings, metrics) |
| **Output** | DOCX file with professional formatting |

---

## 2. Input/Output Contract

### Input
```json
{
  "title": "RAG Deployment Report",
  "project": "rag-pokemon",
  "findings": "...",
  "metrics": {
    "accuracy": 0.95,
    "cost_savings": 0.75
  }
}
```

### Output
```
rag-pokemon-report-20260515.docx
  ├─ Executive Summary
  ├─ Findings with citations
  ├─ Cost analysis
  ├─ Recommendations
  └─ Appendix
```

---

## 3. Success Criteria

- ✅ DOCX generated with Claude Opus
- ✅ Professional formatting (fonts, margins)
- ✅ Narrative compelling and quantified
- ✅ File < 50MB

---

## 4. Error Handling

| Error | Recovery |
|---|---|
| `GENERATION_TIMEOUT` | Save partial report |
| `INVALID_METRICS` | Use defaults |

---

## 5. Release Gates

- [ ] DOCX opens without errors
- [ ] Formatting correct
- [ ] Content readable
- [ ] All metrics included

---

**Status:** ENTERPRISE READY
**Last Updated:** 2026-05-15
