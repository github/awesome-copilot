"""Evidence provider that analyzes architectural changes."""

from typing import Any

from intent_alignment.models import Evidence

from .base import EvidenceProvider


class ArchitectureProvider(EvidenceProvider):
    """Analyzes architectural patterns and changes."""

    def __init__(self) -> None:
        """Initialize the architecture provider."""
        super().__init__(name="architecture_provider", weight=0.10)

    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence about architectural changes.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of evidence items about architectural changes
        """
        execution_context = context.get("execution_context", {})
        edited_files = execution_context.get("edited_files", [])

        evidence = []

        # Analyze main architectural files
        main_files = ["main.py", "__main__.py", "app.py", "server.py", "cli.py"]
        main_file_count = sum(1 for f in edited_files if any(main_f in f for main_f in main_files))

        if main_file_count > 0:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=85.0,
                    confidence=0.7,
                    details=f"Modified main application files ({main_file_count}), indicating significant architectural work",
                )
            )

        # Check for config or setup files
        config_files = [
            f
            for f in edited_files
            if any(config in f.lower() for config in ["config", "setup", "init", "module"])
        ]
        if config_files:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=70.0,
                    confidence=0.8,
                    details=f"Modified configuration/setup files: {', '.join(config_files)}",
                )
            )

        # Analyze file organization
        directories = set()
        for file_path in edited_files:
            if "/" in file_path:
                dir_path = file_path.split("/")[0]
                directories.add(dir_path)

        if len(directories) > 1:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=max(0, 100 - len(directories) * 10),
                    confidence=0.6,
                    details=f"Spreading changes across multiple directories ({len(directories)}), suggesting architectural refactoring",
                )
            )
        elif len(directories) == 1:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=95.0,
                    confidence=0.7,
                    details=f"Focused changes in single directory ({list(directories)[0]}), maintaining simple architecture",
                )
            )
        else:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=50.0,
                    confidence=0.5,
                    details="Unknown directory structure for edited files",
                )
            )

        # Check for new data structures or patterns
        complex_patterns = [
            f
            for f in edited_files
            if any(
                pattern in f.lower()
                for pattern in ["database", "models", "schema", "entities", "types", "structs"]
            )
        ]
        if complex_patterns:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=80.0,
                    confidence=0.7,
                    details=f"Implemented complex data structures: {', '.join(complex_patterns)}",
                )
            )

        return evidence
