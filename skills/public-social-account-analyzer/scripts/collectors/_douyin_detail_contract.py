"""Shared, allowlisted completeness contract for public Douyin post details."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable


P0_DETAIL_FIELDS = ("title", "published_at", "duration_seconds", "hashtags")
MISSING_P0_DETAIL = "missing_p0_detail"
OTHER_PARTIAL = "other_partial"

_PARTIAL_REASON_ORDER = (
    MISSING_P0_DETAIL,
    "restricted",
    "login_required",
    "verification_required",
    "access_restricted",
    "parser_failed",
    "detail_unavailable",
    OTHER_PARTIAL,
)
_ALLOWED_PARTIAL_REASONS = frozenset(_PARTIAL_REASON_ORDER)


def detail_value_is_observed(
    field: str,
    value: Any,
    *,
    content_type: Any = None,
) -> bool:
    """Return whether a P0 field has explicit, structurally valid evidence."""
    if field == "title":
        return isinstance(value, str) and bool(value.strip())
    if field == "published_at":
        if not isinstance(value, str) or not value.strip():
            return False
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (TypeError, ValueError):
            return False
        return True
    if field == "duration_seconds":
        return isinstance(value, int) and not isinstance(value, bool) and value >= 0
    if field == "hashtags":
        return isinstance(value, list) and all(
            isinstance(tag, str) and bool(tag.strip()) for tag in value
        )
    return False


def missing_detail_fields(
    post: dict[str, Any],
    *,
    trusted_missing_fields: Iterable[str] = (),
    trusted_duration_not_applicable: bool = False,
) -> list[str]:
    """Compute missing P0 fields from values plus ephemeral builder evidence."""
    trusted_missing = frozenset(
        field for field in trusted_missing_fields if field in P0_DETAIL_FIELDS
    )
    missing: list[str] = []
    for field in P0_DETAIL_FIELDS:
        if field == "duration_seconds" and trusted_duration_not_applicable:
            continue
        if field in trusted_missing:
            missing.append(field)
            continue
        value = post.get(field)
        if not detail_value_is_observed(
            field,
            value,
            content_type=post.get("content_type"),
        ):
            missing.append(field)
    return missing


def sanitize_missing_detail_fields(value: Any) -> list[str] | None:
    """Return a stable allowlisted field list, or None for absent metadata."""
    if value is None:
        return None
    if not isinstance(value, list):
        return list(P0_DETAIL_FIELDS)
    if any(
        not isinstance(item, str) or item not in P0_DETAIL_FIELDS
        for item in value
    ):
        return list(P0_DETAIL_FIELDS)
    supplied = set(value)
    return [field for field in P0_DETAIL_FIELDS if field in supplied]


def sanitize_partial_reasons(value: Any) -> list[str]:
    """Normalize known reasons and collapse arbitrary values to a safe marker."""
    if value is None:
        return []
    if not isinstance(value, list):
        return [OTHER_PARTIAL]
    normalized: set[str] = set()
    unknown = False
    for item in value:
        if not isinstance(item, str):
            unknown = True
            continue
        reason = item.strip().lower()
        if reason in _ALLOWED_PARTIAL_REASONS:
            normalized.add(reason)
        else:
            unknown = True
    if unknown:
        normalized.add(OTHER_PARTIAL)
    return [reason for reason in _PARTIAL_REASON_ORDER if reason in normalized]


def derive_detail_contract(
    post: dict[str, Any],
    *,
    trusted_missing_fields: Iterable[str] = (),
    trusted_duration_not_applicable: bool = False,
    trusted_detail_only_partial: bool = False,
) -> tuple[list[str], list[str]]:
    """Derive diagnostics without trusting persisted metadata as evidence."""
    metrics = post.get("platform_metrics")
    metrics = metrics if isinstance(metrics, dict) else {}
    actual_missing = missing_detail_fields(
        post,
        trusted_missing_fields=trusted_missing_fields,
        trusted_duration_not_applicable=trusted_duration_not_applicable,
    )

    reasons = sanitize_partial_reasons(metrics.get("partial_reasons"))
    legacy_singular_reason = (
        metrics.get("partial_reason") or post.get("partial_reason")
    )
    if legacy_singular_reason:
        reasons.append(OTHER_PARTIAL)
    if actual_missing and MISSING_P0_DETAIL not in reasons:
        reasons.insert(0, MISSING_P0_DETAIL)
    if not actual_missing:
        reasons = [reason for reason in reasons if reason != MISSING_P0_DETAIL]
    if (
        post.get("collection_status") == "PARTIAL"
        and not trusted_detail_only_partial
    ):
        reasons.append(OTHER_PARTIAL)
    reasons = sanitize_partial_reasons(reasons)
    return actual_missing, reasons


def set_detail_contract(
    post: dict[str, Any],
    missing: Iterable[str],
    reasons: Iterable[str],
) -> dict[str, Any]:
    """Persist only ordered allowlisted detail metadata on one normalized post."""
    metrics = post.get("platform_metrics")
    clean_metrics = dict(metrics) if isinstance(metrics, dict) else {}
    post.pop("partial_reason", None)
    clean_metrics.pop("partial_reason", None)
    clean_metrics["missing_detail_fields"] = sanitize_missing_detail_fields(
        list(missing)
    ) or []
    clean_metrics["partial_reasons"] = sanitize_partial_reasons(list(reasons))
    post["platform_metrics"] = clean_metrics
    return clean_metrics
