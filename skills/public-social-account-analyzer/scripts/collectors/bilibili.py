"""B站公开账号采集适配器（P0）。

仅用标准库（subprocess 调 curl / json / hashlib）访问 *.bilibili.com 公开接口。
实现统一适配器接口：supports / check_access / collect_profile /
collect_post_list / collect_post_detail / collect_comments。

为什么用 curl 而非 urllib：B站 WAF 会直接拒绝 urllib 直连的 HTTP 层（返回
HTTP 412），而 curl 携带完整浏览器头（Origin / Sec-Fetch / --compressed）可正常
通过。以下实现路径由 T3 实跑验证（game 区个人 up 主 mid=411581408）：
  - buvid3/buvid4 前置（finger/spi，JSON 直接返回 b_3/b_4，无需解析 Set-Cookie）
  - 高风险层 space 接口必须走 wbi 签名，且签名字典**必须含 web_location**（注意：acc/info 用 333.1007，arc/search 用 333.1387，用错会导致签名被拒 -799）
  - 正确路径为 /x/space/wbi/acc/info 与 /x/space/wbi/arc/search
  - 平台一旦返回保护响应，当前任务立即停止；外层编排可按固定退避在新工作区
    有界重试，但不会轮换账号、出口 IP、登录态或改走浏览器。

合规边界（见 SKILL.md 与 references/platforms/bilibili.md）：
- 不登录、不破解验证码；公开列表使用 WBI 签名，遇阻停止当前会话并抛出
  BilibiliError(stop_reason)，由外层决定是否有界重试。
- 字段不可见写 None（绝不用 0 代替未知）。
- 不分析、不存储，只返回结构化原始数据（由上层脚本落盘）。
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import time
import urllib.parse
from functools import reduce
from typing import Any

from ._constants import (
    PUBLIC_ALL_DEFAULT_MAX_ITEMS,
    PUBLIC_LIMIT_DEFAULT,
    validate_public_all_budgets,
    validate_public_all_max_items,
    validate_public_limit,
)
from ._utils import now_iso as _now_iso
from ._utils import parse_int as _int
from ._utils import ts_to_iso as _to_iso
from .base import BaseCollector
from .url_policy import canonical_item_url

API = "https://api.bilibili.com"
WEB = "https://space.bilibili.com"
VIDEO = "https://www.bilibili.com/video/"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# stop_reason 取值严格对齐 SKILL.md 枚举（字符串值必须完全一致）
STOP_LOGIN = "LOGIN_REQUIRED"
STOP_VERIFICATION = "VERIFICATION_REQUIRED"
STOP_ACCOUNT_UNAVAILABLE = "ACCOUNT_UNAVAILABLE"
STOP_ACCESS_RESTRICTED = "ACCESS_RESTRICTED"
STOP_RATE_LIMITED = "RATE_LIMITED"
# 本地结构缺失使用 PARSER_FAILED；端点均明确返回空列表使用 NO_PUBLIC_CONTENT。
STOP_PARSER_FAILED = "PARSER_FAILED"
STOP_NO_PUBLIC_CONTENT = "NO_PUBLIC_CONTENT"
STOP_UNSUPPORTED = "UNSUPPORTED_PLATFORM"
STOP_INTERNAL = "INTERNAL_ERROR"
STOP_COMMENTS_UNAVAILABLE = "COMMENTS_UNAVAILABLE"

# 安全诊断码只描述内部阶段，不包含端点参数、账号 ID、响应正文或异常文本。
DIAG_MEDIALIST_DISCOVERY = "BILIBILI_MEDIALIST_DISCOVERY"
DIAG_PINNED_DISCOVERY = "BILIBILI_PINNED_DISCOVERY"
DIAG_ARC_DISCOVERY = "BILIBILI_ARC_DISCOVERY"
DIAG_SEARCH_DISCOVERY = "BILIBILI_SEARCH_DISCOVERY"
DIAG_DYNAMIC_DISCOVERY = "BILIBILI_DYNAMIC_DISCOVERY"
DIAG_VIEW_DETAIL = "BILIBILI_VIEW_DETAIL"
DIAG_TAG_ENRICHMENT = "BILIBILI_TAG_ENRICHMENT"
DIAG_PROFILE_ACCESS = "BILIBILI_PROFILE_ACCESS"

BILIBILI_DYNAMIC_STATUSES = frozenset({
    "NOT_ATTEMPTED",
    "UNAVAILABLE",
    "OBSERVED",
    STOP_LOGIN,
    STOP_VERIFICATION,
    STOP_ACCESS_RESTRICTED,
    STOP_RATE_LIMITED,
    STOP_PARSER_FAILED,
    STOP_INTERNAL,
})

# WBI 置换表（bilibili-api-collect 项目权威值，长度 64，元素 0-63）
MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43,
    5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16,
    24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59,
    6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]

# 这些业务码都是平台已明确返回的保护响应，绝不是传输层瞬态失败。
# 一旦命中便打开会话断路器，当前任务不再发送任何 B 站请求。
PLATFORM_PROTECTION_CODES = {-412, -799, -403, -400, -401, -352, -101}
PLATFORM_PROTECTION_REASONS = {
    STOP_LOGIN,
    STOP_VERIFICATION,
    STOP_ACCESS_RESTRICTED,
    STOP_RATE_LIMITED,
}
# space 类 wbi 接口的 web_location（签名字典必须包含，否则签名被拒 -412）
# 注意：不同 space 子接口要求不同 web_location：
#   - acc/info   → 333.1007
#   - arc/search → 333.1387（用错会导致 -799 签名被拒，退化到 search/type 仅得少量结果）
WEB_LOCATION_SPACE = "333.1007"
WEB_LOCATION_ARC = "333.1387"

# 分区静态映射（typeid -> 子分区）。来源：references/platforms/bilibili.md §分区中文名缺口结论
# （第 2 层：独立浏览器工作流产出、高置信、待官方分区表核对；尤其 249/250 待核对）。
# 现实 API 的 tname/tname_v2 已实测为空，故分区只能靠此静态映射，并在输出标注来源。
TYPENAME_MAP = {
    17: "单机游戏", 21: "日常", 25: "MMD·3D", 28: "原创音乐", 31: "翻唱",
    65: "网络游戏", 95: "数码", 138: "搞笑", 171: "电子竞技", 172: "手机游戏",
    212: "美食侦探", 218: "喵星人", 249: "足球", 250: "出行",  # 249/250 待官方表核对
}


class BilibiliError(Exception):
    """采集错误，携带 stop_reason 供上层决策（不绕过、如实上抛）。"""

    def __init__(
        self,
        stop_reason: str,
        message: str,
        raw: Any = None,
        partial_posts: list[dict] | None = None,
        partial_entries: list[dict] | None = None,
        diagnostic_code: str | None = None,
        platform_response_code: int | None = None,
    ):
        super().__init__(message)
        self.stop_reason = stop_reason
        self.message = message
        self.raw = raw
        self.partial_posts = list(partial_posts or [])
        self.partial_entries = list(partial_entries or [])
        self.diagnostic_code = diagnostic_code
        self.platform_response_code = platform_response_code


class _TransportError(BilibiliError):
    """没有收到平台响应的本地传输失败；最多以同一身份重试一次。"""


# --------------------------------------------------------------------------
# WBI 签名
# --------------------------------------------------------------------------
def get_mixin_key(orig: str) -> str:
    """对 img_key+sub_key(64字符) 按置换表重排并截断为 32 字符。"""
    return reduce(lambda s, i: s + orig[i], MIXIN_KEY_ENC_TAB, "")[:32]


def enc_wbi(params: dict, img_key: str, sub_key: str) -> dict:
    """为请求参数生成 w_rid / wts（WBI 签名）。

    调用方需把 web_location 等「参与签名的业务参数」先放进 params，本函数会对
    全部 params（含 web_location）统一排序、过滤、MD5 生成 w_rid。
    """
    mixin_key = get_mixin_key(img_key + sub_key)
    params = dict(params)
    params["wts"] = str(round(time.time()))
    params = dict(sorted(params.items()))  # 按 key 升序
    params = {
        k: "".join(c for c in str(v) if c not in "!'()*")
        for k, v in params.items()
    }
    query = urllib.parse.urlencode(params)  # 大写 hex、空格 %20
    params["w_rid"] = hashlib.md5((query + mixin_key).encode("utf-8")).hexdigest()
    return params


def _stop_reason_for_code(code: Any) -> str:
    return {
        -412: STOP_ACCESS_RESTRICTED,
        -799: STOP_RATE_LIMITED,
        -401: STOP_VERIFICATION,
        -352: STOP_VERIFICATION,
        -403: STOP_ACCESS_RESTRICTED,
        -404: STOP_ACCOUNT_UNAVAILABLE,
        -400: STOP_ACCESS_RESTRICTED,
        -101: STOP_ACCESS_RESTRICTED,
    }.get(code, STOP_ACCESS_RESTRICTED)


def _backoff(attempt: int) -> float:
    return min(30.0, 3.0 * (2 ** attempt))


def _is_platform_protection(error: BilibiliError) -> bool:
    return error.stop_reason in PLATFORM_PROTECTION_REASONS


def _set_diagnostic(error: BilibiliError, code: str) -> BilibiliError:
    """Attach a fixed safe substage without replacing an earlier diagnosis."""
    if not getattr(error, "diagnostic_code", None):
        error.diagnostic_code = code
    return error


# --------------------------------------------------------------------------
# HTTP 会话（curl 传输层）
# --------------------------------------------------------------------------
class Session:
    def __init__(
        self,
        timeout: int = 10,
        min_interval: float = 1.2,
        browser_fallback: bool | None = None,
        cookie_records: tuple[dict[str, Any], ...] = (),
    ):
        # Cookie records are pre-validated by platform_cookies.py and remain
        # process-memory only.  Curl needs only the name/value pair.
        self.cookies: dict[str, str] = {
            record["name"]: record["value"] for record in cookie_records
        }
        self.timeout = timeout
        # BILIBILI_MIN_INTERVAL 允许操作员调大请求间隔（单位秒，上限 30）以降低风控概率。
        # 只接受正数；非法值忽略，保留调用方传入的 min_interval。
        _env_interval = os.environ.get("BILIBILI_MIN_INTERVAL")
        if _env_interval is not None:
            try:
                _v = float(_env_interval)
                if 0 < _v <= 30:
                    min_interval = _v
            except ValueError:
                pass
        self.min_interval = min_interval
        self._last = 0.0
        self._wbi: tuple[str, str] | None = None
        self._blocked_reason: str | None = None
        self._blocked_platform_response_code: int | None = None
        self._buvid_initialized = False
        self._buvid_established = False  # 供外层写入 collection_coverage
        self._discovery_coverage: dict[str, Any] = {}
        self._dynamic_discovery_coverage: dict[str, Any] = {}
        # 保留配置字段以兼容调用方和显式浏览器工具，但平台保护响应绝不会触发浏览器降级。
        self._browser_fallback = (
            os.environ.get("BILIBILI_BROWSER_FALLBACK") == "1"
            if browser_fallback is None
            else bool(browser_fallback)
        )

    def get_discovery_coverage(self) -> dict[str, Any]:
        """Return pagination facts from the most recent regular discovery."""
        return dict(self._discovery_coverage)

    def get_dynamic_discovery_coverage(self) -> dict[str, Any]:
        """Return terminal evidence for the most recent dynamic discovery."""
        return dict(self._dynamic_discovery_coverage)

    def _throttle(self) -> None:
        gap = self.min_interval - (time.time() - self._last)
        if gap > 0:
            time.sleep(gap)
        self._last = time.time()

    def _curl(self, url: str, referer: str) -> str:
        """用 curl 取响应体（argv 列表，无 shell 插值，避免注入）。"""
        self._throttle()
        cookie = "; ".join(f"{k}={v}" for k, v in self.cookies.items())
        cmd = [
            "curl", "-sS", "--compressed",
            "--max-time", str(self.timeout),
            "-A", UA,
            "-H", f"Referer: {referer}",
            "-H", "Accept: application/json, text/plain, */*",
            "-H", "Accept-Language: zh-CN,zh;q=0.9",
            "-H", "Origin: https://space.bilibili.com",
            "-H", "Sec-Fetch-Dest: empty",
            "-H", "Sec-Fetch-Mode: cors",
            "-H", "Sec-Fetch-Site: cross-site",
        ]
        if cookie:
            cmd += ["-b", cookie]
        cmd.append(url)
        try:
            proc = subprocess.run(
                cmd, capture_output=True, text=True, timeout=self.timeout + 10
            )
        except subprocess.TimeoutExpired:
            raise _TransportError(STOP_INTERNAL, "B站请求传输超时")
        if proc.returncode != 0:
            raise _TransportError(STOP_INTERNAL, "B站请求传输失败")
        return proc.stdout

    def _raise_if_blocked(self) -> None:
        if self._blocked_reason is not None:
            raise BilibiliError(
                self._blocked_reason,
                "B站会话已因平台保护响应停止",
                platform_response_code=self._blocked_platform_response_code,
            )

    def _trip_circuit(self, error: BilibiliError) -> None:
        if error.stop_reason in PLATFORM_PROTECTION_REASONS:
            self._blocked_reason = error.stop_reason
            self._blocked_platform_response_code = getattr(
                error, "platform_response_code", None
            )

    def raise_for_task(
        self,
        stop_reason: str,
        message: str,
        raw: Any = None,
        diagnostic_code: str | None = None,
    ) -> None:
        """Raise a task error and trip the circuit for protection reasons."""
        error = BilibiliError(
            stop_reason,
            message,
            raw,
            diagnostic_code=diagnostic_code,
        )
        self._trip_circuit(error)
        raise error

    def get_json(
        self,
        path: str,
        params=None,
        wbi: bool = False,
        referer: str = WEB,
        retry: int = 3,
        raise_on_error: bool = True,
    ) -> dict:
        """取 JSON；平台保护响应立即停，纯传输失败同身份最多重试一次。"""
        self._raise_if_blocked()
        q = dict(params or {})
        if wbi:
            if self._wbi is None:
                self._refresh_wbi()
            q = enc_wbi(q, self._wbi[0], self._wbi[1])
        full = API + path + (("?" + urllib.parse.urlencode(q)) if q else "")
        attempts = 1 if retry <= 1 else 2
        for attempt in range(attempts):
            try:
                body = self._curl(full, referer)
            except _TransportError:
                if attempt + 1 < attempts:
                    time.sleep(_backoff(attempt))
                    continue
                raise
            except BilibiliError as error:
                self._trip_circuit(error)
                raise
            try:
                return self._parse_and_check(body, path, raise_on_error)
            except BilibiliError as error:
                self._trip_circuit(error)
                raise
        raise BilibiliError(STOP_INTERNAL, "B站请求未完成")

    def _parse_and_check(
        self, body: str, path: str, raise_on_error: bool
    ) -> dict:
        """解析响应体；任何平台保护码或保护页都立即上抛。"""
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            raise self._non_json_error(path, body)
        code = data.get("code")
        if code == 0 or code is None:
            return data
        if code in PLATFORM_PROTECTION_CODES:
            raise BilibiliError(
                _stop_reason_for_code(code),
                f"{path} 被平台拒绝 (code={code})",
                platform_response_code=code,
            )
        if not raise_on_error:
            return data
        raise BilibiliError(
            _stop_reason_for_code(code),
            f"{path} code={code} {data.get('message')}",
            data,
            platform_response_code=(
                code if isinstance(code, int) and not isinstance(code, bool) else None
            ),
        )

    def _fetch_via_browser(self, full: str, referer: str) -> str:
        """浏览器降级：经运行环境的浏览器进程 fetch（请求走真实网络出口）。

        仅作传输层替代；不绕过验证码/滑块/登录墙/频控。复用会话已获得的 buvid cookie。
        跨平台：浏览器二进制由 browser_backend.find_browser 自动探测，或由
        BROWSER_BIN / CHROME_BIN 环境变量覆盖，绝不硬编码本机路径。
        """
        from .browser_backend import BrowserSession, BrowserError, find_browser

        bin_path = find_browser()
        if not bin_path:
            raise BrowserError("未找到浏览器二进制，无法启用浏览器降级")
        headers = {
            "Referer": referer,
            "Origin": "https://space.bilibili.com",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
        with BrowserSession(browser_bin=bin_path) as b:
            if self.cookies:
                b.set_cookies(self.cookies, domain=".bilibili.com")
            return b.fetch_text(full, headers)

    def _non_json_error(self, path: str, body: str) -> BilibiliError:
        """Classify non-JSON only when the body contains explicit evidence."""
        low = (body or "").lower()
        if any(
            marker in low
            for marker in (
                "verify_captcha",
                "captcha required",
                "verification required",
                "验证码",
                "滑块",
                "geetest",
            )
        ):
            return BilibiliError(
                STOP_VERIFICATION, f"非 JSON 响应疑似验证码/滑块拦截页: {path}"
            )
        if "login" in low or "登录" in low:
            return BilibiliError(STOP_LOGIN, f"非 JSON 响应疑似登录墙: {path}")
        if any(
            marker in low
            for marker in (
                "too many requests",
                "rate limit",
                "rate-limit",
                "ratelimit",
                "请求过于频繁",
                "频控",
                "限流",
            )
        ):
            return BilibiliError(
                STOP_RATE_LIMITED,
                f"非 JSON 响应含平台频控证据: {path}",
            )
        if any(
            marker in low
            for marker in (
                "waf",
                "request was banned",
                "access denied",
                "forbidden",
                "precondition failed",
                "访问受限",
                "拒绝访问",
                "请求被拦截",
            )
        ):
            return BilibiliError(
                STOP_ACCESS_RESTRICTED,
                f"非 JSON 响应含平台访问限制证据: {path}",
            )
        return BilibiliError(
            STOP_PARSER_FAILED,
            f"非 JSON 响应无法解析: {path}",
        )

    def _refresh_wbi(self) -> None:
        data = self.get_json("/x/web-interface/nav", retry=2, raise_on_error=False)
        wbi = (data.get("data") or {}).get("wbi_img") or {}
        img = re.sub(r"\.png$", "", (wbi.get("img_url") or "").rsplit("/", 1)[-1])
        sub = re.sub(r"\.png$", "", (wbi.get("sub_url") or "").rsplit("/", 1)[-1])
        if not img or not sub:
            self.raise_for_task(STOP_PARSER_FAILED, "nav 未返回 wbi_img 密钥")
        self._wbi = (img, sub)

    def ensure_buvid(self, force: bool = False) -> None:
        del force  # 兼容旧调用签名；当前任务绝不轮换已经建立的公开身份。
        if self.cookies.get("buvid3"):
            self._buvid_initialized = True
            self._buvid_established = True
            return
        if self._buvid_initialized:
            return
        self._buvid_initialized = True
        try:
            data = self.get_json("/x/frontend/finger/spi", retry=2)
            d = data.get("data") or {}
            if d.get("b_3"):
                self.cookies["buvid3"] = d["b_3"]
                self._buvid_established = True
            if d.get("b_4"):
                self.cookies["buvid4"] = d["b_4"]
        except BilibiliError:
            # finger/spi 失败不中止任务，但后续请求缺少 buvid 风控概率更高。
            # _buvid_established 保持 False，供外层写入 collection_coverage 供诊断。
            return

    # -- 投稿发现 --
    def discover_medialist(
        self,
        mid: str,
        limit: int,
        date_range: tuple[str | None, str | None] | None = None,
    ) -> list:
        """首选：medialist/resource/list 游标分页（免 wbi、免频控、返回完整 cnt_info）。

        相比 arc/search 的优势（T6 实测，2026-07-23）：
        - 免 wbi 签名，数据中心 IP 稳定 code:0，无 -412/-799 风控
        - 单次调用即返回完整 cnt_info（play/thumb_up/coin/collect/reply/danmaku/share），
          无需逐条 view 补全，大幅减少请求数与 IP 信誉消耗
        - 游标分页用 oid=上一页最后一条的 id，has_more 控制翻页

        字段映射（media_list 条目 → 统一字段）：
          bv_id → bvid, title, pubtime → published_at, duration(秒),
          tid → typeid, cnt_info.{play,thumb_up,coin,collect,reply,danmaku,share}
          copy_right: 1=原创, 2=转载
        """
        out: list = []
        seen_bvids: set[str] = set()
        oid = "0"
        size = 20
        observed_pages = 0
        self._discovery_coverage = {
            "terminal_page_observed": False,
            "observed_page_count": 0,
            "observed_post_count": 0,
            "stop_condition": "limit",
        }
        max_pages = max(1, (limit + size - 1) // size + 2)
        for _ in range(max_pages):  # 上限保护
            try:
                data = self.get_json(
                    "/x/v2/medialist/resource/list",
                    {
                        "mobi_app": "web",
                        "type": "1",
                        "biz_id": mid,
                        "oid": oid,
                        "size": size,
                    },
                    wbi=False,
                    retry=3,
                )
            except BilibiliError as error:
                error.partial_entries = list(out)
                _set_diagnostic(error, DIAG_MEDIALIST_DISCOVERY)
                raise
            if data.get("code") != 0:
                self.raise_for_task(
                    _stop_reason_for_code(data.get("code")),
                    f"medialist 失败: {data.get('message')}",
                    diagnostic_code=DIAG_MEDIALIST_DISCOVERY,
                )
            d = data.get("data") or {}
            media_list = d.get("media_list") or []
            observed_pages += 1
            if not media_list:
                self._discovery_coverage = {
                    "terminal_page_observed": True,
                    "observed_page_count": observed_pages,
                    "observed_post_count": len(out),
                    "stop_condition": "terminal_page",
                }
                break
            reached_lower_bound = False
            for item in media_list:
                bvid = item.get("bv_id") or item.get("bvid")
                if isinstance(bvid, str) and bvid:
                    if bvid in seen_bvids:
                        continue
                    seen_bvids.add(bvid)
                published_at = _to_iso(item.get("pubtime"))
                if _date_matches(published_at, date_range):
                    out.append(item)
                    if len(out) >= limit:
                        terminal = not bool(d.get("has_more"))
                        self._discovery_coverage = {
                            "terminal_page_observed": terminal,
                            "observed_page_count": observed_pages,
                            "observed_post_count": len(out),
                            "stop_condition": (
                                "terminal_page" if terminal else "max_items"
                            ),
                        }
                        return out[:limit]
                if (
                    date_range
                    and date_range[0]
                    and published_at
                    and published_at < date_range[0]
                ):
                    reached_lower_bound = True
            if reached_lower_bound:
                self._discovery_coverage = {
                    "terminal_page_observed": False,
                    "observed_page_count": observed_pages,
                    "observed_post_count": len(out),
                    "stop_condition": "date_lower_bound",
                }
                break
            if not d.get("has_more"):
                self._discovery_coverage = {
                    "terminal_page_observed": True,
                    "observed_page_count": observed_pages,
                    "observed_post_count": len(out),
                    "stop_condition": "terminal_page",
                }
                break
            # 游标更新为当前页最后一条的 id
            last = media_list[-1]
            new_oid = str(last.get("id") or "")
            if not new_oid or new_oid == oid:
                self._discovery_coverage = {
                    "terminal_page_observed": False,
                    "observed_page_count": observed_pages,
                    "observed_post_count": len(out),
                    "stop_condition": "repeated_cursor",
                }
                break
            oid = new_oid
            time.sleep(1.0)  # 翻页间隔，降低风控概率
        return out[:limit]

    def collect_pinned(self, mid: str) -> tuple[bool, str | None]:
        """获取置顶视频证据，区分“无置顶”与“未观测成功”。

        返回 ``(observed, bvid)``：端点成功响应时 ``observed=True``，
        其中 ``bvid=None`` 表示明确无置顶；普通失败返回
        ``(False, None)``，不得推断为非置顶。
        """
        try:
            data = self.get_json(
                "/x/space/top/arc",
                {"vmid": mid},
                wbi=False,
                retry=2,
            )
            if data.get("code") == 0:
                payload = data.get("data")
                if payload is None:
                    return True, None
                if not isinstance(payload, dict):
                    return False, None
                bvid = payload.get("bvid")
                if isinstance(bvid, str) and bvid.strip():
                    return True, bvid.strip()
                return False, None
        except BilibiliError as error:
            if _is_platform_protection(error):
                raise
        return False, None

    def collect_tags(self, bvid: str) -> list[str]:
        """获取视频标签。端点 /x/tag/archive/tags（免 wbi、稳定）。

        返回 tag_name 列表；失败返回 []（不阻塞主流程）。
        """
        try:
            data = self.get_json(
                "/x/tag/archive/tags",
                {"bvid": bvid},
                wbi=False,
                retry=2,
            )
            if data.get("code") == 0:
                tags = data.get("data") or []
                return [t.get("tag_name") for t in tags if t.get("tag_name")]
        except BilibiliError as error:
            if _is_platform_protection(error):
                raise
        return []

    def discover_arc(
        self,
        mid: str,
        limit: int,
        date_range: tuple[str | None, str | None] | None = None,
    ) -> list:
        """降级 A：wbi 签名的 space 投稿列表(自动翻页至 limit 或末页)。失败抛 BilibiliError 由上层降级。"""
        out: list = []
        seen_bvids: set[str] = set()
        ps = 50
        pn = 1
        observed_pages = 0
        self._discovery_coverage = {
            "terminal_page_observed": False,
            "observed_page_count": 0,
            "observed_post_count": 0,
            "stop_condition": "limit",
        }
        while len(out) < limit:
            if pn > 1:
                # 翻页时仅节流，始终复用任务创建时的公开身份。
                time.sleep(6)
            try:
                data = self.get_json(
                    "/x/space/wbi/arc/search",
                    {
                        "mid": mid,
                        "ps": ps,
                        "pn": pn,
                        "order": "pubdate",
                        "web_location": WEB_LOCATION_ARC,
                    },
                    wbi=True,
                    retry=3,
                )
            except BilibiliError as error:
                error.partial_entries = list(out)
                _set_diagnostic(error, DIAG_ARC_DISCOVERY)
                raise
            if data.get("code") != 0:
                self.raise_for_task(
                    _stop_reason_for_code(data.get("code")),
                    "arc/search 失败",
                    diagnostic_code=DIAG_ARC_DISCOVERY,
                )
            vlist = (data.get("data") or {}).get("list", {}).get("vlist", [])
            observed_pages += 1
            if not vlist:
                self._discovery_coverage = {
                    "terminal_page_observed": True,
                    "observed_page_count": observed_pages,
                    "observed_post_count": len(out),
                    "stop_condition": "terminal_page",
                }
                break
            reached_lower_bound = False
            for item in vlist:
                bvid = item.get("bvid")
                if isinstance(bvid, str) and bvid:
                    if bvid in seen_bvids:
                        continue
                    seen_bvids.add(bvid)
                published_at = _to_iso(
                    item.get("created") or item.get("pubdate")
                )
                if _date_matches(published_at, date_range):
                    out.append(item)
                    if len(out) >= limit:
                        terminal = len(vlist) < ps
                        self._discovery_coverage = {
                            "terminal_page_observed": terminal,
                            "observed_page_count": observed_pages,
                            "observed_post_count": len(out),
                            "stop_condition": (
                                "terminal_page" if terminal else "max_items"
                            ),
                        }
                        return out[:limit]
                if (
                    date_range
                    and date_range[0]
                    and published_at
                    and published_at < date_range[0]
                ):
                    reached_lower_bound = True
            if reached_lower_bound or len(vlist) < ps:
                terminal = len(vlist) < ps and not reached_lower_bound
                self._discovery_coverage = {
                    "terminal_page_observed": terminal,
                    "observed_page_count": observed_pages,
                    "observed_post_count": len(out),
                    "stop_condition": (
                        "terminal_page" if terminal else "date_lower_bound"
                    ),
                }
                break  # 已到末页
            pn += 1
        return out[:limit]

    def discover_search(self, mid: str, url: str, limit: int) -> list:
        """降级 B：用昵称搜 bili_user，取其 res[] 中的 BV 列表。"""
        card = self.get_json("/x/web-interface/card", {"mid": mid})
        name = (card.get("data") or {}).get("card", {}).get("name", "")
        if not name:
            self.raise_for_task(
                STOP_PARSER_FAILED,
                f"无法解析昵称进行 search 降级 (mid={mid})",
                diagnostic_code=DIAG_SEARCH_DISCOVERY,
            )
        data = self.get_json(
            "/x/web-interface/search/type",
            {"search_type": "bili_user", "keyword": name, "page": 1},
        )
        if data.get("code") != 0:
            self.raise_for_task(
                _stop_reason_for_code(data.get("code")),
                "search/type 降级失败",
                diagnostic_code=DIAG_SEARCH_DISCOVERY,
            )
        res_data = data.get("data") or {}
        target = next(
            (r for r in res_data.get("result", [])
             if str(r.get("mid")) == str(mid)),
            None,
        )
        if not target:
            self.raise_for_task(
                STOP_PARSER_FAILED,
                "search/type 未匹配到该账号",
                diagnostic_code=DIAG_SEARCH_DISCOVERY,
            )
        return [it["bvid"] for it in target.get("res", []) if it.get("bvid")][:limit]

    def discover_dynamics(
        self,
        mid: str,
        limit: int,
        date_range: tuple[str | None, str | None] | None = None,
    ) -> list:
        """空间动态 feed（视频类动态）。WBI 签名 + web_location=333.1007。

        分页用 offset + has_more；B站动态 feed 偶发返回空页（has_more 仍为 true），
        故用 empty_streak 守卫避免死循环。仅视频类动态（含 bvid）入列；转发卡
        (orig 非空) 也保留 bvid 但标记 is_forward。平台保护响应立即上抛并打开断路器。
        """
        out: list = []
        offset = ""
        empty_streak = 0
        self._dynamic_discovery_coverage = {
            "dynamic_terminal_page_observed": False,
            "dynamic_stop_condition": "max_items",
        }
        for _ in range(20):
            if out and offset:
                time.sleep(1.0)  # 分页间隔，降低被风控概率
            try:
                data = self.get_json(
                    "/x/polymer/web-dynamic/v1/feed/space",
                    {
                        "host_mid": mid,
                        "offset": offset,
                        "timeline_ad": "true",
                        "web_location": WEB_LOCATION_SPACE,
                    },
                    wbi=True,
                    retry=3,
                )
            except BilibiliError as error:
                error.partial_entries = list(out)
                _set_diagnostic(error, DIAG_DYNAMIC_DISCOVERY)
                raise
            if data.get("code") != 0:
                self.raise_for_task(
                    _stop_reason_for_code(data.get("code")),
                    "动态 feed 请求失败",
                    diagnostic_code=DIAG_DYNAMIC_DISCOVERY,
                )
            d = data.get("data") or {}
            items = d.get("items") or []
            extracted_count = 0
            for it in items:
                card = _extract_dynamic_card(it)
                if card:
                    extracted_count += 1
                    published_at = _to_iso(card.get("pub_ts"))
                    if _date_matches(published_at, date_range):
                        out.append(card)
                        if len(out) >= limit:
                            terminal = not bool(d.get("has_more"))
                            self._dynamic_discovery_coverage = {
                                "dynamic_terminal_page_observed": terminal,
                                "dynamic_stop_condition": (
                                    "terminal_page" if terminal else "max_items"
                                ),
                            }
                            return out[:limit]
            if extracted_count == 0:
                empty_streak += 1
                if empty_streak >= 2:
                    self._dynamic_discovery_coverage = {
                        "dynamic_terminal_page_observed": False,
                        "dynamic_stop_condition": "idle",
                    }
                    break
            else:
                empty_streak = 0
            if not d.get("has_more"):
                self._dynamic_discovery_coverage = {
                    "dynamic_terminal_page_observed": True,
                    "dynamic_stop_condition": "terminal_page",
                }
                break
            new_offset = d.get("offset") or ""
            if new_offset == offset and empty_streak >= 2:
                self._dynamic_discovery_coverage = {
                    "dynamic_terminal_page_observed": False,
                    "dynamic_stop_condition": "repeated_cursor",
                }
                break
            offset = new_offset
        return out[:limit]


def _date_matches(
    published_at: str | None,
    date_range: tuple[str | None, str | None] | None,
) -> bool:
    if date_range is None:
        return True
    if published_at is None:
        return False
    date_from, date_to = date_range
    if date_from and published_at < date_from:
        return False
    if date_to and published_at > date_to:
        return False
    return True


def _extract_hashtags(*texts: Any) -> list[str]:
    """从文本中按 #标签# 形式提取话题标签。"""
    tags: list[str] = []
    for t in texts:
        if not t or not isinstance(t, str):
            continue
        for m in re.findall(r"#([^#\s]+)#?", t):
            if m and m not in tags:
                tags.append(m)
    return tags


def _parse_duration(v: Any) -> int | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    s = str(v).strip()
    if ":" in s:  # mm:ss 或 hh:mm:ss
        parts = [int(p) for p in s.split(":")]
        sec = 0
        for p in parts:
            sec = sec * 60 + p
        return sec
    return _int(s)


def _mid_from_url(url: str) -> str:
    m = re.search(r"bilibili\.com/(?:space/)?(\d+)", url)
    if not m:
        raise BilibiliError(STOP_UNSUPPORTED, f"无法从 URL 解析 UID: {url}")
    return m.group(1)


def _mark_detail_unavailable(post: dict) -> None:
    """Keep list evidence while declaring that detail enrichment failed."""
    post["collection_status"] = "PARTIAL"
    metrics = post.get("platform_metrics")
    metrics = dict(metrics) if isinstance(metrics, dict) else {}
    metrics["detail_status"] = "UNAVAILABLE"
    post["platform_metrics"] = metrics


def _mark_post_deleted(post: dict) -> None:
    """Keep stale list evidence while recording an explicit deleted detail."""
    post["collection_status"] = "DELETED"
    metrics = post.get("platform_metrics")
    metrics = dict(metrics) if isinstance(metrics, dict) else {}
    metrics["detail_status"] = "DELETED"
    post["platform_metrics"] = metrics


def _mark_tags_unavailable(post: dict) -> None:
    """Declare optional tag enrichment incomplete without losing list data."""
    post["collection_status"] = "PARTIAL"
    metrics = post.get("platform_metrics")
    metrics = dict(metrics) if isinstance(metrics, dict) else {}
    metrics["tags_status"] = "UNAVAILABLE"
    post["platform_metrics"] = metrics


def _raise_with_partial_posts(
    error: BilibiliError,
    posts: list[dict],
    current: dict | None = None,
) -> None:
    partial_posts = list(posts)
    if current is not None:
        partial_posts.append(current)
    error.partial_posts = partial_posts
    raise error


def _deduplicate_discovery_entries(entries: list[dict]) -> list[dict]:
    """Keep the first public observation for each post before enrichment."""
    unique: list[dict] = []
    seen: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        post_id = (
            entry.get("bvid")
            or entry.get("bv_id")
            or str(entry.get("aid") or "")
        )
        if not post_id or post_id == "None" or post_id in seen:
            continue
        seen.add(post_id)
        unique.append(entry)
    return unique


def _deduplicate_dynamic_cards(cards: list[dict]) -> list[dict]:
    """Keep the first dynamic observation for each BV before merging."""
    unique: list[dict] = []
    seen: set[str] = set()
    for card in cards:
        if not isinstance(card, dict):
            continue
        post_id = card.get("bvid")
        if not isinstance(post_id, str) or not post_id or post_id in seen:
            continue
        seen.add(post_id)
        unique.append(card)
    return unique


# --------------------------------------------------------------------------
# 适配器
# --------------------------------------------------------------------------
class BilibiliCollector(BaseCollector):
    platform = "bilibili"

    def __init__(
        self,
        browser_fallback: bool | None = None,
        cookie_records: tuple[dict[str, Any], ...] = (),
    ):
        self.browser_fallback = browser_fallback
        self._cookie_records = tuple(cookie_records)
        self._task_session: Session | None = None
        self._cached_profile_card: dict | None = None
        self._collection_coverage: dict[str, Any] = {}
        self._skip_optional_tags = False

    def _new_session(self) -> Session:
        """Return the collector task's single shared session."""
        if self._task_session is None:
            self._task_session = Session(
                browser_fallback=self.browser_fallback,
                cookie_records=self._cookie_records,
            )
        return self._task_session

    def get_collection_coverage(self) -> dict[str, Any]:
        """Return a copy of the safe regular/dynamic observation ledger."""
        return dict(self._collection_coverage)

    # -- 路由 --
    def supports(self, url: str) -> bool:
        # 仅接受账号主页：https://space.bilibili.com/<digits>
        # 允许 http/https、可选尾部斜杠、可选 ?query；拒绝子域名、裸域名与
        # 任何额外路径段（/dynamic、/video、/search 等）。
        if not isinstance(url, str):
            return False
        return bool(re.fullmatch(
            r"https?://space\.bilibili\.com/\d+/?(?:\?[^#/]*)?(?:#[^/]*)?",
            url.strip(),
        ))

    # -- 访问检查（不绕过） --
    def check_access(self, url: str) -> dict:
        mid = _mid_from_url(url)
        s = self._new_session()
        s.ensure_buvid()
        self._collection_coverage = {
            "regular_observed_count": 0,
            "dynamic_status": "NOT_ATTEMPTED",
            "dynamic_observed_count": 0,
        }
        # 免 wbi 端点优先：card 稳定，relation/stat 偶发被风控(-400/-412)。
        # 任一成功即视为可访问；仅两端点都失败才报受限。
        last: BilibiliError | None = None
        for path, params in (
            ("/x/web-interface/card", {"mid": mid}),
            ("/x/relation/stat", {"mid": mid}),
        ):
            try:
                data = s.get_json(path, params, retry=2)
            except BilibiliError as e:
                last = e
                if _is_platform_protection(e):
                    break
                continue
            code = data.get("code")
            if code == 0:
                if path == "/x/web-interface/card":
                    self._cached_profile_card = data
                return {"accessible": True, "status": "normal", "stop_reason": None}
            if code == -404:
                return {"accessible": False, "status": "account_not_exist", "stop_reason": STOP_ACCOUNT_UNAVAILABLE}
            last = BilibiliError(_stop_reason_for_code(code), f"{path} code={code}")
        return {
            "accessible": False,
            "status": "restricted",
            "stop_reason": (last.stop_reason if last else STOP_ACCESS_RESTRICTED),
            "diagnostic_code": DIAG_PROFILE_ACCESS,
            "platform_response_code": (
                last.platform_response_code if last is not None else None
            ),
        }

    # -- 资料 --
    def collect_profile(self, url: str) -> dict:
        mid = _mid_from_url(url)
        s = self._new_session()
        s.ensure_buvid()

        # ``check_access`` 已通过同一公开 card 响应确认账号可访问。复用该证据既避免
        # 重复请求，也保证列表阶段稍后触发断路时资料不会被清空。card 已覆盖 P0
        # 资料字段；高风险 acc/info 不再作为完成 P0 资料的前置条件。
        card = self._cached_profile_card
        if card is None:
            card = s.get_json("/x/web-interface/card", {"mid": mid})
            self._cached_profile_card = card
        return self.normalize_profile(_build_profile_raw(mid, card, None, None))

    def _normalize_discovery_entries(
        self,
        entries: list[dict],
        source: str,
        account_url: str,
        pinned_observed: bool,
        pinned_bvid: str | None,
    ) -> list[dict]:
        """Normalize already-observed list pages without making more requests."""
        posts: list[dict] = []
        for entry in _deduplicate_discovery_entries(entries):
            if not isinstance(entry, dict):
                continue
            bvid = (
                entry.get("bvid")
                or entry.get("bv_id")
                or str(entry.get("aid") or "")
            )
            if not bvid or bvid == "None":
                continue
            if source == "medialist":
                base = _build_post_raw_from_medialist(entry, account_url)
            elif source == "arc":
                base = _build_post_raw_from_vlist(entry, account_url)
                _mark_detail_unavailable(base)
            else:
                base = _empty_post(str(bvid))
                _mark_detail_unavailable(base)
            if pinned_observed:
                base["is_pinned"] = bool(
                    pinned_bvid is not None and bvid == pinned_bvid
                )
            base["field_visibility"] = _post_field_visibility(base)
            posts.append(self.normalize_post(base))
        return posts

    def _merge_dynamic_cards(
        self,
        posts: list[dict],
        cards: list[dict],
        *,
        pinned_observed: bool,
        pinned_bvid: str | None,
    ) -> list[dict]:
        """Merge dynamic evidence by BV without duplicating regular posts."""
        by_id = {
            str(post.get("post_id")): post
            for post in posts
            if post.get("post_id") is not None
        }
        for card in _deduplicate_dynamic_cards(cards):
            dynamic_post = self.normalize_post(_build_dynamic_raw(card))
            post_id = str(dynamic_post.get("post_id") or "")
            if not post_id:
                continue
            existing = by_id.get(post_id)
            if existing is not None:
                existing_metrics = existing.get("platform_metrics")
                existing_metrics = (
                    dict(existing_metrics)
                    if isinstance(existing_metrics, dict)
                    else {}
                )
                dynamic_metrics = dynamic_post.get("platform_metrics") or {}
                existing_metrics["appeared_in_dynamic_feed"] = True
                existing_metrics["dynamic"] = dynamic_metrics.get("dynamic")
                if dynamic_metrics.get("collection_evidence_status") == "OBSERVED":
                    existing_metrics["collection_evidence_status"] = "OBSERVED"
                elif (
                    existing_metrics.get("collection_evidence_status")
                    in {None, "UNAVAILABLE"}
                ):
                    existing_metrics["collection_evidence_status"] = (
                        dynamic_metrics.get("collection_evidence_status")
                    )
                for key in (
                    "is_in_collection",
                    "series_name",
                    "season_id",
                ):
                    if existing_metrics.get(key) is None:
                        existing_metrics[key] = dynamic_metrics.get(key)
                existing["platform_metrics"] = existing_metrics
                continue
            if pinned_observed:
                dynamic_post["is_pinned"] = bool(
                    pinned_bvid is not None and post_id == pinned_bvid
                )
                dynamic_post["field_visibility"]["is_pinned"] = "visible"
            posts.append(dynamic_post)
            by_id[post_id] = dynamic_post
        return posts

    @staticmethod
    def _sort_posts(posts: list[dict]) -> None:
        posts.sort(
            key=lambda post: (
                post.get("published_at") is not None,
                post.get("published_at") or "",
            ),
            reverse=True,
        )

    # -- 视频列表 --
    def collect_post_list(
        self,
        url: str,
        limit: int = PUBLIC_LIMIT_DEFAULT,
        date_range=None,
        *,
        _complete_mode: bool = False,
    ) -> list:
        limit = (
            validate_public_all_max_items(limit)
            if _complete_mode
            else validate_public_limit(limit)
        )
        mid = _mid_from_url(url)
        s = self._new_session()
        s.ensure_buvid()
        self._collection_coverage = {
            "regular_observed_count": 0,
            "dynamic_status": "NOT_ATTEMPTED",
            "dynamic_observed_count": 0,
            "buvid_established": getattr(s, "_buvid_established", None),
        }

        # 常规列表优先，避免可选置顶端点先受限时丢失本可取得的投稿。
        pinned_observed, pinned_bvid = False, None

        # 两条高成功率常规列表路径：medialist → WBI arc/search。
        entries = None
        source = None

        # 首选：medialist/resource/list（免 wbi、返回完整 cnt_info、无 412 风控）
        try:
            entries = (
                s.discover_medialist(mid, limit, date_range=date_range)
                if date_range
                else s.discover_medialist(mid, limit)
            )
            source = "medialist"
        except BilibiliError as error:
            _set_diagnostic(error, DIAG_MEDIALIST_DISCOVERY)
            if _is_platform_protection(error):
                partial_entries = _deduplicate_discovery_entries(
                    error.partial_entries
                )
                self._collection_coverage.update({
                    "regular_source": "medialist",
                    "regular_observed_count": len(partial_entries),
                })
                error.partial_posts = self._normalize_discovery_entries(
                    partial_entries,
                    "medialist",
                    url,
                    pinned_observed,
                    pinned_bvid,
                )
                raise
            entries = None

        # 降级 A：arc/search（wbi + web_location=333.1387）
        if not entries:
            try:
                entries = (
                    s.discover_arc(mid, limit, date_range=date_range)
                    if date_range
                    else s.discover_arc(mid, limit)
                )
                source = "arc"
            except BilibiliError as error:
                _set_diagnostic(error, DIAG_ARC_DISCOVERY)
                if _is_platform_protection(error):
                    partial_entries = _deduplicate_discovery_entries(
                        error.partial_entries
                    )
                    self._collection_coverage.update({
                        "regular_source": "arc",
                        "regular_observed_count": len(partial_entries),
                    })
                    error.partial_posts = self._normalize_discovery_entries(
                        partial_entries,
                        "arc",
                        url,
                        pinned_observed,
                        pinned_bvid,
                    )
                    raise
                entries = None

        if not entries:
            raise BilibiliError(
                STOP_NO_PUBLIC_CONTENT,
                "常规投稿列表未返回可验证作品",
                diagnostic_code=DIAG_ARC_DISCOVERY,
            )

        entries = _deduplicate_discovery_entries(entries)
        self._collection_coverage.update({
            "regular_source": source,
            "regular_observed_count": len(entries),
        })
        discovery_coverage = getattr(s, "get_discovery_coverage", None)
        if callable(discovery_coverage):
            self._collection_coverage.update(discovery_coverage())

        # 置顶视频检测（top/arc）属于可选补充。平台保护仍立即停止，但须保留
        # 已经完成的常规列表证据，并把 is_pinned 保持为未知。
        try:
            pinned_result = s.collect_pinned(mid)
        except BilibiliError as error:
            _set_diagnostic(error, DIAG_PINNED_DISCOVERY)
            error.partial_posts = self._normalize_discovery_entries(
                entries,
                source,
                url,
                pinned_observed,
                pinned_bvid,
            )
            raise
        if (
            isinstance(pinned_result, tuple)
            and len(pinned_result) == 2
            and isinstance(pinned_result[0], bool)
        ):
            pinned_observed, pinned_bvid = pinned_result
        elif isinstance(pinned_result, str) and pinned_result.strip():
            # 旧 Session/测试双直接返回 BV 号，它仍是明确的置顶证据。
            pinned_observed, pinned_bvid = True, pinned_result.strip()

        posts = []
        any_view_ok = False
        for e in entries[:limit]:
            bvid = e.get("bvid") or e.get("bv_id") or str(e.get("aid") or "")
            if not bvid or bvid == "None":
                continue

            # 根据 entries 来源构建 base post
            if source == "medialist":
                base = _build_post_raw_from_medialist(e, url)
                # medialist 已含完整 cnt_info，通常无需 view 补全；
                # 但 hashtags 仅从 intro 提取，可选补 tag API
            elif "title" in e or "play" in e:
                base = _build_post_raw_from_vlist(e, url)
                # arc/search vlist 缺 like/coin/favorite/share，用 view 补全
                try:
                    v = s.get_json("/x/web-interface/view", {"bvid": bvid})
                    view_data = v.get("data") if isinstance(v, dict) else None
                    if v.get("code") == 0 and isinstance(view_data, dict):
                        base = _build_post_raw_from_view(view_data, url)
                        any_view_ok = True
                    elif v.get("code") == -404:
                        _mark_post_deleted(base)
                    else:
                        _mark_detail_unavailable(base)
                except BilibiliError as error:
                    _set_diagnostic(error, DIAG_VIEW_DETAIL)
                    if _is_platform_protection(error):
                        _mark_detail_unavailable(base)
                        _raise_with_partial_posts(
                            error, posts, self.normalize_post(base)
                        )
                    if error.stop_reason == STOP_ACCOUNT_UNAVAILABLE:
                        _mark_post_deleted(base)
                    else:
                        _mark_detail_unavailable(base)
                except Exception:
                    _mark_detail_unavailable(base)
            # 置顶标记
            if pinned_observed:
                base["is_pinned"] = bool(
                    pinned_bvid is not None and bvid == pinned_bvid
                )

            base["field_visibility"] = _post_field_visibility(base)

            posts.append(self.normalize_post(base))

        self._sort_posts(posts)

        if not posts:
            raise BilibiliError(
                STOP_NO_PUBLIC_CONTENT,
                f"两条常规列表路径均无可用投稿 (mid={mid})",
            )

        # 日期范围过滤（Best-effort）——记录过滤前的数量与匹配数，
        # 让 collection-report.md 准确披露"双约束（数量∩窗口）"行为。
        posts_before_range = list(posts)
        if date_range and posts:
            df, dt = date_range
            filtered = []
            for p in posts:
                pa = p.get("published_at")
                if df and pa and pa < df:
                    continue
                if dt and pa and pa > dt:
                    continue
                filtered.append(p)
            posts = filtered
        # 双约束披露：range_filter_applied 表明日期约束已参与；
        # range_match_count 是窗口内命中数；range_no_match 是窗口命中为零。
        # 与抖音 §范围双约束披露保持同一形状，便于 collection-report.md 渲染。
        self._collection_coverage["range_filter_applied"] = bool(date_range)
        self._collection_coverage["range_match_count"] = len(posts)
        self._collection_coverage["range_no_match"] = bool(
            date_range is not None
            and posts_before_range
            and not posts
        )

        # 仅对最终去重且会落盘的作品补标签，每个 BV 最多一次。动态或其他列表阶段
        # 一旦触发保护，函数已在上方停止，不会继续发起这些可选请求。
        posts = posts[:limit]
        for post in posts:
            if self._skip_optional_tags:
                _mark_tags_unavailable(post)
                continue
            if str(post.get("collection_status") or "").upper() == "DELETED":
                continue
            post_id = str(post.get("post_id") or "")
            if not post_id:
                continue
            try:
                api_tags = s.collect_tags(post_id)
            except BilibiliError as error:
                _set_diagnostic(error, DIAG_TAG_ENRICHMENT)
                if _is_platform_protection(error):
                    _mark_tags_unavailable(post)
                    error.partial_posts = list(posts)
                    raise
                api_tags = []
            except Exception:
                api_tags = []
            if not api_tags:
                continue
            base_tags = post.get("hashtags") or []
            if isinstance(base_tags, str):
                base_tags = [
                    tag
                    for tag in base_tags.replace("|", ",").split(",")
                    if tag.strip()
                ]
            merged = list(base_tags)
            for tag in api_tags:
                if tag and tag not in merged:
                    merged.append(tag)
            post["hashtags"] = merged
        return posts

    def collect_all_post_list(
        self,
        url: str,
        date_range=None,
        max_items: int = PUBLIC_ALL_DEFAULT_MAX_ITEMS,
        max_seconds: float = 1_800.0,
        max_scrolls: int = 2_000,
    ) -> list[dict]:
        """Collect Bilibili posts to a terminal page within bounded budgets.

        The time and scroll budgets share the cross-platform CLI contract but
        Bilibili pagination is request/cursor based. Optional per-video tag
        enrichment is skipped so a complete list does not create O(n) traffic.
        """
        max_items, max_seconds, max_scrolls = validate_public_all_budgets(
            max_items, max_seconds, max_scrolls
        )
        del max_seconds, max_scrolls
        self._skip_optional_tags = True
        try:
            observed_posts = self.collect_post_list(
                url,
                limit=max_items,
                date_range=None,
                _complete_mode=True,
            )
        finally:
            self._skip_optional_tags = False
        posts = [
            post
            for post in observed_posts
            if _date_matches(post.get("published_at"), date_range)
        ]
        terminal = self._collection_coverage.get("terminal_page_observed") is True
        self._collection_coverage.update({
            "requested_all": True,
            "max_items": max_items,
            "observed_post_count": len(observed_posts),
            "is_exhaustive": bool(terminal),
            "range_filter_applied": date_range is not None,
            "range_match_count": len(posts),
            "range_no_match": bool(
                date_range is not None and observed_posts and not posts
            ),
        })
        return posts

    # -- 单条详情 --
    def collect_post_detail(self, post_url: str) -> dict:
        canonical_url = canonical_item_url("bilibili", post_url)
        if canonical_url is None:
            raise BilibiliError(STOP_UNSUPPORTED, "无法解析公开 BV URL")
        bv = canonical_url.rsplit("/", 1)[-1]
        s = self._new_session()
        s.ensure_buvid()
        data = s.get_json("/x/web-interface/view", {"bvid": bv})
        if data.get("code") != 0:
            s.raise_for_task(
                _stop_reason_for_code(data.get("code")),
                f"view 失败: {data.get('message')}",
                data,
            )
        view_data = data.get("data")
        if not view_data:
            raise BilibiliError(STOP_PARSER_FAILED, "view 响应数据为空")
        return self.normalize_post(_build_post_raw_from_view(view_data, canonical_url))

    # -- 评论采集（best-effort，与任务共享 curl Session，免登录） --
    def collect_comments(self, post_url: str, limit: int = 20) -> list[dict]:
        """取公开评论；仅明确成功的空 replies 可返回空列表。"""
        canonical_url = canonical_item_url("bilibili", post_url)
        if canonical_url is None:
            raise BilibiliError(
                STOP_COMMENTS_UNAVAILABLE, "公开评论采样不可用"
            )
        bvid = canonical_url.rsplit("/", 1)[-1]
        session = self._new_session()
        try:
            session._raise_if_blocked()
            session.ensure_buvid()
            view = session.get_json(
                "/x/web-interface/view",
                {"bvid": bvid},
                retry=2,
            )
            view_data = view.get("data")
            aid = view_data.get("aid") if isinstance(view_data, dict) else None
            if isinstance(aid, bool) or not isinstance(aid, int) or aid <= 0:
                raise BilibiliError(
                    STOP_COMMENTS_UNAVAILABLE, "公开评论采样不可用"
                )
            data = session.get_json(
                "/x/v2/reply",
                {"type": 1, "oid": aid, "mode": 3, "next": 0},
                referer=canonical_url,
                retry=2,
            )
            if not isinstance(data, dict) or data.get("code") != 0:
                if isinstance(data, dict) and data.get("code") is not None:
                    session.raise_for_task(
                        _stop_reason_for_code(data.get("code")),
                        "公开评论请求被平台拒绝",
                    )
                raise BilibiliError(
                    STOP_COMMENTS_UNAVAILABLE, "公开评论采样不可用"
                )
            payload = data.get("data")
            if not isinstance(payload, dict) or "replies" not in payload:
                raise BilibiliError(
                    STOP_COMMENTS_UNAVAILABLE, "公开评论采样不可用"
                )
            replies = payload.get("replies")
            if not isinstance(replies, list):
                raise BilibiliError(
                    STOP_COMMENTS_UNAVAILABLE, "公开评论采样不可用"
                )
            out: list[dict] = []
            for r in replies[:limit]:
                member = r.get("member") or {}
                content = r.get("content") or {}
                out.append(
                    {
                        "comment_id": r.get("rpid"),
                        "post_id": bvid,
                        "author": member.get("uname"),
                        "text": content.get("message"),
                        "likes": r.get("like"),
                        "published_at": _to_iso(r.get("ctime")),
                        "collected_at": _now_iso(),
                    }
                )
            return out
        except BilibiliError as error:
            if _is_platform_protection(error):
                raise
            raise BilibiliError(
                STOP_COMMENTS_UNAVAILABLE, "公开评论采样不可用"
            ) from None
        except Exception:
            raise BilibiliError(
                STOP_COMMENTS_UNAVAILABLE, "公开评论采样不可用"
            ) from None

    # -- 空间动态视频 feed（best-effort，合规同主路径） --
    def collect_dynamics(self, url: str, limit: int = 30) -> list[dict]:
        """采集空间动态中的视频类动态（content_type=dynamic）。

        走与主路径相同的 curl+wbi Session；动态 feed 端点为
        x/polymer/web-dynamic/v1/feed/space（web_location=333.1007，见 discover_dynamics）。
        平台保护响应立即停止；普通空结果由上层按真实覆盖情况判定，绝不伪装成功。
        """
        mid = _mid_from_url(url)
        s = self._new_session()
        s.ensure_buvid()
        try:
            cards = s.discover_dynamics(mid, limit)
        except BilibiliError as e:
            raise e
        return [self.normalize_post(_build_dynamic_raw(c)) for c in cards]

# --------------------------------------------------------------------------
# 内部构建（统一字段名，供 base.normalize_* 使用）
# --------------------------------------------------------------------------
def _build_profile_raw(mid, card, stat, acc) -> dict:
    card_d = (card.get("data") or {}).get("card") or {}
    stat_d = (stat or {}).get("data") or {}
    acc_d = acc or {}
    official = card_d.get("official") or card_d.get("official_verify") or {}
    official_type = official.get("type") if isinstance(official, dict) else None
    if isinstance(official_type, bool) or not isinstance(official_type, int):
        verified = None
    elif official_type in (-1, 127):
        verified = False
    else:
        verified = official_type >= 0
    name = card_d.get("name") or acc_d.get("name")
    bio = card_d.get("sign") or acc_d.get("sign")
    # 等级：优先 acc/info 顶层 level（card.level_info 在 acc 响应中不存在，仅作兜底）
    level = acc_d.get("level")
    if level is None:
        level = (card_d.get("level_info") or {}).get("current_level")
    # 关注数：relation/stat 权威；缺失时用 card.fans 兜底（二者均为公开值）
    followers = stat_d.get("follower")
    if followers is None:
        followers = card_d.get("fans")
    # 投稿数：优先 acc/info，其次 card
    post_count = acc_d.get("archive_count")
    if post_count is None:
        post_count = card_d.get("archive_count")
    return {
        "platform": "bilibili",
        "account_id": str(mid),
        "account_name": name,
        "profile_url": f"https://space.bilibili.com/{mid}",
        "bio": bio or None,
        "verified": verified,
        "followers": followers,
        "post_count": post_count,
        "level": level,
        # B站账号层 platform_metrics 应为 {}（获赞总量非统一字段，不进入 Profile）
        "platform_metrics": {},
        "collected_at": _now_iso(),
        "field_visibility": {
            "account_name": "visible" if name is not None else "hidden",
            "bio": "visible" if bio else "hidden",
            "verified": "visible" if verified is not None else "hidden",
            "followers": "visible" if followers is not None else "hidden",
            "post_count": "visible" if post_count is not None else "hidden",
            "level": "visible" if level is not None else "hidden",
        },
    }


def _copyright_repost(value: Any) -> bool | None:
    """仅当 B 站返回明确 copyright 枚举时标记原创/转载。"""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        copyright_value = value
    elif isinstance(value, str):
        canonical = value.strip()
        if canonical not in {"1", "2"}:
            return None
        copyright_value = int(canonical)
    else:
        return None
    if copyright_value == 1:
        return False
    if copyright_value == 2:
        return True
    return None


def _normalize_typeid(value: Any) -> int | None:
    """Canonicalize public numeric partition IDs without coercing booleans."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _partition_evidence(
    typeid: Any,
    api_name: Any = None,
) -> tuple[int | None, str | None, str | None, bool | None]:
    """Resolve partition from the audited map, then an explicit API name."""
    canonical_typeid = _normalize_typeid(typeid)
    if canonical_typeid in TYPENAME_MAP:
        return (
            canonical_typeid,
            TYPENAME_MAP[canonical_typeid],
            "reference",
            True,
        )
    canonical_name = (
        api_name.strip()
        if isinstance(api_name, str) and api_name.strip()
        else None
    )
    if canonical_name is not None:
        return canonical_typeid, canonical_name, "api", None
    return canonical_typeid, None, None, None


_POST_VISIBILITY_FIELDS = (
    "published_at",
    "content_type",
    "title",
    "text",
    "duration_seconds",
    "hashtags",
    "is_pinned",
    "is_repost",
    "is_promoted",
    "views",
    "likes",
    "comments",
    "favorites",
    "shares",
    "coins",
    "danmaku",
)


def _post_field_visibility(post: dict) -> dict[str, str]:
    """Describe visibility from the raw public response, preserving zeroes."""
    return {
        field: "visible" if post.get(field) is not None else "hidden"
        for field in _POST_VISIBILITY_FIELDS
    }


def _build_post_raw_from_medialist(p: dict, url: str) -> dict:
    """medialist/resource/list 条目 → 统一原始字典。

    medialist 端点返回完整 cnt_info（play/thumb_up/coin/collect/reply/danmaku/share），
    无需逐条 view 补全。字段映射（T6 实测）：
      bv_id → bvid, pubtime → published_at, duration(秒),
      tid → typeid, copy_right: 1=原创/2=转载,
      cnt_info.{play,thumb_up,coin,collect,reply,danmaku,share}
      upper.{mid,name} → owner 信息
    """
    bvid = p.get("bv_id") or p.get("bvid")
    if not bvid:
        return _empty_post("")
    cnt = p.get("cnt_info") or {}
    copyright = p.get("copy_right")
    tid, partition, partition_source, partition_needs_verification = (
        _partition_evidence(
            p.get("tid"),
            p.get("tname") or p.get("typename"),
        )
    )
    upper = p.get("upper") or {}
    intro = p.get("intro") or ""
    # 合并 tag API 与文本提取的 hashtags（tag API 更权威，在 collect_post_list 中补充）
    hashtags = _extract_hashtags(p.get("title"), intro)
    raw = {
        "platform": "bilibili",
        "post_id": bvid,
        "post_url": f"{VIDEO}{bvid}",
        "published_at": _to_iso(p.get("pubtime")),
        "content_type": "video",
        "title": p.get("title"),
        "text": intro or None,
        "duration_seconds": _parse_duration(p.get("duration")),
        "hashtags": hashtags,
        "is_pinned": None,  # 由 collect_post_list 根据明确 top/arc 结果回填
        "is_repost": _copyright_repost(copyright),
        "is_promoted": None,
        "views": _int(cnt.get("play")),
        "likes": _int(cnt.get("thumb_up")),
        "comments": _int(cnt.get("reply")),
        "favorites": _int(cnt.get("collect")),
        "shares": _int(cnt.get("share")),
        "coins": _int(cnt.get("coin")),
        "danmaku": _int(cnt.get("danmaku")),
        "collection_status": "ok",
        "collected_at": _now_iso(),
        "source_url": f"{VIDEO}{bvid}",
        "platform_metrics": {
            "typeid": tid,
            "partition": partition,
            "partition_source": partition_source,
            "partition_needs_verification": partition_needs_verification,
            "owner_mid": upper.get("mid"),
            "owner_name": upper.get("name"),
            "collection_evidence_status": "UNAVAILABLE",
            "is_in_collection": None,
            "series_name": None,
            "season_id": None,
        },
    }
    raw["field_visibility"] = _post_field_visibility(raw)
    return raw


def _build_post_raw_from_vlist(p: dict, url: str) -> dict:
    """arc/search vlist 条目 → 统一原始字典。

    注意：vlist **不含** like/favorites/coin/share，仅含 play/comment/
    video_review。这些缺失字段保持 None（honest null），由 view 补全。
    """
    bvid = p.get("bvid") or str(p.get("aid"))
    copyright = p.get("copyright")
    tid, partition, partition_source, partition_needs_verification = (
        _partition_evidence(
            p.get("typeid"),
            p.get("typename") or p.get("tname"),
        )
    )
    comment_count = p.get("comment")
    if comment_count is None:
        comment_count = p.get("reply")
    raw = {
        "platform": "bilibili",
        "post_id": bvid,
        "post_url": f"{VIDEO}{bvid}",
        "published_at": _to_iso(p.get("created") or p.get("pubdate")),
        "content_type": "video",
        "title": p.get("title"),
        "text": p.get("description") or p.get("desc"),
        "duration_seconds": _parse_duration(p.get("length") or p.get("duration")),
        "hashtags": _extract_hashtags(p.get("title"), p.get("description") or p.get("desc")),
        "is_pinned": None,
        "is_repost": _copyright_repost(copyright),
        "is_promoted": None,
        "views": _int(p.get("play")),
        "likes": None,
        "comments": _int(comment_count),
        "favorites": None,
        "shares": None,
        "coins": None,
        "danmaku": _int(p.get("video_review")),
        "collection_status": "ok",
        "collected_at": _now_iso(),
        "source_url": f"{VIDEO}{bvid}",
        "platform_metrics": {
            "typeid": tid,
            "typename": p.get("typename"),
            "partition": partition,
            "partition_source": partition_source,
            "partition_needs_verification": partition_needs_verification,
            "collection_evidence_status": "UNAVAILABLE",
            "is_in_collection": None,
            "series_name": None,
            "season_id": None,
        },
    }
    raw["field_visibility"] = _post_field_visibility(raw)
    return raw


def _build_post_raw_from_view(d: dict, url: str) -> dict:
    """web-interface/view 完整响应 → 统一原始字典（含完整 stat）。"""
    bvid = d.get("bvid") or str(d.get("aid"))
    stat = d.get("stat") or {}
    owner = d.get("owner") or {}
    copyright = d.get("copyright")
    tid, partition, partition_source, partition_needs_verification = (
        _partition_evidence(d.get("tid"), d.get("tname") or d.get("tname_v2"))
    )
    season = d.get("ugc_season") or {}
    series_name = season.get("title") if isinstance(season, dict) else None
    season_id = season.get("id") if isinstance(season, dict) else None
    expected_metrics = {
        "view": "views",
        "like": "likes",
        "reply": "comments",
        "favorite": "favorites",
        "share": "shares",
        "coin": "coins",
        "danmaku": "danmaku",
    }
    missing_detail_metrics = [
        field
        for api_key, field in expected_metrics.items()
        if stat.get(api_key) is None
    ]
    raw = {
        "platform": "bilibili",
        "post_id": bvid,
        "post_url": f"{VIDEO}{bvid}",
        "published_at": _to_iso(d.get("pubdate") or d.get("ctime")),
        "content_type": "video",
        "title": d.get("title"),
        "text": d.get("desc"),
        "duration_seconds": _parse_duration(d.get("duration")),
        "hashtags": _extract_hashtags(d.get("title"), d.get("desc")),
        "is_pinned": None,
        "is_repost": _copyright_repost(copyright),
        "is_promoted": None,
        "views": _int(stat.get("view")),
        "likes": _int(stat.get("like")),
        "comments": _int(stat.get("reply")),
        "favorites": _int(stat.get("favorite")),
        "shares": _int(stat.get("share")),
        "coins": _int(stat.get("coin")),
        "danmaku": _int(stat.get("danmaku")),
        "collection_status": (
            "PARTIAL" if missing_detail_metrics else "ok"
        ),
        "collected_at": _now_iso(),
        "source_url": f"{VIDEO}{bvid}",
        "platform_metrics": {
            "typeid": tid,
            "partition": partition,
            # 来源标注：静态映射=reference（待官方表核对）；否则回退 API tname=api
            "partition_source": partition_source,
            "partition_needs_verification": partition_needs_verification,
            "owner_mid": owner.get("mid"),
            "owner_name": owner.get("name"),
            "collection_evidence_status": (
                "OBSERVED"
                if series_name is not None or season_id is not None
                else "NOT_OBSERVED"
            ),
            "is_in_collection": (
                True
                if series_name is not None or season_id is not None
                else None
            ),
            "series_name": series_name,
            "season_id": season_id,
            "detail_status": (
                "INCOMPLETE" if missing_detail_metrics else "COMPLETE"
            ),
            "missing_detail_metrics": missing_detail_metrics,
        },
    }
    raw["field_visibility"] = _post_field_visibility(raw)
    return raw


def _empty_post(bvid: str) -> dict:
    raw = {
        "platform": "bilibili",
        "post_id": bvid,
        "post_url": f"{VIDEO}{bvid}",
        "content_type": "video",
        "hashtags": [],
        "is_pinned": None,
        "is_repost": None,
        "is_promoted": None,
        "collection_status": "PARTIAL",
        "collected_at": _now_iso(),
        "source_url": f"{VIDEO}{bvid}",
        "platform_metrics": {
            "collection_evidence_status": "UNAVAILABLE",
            "is_in_collection": None,
            "series_name": None,
            "season_id": None,
        },
    }
    raw["field_visibility"] = _post_field_visibility(raw)
    return raw


def _extract_dynamic_card(it: dict) -> dict | None:
    """从动态 feed item 提取视频类动态卡片；非视频类（无 bvid）返回 None。

    字段路径（来自隔离浏览器工作流 bili_fill2.py 实跑验证）：
      modules.module_author.pub_ts / pub_time
      modules.module_dynamic.major.archive(.bvid/title/stat) 或 major.ugc_season.archive
      modules.module_dynamic.desc.text
      modules.module_stat.{like,comment,forward}.count
      it.orig 非空 → 转发卡
    """
    mods = it.get("modules") or {}
    author = mods.get("module_author") or {}
    md = mods.get("module_dynamic") or {}
    major = md.get("major") or {}
    season = major.get("ugc_season") or {}
    arch = major.get("archive") or (
        season.get("archive") if isinstance(season, dict) else None
    ) or {}
    bv = arch.get("bvid")
    if not bv:
        return None
    desc = (md.get("desc") or {}).get("text")
    ms = mods.get("module_stat") or {}
    astat = arch.get("stat") or {}
    pts = author.get("pub_ts")
    try:
        pts = int(pts) if pts is not None else None
    except (TypeError, ValueError):
        pts = None
    return {
        "bvid": bv,
        "title": arch.get("title"),
        "desc": desc,
        "duration": arch.get("duration"),
        "series_name": (
            season.get("title") if isinstance(season, dict) else None
        ),
        "season_id": (
            season.get("id") if isinstance(season, dict) else None
        ),
        "pub_ts": pts,
        "pub_time": author.get("pub_time"),
        "is_forward": None if (orig := it.get("orig")) is None else bool(orig),
        "stat": {
            "play": astat.get("play"),
            "danmaku": astat.get("danmaku"),
            "like": (ms.get("like") or {}).get("count"),
            "comment": (ms.get("comment") or {}).get("count"),
            "forward": (ms.get("forward") or {}).get("count"),
        },
    }


def _build_dynamic_raw(card: dict) -> dict:
    """动态卡片 → 统一原始字典（content_type=dynamic）。"""
    bv = card.get("bvid")
    st = card.get("stat") or {}
    metric_values = {
        "views": _int(st.get("play")),
        "likes": _int(st.get("like")),
        "comments": _int(st.get("comment")),
        "favorites": None,
        "shares": _int(st.get("forward")),
        "coins": None,
        "danmaku": _int(st.get("danmaku")),
    }
    missing_detail_metrics = [
        field for field, value in metric_values.items() if value is None
    ]
    has_collection_evidence = bool(
        card.get("series_name") is not None
        or card.get("season_id") is not None
    )
    raw = {
        "platform": "bilibili",
        "post_id": bv,
        "post_url": f"{VIDEO}{bv}",
        "published_at": _to_iso(card.get("pub_ts")),
        "content_type": "dynamic",
        "title": card.get("title"),
        "text": card.get("desc"),
        "duration_seconds": _parse_duration(card.get("duration")),
        "hashtags": _extract_hashtags(card.get("title"), card.get("desc")),
        "is_pinned": None,
        "is_repost": card.get("is_forward"),
        "is_promoted": None,
        **metric_values,
        "collection_status": (
            "PARTIAL" if missing_detail_metrics else "ok"
        ),
        "collected_at": _now_iso(),
        "source_url": f"{VIDEO}{bv}",
        "platform_metrics": {
            "appeared_in_dynamic_feed": True,
            "collection_evidence_status": (
                "OBSERVED" if has_collection_evidence else "NOT_OBSERVED"
            ),
            "is_in_collection": (
                True if has_collection_evidence else None
            ),
            "series_name": card.get("series_name"),
            "season_id": card.get("season_id"),
            "detail_status": (
                "INCOMPLETE" if missing_detail_metrics else "COMPLETE"
            ),
            "missing_detail_metrics": missing_detail_metrics,
            "dynamic": {
                "is_dynamic": True,
                "pub_ts": card.get("pub_ts"),
                "play": _int(st.get("play")),
                "danmaku": _int(st.get("danmaku")),
                "like": _int(st.get("like")),
                "comment": _int(st.get("comment")),
                "forward": _int(st.get("forward")),
            },
        },
    }
    raw["field_visibility"] = _post_field_visibility(raw)
    return raw
