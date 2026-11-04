"""Evidence provider for identifying problematic findings."""

from typing import Any

from intent_alignment.models import Evidence

from .base import EvidenceProvider


class ProblematicFindingsProvider(EvidenceProvider):
    """Identifies problematic patterns and findings across providers."""

    def __init__(self) -> None:
        """Initialize the problematic findings provider."""
        super().__init__(name="problematic_findings_provider", weight=0.07)

    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence about problematic patterns.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of evidence items about problematic patterns
        """
        original_goal = context.get("original_goal", {})
        current_plan = context.get("current_plan", {})
        execution_context = context.get("execution_context", {})

        evidence = []

        # Extract texts
        goal_text = original_goal.get("text", "").lower()
        plan_text = current_plan.get("text", "").lower()

        # Check for goal abandonment
        if goal_text and plan_text:
            goal_words = set(goal_text.split())
            plan_words = set(plan_text.split())

            if goal_words and plan_words:
                overlap = len(goal_words.intersection(plan_words))
                similarity = (
                    overlap / len(goal_words.union(plan_words))
                    if goal_words.union(plan_words)
                    else 0
                )

                if similarity < 0.3:  # Low similarity suggests drift
                    evidence.append(
                        Evidence(
                            source=self.name,
                            value=max(0, similarity * 100),
                            confidence=0.8,
                            details=f"Low semantic similarity between goal and plan ({similarity:.1%}) suggests significant drift",
                        )
                    )
                elif similarity < 0.5:
                    evidence.append(
                        Evidence(
                            source=self.name,
                            value=similarity * 100,
                            confidence=0.7,
                            details=f"Moderate semantic similarity ({similarity:.1%}) indicates some drift",
                        )
                    )
        # Check for concerning commands
        recent_commands = execution_context.get("recent_commands", [])
        concerning_patterns = ["delete", "remove", "drop", "truncate", "destroy"]
        concerning_count = sum(
            1
            for cmd in recent_commands
            for pattern in concerning_patterns
            if pattern in cmd.lower()
        )

        if concerning_count > 0:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=max(0, 100 - concerning_count * 20),
                    confidence=0.7,
                    details=f"Detected {concerning_count} concerning commands (delete, remove, etc.)",
                )
            )

        # Check for missing success criteria in plan
        success_criteria = original_goal.get("success_criteria", [])
        plan_steps = current_plan.get("steps", [])

        if success_criteria and plan_steps:
            unaddressed = 0
            for criterion in success_criteria:
                # Check if criterion concepts appear in plan
                criterion_lower = criterion.lower()
                plan_text = " ".join(plan_steps).lower()
                if not any(word in plan_text for word in criterion_lower.split() if len(word) > 4):
                    unaddressed += 1

            if unaddressed > len(success_criteria) * 0.5:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=max(0, 100 - unaddressed * 15),
                        confidence=0.8,
                        details=f"More than half of success criteria ({unaddressed}/{len(success_criteria)}) not addressed in current plan",
                    )
                )

        return evidence
