# Copyright 2026 Fastah Inc.
"""Typed local geofeed analysis."""
# ruff: noqa: E402 - runtime guard must run before Pydantic-backed imports

from .runtime import require_supported_python

require_supported_python()

from .analyzer import MAX_DATA_ROWS, analyze_file
from .corrections import export_corrected_csv, propose_corrections, record_approval
from .errors import AnalysisError, CorrectionError, DataRowLimitError, SourceDecodeError
from .models import Analysis, CorrectionApproval, CorrectionPlan

__all__ = [
    "MAX_DATA_ROWS",
    "Analysis",
    "AnalysisError",
    "CorrectionApproval",
    "CorrectionError",
    "CorrectionPlan",
    "DataRowLimitError",
    "SourceDecodeError",
    "analyze_file",
    "export_corrected_csv",
    "propose_corrections",
    "record_approval",
    "require_supported_python",
]
