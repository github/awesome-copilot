"""Evidence provider that analyzes dependency changes."""

from typing import Any

from intent_alignment.models import Evidence

from .base import EvidenceProvider


class DependencyProvider(EvidenceProvider):
    """Analyzes dependency and package changes."""

    def __init__(self) -> None:
        """Initialize the dependency provider."""
        super().__init__(name="dependency_provider", weight=0.10)

    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence about dependency changes.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of evidence items about dependency changes
        """
        execution_context = context.get("execution_context", {})
        recent_commands = execution_context.get("recent_commands", [])

        evidence = []

        # Analyze recent commands for dependency changes
        install_commands = [
            cmd
            for cmd in recent_commands
            if any(
                install in cmd.lower()
                for install in [
                    "pip install",
                    "npm install",
                    "yarn add",
                    "conda install",
                    "gem install",
                    "cargo add",
                ]
            )
        ]
        remove_commands = [
            cmd
            for cmd in recent_commands
            if any(
                remove in cmd.lower()
                for remove in ["pip uninstall", "npm uninstall", "yarn remove", "conda remove"]
            )
        ]

        if install_commands:
            # Check if new dependencies align with goal
            goal_text = context.get("original_goal", {}).get("text", "").lower()
            install_text = " ".join(install_commands).lower()

            # Simple keyword matching
            goal_keywords = set(goal_text.split())
            install_keywords = set(install_text.split())

            # Remove common words
            common_words = {
                "pip",
                "install",
                "npm",
                "add",
                "yarn",
                "conda",
                "gem",
                "cargo",
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
            }
            goal_keywords -= common_words
            install_keywords -= common_words

            if goal_keywords and install_keywords:
                overlap = len(goal_keywords.intersection(install_keywords))
                overlap_ratio = (
                    overlap / min(len(goal_keywords), len(install_keywords))
                    if min(len(goal_keywords), len(install_keywords)) > 0
                    else 0
                )
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=50.0 + overlap_ratio * 50,  # Base 50% + bonus for alignment
                        confidence=0.7,
                        details=f"Installed dependencies show {overlap_ratio:.1%} alignment with goal keywords",
                    )
                )
            else:
                evidence.append(
                    Evidence(
                        source=self.name,
                        value=50.0,
                        confidence=0.5,
                        details="Installed dependencies detected but insufficient data for alignment analysis",
                    )
                )
        elif remove_commands:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=30.0,
                    confidence=0.7,
                    details=f"Dependencies removed: {len(remove_commands)} removal commands detected",
                )
            )
        else:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=90.0,
                    confidence=0.8,
                    details="No significant dependency changes detected",
                )
            )

        # Analyze package files if mentioned in execution context
        # This would check for package.json, requirements.txt, etc. modifications
        edited_files = execution_context.get("edited_files", [])
        package_files = [
            f
            for f in edited_files
            if any(
                pkg in f.lower()
                for pkg in [
                    "package.json",
                    "requirements.txt",
                    "setup.py",
                    "pom.xml",
                    "build.gradle",
                    "cargo.toml",
                    "go.mod",
                ]
            )
        ]
        if package_files:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=70.0,
                    confidence=0.7,
                    details=f"Modified package management files: {', '.join(package_files)}",
                )
            )

        return evidence
