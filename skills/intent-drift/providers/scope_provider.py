"""Evidence provider that analyzes scope alignment."""

from typing import Any

from intent_alignment.models import Evidence

from .base import EvidenceProvider


class ScopeProvider(EvidenceProvider):
    """Analyzes scope alignment and creep."""

    def __init__(self) -> None:
        """Initialize the scope provider."""
        super().__init__(name="scope_provider", weight=0.15)

    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence about scope alignment.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of evidence items about scope alignment
        """
        original_goal = context.get("original_goal", {})
        current_plan = context.get("current_plan", {})
        execution_context = context.get("execution_context", {})

        evidence = []

        # Extract scope indicators
        original_text = original_goal.get("text", "")
        current_text = current_plan.get("text", "")
        edited_files = execution_context.get("edited_files", [])

        # Analyze scope creep
        # Count unique concepts/areas
        original_concepts = self._extract_concepts(original_text)
        current_concepts = self._extract_concepts(current_text)

        # Check if current work is expanding beyond original scope
        new_concepts = current_concepts - original_concepts
        missing_concepts = original_concepts - current_concepts

        if len(new_concepts) > 3:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=max(0, 100 - len(new_concepts) * 15),
                    confidence=0.8,
                    details=f"Scope expansion detected: {len(new_concepts)} new concepts introduced beyond original scope",
                )
            )
        elif len(new_concepts) > 0:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=80.0,
                    confidence=0.7,
                    details=f"Minor scope expansion: {len(new_concepts)} additional concepts introduced",
                )
            )
        else:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=95.0,
                    confidence=0.9,
                    details="No scope expansion detected; work remains within original boundaries",
                )
            )

        # Check for missing concepts
        if len(missing_concepts) > len(original_concepts) * 0.5:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=max(0, 100 - len(missing_concepts) * 10),
                    confidence=0.7,
                    details=f"Significant scope reduction: {len(missing_concepts)} original concepts not addressed",
                )
            )
        elif len(missing_concepts) > 0:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=75.0,
                    confidence=0.7,
                    details=f"Minor scope reduction: {len(missing_concepts)} original concepts not currently addressed",
                )
            )

        # Analyze file changes
        if edited_files:
            file_count = len(edited_files)
            if file_count > 10:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=max(0, 100 - file_count * 3),
                        confidence=0.6,
                        details=f"Large number of files modified ({file_count}), possible scope creep",
                    )
                )
            elif file_count > 5:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=80.0,
                        confidence=0.7,
                        details=f"Moderate file modifications ({file_count} files)",
                    )
                )
            else:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=95.0,
                        confidence=0.8,
                        details=f"Focused file changes ({file_count} files)",
                    )
                )

        return evidence

    def _extract_concepts(self, text: str) -> set:
        """Extract key concepts from text.

        Args:
            text: Input text to extract concepts from

        Returns:
            Set of concept words
        """
        # Simple concept extraction - in practice would use NLP
        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "shall",
            "can",
            "need",
            "use",
            "using",
            "used",
            "make",
            "made",
            "making",
            "change",
            "changed",
            "changing",
            "add",
            "added",
            "adding",
            "remove",
            "removed",
            "removing",
            "fix",
            "fixed",
            "fixing",
            "improve",
            "improved",
            "improving",
            "optimize",
            "optimized",
            "optimizing",
        }
        words = text.lower().split()
        concepts = {w for w in words if len(w) > 3 and w not in stop_words}
        return concepts
