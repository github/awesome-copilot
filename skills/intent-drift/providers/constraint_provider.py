"""Evidence provider that analyzes constraint compliance."""

from typing import Any

from intent_alignment.models import Evidence

from .base import EvidenceProvider


class ConstraintProvider(EvidenceProvider):
    """Analyzes constraint compliance and violations."""

    def __init__(self) -> None:
        """Initialize the constraint provider."""
        super().__init__(name="constraint_provider", weight=0.20)

    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence about constraint compliance.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of evidence items about constraint compliance
        """
        original_goal = context.get("original_goal", {})
        current_plan = context.get("current_plan", {})

        evidence = []

        # Get constraints and current plan details
        original_constraints = original_goal.get("constraints", [])
        current_steps = current_plan.get("steps", [])

        if not original_constraints:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=100.0,
                    confidence=0.5,
                    details="No constraints specified in original goal",
                )
            )
            return evidence

        # Analyze constraint compliance
        satisfied = 0
        violated = 0

        for constraint in original_constraints:
            # Simple keyword matching for demonstration
            # In a real implementation, this would use NLP to parse constraints
            constraint_keywords = set(constraint.lower().split())

            # Check if constraint appears in current plan
            plan_text = " ".join(current_steps).lower()
            constraint_present = any(
                keyword in plan_text
                for keyword in constraint_keywords
                if len(keyword) > 3  # Ignore very short words
            )

            if constraint_present:
                satisfied += 1
            else:
                violated += 1

        # Calculate compliance score
        total_constraints = len(original_constraints)
        if total_constraints == 0:
            compliance_score = 100.0
        else:
            compliance_score = (satisfied / total_constraints) * 100

        # Generate evidence based on compliance
        if violated == 0:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=compliance_score,
                    confidence=0.9,
                    details=f"All {total_constraints} constraints are fully satisfied",
                )
            )
        elif satisfied > 0:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=compliance_score,
                    confidence=0.7,
                    details=f"{satisfied} of {total_constraints} constraints satisfied, {violated} violated",
                )
            )
        else:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=0.0,
                    confidence=0.8,
                    details=f"0 of {total_constraints} constraints satisfied, {violated} violated",
                )
            )

        # Add evidence about constraint strictness
        strict_constraints = [
            c
            for c in original_constraints
            if any(word in c.lower() for word in ["must", "cannot", "required", "mandatory"])
        ]
        if strict_constraints:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=min(100.0, len(strict_constraints) * 20),
                    confidence=0.6,
                    details=f"{len(strict_constraints)} strict constraints require careful adherence",
                )
            )

        return evidence
