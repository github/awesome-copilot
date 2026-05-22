---
name: rag-report-generator
description: "Professional executive report generation using Claude Opus 4.7. Generates high-quality DOCX reports with professional formatting, compelling narratives, and quantified impact metrics. Perfect for client presentations and stakeholder communication."
version: "1.0.0"
author: "RAG Framework"
tags: ["reporting", "executive-summary", "docx", "claude", "professional"]
---

# RAG: Professional Report Generator

**Executive Report Generation with AI-Powered Content**

Create professional and high-impact executive reports that defend your RAG implementation to clients and stakeholders.

---

## Purpose

This skill **generates the final document you defend to the client** — a professional DOCX report that presents RAG implementation results with:

- **Professional formatting** — Corporate design, appropriate typography, brand colors
- **AI-powered content** — Claude Opus 4.7 generates compelling narratives and data synthesis
- **Quantified impact** — Numbers, metrics, ROI (not vague promises)
- **Strategic recommendations** — Actionable next steps with timeline and investment
- **Executive tone** — Accessible for C-suite, but credible for technical stakeholders

---

## Features

**Content Generation**
- Executive summary (2-3 paragraphs, AI-written)
- Findings section (synthesized from data)
- Recommendations (strategic, prioritized, costed)
- Implementation timeline (4 phases + details)
- Risk mitigation strategies

**Professional Formatting**
- Corporate design with brand colors
- Table of contents and page breaks
- Professional fonts (Calibri, sized)
- Highlighted information boxes
- Appropriate margins and spacing
- Optional company logo support

**Quality Assurance**
- Quality checklist of 25 points
- Tone validation (professional, accessible)
- Metrics verification (no vague claims)
- Grammar and spelling checks
- Format consistency

**Integrations**
- **Claude Opus 4.7** for high-quality content (strategic reasoning)
- **Azure AI Search** metrics (document count, index size)
- **Azure OpenAI** data (model deployment, token usage)
- **Application Insights** (performance metrics)
- **Cost Analyzer** (ROI calculations)

---

## Quick Start

### Prerequisites

```bash
pip install python-docx openai
```

### Generate Report (Simple)

```python
from report_generator import ExecutiveReportGenerator, ReportMetadata, ReportType
from pathlib import Path

# Initialize
gen = ExecutiveReportGenerator()

# Metadata
metadata = ReportMetadata(
    title="Executive Report: Intelligent Search",
    client_name="MENSADEF",
    project_name="RAG Implementation",
    report_type=ReportType.RAG_IMPLEMENTATION,
)

# Content
content = {
    "executive_summary": "AI-generated summary here...",
    "metrics": {
        "Documents": "2,345",
        "Size": "15.3 GB",
        "Accuracy": "97%",
    },
    "findings_text": "AI-generated findings...",
    "recommendations_text": "AI-generated recommendations...",
}

# Generate
output = gen.generate_report(metadata, content, Path("outputs/report.docx"))
```

### Generate Report (Complete with AI)

```python
gen = ExecutiveReportGenerator()

# Claude Opus 4.7 generates compelling executive summary
summary = gen.generate_executive_summary(
    project_name="RAG MENSADEF",
    document_count=2345,
    total_size_gb=15.3,
    key_findings=["High quality docs", "Well structured", "Automation opportunity"],
    recommendations=["Hybrid search", "SharePoint integration"],
)

findings = gen.generate_findings_section({
    "document_count": 2345,
    "total_size_gb": 15.3,
    "quality": "High",
})

recommendations = gen.generate_recommendations(
    context="RAG project with 2,345 documents"
)

# Assemble report
content = {
    "executive_summary": summary,
    "findings_text": findings,
    "recommendations_text": recommendations,
    "metrics": {...},
    "timeline": {...},
}

report_path = gen.generate_report(metadata, content, Path("outputs/report.docx"))
```

---

## Quality Guidelines

### Executive Summary

**GOLDEN RULES:**
- **2-3 paragraphs MAXIMUM** (200-300 words)
- **Concrete numbers** (2,345 docs, not "many")
- **One value proposition per sentence**
- **Active verbs** (not passive)
- **Business impact first, technology second**

**STRUCTURE:**

```
Paragraph 1: Context (What -> When)
"An intelligent search system has been implemented across 2,345 MENSADEF documents,
integrating procedures, legislation, and technical analysis."

Paragraph 2: Results (How much improvement)
"Reduces search time from 15 minutes to 30 seconds, benefiting 200+ users.
Accuracy: 97% in top results."

Paragraph 3: Next Steps (What's next)
"System ready for production Q2. Recommendations: (1) Activate in sprint,
(2) Integrate SharePoint Q3, (3) Analysis in Q4."
```

### Recommendations

**FORMAT:**

```
[#]. [Action Title]

Description: [WHAT - 1-2 sentences]
Benefit: [IMPACT - with numbers]
Implementation: [TIMELINE - short/medium/long]
Investment: [COST - or "$0 (existing licenses)"]
Priority: [HIGH/MEDIUM/LOW]
```
