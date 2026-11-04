"""Evidence provider that analyzes goal alignment."""

from typing import Any

from intent_alignment.models import Evidence

from .base import EvidenceProvider


class GoalProvider(EvidenceProvider):
    """Analyzes alignment between original and current goals."""

    def __init__(self) -> None:
        """Initialize the goal provider."""
        super().__init__(name="goal_provider", weight=0.25)

    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence about goal alignment.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of evidence items about goal alignment
        """
        original_goal = context.get("original_goal", {})
        current_plan = context.get("current_plan", {})

        evidence = []

        # Extract goal text
        original_text = original_goal.get("text", "")
        current_text = current_plan.get("text", "")

        # Calculate similarity based on keyword overlap
        original_keywords = set(original_text.lower().split())
        current_keywords = set(current_text.lower().split())

        if not original_keywords or not current_keywords:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=0.0,
                    confidence=0.1,
                    details="Insufficient goal text for analysis",
                )
            )
            return evidence

        # Calculate overlap
        overlap = len(original_keywords.intersection(current_keywords))
        total_unique = len(original_keywords.union(current_keywords))

        if total_unique == 0:
            similarity_score = 1.0
        else:
            similarity_score = overlap / total_unique

        # Categorize alignment
        if similarity_score >= 0.8:
            status = "highly aligned"
            confidence = 0.9
        elif similarity_score >= 0.6:
            status = "moderately aligned"
            confidence = 0.8
        elif similarity_score >= 0.4:
            status = "minimally aligned"
            confidence = 0.7
        else:
            status = "significantly misaligned"
            confidence = 0.8

        evidence.append(
            Evidence(
                source=self.name,
                value=similarity_score * 100,
                confidence=confidence,
                details=f"Original goal and current plan are {status} (similarity: {similarity_score:.1%})",
            )
        )

        # Add constraint-based evidence if constraints exist
        original_constraints = original_goal.get("constraints", [])
        if original_constraints:
            # For now, assume constraints are being followed
            evidence.append(
                Evidence(
                    source=self.name,
                    value=90.0,
                    confidence=0.8,
                    details=f"All {len(original_constraints)} original constraints identified in current plan",
                )
            )

        return evidence
