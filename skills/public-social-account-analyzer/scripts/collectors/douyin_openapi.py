"""Official Douyin OpenAPI client for one exact OAuth token + open_id pair.

This module deliberately implements neither OAuth login nor token lifecycle
operations.  ``oauth/userinfo`` receives the documented form credentials;
``video/list`` receives the access token only in its documented header.
"""

from __future__ import annotations

import json
import hmac
import re
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any, Callable

from .url_policy import canonical_item_url, sanitize_routing_url
from ._utils import BEIJING_TZ, now_iso


_PROFILE_ENDPOINT = "https://open.douyin.com/oauth/userinfo/"
_VIDEO_LIST_URL = "https://open.douyin.com/video/list/"
_NUMERIC_ID = re.compile(r"^[0-9]+$")
_HASHTAG = re.compile(r"#([^#\s]+)")
_MEDIA_TYPES = {2: "video", 4: "image_text"}
_SAFE_ERROR_CODES = frozenset({
    "INVALID_ENDPOINT",
    "INVALID_RESPONSE",
    "OPENAPI_ERROR",
    "SECRET_ECHO",
    "TRANSPORT_ERROR",
})


def _valid_credential(value: Any) -> bool:
    return (
        type(value) is str
        and bool(value)
        and value.isprintable()
        and not any(character.isspace() for character in value)
    )


class DouyinOpenAPIError(RuntimeError):
    """Sanitized OpenAPI failure with optional already-collected results."""

    def __init__(
        self,
        error_code: str,
        message: str,
        *,
        partial_posts: list[dict[str, Any]] | None = None,
        coverage: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.partial_posts = list(partial_posts or [])
        self.coverage = dict(coverage or {})


def _video_list_request_url(cursor: int, count: int) -> str:
    """Build the only supported list query in one auditable location.

    The official online-token request parameters still need live verification;
    until then this intentionally emits only the documented cursor/count pair.
    """

    query = urllib.parse.urlencode({"cursor": cursor, "count": count})
    return f"{_VIDEO_LIST_URL}?{query}"


def _urllib_transport(
    *,
    method: str,
    url: str,
    headers: dict[str, str],
    data: bytes | None = None,
) -> bytes:
    class RejectRedirects(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method=method,
    )
    opener = urllib.request.build_opener(RejectRedirects())
    with opener.open(request, timeout=20) as response:
        return response.read()


def _safe_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int) and value >= 0:
        return value
    return None


def _sanitize_public_asset_url(value: Any) -> str | None:
    """Keep a public HTTPS asset location without signed query material."""
    safe_url = sanitize_routing_url(value)
    if safe_url is None:
        return None
    parsed = urllib.parse.urlsplit(safe_url)
    if parsed.scheme != "https" or parsed.hostname is None:
        return None
    return urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, "", "")
    )


def _sanitize_share_url(
    value: Any, expected_video_id: str
) -> tuple[str | None, str]:
    """Separate ID-bound item evidence from an official opaque share source."""

    safe_url = sanitize_routing_url(value)
    if safe_url is None:
        raise DouyinOpenAPIError(
            "INVALID_RESPONSE", "Douyin OpenAPI returned an invalid share URL"
        )
    canonical = canonical_item_url("douyin", safe_url, expected_video_id)
    if canonical is not None:
        return canonical, canonical

    parsed = urllib.parse.urlsplit(safe_url)
    if parsed.hostname not in {"iesdouyin.com", "www.iesdouyin.com"}:
        raise DouyinOpenAPIError(
            "INVALID_RESPONSE", "Douyin OpenAPI returned an invalid share URL"
        )
    numeric_share = re.fullmatch(
        r"/share/(video|note)/(\d+)/?", parsed.path
    )
    if numeric_share is not None:
        if numeric_share.group(2) != expected_video_id:
            raise DouyinOpenAPIError(
                "INVALID_RESPONSE", "Douyin OpenAPI returned an invalid share URL"
            )
        canonical = (
            f"https://www.douyin.com/{numeric_share.group(1)}/"
            f"{expected_video_id}"
        )
        return canonical, canonical

    match = re.fullmatch(r"/share/(?:video|note)/(.+)/?", parsed.path)
    opaque = match.group(1).rstrip("/") if match is not None else ""
    if (
        not opaque
        or re.fullmatch(r"[A-Za-z0-9_+=/-]+", opaque) is None
        or not any(character.isalnum() for character in opaque)
    ):
        raise DouyinOpenAPIError(
            "INVALID_RESPONSE", "Douyin OpenAPI returned an invalid share URL"
        )
    return None, safe_url


def _parse_cursor(value: Any) -> int:
    if isinstance(value, bool):
        raise DouyinOpenAPIError(
            "INVALID_RESPONSE", "Douyin OpenAPI returned an invalid cursor"
        )
    if isinstance(value, int) and value >= 0:
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    raise DouyinOpenAPIError(
        "INVALID_RESPONSE", "Douyin OpenAPI returned an invalid cursor"
    )


def _parse_has_more(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and not isinstance(value, bool) and value in (0, 1):
        return bool(value)
    raise DouyinOpenAPIError(
        "INVALID_RESPONSE", "Douyin OpenAPI returned an invalid has_more value"
    )


def _check_error_codes(payload: dict[str, Any]) -> None:
    for container_name, container in (
        ("top-level", payload),
        ("extra", payload.get("extra")),
        ("data", payload.get("data")),
    ):
        if not isinstance(container, dict) or "error_code" not in container:
            continue
        code = container["error_code"]
        exact_success = (
            (type(code) is int and code == 0)
            or (type(code) is str and code == "0")
        )
        if not exact_success:
            raise DouyinOpenAPIError(
                "OPENAPI_ERROR",
                f"Douyin OpenAPI {container_name} reported an error",
            )


def _decode_payload(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        payload = raw
    else:
        decode_failed = False
        payload = None
        try:
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            payload = json.loads(raw)
        except (UnicodeDecodeError, json.JSONDecodeError, TypeError):
            decode_failed = True
        if decode_failed:
            raise DouyinOpenAPIError(
                "INVALID_RESPONSE", "Douyin OpenAPI returned invalid JSON"
            )
    if not isinstance(payload, dict):
        raise DouyinOpenAPIError(
            "INVALID_RESPONSE", "Douyin OpenAPI returned a non-object response"
        )
    _check_error_codes(payload)
    return payload


def _contains_secret(value: Any, secret: str) -> bool:
    if isinstance(value, str):
        return secret in value
    if isinstance(value, dict):
        return any(
            _contains_secret(key, secret) or _contains_secret(item, secret)
            for key, item in value.items()
        )
    if isinstance(value, (list, tuple)):
        return any(_contains_secret(item, secret) for item in value)
    return False


def _recognized_media_type(media_type: Any) -> tuple[int, str]:
    if type(media_type) is int and media_type in _MEDIA_TYPES:
        return media_type, _MEDIA_TYPES[media_type]
    raise DouyinOpenAPIError(
        "INVALID_RESPONSE", "Douyin OpenAPI returned an unknown media_type"
    )


def _map_video(item: Any) -> dict[str, Any]:
    if not isinstance(item, dict):
        raise DouyinOpenAPIError(
            "INVALID_RESPONSE", "Douyin OpenAPI returned a non-object video"
        )
    video_id = item.get("video_id")
    if isinstance(video_id, int) and not isinstance(video_id, bool):
        video_id = str(video_id)
    if not isinstance(video_id, str) or not _NUMERIC_ID.fullmatch(video_id):
        raise DouyinOpenAPIError(
            "INVALID_RESPONSE", "Douyin OpenAPI returned an invalid video_id"
        )
    post_url, source_url = _sanitize_share_url(item.get("share_url"), video_id)
    title = item.get("title") if isinstance(item.get("title"), str) else None
    create_time = item.get("create_time")
    if isinstance(create_time, int) and not isinstance(create_time, bool):
        timestamp_invalid = False
        try:
            published_at = datetime.fromtimestamp(create_time, BEIJING_TZ).isoformat()
        except (OverflowError, OSError, ValueError):
            timestamp_invalid = True
        if timestamp_invalid:
            raise DouyinOpenAPIError(
                "INVALID_RESPONSE", "Douyin OpenAPI returned an invalid create_time"
            )
    else:
        published_at = None
    is_top = item.get("is_top")
    if isinstance(is_top, bool):
        is_pinned = is_top
    elif isinstance(is_top, int) and is_top in (0, 1):
        is_pinned = bool(is_top)
    else:
        is_pinned = None
    statistics = item.get("statistics")
    if not isinstance(statistics, dict):
        statistics = {}
    media_type, content_type = _recognized_media_type(item.get("media_type"))
    now = now_iso()
    return {
        "platform": "douyin",
        "post_id": video_id,
        "post_url": post_url,
        "published_at": published_at,
        "content_type": content_type,
        "title": title,
        "text": title,
        "duration_seconds": None,
        "hashtags": _HASHTAG.findall(title or ""),
        "is_pinned": is_pinned,
        "is_repost": None,
        "is_promoted": None,
        "collection_status": "SUCCESS",
        "collection_status_source": "declared",
        "collected_at": now,
        "source_url": source_url,
        "views": _safe_int(statistics.get("play_count")),
        "likes": _safe_int(statistics.get("digg_count")),
        "comments": _safe_int(statistics.get("comment_count")),
        "favorites": None,
        "shares": _safe_int(statistics.get("share_count")),
        "coins": None,
        "danmaku": None,
        "platform_metrics": {
            "download_count": _safe_int(statistics.get("download_count")),
            "forward_count": _safe_int(statistics.get("forward_count")),
            "media_type": media_type,
        },
    }


class DouyinOpenAPIClient:
    """Minimal client for the account identified by the OAuth credentials."""

    def __init__(
        self,
        access_token: str,
        open_id: str | None = None,
        transport: Callable[..., Any] | None = None,
    ) -> None:
        if not _valid_credential(access_token):
            raise DouyinOpenAPIError(
                "TOKEN_MISSING", "DOUYIN_OPENAPI_ACCESS_TOKEN is required"
            )
        if not _valid_credential(open_id):
            raise DouyinOpenAPIError(
                "OPEN_ID_MISSING", "DOUYIN_OPENAPI_OPEN_ID is required"
            )
        self._access_token = access_token
        self._open_id = open_id
        self._profile_identity_verified = False
        self._transport = transport or _urllib_transport

    def is_profile_identity_verified(self, open_id: str) -> bool:
        """Confirm the last profile response matched this in-memory OAuth ID."""
        return bool(
            self._profile_identity_verified
            and type(open_id) is str
            and hmac.compare_digest(open_id, self._open_id)
        )

    @staticmethod
    def _is_fixed_endpoint(method: str, url: str) -> bool:
        if method == "POST":
            return url == _PROFILE_ENDPOINT
        if method != "GET":
            return False
        parse_failed = False
        try:
            parsed = urllib.parse.urlsplit(url)
            port = parsed.port
            query = urllib.parse.parse_qs(
                parsed.query,
                keep_blank_values=True,
                strict_parsing=True,
            )
        except ValueError:
            parse_failed = True
        if parse_failed:
            return False
        return bool(
            parsed.scheme == "https"
            and parsed.hostname == "open.douyin.com"
            and parsed.username is None
            and parsed.password is None
            and port is None
            and parsed.path == "/video/list/"
            and not parsed.fragment
            and set(query) == {"cursor", "count"}
            and len(query["cursor"]) == 1
            and len(query["count"]) == 1
            and query["cursor"][0].isdigit()
            and query["count"][0].isdigit()
        )

    def _request(self, method: str, url: str) -> dict[str, Any]:
        if not self._is_fixed_endpoint(method, url):
            raise DouyinOpenAPIError(
                "INVALID_ENDPOINT", "Douyin OpenAPI request endpoint is not allowed"
            )
        if method == "POST":
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            }
            data = urllib.parse.urlencode({
                "access_token": self._access_token,
                "open_id": self._open_id,
            }).encode("ascii")
        else:
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "access-token": self._access_token,
            }
            data = None
        transport_failed = False
        raw = None
        try:
            raw = self._transport(method=method, url=url, headers=headers, data=data)
        except Exception:
            transport_failed = True
        if transport_failed:
            raise DouyinOpenAPIError(
                "TRANSPORT_ERROR", "Douyin OpenAPI request failed"
            )
        payload = _decode_payload(raw)
        if method == "POST" and (
            type(payload.get("err_no")) is not int
            or payload["err_no"] != 0
        ):
            raise DouyinOpenAPIError(
                "OPENAPI_ERROR", "Douyin OpenAPI userinfo reported an error"
            )
        if _contains_secret(payload, self._access_token):
            raise DouyinOpenAPIError(
                "SECRET_ECHO", "Douyin OpenAPI response contained credential data"
            )
        return payload

    def collect_profile(self) -> dict[str, Any]:
        payload = self._request("POST", _PROFILE_ENDPOINT)
        data = payload.get("data")
        if not isinstance(data, dict):
            raise DouyinOpenAPIError(
                "INVALID_RESPONSE", "Douyin OpenAPI returned invalid profile data"
            )
        open_id = data.get("open_id")
        if not isinstance(open_id, str) or open_id != self._open_id:
            raise DouyinOpenAPIError(
                "INVALID_RESPONSE", "Douyin OpenAPI profile identity did not match"
            )
        self._profile_identity_verified = True
        account_name = data.get("nickname") or data.get("display_name")
        if not isinstance(account_name, str) or not account_name:
            raise DouyinOpenAPIError(
                "INVALID_RESPONSE", "Douyin OpenAPI profile is missing account name"
            )
        sec_uid = data.get("sec_uid")
        if not isinstance(sec_uid, str) or not sec_uid.strip():
            raise DouyinOpenAPIError(
                "INVALID_RESPONSE", "Douyin OpenAPI profile is missing sec_uid"
            )
        # Public profile URL contract: only the public web URL is allowed into
        # task.json / reports. The OAuth endpoint must never be persisted.
        profile_url = f"https://www.douyin.com/user/{sec_uid}"
        followers = _safe_int(data.get("follower_count"))
        post_count = _safe_int(data.get("video_count"))
        verified = data.get("is_verified")
        if not isinstance(verified, bool):
            verified = None
        return {
            "platform": "douyin",
            "account_id": sec_uid,
            "account_name": account_name,
            "profile_url": profile_url,
            "bio": data.get("description") if isinstance(data.get("description"), str) else None,
            "verified": verified,
            "followers": followers,
            "post_count": post_count,
            "level": None,
            "platform_metrics": {
                "avatar": _sanitize_public_asset_url(data.get("avatar")),
                "authorization_source": "douyin_openapi_token_owner",
            },
            "collected_at": now_iso(),
            "field_visibility": {
                "bio": "visible" if isinstance(data.get("description"), str) else "hidden",
                "verified": "visible" if verified is not None else "hidden",
                "followers": "visible" if followers is not None else "hidden",
                "post_count": "visible" if post_count is not None else "hidden",
            },
        }

    def collect_video_pages(
        self,
        limit: int | None = None,
        page_size: int = 20,
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        if limit is not None and (
            isinstance(limit, bool) or not isinstance(limit, int) or limit < 0
        ):
            raise ValueError("limit must be a non-negative integer or None")
        if isinstance(page_size, bool) or not isinstance(page_size, int) or page_size <= 0:
            raise ValueError("page_size must be a positive integer")

        requested_all = limit is None
        posts: list[dict[str, Any]] = []
        seen_ids: set[str] = set()
        cursor = 0
        pages = 0
        repeated_cursors = 0
        zero_new_pages = 0
        consecutive_zero_new = 0

        def coverage(stop_condition: str, terminal: bool = False) -> dict[str, Any]:
            return {
                "requested_all": requested_all,
                "is_exhaustive": terminal,
                "terminal_page_observed": terminal,
                "observed_page_count": pages,
                "observed_post_count": len(posts),
                "repeated_cursor_count": repeated_cursors,
                "zero_new_page_count": zero_new_pages,
                "stop_condition": stop_condition,
            }

        if limit == 0:
            return posts, coverage("limit")

        while True:
            count = page_size if limit is None else min(page_size, limit - len(posts))
            page_error_code = None
            try:
                payload = self._request(
                    "GET", _video_list_request_url(cursor, count)
                )
                data = payload.get("data")
                if not isinstance(data, dict):
                    raise DouyinOpenAPIError(
                        "INVALID_RESPONSE", "Douyin OpenAPI returned invalid list data"
                    )
                raw_items = data.get("list")
                if not isinstance(raw_items, list):
                    raise DouyinOpenAPIError(
                        "INVALID_RESPONSE", "Douyin OpenAPI returned a non-list video list"
                    )
                if len(raw_items) > count:
                    raise DouyinOpenAPIError(
                        "INVALID_RESPONSE",
                        "Douyin OpenAPI returned more videos than requested",
                    )
                next_cursor = _parse_cursor(data.get("cursor"))
                has_more = _parse_has_more(data.get("has_more"))
                mapped_page = [_map_video(item) for item in raw_items]
            except DouyinOpenAPIError as exc:
                page_error_code = (
                    exc.error_code
                    if exc.error_code in _SAFE_ERROR_CODES
                    else "INVALID_RESPONSE"
                )
            if page_error_code is not None:
                partial_coverage = coverage("api_error")
                raise DouyinOpenAPIError(
                    page_error_code,
                    "Douyin OpenAPI video page could not be collected",
                    partial_posts=posts,
                    coverage=partial_coverage,
                )

            pages += 1
            new_count = 0
            for post in mapped_page:
                if post["post_id"] in seen_ids:
                    continue
                seen_ids.add(post["post_id"])
                posts.append(post)
                new_count += 1
                if limit is not None and len(posts) >= limit:
                    break

            if new_count == 0:
                zero_new_pages += 1
                consecutive_zero_new += 1
            else:
                consecutive_zero_new = 0

            if not has_more:
                return posts, coverage("terminal_page", terminal=True)
            if limit is not None and len(posts) >= limit:
                return posts, coverage("limit")
            if next_cursor <= cursor:
                repeated_cursors += 1
                return posts, coverage("repeated_cursor")
            if consecutive_zero_new >= 2:
                return posts, coverage("repeated_zero_new_page")
            cursor = next_cursor


__all__ = ["DouyinOpenAPIClient", "DouyinOpenAPIError"]
