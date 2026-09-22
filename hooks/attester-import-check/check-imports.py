#!/usr/bin/env python3
"""attester-import-check hook for GitHub Copilot coding agent (preToolUse).

Reads the tool invocation as JSON on stdin ({"toolName", "toolInput"}),
extracts package imports from the code being introduced, and checks each
name against the attester.dev existence oracle (free keyless tier, 25
calls/day per client IP). Exits 1 to block on a confident "does not exist".
Quota exhaustion, offline, and payload problems fail open (exit 0): a guard
that blocks the wrong operation is worse than one that misses one.

Stdlib only. Answers are cached at ~/.cache/attester-import-check/cache.json
(exists 30 days, negatives 1 day) so repeated edits do not burn quota.

Env:
    ATTESTER_MODE=block|warn          default block (warn never blocks)
    ATTESTER_BASE_URL                 default https://attester.dev
    ATTESTER_IMPORT_CHECK_NO_CACHE=1  skip the answer cache
"""

from __future__ import annotations

import ast
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

BASE_URL = os.environ.get("ATTESTER_BASE_URL", "https://attester.dev").rstrip("/")
CACHE_PATH = Path.home() / ".cache" / "attester-import-check" / "cache.json"
TTL_POSITIVE_S = 30 * 24 * 3600
TTL_NEGATIVE_S = 24 * 3600
TIMEOUT_S = 10.0

PY_EXTS = {".py", ".pyi"}
JS_EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"}
NODE_BUILTINS = frozenset(
    """
    assert async_hooks buffer child_process cluster console constants crypto
    dgram diagnostics_channel dns domain events fs http http2 https inspector
    module net os path perf_hooks process punycode querystring readline repl
    sea sqlite stream string_decoder sys test timers tls trace_events tty url
    util v8 vm wasi worker_threads zlib
    """.split()
)
PATH_KEYS = {"path", "filePath", "file_path", "filename", "file"}

_JS_SPEC_RE = re.compile(
    r"""
      \bfrom\s*['"]([^'"]+)['"]
    | \bimport\s*['"]([^'"]+)['"]
    | \brequire\(\s*['"]([^'"]+)['"]\s*\)
    | \bimport\(\s*['"]([^'"]+)['"]\s*\)
    """,
    re.VERBOSE,
)


def extract_python(source: str) -> set[str]:
    try:
        tree = ast.parse(source)
    except (SyntaxError, ValueError):
        return set()
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.update(a.name.split(".")[0] for a in node.names)
        elif isinstance(node, ast.ImportFrom):
            if not node.level and node.module:
                names.add(node.module.split(".")[0])
    stdlib = sys.stdlib_module_names
    return {n for n in names if n not in stdlib}


def js_package(spec: str) -> str | None:
    if not spec or spec.startswith((".", "/")) or spec.startswith("node:"):
        return None
    parts = spec.split("/")
    name = f"{parts[0]}/{parts[1]}" if spec.startswith("@") and len(parts) > 1 and parts[1] else parts[0]
    return None if name in NODE_BUILTINS else name


def extract_js(source: str) -> set[str]:
    names = set()
    for match in _JS_SPEC_RE.finditer(source):
        name = js_package(next(g for g in match.groups() if g is not None))
        if name:
            names.add(name)
    return names


def walk_strings(node):
    """Yield (key, value) for every string in a nested JSON value."""
    if isinstance(node, dict):
        for key, value in node.items():
            yield from walk_strings(value) if not isinstance(value, str) else [(key, value)]
    elif isinstance(node, list):
        for item in node:
            yield from walk_strings(item)


def load_cache() -> dict:
    if os.environ.get("ATTESTER_IMPORT_CHECK_NO_CACHE"):
        return {}
    try:
        return json.loads(CACHE_PATH.read_text())
    except (OSError, ValueError):
        return {}


def save_cache(cache: dict) -> None:
    if os.environ.get("ATTESTER_IMPORT_CHECK_NO_CACHE"):
        return
    try:
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_text(json.dumps(cache))
    except OSError:
        pass


def oracle(package: str, ecosystem: str, cache: dict):
    """True/False answer, or None when unchecked (offline). Raises SystemExit-free
    sentinel string 'quota' is returned via the cache-neutral marker below."""
    key = f"{ecosystem}:{package}"
    entry = cache.get(key)
    now = time.time()
    if entry is not None:
        ttl = TTL_POSITIVE_S if entry.get("exists") else TTL_NEGATIVE_S
        if now - entry.get("ts", 0) < ttl:
            return entry.get("exists"), entry.get("adjacent_to") or []
    body = json.dumps({"ecosystem": ecosystem, "name": package}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/demo/v1/package/exists",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            info = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            return "quota", []
        return None, []
    except Exception:
        return None, []
    if "exists" not in info:
        return None, []
    cache[key] = {
        "exists": bool(info["exists"]),
        "adjacent_to": info.get("adjacent_to") or [],
        "ts": now,
    }
    save_cache(cache)
    return bool(info["exists"]), info.get("adjacent_to") or []


def load_allowlist() -> set[str]:
    path = Path.cwd() / ".attester-allowlist"
    if not path.is_file():
        return set()
    return {
        line.strip()
        for line in path.read_text(errors="replace").splitlines()
        if line.strip() and not line.strip().startswith("#")
    }


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (ValueError, OSError):
        return 0
    tool_input = payload.get("toolInput") or payload.get("tool_input") or {}

    filename = ""
    code_chunks: list[str] = []
    for key, value in walk_strings(tool_input):
        if not filename and key in PATH_KEYS and "/" in value or (
            not filename and key in PATH_KEYS and "." in value
        ):
            filename = value
        if len(value) > 15 and ("import" in value or "require(" in value):
            code_chunks.append(value)
    if not code_chunks:
        return 0

    ext = Path(filename).suffix.lower()
    candidates: dict[str, str] = {}  # package -> ecosystem
    if ext in JS_EXTS:
        for chunk in code_chunks:
            for name in extract_js(chunk):
                candidates.setdefault(name, "npm")
    elif ext in PY_EXTS or not ext:
        for chunk in code_chunks:
            for name in extract_python(chunk):
                candidates.setdefault(name, "pypi")
        if not ext:  # unknown file type: also try JS-style imports
            for chunk in code_chunks:
                for name in extract_js(chunk):
                    candidates.setdefault(name, "npm")
    if not candidates:
        return 0

    allowlist = load_allowlist()
    cache = load_cache()
    findings: list[tuple[str, str, list[str]]] = []
    warn_only = os.environ.get("ATTESTER_MODE", "block").lower() == "warn"
    try:
        for package in sorted(candidates):
            if package in allowlist:
                continue
            answer, adjacent = oracle(package, candidates[package], cache)
            if answer == "quota":
                print(
                    "attester-import-check: attester quota exhausted, unchecked",
                    file=sys.stderr,
                )
                return 0
            if answer is False:
                findings.append((package, candidates[package], adjacent))
    except Exception:
        return 0

    for package, ecosystem, adjacent in findings:
        registry = "PyPI" if ecosystem == "pypi" else "npm"
        msg = f"attester-import-check: '{package}' does not exist on {registry} (attester.dev oracle)."
        if adjacent:
            msg += f" Closest real name: {', '.join(adjacent)}."
        msg += " Remove or fix the import, or add the name to .attester-allowlist if this is a false positive."
        print(msg, file=sys.stderr)
    if findings and not warn_only:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
