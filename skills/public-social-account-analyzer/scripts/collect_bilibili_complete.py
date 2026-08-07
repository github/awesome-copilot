#!/usr/bin/env python3
"""Run bounded, immutable Bilibili full-collection attempts."""

from __future__ import annotations

import argparse
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from bounded_attempt_runner import AttemptRunResult, run_bounded_attempts
from collectors._constants import (
    PUBLIC_ALL_DEFAULT_MAX_ITEMS,
    validate_public_all_max_items,
)
RETRYABLE_REASONS = frozenset({"RATE_LIMITED", "ACCESS_RESTRICTED"})
RETRYABLE_PLATFORM_CODES = frozenset({-352})


@dataclass(frozen=True)
class RetryResult:
    success: bool
    attempt_count: int
    selected_workspace: Path
    stop_reason: str | None
    task_status: str | None = None


def _is_retryable_attempt(task: dict) -> bool:
    """Retry bounded protection outcomes, including Bilibili code -352."""
    return bool(
        task.get("stop_reason") in RETRYABLE_REASONS
        or task.get("platform_response_code") in RETRYABLE_PLATFORM_CODES
    )


def _attempt_succeeded(task: dict) -> bool:
    coverage = task.get("collection_coverage")
    coverage = coverage if isinstance(coverage, dict) else {}
    return bool(
        task.get("task_status") == "COMPLETED"
        and coverage.get("is_exhaustive") is True
    )


def _log_attempt(attempt: int, max_attempts: int, workspace: Path, task: dict) -> None:
    coverage = task.get("collection_coverage")
    coverage = coverage if isinstance(coverage, dict) else {}
    print(
        f"attempt={attempt}/{max_attempts} workspace={workspace} "
        f"task_status={task.get('task_status') or 'INVALID'} "
        f"stop_reason={task.get('stop_reason') or 'null'} "
        f"diagnostic_code={task.get('diagnostic_code') or 'null'} "
        f"platform_response_code={task.get('platform_response_code') if type(task.get('platform_response_code')) is int else 'null'} "
        f"is_exhaustive={str(coverage.get('is_exhaustive') is True).lower()}"
    )


def _to_retry_result(result: AttemptRunResult) -> RetryResult:
    task = result.selected_task
    return RetryResult(
        result.success,
        result.attempt_count,
        result.selected_workspace,
        None if result.success else task.get("stop_reason"),
        "COMPLETED" if result.success else task.get("task_status"),
    )


def run_attempts(
    url: str,
    output_prefix: Path,
    *,
    max_items: int = PUBLIC_ALL_DEFAULT_MAX_ITEMS,
    max_attempts: int = 3,
    date_from: str | None = None,
    date_to: str | None = None,
    analysis_goal: str | None = None,
    include_comments: bool = False,
    bilibili_cookie_file: str | None = None,
    run_command: Callable[[list[str]], int] | None = None,
    sleep_fn: Callable[[int], None] = time.sleep,
) -> RetryResult:
    """Retry only retryable protected attempts, always using a new workspace."""
    validate_public_all_max_items(max_items)
    script = Path(__file__).with_name("collect.py")

    def build_command(workspace: Path) -> list[str]:
        command = [
            sys.executable,
            str(script),
            url,
            "--all",
            "--max-items",
            str(max_items),
            "--out",
            str(workspace),
        ]
        if date_from is not None:
            command.extend(["--date-from", date_from])
        if date_to is not None:
            command.extend(["--date-to", date_to])
        if analysis_goal is not None:
            command.extend(["--analysis-goal", analysis_goal])
        if include_comments:
            command.append("--comments")
        if bilibili_cookie_file is not None:
            command.extend(["--bilibili-cookie-file", bilibili_cookie_file])
        return command

    return _to_retry_result(run_bounded_attempts(
        output_prefix=output_prefix,
        max_attempts=max_attempts,
        build_command=build_command,
        is_success=_attempt_succeeded,
        is_retryable=_is_retryable_attempt,
        run_command=run_command,
        sleep_fn=sleep_fn,
        observe_attempt=_log_attempt,
    ))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="B站公开作品安全全量采集：新任务重试，固定30/60秒退避"
    )
    parser.add_argument("url", help="B站数字 UID 空间主页")
    parser.add_argument("--out-prefix", required=True, type=Path)
    parser.add_argument(
        "--max-items", type=int, default=PUBLIC_ALL_DEFAULT_MAX_ITEMS
    )
    parser.add_argument("--max-attempts", type=int, default=3)
    parser.add_argument("--date-from", default=None)
    parser.add_argument("--date-to", default=None)
    parser.add_argument("--analysis-goal", default=None)
    parser.add_argument("--comments", action="store_true")
    parser.add_argument(
        "--bilibili-cookie-file",
        default=None,
        help="用户主动提供的B站 Cookie JSON/文本文件；仅传递给每次临时采集任务。",
    )
    args = parser.parse_args(argv)
    try:
        result = run_attempts(
            args.url,
            args.out_prefix,
            max_items=args.max_items,
            max_attempts=args.max_attempts,
            date_from=args.date_from,
            date_to=args.date_to,
            analysis_goal=args.analysis_goal,
            include_comments=args.comments,
            bilibili_cookie_file=args.bilibili_cookie_file,
        )
    except ValueError as exc:
        print(f"[FAILED] {exc}", file=sys.stderr)
        return 2
    if result.success:
        print(f"[OK] selected_workspace={result.selected_workspace}")
        return 0
    if result.task_status == "PARTIAL":
        print(
            f"[PARTIAL] selected_workspace={result.selected_workspace} "
            f"task_status=PARTIAL "
            f"stop_reason={result.stop_reason or 'null'}"
        )
        return 0
    print(
        f"[FAILED] selected_workspace={result.selected_workspace} "
        f"task_status={result.task_status or 'INVALID'} "
        f"stop_reason={result.stop_reason or 'INVALID'}",
        file=sys.stderr,
    )
    return 3


if __name__ == "__main__":
    raise SystemExit(main())
