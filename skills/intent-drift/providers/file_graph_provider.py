"""Evidence provider that analyzes file graph relationships."""

from pathlib import Path
from typing import Any

from intent_alignment.models import Evidence

from .base import EvidenceProvider


class FileGraphProvider(EvidenceProvider):
    """Analyzes file relationships and scope."""

    def __init__(self) -> None:
        """Initialize the file graph provider."""
        super().__init__(name="file_graph_provider", weight=0.10)

    def collect(self, context: dict[str, Any]) -> list[Evidence]:
        """Collect evidence about file relationships.

        Args:
            context: Dictionary containing original_goal, current_plan, and execution_context

        Returns:
            List of evidence items about file relationships
        """
        execution_context = context.get("execution_context", {})
        edited_files = execution_context.get("edited_files", [])

        evidence = []

        # Simple file relationship analysis
        if not edited_files:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=100.0,
                    confidence=0.5,
                    details="No files modified; nothing to analyze",
                )
            )
            return evidence

        # Count files by type
        file_counts: dict[str, int] = {}
        for file_path in edited_files:
            if "." in file_path:
                ext = file_path.split(".")[-1].split("?")[0]
            else:
                ext = "unknown"
            file_counts[ext] = file_counts.get(ext, 0) + 1

        # Generate evidence about file patterns
        total_count = len(edited_files)
        evidence.append(
            Evidence(
                source=self.name,
                value=min(100.0, 100 - total_count / 10 * 5),  # Decreasing score with more files
                confidence=0.7,
                details=f"Modified {total_count} files. Majority type: {max(file_counts.keys(), key=lambda x: file_counts[x])}",
            )
        )

        # Check for unusual file patterns
        unusual_extensions = [
            ext for ext, count in file_counts.items() if count == 1 and len(ext) > 10
        ]
        if unusual_extensions:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=90.0,
                    confidence=0.8,
                    details=f"Unusual file types modified: {', '.join(unusual_extensions)}",
                )
            )

        # Check for large files (best-effort; skip files we cannot read).
        # ``edited_files`` entries are repo-relative (see
        # ``ContextCollector.get_edited_files``), so resolve them against the
        # repository root instead of the home directory.
        repo_root = Path(execution_context.get("repo_path") or Path.cwd())
        large_files = []
        for f in edited_files:
            try:
                p = repo_root / f
                if p.exists() and p.stat().st_size > 10000:
                    large_files.append(f)
            except (OSError, PermissionError):
                continue
        if large_files:
            evidence.append(
                Evidence(
                    source=self.name,
                    value=85.0,
                    confidence=0.7,
                    details=f"Modified large files ({len(large_files)} > 10KB files)",
                )
            )

        return evidence
