# Copyright 2026 Fastah Inc.
"""Typed feed-level failures."""

from pathlib import Path


class AnalysisError(Exception):
    """Base class for analysis failures that cannot produce an IR."""


class SourceDecodeError(AnalysisError):
    """The source is not valid UTF-8."""

    def __init__(self, path: Path, offset: int) -> None:
        self.path = path
        self.offset = offset
        super().__init__(f"{path}: input is not valid UTF-8 at byte offset {offset}")


class DataRowLimitError(AnalysisError):
    """The source exceeds the supported number of data rows."""

    def __init__(self, limit: int, observed: int, line_number: int) -> None:
        self.limit = limit
        self.observed = observed
        self.line_number = line_number
        super().__init__(
            f"feed contains more than {limit:,} data rows "
            f"(observed row {observed:,} at physical line {line_number})"
        )


class McpExchangeError(AnalysisError):
    """A host-mediated MCP payload violates the portable exchange contract."""


class CorrectionError(AnalysisError):
    """A correction plan, approval, or materialization fails closed."""
