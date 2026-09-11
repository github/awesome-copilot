# -*- coding: utf-8 -*-
"""llmfill skill - 本地配置读写。

配置存于 ``~/.llmfill/config.json``（权限 600）。
环境变量 ``LLMFILL_BASE_URL`` / ``LLMFILL_API_KEY`` 优先级高于配置文件，
便于 CI 或临时覆盖而不落盘。

安全模型（对应审计 T09：未校验/未批准的凭据与文档外发目的地）：
- base_url 默认仅允许 ``https://www.llmfill.com``（含裸域 llmfill.com）；
- 自定义 origin（自建/代理）必须显式批准：交互确认或 ``config --allow-custom``，
  批准结果持久化到 ``approved_origins``，之后每次调用 fail-closed 校验；
- 明文 HTTP 默认拒绝，仅 ``LLMFILL_ALLOW_INSECURE_HTTP=1`` 显式放行（本地开发/测试）。
"""

from __future__ import annotations

import json
import os
import stat
import urllib.parse
from pathlib import Path

CONFIG_DIR = Path.home() / ".llmfill"
CONFIG_PATH = CONFIG_DIR / "config.json"
ENDPOINTS_PATH = CONFIG_DIR / "endpoints.json"

DEFAULT_BASE_URL = "https://www.llmfill.com"

# 默认信任的完整 origin（scheme+host+端口，默认端口省略）；其余一律视为
# 「自建/代理」需显式批准——非默认端口即使 host 在名单内也不算默认信任
DEFAULT_ALLOWED_ORIGINS = ("https://www.llmfill.com", "https://llmfill.com")

# 显式开关：允许明文 HTTP（仅本地开发/测试），默认关闭。设 1/true/yes 生效。
ALLOW_INSECURE_HTTP_ENV = "LLMFILL_ALLOW_INSECURE_HTTP"

_VALID_KEYS = {
    "base_url", "api_key", "user_id", "default_kb", "created_at",
    # 用户显式批准的自定义 endpoint（精确 origin，规范化后的 scheme://host[:port]）
    "approved_origins",
}


class ConfigError(Exception):
    """配置缺失或格式错误。"""


def allow_insecure_http() -> bool:
    """是否显式放行明文 HTTP（本地开发/测试开关，默认关闭）。"""
    return os.environ.get(ALLOW_INSECURE_HTTP_ENV, "").strip().lower() in ("1", "true", "yes")


def validate_base_url(url: str, *, allow_insecure: bool = False) -> str:
    """校验并规范化 base_url，返回标准化 origin（无尾斜杠）。

    安全约束：
    - 默认仅允许 https；明文 http 仅在 ``allow_insecure=True``（本地开发/测试）时放行；
    - 拒绝内嵌用户名/密码、# 锚点、查询串、多余路径；
    - 必须含主机名。
    返回 ``<scheme>://host[:port]``，不带尾斜杠。
    """
    parts = urllib.parse.urlsplit(url or "")
    scheme = parts.scheme
    if scheme != "https" and not (allow_insecure and scheme == "http"):
        raise ConfigError(
            f"base_url 必须为 HTTPS（当前：{scheme or '空'}）。"
            "拒绝明文 HTTP 或其它 scheme；确需本地明文 HTTP 请设 "
            f"{ALLOW_INSECURE_HTTP_ENV}=1。"
        )
    if parts.username or parts.password:
        raise ConfigError("base_url 不允许内嵌用户名/密码")
    if parts.fragment:
        raise ConfigError("base_url 不允许包含 # 锚点")
    if parts.query:
        raise ConfigError("base_url 不允许包含查询串")
    if parts.path not in ("", "/"):
        raise ConfigError(
            "base_url 应只填 origin（如 https://www.llmfill.com），不要带路径"
        )
    host = parts.hostname
    if not host:
        raise ConfigError("base_url 缺少主机名")
    return f"{scheme}://{host}" + (f":{parts.port}" if parts.port else "")


def normalize_origin(url: str) -> str:
    """规范化 origin：小写 host + 去默认端口，配置校验与重定向校验共用同一规则。

    ``https://www.llmfill.com:443`` 与 ``https://www.llmfill.com`` 规范化后相等；
    非默认端口（如 :8443）保留，代表不同 origin。
    """
    parts = urllib.parse.urlsplit(url or "")
    host = (parts.hostname or "").lower()
    port = parts.port
    if port is None or (parts.scheme == "https" and port == 443) \
            or (parts.scheme == "http" and port == 80):
        return f"{parts.scheme}://{host}"
    return f"{parts.scheme}://{host}:{port}"


def is_default_base(url: str) -> bool:
    """是否默认信任 origin：完整比较 scheme+host+端口（仅查 hostname 会漏掉换端口绕过）。"""
    return normalize_origin(url) in DEFAULT_ALLOWED_ORIGINS


def ensure_allowed_base(cfg: dict) -> None:
    """fail-closed：非默认 origin 必须已在 approved_origins 里显式批准，否则抛错。

    单独改 ``base_url`` 字段、或设 ``LLMFILL_BASE_URL``，不能绕过批准——
    只有 ``config --allow-custom``（或交互确认）能把 origin 写进 approved_origins。
    """
    base = cfg.get("base_url") or DEFAULT_BASE_URL
    if is_default_base(base):
        return
    approved = {normalize_origin(x) for x in cfg.get("approved_origins") or []}
    if normalize_origin(base) in approved:
        return
    raise ConfigError(
        f"自定义服务端点 {base} 未获批准。默认仅允许 https://www.llmfill.com。\n"
        "如确需自建/代理部署，请运行：\n"
        f"  python scripts/llmfill.py config --base {base} --allow-custom\n"
        "（或交互式 config 时确认），批准会持久化到 config.json 的 approved_origins。"
    )


def _tighten_perms(path: Path) -> None:
    """尽力收紧文件权限为 600（Windows 上 chmod 语义有限，静默失败）。"""
    try:
        path.chmod(stat.S_IRUSR | stat.S_IWUSR)
    except OSError:  # Windows / 受限文件系统
        pass


def load_config(*, require: bool = True, check_approval: bool = True) -> dict:
    """读取配置；环境变量覆盖 base_url / api_key。

    require=True 且无 api_key 时抛 ConfigError（提示先运行 config）。
    check_approval=False 供 cmd_config 使用（配置阶段自行处理批准，避免旧值误伤）。
    """
    cfg: dict = {}
    if CONFIG_PATH.exists():
        try:
            # utf-8-sig 兼容带 BOM 的配置（Windows 记事本 / PowerShell Set-Content 默认带 BOM）
            cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8-sig"))
        except (ValueError, OSError) as exc:
            raise ConfigError(f"配置文件损坏（{CONFIG_PATH}）：{exc}\n请重新运行 llmfill config") from exc
        if not isinstance(cfg, dict):
            raise ConfigError(f"配置文件格式错误（{CONFIG_PATH}）：顶层应为 JSON 对象")

    env_base = os.environ.get("LLMFILL_BASE_URL")
    env_key = os.environ.get("LLMFILL_API_KEY")
    if env_base:
        cfg["base_url"] = env_base
    if env_key:
        cfg["api_key"] = env_key

    cfg.setdefault("base_url", DEFAULT_BASE_URL)
    cfg["base_url"] = validate_base_url(cfg["base_url"], allow_insecure=allow_insecure_http())
    if check_approval:
        ensure_allowed_base(cfg)

    if require and not cfg.get("api_key"):
        raise ConfigError(
            "未配置 API Key。请运行 `python scripts/llmfill.py config`，"
            "并前往 https://www.llmfill.com/profile 个人中心「API 密钥」创建令牌后粘贴。"
        )
    return cfg


def save_config(cfg: dict) -> Path:
    """写入配置文件（仅保留白名单字段），权限 600。"""
    clean = {k: cfg.get(k) for k in _VALID_KEYS if cfg.get(k) is not None}
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(
        json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    _tighten_perms(CONFIG_PATH)
    return CONFIG_PATH


def save_endpoints(data: dict) -> Path:
    """discover 命令缓存的接口清单。"""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    ENDPOINTS_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return ENDPOINTS_PATH
