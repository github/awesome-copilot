#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""llmfill - LLMFill命令行工具（Agent Skill 主入口）。

把 merge-service 的文档智能填写与知识库管理能力暴露给 agent/终端：
上传 .docx 自动填写并下载结果、建库/传资料（供填写时检索）。

用法（agent 常用）：
    python scripts/llmfill.py config                      # 首次配置（API Key）
    python scripts/llmfill.py whoami                     # 令牌自检 + 余额
    python scripts/llmfill.py discover                   # 拉取接口清单（自动发现）
    python scripts/llmfill.py fill 表单.docx [--kb KB_ID] # AI 填写 -> 下载
    python scripts/llmfill.py kb ls                       # 知识库列表

注：不提供检索（search）命令 -- 检索是服务端填写链路的内部行为，
网关只暴露网页前端在用的接口。

认证：请求头 X-Auth-Token: aif_xxx（个人中心「API 密钥」生成）。
零第三方依赖，Python 3.10+ 标准库实现。
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import sys
import time
from pathlib import Path

from config import (
    ConfigError,
    DEFAULT_BASE_URL,
    allow_insecure_http,
    is_default_base,
    load_config,
    save_config,
    save_endpoints,
    validate_base_url,
)
from api_client import ApiError, download_file, poll_until_done, request_json

# fill/kb 上传的轮询参数：3s 起步指数退避（上限 15s），总超时 30 分钟
POLL_INTERVAL = 3.0
POLL_TIMEOUT = 30 * 60

ANSWER_SOURCES = ("knowledge_base", "internet", "hybrid", "llm_only")

# 处理阶段（status.tasks[].stages 的 key）：进度反馈时提示当前在做什么，
# 解决「长时间卡在 60% 无阶段信息」的体验问题。
STAGE_LABELS = {
    "upload": "上传解析",
    "generate_questions": "生成问题",
    "retrieve_questions": "检索知识库",
    "fill_answers": "填写答案",
    "finalize": "收尾结算",
}
# 视为「进行中」的阶段状态取值（服务端字段，防御式覆盖多种写法）
_ACTIVE_STAGE_STATUS = ("processing", "in_progress", "running", "started")


def _current_stage(state: dict) -> str | None:
    """从批次状态提取当前进行中的阶段名（结构差异防御式，取不到返回 None）。"""
    for task in state.get("tasks") or []:
        stages = task.get("stages")
        if isinstance(stages, dict):
            for name, info in stages.items():
                if isinstance(info, dict) and info.get("status") in _ACTIVE_STAGE_STATUS:
                    return name
        elif isinstance(stages, list):
            for s in stages:
                if isinstance(s, dict) and s.get("status") in _ACTIVE_STAGE_STATUS:
                    return s.get("name") or s.get("stage")
    return None


# ---------------------------------------------------------------------------
# 输出工具
# ---------------------------------------------------------------------------


class Output:
    """人类可读 / --json 双模式输出。"""

    def __init__(self, as_json: bool) -> None:
        self.as_json = as_json

    def result(self, data: dict, *, ok: str = "") -> None:
        """成功输出：--json 打印对象，否则打简短摘要 + 可选提示。"""
        if self.as_json:
            print(json.dumps(data, ensure_ascii=False, indent=2))
        elif ok:
            print(ok)

    def error(self, exc: Exception) -> None:
        if self.as_json:
            print(json.dumps({"success": False, "error": {
                "code": getattr(exc, "code", "ERROR"),
                "message": str(exc),
            }}, ensure_ascii=False))
        else:
            print(f"错误：{exc}", file=sys.stderr)
            if isinstance(exc, ApiError) and exc.code in ("INVALID_TOKEN", "NETWORK_ERROR"):
                print("提示：请运行 `python scripts/llmfill.py config` 检查配置。", file=sys.stderr)


def _read_file_bytes(path: str) -> tuple[str, bytes]:
    p = Path(path)
    if not p.is_file():
        raise ApiError("FILE_NOT_FOUND", f"文件不存在：{path}")
    return p.name, p.read_bytes()


def _mk_api(cfg: dict):
    """返回绑定了 base_url/api_key 的请求函数。"""
    return lambda method, path, **kw: request_json(
        cfg["base_url"], cfg["api_key"], method, path, **kw
    )


# ---------------------------------------------------------------------------
# 子命令：config / whoami / discover
# ---------------------------------------------------------------------------


def _approve_custom_base(cfg: dict, base_url: str, allow_custom: bool) -> None:
    """自定义 origin 需显式批准：--allow-custom 或交互确认，并持久化 approved_origins。

    非交互且未传 --allow-custom 时 fail-closed（警告不能代替同意）。
    """
    approved = set(cfg.get("approved_origins") or [])
    if base_url in approved:
        return  # 已批准，无需再确认
    if allow_custom:
        approved.add(base_url)
        cfg["approved_origins"] = sorted(approved)
        return
    if sys.stdin.isatty():
        print(f"警告：base_url 指向非默认端点 {base_url}（默认 {DEFAULT_BASE_URL}）。",
              file=sys.stderr)
        ans = input(f"  确认将令牌与文档发送到 {base_url} ？[y/N]: ").strip().lower()
        if ans in ("y", "yes"):
            approved.add(base_url)
            cfg["approved_origins"] = sorted(approved)
            return
        raise ApiError("CANCELLED", "已取消：未确认自定义端点")
    raise ApiError(
        "CUSTOM_BASE_REQUIRES_APPROVAL",
        f"自定义端点 {base_url} 需显式批准：请加 --allow-custom 或交互式确认",
    )


# --token-env 仅允许的变量名：不接受任意环境变量，防止误把其它服务的
# 密钥（云/CI/源码库凭据）当作 LLMFill 令牌读走、落盘并外发
TOKEN_ENV_ALLOWLIST = ("LLMFILL_API_TOKEN", "LLMFILL_API_KEY")

# 令牌格式：aif_ 前缀 + 限定字符集/长度（与个人中心「API 密钥」生成的格式一致）
_TOKEN_RE = re.compile(r"^aif_[A-Za-z0-9_-]{4,196}$")


def _validate_token(value: str, source: str) -> str:
    """校验令牌格式（aif_ 前缀 + 字符集/长度），值不匹配时 fail-closed。

    目的：环境变量/参数指错时（如指向 GITHUB_TOKEN 等无关密钥）在保存与
    发送之前就拦下，不把无关密钥写进 config.json 或发给服务端。

    额外诊断：agent 环境的常见坑是 secret 存进 store 后对模型隐藏，往 env
    里传时拿到的是掩码占位符（如 ``***``），而非真实令牌。此时给出针对性
    提示，避免用户误以为「上传的令牌错了」。
    错误信息只描述格式/长度问题，绝不回显真实令牌值。
    """
    v = value.strip()
    if _TOKEN_RE.match(v):
        return v
    if not v:
        raise ApiError("CONFIG_REQUIRED", f"{source} 未取到令牌值（空）。")
    if "*" in v or v.lower() in ("your_token_here", "<token>"):
        # 收到掩码/占位符：几乎可以断定是 secret 未注入环境变量
        raise ApiError(
            "CONFIG_REQUIRED",
            f"{source} 收到的是掩码占位符（含 ``*``），不是真实令牌——说明 secret "
            "未真正注入到环境变量（agent 环境常见：secrets 存的值对模型隐藏）。"
            "请改为让用户本人运行 `python scripts/llmfill.py config` 交互式输入，"
            "或直接把令牌写入 ~/.llmfill/config.json 的 api_key 字段。",
        )
    # secret 引用/占位：agent 平台往本地 exec 的 env 传 secret 时，拿到的常是
    # `store:LLMFILL_API_TOKEN` 这类引用串，而非真实值。真实令牌（aif_+安全字符）
    # 绝不含冒号/尖括号/花括号，故凡含这些即可断定是「引用未展开」。
    if ":" in v or v[0] in "<{":
        raise ApiError(
            "CONFIG_REQUIRED",
            f"{source} 收到的是 secret 引用/占位符（{v[:24]!r}...），不是真实令牌——"
            "agent 平台的 secrets 不会注入到本地脚本的环境变量。"
            "请改为让用户本人运行 `python scripts/llmfill.py config` 交互式输入，"
            "或直接把令牌写入 ~/.llmfill/config.json 的 api_key 字段。",
        )
    if not v.startswith("aif_"):
        raise ApiError(
            "CONFIG_REQUIRED",
            f"{source} 的值不是 aif_ 开头的令牌（当前收到 {len(v)} 个字符）。"
            "可能误指向了其它服务的密钥变量，或 secret 未注入；"
            "请用专用变量 LLMFILL_API_TOKEN。",
        )
    raise ApiError(
        "CONFIG_REQUIRED",
        f"{source} 的值以 aif_ 开头，但含非法字符或长度不符（共 {len(v)} 个字符）。"
        "请重新从个人中心完整复制令牌。",
    )


def cmd_config(args, out: Output) -> None:
    """首次配置：只填 API Key（base_url 内置默认，改 JSON/env 可覆盖）。"""
    cfg = load_config(require=False, check_approval=False)

    # base_url 不提示用户输入：默认内置，需要改的场景（自建/代理部署）
    # 用 --base 参数（自定义 origin 需 --allow-custom 或交互确认）。
    base_url = validate_base_url(
        args.base or cfg.get("base_url") or DEFAULT_BASE_URL,
        allow_insecure=allow_insecure_http(),
    )
    if not is_default_base(base_url):
        _approve_custom_base(cfg, base_url, args.allow_custom)
    # 令牌来源优先级：--token-env（推荐，不进 shell 历史）> --token（兼容保留）
    # > 交互输入（getpass 不回显）> 存量配置；新输入的令牌先做格式校验
    api_key = ""
    new_token = False  # 本次是否输入了新令牌（决定验证失败时是否保留旧值）
    if args.token_env:
        # 从环境变量读令牌：不进 shell 历史/进程列表，终端也不回显。
        # 仅允许专用变量名，防止误读无关密钥（对应审计 T09）
        if args.token_env not in TOKEN_ENV_ALLOWLIST:
            raise ApiError(
                "CONFIG_REQUIRED",
                f"--token-env 仅允许 {TOKEN_ENV_ALLOWLIST[0]}（推荐）或 "
                f"{TOKEN_ENV_ALLOWLIST[1]}，不接受任意环境变量——防止误把其它服务的"
                "密钥存入配置并发送给服务端。",
            )
        api_key = os.environ.get(args.token_env, "").strip()
        if not api_key:
            raise ApiError(
                "CONFIG_REQUIRED", f"环境变量 {args.token_env} 未设置或为空"
            )
        api_key = _validate_token(api_key, f"环境变量 {args.token_env}")
        new_token = True
    elif args.token:
        api_key = _validate_token(args.token, "--token")
        new_token = True
    elif sys.stdin.isatty():
        # 交互输入用 getpass（不回显）：防旁观/录屏/会话日志截获长效令牌
        try:
            print("  API Key：前往 https://www.llmfill.com/profile 个人中心「API 密钥」")
            print("  创建令牌后，粘贴 aif_ 开头的字符串（输入不回显；直接回车保留已存令牌）：")
            entered = getpass.getpass("  API Key: ").strip()
            if entered:
                api_key = _validate_token(entered, "交互输入")
                new_token = True
        except (EOFError, KeyboardInterrupt):
            raise ApiError(
                "CONFIG_REQUIRED", "交互输入不可用：请用 --token-env 或 --token 配置"
            )

    api_key = api_key or cfg.get("api_key") or ""
    if not api_key:
        raise ApiError("CONFIG_REQUIRED", "缺少 API Key（--token-env / --token 或交互输入）")

    # 先远程验证，通过后才把候选令牌落盘（对应审计 T09：验证失败不持久化新凭据）
    old_stored = cfg.get("api_key")
    try:
        whoami = request_json(base_url, api_key, "GET", "/v1/account/whoami")
    except ApiError as exc:
        if new_token:
            # 新令牌验证失败：不保存该候选值，恢复存量旧令牌
            # （自定义端点批准结果仍保留，便于重试）
            cfg["base_url"] = base_url
            if old_stored:
                cfg["api_key"] = old_stored
            else:
                cfg.pop("api_key", None)
            path = save_config(cfg)
            out.result({"saved": str(path), "verified": False, "error": str(exc)},
                       ok=f"令牌验证失败，未写入 {path}：{exc}")
        else:
            cfg.update({"base_url": base_url, "api_key": api_key})
            path = save_config(cfg)
            out.result({"saved": str(path), "verified": False, "error": str(exc)},
                       ok=f"已保存到 {path}，但自检失败：{exc}")
        return

    user_id = whoami.get("user_id")
    cfg.update({"base_url": base_url, "api_key": api_key, "user_id": user_id})
    path = save_config(cfg)
    balance = whoami.get("balance")
    bal_txt = f"，余额 {balance}" if balance is not None else ""
    identity = _identity_text(whoami)
    out.result(
        {
            "saved": str(path), "verified": True, "user_id": user_id,
            "token_name": whoami.get("token_name"),
            "email_masked": whoami.get("email_masked"),
            "balance": balance,
        },
        ok=f"配置完成并验证通过：{identity}{bal_txt}（已写入 {path}）",
    )


def _identity_text(data: dict) -> str:
    """身份回显文案：账号脱敏邮箱 + 令牌名称 + user_id，帮用户确认令牌归属。"""
    parts = []
    if data.get("email_masked"):
        parts.append(f"账号 {data['email_masked']}")
    if data.get("token_name"):
        parts.append(f"令牌「{data['token_name']}」")
    parts.append(f"user_id={data.get('user_id')}")
    return "，".join(parts)


def cmd_whoami(args, out: Output) -> None:
    cfg = load_config()
    data = request_json(cfg["base_url"], cfg["api_key"], "GET", "/v1/account/whoami")
    out.result(data, ok=(
        f"令牌有效：{_identity_text(data)}"
        + (f"，余额 {data.get('balance')}" if data.get("balance") is not None else "")
    ))


def cmd_discover(args, out: Output) -> None:
    """拉取网关聚合 OpenAPI，打印端点清单并缓存到 ~/.llmfill/endpoints.json。"""
    cfg = load_config()
    spec = request_json(cfg["base_url"], cfg["api_key"], "GET", "/v1/openapi")

    summary = {}
    for path, ops in spec.get("paths", {}).items():
        methods = [m.upper() for m in ops if m in ("get", "post", "put", "delete", "patch")]
        summary[path] = methods

    save_endpoints({"base_url": cfg["base_url"], "paths": summary})
    if out.as_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print(f"发现 {len(summary)} 个端点（已缓存到 ~/.llmfill/endpoints.json）：")
        for path, methods in sorted(summary.items()):
            print(f"  {','.join(methods):<18} {path}")


# ---------------------------------------------------------------------------
# 子命令：fill（文档智能填写）
# ---------------------------------------------------------------------------


def _download_batch_results(cfg: dict, batch_id: str, out_dir: Path, *, clean_only: bool = False) -> list[Path]:
    """下载批次结果：默认同时下载标注版（_processed）与纯净版（_clean）。

    返回下载到的文件绝对路径列表（标注版在前、纯净版在后）；clean_only=True
    时只下纯净版。两个版本由网关 Content-Disposition 区分文件名（如
    `xxx_processed.docx` / `xxx_clean.docx`），互不覆盖。
    """
    result_path = f"/v1/documents/{batch_id}/result"
    targets: list[Path] = []
    if not clean_only:
        targets.append(download_file(cfg["base_url"], cfg["api_key"], result_path, out_dir))
    targets.append(download_file(cfg["base_url"], cfg["api_key"], f"{result_path}?clean=true", out_dir))
    return targets


def cmd_fill(args, out: Output) -> None:
    """上传 -> 轮询 -> 下载，端到端填写。"""
    cfg = load_config()
    api = _mk_api(cfg)

    files = [_read_file_bytes(p) for p in args.files]
    if not files:
        raise ApiError("VALIDATION_ERROR", "请至少提供一个 .docx 文件")

    # 预估费用：独立 /estimate 端点（upload 响应不含 cost_estimate）。
    # 仅供展示，实扣以完成后 status 的 tasks[].cost 为准；estimate 失败不阻塞提交。
    estimate = None
    try:
        est_resp = api("POST", "/v1/documents/estimate",
                       files=[("files", n, b) for n, b in files])
        estimate = est_resp.get("total_cost") if isinstance(est_resp, dict) else None
    except ApiError:
        estimate = None

    # 上传（multipart：files[] + answer_source + kb_ids）。
    # 费用链路：余额不足时上游入队前 402 拒单（message 带预估金额与充值
    # 指引）；实扣金额在完成后从 status 的 tasks[].cost 提取（actual_cost）。
    form: dict[str, str] = {"answer_source": args.source}
    if args.kb:
        form["kb_ids"] = json.dumps(args.kb)
    if args.mode:
        form["mode"] = args.mode

    upload_resp = api(
        "POST", "/v1/documents/upload",
        form_fields=form,
        files=[("files", n, b) for n, b in files],
    )
    batch_id = upload_resp.get("batch_id")
    if not batch_id:
        raise ApiError("PARSE_ERROR", f"上传响应缺少 batch_id：{upload_resp}")

    total = upload_resp.get("total_count", len(files))
    est_txt = f"，预估费用约 {estimate} 元（实际以处理结果为准）" if estimate is not None else ""

    if not out.as_json:
        print(f"已提交批次 {batch_id}（{total} 个文件）{est_txt}，开始轮询处理进度…", file=sys.stderr)

    # 轮询批次状态
    def fetch():
        return api("GET", f"/v1/documents/{batch_id}/status")

    def done(state):
        return state.get("status") in ("completed", "partial", "failed")

    def on_tick(ticks, state):
        if not out.as_json and ticks % 3 == 0:  # 每 3 次轮询报一次进度，避免刷屏
            stage = _current_stage(state)
            stage_txt = f"，阶段：{STAGE_LABELS.get(stage, stage)}" if stage else ""
            print(f"  进度 {state.get('progress', 0)}%"
                  f"（{state.get('completed_count', 0)}/{state.get('total_count', '?')} 完成）{stage_txt}")

    state = poll_until_done(
        interval=POLL_INTERVAL, timeout=POLL_TIMEOUT,
        poll_fn=fetch, is_done=done, on_tick=on_tick,
    )

    if state.get("status") == "failed":
        raise ApiError("TASK_FAILED", f"批次处理失败：{state.get('failed_count', '?')} 个文件失败")

    # 实际费用：status 响应的 tasks[].cost 是 finalize 阶段按真实 token
    # 用量算出的实扣金额（与 auth-service 记账同值），预估只作参考。
    actual_cost = round(sum(float(t.get("cost") or 0) for t in state.get("tasks", [])), 6)
    cost_line = f"，实际费用 {actual_cost} 元" if actual_cost else ""

    # 输出目录：未显式指定 --out 时落到第一个模板所在目录（避免结果散落到
    # 调用时的工作目录）；显式指定则原样使用。
    out_dir = Path(args.out) if args.out else Path(args.files[0]).resolve().parent

    if not args.no_download:
        targets = _download_batch_results(cfg, batch_id, out_dir, clean_only=args.clean)
        downloaded = [str(t.resolve()) for t in targets]
        out.result({"batch_id": batch_id, "status": state.get("status"),
                    "cost_estimate": estimate, "actual_cost": actual_cost,
                    "downloaded": downloaded},
                  ok=f"处理完成（{state.get('status')}）{cost_line}，结果已下载：{'、'.join(downloaded)}")
    else:
        out.result({"batch_id": batch_id, "status": state.get("status"),
                    "cost_estimate": estimate, "actual_cost": actual_cost},
                  ok=f"处理完成（{state.get('status')}）{cost_line}，用 fill-download {batch_id} 下载")


def cmd_fill_status(args, out: Output) -> None:
    cfg = load_config()
    api = _mk_api(cfg)
    state = api("GET", f"/v1/documents/{args.batch_id}/status")
    actual_cost = round(sum(float(t.get("cost") or 0) for t in state.get("tasks", [])), 6)
    cost_line = f"，实际费用 {actual_cost} 元" if actual_cost else ""
    out.result(state, ok=(
        f"批次 {args.batch_id}：{state.get('status')}（进度 {state.get('progress', 0)}%，"
        f"完成 {state.get('completed_count', 0)}/{state.get('total_count', '?')}，"
        f"失败 {state.get('failed_count', 0)}{cost_line}）"
    ))


def cmd_fill_download(args, out: Output) -> None:
    cfg = load_config()
    targets = _download_batch_results(cfg, args.batch_id, Path(args.out), clean_only=args.clean)
    downloaded = [str(t.resolve()) for t in targets]
    out.result({"batch_id": args.batch_id, "downloaded": downloaded},
              ok=f"已下载：{'、'.join(downloaded)}")


# ---------------------------------------------------------------------------
# 子命令：kb（知识库管理）
# ---------------------------------------------------------------------------


def cmd_kb(args, out: Output) -> None:
    cfg = load_config()
    api = _mk_api(cfg)

    if args.kb_cmd == "ls":
        data = api("GET", "/v1/knowledge-bases")
        if out.as_json:
            print(json.dumps(data, ensure_ascii=False, indent=2))
        else:
            kbs = data.get("kbs", [])
            print(f"共 {len(kbs)} 个知识库：")
            for kb in kbs:
                print(f"  {kb.get('kb_id')}  {kb.get('name', '')}"
                      f"（{kb.get('document_count', 0)} 文档）")
        return

    if args.kb_cmd == "create":
        data = api("POST", "/v1/knowledge-bases",
                   json_body={"name": args.name, "description": args.desc or ""})
        out.result(data, ok=f"已创建知识库 {data.get('kb_id')}（{args.name}）")
        return

    if args.kb_cmd == "rm":
        # 删除不可恢复：交互环境需确认，非交互环境必须显式 --yes（防 agent 误删/注入误删）
        if not args.yes:
            if sys.stdin.isatty():
                print(f"即将删除知识库 {args.kb_id}（不可恢复），确认？[y/N]: ", file=sys.stderr)
                if input().strip().lower() not in ("y", "yes"):
                    raise ApiError("CANCELLED", "已取消删除")
            else:
                raise ApiError(
                    "CONFIRM_REQUIRED",
                    f"删除知识库 {args.kb_id} 是不可恢复操作，请加 --yes 确认",
                )
        data = api("DELETE", f"/v1/knowledge-bases/{args.kb_id}")
        out.result(data, ok=f"已删除知识库 {args.kb_id}")
        return

    if args.kb_cmd == "docs":
        data = api("GET", f"/v1/knowledge-bases/{args.kb_id}/documents")
        if out.as_json:
            print(json.dumps(data, ensure_ascii=False, indent=2))
        else:
            docs = data.get("documents", [])
            print(f"知识库 {args.kb_id} 共 {len(docs)} 个文档：")
            for d in docs:
                print(f"  {d.get('document_id', '')[:16]}…  {d.get('filename', '')}"
                      f"（{d.get('parse_status', '?')}）")
        return

    if args.kb_cmd == "upload":
        files = [_read_file_bytes(p) for p in args.files]
        failed: list[str] = []
        uploaded: list[dict] = []
        # 上传前文档快照：用于在列表中识别本次上传的新文档（网关不暴露
        # /tasks 任务查询，入库进度由文档列表 parse_status 派生，与前端一致）
        try:
            before = {
                (d.get("filename"), d.get("document_id"))
                for d in api("GET", f"/v1/knowledge-bases/{args.kb_id}/documents").get("documents", [])
            }
        except ApiError:
            before = set()

        for name, content in files:
            # 单文件失败（含上传被拒/入库失败）不阻塞其余文件，最终汇总退出码
            try:
                api("POST", f"/v1/knowledge-bases/{args.kb_id}/documents",
                    files=[("file", name, content)])
            except ApiError as exc:
                print(f"{name}：上传失败 - {exc.message}", file=sys.stderr)
                failed.append(name)
                continue
            if not out.as_json:
                print(f"{name}：已提交，轮询入库状态…", file=sys.stderr)

            def fetch(kb_id=args.kb_id, fname=name, snap=before):
                docs = api("GET", f"/v1/knowledge-bases/{kb_id}/documents").get("documents", [])
                # 本次上传的文档 = 同名且不在快照里的最新一条
                new_docs = [d for d in docs
                            if d.get("filename") == fname
                            and (d.get("filename"), d.get("document_id")) not in snap]
                return new_docs[0] if new_docs else {"parse_status": "parsing"}

            doc = poll_until_done(
                interval=POLL_INTERVAL, timeout=POLL_TIMEOUT, poll_fn=fetch,
                is_done=lambda d: d.get("parse_status") in ("completed", "failed"),
            )
            if doc.get("parse_status") == "failed":
                print(f"{name}：入库失败（可删除后重传）", file=sys.stderr)
                failed.append(name)
            else:
                uploaded.append({
                    "filename": name,
                    "document_id": doc.get("document_id"),
                    "parse_status": doc.get("parse_status"),
                })
                if not out.as_json:
                    print(f"{name}：入库完成（可检索）")
        if failed:
            raise ApiError("UPLOAD_FAILED", f"{len(failed)} 个文件失败：{'、'.join(failed)}")
        # --json 时同样输出结果（此前 upload 分支在 JSON 模式下无任何输出，
        # 导致 agent 只能再调 kb docs 确认入库状态）
        out.result(
            {"kb_id": args.kb_id, "uploaded": uploaded, "failed": failed},
            ok=f"已上传 {len(uploaded)} 个文件到知识库 {args.kb_id}（入库完成，可检索）",
        )
        return

    raise ApiError("VALIDATION_ERROR", f"未知 kb 子命令：{args.kb_cmd}")


# ---------------------------------------------------------------------------
# argparse 装配
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="llmfill",
        description="LLMFill：Word 智能填写 + 知识库管理（远程服务调用）。"
                    " 任意位置加 --json 输出机器可读 JSON（agent 友好）。",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # config
    p = sub.add_parser("config", help="首次配置（API Key + Base URL）并自检")
    p.add_argument("--base", help="覆盖服务地址（默认内置 www.llmfill.com；自定义地址需 --allow-custom）")
    p.add_argument("--token-env", metavar="NAME",
                   help="从环境变量读取 API Key，仅允许 LLMFILL_API_TOKEN / "
                        "LLMFILL_API_KEY（推荐：不进 shell 历史、终端不回显）")
    p.add_argument("--token", help="API Key 明文参数（会留在 shell 历史，建议改用 --token-env）")
    p.add_argument("--allow-custom", action="store_true", help="批准非默认的自定义服务地址（自建/代理部署）")
    p.set_defaults(func=cmd_config)

    # whoami
    p = sub.add_parser("whoami", help="令牌自检与余额查询")
    p.set_defaults(func=cmd_whoami)

    # discover
    p = sub.add_parser("discover", help="拉取接口清单（agent 自动发现）")
    p.set_defaults(func=cmd_discover)

    # fill
    p = sub.add_parser("fill", help="上传 .docx 智能填写并下载结果")
    p.add_argument("files", nargs="+", help=".docx 文件路径（可多个）")
    p.add_argument("--source", default="hybrid", choices=ANSWER_SOURCES,
                   help="答案来源（默认 hybrid）")
    p.add_argument("--kb", action="append", help="挂载的知识库 ID（可多次）")
    p.add_argument("--mode", default="fast", choices=("fast", "economy"),
                   help="处理模式（默认 fast）")
    p.add_argument("--clean", action="store_true", help="只下载纯净版（默认同时下载标注版+纯净版）")
    p.add_argument("--no-download", action="store_true", help="完成后不自动下载")
    p.add_argument("--out", default=None, help="下载目录（默认：第一个模板所在目录）")
    p.set_defaults(func=cmd_fill)

    # fill-status / fill-download
    p = sub.add_parser("fill-status", help="查询批次处理状态")
    p.add_argument("batch_id")
    p.set_defaults(func=cmd_fill_status)

    p = sub.add_parser("fill-download", help="下载批次结果")
    p.add_argument("batch_id")
    p.add_argument("--clean", action="store_true", help="只下载纯净版（默认同时下载标注版+纯净版）")
    p.add_argument("--out", default=".", help="下载目录（默认当前目录）")
    p.set_defaults(func=cmd_fill_download)

    # kb
    p = sub.add_parser("kb", help="知识库管理")
    kb_sub = p.add_subparsers(dest="kb_cmd", required=True)
    kb_sub.add_parser("ls", help="列出知识库")
    q = kb_sub.add_parser("create", help="创建知识库")
    q.add_argument("--name", required=True)
    q.add_argument("--desc", default="")
    q = kb_sub.add_parser("rm", help="删除知识库（不可恢复）")
    q.add_argument("kb_id")
    q.add_argument("--yes", action="store_true", help="跳过确认，直接删除")
    q = kb_sub.add_parser("docs", help="列出知识库下文档")
    q.add_argument("kb_id")
    q = kb_sub.add_parser("upload", help="上传文件到知识库（异步，自动轮询）")
    q.add_argument("kb_id")
    q.add_argument("files", nargs="+")
    p.set_defaults(func=cmd_kb)

    return parser


def main(argv: list[str] | None = None) -> int:
    # --json 是全局开关，手动从 argv 剥离后单独处理，使其可放在任意位置
    # （whoami --json 与 --json whoami 等价）。argparse 的全局参数只能放
    # 在子命令前，会拒绝最自然的 `whoami --json` 写法。
    argv = list(sys.argv[1:] if argv is None else argv)
    as_json = "--json" in argv
    argv = [a for a in argv if a != "--json"]

    parser = build_parser()
    args = parser.parse_args(argv)
    out = Output(as_json)
    try:
        args.func(args, out)
        return 0
    except ConfigError as exc:
        out.error(exc)
        return 2
    except ApiError as exc:
        out.error(exc)
        return 1
    except KeyboardInterrupt:
        print("\n已中断", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
