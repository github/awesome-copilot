"""Evidence provider that analyzes execution patterns."""

from typing import Any

from intent_alignment.models import Evidence

from .base import EvidenceProvider


class ExecutionProvider(EvidenceProvider):
    """Analyzes execution patterns and deviations."""

    def __init__(self) -> None:
        """Initialize the execution provider."""
        super().__init__(name="execution_provider", weight=0.15)

    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence about execution patterns.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of evidence items about execution patterns
        """
        execution_context = context.get("execution_context", {})
        original_goal = context.get("original_goal", {})
        current_plan = context.get("current_plan", {})

        evidence = []

        # Analyze recent commands for alignment with goal
        recent_commands = execution_context.get("recent_commands", [])
        if recent_commands:
            # Analyze command patterns
            goal_keywords = self._extract_keywords(original_goal.get("text", ""))
            plan_keywords = self._extract_keywords(current_plan.get("text", ""))

            command_text = " ".join(recent_commands).lower()
            command_keywords = set(command_text.split())

            # Check if commands align with goal
            goal_overlap = len(goal_keywords.intersection(command_keywords)) if goal_keywords else 0
            plan_overlap = len(plan_keywords.intersection(command_keywords)) if plan_keywords else 0

            if goal_keywords and plan_keywords:
                if goal_overlap > plan_overlap:
                    evidence.append(
                        Evidence(
                            source=self.name,
                            value=70.0,
                            confidence=0.7,
                            details=f"Execution commands align more with goal ({goal_overlap} matches) than current plan ({plan_overlap} matches)",
                        )
                    )
                elif plan_overlap > goal_overlap:
                    evidence.append(
                        Evidence(
                            source=self.name,
                            value=85.0,
                            confidence=0.8,
                            details=f"Execution commands align with current plan ({plan_overlap} matches)",
                        )
                    )
                else:
                    evidence.append(
                        Evidence(
                            source=self.name,
                            value=75.0,
                            confidence=0.7,
                            details=f"Execution commands show mixed alignment (goal: {goal_overlap}, plan: {plan_overlap})",
                        )
                    )
            else:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=50.0,
                        confidence=0.4,
                        details="Unable to determine alignment due to insufficient keyword extraction",
                    )
                )

        # Analyze edited files for consistency
        edited_files = execution_context.get("edited_files", [])
        if edited_files:
            # Check if file types match expected patterns
            file_types = [
                f.split(".")[-1].lower() if "." in f else "no_extension" for f in edited_files
            ]
            unique_types = set(file_types)

            # This is a simplified check - in practice would analyze what each file does
            evidence.append(
                Evidence(
                    source=self.name,
                    value=80.0,
                    confidence=0.6,
                    details=f"Modified {len(edited_files)} files with types: {', '.join(sorted(unique_types))}",
                )
            )

        # Check for divergent reasoning
        reasoning_summary = execution_context.get("reasoning_summary", "")
        if reasoning_summary:
            goal_text = original_goal.get("text", "").lower()
            plan_text = current_plan.get("text", "").lower()
            reasoning_lower = reasoning_summary.lower()

            goal_in_reasoning = any(
                word in reasoning_lower for word in goal_text.split() if len(word) > 4
            )
            plan_in_reasoning = any(
                word in reasoning_lower for word in plan_text.split() if len(word) > 4
            )

            if goal_in_reasoning and not plan_in_reasoning:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=60.0,
                        confidence=0.8,
                        details="Reasoning focuses on original goal rather than current plan",
                    )
                )
            elif plan_in_reasoning and not goal_in_reasoning:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=85.0,
                        confidence=0.8,
                        details="Reasoning focuses on current plan execution",
                    )
                )
            elif goal_in_reasoning and plan_in_reasoning:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=90.0,
                        confidence=0.9,
                        details="Reasoning balances original goal and current plan",
                    )
                )
            else:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=40.0,
                        confidence=0.7,
                        details="Reasoning does not clearly reference original goal or current plan",
                    )
                )

        return evidence

    def _extract_keywords(self, text: str) -> set:
        """Extract meaningful keywords from text.

        Args:
            text: Input text to extract keywords from

        Returns:
            Set of keyword words
        """
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
        }
        words = text.lower().split()
        keywords = {
            w.strip(".,!?:;")
            for w in words
            if len(w) > 3 and w not in stop_words and not w.isdigit()
        }
        return keywords
