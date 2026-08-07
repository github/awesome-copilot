"""抖音公开账号采集适配器（标准库 HTTP + 可选系统浏览器 CDP）。

HTTP/SSR 是快速路径；SSR 缺失或作品结构无法识别时，可用项目自带的标准库
CDP 客户端驱动独立临时浏览器，观察页面公开响应并读取可见作品卡片。两条路径
都映射到统一 `Profile` / `Post` 结构，并如实上抛访问限制 `stop_reason`。

现实约束（务必遵守）：
- 抖音站点是重度 JS 渲染 + 风控（WAF / 滑块 / 签名）站点。标准库 `urllib` 直连
  通常只能拿到 JS 外壳或风控页，拿不到完整 SSR 数据。这是**预期且诚实**的结果：
  解析不到即 `PARSER_FAILED`，触发登录/验证/频控即对应 `stop_reason`。
- **绝不绕过**登录、验证码、滑块或频控；不伪造签名、不重试破解，也不复用
  用户日常浏览器登录态。
- 字段不可见写 `None`（绝不以 `0` 代替未知，见 `collection-schema.md` §8）。
- 本适配器只采集、只映射，不分析、不存储（由上层脚本落盘）。

实现要点：
- `supports`：仅认可账号主页（含 `v.douyin.com` 短链 best-effort 解析），拒绝作品/
  搜索/话题页。
- `check_access`：返回 `{"accessible", "reason", "stop_reason"}`，不绕过。
- `collect_profile` / `collect_post_list` / `collect_post_detail`：best-effort 解析
  页面内嵌 `RENDER_DATA`（URL 编码 JSON）；解析失败或受限如实上抛。
- `collect_comments`：覆盖基类；明确空列表返回 `[]`，不可用则上抛内容级原因。
"""

from __future__ import annotations

import copy
import json
import math
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any


from ._constants import (
    BEIJING_TZ,
    DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKER_VALUES,
    DOUYIN_BROWSER_VISIBLE_RESTRICTION_SOURCE,
    DOUYIN_PAGE_STATE_PATTERNS,
    PUBLIC_ALL_DEFAULT_MAX_ITEMS,
    PUBLIC_ALL_DEFAULT_MAX_SCROLLS,
    PUBLIC_ALL_DEFAULT_MAX_SECONDS,
    PUBLIC_ALL_HARD_MAX_ITEMS,
    PUBLIC_ALL_HARD_MAX_SCROLLS,
    PUBLIC_ALL_HARD_MAX_SECONDS,
    PUBLIC_LIMIT_DEFAULT,
    STOP_ACCESS_RESTRICTED,
    STOP_ACCOUNT_UNAVAILABLE,
    STOP_INTERNAL,
    STOP_LOGIN,
    STOP_NO_PUBLIC_CONTENT,
    STOP_PARSER_FAILED,
    STOP_RATE_LIMITED,
    STOP_UNSUPPORTED,
    STOP_VERIFICATION,
    validate_public_all_budgets,
    validate_public_limit,
)
from ._utils import now_iso as _now_iso
from ._utils import parse_int as _int
from ._utils import ts_to_iso as _ts_to_iso
from .base import BaseCollector
from .browser_backend import BrowserError
from ._douyin_detail_contract import (
    MISSING_P0_DETAIL,
    missing_detail_fields,
)
from .url_policy import (
    canonical_item_url,
    canonical_profile_url,
    sanitize_routing_url,
)


_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_TIMEOUT = 12

# Shared with the browser transport so both paths use identical priority.
_RESTRICTION_PATTERNS = DOUYIN_PAGE_STATE_PATTERNS
_COLLECTION_SOURCES = frozenset({"list", "network", "dom", "network+dom", "detail"})
_IMAGE_TEXT_AWEME_TYPES = frozenset({68})


class DouyinError(Exception):
    """采集错误，携带 stop_reason 和可安全保留的部分结果。"""

    def __init__(
        self,
        stop_reason: str,
        message: str,
        raw: Any = None,
        partial_posts: list[dict[str, Any]] | None = None,
        diagnostic_code: str | None = None,
    ):
        super().__init__(message)
        self.stop_reason = stop_reason
        self.message = message
        self.raw = raw
        self.partial_posts = list(partial_posts or [])
        self.diagnostic_code = diagnostic_code


def _public_boolean(source: dict[str, Any], *keys: str) -> bool | None:
    """Preserve explicit public boolean evidence and leave absence unknown."""
    values = [source[key] for key in keys if isinstance(source.get(key), bool)]
    if True in values:
        return True
    if False in values:
        return False
    return None


def _collection_source(value: Any, fallback: Any = "unknown") -> str:
    if isinstance(value, str) and value in _COLLECTION_SOURCES:
        return value
    if isinstance(fallback, str) and fallback in _COLLECTION_SOURCES:
        return fallback
    return "unknown"


def _extract_hashtags(desc: Any, text_extra: Any) -> list[str]:
    """从文案与 text_extra 抽取话题标签，去重保序。"""
    tags: list[str] = []
    if isinstance(text_extra, list):
        for item in text_extra:
            name = (item or {}).get("hashtag_name") if isinstance(item, dict) else None
            if isinstance(name, str) and name.strip() and name.strip() not in tags:
                tags.append(name.strip())
    if isinstance(desc, str):
        for m in re.findall(r"#([^#\s]+)#?", desc):
            tag = m.strip()
            if tag and tag not in tags:
                tags.append(tag)
    return tags


def _text_extra_is_structurally_observed(value: Any) -> bool:
    """Accept only an explicit, structurally valid public hashtag array."""
    if not isinstance(value, list):
        return False
    for item in value:
        if not isinstance(item, dict):
            return False
        name = item.get("hashtag_name")
        if not isinstance(name, str) or not name.strip():
            return False
    return True


def _is_trusted_image_text(aweme_type: Any, images: Any) -> bool:
    """Recognize image-text only from the platform's typed image payload."""
    def has_public_reference(image: Any) -> bool:
        if not isinstance(image, dict):
            return False
        url_list = image.get("url_list")
        return bool(
            isinstance(url_list, list)
            and url_list
            and all(
                isinstance(url, str) and bool(url.strip())
                for url in url_list
            )
        )

    return bool(
        isinstance(aweme_type, int)
        and not isinstance(aweme_type, bool)
        and aweme_type in _IMAGE_TEXT_AWEME_TYPES
        and isinstance(images, list)
        and images
        and all(has_public_reference(image) for image in images)
    )


def _has_trustworthy_detail_evidence(aweme: Any) -> bool:
    """Require one valid, mappable public field beyond item identity."""
    if not isinstance(aweme, dict):
        return False

    description = aweme.get("desc")
    if isinstance(description, str) and bool(description.strip()):
        return True
    if _text_extra_is_structurally_observed(aweme.get("text_extra")):
        return True

    created_at = _int(aweme.get("create_time"))
    if created_at is not None and created_at > 0 and _ts_to_iso(created_at) is not None:
        return True

    statistics = aweme.get("statistics")
    if isinstance(statistics, dict):
        for key in (
            "play_count",
            "digg_count",
            "comment_count",
            "collect_count",
            "share_count",
        ):
            count = _int(statistics.get(key))
            if count is not None and count >= 0:
                return True

    video = aweme.get("video")
    if isinstance(video, dict):
        duration = _int(video.get("duration"))
        if duration is not None and duration >= 0:
            return True

    if any(
        isinstance(aweme.get(key), bool)
        for key in (
            "is_top",
            "is_top_aweme",
            "is_repost",
            "is_forward",
            "is_ad",
            "is_commerce",
        )
    ):
        return True

    if _is_trusted_image_text(aweme.get("aweme_type"), aweme.get("images")):
        return True

    collection = aweme.get("mix_info") or aweme.get("collection")
    if isinstance(collection, dict):
        collection_name = collection.get("mix_name")
        if isinstance(collection_name, str) and bool(collection_name.strip()):
            return True
    return False


def _extract_render_data(html: str) -> dict | None:
    """从页面提取内嵌 RENDER_DATA（URL 编码 JSON）及多变体 SSR 数据。

    支持节点：<script id="RENDER_DATA">、_ROUTER_DATA、_SSR_DATA、__INIT_DATA、__INITIAL_STATE__。
    解析失败（无节点 / 需风控验证 / JS虚拟机渲染）返回 None，由调用方据实判定为 PARSER_FAILED。
    """
    if not html:
        return None

    # 1. 经典 RENDER_DATA 节点
    m = re.search(
        r'<script[^>]*id=["\'](?:RENDER_DATA|_SSR_DATA|__INIT_DATA)["\'][^>]*>(.*?)</script>',
        html,
        re.DOTALL | re.I,
    )
    raw = m.group(1) if m else None
    if raw:
        try:
            decoded = urllib.parse.unquote(raw)
            return json.loads(decoded)
        except (json.JSONDecodeError, ValueError):
            try:
                return json.loads(raw)
            except (json.JSONDecodeError, ValueError):
                pass

    # 2. window 全局变量挂载变体 (window._ROUTER_DATA / window.__INITIAL_STATE__)
    patterns = [
        r"window\._ROUTER_DATA\s*=\s*(\{.*?\});?\s*</script>",
        r"window\._SSR_DATA\s*=\s*(\{.*?\});?\s*</script>",
        r"window\.__INITIAL_STATE__\s*=\s*(\{.*?\});?\s*</script>",
    ]
    for p in patterns:
        m2 = re.search(p, html, re.DOTALL)
        if m2:
            try:
                return json.loads(m2.group(1))
            except (json.JSONDecodeError, ValueError):
                continue

    return None


def _detect_restriction(html: str) -> str | None:
    """扫描页面文本，返回命中的 stop_reason；无限制返回 None。"""
    if not html:
        return None
    for pattern, reason in _RESTRICTION_PATTERNS:
        if pattern.search(html):
            return reason
    return None


def _dig(data: dict | None, *path: str) -> Any:
    """安全按路径取值，任一环节缺失/非 dict 即返回 None。"""
    cur: Any = data
    for key in path:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(key)
    return cur


# --------------------------------------------------------------------------
# 适配器
# --------------------------------------------------------------------------
class DouyinCollector(BaseCollector):
    platform = "douyin"

    def __init__(
        self,
        browser_fallback: bool = True,
        browser_collect=None,
        browser_collect_detail=None,
        cookie_records: tuple[dict[str, Any], ...] = (),
    ):
        """Configure the optional, dependency-free browser collection fallback."""
        if browser_collect is None or browser_collect_detail is None:
            from ._douyin_browser_transport import (
                collect_account_page,
                collect_post_page,
            )

            if browser_collect is None:
                browser_collect = collect_account_page
            if browser_collect_detail is None:
                browser_collect_detail = collect_post_page
        self.browser_fallback = bool(browser_fallback)
        self._browser_collect = browser_collect
        self._browser_collect_detail = browser_collect_detail
        self._browser_cookie_records = tuple(cookie_records)
        self._collection_coverage: dict[str, Any] = {}
        self._browser_profile_cache: dict[str, dict[str, Any]] = {}
        self._detail_provenance: dict[
            int, tuple[dict[str, Any], tuple[str, ...], bool]
        ] = {}

    # -- 路由 ---------------------------------------------------------------
    def supports(self, url: str) -> bool:
        """仅支持抖音账号主页（含短链 best-effort 解析）；拒绝作品/搜索/其他。"""
        u = sanitize_routing_url(url)
        if u is None:
            return False
        try:
            parsed = urllib.parse.urlsplit(u)
        except ValueError:
            return False
        host = parsed.hostname
        path = parsed.path

        if host == "v.douyin.com":
            return re.fullmatch(r"/[A-Za-z0-9_-]+/?", path) is not None

        return canonical_profile_url("douyin", u) is not None

    def canonicalize_profile_url(self, url: str) -> str | None:
        """Resolve a sanitized short link once, then apply strict profile policy."""
        safe_url = sanitize_routing_url(url)
        if safe_url is None:
            return None
        direct = canonical_profile_url("douyin", safe_url)
        if direct is not None:
            return direct
        parsed = urllib.parse.urlsplit(safe_url)
        if (
            parsed.hostname != "v.douyin.com"
            or re.fullmatch(r"/[A-Za-z0-9_-]+/?", parsed.path) is None
        ):
            return None
        final_url = self._resolve_final_url(safe_url)
        return canonical_profile_url("douyin", final_url)

    @staticmethod
    def _is_user_url(url: str) -> bool:
        """判定解析后的长链是否为账号主页。"""
        return canonical_profile_url("douyin", url) is not None

    @staticmethod
    def _resolve_final_url(url: str) -> str | None:
        """跟随重定向取最终落点（用于短链判定），不绕过任何保护。"""
        try:
            req = urllib.request.Request(url, headers={"User-Agent": _UA})
            with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
                return resp.geturl()
        except Exception:
            return None

    # -- 传输 ---------------------------------------------------------------
    def _fetch(self, url: str) -> str:
        """urllib 取页面文本；HTTP/网络错误如实上抛对应 stop_reason。"""
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": _UA,
                "Accept-Language": "zh-CN,zh;q=0.9",
                "Referer": "https://www.douyin.com/",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
                charset = resp.headers.get_content_charset() or "utf-8"
                return resp.read().decode(charset, errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise DouyinError(
                    STOP_LOGIN, f"HTTP 401 需登录: {url}"
                )
            if e.code == 429:
                raise DouyinError(
                    STOP_RATE_LIMITED, f"HTTP {e.code} 请求频率受限: {url}"
                )
            if e.code == 403:
                raise DouyinError(
                    STOP_ACCESS_RESTRICTED, f"HTTP {e.code} 访问受限: {url}"
                )
            if e.code in (404, 410):
                raise DouyinError(
                    STOP_ACCOUNT_UNAVAILABLE, f"HTTP {e.code} 账号/页面不存在: {url}"
                )
            raise DouyinError(STOP_ACCESS_RESTRICTED, f"HTTP {e.code}: {url}")
        except urllib.error.URLError:
            # 网络层错误（DNS/连接被拒等），按访问受限如实上抛，不重试绕过。
            raise DouyinError(
                STOP_ACCESS_RESTRICTED, "网络层错误，未保留远端原因文本"
            )

    # -- 访问检查（不绕过） -------------------------------------------------
    def check_access(self, url: str) -> dict[str, Any]:
        """返回 {'accessible', 'reason', 'stop_reason'}，不绕过任何保护。

        - 先路由：非账号主页 → accessible=False, stop_reason=UNSUPPORTED_PLATFORM。
        - 再抓取：命中登录/验证/频控/账号不可用 → accessible=False + 对应 stop_reason。
        - 可访问但无可用结构 → accessible=True, stop_reason=None（解析成败由
          collect_* 阶段判定，不在此阻断）。
        """
        if not self.supports(url):
            return {
                "accessible": False,
                "reason": "URL 不属于支持的抖音账号主页（或为作品/搜索/短链指向作品）",
                "stop_reason": STOP_UNSUPPORTED,
            }
        try:
            html = self._fetch(url)
        except DouyinError as e:
            if e.stop_reason == STOP_LOGIN and self._browser_cookie_records:
                return {
                    "accessible": True,
                    "reason": "匿名预检命中登录墙，转交用户授权浏览器会话核验",
                    "stop_reason": None,
                }
            return {
                "accessible": False,
                "reason": e.message,
                "stop_reason": e.stop_reason,
            }
        reason = _detect_restriction(html)
        if reason:
            if reason == STOP_LOGIN and self._browser_cookie_records:
                return {
                    "accessible": True,
                    "reason": "匿名预检命中登录墙，转交用户授权浏览器会话核验",
                    "stop_reason": None,
                }
            return {
                "accessible": False,
                "reason": f"页面命中访问限制标记: {reason}",
                "stop_reason": reason,
            }
        return {
            "accessible": True,
            "reason": "账号主页可访问（是否含可解析数据由采集阶段判定）",
            "stop_reason": None,
        }

    @staticmethod
    def _extract_sec_uid(url: str) -> str | None:
        m = re.search(r"/(?:user|share/user)/([A-Za-z0-9_\-]+)", url)
        return m.group(1) if m else None

    def _fetch_profile_via_iesdouyin_api(self, sec_uid: str, url: str) -> dict[str, Any] | None:
        """fallback 降级调用 iesdouyin 公开 API 提取公开资料。"""
        if not sec_uid:
            return None
        canonical_url = canonical_profile_url("douyin", url)
        if canonical_url is None:
            return None
        api_url = f"https://www.iesdouyin.com/web/api/v2/user/info/?sec_uid={sec_uid}"
        try:
            req = urllib.request.Request(
                api_url,
                headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"}
            )
            with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
                res_text = resp.read().decode("utf-8", errors="replace")
                data = json.loads(res_text)
                ui = data.get("user_info")
                if not ui:
                    return None
                if "sec_uid" in ui and ui.get("sec_uid") is not None:
                    response_sec_uid = ui.get("sec_uid")
                    if (
                        not isinstance(response_sec_uid, str)
                        or response_sec_uid.strip() != sec_uid
                    ):
                        raise DouyinError(
                            STOP_PARSER_FAILED,
                            "iesdouyin API 返回账号标识与请求主页不一致",
                        )
                    bound_sec_uid = response_sec_uid.strip()
                else:
                    bound_sec_uid = sec_uid
                response_profile_url = None
                for key in ("profile_url", "share_url"):
                    if key not in ui or ui.get(key) is None:
                        continue
                    candidate_url = ui.get(key)
                    if (
                        not isinstance(candidate_url, str)
                        or canonical_profile_url("douyin", candidate_url)
                        != canonical_url
                    ):
                        raise DouyinError(
                            STOP_PARSER_FAILED,
                            "iesdouyin API 返回主页地址与请求主页不一致",
                        )
                    response_profile_url = candidate_url
                follower_value = ui.get("follower_count")
                if follower_value is None:
                    follower_value = ui.get("mplatform_followers_count")
                followers = _int(follower_value)
                post_count = _int(ui.get("aweme_count"))
                raw = {
                    "platform": "douyin",
                    "account_id": ui.get("unique_id") or ui.get("short_id") or bound_sec_uid,
                    "account_name": ui.get("nickname"),
                    "profile_url": response_profile_url or canonical_url,
                    "bio": ui.get("signature") or None,
                    "verified": self._extract_verified(ui),
                    "enterprise_verify_reason": ui.get("enterprise_verify_reason"),
                    "custom_verify": ui.get("custom_verify"),
                    "verification_type": ui.get("verification_type"),
                    "followers": followers,
                    "post_count": post_count,
                    "platform_metrics": {
                        "total_likes": _int(ui.get("total_favorited")),
                        "sec_uid": bound_sec_uid,
                        "unique_id": ui.get("unique_id"),
                    },
                    "collected_at": _now_iso(),
                    "field_visibility": {
                        "account_name": "visible" if ui.get("nickname") else "hidden",
                        "bio": "visible" if ui.get("signature") else "hidden",
                        "followers": "visible" if followers is not None else "hidden",
                        "post_count": "visible" if post_count is not None else "hidden",
                    }
                }
                from ._douyin_browser_transport import sanitize_profile_raw

                clean = sanitize_profile_raw(raw, canonical_url)
                if clean is None:
                    raise DouyinError(
                        STOP_PARSER_FAILED,
                        "iesdouyin API 账号证据无法绑定到请求主页",
                    )
                return self.normalize_profile(clean)
        except DouyinError:
            raise
        except Exception:
            return None

    # -- 资料 ---------------------------------------------------------------
    def collect_profile(self, url: str) -> dict[str, Any]:
        """采集公开账号信息并归一化为统一 Profile。

        命中任务级限制时抛 DouyinError(stop_reason)；页面可访问但无法解析用户结构
        时自动触发 iesdouyin 公开 API 降级；全不可用时抛 PARSER_FAILED。
        """
        if not self.supports(url):
            raise DouyinError(STOP_UNSUPPORTED, f"不支持的账号主页 URL: {url}")
        html = self._fetch(url)
        # 先判定任务级限制（优先于解析失败）。
        restriction = _detect_restriction(html)
        if restriction:
            if restriction == STOP_LOGIN and self._browser_cookie_records:
                cached = self._browser_profile_cache.get(
                    canonical_profile_url("douyin", url) or ""
                )
                if cached is not None:
                    return self.normalize_profile(dict(cached))
            raise DouyinError(restriction, f"采集资料时命中访问限制: {restriction}")

        data = _extract_render_data(html)
        user = self._find_user(data) if data else None
        if not user:
            cached = self._browser_profile_cache.get(
                canonical_profile_url("douyin", url) or ""
            )
            if cached is not None:
                return self.normalize_profile(dict(cached))
            # 公开页面的唯一恢复路径是同一隔离浏览器会话；Cookie 仅改变该会话
            # 的访问状态，不另起采集协议。避免再访问不稳定的 iesdouyin 私有旧接口。
            self._request_browser_result(url, limit=1, date_range=None)
            cached = self._browser_profile_cache.get(
                canonical_profile_url("douyin", url) or ""
            )
            if cached is not None:
                return self.normalize_profile(dict(cached))
            raise DouyinError(
                STOP_PARSER_FAILED, "页面未提供可绑定的账号资料"
            )

        raw = self._build_profile_raw(url, user)
        merged = self._merge_cached_profile(url, raw)
        if merged is None:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "SSR 账号证据与请求主页不一致，已拒绝输出",
            )
        return merged

    def _merge_cached_profile(
        self, url: str, profile_raw: Any
    ) -> dict[str, Any] | None:
        """Merge only profile evidence bound to the same canonical account."""
        from ._douyin_browser_transport import (
            _merge_profile_evidence,
            sanitize_profile_raw,
        )

        canonical_url = canonical_profile_url("douyin", url)
        if canonical_url is None:
            return None
        primary = sanitize_profile_raw(profile_raw, canonical_url)
        if primary is None:
            return None
        cached = self._browser_profile_cache.get(canonical_url)
        if cached is not None:
            _merge_profile_evidence(primary, cached)
        clean = sanitize_profile_raw(
            primary, canonical_url, allow_dom_badge=True
        )
        return self.normalize_profile(clean) if clean is not None else None

    def _cache_browser_profile(self, url: str, profile_raw: Any) -> None:
        """Re-sanitize browser profile evidence and bind it to one account."""
        from ._douyin_browser_transport import (
            _merge_profile_evidence,
            sanitize_profile_raw,
        )

        canonical_url = canonical_profile_url("douyin", url)
        if canonical_url is None:
            return
        incoming = sanitize_profile_raw(
            profile_raw, canonical_url, allow_dom_badge=True
        )
        if incoming is None:
            return
        existing = self._browser_profile_cache.get(canonical_url)
        if existing is not None:
            clean_existing = sanitize_profile_raw(
                existing, canonical_url, allow_dom_badge=True
            )
            if clean_existing is not None:
                _merge_profile_evidence(clean_existing, incoming)
                incoming = clean_existing
        clean = sanitize_profile_raw(
            incoming, canonical_url, allow_dom_badge=True
        )
        if clean is not None:
            self._browser_profile_cache[canonical_url] = clean

    # -- 作品列表 -----------------------------------------------------------
    def _request_browser_result(
        self,
        url: str,
        limit: int,
        date_range: tuple[str | None, str | None] | None,
    ):
        if not self.browser_fallback:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "账号主页 SSR 缺失或作品列表结构无法识别，且浏览器降级已禁用",
            )
        self._collection_coverage["browser_fallback_launched"] = True
        try:
            request = {"url": url, "limit": limit, "date_range": date_range}
            if self._browser_cookie_records:
                request["cookie_records"] = self._browser_cookie_records
            result = self._browser_collect(**request)
        except Exception as exc:
            code = (
                "BROWSER_UNAVAILABLE"
                if isinstance(exc, BrowserError)
                and exc.diagnostic_code == "BROWSER_UNAVAILABLE"
                else "BROWSER_TRANSPORT_FAILED"
            )
            raise DouyinError(
                STOP_PARSER_FAILED,
                f"抖音浏览器降级失败: {exc}",
                diagnostic_code=code,
            ) from exc
        self._cache_browser_profile(url, getattr(result, "profile_raw", None))
        return result

    def _normalized_posts_from_items(
        self,
        url: str,
        items: list[dict[str, Any]],
        default_source: str,
    ) -> list[dict[str, Any]]:
        posts: list[dict[str, Any]] = []
        for item in items:
            raw = self._build_post_raw(
                url,
                item,
                source=_collection_source(
                    item.get("_collection_source"), default_source
                ),
            )
            trusted_missing = tuple(raw.pop("_trusted_detail_missing_fields", ()))
            duration_not_applicable = bool(
                raw.pop("_trusted_duration_not_applicable", False) is True
            )
            post = self.normalize_post(raw)
            if trusted_missing or duration_not_applicable:
                self._detail_provenance[id(post)] = (
                    post,
                    trusted_missing,
                    duration_not_applicable,
                )
            posts.append(post)
        return posts

    def _take_trusted_detail_provenance(
        self, post: dict[str, Any]
    ) -> tuple[tuple[str, ...], bool] | None:
        """Consume same-process builder provenance for this exact post object."""
        entry = self._detail_provenance.pop(id(post), None)
        if entry is None or entry[0] is not post:
            return None
        return entry[1], entry[2]

    def _clear_detail_provenance(self) -> None:
        """Drop all non-persistable detail provenance at the output boundary."""
        self._detail_provenance.clear()

    def _retain_detail_provenance(self, posts: Any) -> None:
        """Keep provenance only for exact post objects exposed by this batch."""
        exposed = (
            {
                id(post): post
                for post in posts
                if isinstance(post, dict)
            }
            if isinstance(posts, list)
            else {}
        )
        self._detail_provenance = {
            identity: entry
            for identity, entry in self._detail_provenance.items()
            if exposed.get(identity) is entry[0]
        }

    def _init_collection_coverage(self, **extras: Any) -> dict[str, Any]:
        """Build a fresh coverage dict seeded with browser_fallback state.

        三处入口（_record_limited_coverage / _collect_*_post_list_*_current）共用
        同一字段组合逻辑；以后加字段（如 browser_fallback_completed_at）只改这里。
        """
        coverage: dict[str, Any] = dict(extras)
        coverage.setdefault("browser_fallback_requested", self.browser_fallback)
        coverage.setdefault("browser_fallback_launched", False)
        return coverage

    @staticmethod
    def _date_summary(
        posts: list[dict[str, Any]],
        date_range: tuple[str | None, str | None] | None,
    ) -> tuple[list[dict[str, Any]], int]:
        unknown_count = sum(
            DouyinCollector._parse_post_date(post.get("published_at")) is None
            for post in posts
        )
        if date_range is None:
            return list(posts), unknown_count
        return DouyinCollector._filter_by_date(posts, date_range), unknown_count

    def _record_limited_coverage(
        self,
        posts_before_range: list[dict[str, Any]],
        matched_posts: list[dict[str, Any]],
        date_range: tuple[str | None, str | None] | None,
        transport_coverage: Any = None,
        *,
        browser_launched: bool = False,
    ) -> None:
        clean = self._sanitize_collection_coverage(transport_coverage)
        clean = self._init_collection_coverage(**clean)
        if browser_launched:
            clean["browser_fallback_launched"] = True
        _, unknown_count = self._date_summary(posts_before_range, date_range)
        clean.update({
            "requested_all": False,
            "terminal_page_observed": False,
            "is_exhaustive": False,
            "observed_post_count": max(
                clean.get("observed_post_count", 0), len(posts_before_range)
            ),
            "range_filter_applied": date_range is not None,
            "range_match_count": len(matched_posts),
            "range_no_match": bool(
                date_range is not None and posts_before_range and not matched_posts
            ),
        })
        if date_range is not None:
            clean["unknown_date_count"] = max(
                clean.get("unknown_date_count", 0), unknown_count
            )
        self._collection_coverage = self._sanitize_collection_coverage(clean)

    def _collect_posts_via_browser(
        self,
        url: str,
        limit: int,
        date_range: tuple[str | None, str | None] | None,
    ) -> list[dict[str, Any]]:
        """Run the optional browser path and preserve its status semantics."""
        result = self._request_browser_result(url, limit, date_range)

        valid_items = self._validated_aweme_items(result.aweme_items)
        normalized = self._normalized_posts_from_items(
            url, valid_items, str(result.source or "network")
        )
        matched, _unknown_count = self._date_summary(normalized, date_range)
        posts = matched[:limit]
        self._record_limited_coverage(
            normalized,
            matched,
            date_range,
            getattr(result, "coverage", {}),
            browser_launched=True,
        )
        if result.restriction:
            raise DouyinError(
                result.restriction,
                f"浏览器采集中止: {result.restriction}",
                raw=result.diagnostics,
                partial_posts=posts,
                diagnostic_code=result.diagnostic_code,
            )
        if result.diagnostic_code:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "浏览器采集完成，但资源清理失败",
                raw=result.diagnostics,
                partial_posts=posts,
                diagnostic_code=result.diagnostic_code,
            )
        if result.aweme_items and not valid_items:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "浏览器作品载荷未包含有效的数字平台作品 ID",
                partial_posts=[],
                diagnostic_code="INVALID_PLATFORM_POST_ID",
            )
        if not posts:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "浏览器未识别到可验证的作品结构",
                raw=result.diagnostics,
            )
        return posts

    @staticmethod
    def _sanitize_collection_coverage(value: Any) -> dict[str, Any]:
        """Keep only the bounded coverage ledger; never retain transport secrets."""
        if not isinstance(value, dict):
            return {}
        count_fields = (
            "observed_page_count",
            "observed_post_count",
            "cursor_fingerprint_count",
            "repeated_cursor_count",
            "range_match_count",
            "unknown_date_count",
            "page_context_request_count",
        )
        allowed_stops = {
            "terminal_page",
            "idle",
            "timeout",
            "repeated_cursor",
            "max_items",
            "max_scrolls",
            "date_lower_bound",
            "limit",
        }
        clean: dict[str, Any] = {}
        requested_all = value.get("requested_all") is True
        terminal_observed = value.get("terminal_page_observed") is True
        clean["requested_all"] = requested_all
        clean["terminal_page_observed"] = terminal_observed
        for key in (
            "browser_fallback_requested",
            "browser_fallback_launched",
            "page_context_fallback_used",
        ):
            if type(value.get(key)) is bool:
                clean[key] = value[key]
        evidence_source = value.get("browser_evidence_source")
        if evidence_source in {"none", "network", "dom", "network+dom"}:
            clean["browser_evidence_source"] = evidence_source
        evidence_access = value.get("evidence_access")
        if evidence_access in {"anonymous_public", "user_authorized_session"}:
            clean["evidence_access"] = evidence_access
        restriction_source = value.get("restriction_source")
        restriction_marker = value.get("restriction_marker")
        if (
            restriction_source == DOUYIN_BROWSER_VISIBLE_RESTRICTION_SOURCE
            and restriction_marker
            in DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKER_VALUES
        ):
            clean["restriction_source"] = restriction_source
            clean["restriction_marker"] = restriction_marker
        for key in count_fields:
            field_value = value.get(key)
            if isinstance(field_value, int) and not isinstance(field_value, bool):
                clean[key] = max(0, field_value)
        scroll_rounds = value.get("scroll_rounds")
        if (
            isinstance(scroll_rounds, int)
            and not isinstance(scroll_rounds, bool)
            and 0 <= scroll_rounds <= PUBLIC_ALL_HARD_MAX_SCROLLS
        ):
            clean["scroll_rounds"] = scroll_rounds
        max_scrolls = value.get("max_scrolls")
        if (
            isinstance(max_scrolls, int)
            and not isinstance(max_scrolls, bool)
            and 1 <= max_scrolls <= PUBLIC_ALL_HARD_MAX_SCROLLS
        ):
            clean["max_scrolls"] = max_scrolls
        max_seconds = value.get("max_seconds")
        if (
            isinstance(max_seconds, (int, float))
            and not isinstance(max_seconds, bool)
            and math.isfinite(max_seconds)
            and 0 < max_seconds <= PUBLIC_ALL_HARD_MAX_SECONDS
        ):
            clean["max_seconds"] = float(max_seconds)
        max_items = value.get("max_items")
        if (
            isinstance(max_items, int)
            and not isinstance(max_items, bool)
            and 1 <= max_items <= PUBLIC_ALL_HARD_MAX_ITEMS
        ):
            clean["max_items"] = max_items
        stop_condition = value.get("stop_condition")
        if isinstance(stop_condition, str) and stop_condition in allowed_stops:
            clean["stop_condition"] = stop_condition
        clean["is_exhaustive"] = bool(
            value.get("is_exhaustive") is True
            and requested_all
            and terminal_observed
            and stop_condition == "terminal_page"
        )
        range_filter_applied = value.get("range_filter_applied") is True
        range_match_count = clean.get("range_match_count")
        clean["range_filter_applied"] = range_filter_applied
        clean["range_no_match"] = bool(
            value.get("range_no_match") is True
            and range_filter_applied
            and clean.get("observed_post_count", 0) > 0
            and range_match_count == 0
        )
        return clean

    def get_collection_coverage(self) -> dict[str, Any]:
        """Return a detached copy of the current sanitized coverage ledger."""
        return dict(self._collection_coverage)

    def collect_all_post_list(
        self,
        url: str,
        date_range: tuple[str | None, str | None] | None = None,
        max_items: int = PUBLIC_ALL_DEFAULT_MAX_ITEMS,
        max_seconds: float = PUBLIC_ALL_DEFAULT_MAX_SECONDS,
        max_scrolls: int = PUBLIC_ALL_DEFAULT_MAX_SCROLLS,
    ) -> list[dict[str, Any]]:
        """Run one isolated all-post batch and retain only its returned evidence."""
        self._clear_detail_provenance()
        try:
            posts = self._collect_all_post_list_current(
                url,
                date_range=date_range,
                max_items=max_items,
                max_seconds=max_seconds,
                max_scrolls=max_scrolls,
            )
        except Exception as exc:
            self._retain_detail_provenance(getattr(exc, "partial_posts", None))
            raise
        self._retain_detail_provenance(posts)
        return posts

    def _collect_all_post_list_current(
        self,
        url: str,
        date_range: tuple[str | None, str | None] | None = None,
        max_items: int = PUBLIC_ALL_DEFAULT_MAX_ITEMS,
        max_seconds: float = PUBLIC_ALL_DEFAULT_MAX_SECONDS,
        max_scrolls: int = PUBLIC_ALL_DEFAULT_MAX_SCROLLS,
    ) -> list[dict[str, Any]]:
        """Passively observe public post-list pages until a verified terminal page."""
        self._collection_coverage = {}
        if not self.supports(url):
            raise DouyinError(STOP_UNSUPPORTED, f"不支持的账号主页 URL: {url}")
        max_items, max_seconds, max_scrolls = validate_public_all_budgets(
            max_items, max_seconds, max_scrolls
        )
        self._collection_coverage = self._init_collection_coverage(
            requested_all=True,
            max_items=max_items,
        )
        if not self.browser_fallback:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "全量作品采集需要启用公开浏览器传输层",
                diagnostic_code="BROWSER_DISABLED",
            )
        self._collection_coverage["browser_fallback_launched"] = True
        try:
            request = {
                "url": url,
                "limit": max_items,
                "date_range": date_range,
                "all_posts": True,
                "max_seconds": max_seconds,
                "max_scrolls": max_scrolls,
            }
            if self._browser_cookie_records:
                request["cookie_records"] = self._browser_cookie_records
            result = self._browser_collect(**request)
        except Exception as exc:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "抖音全量浏览器采集失败",
                diagnostic_code="BROWSER_TRANSPORT_FAILED",
            ) from exc

        self._cache_browser_profile(url, getattr(result, "profile_raw", None))
        self._collection_coverage = self._sanitize_collection_coverage(
            getattr(result, "coverage", {})
        )
        self._collection_coverage.setdefault("browser_fallback_requested", True)
        self._collection_coverage["browser_fallback_launched"] = True
        self._collection_coverage["max_items"] = max_items
        valid_items = self._validated_aweme_items(result.aweme_items)
        normalized = self._normalized_posts_from_items(
            url, valid_items, str(result.source or "network")
        )
        matched, unknown_count = self._date_summary(normalized, date_range)
        posts = matched[:max_items]
        self._collection_coverage["observed_post_count"] = max(
            self._collection_coverage.get("observed_post_count", 0),
            len(valid_items),
        )
        if date_range is not None:
            self._collection_coverage["unknown_date_count"] = max(
                self._collection_coverage.get("unknown_date_count", 0),
                unknown_count,
            )
        self._collection_coverage["range_filter_applied"] = date_range is not None
        self._collection_coverage["range_match_count"] = len(matched)
        self._collection_coverage["range_no_match"] = bool(
            date_range is not None and valid_items and not posts
        )

        if result.restriction:
            raise DouyinError(
                result.restriction,
                f"浏览器全量采集中止: {result.restriction}",
                partial_posts=posts,
                diagnostic_code=result.diagnostic_code,
            )
        if result.diagnostic_code:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "全量作品采集完成，但资源清理失败",
                partial_posts=posts,
                diagnostic_code=result.diagnostic_code,
            )
        if result.aweme_items and not valid_items:
            self._collection_coverage["terminal_page_observed"] = False
            self._collection_coverage["is_exhaustive"] = False
            raise DouyinError(
                STOP_PARSER_FAILED,
                "浏览器作品载荷未包含有效的数字平台作品 ID",
                partial_posts=[],
                diagnostic_code="INVALID_PLATFORM_POST_ID",
            )
        if not self._collection_coverage.get("is_exhaustive", False):
            raise DouyinError(
                STOP_PARSER_FAILED,
                "全量作品采集在安全边界停止，结果不具完备性",
                partial_posts=posts,
                diagnostic_code="ALL_POSTS_INCOMPLETE",
            )
        if not valid_items:
            raise DouyinError(
                STOP_NO_PUBLIC_CONTENT,
                "公开作品列表已到末页，账号没有可验证的公开作品",
                partial_posts=[],
            )
        return posts

    def collect_post_list(
        self,
        url: str,
        limit: int = PUBLIC_LIMIT_DEFAULT,
        date_range: tuple[str | None, str | None] | None = None,
    ) -> list[dict[str, Any]]:
        """Run one isolated limited batch and retain only its returned evidence."""
        self._clear_detail_provenance()
        try:
            posts = self._collect_post_list_current(
                url,
                limit=limit,
                date_range=date_range,
            )
        except Exception as exc:
            self._retain_detail_provenance(getattr(exc, "partial_posts", None))
            raise
        self._retain_detail_provenance(posts)
        return posts

    def _collect_post_list_current(
        self,
        url: str,
        limit: int = PUBLIC_LIMIT_DEFAULT,
        date_range: tuple[str | None, str | None] | None = None,
    ) -> list[dict[str, Any]]:
        """采集作品摘要列表（标记 is_pinned），归一化后返回。

        Best-effort：从 RENDER_DATA 抽取作品数组。尊重 limit 与 date_range。
        命中任务级限制抛 DouyinError；单条缺失不影响整体（保持 null，不臆造）。
        """
        self._collection_coverage = self._init_collection_coverage()
        limit = validate_public_limit(limit)
        if not self.supports(url):
            raise DouyinError(STOP_UNSUPPORTED, f"不支持的账号主页 URL: {url}")
        html = self._fetch(url)
        restriction = _detect_restriction(html)
        if restriction:
            if not (
                restriction == STOP_LOGIN and self._browser_cookie_records
            ):
                raise DouyinError(
                    restriction, f"采集列表时命中访问限制: {restriction}"
                )

        data = _extract_render_data(html)
        expected_sec_uid = self._extract_sec_uid(url)
        aweme_list = (
            self._find_aweme_list(data, expected_sec_uid)
            if data is not None and expected_sec_uid is not None
            else None
        )
        if data is None or aweme_list is None:
            return self._collect_posts_via_browser(url, limit, date_range)

        if len(aweme_list) == 0:
            raise DouyinError(
                STOP_NO_PUBLIC_CONTENT,
                "账号主页明确显示没有公开作品",
            )

        valid_items = self._validated_aweme_items(aweme_list)
        if aweme_list and not valid_items:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "SSR 作品载荷未包含有效的数字平台作品 ID",
                partial_posts=[],
                diagnostic_code="INVALID_PLATFORM_POST_ID",
            )
        ssr_items = []
        for item in valid_items:
            prepared = dict(item)
            prepared["_collection_source"] = "list"
            ssr_items.append(prepared)
        normalized = self._normalized_posts_from_items(url, ssr_items, "list")
        matched, _unknown_count = self._date_summary(normalized, date_range)

        if len(matched) >= limit or not self.browser_fallback:
            self._record_limited_coverage(normalized, matched, date_range)
            return matched[:limit]

        result = self._request_browser_result(url, limit, date_range)
        browser_items = self._validated_aweme_items(result.aweme_items)
        browser_payload_invalid = bool(result.aweme_items and not browser_items)
        prepared_browser_items: list[dict[str, Any]] = []
        for item in browser_items:
            prepared = dict(item)
            prepared["_collection_source"] = _collection_source(
                prepared.get("_collection_source"),
                _collection_source(result.source, "network"),
            )
            prepared_browser_items.append(prepared)
        merged_items = self._validated_aweme_items(ssr_items + prepared_browser_items)
        merged_normalized = self._normalized_posts_from_items(url, merged_items, "list")
        merged_matched, _unknown_count = self._date_summary(
            merged_normalized, date_range
        )
        posts = merged_matched[:limit]
        self._record_limited_coverage(
            merged_normalized,
            merged_matched,
            date_range,
            getattr(result, "coverage", {}),
            browser_launched=True,
        )
        if result.restriction:
            raise DouyinError(
                result.restriction,
                f"浏览器采集中止: {result.restriction}",
                raw=result.diagnostics,
                partial_posts=posts,
                diagnostic_code=result.diagnostic_code,
            )
        if result.diagnostic_code:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "浏览器采集完成，但资源清理失败",
                raw=result.diagnostics,
                partial_posts=posts,
                diagnostic_code=result.diagnostic_code,
            )
        if browser_payload_invalid:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "浏览器作品载荷未包含有效的数字平台作品 ID",
                partial_posts=posts,
                diagnostic_code="INVALID_PLATFORM_POST_ID",
            )
        return posts

    @classmethod
    def _validated_aweme_items(cls, items: Any) -> list[dict[str, Any]]:
        """Keep numeric platform items and fill duplicate gaps without overwrites."""
        by_id: dict[str, dict[str, Any]] = {}
        if not isinstance(items, list):
            return []
        for item in items:
            if not isinstance(item, dict):
                continue
            post_id = str(item.get("aweme_id") or item.get("aweme_id_str") or "")
            if re.fullmatch(r"\d+", post_id) is None:
                continue
            if post_id not in by_id:
                by_id[post_id] = copy.deepcopy(item)
                continue
            cls._merge_missing_values(by_id[post_id], item)
        return list(by_id.values())

    @classmethod
    def _merge_missing_values(cls, target: dict[str, Any], incoming: dict[str, Any]) -> None:
        for key, value in incoming.items():
            current = target.get(key)
            if isinstance(current, dict) and isinstance(value, dict):
                cls._merge_missing_values(current, value)
            elif cls._missing_value(current) and not cls._missing_value(value):
                target[key] = copy.deepcopy(value)

    @staticmethod
    def _missing_value(value: Any) -> bool:
        return value is None or value == "" or value == [] or value == {}

    # -- 单条详情 -----------------------------------------------------------
    def _normalize_bound_post_detail(
        self,
        canonical_url: str,
        aweme: Any,
        *,
        source: str,
    ) -> dict[str, Any]:
        """Normalize one detail only when raw and normalized identities agree."""
        expected_post_id = canonical_url.rstrip("/").rsplit("/", 1)[-1]
        if not isinstance(aweme, dict):
            raise DouyinError(STOP_PARSER_FAILED, "单条作品详情结构无效")
        identifiers = [
            str(aweme[key]).strip()
            for key in ("aweme_id", "aweme_id_str")
            if key in aweme and aweme[key] is not None
        ]
        if not identifiers or any(
            identifier != expected_post_id for identifier in identifiers
        ):
            raise DouyinError(
                STOP_PARSER_FAILED,
                "单条作品详情标识与请求 URL 不一致",
            )
        share_url = aweme.get("share_url")
        if share_url is not None and (
            canonical_item_url("douyin", share_url, expected_post_id)
            != canonical_url
        ):
            raise DouyinError(
                STOP_PARSER_FAILED,
                "单条作品详情地址与请求 URL 不一致",
            )
        if not _has_trustworthy_detail_evidence(aweme):
            raise DouyinError(
                STOP_PARSER_FAILED,
                "单条作品详情未包含可信的公开字段",
            )
        raw = self._build_post_raw(canonical_url, aweme, source=source)
        normalized = self.normalize_post(raw)
        if (
            str(normalized.get("post_id") or "").strip() != expected_post_id
            or normalized.get("post_url") != canonical_url
            or normalized.get("source_url") != canonical_url
        ):
            raise DouyinError(
                STOP_PARSER_FAILED,
                "归一化作品详情与请求 URL 不一致",
            )
        return normalized

    def collect_post_detail(self, post_url: str) -> dict[str, Any]:
        """采集单条作品详情并归一化。播放数可能不公开 → views=None。"""
        canonical_url = canonical_item_url("douyin", post_url)
        if canonical_url is None:
            raise DouyinError(STOP_UNSUPPORTED, "无效的作品 URL")
        expected_post_id = canonical_url.rstrip("/").rsplit("/", 1)[-1]
        html = self._fetch(canonical_url)
        restriction = _detect_restriction(html)
        if restriction:
            if not (
                restriction == STOP_LOGIN and self._browser_cookie_records
            ):
                raise DouyinError(
                    restriction, f"采集作品详情时命中访问限制: {restriction}"
                )

        data = _extract_render_data(html)
        if data:
            detail_candidates = self._aweme_detail_candidates(data)
            if any(
                self._post_detail_identity_conflicts(canonical_url, candidate)
                for candidate in detail_candidates
            ):
                raise DouyinError(
                    STOP_PARSER_FAILED,
                    "单条作品详情标识与请求 URL 不一致",
                )
            aweme = self._find_aweme_detail(data, expected_post_id)
        else:
            aweme = None
        if aweme:
            return self._normalize_bound_post_detail(
                canonical_url, aweme, source="detail"
            )
        if not self.browser_fallback:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "作品页无可解析单条详情，且浏览器降级已禁用",
            )
        try:
            request = {"url": canonical_url}
            if self._browser_cookie_records:
                request["cookie_records"] = self._browser_cookie_records
            result = self._browser_collect_detail(**request)
        except Exception as exc:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "抖音匿名作品详情浏览器降级失败",
                diagnostic_code="BROWSER_DETAIL_TRANSPORT_FAILED",
            ) from exc
        result_restriction = getattr(result, "restriction", None)
        diagnostic_code = getattr(result, "diagnostic_code", None)
        if result_restriction:
            raise DouyinError(
                result_restriction,
                f"浏览器详情采集中止: {result_restriction}",
                diagnostic_code=diagnostic_code,
            )
        if diagnostic_code == "BROWSER_CLEANUP_FAILED":
            raise DouyinError(
                STOP_PARSER_FAILED,
                "浏览器详情采集完成，但资源清理失败",
                diagnostic_code=diagnostic_code,
            )
        aweme_items = getattr(result, "aweme_items", None)
        if not isinstance(aweme_items, list) or len(aweme_items) != 1:
            raise DouyinError(
                STOP_PARSER_FAILED,
                "浏览器详情页未提供可绑定的公开作品数据",
                diagnostic_code=diagnostic_code,
            )
        aweme = aweme_items[0]
        return self._normalize_bound_post_detail(
            canonical_url,
            aweme,
            source=_collection_source(
                aweme.get("_collection_source")
                if isinstance(aweme, dict)
                else None,
                _collection_source(getattr(result, "source", None), "network"),
            ),
        )

    # -- 评论（覆盖基类，best-effort） -------------------------------------
    def collect_comments(
        self, post_url: str, limit: int = 20
    ) -> list[dict[str, Any]]:
        """公开评论采样；区分明确空结果与不可用，均不绕过保护。"""
        canonical_url = canonical_item_url("douyin", post_url)
        if canonical_url is None:
            raise DouyinError(STOP_UNSUPPORTED, "无效的作品 URL")
        html = self._fetch(canonical_url)
        restriction = _detect_restriction(html)
        if restriction:
            raise DouyinError(restriction, "公开评论采样命中访问限制")
        data = _extract_render_data(html)
        if data is None:
            raise DouyinError(STOP_PARSER_FAILED, "作品页无可解析公开数据")
        comments_raw = self._find_comments(data)
        if comments_raw is None:
            raise DouyinError("COMMENTS_UNAVAILABLE", "作品页未提供公开评论结构")
        for comment in comments_raw[:limit]:
            if not isinstance(comment, dict):
                raise DouyinError("COMMENTS_UNAVAILABLE", "公开评论结构无效")
            comment_id = comment.get("cid") or comment.get("id")
            user = comment.get("user")
            text = comment.get("text") or comment.get("content")
            if (
                isinstance(comment_id, bool)
                or not isinstance(comment_id, (str, int))
                or (user is not None and not isinstance(user, dict))
                or (text is not None and not isinstance(text, str))
            ):
                raise DouyinError("COMMENTS_UNAVAILABLE", "公开评论结构无效")
        out: list[dict[str, Any]] = []
        for c in comments_raw[:limit]:
            out.append(
                {
                    "comment_id": c.get("cid") or c.get("id"),
                    "post_url": canonical_url,
                    "author": (c.get("user") or {}).get("nickname"),
                    "text": c.get("text") or c.get("content"),
                    "likes": _int(c.get("digg_count")),
                    "published_at": _ts_to_iso(c.get("create_time")),
                    "collected_at": _now_iso(),
                }
            )
        return out

    # ----------------------------------------------------------------------
    # 内部解析（best-effort，安全取值）
    # ----------------------------------------------------------------------
    def _find_user(self, data: dict) -> dict | None:
        """在 RENDER_DATA 中定位用户结构（多种可能的嵌套位置）。"""
        candidates = [
            _dig(data, "user", "user"),
            _dig(data, "userInfo"),
            _dig(data, "app", "user", "user"),
            _dig(data, "8", "user", "user"),
        ]
        for c in candidates:
            if isinstance(c, dict) and (c.get("sec_uid") or c.get("unique_id")):
                return c
        # 兜底：全树浅搜含 sec_uid 的 dict。
        found = self._search_key(data, "sec_uid")
        if isinstance(found, dict):
            return found
        return None

    def _find_aweme_list(
        self, data: dict, expected_sec_uid: str
    ) -> list | None:
        """Return only a frozen SSR account-post list with exact ownership."""
        user_root = _dig(data, "user")
        app_user_root = _dig(data, "app", "user")
        numbered_user_root = _dig(data, "8", "user")
        candidates = [
            (
                _dig(data, "user", "post"),
                "data",
                (user_root, _dig(data, "user", "user")),
            ),
            (
                _dig(data, "user", "user"),
                "awemeList",
                (),
            ),
            (
                _dig(data, "app", "user", "post"),
                "data",
                (app_user_root, _dig(data, "app", "user", "user")),
            ),
            (
                _dig(data, "8", "user", "post"),
                "data",
                (
                    numbered_user_root,
                    _dig(data, "8", "user", "user"),
                ),
            ),
        ]
        for owner, list_key, related in candidates:
            if not isinstance(owner, dict):
                continue
            items = owner.get(list_key)
            if not isinstance(items, list):
                continue
            binding_values = [
                node[key]
                for node in (owner, *related)
                if isinstance(node, dict)
                for key in ("sec_uid", "sec_user_id")
                if key in node
            ]
            if any(
                not isinstance(value, str) or value != expected_sec_uid
                for value in binding_values
            ):
                continue
            if items:
                if all(
                    isinstance(item, dict)
                    and isinstance(item.get("author"), dict)
                    and item["author"].get("sec_uid") == expected_sec_uid
                    for item in items
                ):
                    return items
                continue
            if binding_values:
                return items
        return None

    @staticmethod
    def _aweme_detail_candidates(data: dict) -> list[dict[str, Any]]:
        """Return only detail objects from the frozen SSR detail paths."""
        candidates = [
            _dig(data, "aweme_detail"),
            _dig(data, "awemeDetail"),
            _dig(data, "data", "aweme_detail"),
            _dig(data, "data", "awemeDetail"),
            _dig(data, "aweme", "detail"),
            _dig(data, "video", "aweme"),
            _dig(data, "app", "aweme", "detail"),
        ]
        return [candidate for candidate in candidates if isinstance(candidate, dict)]

    @staticmethod
    def _post_detail_identity_conflicts(
        canonical_url: str,
        aweme: dict[str, Any],
    ) -> bool:
        expected_post_id = canonical_url.rstrip("/").rsplit("/", 1)[-1]
        identifiers = [
            str(aweme[key]).strip()
            for key in ("aweme_id", "aweme_id_str")
            if key in aweme and aweme[key] is not None
        ]
        if any(identifier != expected_post_id for identifier in identifiers):
            return True
        share_url = aweme.get("share_url")
        return share_url is not None and (
            canonical_item_url("douyin", share_url, expected_post_id)
            != canonical_url
        )

    def _find_aweme_detail(self, data: dict, expected_post_id: str) -> dict | None:
        """在冻结的 RENDER_DATA 路径中定位与请求绑定的单条作品结构。"""
        for candidate in self._aweme_detail_candidates(data):
            identifiers = [
                str(candidate[key]).strip()
                for key in ("aweme_id", "aweme_id_str")
                if key in candidate and candidate[key] is not None
            ]
            if identifiers and all(
                identifier == expected_post_id for identifier in identifiers
            ) and _has_trustworthy_detail_evidence(candidate):
                return candidate
        return None

    def _find_comments(self, data: dict) -> list | None:
        """在 RENDER_DATA 中定位评论列表（存在时）。"""
        candidates = [
            _dig(data, "comment", "data", "comments"),
            _dig(data, "app", "comment", "data", "comments"),
        ]
        for c in candidates:
            if isinstance(c, list):
                return c
        return None

    @staticmethod
    def _search_key(node: Any, key: str, _depth: int = 0) -> Any:
        """整树浅搜首个含指定 key 的 dict 值（深度受限，避免爆栈）。"""
        if _depth > 6 or not isinstance(node, dict):
            return None
        if key in node:
            return node[key]
        for v in node.values():
            if isinstance(v, dict):
                r = DouyinCollector._search_key(v, key, _depth + 1)
                if r is not None:
                    return r
            elif isinstance(v, list) and _depth < 4:
                for item in v:
                    r = DouyinCollector._search_key(item, key, _depth + 1)
                    if r is not None:
                        return r
        return None

    @staticmethod
    def _search_list_of_key(node: Any, key: str, _depth: int = 0) -> list | None:
        """整树查找含指定 key 的 dict 元素组成的列表（best-effort）。"""
        if _depth > 6 or not isinstance(node, (dict, list)):
            return None
        if isinstance(node, list):
            items = [i for i in node if isinstance(i, dict) and key in i]
            if items:
                return items
            for i in node:
                r = DouyinCollector._search_list_of_key(i, key, _depth + 1)
                if r:
                    return r
            return None
        for v in node.values():
            r = DouyinCollector._search_list_of_key(v, key, _depth + 1)
            if r:
                return r
        return None

    # ----------------------------------------------------------------------
    # 统一字段构建（供 base.normalize_* 使用）
    # ----------------------------------------------------------------------
    @staticmethod
    def _build_profile_raw(url: str, user: dict) -> dict:
        sec_uid = user.get("sec_uid")
        unique_id = user.get("unique_id")  # 抖音号（用户自定义，可能为空）
        account_id = unique_id or sec_uid  # 优先抖音号，回退 sec_uid
        verified = DouyinCollector._extract_verified(user)
        follower_value = user.get("follower_count")
        if follower_value is None:
            follower_value = user.get("followers")
        post_count_value = user.get("aweme_count")
        if post_count_value is None:
            post_count_value = user.get("aweme_counts")
        followers = _int(follower_value)
        post_count = _int(post_count_value)
        total_likes = _int(user.get("total_favorited"))
        return {
            "platform": "douyin",
            "account_id": account_id,
            "account_name": user.get("nickname"),
            "profile_url": user.get("profile_url") or user.get("share_url") or url,
            "bio": user.get("signature"),
            "verified": verified,
            "enterprise_verify_reason": user.get("enterprise_verify_reason"),
            "custom_verify": user.get("custom_verify"),
            "verification_type": user.get("verification_type"),
            "verification": user.get("verification"),
            "verify_info": user.get("verify_info"),
            "followers": followers,
            "post_count": post_count,
            "platform_metrics": {
                "total_likes": total_likes,
                "sec_uid": sec_uid,
                "unique_id": unique_id,
                "uid": user.get("uid"),
            },
            "collected_at": _now_iso(),
            "field_visibility": {
                "followers": "visible" if followers is not None else "hidden",
                "post_count": "visible" if post_count is not None else "hidden",
            },
        }

    @staticmethod
    def _extract_verified(user: dict) -> bool | str | None:
        """Return strict, shared public certification evidence."""
        from ._douyin_browser_transport import _public_verified

        return _public_verified(user)

    @staticmethod
    def _build_post_raw(url: str, aweme: dict, source: str) -> dict:
        from ._douyin_browser_transport import canonical_post_url_for_item

        desc = aweme.get("desc") or ""
        text_extra = aweme.get("text_extra")
        supplied_statistics = aweme.get("statistics")
        statistics = supplied_statistics if isinstance(supplied_statistics, dict) else {}
        supplied_video = aweme.get("video")
        video = supplied_video if isinstance(supplied_video, dict) else {}
        is_top = _public_boolean(aweme, "is_top", "is_top_aweme")
        is_repost = _public_boolean(aweme, "is_repost", "is_forward")
        is_ad = _public_boolean(aweme, "is_ad", "is_commerce")
        trusted_image_text = _is_trusted_image_text(
            aweme.get("aweme_type"), aweme.get("images")
        )
        content_type = "image_text" if trusted_image_text else "video"
        collection = aweme.get("mix_info") or aweme.get("collection")
        collection_name = (collection or {}).get("mix_name") if isinstance(collection, dict) else None
        single_text = (desc or "").split("\n")[0] if isinstance(desc, str) else None
        post_id = str(aweme.get("aweme_id") or aweme.get("aweme_id_str") or "")
        post_url = canonical_post_url_for_item(aweme, post_id)
        collection_source = _collection_source(
            aweme.get("_collection_source"), source
        )
        published_at = _ts_to_iso(aweme.get("create_time"))
        duration_ms = _int(video.get("duration"))
        duration_seconds = (
            duration_ms // 1000
            if duration_ms is not None and duration_ms >= 0
            else None
        )
        hashtags = _extract_hashtags(desc, text_extra)
        browser_source = collection_source in {"dom", "network", "network+dom"}
        raw_missing_evidence = (
            {"hashtags"}
            if not hashtags
            and not _text_extra_is_structurally_observed(text_extra)
            else set()
        )
        p0_missing_fields = missing_detail_fields(
            {
                "title": single_text,
                "published_at": published_at,
                "duration_seconds": duration_seconds,
                "hashtags": hashtags,
                "content_type": content_type,
            },
            trusted_missing_fields=raw_missing_evidence,
            trusted_duration_not_applicable=trusted_image_text,
        )
        collection_status = (
            "PARTIAL"
            if p0_missing_fields
            else "SUCCESS"
        )
        return {
            "platform": "douyin",
            "post_id": post_id,
            "post_url": post_url,
            "published_at": published_at,
            "content_type": content_type,
            "title": single_text,
            "text": desc,
            "duration_seconds": duration_seconds,
            "hashtags": hashtags,
            "is_pinned": is_top,
            "is_repost": is_repost,
            "is_promoted": is_ad,
            # 播放可能不公开 → None（绝不以互动数反推）。
            "views": _int(statistics.get("play_count")),
            "likes": _int(statistics.get("digg_count")),
            "comments": _int(statistics.get("comment_count")),
            "favorites": _int(statistics.get("collect_count")),
            "shares": _int(statistics.get("share_count")),
            "coins": None,
            "danmaku": None,
            "collection_status": collection_status,
            "collected_at": _now_iso(),
            "source_url": post_url,
            **(
                {"_trusted_detail_missing_fields": p0_missing_fields}
                if p0_missing_fields
                else {}
            ),
            **(
                {"_trusted_duration_not_applicable": True}
                if trusted_image_text
                else {}
            ),
            "platform_metrics": {
                "collection_name": collection_name,
                "aweme_type": aweme.get("aweme_type"),
                "collection_source": collection_source,
                **(
                    {
                        "missing_detail_fields": p0_missing_fields,
                        "partial_reasons": (
                            [MISSING_P0_DETAIL]
                            if p0_missing_fields
                            else []
                        ),
                    }
                    if browser_source
                    else {}
                ),
                "visible_is_pinned": (
                    True
                    if collection_source == "dom" and aweme.get("is_top") is True
                    else None
                    if collection_source == "dom"
                    else is_top
                ),
            },
        }

    @staticmethod
    def _parse_post_date(iso: Any) -> datetime | None:
        if not isinstance(iso, str) or not iso:
            return None
        try:
            parsed = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=BEIJING_TZ)
        return parsed

    @staticmethod
    def _filter_by_date(
        posts: list[dict[str, Any]],
        date_range: tuple[str | None, str | None],
    ) -> list[dict[str, Any]]:
        """Strictly intersect known publication dates with an explicit range."""
        df, dt = date_range
        lo = DouyinCollector._parse_post_date(df)
        hi = DouyinCollector._parse_post_date(dt)
        out: list[dict[str, Any]] = []
        for p in posts:
            pa = DouyinCollector._parse_post_date(p.get("published_at"))
            if pa is None:
                continue
            if lo is not None and pa < lo:
                continue
            if hi is not None and pa > hi:
                continue
            out.append(p)
        return out
