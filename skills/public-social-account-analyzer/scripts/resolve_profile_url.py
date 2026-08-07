#!/usr/bin/env python3
"""Resolve an allowlisted public-profile short URL before workspace creation."""

from __future__ import annotations

import argparse
import subprocess
import sys

from task_contract import resolve_profile_url


def _curl_effective_url(url: str) -> str:
    completed = subprocess.run(
        [
            "curl",
            "--silent",
            "--show-error",
            "--location",
            "--max-redirs",
            "5",
            "--output",
            "/dev/null",
            "--write-out",
            "%{url_effective}",
            url,
        ],
        check=False,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if completed.returncode != 0:
        raise ValueError("short URL redirect could not be resolved")
    return completed.stdout


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="规范化 B站公开账号主页 URL；只接受 HTTPS 数字 UID 主页"
    )
    parser.add_argument("url")
    args = parser.parse_args(argv)
    try:
        canonical = resolve_profile_url(
            args.url, redirect_resolver=_curl_effective_url
        )
    except (OSError, subprocess.SubprocessError, ValueError) as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 2
    print(canonical)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
