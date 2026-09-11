# -*- coding: utf-8 -*-
"""llmfill skill - 统一 HTTP 客户端（纯标准库，零第三方依赖）。

职责：
- 注入认证头 ``X-Auth-Token``（后端混合认证认的是它，不是 Authorization: Bearer）；
- 发送 JSON / multipart 请求（urllib.request）；
- 解析网关统一错误体 ``{"success":false,"error":{code,message,request_id}}``
  （兼容旧格式 ``detail``），抛 :class:`ApiError`；
- 二进制下载到指定目录，按 Content-Disposition 取文件名。
"""

from __future__ import annotations

import json
import mimetypes
import os
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Iterable

from config import normalize_origin


class ApiError(Exception):
    """API 调用失败（非 2xx 或网络异常），携带统一错误码。"""

    def __init__(self, code: str, message: str, status: int = 0) -> None:
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.message = message
        self.status = status


class _SameOriginRedirectHandler(urllib.request.HTTPRedirectHandler):
    """仅允许同 origin 重定向；跨域/降级一律拒绝，防 X-Auth-Token 泄露到第三方。

    urllib 默认会把原请求头（含 X-Auth-Token）转发到重定向目标，跨域即泄露凭据。
    此处用与配置校验同一套 normalize_origin 比较，不同则抛 HTTPError 终止，
    绝不转发认证头。
    """

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        old = normalize_origin(req.full_url)
        new = normalize_origin(newurl)
        if old != new:
            raise urllib.error.HTTPError(
                req.full_url, code,
                f"拒绝跨域重定向：{old} -> {new}（不转发认证头）",
                headers, fp,
            )
        # 同 origin：沿用标准行为（POST 301/302/303 会转 GET 丢弃 multipart body，
        # 307/308 的 POST 不重定向；https->http 降级已被 origin 比较拦截）
        return super().redirect_request(req, fp, code, msg, headers, newurl)


# 全局 opener：用「仅同源重定向」handler 替换 urllib 默认的跨域跟随
_opener = urllib.request.build_opener(_SameOriginRedirectHandler())


def _headers_with_auth(api_key: str, extra: dict | None = None) -> dict:
    headers = {"X-Auth-Token": api_key, "Accept": "application/json"}
    if extra:
        headers.update(extra)
    return headers


def _parse_error_body(raw: bytes, status: int) -> ApiError:
    """把错误响应体转成 ApiError：优先网关统一格式，兼容旧 detail 格式。"""
    try:
        body = json.loads(raw.decode("utf-8", "replace"))
    except (ValueError, UnicodeDecodeError):
        return ApiError("HTTP_ERROR", f"HTTP {status}（响应非 JSON）", status)

    if isinstance(body, dict):
        err = body.get("error")
        if isinstance(err, dict):
            code = str(err.get("code") or "HTTP_ERROR")
            msg = str(err.get("message") or f"HTTP {status}")
            return ApiError(code, msg, status)
        detail = body.get("detail") or body.get("message")
        if isinstance(detail, str) and detail:
            code = "INVALID_TOKEN" if status == 401 else "HTTP_ERROR"
            return ApiError(code, detail, status)
    return ApiError("HTTP_ERROR", f"HTTP {status}", status)


def request_json(
    base_url: str,
    api_key: str,
    method: str,
    path: str,
    *,
    json_body: dict | None = None,
    form_fields: dict[str, str] | None = None,
    files: list[tuple[str, str, bytes]] | None = None,
    timeout: float = 60.0,
) -> dict:
    """发请求并返回 JSON dict。

    json_body：JSON 请求体；form_fields + files：multipart 表单（上传用）。
    两者互斥，都传时以 multipart 为准。
    """
    url = f"{base_url.rstrip('/')}{path}"

    headers = _headers_with_auth(api_key)
    body: bytes | None = None

    if files is not None:
        boundary = f"----llmfill-{uuid.uuid4().hex}"
        body = _encode_multipart(boundary, form_fields or {}, files)
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    elif json_body is not None:
        body = json.dumps(json_body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif form_fields is not None:
        body = urllib.parse.urlencode(form_fields).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with _opener.open(req, timeout=timeout) as resp:
            raw = resp.read()
            if not raw:
                return {}
            return json.loads(raw.decode("utf-8", "replace"))
    except urllib.error.HTTPError as exc:
        raise _parse_error_body(exc.read(), exc.code) from exc
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        raise ApiError("NETWORK_ERROR", f"无法连接 {base_url}：{reason}") from exc
    except TimeoutError as exc:
        raise ApiError("TIMEOUT", f"请求超时（{timeout}s）：{url}") from exc
    except ValueError as exc:
        raise ApiError("PARSE_ERROR", f"响应不是合法 JSON：{exc}") from exc


def _encode_multipart(
    boundary: str,
    fields: dict[str, str],
    files: list[tuple[str, str, bytes]],
) -> bytes:
    """手工构造 multipart/form-data 请求体。

    files 元组：(字段名, 文件名, 内容)。content-type 按文件名推断。

    文件名策略：
    - ``filename=`` 直接使用原始文件名（UTF-8 字节）。虽然 RFC 7578 之前的
      规范要求 header 为 ASCII，但现代 HTTP 服务器普遍支持 UTF-8；
      若接收方（如 Starlette）按 latin-1 解码产生乱码，服务端的
      ``_repair_upload_filename`` 会通过 latin-1 -> utf-8 还原。
    - 同时携带 ``filename*=UTF-8''...``（RFC 5987）作为兼容，供正确实现
      的客户端/代理使用。
    """
    parts: list[bytes] = []
    for name, value in fields.items():
        parts.append(
            (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
                f"{value}\r\n"
            ).encode("utf-8")
        )
    for field_name, filename, content in files:
        ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        # 对 filename= 中的双引号、换行等做转义，避免破坏 header 结构
        safe_name = filename.replace('"', "'").replace("\r", " ").replace("\n", " ")
        encoded_name = urllib.parse.quote(filename, safe="")
        parts.append(
            (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{field_name}"; '
                f'filename="{safe_name}"; '
                f"filename*=UTF-8''{encoded_name}\r\n"
                f"Content-Type: {ctype}\r\n\r\n"
            ).encode("utf-8") + content + b"\r\n"
        )
    parts.append(f"--{boundary}--\r\n".encode("utf-8"))
    return b"".join(parts)


def _ascii_fallback_filename(name: str) -> str:
    """生成 ASCII-only 的 fallback 文件名（RFC 5987 同时提供 filename* 时用）。"""
    cleaned = name.replace('"', "'").replace("\r", " ").replace("\n", " ")
    try:
        cleaned.encode("ascii")
        return cleaned
    except UnicodeEncodeError:
        return "file"


def _safe_filename(name: str) -> str:
    """把服务端返回的文件名当作不可信输入：仅取 basename，拒绝路径分隔符/盘符/.. 与控制字符。

    服务端（或中间人）可通过 Content-Disposition 控制文件名；直接 ``out_dir / name``
    会被 ``../../`` 或绝对路径穿越到 out_dir 之外。此处统一分隔符后取末段，再剥控制字符。
    """
    # 统一分隔符后取最后一段（POSIX "/" 与 Windows "\\" 均视为分隔符）
    basename = name.replace("\\", "/").split("/")[-1].strip()
    if basename in ("", ".", ".."):
        return "download.bin"
    # 去除控制字符与 DEL（避免换行/退格注入文件名）
    cleaned = "".join(c for c in basename if ord(c) >= 32 and ord(c) != 0x7F)
    if not cleaned:
        return "download.bin"
    return cleaned


def download_file(
    base_url: str,
    api_key: str,
    path: str,
    out_dir: Path,
    *,
    timeout: float = 300.0,
) -> Path:
    """下载二进制响应到 out_dir，文件名取 Content-Disposition（无则用 URL 尾段）。"""
    url = f"{base_url.rstrip('/')}{path}"
    req = urllib.request.Request(
        url, headers=_headers_with_auth(api_key), method="GET"
    )
    try:
        with _opener.open(req, timeout=timeout) as resp:
            disp = resp.headers.get("Content-Disposition") or ""
            raw_name = _filename_from_disposition(disp) or path.rstrip("/").split("/")[-1] or "download.bin"
            filename = _safe_filename(raw_name)
            out_dir.mkdir(parents=True, exist_ok=True)
            root = out_dir.resolve()
            target = (root / filename).resolve()
            # 二次防护：确保最终路径仍落在 out_dir 内（防御 basename 未覆盖的边界）
            if target.parent != root:
                raise ApiError("UNSAFE_FILENAME", f"服务端返回了不安全文件名：{raw_name!r}")
            target = _unique_path(target)
            # 流式写入，避免大文件一次性读入内存
            with open(target, "wb") as f:
                shutil.copyfileobj(resp, f)
            return target
    except urllib.error.HTTPError as exc:
        raise _parse_error_body(exc.read(), exc.code) from exc
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        raise ApiError("NETWORK_ERROR", f"无法连接 {base_url}：{reason}") from exc


def _filename_from_disposition(disp: str) -> str | None:
    """从 Content-Disposition 提取文件名（支持 filename*=UTF-8'' 与 filename=）。"""
    import re

    m = re.search(r"filename\*=UTF-8''([^;]+)", disp, re.IGNORECASE)
    if m:
        return urllib.parse.unquote(m.group(1))
    m = re.search(r'filename="?([^";]+)"?', disp, re.IGNORECASE)
    if m:
        return m.group(1)
    return None


def _unique_path(path: Path) -> Path:
    """目标文件已存在时加 (1) (2) 后缀，不覆盖旧文件。"""
    if not path.exists():
        return path
    stem, suffix = path.stem, path.suffix
    for i in range(1, 1000):
        candidate = path.with_name(f"{stem}({i}){suffix}")
        if not candidate.exists():
            return candidate
    return path.with_name(f"{stem}-{uuid.uuid4().hex[:6]}{suffix}")


def poll_until_done(
    *,
    interval: float,
    timeout: float,
    poll_fn,
    is_done=lambda state: True,
    on_tick=None,
) -> dict:
    """通用轮询：poll_fn() 返回状态 dict，is_done 判断完成，超时抛 ApiError。

    轮询间隔以 interval 起步、每次 *1.5 退避（上限 15s），适配 3-5s 起步、
    30min 总超时的 fill/kb-upload 场景。
    """
    deadline = time.monotonic() + timeout
    current = interval
    ticks = 0
    while True:
        state = poll_fn()
        if is_done(state):
            return state
        if time.monotonic() >= deadline:
            raise ApiError(
                "TASK_TIMEOUT",
                f"任务超时（>{timeout:.0f}s）。可稍后用状态查询命令查看进度。",
            )
        ticks += 1
        if on_tick:
            on_tick(ticks, state)
        time.sleep(current)
        current = min(current * 1.5, 15.0)
