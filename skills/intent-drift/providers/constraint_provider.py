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

        # Analyze constraint compliance.
        # NOTE: a constraint *mention* in the plan is NOT proof of compliance.
        # The plan may omit the constraint, contradict it, or negate it
        # (e.g. "Do not remove authentication" vs a step that says "Remove
        # authentication"). Mentions are reported as unverified; actual
        # compliance requires evidence that the plan addresses the constraint.
        satisfied = 0
        violated = 0
        unverified = 0

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
                # A mention is unverified unless the plan positively addresses
                # the constraint; negated or absent plans are violations.
                if self._addresses_constraint(constraint, " ".join(current_steps)):
                    satisfied += 1
                else:
                    unverified += 1
            else:
                violated += 1

        # Calculate compliance score
        total_constraints = len(original_constraints)
        compliance_score = (
            (satisfied / total_constraints) * 100 if total_constraints else 100.0
        )

        # Generate evidence based on compliance
        if total_constraints == 0:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=100.0,
                    confidence=0.5,
                    details="No constraints specified in original goal",
                )
            )
        elif unverified == total_constraints:
            # Every constraint was only mentioned, not verified as addressed.
            evidence.append(
                Evidence(
                    source=self.name,
                    value=compliance_score,
                    confidence=0.4,
                    details=(
                        f"{total_constraints} constraints mentioned but none verified as "
                        "addressed; compliance cannot be assessed"
                    ),
                )
            )
        elif violated == 0 and unverified == 0:
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
                    details=(
                        f"{satisfied} of {total_constraints} constraints satisfied, "
                        f"{violated} violated, {unverified} unverified"
                    ),
                )
            )
        else:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=0.0,
                    confidence=0.8,
                    details=(
                        f"0 of {total_constraints} constraints satisfied, "
                        f"{violated} violated, {unverified} unverified"
                    ),
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

    def _addresses_constraint(self, constraint: str, plan_text: str) -> bool:
        """Return True when the plan positively addresses the constraint.

        A bare mention is not sufficient: a negated or absent action leaves the
        constraint unverified rather than satisfied.
        """
        plan_lower = plan_text.lower()
        constraint_lower = constraint.lower()

        negation_phrases = ("do not", "don't", "cannot", "must not", "prohibit", "avoid")
        if any(phrase in plan_lower for phrase in negation_phrases):
            # The plan explicitly negates / avoids — unverified, not satisfied.
            return False

        filler = {
            "do",
            "must",
            "should",
            "need",
            "to",
            "a",
            "an",
            "the",
            "not",
            "cannot",
            "never",
        }
        verbs = {
            "remove",
            "drop",
            "delete",
            "discard",
            "preserve",
            "maintain",
            "keep",
            "ensure",
            "add",
            "implement",
            "include",
            "support",
            "update",
            "change",
            "use",
            "avoid",
        }
        words = [w for w in constraint_lower.replace(",", " ").split() if w not in filler]
        # The constraint's object (e.g. "authentication") is what the plan must
        # act on; the verb may legitimately differ ("preserve" vs "keep").
        target = " ".join([w for w in words if w not in verbs]) or " ".join(words[:3])
        if not target:
            return False

        if any(
            f"{verb} {target}" in plan_lower
            for verb in ("remove", "drop", "delete", "discard")
        ):
            # A destructive step touching the target negates a "do not remove"
            # constraint and cannot count as satisfying it.
            return False

        return any(
            f"{verb} {target}" in plan_lower
            for verb in (
                "add",
                "implement",
                "keep",
                "preserve",
                "retain",
                "protect",
                "ensure",
                "maintain",
                "include",
                "support",
            )
        )
