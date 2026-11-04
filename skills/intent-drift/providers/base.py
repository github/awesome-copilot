"""Base class for evidence providers."""

from abc import ABC, abstractmethod
from typing import Any

from intent_alignment.models import Evidence


class EvidenceProvider(ABC):
    """Abstract base class for evidence providers."""

    def __init__(self, name: str, weight: float = 1.0):
        """Initialize the evidence provider.

        Args:
            name: Unique identifier for this provider
            weight: Weight of this provider's evidence in final scoring (0-1)
        """
        self.name = name
        self.weight = weight

    @abstractmethod
    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence from the given context.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of Evidence objects collected from this provider.

            Evidence values are on a canonical 0-100 scale (higher is stronger
            evidence of drift), matching ``overall_alignment``, the confidence
            score, and the exporter markers. Providers must never emit values
            outside [0, 100].
        """
        pass
