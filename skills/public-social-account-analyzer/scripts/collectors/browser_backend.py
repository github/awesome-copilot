"""通用 headless 浏览器 fetch 后端（可选降级用）。

设计目标（面向「通用 Skill」，绝非本机专属 hack）：
- **跨平台**：自动探测 macOS / Linux / Windows 上的 Chrome / Chromium / Edge / Brave；
  支持 `BROWSER_BIN` / `CHROME_BIN` 环境变量覆盖；找不到浏览器时优雅报错，不硬编码任何路径。
- **零第三方依赖**：自带标准库 WebSocket 客户端（socket + struct + base64 + hashlib 实现
  握手与帧掩码），不要求安装 `websocket-client` 等包，便于分发给任意 Python 环境。
- **合规降级**：仅作为「部署环境的出口 IP 被平台 WAF 封禁」时的**传输层**替代——请求改由
  运行环境的真实网络出口（浏览器进程）发出。绝不用于绕过验证码 / 滑块 / 登录墙 / 访问频控。
- **安全清理**：作为上下文管理器使用，退出时终止浏览器进程并删除临时 user-data 目录。

用法（由采集适配器在 HTTP 主路径失败后调用）：
    with BrowserSession() as b:
        b.set_cookies({"buvid3": "..."}, domain=".bilibili.com")
        body = b.fetch_text("https://api.bilibili.com/...", headers={"Referer": "..."})
"""
from __future__ import annotations

import base64
import glob
import importlib.util
import json
import os
import shutil
import socket
import struct
import subprocess
import tempfile
import time
from collections import deque
from typing import Any, Dict, Optional


# --------------------------------------------------------------------------
# 浏览器二进制自动探测（跨平台）
# --------------------------------------------------------------------------
_CANDIDATES: Dict[str, list] = {
    "darwin": [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ],
    "linux": [
        "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
        "chrome", "microsoft-edge", "brave-browser", "google-chrome-beta",
        "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
        "/usr/bin/microsoft-edge", "/snap/bin/chromium",
    ],
    "windows": [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
    ],
}


def _platform_key() -> str:
    sysname = getattr(os, "uname", lambda: None)()
    if sysname is not None:
        s = sysname.sysname if hasattr(sysname, "sysname") else str(sysname)
    else:
        s = os.name
    s = str(s).lower()
    if s.startswith("darwin") or s == "macos":
        return "darwin"
    if "win" in s:
        return "windows"
    return "linux"


_PLAYWRIGHT_EXECUTABLE_PATTERNS: Dict[str, tuple[str, ...]] = {
    "darwin": (
        "chromium-*/chrome-mac*/Chromium.app/Contents/MacOS/Chromium",
        "chromium_headless_shell-*/chrome-headless-shell-mac*/chrome-headless-shell",
    ),
    "linux": (
        "chromium-*/chrome-linux*/chrome",
        "chromium_headless_shell-*/chrome-headless-shell-linux*/chrome-headless-shell",
    ),
    "windows": (
        "chromium-*/chrome-win*/chrome.exe",
        "chromium_headless_shell-*/chrome-headless-shell-win*/chrome-headless-shell.exe",
    ),
}


def _playwright_browser_roots(platform: str) -> list[str]:
    """Return bounded cache roots without starting Playwright or installing tools."""
    configured = os.environ.get("PLAYWRIGHT_BROWSERS_PATH")
    if configured and configured != "0":
        return [os.path.abspath(os.path.expanduser(configured))]

    roots: list[str] = []
    if platform == "darwin":
        roots.append(os.path.expanduser("~/Library/Caches/ms-playwright"))
    elif platform == "windows":
        local_app_data = os.environ.get("LOCALAPPDATA")
        if local_app_data:
            roots.append(os.path.join(local_app_data, "ms-playwright"))
    else:
        roots.append(os.path.expanduser("~/.cache/ms-playwright"))

    if configured == "0":
        try:
            spec = importlib.util.find_spec("playwright")
        except (ImportError, ValueError):
            spec = None
        if spec is not None and spec.origin:
            package_dir = os.path.dirname(os.path.abspath(spec.origin))
            roots.append(
                os.path.join(package_dir, "driver", "package", ".local-browsers")
            )
    return roots


def _find_playwright_browsers(platform: str) -> list[str]:
    """Find every already-provisioned Playwright Chromium executable."""
    found: list[str] = []
    patterns = _PLAYWRIGHT_EXECUTABLE_PATTERNS.get(platform, ())
    for root in _playwright_browser_roots(platform):
        for pattern in patterns:
            for candidate in sorted(
                glob.glob(os.path.join(root, pattern)), reverse=True
            ):
                if not os.path.isfile(candidate):
                    continue
                if platform != "windows" and not os.access(candidate, os.X_OK):
                    continue
                if candidate not in found:
                    found.append(candidate)
    return found


def find_browsers(explicit: Optional[str] = None) -> list[str]:
    """Return usable browser candidates in stable preference order.

    An explicit constructor argument or environment override is authoritative.
    Automatic discovery returns every system candidate followed by every
    already-provisioned Playwright candidate so startup can fail over without
    installing software or touching a user's browser profile.
    """
    if explicit:
        return [explicit]
    env = os.environ.get("BROWSER_BIN") or os.environ.get("CHROME_BIN")
    if env:
        return [env]
    platform = _platform_key()
    found: list[str] = []
    for candidate in _CANDIDATES.get(platform, []):
        resolved = None
        if "/" in candidate or "\\" in candidate:
            if os.path.exists(candidate):
                resolved = candidate
        else:
            resolved = shutil.which(candidate)
        if resolved and resolved not in found:
            found.append(resolved)
    for candidate in _find_playwright_browsers(platform):
        if candidate not in found:
            found.append(candidate)
    return found


def find_browser(explicit: Optional[str] = None) -> Optional[str]:
    """探测可用的浏览器二进制路径。

    - 优先使用 explicit 显式路径；
    - 其次读取 BROWSER_BIN / CHROME_BIN 环境变量；
    - 再按当前平台候选列表（绝对路径用 os.path.exists，命令名用 shutil.which）探测；
    - 最后复用已安装的 Playwright Chromium 缓存，不启动 Playwright、不安装浏览器。
    全部失败返回 None（由调用方决定如何上报，不在此处静默兜底到本机特定路径）。
    """
    candidates = find_browsers(explicit)
    return candidates[0] if candidates else None


def _free_port() -> int:
    """向 OS 借一个当前空闲的 TCP 端口（存在极小竞态，部署场景可接受）。"""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]
    finally:
        s.close()


# --------------------------------------------------------------------------
# 极简标准库 WebSocket 客户端（仅满足 CDP 文本帧需求）
# --------------------------------------------------------------------------
class _WSClient:
    """无第三方依赖的 WebSocket 客户端，足够驱动 CDP（文本帧 + ping/pong + close）。"""

    def __init__(self, url: str, timeout: float = 15.0):
        self._url = url
        self._timeout = timeout
        self._sock: Optional[socket.socket] = None
        self._buf = bytearray()
        self._closed = False

    # -- 握手 --
    def connect(self) -> None:
        import urllib.parse as up

        p = up.urlparse(self._url)
        host = p.hostname or "127.0.0.1"
        port = p.port or (443 if p.scheme == "wss" else 80)
        path = p.path or "/"
        if p.query:
            path += "?" + p.query
        raw = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        raw.settimeout(self._timeout)
        raw.connect((host, port))
        # 关键：CDP 握手**不**带 Origin 头（带 Origin 会被部分实现拒绝）
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        req = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n"
            f"\r\n"
        )
        raw.sendall(req.encode("ascii"))
        # 读取响应头直到 \r\n\r\n
        header = b""
        while b"\r\n\r\n" not in header:
            chunk = raw.recv(4096)
            if not chunk:
                raise RuntimeError("WebSocket 握手未收到响应")
            header += chunk
            if len(header) > 65536:
                raise RuntimeError("WebSocket 握手响应过长")
        status_line = header.split(b"\r\n", 1)[0].decode("ascii", "replace")
        if "101" not in status_line:
            raise RuntimeError(f"WebSocket 握手失败: {status_line}")
        self._sock = raw

    def set_timeout(self, timeout: float) -> None:
        self._timeout = timeout
        if self._sock is not None:
            self._sock.settimeout(timeout)

    # -- 帧收发 --
    def _read_exact(self, n: int) -> bytes:
        assert self._sock is not None
        while len(self._buf) < n:
            chunk = self._sock.recv(4096)
            if not chunk:
                raise RuntimeError("WebSocket 连接在读帧时断开")
            self._buf += chunk
        out = bytes(self._buf[:n])
        del self._buf[:n]
        return out

    def _send_frame(self, payload: bytes, opcode: int = 0x1) -> None:
        assert self._sock is not None
        mask = os.urandom(4)
        length = len(payload)
        header = bytearray()
        header.append(0x80 | opcode)  # FIN + opcode（文本=1）
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header += length.to_bytes(2, "big")
        else:
            header.append(0x80 | 127)
            header += length.to_bytes(8, "big")
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self._sock.sendall(bytes(header) + mask + masked)

    def _read_frame(self) -> tuple:
        assert self._sock is not None
        b0, b1 = self._read_exact(2)
        fin = bool(b0 & 0x80)
        opcode = b0 & 0x0F
        masked = bool(b1 & 0x80)
        length = b1 & 0x7F
        if length == 126:
            (length,) = struct.unpack(">H", self._read_exact(2))
        elif length == 127:
            (length,) = struct.unpack(">Q", self._read_exact(8))
        payload = self._read_exact(length)
        if masked:
            _ = self._read_exact(4)  # 服务端不应掩码，忽略以防万一
        return fin, opcode, payload

    def send_text(self, text: str) -> None:
        self._send_frame(text.encode("utf-8"), opcode=0x1)

    def recv_message(self) -> Optional[dict]:
        """读取一个完整文本消息（处理分片 / ping / pong / close）。返回解析后的 dict 或 None。"""
        assert self._sock is not None
        fragments: list = []
        frag_op = 0
        while True:
            fin, opcode, payload = self._read_frame()
            if opcode == 0x8:  # close
                self._closed = True
                return None
            if opcode == 0x9:  # ping -> pong
                self._send_frame(payload, opcode=0xA)
                continue
            if opcode == 0xA:  # pong
                continue
            if opcode == 0x0:  # 续帧
                fragments.append(payload)
                if fin:
                    data = b"".join(fragments)
                    return json.loads(data.decode("utf-8"))
                continue
            # 0x1 文本 / 0x2 二进制
            if not fin:
                frag_op = opcode
                fragments.append(payload)
                continue
            data = payload
            try:
                return json.loads(data.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                return None

    def close(self) -> None:
        if self._sock is None:
            return
        try:
            self._send_frame(b"", opcode=0x8)
        except OSError:
            pass
        try:
            self._sock.close()
        except OSError:
            pass
        self._sock = None


_CLEANUP_DIAGNOSTIC_CODES = frozenset({
    "WEBSOCKET_CLOSE_FAILED",
    "PROCESS_KILL_FAILED",
    "PROCESS_REAP_FAILED",
    "PROFILE_REMOVE_FAILED",
})


def _sanitize_cleanup_diagnostics(values: Any) -> tuple[str, ...]:
    """Keep only fixed lifecycle codes; never carry paths or external text."""
    if not isinstance(values, (list, tuple, set, frozenset)):
        return ()
    safe: list[str] = []
    for code in values:
        if (
            isinstance(code, str)
            and code in _CLEANUP_DIAGNOSTIC_CODES
            and code not in safe
        ):
            safe.append(code)
    return tuple(safe)


class BrowserError(Exception):
    """浏览器后端自身的错误（区别于平台返回的业务码）。"""

    def __init__(
        self,
        message: str,
        *,
        diagnostic_code: Optional[str] = None,
        cleanup_diagnostics: tuple[str, ...] = (),
        is_cleanup_failure: bool = False,
    ):
        super().__init__(message)
        self.diagnostic_code = diagnostic_code
        self.cleanup_diagnostics = _sanitize_cleanup_diagnostics(
            cleanup_diagnostics
        )
        self.is_cleanup_failure = is_cleanup_failure


# --------------------------------------------------------------------------
# 浏览器会话（启动 / fetch / 清理）
# --------------------------------------------------------------------------
class BrowserSession:
    """启动一个 headless 浏览器并通过 CDP 发起 fetch。

    典型用法：
        with BrowserSession(browser_bin=find_browser()) as b:
            b.set_cookies({"buvid3": "xxx"}, domain=".bilibili.com")
            body = b.fetch_text(url, headers={"Referer": "..."})
    """

    def __init__(
        self,
        browser_bin: Optional[str] = None,
        port: Optional[int] = None,
        headless: bool = True,
        startup_timeout: float = 20.0,
    ):
        self.browser_bin = browser_bin
        self.port = port or _free_port()
        self.headless = headless
        self._user_data_dir: Optional[str] = None
        self._proc: Optional[subprocess.Popen] = None
        self._ws: Optional[_WSClient] = None
        self._ws_url: Optional[str] = None
        self._cmd_id = 0
        self._events: deque = deque()
        self._startup_timeout = startup_timeout
        self._cleanup_diagnostics: list[str] = []
        self.selected_browser_bin: Optional[str] = None

    # -- 生命周期 --
    def start(self) -> "BrowserSession":
        if self._proc is not None:
            return self
        candidates = find_browsers(self.browser_bin)
        if not candidates:
            raise BrowserError(
                "未找到可用的浏览器二进制；请安装 Chrome/Chromium/Edge，"
                "或通过 BROWSER_BIN 环境变量指定路径。",
                diagnostic_code="BROWSER_UNAVAILABLE",
            )
        original_timeout = self._startup_timeout
        deadline = time.monotonic() + original_timeout
        last_error: Optional[Exception] = None
        for index, bin_path in enumerate(candidates):
            if not os.path.exists(bin_path):
                last_error = BrowserError(
                    "未找到可用的浏览器二进制；请安装 Chrome/Chromium/Edge，"
                    "或通过 BROWSER_BIN 环境变量指定路径。",
                    diagnostic_code="BROWSER_UNAVAILABLE",
                )
                if self.browser_bin is not None or len(candidates) == 1:
                    raise last_error
                continue
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            remaining_candidates = len(candidates) - index
            self._startup_timeout = max(0.1, remaining / remaining_candidates)
            self.selected_browser_bin = bin_path
            if self._user_data_dir is None:
                self._user_data_dir = tempfile.mkdtemp(prefix="psaa-cdp-")
            args = [
                bin_path,
                f"--remote-debugging-port={self.port}",
                "--no-proxy-server",  # 关键：强制走本机/运行环境的真实网络出口，而非沙箱代理
                "--disable-gpu",
                "--disable-dev-shm-usage",
                f"--user-data-dir={self._user_data_dir}",
            ]
            if self.headless:
                args.append("--headless=new")
            try:
                self._proc = subprocess.Popen(
                    args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
                self._wait_for_devtools()
                self._connect()
            except Exception as exc:
                last_error = exc
                try:
                    self.close()
                except Exception:
                    pass
                self._ws_url = None
                self._events.clear()
                if self.browser_bin is not None or len(candidates) == 1:
                    self._startup_timeout = original_timeout
                    if isinstance(exc, OSError):
                        raise BrowserError(
                            f"启动浏览器失败: {exc}",
                            diagnostic_code="BROWSER_TRANSPORT_FAILED",
                        ) from exc
                    raise
                continue
            self._startup_timeout = original_timeout
            return self
        self._startup_timeout = original_timeout
        if isinstance(last_error, BrowserError):
            raise BrowserError(
                "所有已发现的浏览器候选均启动失败",
                diagnostic_code=(
                    last_error.diagnostic_code or "BROWSER_TRANSPORT_FAILED"
                ),
            ) from last_error
        raise BrowserError(
            "所有已发现的浏览器候选均启动失败",
            diagnostic_code="BROWSER_TRANSPORT_FAILED",
        ) from last_error

    def _wait_for_devtools(self) -> None:
        import urllib.request

        base = f"http://127.0.0.1:{self.port}"
        deadline = time.time() + self._startup_timeout
        last_err = None
        ws_url = None
        while time.time() < deadline:
            if self._proc and self._proc.poll() is not None:
                raise BrowserError("浏览器进程启动后随即退出")
            try:
                # /json/version 的 webSocketDebuggerUrl 是「浏览器级」WS，不支持 Runtime 域；
                # 必须连到具体的 page target（/json/list 取，没有则用 /json/new 创建一个）。
                with urllib.request.urlopen(f"{base}/json/list", timeout=2) as r:
                    targets = json.loads(r.read().decode("utf-8"))
                page = next(
                    (t for t in targets if t.get("type") == "page" and t.get("webSocketDebuggerUrl")),
                    None,
                )
                if page:
                    ws_url = page["webSocketDebuggerUrl"]
                    break
                create_target = urllib.request.Request(
                    f"{base}/json/new?about:blank", method="PUT"
                )
                with urllib.request.urlopen(create_target, timeout=2) as r:
                    new_t = json.loads(r.read().decode("utf-8"))
                if new_t.get("webSocketDebuggerUrl"):
                    ws_url = new_t["webSocketDebuggerUrl"]
                    break
            except Exception as e:  # noqa: BLE001 - 轮询期间多种异常均可重试
                last_err = e
                time.sleep(0.4)
        if not ws_url:
            raise BrowserError(f"等待浏览器 DevTools 可用 target 超时: {last_err}")
        self._ws_url = ws_url

    def _connect(self) -> None:
        assert self._ws_url is not None
        self._ws = _WSClient(self._ws_url, timeout=self._startup_timeout)
        self._ws.connect()
        self._send_cdp("Runtime.enable", {})
        self._send_cdp("Network.enable", {})
        self._send_cdp("Page.enable", {})

    def _send_cdp(
        self,
        method: str,
        params: dict,
        timeout: Optional[float] = None,
    ) -> dict:
        assert self._ws is not None
        bounded_timeout = None
        deadline = None
        if timeout is not None:
            bounded_timeout = max(0.001, float(timeout))
            deadline = time.monotonic() + bounded_timeout
        self._cmd_id += 1
        cid = self._cmd_id
        self._ws.send_text(
            json.dumps({"id": cid, "method": method, "params": params})
        )
        try:
            while True:
                if deadline is not None:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        raise BrowserError(
                            f"CDP {method} 超时",
                            diagnostic_code="BROWSER_CDP_TIMEOUT",
                        )
                    self._ws.set_timeout(remaining)
                msg = self._ws.recv_message()
                if msg is None:
                    raise BrowserError("浏览器连接在处理 CDP 指令时关闭")
                if msg.get("method"):
                    self._events.append(msg)
                    continue
                if msg.get("id") != cid:
                    continue
                if "error" in msg:
                    raise BrowserError(f"CDP {method} 失败: {msg['error']}")
                return msg.get("result", {})
        except socket.timeout as exc:
            raise BrowserError(
                f"CDP {method} 超时",
                diagnostic_code="BROWSER_CDP_TIMEOUT",
            ) from exc
        finally:
            if bounded_timeout is not None:
                self._ws.set_timeout(self._startup_timeout)

    def drain_events(self, method: Optional[str] = None) -> list[dict]:
        matched, remaining = [], deque()
        while self._events:
            event = self._events.popleft()
            (matched if method is None or event.get("method") == method else remaining).append(event)
        self._events = remaining
        return matched

    def poll_event(self, timeout: float = 1.0) -> Optional[dict]:
        if self._events:
            return self._events.popleft()
        assert self._ws is not None
        self._ws.set_timeout(timeout)
        try:
            while True:
                msg = self._ws.recv_message()
                if msg is None:
                    raise BrowserError("浏览器连接在等待 CDP 事件时关闭")
                if msg.get("method"):
                    return msg
        except socket.timeout:
            return None
        finally:
            self._ws.set_timeout(self._startup_timeout)

    # -- 公共 API --
    def set_cookies(self, cookies: Dict[str, str], domain: str = ".bilibili.com") -> None:
        """通过 CDP 在浏览器上下文写入 cookie（复用采集会话已获得的 buvid 等）。"""
        for name, value in cookies.items():
            if not value:
                continue
            self._send_cdp(
                "Network.setCookie",
                {
                    "name": name,
                    "value": str(value),
                    "domain": domain,
                    "path": "/",
                    "secure": True,
                    "httpOnly": False,
                },
            )

    def set_cookie_records(self, records: tuple[dict[str, Any], ...]) -> None:
        """Inject prevalidated user-session cookies before the first navigation."""
        for record in records:
            params = {
                key: record[key]
                for key in (
                    "name",
                    "value",
                    "domain",
                    "path",
                    "secure",
                    "httpOnly",
                )
            }
            result = self._send_cdp("Network.setCookie", params)
            if result.get("success") is not True:
                raise BrowserError("用户授权 Cookie 无法注入临时浏览器会话")

    def evaluate(
        self,
        expression: str,
        await_promise: bool = False,
        timeout: Optional[float] = None,
    ) -> Any:
        params = {
            "expression": expression,
            "awaitPromise": await_promise,
            "returnByValue": True,
            "userGesture": False,
        }
        result = (
            self._send_cdp("Runtime.evaluate", params)
            if timeout is None
            else self._send_cdp("Runtime.evaluate", params, timeout=timeout)
        )
        if "exceptionDetails" in result:
            raise BrowserError(
                f"浏览器脚本执行失败: {result['exceptionDetails'].get('text')}"
            )
        return result.get("result", {}).get("value")

    def navigate(self, url: str, timeout: float = 30.0) -> None:
        self.drain_events("Page.loadEventFired")
        started = time.monotonic()
        result = self._send_cdp(
            "Page.navigate",
            {"url": url},
            timeout=max(0.001, float(timeout)),
        )
        if result.get("errorText"):
            raise BrowserError(f"页面导航失败: {result['errorText']}")
        deadline = started + timeout
        deferred: list[dict] = []
        try:
            while time.monotonic() < deadline:
                event = self.poll_event(min(1.0, deadline - time.monotonic()))
                if event and event.get("method") == "Page.loadEventFired":
                    return
                if event is not None:
                    deferred.append(event)
            raise BrowserError(f"页面加载超时: {url}")
        finally:
            # `poll_event` removes events from the FIFO.  Navigation is only
            # interested in the load marker, so restore every other event in
            # front of events that arrived later, preserving observation order.
            self._events.extendleft(reversed(deferred))

    def scroll_by(
        self,
        viewports: int = 1,
        timeout: Optional[float] = None,
    ) -> None:
        expression = (
            f"window.scrollBy(0, window.innerHeight * {max(1, int(viewports))}); true"
        )
        if timeout is None:
            self.evaluate(expression)
        else:
            self.evaluate(expression, timeout=timeout)

    def page_text(self, timeout: Optional[float] = None) -> str:
        expression = "document.body ? document.body.innerText : ''"
        value = (
            self.evaluate(expression)
            if timeout is None
            else self.evaluate(expression, timeout=timeout)
        )
        return value if isinstance(value, str) else ""

    def fetch_text(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None,
    ) -> str:
        """经浏览器 fetch 取响应体文本。由调用方负责后续 JSON 解析与业务码判断。"""
        hdrs = {k: v for k, v in (headers or {}).items() if v}
        # json.dumps 的产物本身即合法 JS 字面量（字符串/对象），直接嵌入即可，
        # 无需 JSON.parse，避免引号转义导致的解析失败。
        expr = (
            "(async () => {"
            "  const resp = await fetch(%s, {method: 'GET', headers: %s, credentials: 'include'});"
            "  return await resp.text();"
            "})()"
        ) % (json.dumps(url), json.dumps(hdrs))
        value = (
            self.evaluate(expr, await_promise=True)
            if timeout is None
            else self.evaluate(
                expr,
                await_promise=True,
                timeout=timeout,
            )
        )
        return value if isinstance(value, str) else ""

    def get_response_body(
        self,
        request_id: str,
        timeout: Optional[float] = None,
    ) -> str:
        params = {"requestId": request_id}
        result = (
            self._send_cdp("Network.getResponseBody", params)
            if timeout is None
            else self._send_cdp("Network.getResponseBody", params, timeout=timeout)
        )
        body = result.get("body", "")
        if result.get("base64Encoded"):
            return base64.b64decode(body).decode("utf-8", errors="replace")
        return body

    @property
    def cleanup_diagnostics(self) -> tuple[str, ...]:
        """Return sanitized lifecycle diagnostics (never filesystem paths)."""
        return tuple(self._cleanup_diagnostics)

    def _record_cleanup_diagnostic(self, code: str) -> None:
        if (
            code in _CLEANUP_DIAGNOSTIC_CODES
            and code not in self._cleanup_diagnostics
        ):
            self._cleanup_diagnostics.append(code)

    def navigate_and_get_html(self, url: str, wait_seconds: float = 3.0) -> str:
        """通过 CDP 导航至目标 URL，等待前端 JS 渲染后提取页面 DOM outerHTML。"""
        self._send_cdp("Page.enable", {})
        self._send_cdp("Page.navigate", {"url": url})
        time.sleep(max(0.5, wait_seconds))
        result = self._send_cdp(
            "Runtime.evaluate",
            {
                "expression": "document.documentElement.outerHTML",
                "returnByValue": True,
            },
        )
        if "exceptionDetails" in result:
            exc = result["exceptionDetails"]
            raise BrowserError(f"提取 DOM outerHTML 异常: {exc.get('text')}")
        return result.get("result", {}).get("value", "") or ""


    def close(self) -> None:
        if self._ws is not None:
            try:
                self._ws.close()
            except Exception:  # noqa: BLE001 - cleanup must preserve active errors
                self._record_cleanup_diagnostic("WEBSOCKET_CLOSE_FAILED")
            self._ws = None
        if self._proc is not None:
            proc = self._proc
            self._proc = None
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except Exception:  # noqa: BLE001
                try:
                    proc.kill()
                except Exception:  # noqa: BLE001
                    self._record_cleanup_diagnostic("PROCESS_KILL_FAILED")
                else:
                    try:
                        proc.wait(timeout=5)
                    except Exception:  # noqa: BLE001
                        self._record_cleanup_diagnostic("PROCESS_REAP_FAILED")
        profile_dir = self._user_data_dir
        if profile_dir is None:
            return
        try:
            profile_is_dir = os.path.isdir(profile_dir)
        except Exception:  # noqa: BLE001 - never replace an active exception
            self._record_cleanup_diagnostic("PROFILE_REMOVE_FAILED")
            return
        if not profile_is_dir:
            self._user_data_dir = None
            return
        for attempt in range(3):
            try:
                shutil.rmtree(profile_dir)
                break
            except Exception:  # noqa: BLE001 - bounded cleanup retry
                try:
                    profile_remains = os.path.exists(profile_dir)
                except Exception:  # noqa: BLE001
                    profile_remains = True
                if not profile_remains:
                    break
                if attempt < 2:
                    time.sleep(0.05)
        try:
            profile_remains = os.path.exists(profile_dir)
        except Exception:  # noqa: BLE001
            profile_remains = True
        if profile_remains:
            self._record_cleanup_diagnostic("PROFILE_REMOVE_FAILED")
        else:
            self._user_data_dir = None

    def __enter__(self) -> "BrowserSession":
        return self.start()

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()
        diagnostics = self.cleanup_diagnostics
        if not diagnostics:
            return None
        if exc is not None:
            try:
                exc.cleanup_diagnostics = diagnostics
                if getattr(exc, "diagnostic_code", None) is None:
                    exc.diagnostic_code = "BROWSER_CLEANUP_FAILED"
            except (AttributeError, TypeError):
                pass
            return None
        raise BrowserError(
            "浏览器清理失败: " + ",".join(diagnostics),
            diagnostic_code="BROWSER_CLEANUP_FAILED",
            cleanup_diagnostics=diagnostics,
            is_cleanup_failure=True,
        )
