"""Strict canonical public URL policy shared by collectors and orchestration."""
from __future__ import annotations

import re
import urllib.parse

_WEIBO_RESERVED_SEGMENTS = frozenset({
    "search", "explore", "hot", "topic", "pub", "home", "login", "signup",
    "help", "about", "m", "p", "s", "wbprofile", "compose", "api",
    "comments", "attitude", "i", "fav", "tv", "u",
})

_XIAOHONGSHU_NOTE_ID = r"[0-9A-Za-z]{16,32}"
_XIAOHONGSHU_USER_ID = r"[0-9A-Za-z_-]{16,32}"


def sanitize_routing_url(value: object) -> str | None:
    """Remove query/fragment before routing and reject ambiguous authorities."""
    if not isinstance(value, str) or not value or any(ord(ch) < 32 for ch in value):
        return None
    try:
        parsed = urllib.parse.urlsplit(value)
        port = parsed.port
    except ValueError:
        return None
    hostname = parsed.hostname
    if (
        parsed.scheme != "https"
        or not hostname
        or parsed.username is not None
        or parsed.password is not None
        or port is not None
        or parsed.netloc != hostname
        or re.fullmatch(r"[a-z0-9.-]+", hostname) is None
        or "%" in parsed.netloc
        or "%" in parsed.path
        or ";" in urllib.parse.unquote(parsed.path)
    ):
        return None
    return urllib.parse.urlunsplit(
        ("https", hostname, parsed.path or "/", "", "")
    )


def _parse_public_https(value: object) -> urllib.parse.SplitResult | None:
    safe_url = sanitize_routing_url(value)
    return urllib.parse.urlsplit(safe_url) if safe_url is not None else None


def canonical_profile_url(platform: str, value: object) -> str | None:
    """Validate a platform account homepage and remove non-identity URL parts."""
    parsed = _parse_public_https(value)
    if parsed is None:
        return None
    host = parsed.hostname.lower()
    if platform == "douyin":
        if host not in {"douyin.com", "www.douyin.com", "iesdouyin.com"}:
            return None
        match = re.fullmatch(
            r"/(?:user|share/user)/([A-Za-z0-9_-]+)/?", parsed.path
        )
        if match is None:
            return None
        return f"https://www.douyin.com/user/{match.group(1)}"
    if platform == "bilibili":
        if host != "space.bilibili.com":
            return None
        match = re.fullmatch(r"/(\d+)/?", parsed.path)
        if match is None:
            return None
        return f"https://space.bilibili.com/{match.group(1)}"
    if platform == "weibo":
        if host not in {"weibo.com", "www.weibo.com"}:
            return None
        uid_match = re.fullmatch(r"/u/(\d+)/?", parsed.path)
        if uid_match is not None:
            return f"https://weibo.com/u/{uid_match.group(1)}"
        name_match = re.fullmatch(r"/([A-Za-z0-9_-]+)/?", parsed.path)
        if (
            name_match is None
            or name_match.group(1).lower() in _WEIBO_RESERVED_SEGMENTS
        ):
            return None
        return f"https://weibo.com/{name_match.group(1)}"
    if platform == "xiaohongshu":
        if host not in {"xiaohongshu.com", "www.xiaohongshu.com"}:
            return None
        match = re.fullmatch(
            rf"/user/profile/({_XIAOHONGSHU_USER_ID})/?", parsed.path
        )
        if match is None:
            return None
        return f"https://www.xiaohongshu.com/user/profile/{match.group(1)}"
    return None


def canonical_item_url(
    platform: str,
    value: object,
    expected_post_id: object | None = None,
) -> str | None:
    """Validate a platform item URL and bind it to an optional expected ID."""
    parsed = _parse_public_https(value)
    if parsed is None:
        return None
    host = parsed.hostname.lower()
    expected = (
        str(expected_post_id).strip() if expected_post_id is not None else None
    )
    if platform == "douyin":
        if host not in {"douyin.com", "www.douyin.com", "iesdouyin.com"}:
            return None
        match = re.fullmatch(r"/(video|note)/(\d+)/?", parsed.path)
        if match is None or (expected is not None and match.group(2) != expected):
            return None
        return f"https://www.douyin.com/{match.group(1)}/{match.group(2)}"
    if platform == "bilibili":
        if host not in {"bilibili.com", "www.bilibili.com"}:
            return None
        match = re.fullmatch(r"/video/(BV[0-9A-Za-z]+)/?", parsed.path)
        if match is None or (expected is not None and match.group(1) != expected):
            return None
        return f"https://www.bilibili.com/video/{match.group(1)}"
    if platform == "weibo":
        if host not in {"weibo.com", "www.weibo.com"}:
            return None
        match = re.fullmatch(r"/(\d+)/([0-9A-Za-z]+)/?", parsed.path)
        if match is None or (expected is not None and match.group(2) != expected):
            return None
        return f"https://weibo.com/{match.group(1)}/{match.group(2)}"
    if platform == "xiaohongshu":
        if host not in {"xiaohongshu.com", "www.xiaohongshu.com"}:
            return None
        match = re.fullmatch(rf"/explore/({_XIAOHONGSHU_NOTE_ID})/?", parsed.path)
        if match is None or (expected is not None and match.group(1) != expected):
            return None
        return f"https://www.xiaohongshu.com/explore/{match.group(1)}"
    return None
