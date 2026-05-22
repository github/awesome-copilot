#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Report Templates & Quality Guidelines
Professional templates for different report types
Ensures consistent, high-quality output across all client reports
"""

from typing import Dict, Any, List
from dataclasses import dataclass
from enum import Enum


class ToneGuideline(Enum):
    """Tone guidelines for professional reports"""

    EXECUTIVE = """
    • Professional and confident without being presumptuous
    • Concrete data, not speculation
    • Focus on business value, not technology
    • Short sentences (max 20 words)
    • Active verbs (not passive)
    • Always numbers: "2,345 documents" not "many documents"
    • Avoid: Technical jargon, gray areas, disclaimers
    • Include: Risks/opportunities, timeline, ROI
    """

    TECHNICAL = """
    • Precise and complete
    • Diagrams and code examples
    • Transparency about limitations
    • References to Azure best practices
    • Alternative options when appropriate
    """

    BALANCED = """
    • Mix hard data + business context
    • Accessible for non-technical users
    • Supported with real examples
    • Highlight operational impact
    """


class ReportTemplate:
    """Professional report templates"""

    @staticmethod
    def RAG_IMPLEMENTATION() -> Dict[str, Any]:
        """Template for RAG implementation report"""
        return {
            "title": "Executive Report: Intelligent Search Implementation",
            "sections": [
                {
                    "name": "Executive Summary",
                    "guidelines": """
                    - 2-3 paragraphs max
                    - Answer: What, when, value
                    - Include: Number of documents, timeline, main benefit
                    - Tone: Professional, results-oriented
                    - Example: "2,345 documents indexed in Azure Search,
                      enabling instant search that reduces query time
                      from 15 minutes to 30 seconds."
                    """,
                    "min_words": 150,
                    "max_words": 300,
                },
                {
                    "name": "Current Situation",
                    "guidelines": """
                    - Describe the state before the solution
                    - Include: Document volume, challenges, current costs
                    - Tone: Neutral, fact-based
                    - Use bullets for clarity
                    """,
                    "bullets": 4,
                },
                {
                    "name": "Proposed Solution",
                    "guidelines": """
                    - Explain WHAT was built, not HOW (executive level)
                    - Include: Conceptual architecture, integrations
                    - Optional: Simple diagram
                    - Highlight: Scalability, security, compliance
                    """,
                },
                {
                    "name": "Quantifiable Benefits",
                    "guidelines": """
                    - ALWAYS concrete numbers
                    - Format: "X% reduction in search time"
                    - Include: Productivity, costs, satisfaction
                    - Minimum 3 key benefits
                    - Optional: ROI (if data available)
                    """,
                },
                {
                    "name": "Recommendations",
                    "guidelines": """
                    - 4-5 recommendations max
                    - Structure: [Recommendation] - [Benefit] - [Timeline]
                    - Prioritize: High/Medium/Low
                    - Include estimated costs
                    - Horizon: Short (1mo)/Medium (3-6mo)/Long (6-12mo)
                    """,
                },
                {
                    "name": "Implementation Plan",
                    "guidelines": """
                    - Timeline: Clear phases with duration
                    - Minimum: 4 phases (Setup, Indexing, UAT, Production)
                    - Include: Dependencies, deliverables, owners
                    - Tone: Realistic (better to estimate pessimistically)
                    """,
                },
                {
                    "name": "Risks & Mitigations",
                    "guidelines": """
                    - Be open about risks (builds confidence)
                    - Each risk: description + impact + mitigation
                    - Example: "Risk: Unindexed documents. Mitigation:
                      Format validation, automatic pre-processing"
                    """,
                },
                {
                    "name": "Appendices",
                    "guidelines": """
                    - Technical details, logs, query examples
                    - Detailed architecture (if space available)
                    - Feature matrix
                    - Glossary of terms (if needed)
                    """,
                },
            ],
        }

    @staticmethod
    def QUALITY_CHECKLIST() -> List[str]:
        """Quality checklist before finalizing report"""
        return [
            # Content quality
            "☑ Is each statement supported by data?",
            "☑ Are concrete numbers included (not 'many', 'several')?",
            "☑ Is the executive summary max 300 words?",
            "☑ Are there at least 3 quantifiable benefits?",
            "☑ Are recommendations actionable (not vague)?",

            # Tone & language
            "☑ Is the tone professional yet accessible?",
            "☑ Is technical jargon avoided (or explained)?",
            "☑ Do paragraphs have max 4 lines?",
            "☑ Are active verbs used?",
            "☑ Are bullet points parallel (same structure)?",

            # Structure
            "☑ Is there introduction with context?",
            "☑ Is there clear conclusion with next steps?",
            "☑ Do sections have transitions?",
            "☑ Is there at least 1 diagram/table?",
            "☑ Are titles descriptive?",

            # Professional appearance
            "☑ Are there 0 spelling errors?",
            "☑ Are there 0 punctuation errors?",
            "☑ Is formatting consistent (fonts, sizes)?",
            "☑ Are tables well formatted?",
            "☑ Does the document have a cover page?",

            # Specific to RAG
            "☑ Is the number of indexed documents mentioned?",
            "☑ Is response time (improvement) mentioned?",
            "☑ Is Azure technology justified (not generic)?",
            "☑ Is there security/compliance reference?",
            "☑ Is ROI or final benefit clear?",
        ]


class ContentGuidelines:
    """Specific content guidelines"""

    EXECUTIVE_SUMMARY = """
    RECOMMENDED STRUCTURE (2-3 paragraphs):

    Paragraph 1 - Context:
    "The client had [problem/opportunity] with [X documents/process].
    Implemented [solution] using [key technology]."

    Paragraph 2 - Results:
    "As a result, [impact metric 1], [impact metric 2],
    and [impact metric 3]. ROI is [X]% in [timeframe]."

    Paragraph 3 - Next:
    "Recommend [main action] for [objective]. This requires
    [resources] and [timeline]. Client is ready for [next phase]."

    METRICS TO INCLUDE:
    • Indexed documents: [número]
    • Search time: [before] → [after]
    • Availability: [%]
    • Impacted users: [number]
    • Annual cost: [amount] (if applicable)

    TONE:
    - Confidence without arrogance
    - Facts, not promises
    - Focus on value, not technology
    - Reference to standards (Azure, ISO, etc.)
    """

    RECOMMENDATIONS = """
    STRUCTURE PER RECOMMENDATION:

    [Number]. [Recommendation Title]

    Description: [1-2 sentences about WHAT]

    Benefit: [Concrete impact - use numbers if possible]

    Implementation: [Short/medium/long timeline]

    Estimated investment: [If available]

    Priority: [High/Medium/Low]

    EJEMPLO BIEN HECHO:
    1. Integrate SharePoint with search

    Description: Automatically connect new documents from
    SharePoint to intelligent search, eliminating manual uploads.

    Benefit: Reduces indexing time from 1 hour to 10 minutes,
    ensures documents always updated, eliminates manual failure point.

    Implementation: 2-3 weeks (short term)

    Investment: $0 (leverages existing licenses)

    Priority: High

    EJEMPLO MAL HECHO (evitar):
    "Improve the system" ← vague, not actionable
    "Consider future options" ← not concrete
    "Optimize per needs" ← not specific
    """

    TIMELINE = """
    STANDARD PHASES FOR RAG:

    Phase 1: Preparation (1-2 weeks)
    - Setup Azure, create resources
    - Prepare documents
    - Team training

    Phase 2: Implementation (2-4 weeks)
    - Document indexing
    - Search configuration
    - Parameter tuning

    Phase 3: Validation (1-2 weeks)
    - UAT with users
    - Adjustments per feedback
    - Final documentation

    Phase 4: Production (1 week)
    - Go-live
    - Initial monitoring
    - Handover to support

    TYPICAL TOTAL: 4-8 weeks

    RULE: Always estimate pessimistically (+20%)
    """


class ExampleReports:
    """Real example content (redacted/anonymized)"""

    GOOD_SUMMARY = """
    Implemented an intelligent search system over 2,345 documents
    internal to MENSADEF, covering procedures, legislation, use cases and
    technical analysis. Using Azure OpenAI and Azure Search, the system enables
    instant semantic search reducing query time from 15 minutes
    to 30 seconds, benefiting 200+ users.

    Initial results show 94% of searches return the
    correct document on first result. Validated 500+ use cases
    with 97% precision. System is production-ready and
    scales to 5,000+ documents without architectural changes.

    Recommend: (1) activate search in production next sprint,
    (2) integrate SharePoint in Q3 for corporate documents, (3) expand to
    trend analysis in Q4. Initial $15K investment generates $120K in
    annual savings from search time reduction.
    """

    BAD_SUMMARY = """
    Implemented an AI system using ML and NLP. Indexed documents
    in the cloud. System works well and is scalable. Can do many
    things with this. Recommend implementing soon. Will be useful to users.
    """

    @staticmethod
    def get_feedback():
        """Why GOOD is better than BAD"""
        return {
            "GOOD": [
                "✅ Concrete numbers (2,345, 15min→30s, 200 users, 94%, 97%)",
                "✅ Specific benefit (search time reduction)",
                "✅ Success metric (94% on first result)",
                "✅ Demonstrated scalability (5,000 docs)",
                "✅ Quantified ROI ($120K savings)",
                "✅ Concrete next steps (sprint, Q3, Q4)",
                "✅ Tone: Confidence without arrogance",
            ],
            "BAD": [
                "❌ Jargon without context (ML, NLP, ML)",
                "❌ Adjectives without data (good, scalable, useful)",
                "❌ Total vagueness (many things, soon)",
                "❌ No success metrics",
                "❌ No concrete numbers",
                "❌ No ROI or value",
                "❌ Tone: Unprofessional, unconvincing",
            ],
        }
