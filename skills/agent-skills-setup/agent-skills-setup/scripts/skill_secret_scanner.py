#!/usr/bin/env python3
"""Reject a Skill source tree that contains likely literal credentials."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Sequence


PROVIDER_PATTERNS = (
    re.compile(rb"sk-[A-Za-z0-9_-]{20,}"),
    re.compile(rb"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(rb"AKIA[0-9A-Z]{16}"),
    re.compile(rb"ASIA[0-9A-Z]{16}"),
    re.compile(rb"xox[baprs]-[A-Za-z0-9-]{10,}"),
    re.compile(rb"ya29\.[A-Za-z0-9_-]+"),
    re.compile(rb"AIza[0-9A-Za-z_-]{35}"),
    re.compile(rb"sk_live_[A-Za-z0-9]{16,}"),
    # Bearer authorization tokens: "Bearer eyJhbGci...", "bearer abc123..."
    re.compile(rb"(?i)bearer[ \t]+[A-Za-z0-9._~+/-]{16,}"),
)
PRIVATE_KEY = re.compile(
    rb"-----BEGIN (?:OPENSSH |RSA |EC |DSA )?PRIVATE KEY-----"
)
# Credentials embedded in a connection-string userinfo component:
#   postgres://user:pass@host:5432/db
#   redis://:secret@cache:6379/
#   amqp://guest:guest@broker/
# The username component is optional (redis://:pass@host);
# the colon separating userinfo from password is required so that a plain
# email-style URL (https://user@example.com) is NOT flagged.
CONNECTION_STRING_USERINFO = re.compile(
    rb"(?i)[a-z][a-z0-9+.\-]*://[^\s:/@\"'\(\)]*:[^\s:/@\"'\(\)]+@[^\s\"'\)]+"
)
SECRET_ASSIGNMENT = re.compile(
    r"(?im)(?<![A-Za-z0-9_])(?:api[_-]?key|token|secret|password|passwd|"
    r"authorization|bearer|client[_-]?secret|private[_-]?key)(?![A-Za-z0-9_])"
    r"[\"']?[ \t]*[=:][ \t]*[\"']?"
    r"([^\s\"'`,;]{12,})"
)
PLACEHOLDER_WORDS = (
    "example",
    "sample",
    "placeholder",
    "redacted",
    "changeme",
    "dummy",
    "your_",
    "your-",
    "<",
    "...",
)
SAFE_REFERENCE = re.compile(
    r"^(?:\$\(.+\)|\$[A-Za-z_][A-Za-z0-9_]*|\$\{[A-Za-z_][A-Za-z0-9_]*\}|"
    r"env:[A-Za-z_][A-Za-z0-9_]*)$"
)


def is_placeholder(value: str) -> bool:
    lowered = value.lower()
    return any(word in lowered for word in PLACEHOLDER_WORDS)


def finding_reason(data: bytes) -> str | None:
    if PRIVATE_KEY.search(data):
        return "private key block"
    if any(pattern.search(data) for pattern in PROVIDER_PATTERNS):
        return "provider credential pattern"
    if CONNECTION_STRING_USERINFO.search(data):
        return "credential embedded in connection-string userinfo"
    if b"\x00" in data[:8192]:
        return None
    text = data.decode("utf-8", errors="replace")
    for match in SECRET_ASSIGNMENT.finditer(text):
        value = match.group(1)
        if (
            not value.startswith("$(")
            and not SAFE_REFERENCE.fullmatch(value)
            and not is_placeholder(value)
        ):
            return "literal value assigned to a credential field"
    return None


def symlink_reason(path: Path, root: Path) -> str | None:
    target = os.readlink(path)
    if os.path.isabs(target):
        return "absolute symbolic link"
    resolved = (path.parent / target).resolve(strict=False)
    try:
        resolved.relative_to(root)
    except ValueError:
        return "symbolic link escapes the Skill directory"
    return None


def scan(root: Path) -> list[tuple[Path, str]]:
    findings: list[tuple[Path, str]] = []
    root = root.resolve()

    def walk_error(error: OSError) -> None:
        path = Path(error.filename) if error.filename else root
        try:
            display = path.relative_to(root)
        except ValueError:
            display = path
        raise RuntimeError(f"cannot inspect {display}: {error.strerror}")

    for directory, dirnames, filenames in os.walk(
        root, followlinks=False, onerror=walk_error
    ):
        for name in (*dirnames, *filenames):
            path = Path(directory, name)
            if path.is_symlink():
                reason = symlink_reason(path, root)
                if reason:
                    findings.append((path.relative_to(root), reason))
        for filename in filenames:
            path = Path(directory, filename)
            if path.is_symlink() or not path.is_file():
                continue
            try:
                reason = finding_reason(path.read_bytes())
            except OSError as error:
                raise RuntimeError(
                    f"cannot read {path.relative_to(root)}: {error}"
                ) from error
            if reason:
                findings.append((path.relative_to(root), reason))
    return findings


def main(argv: Sequence[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    if len(arguments) != 1:
        print("usage: scan-skill-secrets.py SKILL_DIR", file=sys.stderr)
        return 2
    root = Path(arguments[0])
    if not root.is_dir():
        print(f"invalid Skill directory: {root}", file=sys.stderr)
        return 2
    try:
        findings = scan(root)
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 2
    for path, reason in findings:
        print(f"{path}: {reason}")
    return 1 if findings else 0
