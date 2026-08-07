"""Shared public collection limits, stop reasons, and Douyin page states."""

import math
import re
from datetime import timedelta, timezone


BEIJING_TZ = timezone(timedelta(hours=8))
PUBLIC_LIMIT_DEFAULT = 30
PUBLIC_LIMIT_MAX = 100

PUBLIC_ALL_DEFAULT_MAX_ITEMS = 10_000
PUBLIC_ALL_DEFAULT_MAX_SECONDS = 1_800.0
PUBLIC_ALL_DEFAULT_MAX_SCROLLS = 2_000

PUBLIC_ALL_HARD_MAX_ITEMS = 50_000
PUBLIC_ALL_HARD_MAX_SECONDS = 14_400.0
PUBLIC_ALL_HARD_MAX_SCROLLS = 20_000


def validate_public_limit(value):
    """Return a valid limited-mode request without coercion or clamping."""
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or value < 1
        or value > PUBLIC_LIMIT_MAX
    ):
        raise ValueError(f"limit must be an integer from 1 to {PUBLIC_LIMIT_MAX}")
    return value


def validate_public_all_max_items(value):
    """Return an accepted bounded complete-collection item budget."""
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or value < 1
        or value > PUBLIC_ALL_HARD_MAX_ITEMS
    ):
        raise ValueError(
            f"max_items must be an integer from 1 to {PUBLIC_ALL_HARD_MAX_ITEMS}"
        )
    return value


def validate_public_all_budgets(max_items, max_seconds, max_scrolls):
    """Return accepted public ``--all`` budgets without silently changing them."""
    max_items = validate_public_all_max_items(max_items)
    if (
        isinstance(max_seconds, bool)
        or not isinstance(max_seconds, (int, float))
        or not math.isfinite(max_seconds)
        or max_seconds <= 0
        or max_seconds > PUBLIC_ALL_HARD_MAX_SECONDS
    ):
        raise ValueError(
            f"max_seconds must be finite, greater than 0, and at most "
            f"{PUBLIC_ALL_HARD_MAX_SECONDS}"
        )
    if (
        isinstance(max_scrolls, bool)
        or not isinstance(max_scrolls, int)
        or max_scrolls < 1
        or max_scrolls > PUBLIC_ALL_HARD_MAX_SCROLLS
    ):
        raise ValueError(
            f"max_scrolls must be an integer from 1 to "
            f"{PUBLIC_ALL_HARD_MAX_SCROLLS}"
        )
    return max_items, float(max_seconds), max_scrolls

STOP_LOGIN = "LOGIN_REQUIRED"
STOP_VERIFICATION = "VERIFICATION_REQUIRED"
STOP_ACCOUNT_UNAVAILABLE = "ACCOUNT_UNAVAILABLE"
STOP_ACCESS_RESTRICTED = "ACCESS_RESTRICTED"
STOP_RATE_LIMITED = "RATE_LIMITED"
STOP_PARSER_FAILED = "PARSER_FAILED"
STOP_NO_PUBLIC_CONTENT = "NO_PUBLIC_CONTENT"
STOP_UNSUPPORTED = "UNSUPPORTED_PLATFORM"
STOP_INTERNAL = "INTERNAL_ERROR"


DOUYIN_BROWSER_VISIBLE_RESTRICTION_SOURCE = "browser_visible_text"
DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKERS = {
    STOP_LOGIN: "LOGIN_WALL_VISIBLE",
    STOP_VERIFICATION: "VERIFICATION_CHALLENGE_VISIBLE",
    STOP_RATE_LIMITED: "RATE_LIMIT_VISIBLE",
    STOP_ACCESS_RESTRICTED: "ACCESS_RESTRICTION_VISIBLE",
    STOP_ACCOUNT_UNAVAILABLE: "ACCOUNT_UNAVAILABLE_VISIBLE",
    STOP_NO_PUBLIC_CONTENT: "NO_PUBLIC_CONTENT_VISIBLE",
}
DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKER_VALUES = frozenset(
    DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKERS.values()
)


# Order is the public status priority.  Parser failure is deliberately absent:
# callers run these page-state checks before deciding that a structure changed.
DOUYIN_PAGE_STATE_PATTERNS = (
    (
        re.compile(
            r"滑动验证|人机验证|安全验证|verify you are human|please verify",
            re.I,
        ),
        STOP_VERIFICATION,
    ),
    (
        re.compile(
            r"登录后查看|请先登录|登录抖音|需登录|登录后访问|扫码登录",
            re.I,
        ),
        STOP_LOGIN,
    ),
    (
        re.compile(
            r"访问过于频繁|操作过于频繁|请求频率过高|频繁",
            re.I,
        ),
        STOP_RATE_LIMITED,
    ),
    (
        re.compile(r"网络异常[，, ]?请稍后|访问受限", re.I),
        STOP_ACCESS_RESTRICTED,
    ),
    (
        re.compile(
            r"账号不存在|用户不存在|该账号已被封禁|账号已注销|帐号不存在|"
            r"用户已注销|账号不可用",
            re.I,
        ),
        STOP_ACCOUNT_UNAVAILABLE,
    ),
    (
        re.compile(
            r"暂无公开作品|暂无作品|还没有发布(?:任何)?(?:公开)?作品|"
            r"尚未发布(?:任何)?作品|没有公开内容",
            re.I,
        ),
        STOP_NO_PUBLIC_CONTENT,
    ),
)
