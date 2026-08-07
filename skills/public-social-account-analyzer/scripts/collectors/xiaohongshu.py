"""Xiaohongshu public-page collector with a no-bypass evidence contract.

The collector reads only JSON state already embedded in a directly opened
public profile or note page.  It never calls signed/private endpoints, follows
no share redirects, and stops when the page requires login or verification.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any

from ._constants import BEIJING_TZ, PUBLIC_LIMIT_DEFAULT, validate_public_limit
from ._utils import extract_hashtags, now_iso, parse_int, ts_to_iso
from .base import BaseCollector
from .url_policy import canonical_item_url, canonical_profile_url


PLATFORM = "xiaohongshu"
LOGIN_REQUIRED = "LOGIN_REQUIRED"
VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED"
ACCOUNT_UNAVAILABLE = "ACCOUNT_UNAVAILABLE"
ACCESS_RESTRICTED = "ACCESS_RESTRICTED"
RATE_LIMITED = "RATE_LIMITED"
PARSER_FAILED = "PARSER_FAILED"
NO_PUBLIC_CONTENT = "NO_PUBLIC_CONTENT"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
_STATE_SCRIPT = re.compile(
    r"<script[^>]+id=[\"'](?:__XHS_INITIAL_STATE__|__NEXT_DATA__)[\"'][^>]*>(.*?)</script>",
    re.IGNORECASE | re.DOTALL,
)
_MODERN_STATE_SCRIPT = re.compile(
    r"<script[^>]*>\s*window\.__INITIAL_STATE__\s*=\s*(.*?)</script>",
    re.IGNORECASE | re.DOTALL,
)
_NON_VISIBLE_BLOCK = re.compile(
    r"<(?:script|style)\b[^>]*>.*?</(?:script|style)\s*>",
    re.IGNORECASE | re.DOTALL,
)
_TAG = re.compile(r"<[^>]+>")


class XiaohongshuError(RuntimeError):
    """Structured public-page failure for safe orchestration stop reasons."""

    def __init__(self, stop_reason: str, message: str):
        super().__init__(f"[{stop_reason}] {message}")
        self.stop_reason = stop_reason


def _cookie_header(cookie_records: tuple[dict[str, Any], ...]) -> str | None:
    """Build one in-memory Cookie header without persisting session values."""
    values = [
        f"{record['name']}={record['value']}"
        for record in cookie_records
        if isinstance(record, dict)
        and isinstance(record.get("name"), str)
        and isinstance(record.get("value"), str)
    ]
    return "; ".join(values) or None


def _http_get_text(
    url: str, cookie_records: tuple[dict[str, Any], ...] = ()
) -> str:
    """Fetch one direct page with an optional in-memory user session, never bypassing protection."""
    headers = dict(_HEADERS)
    cookie_header = _cookie_header(cookie_records)
    if cookie_header is not None:
        headers["Cookie"] = cookie_header
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            requested_profile = canonical_profile_url(PLATFORM, url)
            final_url = getattr(response, "geturl", lambda: url)()
            if (
                requested_profile is not None
                and canonical_profile_url(PLATFORM, final_url)
                != requested_profile
            ):
                raise XiaohongshuError(
                    ACCOUNT_UNAVAILABLE,
                    "小红书公开主页跳转后不再绑定目标账号",
                )
            return response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            raise XiaohongshuError(
                LOGIN_REQUIRED, f"小红书公开页面要求登录或验证 (HTTP {error.code})"
            ) from error
        if error.code == 404:
            raise XiaohongshuError(ACCOUNT_UNAVAILABLE, "小红书账号或笔记不存在") from error
        if error.code == 429:
            raise XiaohongshuError(RATE_LIMITED, "小红书公开页面请求频率受限") from error
        raise XiaohongshuError(
            ACCESS_RESTRICTED,
            f"小红书公开页面访问受限 (HTTP {error.code})",
        ) from error
    except urllib.error.URLError as error:
        raise XiaohongshuError(ACCESS_RESTRICTED, "小红书公开页面网络不可达") from error


def _browser_rendered_html(
    url: str, cookie_records: tuple[dict[str, Any], ...]
) -> str:
    """Render one direct page in a temporary browser without API retries."""
    from .browser_backend import BrowserError, BrowserSession

    try:
        with BrowserSession() as session:
            session.set_cookie_records(cookie_records)
            return session.navigate_and_get_html(url)
    except BrowserError as error:
        raise XiaohongshuError(
            ACCESS_RESTRICTED, "小红书浏览器页面无法加载"
        ) from error


def _page_protection_reason(page: str) -> str | None:
    """Classify visible page protection before attempting any state parsing."""
    visible = html.unescape(_TAG.sub(" ", _NON_VISIBLE_BLOCK.sub(" ", page)))
    lowered = visible.lower()
    if any(marker in visible or marker in lowered for marker in (
        "验证码", "滑块", "captcha",
    )):
        return VERIFICATION_REQUIRED
    if any(marker in visible or marker in lowered for marker in (
        "请登录", "登录后", "扫码登录", "sign in", "log in",
    )):
        return LOGIN_REQUIRED
    return None


def _find_state(value: Any) -> dict[str, Any] | None:
    """Find one page-state object containing a public user and/or note list."""
    if isinstance(value, dict):
        if (
            isinstance(value.get("user"), dict)
            and isinstance(value.get("notes"), list)
        ):
            return value
        for child in value.values():
            state = _find_state(child)
            if state is not None:
                return state
    elif isinstance(value, list):
        for child in value:
            state = _find_state(child)
            if state is not None:
                return state
    return None


def _replace_js_undefined(value: str) -> str:
    """Replace JavaScript undefined tokens outside strings with JSON null."""
    output: list[str] = []
    index = 0
    in_string = False
    escaped = False
    while index < len(value):
        char = value[index]
        if in_string:
            output.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            index += 1
            continue
        if char == '"':
            in_string = True
            output.append(char)
            index += 1
            continue
        if value.startswith("undefined", index):
            before = value[index - 1] if index else ""
            end = index + len("undefined")
            after = value[end] if end < len(value) else ""
            if not (before.isalnum() or before in "_$") and not (
                after.isalnum() or after in "_$"
            ):
                output.append("null")
                index = end
                continue
        output.append(char)
        index += 1
    return "".join(output)


def _decode_script_state(value: str, *, allow_undefined: bool = False) -> Any:
    payload = html.unescape(value).strip()
    if payload.endswith(";"):
        payload = payload[:-1].rstrip()
    if allow_undefined:
        payload = _replace_js_undefined(payload)
    return json.loads(payload)


def _find_modern_user_store(value: Any) -> dict[str, Any] | None:
    """Find the modern user store without treating viewer identity as the target."""
    if isinstance(value, dict):
        if (
            isinstance(value.get("userPageData"), dict)
            and isinstance(value.get("notes"), list)
        ):
            return value
        for child in value.values():
            store = _find_modern_user_store(child)
            if store is not None:
                return store
    elif isinstance(value, list):
        for child in value:
            store = _find_modern_user_store(child)
            if store is not None:
                return store
    return None


def _interaction_counts(value: Any) -> dict[str, Any]:
    if not isinstance(value, list):
        return {}
    counts: dict[str, Any] = {}
    for item in value:
        if not isinstance(item, dict) or not isinstance(item.get("type"), str):
            continue
        counts[item["type"]] = item.get("count")
    return counts


def _modern_note_owner_ids(value: Any) -> set[str]:
    """Return explicit owner IDs from modern profile-card wrappers."""
    if not isinstance(value, list):
        return set()
    owner_ids: set[str] = set()
    for bucket in value:
        wrappers = bucket if isinstance(bucket, list) else [bucket]
        for wrapper in wrappers:
            if not isinstance(wrapper, dict):
                continue
            card = wrapper.get("noteCard")
            owner = card.get("user") if isinstance(card, dict) else None
            owner_id = owner.get("userId") if isinstance(owner, dict) else None
            if isinstance(owner_id, str) and owner_id:
                owner_ids.add(owner_id)
    return owner_ids


def _modern_note_records(
    value: Any,
    target_id: str,
    profile_url: str,
    *,
    allow_ownerless: bool,
) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    wrappers: list[Any] = []
    for bucket in value:
        if isinstance(bucket, list):
            wrappers.extend(bucket)
        else:
            wrappers.append(bucket)
    notes: list[dict[str, Any]] = []
    for source_rank, wrapper in enumerate(wrappers, 1):
        if not isinstance(wrapper, dict):
            continue
        card = wrapper.get("noteCard")
        if not isinstance(card, dict):
            continue
        owner = card.get("user")
        owner_id = owner.get("userId") if isinstance(owner, dict) else None
        if isinstance(owner_id, str) and owner_id and owner_id != target_id:
            continue
        if not owner_id and not allow_ownerless:
            continue
        interaction = card.get("interactInfo")
        interaction = interaction if isinstance(interaction, dict) else {}
        note_id = card.get("noteId") or wrapper.get("id")
        local_record_key = not isinstance(note_id, (str, int)) or not str(
            note_id
        ).strip()
        if local_record_key:
            title = card.get("displayTitle")
            if not isinstance(title, str) or not title.strip():
                continue
            material = f"{profile_url}\0{title}\0{source_rank}".encode("utf-8")
            note_id = "xhs-card-" + hashlib.sha256(material).hexdigest()[:20]
        notes.append({
            "noteId": note_id,
            "title": card.get("displayTitle"),
            "type": card.get("type"),
            "likedCount": interaction.get("likedCount"),
            "isTop": interaction.get("sticky"),
            "_localRecordKey": local_record_key,
            "_sourceRank": source_rank,
            "_sourceUrl": profile_url,
        })
    return notes


def _modern_profile_state(
    parsed: Any, profile_url: str | None
) -> dict[str, Any] | None:
    canonical = canonical_profile_url(PLATFORM, profile_url)
    if canonical is None:
        return None
    store = _find_modern_user_store(parsed)
    if store is None:
        return None
    page_data = store.get("userPageData")
    basic = page_data.get("basicInfo") if isinstance(page_data, dict) else None
    if not isinstance(basic, dict):
        return None
    target_id = canonical.rsplit("/", 1)[-1]
    result = page_data.get("result")
    if isinstance(result, dict):
        if result.get("success") is False:
            return None
        result_code = result.get("code")
        if result_code not in (None, 0, "0"):
            return None
    explicit_target_id = basic.get("userId", page_data.get("userId"))
    if explicit_target_id is not None:
        if not isinstance(explicit_target_id, str) or explicit_target_id != target_id:
            return None
        identity_binding = "profile_user_id"
    elif target_id in _modern_note_owner_ids(store.get("notes")):
        identity_binding = "target_owned_card"
    else:
        return None
    counts = _interaction_counts(page_data.get("interactions"))
    return {
        "user": {
            "userId": target_id,
            "_identityBinding": identity_binding,
            "nickname": basic.get("nickname"),
            "desc": basic.get("desc"),
            "redId": basic.get("redId"),
            "follows": counts.get("follows"),
            "fans": counts.get("fans"),
            "likesAndFavorites": counts.get("interaction"),
        },
        "notes": _modern_note_records(
            store.get("notes"),
            target_id,
            canonical,
            allow_ownerless=identity_binding == "profile_user_id",
        ),
    }


def _parse_page_state(
    page: str, profile_url: str | None = None
) -> dict[str, Any]:
    protection_reason = _page_protection_reason(page)
    if protection_reason is not None:
        raise XiaohongshuError(protection_reason, "小红书页面要求登录或验证")
    for match in _STATE_SCRIPT.finditer(page):
        try:
            parsed = _decode_script_state(match.group(1))
        except json.JSONDecodeError:
            continue
        state = _find_state(parsed)
        if state is not None:
            return state
    for match in _MODERN_STATE_SCRIPT.finditer(page):
        try:
            parsed = _decode_script_state(match.group(1), allow_undefined=True)
        except json.JSONDecodeError:
            continue
        state = _modern_profile_state(parsed, profile_url)
        if state is not None:
            return state
    raise XiaohongshuError(
        PARSER_FAILED, "小红书公开页面未提供可核验的嵌入账号与笔记数据"
    )


def _page_state(
    profile_url: str,
    cookie_records: tuple[dict[str, Any], ...] = (),
    browser_fallback: bool = True,
) -> dict[str, Any]:
    try:
        if cookie_records:
            return _parse_page_state(
                _http_get_text(profile_url, cookie_records), profile_url
            )
        return _parse_page_state(_http_get_text(profile_url), profile_url)
    except XiaohongshuError as error:
        if not (
            cookie_records
            and browser_fallback
            and error.stop_reason in {LOGIN_REQUIRED, PARSER_FAILED}
        ):
            raise
    return _parse_page_state(
        _browser_rendered_html(profile_url, cookie_records), profile_url
    )


def _note_id(note: dict[str, Any]) -> str | None:
    value = note.get("noteId", note.get("id"))
    if not isinstance(value, (str, int)):
        return None
    normalized = str(value).strip()
    return normalized or None


def _published_at(value: Any) -> str | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return ts_to_iso(value)
    if not isinstance(value, str) or not value.strip():
        return None
    cleaned = value.strip()
    try:
        parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=BEIJING_TZ)
    return parsed.astimezone(BEIJING_TZ).isoformat()


def _optional_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in (0, 1):
        return bool(value)
    if (
        isinstance(value, str)
        and value.strip().lower() in {"0", "1", "true", "false"}
    ):
        return value.strip().lower() in {"1", "true"}
    return None


def _raw_note(note: dict[str, Any]) -> dict[str, Any] | None:
    note_id = _note_id(note)
    if note_id is None:
        return None
    local_record_key = note.get("_localRecordKey") is True
    if local_record_key:
        note_url = None
        source_url = canonical_profile_url(PLATFORM, note.get("_sourceUrl"))
        if source_url is None:
            return None
    else:
        note_url = canonical_item_url(
            PLATFORM, f"https://www.xiaohongshu.com/explore/{note_id}", note_id
        )
        if note_url is None:
            return None
        source_url = note_url
    title = note.get("title") if isinstance(note.get("title"), str) else None
    text = note.get("desc", note.get("content"))
    text = text if isinstance(text, str) else None
    note_type = note.get("type")
    content_type = "video" if note_type in {"video", "vide"} else "image_text"
    views = parse_int(note.get("viewCount"))
    likes = parse_int(note.get("likedCount", note.get("likeCount")))
    favorites = parse_int(note.get("collectedCount", note.get("collectCount")))
    comments = parse_int(note.get("commentCount"))
    shares = parse_int(note.get("shareCount"))
    return {
        "platform": PLATFORM,
        "post_id": note_id,
        "post_url": note_url,
        "published_at": _published_at(note.get("time", note.get("publishTime"))),
        "content_type": content_type,
        "title": title,
        "text": text,
        "duration_seconds": parse_int(note.get("duration")),
        "hashtags": extract_hashtags(title, text),
        "is_pinned": _optional_bool(note.get("isTop")),
        "is_repost": _optional_bool(note.get("isRepost")),
        "is_promoted": _optional_bool(note.get("isPromoted")),
        "views": views,
        "likes": likes,
        "comments": comments,
        "favorites": favorites,
        "shares": shares,
        "coins": None,
        "danmaku": None,
        "collection_status": "PARTIAL" if local_record_key else "SUCCESS",
        "collected_at": now_iso(),
        "source_url": source_url,
        "field_visibility": {
            "views": "visible" if views is not None else "hidden",
            "likes": "visible" if likes is not None else "hidden",
            "comments": "visible" if comments is not None else "hidden",
            "favorites": "visible" if favorites is not None else "hidden",
            "shares": "visible" if shares is not None else "hidden",
        },
        "platform_metrics": (
            {
                "note_type": note_type,
                "collection_source": "xiaohongshu_profile_cards",
                "platform_post_id_known": False,
                "local_record_key": True,
                "item_url_known": False,
                "source_rank": note.get("_sourceRank"),
            }
            if local_record_key
            else {"note_type": note_type}
        ),
    }


class XiaohongshuCollector(BaseCollector):
    """Collect public fields embedded in one directly opened profile page."""

    platform = PLATFORM

    def __init__(
        self,
        cookie_records: tuple[dict[str, Any], ...] = (),
        browser_fallback: bool = True,
    ):
        """Use an already-sanitized, user-authorized session only in memory."""
        self._cookie_records = tuple(cookie_records)
        self._browser_fallback = bool(browser_fallback)
        self._profile_state_cache: dict[str, dict[str, Any]] = {}

    def _page_state(self, profile_url: str) -> dict[str, Any]:
        cached = self._profile_state_cache.get(profile_url)
        if cached is not None:
            return cached
        state = _page_state(
            profile_url,
            self._cookie_records,
            browser_fallback=self._browser_fallback,
        )
        self._profile_state_cache[profile_url] = state
        return state

    def _get_text(self, url: str) -> str:
        if self._cookie_records:
            return _http_get_text(url, self._cookie_records)
        return _http_get_text(url)

    def supports(self, url: str) -> bool:
        return canonical_profile_url(PLATFORM, url) is not None

    def check_access(self, url: str) -> dict[str, Any]:
        canonical = canonical_profile_url(PLATFORM, url)
        if canonical is None:
            raise XiaohongshuError(ACCOUNT_UNAVAILABLE, "不支持的小红书公开账号 URL")
        state = self._page_state(canonical)
        if not state.get("user"):
            raise XiaohongshuError(ACCOUNT_UNAVAILABLE, "小红书公开页面未提供账号资料")
        return {"accessible": True, "status": "ok", "stop_reason": None}

    def collect_profile(self, url: str) -> dict[str, Any]:
        canonical = canonical_profile_url(PLATFORM, url)
        if canonical is None:
            raise XiaohongshuError(ACCOUNT_UNAVAILABLE, "不支持的小红书公开账号 URL")
        user = self._page_state(canonical).get("user")
        if not isinstance(user, dict):
            raise XiaohongshuError(ACCOUNT_UNAVAILABLE, "小红书公开页面未提供账号资料")
        followers = parse_int(user.get("fans", user.get("followerCount")))
        post_count = parse_int(user.get("noteCount", user.get("notesCount")))
        target_id = canonical.rsplit("/", 1)[-1]
        return self.normalize_profile({
            "platform": PLATFORM,
            "account_id": target_id,
            "account_name": user.get("nickname", user.get("name")),
            "profile_url": canonical,
            "bio": user.get("desc", user.get("description")),
            "verified": _optional_bool(user.get("verified")),
            "followers": followers,
            "post_count": post_count,
            "platform_metrics": {
                "following": parse_int(
                    user.get("follows", user.get("followingCount"))
                ),
                "red_id": user.get("redId"),
                "likes_and_favorites": parse_int(user.get("likesAndFavorites")),
                "identity_binding": user.get("_identityBinding"),
            },
            "field_visibility": {
                "followers": "visible" if followers is not None else "hidden",
                "post_count": "visible" if post_count is not None else "hidden",
            },
            "collected_at": now_iso(),
        })

    def collect_post_list(
        self,
        url: str,
        limit: int = PUBLIC_LIMIT_DEFAULT,
        date_range: tuple[str | None, str | None] | None = None,
    ) -> list[dict[str, Any]]:
        canonical = canonical_profile_url(PLATFORM, url)
        if canonical is None:
            raise XiaohongshuError(ACCOUNT_UNAVAILABLE, "不支持的小红书公开账号 URL")
        limit = validate_public_limit(limit)
        notes = self._page_state(canonical).get("notes")
        if not isinstance(notes, list):
            raise XiaohongshuError(PARSER_FAILED, "小红书公开页面未提供笔记列表")
        posts: list[dict[str, Any]] = []
        seen: set[str] = set()
        for note in notes:
            if not isinstance(note, dict):
                continue
            raw = _raw_note(note)
            if raw is None or raw["post_id"] in seen:
                continue
            published_at = raw.get("published_at")
            if date_range and published_at is not None:
                start, end = date_range
                if (start and published_at < start) or (end and published_at > end):
                    continue
            seen.add(raw["post_id"])
            posts.append(self.normalize_post(raw))
            if len(posts) >= limit:
                break
        if not posts:
            raise XiaohongshuError(NO_PUBLIC_CONTENT, "小红书公开页面没有可核验笔记")
        return posts

    def collect_post_detail(self, post_url: str) -> dict[str, Any]:
        canonical = canonical_item_url(PLATFORM, post_url)
        if canonical is None:
            raise XiaohongshuError(PARSER_FAILED, "不支持的小红书公开笔记 URL")
        page = self._get_text(canonical)
        state = _parse_page_state(page)
        notes = state.get("notes")
        if not isinstance(notes, list):
            raise XiaohongshuError(PARSER_FAILED, "小红书公开笔记页面未提供可核验数据")
        note_id = canonical.rsplit("/", 1)[-1]
        for note in notes:
            if isinstance(note, dict) and _note_id(note) == note_id:
                raw = _raw_note(note)
                if raw is not None:
                    return self.normalize_post(raw)
        raise XiaohongshuError(ACCESS_RESTRICTED, "小红书公开笔记详情不可见")

    def collect_comments(self, post_url: str, limit: int = 20) -> list[dict[str, Any]]:
        if canonical_item_url(PLATFORM, post_url) is None:
            raise XiaohongshuError(PARSER_FAILED, "不支持的小红书公开笔记 URL")
        raise XiaohongshuError(
            "COMMENTS_UNAVAILABLE", "小红书公开页面未提供可核验评论列表"
        )
