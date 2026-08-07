"""Bounded, standard-library observation of public Douyin page data.

The browser follows the public page normally.  This module observes eligible
CDP responses and falls back to visible DOM-card fields.  It does not issue
page-context API requests, copy signatures, or handle challenges.
"""

from __future__ import annotations

import copy
import hashlib
import json
import math
import re
import time
import urllib.parse
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from ._constants import (
    DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKERS,
    DOUYIN_BROWSER_VISIBLE_RESTRICTION_SOURCE,
    DOUYIN_PAGE_STATE_PATTERNS,
    PUBLIC_ALL_DEFAULT_MAX_SCROLLS,
    PUBLIC_ALL_DEFAULT_MAX_SECONDS,
    validate_public_all_budgets,
    validate_public_limit,
)
from .browser_backend import (
    BrowserError,
    BrowserSession,
    _sanitize_cleanup_diagnostics,
)
from .url_policy import canonical_item_url, canonical_profile_url


_ITEM_LIST_KEYS = ("aweme_list", "awemeList", "post_list")
_ITEM_DETAIL_KEYS = {"aweme_detail", "awemeDetail"}
_ACCOUNT_BINDING_KEYS = ("sec_uid", "sec_user_id")
_ACCOUNT_POST_LIST_PATHS = frozenset({"/aweme/v1/web/aweme/post/"})
_ACCOUNT_POST_LIST_OWNER_PATHS = ((), ("data",))
_BINDING_ABSENT = "absent"
_BINDING_MATCH = "match"
_BINDING_CONFLICT = "conflict"
_BINDING_INVALID = "invalid"
_ACCOUNT_ID = re.compile(r"[A-Za-z0-9_-]+")
_POST_PATH = re.compile(r"/(?P<kind>video|note)/(?P<post_id>\d+)/?")
_POST_ID = re.compile(r"\d+")
_HEX_PAIR = re.compile(r"[0-9A-Fa-f]{2}")
_VISIBLE_METRIC_NUMBER = re.compile(r"[-+]?\d[\d,]*(?:\.\d+)?\s*[万亿]?")
_KNOWN_STATISTICS = {
    "play_count",
    "digg_count",
    "comment_count",
    "collect_count",
    "share_count",
}
_KNOWN_VIDEO_FIELDS = {"duration", "play_addr", "cover", "origin_cover"}
MAX_SECONDS = 90.0
MAX_SCROLLS = 20
MAX_IDLE_ROUNDS = 3
DETAIL_DEFAULT_MAX_SECONDS = 20.0
DETAIL_MAX_SECONDS = 90.0
DETAIL_DEFAULT_MAX_CANDIDATES = 8
DETAIL_MAX_CANDIDATES = 32
DETAIL_DEFAULT_MAX_BODY_CHARS = 1_000_000
DETAIL_MAX_BODY_CHARS = 4_000_000
ACCOUNT_PAGE_CONTEXT_MAX_BODY_CHARS = 4_000_000

_ALLOWED_RESPONSE_HOSTS = ("douyin.com", "iesdouyin.com")
_DOM_PROFILE_HELPERS = r"""
const isVisible = node => Boolean(node && node.getClientRects().length > 0);
const visibleText = (root, selectors) => {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    const node = root.querySelector(sel);
    if (isVisible(node)) {
      return (node.getAttribute('aria-label') || node.innerText || '').trim() || null;
    }
  }
  return null;
};
const boundedText = value => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text && text.length <= 120 ? text : null;
};
const readProfile = () => {
  const pathMatch = location.pathname.match(/^\/(?:user|share\/user)\/([A-Za-z0-9_-]+)\/?$/);
  // Multiple fallback selectors for title
  const titleSelectors = [
    '[data-e2e="user-title"]',
    'h1',
    '[data-e2e="user-info-title"]',
    '.user-title',
    '.profile-title'
  ];
  const titleNode = titleSelectors.map(s => document.querySelector(s)).find(isVisible);
  if (!pathMatch || !titleNode) return null;
  const profileRoot = titleNode.closest(
    '[data-e2e="user-info"],[data-e2e="user-detail"],header,[data-e2e="user-profile"],.user-profile,.profile-header'
  ) || (titleNode.parentElement && titleNode.parentElement.parentElement) ||
    titleNode.parentElement;
  if (!profileRoot || !isVisible(profileRoot)) return null;
  const badgeSelector = [
    '[data-e2e="user-info-verify"]',
    '[data-e2e="user-info-authentication"]',
    '[aria-label*="认证"]',
    'img[alt*="认证"]',
    '[title*="认证"]',
    '[data-e2e="user-verified"]',
    '.verified-badge'
  ].join(',');
  const verifiedNode = Array.from(profileRoot.querySelectorAll(badgeSelector)).find(isVisible) || null;
  const authContainer = verifiedNode && verifiedNode.closest(
    '[data-e2e="user-info-verify"],[data-e2e="user-info-authentication"],[data-e2e="user-verified"]'
  );
  const label = boundedText(
    (authContainer && authContainer.innerText) ||
    (verifiedNode && (
      verifiedNode.getAttribute('aria-label') ||
      verifiedNode.getAttribute('alt') ||
      verifiedNode.getAttribute('title') ||
      verifiedNode.innerText
    ))
  );
  const genericLabels = new Set(['认证', '已认证', '认证徽章']);
  const negativeLabels = new Set(['false', '未认证', '无认证', 'not verified']);
  return {
    profile_url: location.href,
    sec_uid: pathMatch[1],
    nickname: visibleText(profileRoot, ['[data-e2e="user-title"]', 'h1', '[data-e2e="user-info-title"]', '.user-title']),
    signature: visibleText(profileRoot, ['[data-e2e="user-signature"]', '[data-e2e="user-desc"]', '.signature', '.user-desc']),
    follower_count: visibleText(profileRoot, ['[data-e2e="user-info-follower"]', '[data-e2e="user-follower"]', '.follower-count', '[title*="粉丝"]']),
    aweme_count: visibleText(profileRoot, ['[data-e2e="user-info-post-count"]', '[data-e2e="user-post-count"]', '.post-count', '[title*="作品"]']),
    total_favorited: visibleText(profileRoot, ['[data-e2e="user-info-like"]', '[data-e2e="user-like"]', '.like-count', '[title*="获赞"]']),
    dom_verified_badge: verifiedNode
      ? (label && negativeLabels.has(label.toLowerCase())
        ? null
        : (label && !genericLabels.has(label) ? label : true))
      : null
  };
};
"""

_DOM_PROFILE_EXPRESSION = (
    "(() => {\n" + _DOM_PROFILE_HELPERS + "\nreturn readProfile();\n})()"
)

_DOM_CARDS_EXPRESSION = "(() => {\n" + _DOM_PROFILE_HELPERS + r"""
const cards = Array.from(
  document.querySelectorAll(
    '[data-e2e="user-post-item"],' +
    '[data-e2e="user-post"],' +
    '[data-e2e="aweme-item"],' +
    '.user-post-item,' +
    '.aweme-item,' +
    '[class*="user-post-item"],' +
    '[class*="aweme-item"],' +
    'li[data-aid],' +
    'div[data-aid]'
  )
).filter(isVisible).map(root => {
  const a = Array.from(
    root.querySelectorAll('a[href*="/video/"],a[href*="/note/"],a[href*="/aweme/"]')
  ).find(isVisible) || null;
  if (!a) return null;
  const pinSelectors = [
    '[data-e2e="video-card-top"]',
    '[aria-label="置顶"]',
    '[data-e2e="pinned-badge"]',
    '.pinned-badge',
    '[title*="置顶"]'
  ];
  const pinNode = pinSelectors.map(s => root.querySelector(s)).find(isVisible);
  const isPinned = pinNode && pinNode.getClientRects().length > 0 ? true : null;
  return {
    href: a.href,
    text: (a.getAttribute('aria-label') || a.getAttribute('title') || a.innerText || '').trim(),
    is_pinned: isPinned,
    statistics: {
      digg_count: visibleText(root, ['[data-e2e="video-like-count"]', '[aria-label^="点赞"]', '[data-e2e="like-count"]', '.like-count']),
      comment_count: visibleText(root, ['[data-e2e="video-comment-count"]', '[aria-label^="评论"]', '[data-e2e="comment-count"]', '.comment-count']),
      collect_count: visibleText(root, ['[data-e2e="video-collect-count"]', '[aria-label^="收藏"]', '[data-e2e="collect-count"]', '.collect-count']),
      share_count: visibleText(root, ['[data-e2e="video-share-count"]', '[aria-label^="分享"]', '[data-e2e="share-count"]', '.share-count'])
    }
  };
}).filter(Boolean);
return {
  cards,
  profile: readProfile()
};
})()"""

_DOM_DETAIL_EXPRESSION = r"""(() => {
const isVisible = node => Boolean(node && node.getClientRects().length > 0);
const pathMatch = location.pathname.match(/^\/(video|note)\/(\d+)\/?$/);
if (!pathMatch) return null;
const detailRootSelectors = [
  '[data-e2e="video-detail"]',
  '[data-e2e="note-detail"]',
  'main',
  '[data-e2e="aweme-detail"]',
  '.video-detail',
  '.note-detail',
  '#detail'
];
const detailRoot = detailRootSelectors.map(s => document.querySelector(s)).find(isVisible) || null;
if (!detailRoot) return null;
const visibleText = selectors => {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    const node = Array.from(detailRoot.querySelectorAll(sel)).find(isVisible);
    if (node) {
      return (node.getAttribute('aria-label') || node.getAttribute('title') || node.innerText || '').trim() || null;
    }
  }
  return null;
};
const tagNodes = Array.from(detailRoot.querySelectorAll(
  '[data-e2e="video-tag"],[data-e2e="note-tag"],a[href*="/hashtag/"],[data-e2e="tag-link"],.tag-link'
)).filter(isVisible);
const textExtra = tagNodes.map(node => ({
  hashtag_name: (node.innerText || node.getAttribute('aria-label') || '')
    .replace(/^#|#$/g, '').trim()
})).filter(item => item.hashtag_name);
return {
  aweme_id: pathMatch[2],
  share_url: location.href,
  desc: visibleText(['[data-e2e="video-desc"]','[data-e2e="note-desc"]','h1','[data-e2e="aweme-desc"]','.desc']),
  text_extra: textExtra,
  statistics: {
    digg_count: visibleText(['[data-e2e="video-digg"]','[aria-label^="点赞"]','[data-e2e="like-count"]','.digg-count']),
    comment_count: visibleText(['[data-e2e="video-comment"]','[aria-label^="评论"]','[data-e2e="comment-count"]','.comment-count']),
    collect_count: visibleText(['[data-e2e="video-collect"]','[aria-label^="收藏"]','[data-e2e="collect-count"]','.collect-count']),
    share_count: visibleText(['[data-e2e="video-share"]','[aria-label^="分享"]','[data-e2e="share-count"]','.share-count'])
  }
};
})()"""

_PROFILE_HINT_KEYS = {
    "account_id",
    "account_name",
    "profile_url",
    "sec_uid",
    "unique_id",
    "uid",
    "nickname",
    "signature",
    "followers",
    "follower_count",
    "post_count",
    "aweme_count",
    "total_favorited",
    "verified",
    "custom_verify",
    "enterprise_verify_reason",
}


@dataclass
class DouyinBrowserResult:
    """Sanitized public browser collection output for the collector layer."""

    profile_raw: Optional[dict[str, Any]] = None
    aweme_items: list[dict[str, Any]] = field(default_factory=list)
    source: str = "network"
    restriction: Optional[str] = None
    diagnostic_code: Optional[str] = None
    diagnostics: dict[str, Any] = field(default_factory=dict)
    coverage: dict[str, Any] = field(default_factory=dict)


@dataclass
class PostPageObservation:
    """Ephemeral metadata from a dictionary that owns a recognized post list."""

    items: list[dict[str, Any]] = field(default_factory=list)
    has_more: Optional[bool] = None
    cursor: Any = None


@dataclass
class _AccountPostCandidateAudit:
    """Atomic account-list evidence extracted from one response candidate."""

    items: list[dict[str, Any]] = field(default_factory=list)
    observation: Optional[PostPageObservation] = None
    invalid: bool = False


_DETAIL_RESPONSE_PATHS = (
    ("aweme_detail",),
    ("awemeDetail",),
    ("data", "aweme_detail"),
    ("data", "awemeDetail"),
    ("aweme", "detail"),
    ("video", "aweme"),
    ("app", "aweme", "detail"),
)


def detect_restriction(text: str) -> Optional[str]:
    """Return the highest-priority visible restriction or explicit empty state."""
    for pattern, reason in DOUYIN_PAGE_STATE_PATTERNS:
        if pattern.search(text or ""):
            return reason
    return None


def sanitize_response_url(url: str) -> str:
    """Remove credentials, query, and fragment from an observed diagnostic URL."""
    try:
        parsed = urllib.parse.urlsplit(url)
    except ValueError:
        return ""
    hostname = parsed.hostname
    if not hostname:
        authority = ""
    else:
        authority = f"[{hostname}]" if ":" in hostname else hostname
        try:
            port = parsed.port
        except ValueError:
            port = None
        if port is not None:
            authority = f"{authority}:{port}"
    return urllib.parse.urlunsplit((parsed.scheme, authority, parsed.path, "", ""))


def canonical_post_url(post_id: Any, kind: str = "video") -> str:
    """Build a query-free public evidence URL from a validated Douyin post ID."""
    value = str(post_id or "")
    if not _POST_ID.fullmatch(value) or kind not in {"video", "note"}:
        return ""
    return f"https://www.douyin.com/{kind}/{value}"


def _item_id(item: dict[str, Any]) -> Optional[str]:
    value = item.get("aweme_id") or item.get("aweme_id_str")
    text = str(value) if value is not None else ""
    return text if _POST_ID.fullmatch(text) else None


def _account_post_item_id(item: dict[str, Any]) -> Optional[str]:
    """Bind every supplied public identity alias to one numeric post ID."""
    identifiers: list[str] = []
    for key in ("aweme_id", "aweme_id_str"):
        value = item.get(key)
        if value is None or value == "":
            continue
        text = str(value)
        if _POST_ID.fullmatch(text) is None:
            return None
        identifiers.append(text)
    if not identifiers or len(set(identifiers)) != 1:
        return None
    item_id = identifiers[0]
    reference = _post_reference_from_public_url(
        str(item.get("share_url") or "")
    )
    if reference is not None and reference[1] != item_id:
        return None
    return item_id


def _is_trustworthy_aweme(item: dict[str, Any]) -> bool:
    """Require an ID plus at least one credible public post field group."""
    if _item_id(item) is None:
        return False
    if isinstance(item.get("desc"), str):
        return True
    if item.get("create_time") is not None:
        try:
            float(item["create_time"])
        except (TypeError, ValueError):
            pass
        else:
            return True
    statistics = item.get("statistics")
    if isinstance(statistics, dict) and any(
        key in statistics for key in _KNOWN_STATISTICS
    ):
        return True
    video = item.get("video")
    if isinstance(video, dict) and any(key in video for key in _KNOWN_VIDEO_FIELDS):
        return True
    images = item.get("images")
    return isinstance(images, list) and bool(images)


def _is_missing(value: Any) -> bool:
    return value is None or value == "" or value == []


def _merge_missing(existing: dict[str, Any], incoming: dict[str, Any]) -> None:
    """Recursively fill only absent values, preserving earlier reliable data."""
    for key, value in incoming.items():
        if key not in existing or _is_missing(existing[key]):
            existing[key] = copy.deepcopy(value)
            continue
        if isinstance(existing[key], dict) and isinstance(value, dict):
            _merge_missing(existing[key], value)


def _verification_strength(value: Any) -> int:
    if isinstance(value, str) and value.strip():
        return 3
    if value is True:
        return 2
    if value is False:
        return 1
    return 0


def _account_id_strength(profile: dict[str, Any]) -> int:
    account_id = profile.get("account_id")
    if _is_missing(account_id):
        return 0
    visibility = profile.get("field_visibility")
    if isinstance(visibility, dict) and visibility.get("account_id") == "visible":
        return 2
    return 1


def _merge_profile_evidence(
    existing: dict[str, Any], incoming: dict[str, Any]
) -> None:
    """Fill gaps, upgrade strong identity evidence, and disclose counters."""
    existing_verified = existing.get("verified")
    incoming_verified = incoming.get("verified")
    existing_account_strength = _account_id_strength(existing)
    incoming_account_strength = _account_id_strength(incoming)
    incoming_account_id = incoming.get("account_id")
    counter_pairs = {
        "followers": (existing.get("followers"), incoming.get("followers")),
        "post_count": (existing.get("post_count"), incoming.get("post_count")),
        "total_likes": (
            (existing.get("platform_metrics") or {}).get("total_likes")
            if isinstance(existing.get("platform_metrics"), dict)
            else None,
            (incoming.get("platform_metrics") or {}).get("total_likes")
            if isinstance(incoming.get("platform_metrics"), dict)
            else None,
        ),
    }
    _merge_missing(existing, incoming)
    if incoming_account_strength > existing_account_strength:
        existing["account_id"] = copy.deepcopy(incoming_account_id)
    if _verification_strength(incoming_verified) > _verification_strength(
        existing_verified
    ):
        existing["verified"] = copy.deepcopy(incoming_verified)
    metrics = existing.get("platform_metrics")
    if not isinstance(metrics, dict):
        metrics = {}
        existing["platform_metrics"] = metrics
    conflicts = metrics.get("profile_conflicts")
    conflicts = copy.deepcopy(conflicts) if isinstance(conflicts, dict) else {}
    incoming_metrics = incoming.get("platform_metrics")
    incoming_conflicts = (
        incoming_metrics.get("profile_conflicts")
        if isinstance(incoming_metrics, dict)
        else None
    )
    if isinstance(incoming_conflicts, dict):
        for field_name, entry in incoming_conflicts.items():
            if field_name not in {"followers", "post_count", "total_likes"}:
                continue
            values = entry.get("observed_values") if isinstance(entry, dict) else None
            if not isinstance(values, list):
                continue
            current = conflicts.setdefault(field_name, {"observed_values": []})
            for value in values:
                if (
                    type(value) is int
                    and value >= 0
                    and value not in current["observed_values"]
                    and len(current["observed_values"]) < 16
                ):
                    current["observed_values"].append(value)
    for field_name, (selected, observed) in counter_pairs.items():
        if (
            type(selected) is not int
            or type(observed) is not int
            or selected < 0
            or observed < 0
            or selected == observed
        ):
            continue
        current = conflicts.setdefault(field_name, {"observed_values": []})
        for value in (selected, observed):
            if value not in current["observed_values"]:
                current["observed_values"].append(value)
    selected_values = {
        "followers": existing.get("followers"),
        "post_count": existing.get("post_count"),
        "total_likes": metrics.get("total_likes"),
    }
    clean_conflicts = {}
    visibility = existing.get("field_visibility")
    if not isinstance(visibility, dict):
        visibility = {}
        existing["field_visibility"] = visibility
    for field_name, entry in conflicts.items():
        values = entry.get("observed_values") if isinstance(entry, dict) else None
        selected = selected_values.get(field_name)
        if (
            not isinstance(values, list)
            or type(selected) is not int
            or selected < 0
        ):
            continue
        unique = []
        for value in values:
            if type(value) is int and value >= 0 and value not in unique:
                unique.append(value)
        if selected not in unique:
            unique.insert(0, selected)
        if len(unique) < 2:
            continue
        clean_conflicts[field_name] = {
            "selected": selected,
            "observed_values": unique[:16],
        }
        visibility[field_name] = "partial"
    if clean_conflicts:
        metrics["profile_conflicts"] = clean_conflicts
    else:
        metrics.pop("profile_conflicts", None)


def _first_present(source: dict[str, Any], *keys: str) -> Any:
    """Return the first present value without discarding explicit zero/false."""
    for key in keys:
        if key in source and source[key] is not None:
            return source[key]
    return None


def _public_text(value: Any) -> Optional[str]:
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        return None
    text = str(value).strip()
    return text or None


def _public_count(value: Any) -> Optional[int]:
    """Parse a displayed public count while rejecting booleans and structures."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value) if math.isfinite(value) and value >= 0 else None
    match = _VISIBLE_METRIC_NUMBER.search(str(value))
    if match is None:
        return None
    text = match.group(0).replace(" ", "").replace(",", "")
    multiplier = 100_000_000 if "亿" in text else 10_000 if "万" in text else 1
    try:
        parsed = float(text.replace("亿", "").replace("万", ""))
    except ValueError:
        return None
    return int(parsed * multiplier) if math.isfinite(parsed) and parsed >= 0 else None


_NEGATIVE_CERTIFICATION_LABELS = frozenset(
    {"false", "未认证", "无认证", "not verified"}
)
_GENERIC_CERTIFICATION_LABELS = frozenset({"认证", "已认证", "认证徽章"})


def _certification_text(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    text = re.sub(r"\s+", " ", value).strip()
    if (
        not text
        or len(text) > 120
        or any(ord(char) < 32 or ord(char) == 127 for char in text)
        or text.casefold() in _NEGATIVE_CERTIFICATION_LABELS
    ):
        return None
    return text


def _verification_type_status(value: Any) -> Optional[bool]:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if value in (0, -1):
        return False
    return True if value > 0 else None


def _verification_evidence(
    value: dict[str, Any], *, allow_dom_badge: bool = False
) -> tuple[bool | str | None, Optional[str], Any]:
    supplied_metrics = value.get("platform_metrics")
    metrics = supplied_metrics if isinstance(supplied_metrics, dict) else {}
    for key in ("enterprise_verify_reason", "custom_verify"):
        raw_text = value.get(key) if key in value else metrics.get(key)
        text = _certification_text(raw_text)
        if text is not None:
            return text, key, text

    if allow_dom_badge:
        badge = (
            value.get("dom_verified_badge")
            if "dom_verified_badge" in value
            else metrics.get("dom_verified_badge")
        )
        if badge is True:
            return True, "dom_verified_badge", True
        label = _certification_text(badge)
        if label is not None:
            verified = (
                True if label in _GENERIC_CERTIFICATION_LABELS else label
            )
            return verified, "dom_verified_badge", badge

    verified = value.get("verified")
    if isinstance(verified, bool):
        return verified, None, None

    if "verification_type" in value:
        status = _verification_type_status(value.get("verification_type"))
        if status is not None:
            return status, None, None
    nested = value.get("verification") or value.get("verify_info")
    if isinstance(nested, dict):
        status = _verification_type_status(nested.get("type"))
        if status is not None:
            return status, None, None
    return None, None, None


def _public_verified(
    value: dict[str, Any], *, allow_dom_badge: bool = False
) -> bool | str | None:
    return _verification_evidence(
        value, allow_dom_badge=allow_dom_badge
    )[0]


def sanitize_profile_raw(
    value: Any,
    requested_url: str,
    *,
    allow_dom_badge: bool = False,
) -> Optional[dict[str, Any]]:
    """Bind one profile candidate to the requested account and allowlist fields.

    This function is deliberately safe to call again at the collector boundary:
    it accepts either a public user object or an already-sanitized profile, but
    never copies arbitrary keys, nested objects, response URLs, or transport data.
    """
    canonical_url = canonical_profile_url("douyin", requested_url)
    if canonical_url is None or not isinstance(value, dict):
        return None
    requested_sec_uid = canonical_url.rstrip("/").rsplit("/", 1)[-1]
    supplied_metrics = value.get("platform_metrics")
    metrics = supplied_metrics if isinstance(supplied_metrics, dict) else {}
    supplied_sec_uid = _public_text(
        _first_present(value, "sec_uid")
        if "sec_uid" in value
        else metrics.get("sec_uid")
    )
    supplied_url = _first_present(value, "profile_url", "share_url")
    supplied_canonical = (
        canonical_profile_url("douyin", supplied_url)
        if isinstance(supplied_url, str)
        else None
    )

    # Any public association evidence must agree; a contradiction is never
    # papered over by a second matching field.
    if supplied_sec_uid is not None and supplied_sec_uid != requested_sec_uid:
        return None
    if supplied_url is not None and supplied_canonical != canonical_url:
        return None
    if supplied_sec_uid is None and supplied_canonical is None:
        return None

    unique_id = _public_text(
        _first_present(value, "unique_id")
        if "unique_id" in value
        else metrics.get("unique_id")
    )
    uid = _public_text(
        _first_present(value, "uid") if "uid" in value else metrics.get("uid")
    )
    explicit_account_id = _public_text(value.get("account_id"))
    account_id = explicit_account_id or unique_id or supplied_sec_uid
    account_name = _public_text(_first_present(value, "account_name", "nickname"))
    bio = _public_text(_first_present(value, "bio", "signature"))
    followers = _public_count(_first_present(value, "followers", "follower_count"))
    post_count = _public_count(_first_present(value, "post_count", "aweme_count"))
    total_likes = _public_count(
        value.get("total_favorited")
        if "total_favorited" in value
        else metrics.get("total_likes")
    )
    verified, verification_source, verification_source_value = (
        _verification_evidence(value, allow_dom_badge=allow_dom_badge)
    )

    public_metrics = {
        key: metric_value
        for key, metric_value in (
            ("total_likes", total_likes),
            ("sec_uid", supplied_sec_uid),
            ("unique_id", unique_id),
            ("uid", uid),
        )
        if metric_value is not None
    }
    raw_conflicts = metrics.get("profile_conflicts")
    clean_conflicts: dict[str, dict[str, Any]] = {}
    selected_counters = {
        "followers": followers,
        "post_count": post_count,
        "total_likes": total_likes,
    }
    if isinstance(raw_conflicts, dict):
        for field_name in ("followers", "post_count", "total_likes"):
            entry = raw_conflicts.get(field_name)
            values = entry.get("observed_values") if isinstance(entry, dict) else None
            selected = selected_counters[field_name]
            if not isinstance(values, list) or type(selected) is not int:
                continue
            unique = []
            for observed in values:
                if (
                    type(observed) is int
                    and observed >= 0
                    and observed not in unique
                    and len(unique) < 16
                ):
                    unique.append(observed)
            if selected not in unique:
                unique.insert(0, selected)
            if len(unique) >= 2:
                clean_conflicts[field_name] = {
                    "selected": selected,
                    "observed_values": unique,
                }
    if clean_conflicts:
        public_metrics["profile_conflicts"] = clean_conflicts
    if verification_source is not None:
        public_metrics[verification_source] = verification_source_value
    return {
        "platform": "douyin",
        "account_id": account_id,
        "account_name": account_name,
        "profile_url": canonical_url,
        "bio": bio,
        "verified": verified,
        "followers": followers,
        "post_count": post_count,
        "platform_metrics": public_metrics,
        "field_visibility": {
            "account_id": (
                "visible"
                if unique_id is not None
                or (
                    explicit_account_id is not None
                    and explicit_account_id != supplied_sec_uid
                )
                else "partial"
                if account_id is not None
                else "hidden"
            ),
            "account_name": "visible" if account_name is not None else "hidden",
            "bio": "visible" if bio is not None else "hidden",
            "verified": "visible" if verified is not None else "hidden",
            "followers": (
                "partial" if "followers" in clean_conflicts
                else "visible" if followers is not None else "hidden"
            ),
            "post_count": (
                "partial" if "post_count" in clean_conflicts
                else "visible" if post_count is not None else "hidden"
            ),
            "total_likes": (
                "partial" if "total_likes" in clean_conflicts
                else "visible" if total_likes is not None else "hidden"
            ),
        },
    }


def extract_profile_raw(data: Any, requested_url: str) -> Optional[dict[str, Any]]:
    """Extract and merge only account-bound, allowlisted public profile facts."""
    merged: Optional[dict[str, Any]] = None

    def walk(node: Any, depth: int = 0) -> None:
        nonlocal merged
        if depth > 10:
            return
        if isinstance(node, dict):
            if _PROFILE_HINT_KEYS.intersection(node):
                candidate = sanitize_profile_raw(node, requested_url)
                if candidate is not None:
                    if merged is None:
                        merged = candidate
                    else:
                        _merge_profile_evidence(merged, candidate)
            for child in node.values():
                walk(child, depth + 1)
        elif isinstance(node, list):
            for child in node:
                walk(child, depth + 1)

    walk(data)
    return sanitize_profile_raw(merged, requested_url) if merged is not None else None


def extract_aweme_items(data: Any) -> list[dict[str, Any]]:
    """Find, validate, merge, and de-duplicate known list/detail response shapes."""
    found: list[dict[str, Any]] = []

    def walk(value: Any, depth: int = 0) -> None:
        if depth > 10:
            return
        if isinstance(value, dict):
            for key, child in value.items():
                if key in _ITEM_LIST_KEYS and isinstance(child, list):
                    found.extend(
                        item
                        for item in child
                        if isinstance(item, dict) and _is_trustworthy_aweme(item)
                    )
                elif key in _ITEM_DETAIL_KEYS and isinstance(child, dict):
                    if _is_trustworthy_aweme(child):
                        found.append(child)
                else:
                    walk(child, depth + 1)
        elif isinstance(value, list):
            for child in value:
                walk(child, depth + 1)

    walk(data)
    unique: dict[str, dict[str, Any]] = {}
    for item in found:
        item_id = _item_id(item)
        if item_id is None:
            continue
        if item_id not in unique:
            unique[item_id] = copy.deepcopy(item)
        else:
            _merge_missing(unique[item_id], item)
    return list(unique.values())


def _detail_response_candidates(data: Any) -> list[dict[str, Any]]:
    """Read only frozen detail-object paths, never lists or recommendation trees."""
    candidates: list[dict[str, Any]] = []
    for path in _DETAIL_RESPONSE_PATHS:
        value = data
        for key in path:
            if not isinstance(value, dict):
                value = None
                break
            value = value.get(key)
        if isinstance(value, dict) and value not in candidates:
            candidates.append(value)
    return candidates


def _bound_detail_item(
    candidate: dict[str, Any], canonical_url: str
) -> Optional[dict[str, Any]]:
    """Return one detail item only when every supplied identity agrees."""
    expected_id = canonical_url.rstrip("/").rsplit("/", 1)[-1]
    identifiers = [
        str(candidate[key]).strip()
        for key in ("aweme_id", "aweme_id_str")
        if key in candidate and candidate[key] is not None
    ]
    if not identifiers or any(identifier != expected_id for identifier in identifiers):
        return None
    share_url = candidate.get("share_url")
    if share_url is not None:
        if canonical_item_url("douyin", share_url, expected_id) != canonical_url:
            return None
    if not _is_trustworthy_aweme(candidate):
        return None
    item = copy.deepcopy(candidate)
    item["share_url"] = canonical_url
    item["_collection_source"] = "network"
    return item


def _detail_identity_conflicts(
    candidate: dict[str, Any], canonical_url: str
) -> bool:
    """Detect explicit item identity contradictions without treating gaps as proof."""
    expected_id = canonical_url.rstrip("/").rsplit("/", 1)[-1]
    for key in ("aweme_id", "aweme_id_str"):
        if key in candidate and candidate[key] is not None:
            if str(candidate[key]).strip() != expected_id:
                return True
    share_url = candidate.get("share_url")
    return bool(
        share_url is not None
        and canonical_item_url("douyin", share_url, expected_id) != canonical_url
    )


def _has_visible_detail_evidence(candidate: dict[str, Any]) -> bool:
    """Require an actual visible detail field in addition to the address bar."""
    description = candidate.get("desc")
    if isinstance(description, str) and bool(description.strip()):
        return True
    text_extra = candidate.get("text_extra")
    if isinstance(text_extra, list) and any(
        isinstance(item, dict) and bool(str(item.get("hashtag_name") or "").strip())
        for item in text_extra
    ):
        return True
    statistics = candidate.get("statistics")
    return isinstance(statistics, dict) and any(
        key in statistics and _visible_metric_value(statistics[key]) is not None
        for key in _KNOWN_STATISTICS
    )


def _strict_query_component(value: str) -> Optional[str]:
    """Decode one form-query component only when every escape and byte is valid."""
    offset = 0
    while offset < len(value):
        if value[offset] == "%":
            if (
                offset + 2 >= len(value)
                or _HEX_PAIR.fullmatch(value[offset + 1 : offset + 3]) is None
            ):
                return None
            offset += 3
            continue
        offset += 1
    try:
        raw = urllib.parse.unquote_to_bytes(value.replace("+", " "))
        return raw.decode("utf-8", errors="strict")
    except (UnicodeDecodeError, ValueError):
        return None


def _response_account_binding(
    event: dict[str, Any], expected_sec_uid: str
) -> str:
    """Classify one ephemeral response query without retaining any query value."""
    params = event.get("params")
    response = params.get("response") if isinstance(params, dict) else None
    response_url = response.get("url") if isinstance(response, dict) else None
    if not isinstance(response_url, str):
        return _BINDING_ABSENT
    try:
        parsed = urllib.parse.urlsplit(response_url)
    except ValueError:
        return _BINDING_INVALID
    if parsed.path not in _ACCOUNT_POST_LIST_PATHS:
        return _BINDING_ABSENT
    bindings: list[str] = []
    for part in parsed.query.split("&"):
        if not part:
            continue
        encoded_key, separator, encoded_value = part.partition("=")
        key = _strict_query_component(encoded_key)
        if key is None:
            return _BINDING_INVALID
        if key not in _ACCOUNT_BINDING_KEYS:
            continue
        if not separator:
            return _BINDING_INVALID
        value = _strict_query_component(encoded_value)
        if value is None or _ACCOUNT_ID.fullmatch(value) is None:
            return _BINDING_INVALID
        bindings.append(value)
    if not bindings:
        return _BINDING_ABSENT
    if len(bindings) != 1:
        return _BINDING_INVALID
    return (
        _BINDING_MATCH
        if bindings[0] == expected_sec_uid
        else _BINDING_CONFLICT
    )


def _is_account_post_response(event: dict[str, Any]) -> bool:
    """Accept account pagination only from frozen official response paths."""
    params = event.get("params")
    response = params.get("response") if isinstance(params, dict) else None
    response_url = response.get("url") if isinstance(response, dict) else None
    if not isinstance(response_url, str):
        return False
    try:
        parsed = urllib.parse.urlsplit(response_url)
    except ValueError:
        return False
    return parsed.path in _ACCOUNT_POST_LIST_PATHS


def _container_account_binding(
    container: dict[str, Any], expected_sec_uid: str
) -> str:
    """Read account identity only from frozen keys on the list-owning object."""
    supplied = [
        container[key]
        for key in _ACCOUNT_BINDING_KEYS
        if key in container
    ]
    if not supplied:
        return _BINDING_ABSENT
    if any(
        not isinstance(value, str) or value != expected_sec_uid
        for value in supplied
    ):
        return _BINDING_CONFLICT
    return _BINDING_MATCH


def _item_belongs_to_account(
    item: dict[str, Any], expected_sec_uid: str
) -> bool:
    """Require the frozen author.sec_uid path to match exactly."""
    author = item.get("author")
    return bool(
        isinstance(author, dict)
        and isinstance(author.get("sec_uid"), str)
        and author["sec_uid"] == expected_sec_uid
    )


def _is_valid_pagination_cursor(value: Any) -> bool:
    """Accept only bounded scalar cursor forms used by public list responses."""
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return value >= 0
    return bool(
        isinstance(value, str)
        and value.strip()
        and len(value) <= 2_048
    )


def _normalized_has_more(value: Any) -> tuple[Optional[bool], bool]:
    """Normalize the public endpoint's boolean or exact integer 0/1 form."""
    if isinstance(value, bool):
        return value, True
    if type(value) is int and value in (0, 1):
        return bool(value), True
    return None, False


def _audit_account_post_candidate(
    data: Any,
    expected_sec_uid: str,
    response_binding: str,
) -> _AccountPostCandidateAudit:
    """Validate and merge every frozen list owner into one logical page."""
    if response_binding == _BINDING_CONFLICT:
        return _AccountPostCandidateAudit()
    if response_binding == _BINDING_INVALID:
        return _AccountPostCandidateAudit(invalid=True)
    if isinstance(data, dict):
        for status_key in ("status_code", "error_code"):
            if status_key not in data:
                continue
            status_value = data[status_key]
            if (
                isinstance(status_value, bool)
                or not isinstance(status_value, int)
                or status_value != 0
            ):
                return _AccountPostCandidateAudit(invalid=True)

    merged: dict[str, dict[str, Any]] = {}
    observations: list[PostPageObservation] = []
    invalid = False

    def retain(raw_item: dict[str, Any], item_id: str) -> None:
        if item_id not in merged:
            merged[item_id] = copy.deepcopy(raw_item)
        else:
            _merge_missing(merged[item_id], raw_item)

    for owner_path in _ACCOUNT_POST_LIST_OWNER_PATHS:
        owner = data
        for key in owner_path:
            if not isinstance(owner, dict):
                owner = None
                break
            owner = owner.get(key)
        if not isinstance(owner, dict):
            continue

        list_keys = [key for key in _ITEM_LIST_KEYS if key in owner]
        if not list_keys:
            continue
        container_binding = _container_account_binding(
            owner, expected_sec_uid
        )
        if container_binding == _BINDING_CONFLICT:
            invalid = True
            continue

        has_more = owner.get("has_more")
        metadata_valid = True
        if "has_more" in owner:
            has_more, has_more_valid = _normalized_has_more(has_more)
            if not has_more_valid:
                metadata_valid = False
                invalid = True

        cursor_values: list[Any] = []
        for cursor_key in ("max_cursor", "cursor", "min_cursor"):
            if cursor_key not in owner or owner[cursor_key] is None:
                continue
            cursor_value = owner[cursor_key]
            if not _is_valid_pagination_cursor(cursor_value):
                metadata_valid = False
                invalid = True
                continue
            cursor_values.append(cursor_value)
        cursor_fingerprints = {
            _cursor_fingerprint(cursor_value)
            for cursor_value in cursor_values
        }
        if len(cursor_fingerprints) > 1:
            metadata_valid = False
            invalid = True
        cursor = cursor_values[0] if cursor_values else None

        for list_key in list_keys:
            raw_items = owner[list_key]
            if not isinstance(raw_items, list):
                invalid = True
                continue
            list_valid = metadata_valid
            unique: dict[str, dict[str, Any]] = {}
            if not raw_items and _BINDING_MATCH not in {
                container_binding,
                response_binding,
            }:
                list_valid = False
                invalid = True
            for raw_item in raw_items:
                item_id = (
                    _account_post_item_id(raw_item)
                    if isinstance(raw_item, dict)
                    else None
                )
                if (
                    not isinstance(raw_item, dict)
                    or item_id is None
                    or not _is_trustworthy_aweme(raw_item)
                    or not _item_belongs_to_account(
                        raw_item, expected_sec_uid
                    )
                ):
                    list_valid = False
                    invalid = True
                    continue
                retain(raw_item, item_id)
                if item_id not in unique:
                    unique[item_id] = copy.deepcopy(raw_item)
                else:
                    _merge_missing(unique[item_id], raw_item)
            if list_valid:
                observations.append(
                    PostPageObservation(
                        items=list(unique.values()),
                        has_more=has_more,
                        cursor=cursor,
                    )
                )

    items = list(merged.values())
    if invalid or not observations:
        return _AccountPostCandidateAudit(
            items=items,
            invalid=invalid or bool(items),
        )

    has_more_states = {
        observation.has_more for observation in observations
    }
    candidate_cursor_fingerprints = {
        fingerprint
        for observation in observations
        if (fingerprint := _cursor_fingerprint(observation.cursor))
        is not None
    }
    if (
        len(has_more_states) > 1
        or len(candidate_cursor_fingerprints) > 1
    ):
        return _AccountPostCandidateAudit(items=items, invalid=True)
    cursor = next(
        (
            observation.cursor
            for observation in observations
            if observation.cursor is not None
        ),
        None,
    )
    return _AccountPostCandidateAudit(
        items=items,
        observation=PostPageObservation(
            items=items,
            has_more=observations[0].has_more,
            cursor=cursor,
        ),
    )


def extract_post_page_observations(
    data: Any,
    *,
    expected_sec_uid: Optional[str] = None,
    response_binding: str = _BINDING_ABSENT,
) -> list[PostPageObservation]:
    """Extract list-scoped pagination facts, optionally bound to one account."""
    if expected_sec_uid is not None:
        audit = _audit_account_post_candidate(
            data,
            expected_sec_uid,
            response_binding,
        )
        return [audit.observation] if audit.observation is not None else []

    observations: list[PostPageObservation] = []

    def inspect_owner(value: dict[str, Any]) -> None:
        owned_lists = [
            value[key]
            for key in _ITEM_LIST_KEYS
            if key in value and isinstance(value[key], list)
        ]
        for raw_items in owned_lists:
            trustworthy_items = [
                raw_item
                for raw_item in raw_items
                if isinstance(raw_item, dict)
                and _is_trustworthy_aweme(raw_item)
            ]
            unique: dict[str, dict[str, Any]] = {}
            for raw_item in trustworthy_items:
                item_id = _item_id(raw_item)
                if item_id is None:
                    continue
                if item_id not in unique:
                    unique[item_id] = copy.deepcopy(raw_item)
                else:
                    _merge_missing(unique[item_id], raw_item)
            if raw_items and not unique:
                continue
            has_more = value.get("has_more")
            if "has_more" in value:
                has_more, _ = _normalized_has_more(has_more)
            cursor = next(
                (
                    value[key]
                    for key in ("max_cursor", "cursor", "min_cursor")
                    if key in value and value[key] is not None
                ),
                None,
            )
            observations.append(
                PostPageObservation(
                    items=list(unique.values()),
                    has_more=has_more,
                    cursor=cursor,
                )
            )

    def walk(value: Any, depth: int = 0) -> None:
        if depth > 10:
            return
        if isinstance(value, dict):
            inspect_owner(value)
            for child in value.values():
                walk(child, depth + 1)
        elif isinstance(value, list):
            for child in value:
                walk(child, depth + 1)

    walk(data)
    return observations


def _cursor_fingerprint(cursor: Any) -> Optional[str]:
    """Return an irreversible correlation token for an in-memory cursor value."""
    if cursor is None:
        return None
    try:
        encoded = json.dumps(
            cursor,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    except (TypeError, ValueError):
        encoded = repr(type(cursor).__name__).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


def _is_allowed_host(host: str) -> bool:
    host = host.lower().rstrip(".")
    return any(
        host == suffix or host.endswith("." + suffix)
        for suffix in _ALLOWED_RESPONSE_HOSTS
    )


def _post_reference_from_public_url(url: str) -> Optional[tuple[str, str]]:
    """Return a validated public post kind and ID without retaining URL secrets."""
    try:
        parsed = urllib.parse.urlsplit(url)
    except ValueError:
        return None
    if (
        parsed.scheme.lower() != "https"
        or parsed.username is not None
        or parsed.password is not None
        or not _is_allowed_host(parsed.hostname or "")
    ):
        return None
    match = _POST_PATH.fullmatch(parsed.path)
    if match is None:
        return None
    return match.group("kind"), match.group("post_id")


def canonical_post_url_for_item(item: dict[str, Any], post_id: Any) -> str:
    """Prefer an ID-matching safe share path, then infer image notes."""
    value = str(post_id or "")
    if not _POST_ID.fullmatch(value):
        return ""
    reference = _post_reference_from_public_url(str(item.get("share_url") or ""))
    if reference is not None and reference[1] == value:
        return canonical_post_url(value, reference[0])
    note_media = item.get("images") or item.get("image_post_info")
    kind = "note" if isinstance(note_media, (dict, list)) and bool(note_media) else "video"
    return canonical_post_url(value, kind)


def _visible_metric_value(value: Any) -> Any:
    """Keep an explicit displayed number while removing its accessible label."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    match = _VISIBLE_METRIC_NUMBER.search(str(value))
    return match.group(0).replace(" ", "") if match else None


def extract_dom_items(cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert allowlisted visible cards into minimal, non-inferred post data."""
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for card in cards:
        reference = _post_reference_from_public_url(str(card.get("href") or ""))
        if reference is None:
            continue
        kind, post_id = reference
        if post_id in seen:
            continue
        seen.add(post_id)
        visible_stats: dict[str, Any] = {}
        supplied_stats = card.get("statistics")
        if isinstance(supplied_stats, dict):
            for key in _KNOWN_STATISTICS:
                value = _visible_metric_value(supplied_stats.get(key))
                if value is not None:
                    visible_stats[key] = value
        out.append(
            {
                "aweme_id": post_id,
                "desc": str(card.get("text") or "").strip(),
                "share_url": canonical_post_url(post_id, kind),
                "statistics": visible_stats,
                "is_top": True if card.get("is_pinned") is True else None,
                "_collection_source": "dom",
            }
        )
    return out


def _allowed_response(event: dict[str, Any]) -> Optional[tuple[str, str]]:
    """Return request id and query-free URL for an eligible response header."""
    if event.get("method") != "Network.responseReceived":
        return None
    params = event.get("params")
    if not isinstance(params, dict):
        return None
    response = params.get("response")
    if not isinstance(response, dict):
        return None
    request_id = params.get("requestId")
    url = response.get("url")
    if not isinstance(request_id, str) or not request_id or not isinstance(url, str):
        return None
    try:
        parsed = urllib.parse.urlsplit(url)
    except ValueError:
        return None
    if (
        parsed.scheme.lower() != "https"
        or parsed.username is not None
        or parsed.password is not None
        or not _is_allowed_host(parsed.hostname or "")
    ):
        return None
    resource_type = str(params.get("type") or "").lower()
    mime_type = str(response.get("mimeType") or "").lower()
    if resource_type not in {"xhr", "fetch"} and "json" not in mime_type:
        return None
    return request_id, sanitize_response_url(url)


def _response_http_status(event: dict[str, Any]) -> Optional[int]:
    """Return an exact integral CDP HTTP status, rejecting coercible values."""
    params = event.get("params")
    if not isinstance(params, dict):
        return None
    response = params.get("response")
    if not isinstance(response, dict):
        return None
    status = response.get("status")
    if isinstance(status, bool) or not isinstance(status, (int, float)):
        return None
    numeric_status = float(status)
    if not math.isfinite(numeric_status) or not numeric_status.is_integer():
        return None
    return int(numeric_status)


def _call_with_timeout(method, *args, timeout: float):
    """Pass a deadline to production APIs while retaining simple test fakes."""
    try:
        return method(*args, timeout=timeout)
    except TypeError as exc:
        message = str(exc)
        if "timeout" not in message or "unexpected keyword" not in message:
            raise
        return method(*args)


def _dom_snapshot(
    session: BrowserSession,
    requested_url: str,
    timeout: float,
) -> tuple[list[dict[str, Any]], Optional[dict[str, Any]]]:
    """Read cards only with an exact same-snapshot account identity."""
    snapshot = _call_with_timeout(
        session.evaluate,
        _DOM_CARDS_EXPRESSION,
        timeout=timeout,
    )
    if not isinstance(snapshot, dict):
        return [], None
    canonical_url = canonical_profile_url("douyin", requested_url)
    if canonical_url is None:
        return [], None
    expected_sec_uid = canonical_url.rstrip("/").rsplit("/", 1)[-1]
    raw_profile = snapshot.get("profile")
    if (
        not isinstance(raw_profile, dict)
        or not isinstance(raw_profile.get("sec_uid"), str)
        or raw_profile["sec_uid"] != expected_sec_uid
    ):
        return [], None
    profile = sanitize_profile_raw(
        raw_profile, requested_url, allow_dom_badge=True
    )
    if profile is None:
        return [], None
    cards = snapshot.get("cards")
    clean_cards = (
        [card for card in cards if isinstance(card, dict)]
        if isinstance(cards, list)
        else []
    )
    return clean_cards, profile


def _dom_profile_snapshot(
    session: BrowserSession,
    requested_url: str,
    timeout: float,
) -> Optional[dict[str, Any]]:
    """Read only the visible account header after a task-level restriction."""
    snapshot = _call_with_timeout(
        session.evaluate,
        _DOM_PROFILE_EXPRESSION,
        timeout=timeout,
    )
    if isinstance(snapshot, dict) and "profile" in snapshot:
        snapshot = snapshot.get("profile")
    return sanitize_profile_raw(
        snapshot, requested_url, allow_dom_badge=True
    )


def _date_bound(raw: Any) -> Optional[float]:
    if not raw:
        return None
    try:
        value = str(raw).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone(timedelta(hours=8)))
    return parsed.timestamp()


def _date_bounds(date_range: Any) -> Optional[tuple[Optional[float], Optional[float]]]:
    if not date_range or not isinstance(date_range, (tuple, list)):
        return None
    lower = _date_bound(date_range[0] if len(date_range) > 0 else None)
    upper = _date_bound(date_range[1] if len(date_range) > 1 else None)
    return (lower, upper)


def _item_timestamp(item: dict[str, Any]) -> Optional[float]:
    raw = item.get("create_time")
    if raw is None or isinstance(raw, bool):
        return None
    try:
        created = float(raw)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(created) or created < 0:
        return None
    if created > 100_000_000_000:
        created /= 1000.0
    return created


def _date_relation(
    item: dict[str, Any],
    bounds: Optional[tuple[Optional[float], Optional[float]]],
) -> str:
    """Classify a post for target counting and conservative lower-bound stop."""
    if bounds is None:
        return "unknown"
    created = _item_timestamp(item)
    if created is None:
        return "unknown"
    lower, upper = bounds
    if upper is not None and created > upper:
        return "newer_than_range"
    if lower is not None and created < lower:
        if bool(item.get("is_top") or item.get("is_top_aweme")):
            return "unknown"
        return "past_lower_bound"
    return "in_range"


@contextmanager
def _collection_session(session_factory, cleanup_state: dict[str, Any]):
    """Retain collection state when a normal context exit reports cleanup failure."""
    try:
        with session_factory() as session:
            yield session
    except BrowserError as exc:
        if not getattr(exc, "is_cleanup_failure", False):
            raise
        cleanup_state["diagnostic_code"] = "BROWSER_CLEANUP_FAILED"
        cleanup_state["cleanup_codes"] = list(
            _sanitize_cleanup_diagnostics(
                getattr(exc, "cleanup_diagnostics", ())
            )
        )


def collect_account_page(
    url: str,
    *,
    limit: int,
    date_range: Any = None,
    all_posts: bool = False,
    max_seconds: Optional[float] = None,
    max_scrolls: Optional[int] = None,
    cookie_records: tuple[dict[str, Any], ...] = (),
    session_factory=BrowserSession,
    monotonic=time.monotonic,
    sleep=time.sleep,
) -> DouyinBrowserResult:
    """Observe public response bodies within hard time/scroll/idle boundaries."""
    canonical_url = canonical_profile_url("douyin", url)
    if canonical_url is None:
        raise ValueError("invalid Douyin profile URL")
    expected_sec_uid = canonical_url.rstrip("/").rsplit("/", 1)[-1]
    if all_posts:
        seconds_budget = (
            PUBLIC_ALL_DEFAULT_MAX_SECONDS
            if max_seconds is None
            else max_seconds
        )
        scroll_budget = (
            PUBLIC_ALL_DEFAULT_MAX_SCROLLS
            if max_scrolls is None
            else max_scrolls
        )
        requested, seconds_budget, scroll_budget = validate_public_all_budgets(
            limit, seconds_budget, scroll_budget
        )
    else:
        requested = validate_public_limit(limit)
        seconds_budget = MAX_SECONDS if max_seconds is None else max_seconds
        scroll_budget = MAX_SCROLLS if max_scrolls is None else max_scrolls
        _, seconds_budget, scroll_budget = validate_public_all_budgets(
            requested, seconds_budget, scroll_budget
        )
    started = monotonic()
    deadline = started + seconds_budget
    bounds = _date_bounds(date_range)
    items: dict[str, dict[str, Any]] = {}
    pending: dict[str, dict[str, Any]] = {}
    safe_paths: list[str] = []
    candidate_response_count = 0
    failed_account_post_count = 0
    cleanup_state: dict[str, Any] = {}
    restriction: Optional[str] = None
    scrolls = 0
    idle = 0
    stop_condition: Optional[str] = None
    deadline_expired = False
    round_in_progress = False
    round_start_count = 0
    in_range_since_boundary = False
    past_lower_bound_since_boundary = False
    date_confirmation_pending = False
    observed_page_count = 0
    terminal_page_observed = False
    cursor_fingerprints: set[str] = set()
    repeated_cursor_count = 0
    profile_raw: Optional[dict[str, Any]] = None

    def remaining() -> float:
        return max(0.0, deadline - monotonic())

    def target_count() -> int:
        if all_posts or bounds is None:
            return len(items)
        return sum(
            _date_relation(item, bounds) == "in_range"
            for item in items.values()
        )

    def store_network_item(raw_item: dict[str, Any]) -> None:
        nonlocal in_range_since_boundary, past_lower_bound_since_boundary
        item_id = _item_id(raw_item)
        if item_id is None:
            return
        incoming = copy.deepcopy(raw_item)
        incoming["_collection_source"] = "network"
        if item_id in items:
            before_relation = _date_relation(items[item_id], bounds)
            _merge_missing(items[item_id], incoming)
            relation = _date_relation(items[item_id], bounds)
            if relation == "in_range" and before_relation != "in_range":
                in_range_since_boundary = True
            elif (
                relation == "past_lower_bound"
                and before_relation != "past_lower_bound"
            ):
                past_lower_bound_since_boundary = True
            return
        items[item_id] = incoming
        relation = _date_relation(incoming, bounds)
        if relation == "in_range":
            in_range_since_boundary = True
        elif relation == "past_lower_bound":
            past_lower_bound_since_boundary = True

    def consume_decoded(
        decoded: Any,
        *,
        is_account_post_response: bool,
        account_binding: str,
        blocks_exhaustive: bool,
    ) -> tuple[bool, Optional[PostPageObservation]]:
        """Apply one decoded response through the shared strict evidence path."""
        nonlocal observed_page_count, terminal_page_observed
        nonlocal repeated_cursor_count, stop_condition, profile_raw
        nonlocal failed_account_post_count
        before = len(items)
        audit = (
            _audit_account_post_candidate(
                decoded,
                expected_sec_uid,
                account_binding,
            )
            if is_account_post_response
            else None
        )
        if audit is not None and audit.invalid:
            if blocks_exhaustive:
                failed_account_post_count += 1
            for item in audit.items:
                store_network_item(item)
            return len(items) > before, None
        observations = (
            [audit.observation]
            if audit is not None and audit.observation is not None
            else []
        )
        if (
            audit is None
            or (
                account_binding != _BINDING_CONFLICT
                and not audit.invalid
            )
        ):
            discovered_profile = extract_profile_raw(decoded, url)
            if discovered_profile is not None:
                if profile_raw is None:
                    profile_raw = discovered_profile
                else:
                    _merge_profile_evidence(profile_raw, discovered_profile)
        if blocks_exhaustive and not observations:
            # A valid JSON body is not proof that an account page was consumed.
            failed_account_post_count += 1
        observation_result: Optional[PostPageObservation] = None
        for observation in observations:
            observation_result = observation
            observed_page_count += 1
            fingerprint = _cursor_fingerprint(observation.cursor)
            if fingerprint is not None:
                if fingerprint in cursor_fingerprints:
                    repeated_cursor_count += 1
                    if all_posts and observation.has_more is not False:
                        stop_condition = "repeated_cursor"
                else:
                    cursor_fingerprints.add(fingerprint)
            if observation.has_more is False:
                terminal_page_observed = True
                if all_posts and stop_condition != "repeated_cursor":
                    stop_condition = "terminal_page"
            for item in observation.items:
                store_network_item(item)
        return len(items) > before, observation_result

    def read_pending(request_id: str, session: BrowserSession) -> bool:
        """Try once; temporary body errors leave the candidate retryable."""
        nonlocal failed_account_post_count
        candidate = pending.get(request_id)
        if candidate is None:
            return False
        budget = remaining()
        if budget <= 0:
            return False
        try:
            body = _call_with_timeout(
                session.get_response_body,
                request_id,
                timeout=budget,
            )
        except (BrowserError, KeyError, RuntimeError, TypeError, UnicodeError):
            candidate["attempts"] += 1
            return False
        try:
            decoded = json.loads(body)
        except (json.JSONDecodeError, TypeError, UnicodeError):
            pending.pop(request_id, None)
            if candidate["blocks_exhaustive"]:
                failed_account_post_count += 1
            return False
        pending.pop(request_id, None)
        safe_url = candidate["safe_url"]
        if safe_url not in safe_paths:
            safe_paths.append(safe_url)
        added, _ = consume_decoded(
            decoded,
            is_account_post_response=candidate["is_account_post_response"],
            account_binding=candidate["account_binding"],
            blocks_exhaustive=candidate["blocks_exhaustive"],
        )
        return added

    def flush_pending(session: BrowserSession, *, drain: bool = False) -> None:
        # Header-only fakes do not emit loadingFinished.  A quiet boundary is a
        # bounded compatibility retry; production candidates remain pending
        # after temporary body errors and can succeed on a later finish/idle.
        for request_id in list(pending):
            read_pending(request_id, session)
            if (not drain and target_count() >= requested) or remaining() <= 0:
                break

    def process_event(event: Optional[dict[str, Any]], session: BrowserSession) -> None:
        """Register or finish one CDP response lifecycle event."""
        nonlocal candidate_response_count, failed_account_post_count
        method = event.get("method") if isinstance(event, dict) else None
        params = event.get("params") if isinstance(event, dict) else None
        params = params if isinstance(params, dict) else {}
        candidate = _allowed_response(event or {})
        if candidate:
            candidate_response_count += 1
            request_id, safe_url = candidate
            if safe_url not in safe_paths:
                safe_paths.append(safe_url)
            is_account_post_response = _is_account_post_response(event or {})
            account_binding = _response_account_binding(
                event or {}, expected_sec_uid
            )
            blocks_exhaustive = bool(
                is_account_post_response
                and account_binding != _BINDING_CONFLICT
            )
            if (
                blocks_exhaustive
                and _response_http_status(event or {}) != 200
            ):
                failed_account_post_count += 1
                return
            pending[request_id] = {
                "safe_url": safe_url,
                "is_account_post_response": is_account_post_response,
                "account_binding": account_binding,
                # An unreadable response from an eligible account-list path
                # could contain a missing page. Only an explicitly foreign
                # binding is known not to belong to the target; duplicate or
                # malformed bindings remain ambiguous.
                "blocks_exhaustive": blocks_exhaustive,
                "ready": False,
                "attempts": 0,
                "quiet_retried": False,
            }
            return
        if method == "Network.loadingFinished":
            request_id = params.get("requestId")
            if isinstance(request_id, str) and request_id in pending:
                pending[request_id]["ready"] = True
                read_pending(request_id, session)
            return
        if method == "Network.loadingFailed":
            request_id = params.get("requestId")
            if isinstance(request_id, str):
                failed_candidate = pending.pop(request_id, None)
                if (
                    failed_candidate is not None
                    and failed_candidate["blocks_exhaustive"]
                ):
                    failed_account_post_count += 1

    def retry_pending_at_quiet_boundary(session: BrowserSession) -> bool:
        """Retry each unresolved body once, requiring a fresh poll afterward."""
        attempted = False
        for request_id in list(pending):
            candidate = pending.get(request_id)
            if candidate is None or candidate["quiet_retried"]:
                continue
            candidate["quiet_retried"] = True
            attempted = True
            read_pending(request_id, session)
            if remaining() <= 0:
                break
        return attempted

    def drain_terminal_until_quiet(session: BrowserSession) -> None:
        """Finish terminal collection only after a command-free quiet poll."""
        nonlocal deadline_expired, restriction, stop_condition
        needs_page_check = True
        while True:
            budget = remaining()
            if budget <= 0:
                deadline_expired = True
                stop_condition = "timeout"
                return
            event = session.poll_event(timeout=min(1.0, budget))
            if event is not None:
                process_event(event, session)
                needs_page_check = True
                continue
            if retry_pending_at_quiet_boundary(session):
                needs_page_check = True
                continue
            if needs_page_check:
                budget = remaining()
                if budget <= 0:
                    deadline_expired = True
                    stop_condition = "timeout"
                    return
                visible_text = _call_with_timeout(
                    session.page_text,
                    timeout=budget,
                )
                if remaining() <= 0:
                    deadline_expired = True
                    stop_condition = "timeout"
                    return
                restriction = detect_restriction(visible_text)
                if restriction:
                    stop_condition = restriction
                    return
                needs_page_check = False
                continue
            # No CDP command is sent after this fresh quiet poll.
            return

    with _collection_session(session_factory, cleanup_state) as session:
        if cookie_records:
            session.set_cookie_records(cookie_records)
        budget = remaining()
        if budget <= 0:
            deadline_expired = True
            stop_condition = "timeout"
        else:
            _call_with_timeout(
                session.navigate,
                url,
                timeout=min(30.0, budget),
            )

        while (
            not deadline_expired
            and target_count() < requested
            and not (
                all_posts
                and stop_condition in {"terminal_page", "repeated_cursor"}
            )
        ):
            budget = remaining()
            if budget <= 0:
                deadline_expired = True
                stop_condition = "timeout"
                break

            event = session.poll_event(timeout=min(1.0, budget))
            process_event(event, session)

            if event is None:
                flush_pending(session, drain=all_posts)

            budget = remaining()
            if budget <= 0:
                deadline_expired = True
                stop_condition = "timeout"
                break
            visible_text = _call_with_timeout(
                session.page_text,
                timeout=budget,
            )
            if remaining() <= 0:
                deadline_expired = True
                stop_condition = "timeout"
                break
            restriction = detect_restriction(visible_text)
            if restriction:
                stop_condition = restriction
                break
            if all_posts and stop_condition in {
                "terminal_page",
                "repeated_cursor",
            }:
                break
            if target_count() >= requested:
                stop_condition = "limit"
                break
            if event is not None:
                continue

            if round_in_progress:
                idle = 0 if len(items) > round_start_count else idle + 1
                if not all_posts and date_confirmation_pending:
                    if not in_range_since_boundary:
                        stop_condition = "date_lower_bound"
                        break
                elif not all_posts and past_lower_bound_since_boundary:
                    date_confirmation_pending = True
                if idle >= MAX_IDLE_ROUNDS:
                    stop_condition = "idle"
                    break
            elif not all_posts and past_lower_bound_since_boundary:
                date_confirmation_pending = True

            if scrolls >= scroll_budget:
                stop_condition = "max_scrolls"
                break

            round_start_count = len(items)
            in_range_since_boundary = False
            past_lower_bound_since_boundary = False
            budget = remaining()
            if budget <= 0:
                deadline_expired = True
                stop_condition = "timeout"
                break
            _call_with_timeout(session.scroll_by, 1, timeout=budget)
            scrolls += 1
            round_in_progress = True
            budget = remaining()
            if budget <= 0:
                deadline_expired = True
                stop_condition = "timeout"
                break
            sleep(min(1.0, budget))

        cards: list[dict[str, Any]] = []
        visible_profile: Optional[dict[str, Any]] = None
        if not deadline_expired:
            budget = remaining()
            if budget > 0:
                try:
                    if restriction:
                        cards = []
                        visible_profile = _dom_profile_snapshot(
                            session, url, budget
                        )
                    else:
                        cards, visible_profile = _dom_snapshot(
                            session, url, budget
                        )
                except Exception:
                    if not restriction:
                        raise
                    cards, visible_profile = [], None
                if remaining() <= 0:
                    deadline_expired = True
                    stop_condition = "timeout"
            else:
                deadline_expired = True
                stop_condition = "timeout"

        if (
            all_posts
            and terminal_page_observed
            and not deadline_expired
            and not restriction
        ):
            # DOM evaluation and every response-body/page-text CDP command can
            # enqueue lifecycle events. Exhaustive evidence is committed only
            # after a later poll is quiet and no further CDP command follows.
            drain_terminal_until_quiet(session)

        # Pure in-memory merges are intentionally delayed until after the
        # command-free quiet boundary so they cannot invalidate it.
        if visible_profile is not None:
            if profile_raw is None:
                profile_raw = visible_profile
            else:
                _merge_profile_evidence(profile_raw, visible_profile)
        if not restriction:
            for item in extract_dom_items(cards):
                item_id = str(item["aweme_id"])
                if item_id not in items:
                    items[item_id] = item
                else:
                    _merge_missing(items[item_id], item)
        network_count = sum(
            item.get("_collection_source") == "network" for item in items.values()
        )

    observed_items = list(items.values())
    range_items = (
        [item for item in observed_items if _date_relation(item, bounds) == "in_range"]
        if bounds is not None
        else observed_items
    )
    unknown_date_count = (
        sum(_item_timestamp(item) is None for item in observed_items)
        if bounds is not None
        else 0
    )
    if bounds is not None and not all_posts:
        matched_ids = {_item_id(item) for item in range_items}
        remaining_items = [
            item for item in observed_items if _item_id(item) not in matched_ids
        ]
        # Prioritize requested evidence without erasing bounded out-of-range
        # observations that fit in the remaining result budget.
        final = (range_items + remaining_items)[:requested]
    else:
        final = observed_items[:requested]
    dom_count = sum(item.get("_collection_source") == "dom" for item in final)
    source = (
        "network+dom"
        if network_count and dom_count
        else "dom"
        if dom_count
        else "network"
        if network_count
        else "none"
    )
    item_budget_truncated = len(items) > requested
    unresolved_account_post_count = sum(
        bool(candidate["blocks_exhaustive"])
        for candidate in pending.values()
    )
    account_post_candidates_complete = bool(
        failed_account_post_count == 0
        and unresolved_account_post_count == 0
    )
    if restriction:
        stop_condition = restriction
    elif deadline_expired or stop_condition == "timeout":
        stop_condition = "timeout"
    elif all_posts and repeated_cursor_count:
        stop_condition = "repeated_cursor"
    elif all_posts and terminal_page_observed and not item_budget_truncated:
        stop_condition = "terminal_page"
    elif (len(range_items) if bounds is not None and not all_posts else len(final)) >= requested:
        stop_condition = "max_items" if all_posts else "limit"
    elif stop_condition is None:
        stop_condition = "timeout" if deadline_expired else "idle"
    is_exhaustive = bool(
        all_posts
        and terminal_page_observed
        and not item_budget_truncated
        and not deadline_expired
        and not restriction
        and repeated_cursor_count == 0
        and account_post_candidates_complete
        and stop_condition == "terminal_page"
    )
    if profile_raw is not None:
        sanitized_profile = sanitize_profile_raw(
            profile_raw, url, allow_dom_badge=True
        )
        if sanitized_profile is not None:
            profile_raw = sanitized_profile
    return DouyinBrowserResult(
        profile_raw=profile_raw,
        aweme_items=final,
        source=source,
        restriction=restriction,
        diagnostic_code=cleanup_state.get("diagnostic_code"),
        diagnostics={
            "scroll_rounds": scrolls,
            "candidate_response_count": candidate_response_count,
            "response_paths": safe_paths,
            "pending_response_count": len(pending),
            "unresolved_account_post_count": unresolved_account_post_count,
            "failed_account_post_count": failed_account_post_count,
            "page_context_fallback_used": False,
            "page_context_request_count": 0,
            "stop_condition": stop_condition,
            **(
                {"cleanup_codes": cleanup_state["cleanup_codes"]}
                if cleanup_state.get("cleanup_codes")
                else {}
            ),
        },
        coverage={
            "requested_all": bool(all_posts),
            "evidence_access": (
                "user_authorized_session" if cookie_records else "anonymous_public"
            ),
            "browser_fallback_requested": True,
            "browser_fallback_launched": True,
            "browser_evidence_source": source,
            "page_context_fallback_used": False,
            "page_context_request_count": 0,
            **(
                {
                    "restriction_source": (
                        DOUYIN_BROWSER_VISIBLE_RESTRICTION_SOURCE
                    ),
                    "restriction_marker": (
                        DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKERS[restriction]
                    ),
                }
                if restriction in DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKERS
                else {}
            ),
            "scroll_rounds": scrolls,
            "max_seconds": float(seconds_budget),
            "max_scrolls": scroll_budget,
            **({"max_items": requested} if all_posts else {}),
            "is_exhaustive": is_exhaustive,
            "terminal_page_observed": terminal_page_observed,
            "observed_page_count": observed_page_count,
            "observed_post_count": len(observed_items),
            "cursor_fingerprint_count": len(cursor_fingerprints),
            "repeated_cursor_count": repeated_cursor_count,
            "stop_condition": stop_condition,
            "unknown_date_count": unknown_date_count,
            "range_match_count": len(range_items) if bounds is not None else len(final),
            "range_filter_applied": bounds is not None,
            "range_no_match": bool(bounds is not None and observed_items and not range_items),
        },
    )


def collect_post_page(
    url: str,
    *,
    max_seconds: float = DETAIL_DEFAULT_MAX_SECONDS,
    max_candidates: int = DETAIL_DEFAULT_MAX_CANDIDATES,
    max_body_chars: int = DETAIL_DEFAULT_MAX_BODY_CHARS,
    cookie_records: tuple[dict[str, Any], ...] = (),
    session_factory=BrowserSession,
    monotonic=time.monotonic,
) -> DouyinBrowserResult:
    """Collect one already-known public detail item in one bounded session."""
    canonical_url = canonical_item_url("douyin", url)
    if canonical_url is None:
        raise ValueError("invalid Douyin item URL")
    if (
        isinstance(max_seconds, bool)
        or not isinstance(max_seconds, (int, float))
        or not math.isfinite(max_seconds)
        or max_seconds <= 0
        or max_seconds > DETAIL_MAX_SECONDS
    ):
        raise ValueError("invalid detail max_seconds")
    if (
        isinstance(max_candidates, bool)
        or not isinstance(max_candidates, int)
        or max_candidates <= 0
        or max_candidates > DETAIL_MAX_CANDIDATES
    ):
        raise ValueError("invalid detail max_candidates")
    if (
        isinstance(max_body_chars, bool)
        or not isinstance(max_body_chars, int)
        or max_body_chars <= 0
        or max_body_chars > DETAIL_MAX_BODY_CHARS
    ):
        raise ValueError("invalid detail max_body_chars")
    deadline = monotonic() + float(max_seconds)
    pending: dict[str, str] = {}
    candidate_count = 0
    item: Optional[dict[str, Any]] = None
    restriction: Optional[str] = None
    identity_conflict = False
    deadline_expired = False
    source = "network"
    cleanup_state: dict[str, Any] = {}

    with _collection_session(session_factory, cleanup_state) as session:
        if cookie_records:
            session.set_cookie_records(cookie_records)
        budget = max(0.0, deadline - monotonic())
        if budget > 0:
            _call_with_timeout(
                session.navigate,
                canonical_url,
                timeout=min(float(max_seconds), budget),
            )
        else:
            deadline_expired = True
        while item is None and restriction is None:
            budget = max(0.0, deadline - monotonic())
            if budget <= 0:
                deadline_expired = True
                break
            event = session.poll_event(timeout=min(1.0, budget))
            method = event.get("method") if isinstance(event, dict) else None
            params = event.get("params") if isinstance(event, dict) else None
            params = params if isinstance(params, dict) else {}
            allowed = _allowed_response(event or {})
            discovered: Optional[dict[str, Any]] = None
            if allowed is not None:
                request_id, safe_url = allowed
                if candidate_count < max_candidates:
                    candidate_count += 1
                    pending[request_id] = safe_url
            elif method == "Network.loadingFinished":
                request_id = params.get("requestId")
                if isinstance(request_id, str) and request_id in pending:
                    pending.pop(request_id, None)
                    body_budget = max(0.0, deadline - monotonic())
                    if body_budget <= 0:
                        deadline_expired = True
                        body = None
                    else:
                        try:
                            body = _call_with_timeout(
                                session.get_response_body,
                                request_id,
                                timeout=body_budget,
                            )
                        except (
                            BrowserError,
                            KeyError,
                            RuntimeError,
                            TypeError,
                            UnicodeError,
                        ):
                            body = None
                    if isinstance(body, str) and len(body) <= max_body_chars:
                        try:
                            decoded = json.loads(body)
                        except (json.JSONDecodeError, TypeError, UnicodeError):
                            decoded = None
                        candidates = _detail_response_candidates(decoded)
                        identity_conflict = any(
                            _detail_identity_conflicts(candidate, canonical_url)
                            for candidate in candidates
                        )
                        if not identity_conflict:
                            for candidate in candidates:
                                discovered = _bound_detail_item(
                                    candidate, canonical_url
                                )
                                if discovered is not None:
                                    break

            budget = max(0.0, deadline - monotonic())
            if budget <= 0:
                deadline_expired = True
                break
            visible_text = _call_with_timeout(
                session.page_text,
                timeout=budget,
            )
            restriction = detect_restriction(visible_text)
            if restriction is not None:
                break
            if deadline - monotonic() <= 0:
                deadline_expired = True
                break
            if identity_conflict:
                break
            if discovered is not None:
                item = discovered
                break
            if event is None:
                break

        if item is None and restriction is None and not identity_conflict:
            budget = max(0.0, deadline - monotonic())
            if budget > 0:
                snapshot = _call_with_timeout(
                    session.evaluate,
                    _DOM_DETAIL_EXPRESSION,
                    timeout=budget,
                )
                if deadline - monotonic() <= 0:
                    deadline_expired = True
                elif isinstance(snapshot, dict):
                    identity_conflict = _detail_identity_conflicts(
                        snapshot, canonical_url
                    )
                    if not identity_conflict and _has_visible_detail_evidence(snapshot):
                        item = _bound_detail_item(snapshot, canonical_url)
                        if item is not None:
                            item["_collection_source"] = "dom"
                            source = "dom"
            else:
                deadline_expired = True

    return DouyinBrowserResult(
        aweme_items=[item] if item is not None else [],
        source=source,
        restriction=restriction,
        diagnostic_code=(
            cleanup_state.get("diagnostic_code")
            or ("DETAIL_ID_MISMATCH" if identity_conflict else None)
        ),
        diagnostics={
            "candidate_response_count": candidate_count,
            "pending_response_count": len(pending),
            "stop_condition": restriction
            or (
                "id_mismatch"
                if identity_conflict
                else "detail"
                if item is not None
                else "timeout"
                if deadline_expired
                else "empty"
            ),
            **(
                {"cleanup_codes": cleanup_state["cleanup_codes"]}
                if cleanup_state.get("cleanup_codes")
                else {}
            ),
        },
    )
