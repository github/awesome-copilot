from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any


class BaseCollector(ABC):
    platform: str

    @abstractmethod
    def supports(self, url: str) -> bool:
        """Return whether the URL is a supported account profile URL."""

    @abstractmethod
    def check_access(self, url: str) -> dict[str, Any]:
        """Return access status without bypassing protection.

        Successful checks must return at least ``accessible=True``. ``status``
        is an optional platform-specific detail. Failed checks must return
        ``accessible=False`` and a concrete ``stop_reason``; adapters may
        raise their structured error type for failures that cannot be
        represented as a response.
        """

    @abstractmethod
    def collect_profile(self, url: str) -> dict[str, Any]:
        """Collect publicly visible account information."""

    @abstractmethod
    def collect_post_list(
        self,
        url: str,
        limit: int,
        date_range: tuple[str | None, str | None] | None = None,
    ) -> list[dict[str, Any]]:
        """Collect post summaries and mark pinned posts."""

    @abstractmethod
    def collect_post_detail(self, post_url: str) -> dict[str, Any]:
        """Collect publicly visible post details and metrics."""

    def collect_comments(
        self,
        post_url: str,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Optional public comment sampling."""
        return []

    def get_collection_coverage(self) -> dict[str, Any]:
        """Return sanitized task-level coverage metadata, when available."""
        return {}

    def _canon_status(self, cs) -> str:
        """Canonicalize a raw collection_status string to the unified enum.

        Raw builders emit "ok" for a successfully collected post; the unified
        schema (collection-schema.md §9.3) uses "SUCCESS"/"PARTIAL"/"FAILED"/"DELETED"/
        "RESTRICTED". Missing or invalid input is untrusted and therefore becomes
        ``PARTIAL`` rather than an invented success.
        """
        return self._canon_status_with_source(cs)[0]

    @staticmethod
    def _canon_status_with_source(cs) -> tuple[str, str]:
        if cs is None or (isinstance(cs, str) and not cs.strip()):
            return "PARTIAL", "inferred_missing"
        s = str(cs).strip().lower()
        if s in ("ok", "success"):
            return "SUCCESS", "declared"
        if s == "partial":
            return "PARTIAL", "declared"
        if s in ("failed", "fail"):
            return "FAILED", "declared"
        if s == "deleted":
            return "DELETED", "declared"
        if s == "restricted":
            return "RESTRICTED", "declared"
        return "PARTIAL", "inferred_invalid"

    def normalize_profile(self, raw: dict) -> dict:
        """Map a platform-specific raw profile dict to the unified Profile schema.

        Carries over known Profile fields when present; optional fields default
        to None when absent. Never invents metric values. Platform-specific
        keys that cannot be generalized are preserved under platform_metrics.
        """
        now = datetime.now(timezone.utc).isoformat()

        def visibility(field: str, present: bool) -> str:
            return "visible" if present else "hidden"

        has_followers = raw.get("followers") is not None
        has_post_count = raw.get("post_count") is not None

        field_visibility = raw.get("field_visibility") or {
            "followers": visibility("followers", has_followers),
            "post_count": visibility("post_count", has_post_count),
        }

        known_keys = {
            "platform",
            "account_id",
            "account_name",
            "profile_url",
            "bio",
            "verified",
            "followers",
            "post_count",
            "level",
            "platform_metrics",
            "collected_at",
            "field_visibility",
        }
        platform_metrics = dict(raw.get("platform_metrics") or {})
        # Preserve any raw platform-specific keys not part of the unified schema.
        # Skip internal/transient keys (prefixed with "_" or collection_status),
        # which are collection metadata, never platform data.
        for key, value in raw.items():
            if key.startswith("_") or key == "collection_status":
                continue
            if key not in known_keys and key not in platform_metrics:
                platform_metrics[key] = value

        return {
            "platform": raw.get("platform"),
            "account_id": raw.get("account_id"),
            "account_name": raw.get("account_name"),
            "profile_url": raw.get("profile_url"),
            "bio": raw.get("bio"),
            "verified": raw.get("verified"),
            "followers": raw.get("followers"),
            "post_count": raw.get("post_count"),
            "level": raw.get("level"),
            "platform_metrics": platform_metrics,
            "collected_at": raw.get("collected_at") or now,
            "field_visibility": field_visibility,
        }

    def normalize_post(self, raw: dict) -> dict:
        """Map a platform-specific raw post dict to the unified Post schema.

        Preserves explicit boolean flags and leaves unknown flags as None,
        defaults hashtags to [] and content_type to "other" when unknown.
        Missing/invalid collection_status becomes auditable ``PARTIAL``. Interaction
        metrics that the adapter actually supplied are passed through (views /
        likes / comments / favorites / shares / coins / danmaku); when absent
        they stay None — never invented. platform_metrics carries any
        platform-specific keys the unified schema has no slot for (e.g.
        partition), the same way normalize_profile does. Never raises on
        missing mappings; unknown unified fields are left as None.
        """
        now = datetime.now(timezone.utc).isoformat()

        hashtags = raw.get("hashtags")
        if hashtags is None:
            hashtags = []
        elif isinstance(hashtags, str):
            hashtags = [hashtags]

        content_type = raw.get("content_type") or "other"

        # Standard interaction metrics the adapter may have supplied. Pass
        # them through only when present; never invent a value.
        metric_fields = (
            "views",
            "likes",
            "comments",
            "favorites",
            "shares",
            "coins",
            "danmaku",
        )

        platform_metrics = dict(raw.get("platform_metrics") or {})
        field_visibility = dict(raw.get("field_visibility") or {})
        collection_status, derived_status_source = (
            self._canon_status_with_source(raw.get("collection_status"))
        )
        supplied_status_source = raw.get("collection_status_source")
        if (
            derived_status_source == "declared"
            and (
                supplied_status_source == "declared"
                or (
                    collection_status == "PARTIAL"
                    and supplied_status_source
                    in {"inferred_missing", "inferred_invalid"}
                )
            )
        ):
            collection_status_source = supplied_status_source
        else:
            collection_status_source = derived_status_source

        def public_boolean(field: str) -> bool | None:
            value = raw.get(field)
            return value if isinstance(value, bool) else None

        result = {
            "platform": raw.get("platform"),
            "post_id": raw.get("post_id"),
            "post_url": raw.get("post_url"),
            "published_at": raw.get("published_at"),
            "content_type": content_type,
            "title": raw.get("title"),
            "text": raw.get("text"),
            "duration_seconds": raw.get("duration_seconds"),
            "hashtags": hashtags,
            "is_pinned": public_boolean("is_pinned"),
            "is_repost": public_boolean("is_repost"),
            "is_promoted": public_boolean("is_promoted"),
            "collection_status": collection_status,
            "collection_status_source": collection_status_source,
            "collected_at": raw.get("collected_at") or now,
            "source_url": raw.get("source_url") or raw.get("post_url"),
            "platform_metrics": platform_metrics,
            "field_visibility": field_visibility,
        }
        for field in metric_fields:
            result[field] = raw.get(field)
        return result
