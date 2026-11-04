"""Claude Code Skill: Intent Drift Analyzer

A skill that analyzes intent drift in AI-assisted development using the
Intent Alignment Engine.

This package lives in the skill folder alongside SKILL.md. The Intent
Alignment Engine is installed as the `intent-drift` package.
"""

from intent_alignment.engine import IntentAlignmentEngine
from intent_alignment.models import AlignmentContext, AlignmentReport

__version__ = "1.0.0"
__author__ = "Intent Alignment Engine Team"

__all__ = [
    "AlignmentContext",
    "AlignmentReport",
    "IntentAlignmentEngine",
    "analyze_code",
]


def analyze_code():
    """Return a ready-to-use IntentDriftAnalyzer."""
    from analyzer import IntentDriftAnalyzer

    return IntentDriftAnalyzer()
