"""Shared public-metric field coverage calculation."""

from __future__ import annotations

from typing import Any, Iterable, Mapping


METRIC_FIELDS = (
    "views",
    "likes",
    "comments",
    "favorites",
    "shares",
    "coins",
    "danmaku",
)


def compute_field_coverage(
    records: Iterable[Mapping[str, Any]],
) -> dict[str, float | None]:
    """Return non-null rates for normalized rows or analysis post records."""
    rows = list(records)
    total = len(rows)
    coverage: dict[str, float | None] = {}
    for field in METRIC_FIELDS:
        present = 0
        for row in rows:
            nested = row.get("metrics")
            value = (
                nested.get(field)
                if isinstance(nested, Mapping) and field in nested
                else row.get(field)
            )
            if value is not None:
                present += 1
        coverage[field] = round(present / total, 4) if total else None
    return coverage
