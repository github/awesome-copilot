"""Evidence provider for checking requirement coverage."""

from typing import Any

from intent_alignment.models import Evidence

from .base import EvidenceProvider


class RequirementCoverageProvider(EvidenceProvider):
    """Analyzes how well requirements are being covered."""

    def __init__(self) -> None:
        """Initialize the requirement coverage provider."""
        super().__init__(name="requirement_coverage_provider", weight=0.10)

    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence about requirement coverage.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of evidence items about requirement coverage
        """
        original_goal = context.get("original_goal", {})
        current_plan = context.get("current_plan", {})

        evidence = []

        # Extract requirements/success criteria
        success_criteria = original_goal.get("success_criteria", [])
        current_steps = current_plan.get("steps", [])

        if not success_criteria:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=100.0,
                    confidence=0.5,
                    details="No specific success criteria defined in original goal",
                )
            )
            return evidence

        # Check how many success criteria are addressed in current plan
        addressed = 0
        for criterion in success_criteria:
            # Simple keyword matching
            criterion_words = set(criterion.lower().split())
            plan_text = " ".join(current_steps).lower()

            # Check if key terms from criterion appear in plan
            matches = sum(1 for word in criterion_words if len(word) > 3 and word in plan_text)
            if matches >= len(criterion_words) * 0.5:  # At least half the words match
                addressed += 1

        coverage_percentage = (
            (addressed / len(success_criteria)) * 100 if success_criteria else 100.0
        )

        if coverage_percentage >= 80:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=coverage_percentage,
                    confidence=0.8,
                    details=f"High requirement coverage: {addressed}/{len(success_criteria)} success criteria addressed",
                )
            )
        elif coverage_percentage >= 50:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=coverage_percentage,
                    confidence=0.7,
                    details=f"Moderate requirement coverage: {addressed}/{len(success_criteria)} success criteria addressed",
                )
            )
        else:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=coverage_percentage,
                    confidence=0.8,
                    details=f"Low requirement coverage: only {addressed}/{len(success_criteria)} success criteria addressed",
                )
            )

        # Check if current plan adds unrelated work
        unrelated_work_indicators = [
            "refactor",
            "cleanup",
            "documentation",
            "testing",
            "optimization",
        ]
        plan_text_lower = " ".join(current_steps).lower()
        unrelated_count = sum(
            1 for indicator in unrelated_work_indicators if indicator in plan_text_lower
        )

        if unrelated_count > 2:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=max(0, 100 - unrelated_count * 10),
                    confidence=0.7,
                    details=f"Current plan includes {unrelated_count} unrelated activities (refactor, cleanup, etc.)",
                )
            )

        return evidence
