"""微博公开账号采集适配器。

状态：P1 已接入；默认启用。可通过环境变量
``WEIBO_COLLECTOR_ENABLED=0`` 临时停用，以便在平台公开页面变化时安全降级。

设计要点（合规边界，与 B站/Douyin 适配器一致）：
- 仅用标准库（`urllib`）访问微博**公开** AJAX 端点（profile/info、statuses/mymblog、
  statuses/show），绝不绕过登录 / 验证码 / 滑块 / 频控（见 `references/exceptions.md`）。
- 遇到登录墙 / 验证码（HTTP 401/403，或返回登录页 HTML）立即上抛
  `LOGIN_REQUIRED` 并停止，绝不绕过、绝不以空数据假装采集完成。
- 字段不可见写 `None`（绝不用 `0` 代替未知）；`favorites` 对微博恒为 `None`。
- 微博时间格式多样（相对时间 / 今天HH:MM / MM-DD / 英文格式），采用 best-effort
  解析，无法解析时 `published_at` 置 `None`（honest null）。
- 当显式停用时，所有采集方法抛出携带 `ADAPTER_UNAVAILABLE` 的
  `WeiboError`，使编排器记入 `stop_reason = ADAPTER_UNAVAILABLE` 并如实停止。

不实现 Bilibili / Douyin（由各自适配器负责）。
"""
from __future__ import annotations

import html
import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from typing import Any

from ._constants import BEIJING_TZ, PUBLIC_LIMIT_DEFAULT, validate_public_limit
from ._utils import now_iso as _now_iso
from ._utils import parse_int as _int
from .base import BaseCollector  # 适配 scripts/collectors 作为 sys.path 入口
from .url_policy import canonical_item_url, canonical_profile_url

# P1 平台默认启用；环境变量只允许显式关闭，不能让未设置时静默失效。
ENABLED = os.environ.get("WEIBO_COLLECTOR_ENABLED", "1") != "0"

PLATFORM = "weibo"

# 微博 stop_reason 取值严格对齐 references/exceptions.md 枚举（字符串值一致）
ADAPTER_UNAVAILABLE = "ADAPTER_UNAVAILABLE"
LOGIN_REQUIRED = "LOGIN_REQUIRED"
VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED"
ACCOUNT_UNAVAILABLE = "ACCOUNT_UNAVAILABLE"
ACCESS_RESTRICTED = "ACCESS_RESTRICTED"
RATE_LIMITED = "RATE_LIMITED"
PARSER_FAILED = "PARSER_FAILED"
NO_PUBLIC_CONTENT = "NO_PUBLIC_CONTENT"
UNSUPPORTED_PLATFORM = "UNSUPPORTED_PLATFORM"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
_HEADERS = {
    "User-Agent": USER_AGENT,
    "Referer": "https://weibo.com/",
    "Accept": "application/json, text/plain, */*",
}

# URL 路由正则
_RE_UID = re.compile(r"^https?://weibo\.com/u/(\d+)(?:[/?].*)?$", re.IGNORECASE)
_RE_NAME = re.compile(r"^https?://weibo\.com/([A-Za-z0-9_\-]+)", re.IGNORECASE)

# 非账号主页的保留一级路径（搜索 / 话题 / 登录等），不匹配为账号主页
_RESERVED_SEGMENTS = frozenset({
    "search", "explore", "hot", "topic", "pub", "home", "login", "signup",
    "help", "about", "m", "p", "s", "wbprofile", "compose", "api", "comments",
    "attitude", "i", "fav", "tv",
})


def _optional_public_bool(mapping: dict, key: str) -> bool | None:
    if key not in mapping:
        return None
    value = mapping.get(key)
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true"}:
            return True
        if normalized in {"0", "false"}:
            return False
    return None


class WeiboError(RuntimeError):
    """携带 stop_reason 的微博采集错误（与 BilibiliError 同构）。"""

    def __init__(self, stop_reason: str, msg: str):
        super().__init__(f"[{stop_reason}] {msg}")
        self.stop_reason = stop_reason


# ---------------------------------------------------------------------------
# 网络层（best-effort，合规：不绕过登录 / 验证码 / 频控）
# ---------------------------------------------------------------------------
def _cookie_header(cookie_records: tuple[dict[str, Any], ...]) -> str | None:
    """Build one in-memory Cookie header without logging credential values."""
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
    headers = dict(_HEADERS)
    cookie_header = _cookie_header(cookie_records)
    if cookie_header is not None:
        headers["Cookie"] = cookie_header
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        # 401/403 → 登录墙或验证码，立即停止。302/405 are normal redirect
        # responses (weibo.com/<name> → /u/<uid>; urllib follows 30x by
        # default) and must not be misclassified as LOGIN_REQUIRED — that
        # would block every name-based URL on the first redirect.
        if e.code in (401, 403):
            raise WeiboError(LOGIN_REQUIRED, f"微博要求登录/验证码 (HTTP {e.code}): {url}")
        if e.code == 429:
            raise WeiboError(RATE_LIMITED, f"微博请求频率受限 (HTTP 429): {url}")
        raise WeiboError(ACCESS_RESTRICTED, f"微博访问受限 (HTTP {e.code}): {url}")
    except urllib.error.URLError as e:
        raise WeiboError(ACCESS_RESTRICTED, f"微博网络不可达: {e}")


def _parse_json_response(data: dict) -> dict:
    """Map the platform's explicit JSON login marker before data parsing."""
    login_url = data.get("url")
    if data.get("ok") == -100 and isinstance(login_url, str) and "login" in login_url:
        raise WeiboError(LOGIN_REQUIRED, "微博公开接口要求登录")
    return data


def _http_get_json(
    url: str, cookie_records: tuple[dict[str, Any], ...] = ()
) -> dict:
    raw = _http_get_text(url, cookie_records)
    try:
        return _parse_json_response(json.loads(raw))
    except json.JSONDecodeError:
        low = raw.lower()
        if "passport" in low or "登录" in raw or "login" in low:
            raise WeiboError(LOGIN_REQUIRED, "微博返回登录页而非 JSON，需登录")
        raise WeiboError(PARSER_FAILED, "微博返回非 JSON，解析失败")


# ---------------------------------------------------------------------------
# 解析辅助
# ---------------------------------------------------------------------------
def _strip_html(html_text: str) -> str:
    if not html_text:
        return ""
    return html.unescape(re.sub(r"<[^>]+>", "", html_text)).strip()


def _extract_hashtags(text: str) -> list[str]:
    if not text:
        return []
    tags: list[str] = []
    for m in re.findall(r"#([^#\s]+)#?", text):
        if m and m not in tags:
            tags.append(m)
    return tags


def _parse_weibo_time(s: Any) -> str | None:
    """best-effort 解析微博 created_at 为 ISO(+08:00)。无法解析返回 None。"""
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    now = datetime.now(BEIJING_TZ)
    m = re.match(r"^(\d+)\s*分钟前$", s)
    if m:
        return (now - timedelta(minutes=int(m.group(1)))).isoformat()
    m = re.match(r"^(\d+)\s*小时前$", s)
    if m:
        return (now - timedelta(hours=int(m.group(1)))).isoformat()
    m = re.match(r"^(\d+)\s*天前$", s)
    if m:
        return (now - timedelta(days=int(m.group(1)))).isoformat()
    if s in ("刚刚", "刚才"):
        return now.isoformat()
    m = re.match(r"^(今天|昨天|前天)\s*(\d{1,2}:\d{2})$", s)
    if m:
        days = {"今天": 0, "昨天": 1, "前天": 2}[m.group(1)]
        hh, mm = m.group(2).split(":")
        d = (now - timedelta(days=days)).replace(
            hour=int(hh), minute=int(mm), second=0, microsecond=0)
        return d.isoformat()
    m = re.match(r"^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}(?::\d{2})?))?", s)
    if m:
        datepart = m.group(1)
        if m.group(2):
            t = m.group(2)
            t_iso = f"{t}:00+08:00" if t.count(":") == 1 else f"{t}+08:00"
            return f"{datepart}T{t_iso}"
        return f"{datepart}T00:00:00+08:00"
    m = re.match(r"^(\d{1,2})-(\d{1,2})$", s)
    if m:
        return now.replace(
            month=int(m.group(1)), day=int(m.group(2)),
            hour=0, minute=0, second=0, microsecond=0).isoformat()
    try:
        return datetime.strptime(
            s, "%a %b %d %H:%M:%S %z %Y"
        ).astimezone(BEIJING_TZ).isoformat()
    except ValueError:
        return None


def _extract_uid_candidates(page: str, name: str) -> list[str]:
    """从命名主页 HTML 提取候选 uid，优先 handle 锚定的候选（去重保序）。

    现代微博页面在带登录会话时会在 SSR 数据里先出现**当前浏览者**的 uid，
    直接抓第一个 ``"uid"`` 会绑定到会话主人而不是目标账号。因此候选先取
    与请求 handle（如 ``cctvnews``）出现在同一短窗内的 id/uid/u/<id>，
    再退回通用 ``"uid"`` 候选，交给上层用 ``profile/info`` 回证。
    """
    candidates: list[str] = []
    seen: set[str] = set()

    def push(uid: str) -> None:
        if uid and uid not in seen:
            seen.add(uid)
            candidates.append(uid)

    name_lower = name.lower()
    # 1) handle 锚定：id/uid/u/<id> 附近 ±160 字符内出现请求的 handle
    id_pattern = re.compile(r'(?:"(?:id|uid)"\s*:\s*"?(\d+)"?|/u/(\d+))')
    for m in id_pattern.finditer(page):
        uid = m.group(1) or m.group(2)
        window = page[max(0, m.start() - 160): m.end() + 160]
        if name_lower in window.lower():
            push(uid)
    # 2) 通用 "uid" 候选（作为后援；结果仍需回证身份）
    for m in re.finditer(r'"uid"\s*:\s*"?(\d+)"?', page):
        push(m.group(1))
    return candidates


def _uid_confirms_handle(cand: str, name: str, fetch_json) -> bool:
    """profile/info 回证：该 uid 的账号 url/domain 是否就是请求的 handle。

    返回 True 仅当返回用户的 ``domain`` 或 ``url`` 尾部精确等于 handle。
    会话主人或占位账号不会命中，从而防止把命名主页绑定到错误账号。
    """
    data = fetch_json(f"https://weibo.com/ajax/profile/info?uid={cand}")
    user = (data.get("data") or {}).get("user") or {}
    if not user:
        return False
    domain = (user.get("domain") or "").strip().lower()
    url = (user.get("url") or "").strip().rstrip("/").lower()
    if domain == name.lower():
        return True
    if url.endswith("/" + name.lower()):
        return True
    return False


def _resolve_uid(
    url: str,
    fetch_text=None,
    fetch_json=None,
) -> str:
    """从 URL 解析微博 uid；命名主页提取候选后经 profile/info 回证身份。"""
    u = canonical_profile_url("weibo", url)
    if u is None:
        raise WeiboError(ACCOUNT_UNAVAILABLE, "不支持的微博公开账号 URL")
    m = _RE_UID.match(u)
    if m:
        return m.group(1)
    m = _RE_NAME.match(u)
    if m and m.group(1) not in _RESERVED_SEGMENTS and m.group(1) != "u":
        name = m.group(1)
        page = (fetch_text or _http_get_text)(f"https://weibo.com/{name}")
        candidates = _extract_uid_candidates(page, name)
        if not candidates:
            if "login" in page.lower() or "登录" in page or "passport" in page.lower():
                raise WeiboError(LOGIN_REQUIRED, f"微博命名主页要求登录，无法解析 uid: {name}")
            raise WeiboError(ACCOUNT_UNAVAILABLE, f"无法从微博主页解析 uid: {name}")
        if fetch_json is not None:
            last_error: WeiboError | None = None
            for cand in candidates:
                try:
                    if _uid_confirms_handle(cand, name, fetch_json):
                        return cand
                except WeiboError as exc:  # 回证时登录墙/频控按原 stop_reason 上抛
                    last_error = exc
            if last_error is not None:
                raise last_error
            raise WeiboError(
                ACCOUNT_UNAVAILABLE,
                f"无法将命名主页 {name} 绑定到已解析的账号（身份未回证）",
            )
        return candidates[0]
    raise WeiboError(ACCOUNT_UNAVAILABLE, "不支持的微博公开账号 URL")


def _build_post_raw(it: dict, uid: str) -> dict:
    """单条博文 → 统一原始字典。"""
    bid = str(it.get("id") or it.get("bid") or "")
    text_html = it.get("text") or ""
    text = _strip_html(text_html)
    if "retweeted_status" not in it:
        is_repost = None
    elif isinstance(it.get("retweeted_status"), dict):
        is_repost = bool(it.get("retweeted_status"))
    elif it.get("retweeted_status") in (None, False):
        is_repost = False
    else:
        is_repost = None
    rto = it.get("retweeted_status") or {}
    pi = it.get("page_info") or {}
    ptype = pi.get("type")
    if ptype == "video":
        content_type = "video"
    elif ptype in ("picture", "image"):
        content_type = "image_text"
    else:
        content_type = "repost" if is_repost else "text"
    return {
        "platform": PLATFORM,
        "post_id": bid,
        "post_url": f"https://weibo.com/{uid}/{bid}",
        "published_at": _parse_weibo_time(it.get("created_at")),
        "content_type": content_type,
        "title": (text.split("\n")[0][:50] if text else None),
        "text": text or None,
        "hashtags": _extract_hashtags(text),
        "is_pinned": _optional_public_bool(it, "isTop"),
        "is_repost": is_repost,
        "is_promoted": None,
        "views": _int(it.get("play_count")) if it.get("play_count") is not None else None,
        "likes": _int(it.get("attitudes_count")),
        "comments": _int(it.get("comments_count")),
        "shares": _int(it.get("reposts_count")),
        "favorites": None,  # 微博无收藏
        "coins": None,
        "danmaku": None,
        "collection_status": "ok",
        "collected_at": _now_iso(),
        "source_url": f"https://weibo.com/{uid}/{bid}",
        "platform_metrics": {
            "repost_source": (
                (rto.get("user") or {}).get("screen_name")
                if is_repost is True
                else None
            ),
            "pic_num": _int(it.get("pic_num")),
            "source": it.get("source"),
            "page_type": ptype,
        },
    }


class WeiboCollector(BaseCollector):
    platform = PLATFORM

    def __init__(self, cookie_records: tuple[dict[str, Any], ...] = ()):
        """Use an already-sanitized, user-authorized session only in memory."""
        self._cookie_records = tuple(cookie_records)

    def _get_text(self, url: str) -> str:
        if self._cookie_records:
            return _http_get_text(url, self._cookie_records)
        return _http_get_text(url)

    def _get_json(self, url: str) -> dict:
        if self._cookie_records:
            return _http_get_json(url, self._cookie_records)
        return _http_get_json(url)

    def _resolve_uid(self, url: str) -> str:
        return _resolve_uid(url, self._get_text, self._get_json)
    # 与模块级 ENABLED 对齐；默认启用，可显式安全停用。
    ENABLED = ENABLED

    # ------------------------------------------------------------------
    # 启用守卫
    # ------------------------------------------------------------------
    def _require_enabled(self) -> None:
        """当适配器未启用时抛出携带 ADAPTER_UNAVAILABLE 的 RuntimeError。

        编排器捕获后会将任务 `stop_reason` 记 `ADAPTER_UNAVAILABLE`，并如实停止，
        绝不以空数据假装采集已完成。
        """
        if not ENABLED:
            raise RuntimeError(
                f"[{ADAPTER_UNAVAILABLE}] WeiboCollector 未启用（可选平台，"
                "ENABLED=False），采集被拒绝；不得伪装为已采集。"
            )

    # ------------------------------------------------------------------
    # 路由
    # ------------------------------------------------------------------
    def supports(self, url: str) -> bool:
        """返回 url 是否为微博账号主页（weibo.com/u/<uid> 或 weibo.com/<name>）。

        仅匹配账号主页，不匹配 weibo.com 裸域名、/u 占位、搜索 / 话题等子路径。
        """
        return canonical_profile_url("weibo", url) is not None

    # ------------------------------------------------------------------
    # 访问检查（不绕过登录 / 验证码）
    # ------------------------------------------------------------------
    def check_access(self, url: str) -> dict[str, Any]:
        """返回账号可访问状态。遇登录墙 / 验证码立即停止并上抛对应 stop_reason。"""
        if not ENABLED:
            self._require_enabled()
        uid = self._resolve_uid(url)
        data = self._get_json(f"https://weibo.com/ajax/profile/info?uid={uid}")
        user = (data.get("data") or {}).get("user")
        if not user:
            raise WeiboError(ACCOUNT_UNAVAILABLE, "微博账号不存在或无公开资料")
        return {"accessible": True, "status": "ok", "stop_reason": None}

    # ------------------------------------------------------------------
    # 账号资料
    # ------------------------------------------------------------------
    def collect_profile(self, url: str) -> dict[str, Any]:
        """采集公开账号信息并归一化到统一 Profile schema。"""
        if not ENABLED:
            self._require_enabled()
        canonical_url = canonical_profile_url("weibo", url)
        if canonical_url is None:
            raise WeiboError(ACCOUNT_UNAVAILABLE, "不支持的微博公开账号 URL")
        uid = self._resolve_uid(canonical_url)
        data = self._get_json(f"https://weibo.com/ajax/profile/info?uid={uid}")
        user = (data.get("data") or {}).get("user") or {}
        if not user:
            raise WeiboError(ACCOUNT_UNAVAILABLE, "微博 profile/info 未返回用户信息")
        followers = _int(user.get("followers_count"))
        post_count = _int(user.get("statuses_count"))
        raw = {
            "platform": PLATFORM,
            "account_id": str(user.get("id") or uid),
            "account_name": user.get("screen_name"),
            "profile_url": canonical_url,
            "bio": user.get("description"),
            "verified": bool(user.get("verified")),
            "followers": followers,
            "post_count": post_count,
            "level": None,
            "platform_metrics": {
                "following": _int(user.get("friends_count")),
                "user_type": user.get("user_type"),
                "verified_type": user.get("verified_type"),
                "gender": user.get("gender"),
                "location": user.get("location"),
            },
            "field_visibility": {
                "followers": "visible" if followers is not None else "hidden",
                "post_count": "visible" if post_count is not None else "hidden",
            },
            "collected_at": _now_iso(),
        }
        return self.normalize_profile(raw)

    # ------------------------------------------------------------------
    # 内容列表
    # ------------------------------------------------------------------
    def collect_post_list(
        self,
        url: str,
        limit: int = PUBLIC_LIMIT_DEFAULT,
        date_range: tuple[str | None, str | None] | None = None,
    ) -> list[dict[str, Any]]:
        """采集博文摘要列表，并标记置顶 / 转发微博。"""
        limit = validate_public_limit(limit)
        if not ENABLED:
            self._require_enabled()
        uid = self._resolve_uid(url)
        out: list[dict[str, Any]] = []
        seen: set[str] = set()
        page = 1
        while len(out) < limit and page <= 50:
            data = self._get_json(
                f"https://weibo.com/ajax/statuses/mymblog?uid={uid}&page={page}&feature=0"
            )
            items = (data.get("data") or {}).get("list") or []
            if not items:
                break
            for it in items:
                bid = str(it.get("id") or it.get("bid") or "")
                if not bid or bid in seen:
                    continue
                seen.add(bid)
                raw = _build_post_raw(it, uid)
                pa = raw.get("published_at")
                if date_range and pa:
                    df, dt = date_range
                    if df and pa < df:
                        continue
                    if dt and pa > dt:
                        continue
                out.append(self.normalize_post(raw))
                if len(out) >= limit:
                    break
            page += 1
            time.sleep(1.0)  # 翻页间隔，降低频控概率
        if not out:
            raise WeiboError(NO_PUBLIC_CONTENT, f"微博账号 {uid} 无公开博文")
        return out[:limit]

    # ------------------------------------------------------------------
    # 单条详情
    # ------------------------------------------------------------------
    def collect_post_detail(self, post_url: str) -> dict[str, Any]:
        """采集单条博文详情与公开指标（best-effort）。"""
        if not ENABLED:
            self._require_enabled()
        canonical_url = canonical_item_url("weibo", post_url)
        if canonical_url is None:
            raise WeiboError(PARSER_FAILED, "无法从公开 URL 解析博文")
        _, uid, bid = canonical_url.rsplit("/", 2)
        data = self._get_json(f"https://weibo.com/ajax/statuses/show?id={bid}")
        it = ((data.get("data") or {}).get("status")) or data.get("status") or {}
        if not it:
            raise WeiboError(ACCESS_RESTRICTED, "微博博文详情未公开")
        return self.normalize_post(_build_post_raw(it, uid))

    # ------------------------------------------------------------------
    # 评论（best-effort）
    # ------------------------------------------------------------------
    def collect_comments(self, post_url: str, limit: int = 20) -> list[dict[str, Any]]:
        """公开评论采样尚未实现；不得用空列表伪装成功。"""
        self._require_enabled()
        if canonical_item_url("weibo", post_url) is None:
            raise WeiboError("COMMENTS_UNAVAILABLE", "微博公开评论采样未实现")
        raise WeiboError("COMMENTS_UNAVAILABLE", "微博公开评论采样未实现")
