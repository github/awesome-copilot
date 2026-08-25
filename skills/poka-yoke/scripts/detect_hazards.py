#!/usr/bin/env python3
"""Heuristic detector for poka-yoke hazards, shapes in code that make mistakes easy.

This is a fast first pass, not an oracle. It finds textually-detectable hazards so a
reviewer can spend their attention on the interface-level questions a regex cannot ask.
Expect real false positives; every hit is a question, not a verdict.

Hazard IDs match references/hazard-catalog.md. Standard library only.

Examples:
    detect_hazards.py --diff                  # uncommitted changes, changed lines only
    detect_hazards.py --staged                # staged changes
    detect_hazards.py --since HEAD~10         # last 10 commits
    detect_hazards.py --paths src/ lib/       # explicit paths
    detect_hazards.py --diff --severity high  # only the ones that bite hardest
    detect_hazards.py --paths . --json        # machine-readable
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------------------
# Rule definitions
# --------------------------------------------------------------------------------------

PY = {".py", ".pyi"}
TS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
GO = {".go"}
RS = {".rs"}
SQL = {".sql"}
ALL_EXTS = PY | TS | GO | RS | SQL

LENS = {"C": "contact", "F": "fixed-value", "M": "motion-step", "X": "removed-device"}


@dataclass(frozen=True)
class Rule:
    id: str
    name: str
    severity: str  # high | medium | low
    exts: frozenset
    pattern: re.Pattern
    device: str
    negate: re.Pattern | None = None  # if this also matches the line, skip


def R(id, name, severity, exts, pattern, device, negate=None, flags=0):
    return Rule(
        id=id,
        name=name,
        severity=severity,
        exts=frozenset(exts),
        pattern=re.compile(pattern, flags),
        device=device,
        negate=re.compile(negate, flags) if negate else None,
    )


RULES: list[Rule] = [
    # ---- X: devices that were removed -------------------------------------------------
    R("X1", "Swallowed error", "high", TS,
      r"catch\s*(\([^)]*\))?\s*\{\s*\}",
      "Handle it or let it propagate; catching to do nothing turns a loud failure quiet."),
    R("X1", "Swallowed error", "high", TS,
      r"\.catch\s*\(\s*\(\s*\)\s*=>\s*(\{\s*\}|null|undefined)\s*\)",
      "Handle the rejection or let it propagate."),
    R("X1", "Bare except", "high", PY,
      r"^\s*except\s*:",
      "Catch the specific exception; bare except also swallows KeyboardInterrupt/SystemExit."),
    R("X1", "Discarded error return", "high", GO,
      r",\s*_\s*:?=\s*\w|^\s*_\s*=\s*\w[\w.]*\(",
      "Check the error. Enable errcheck in golangci-lint to make this a build failure."),
    R("X2", "Unwrap / expect on a fallible value", "medium", RS,
      r"\.(unwrap|expect)\s*\(",
      "Propagate with ? or handle the error; deny clippy::unwrap_used."),
    R("X2", "Silent default on error", "medium", RS,
      r"\.unwrap_or_default\s*\(\s*\)",
      "A default on an error path hides the failure; branch on the error explicitly."),
    R("X2", "parseInt without radix", "medium", TS,
      r"parseInt\s*\(\s*[^,)]+\)",
      "Pass the radix and check for NaN, or use a schema parse at the boundary."),
    R("X3", "Focused test disables the suite", "high", TS,
      r"\b(it|test|describe|context)\.only\s*\(|\bfdescribe\s*\(|\bfit\s*\(",
      "Remove before merge; fail CI on focused tests."),
    R("X3", "Skipped test", "medium", PY,
      r"@pytest\.mark\.skip|@unittest\.skip",
      "A skipped test is a detection device switched off. Fix or delete it."),
    R("X3", "Skipped test", "medium", TS,
      r"\b(it|test|describe)\.skip\s*\(|\bxit\s*\(|\bxdescribe\s*\(",
      "A skipped test is a detection device switched off. Fix or delete it."),
    R("X3", "Skipped test", "medium", GO, r"\bt\.Skip\s*\(",
      "A skipped test is a detection device switched off. Fix or delete it."),
    R("X3", "Skipped test", "medium", RS, r"^\s*#\[ignore\]",
      "A skipped test is a detection device switched off. Fix or delete it."),
    R("X4", "Type-checker suppression", "medium", TS,
      r"@ts-ignore|@ts-nocheck|\bas\s+unknown\s+as\b|eslint-disable(?!-next-line\s+\S+\s+--)",
      "Each suppression is a hole in the guarantee. Require a reason and an issue link."),
    R("X4", "Explicit any", "medium", TS,
      r":\s*any\b|<any>|Array<any>|as\s+any\b",
      "any disables the type system exactly where guarantees matter. Parse at the boundary."),
    R("X4", "Type-checker suppression", "medium", PY,
      r"#\s*type:\s*ignore(?!\[)",
      "Narrow it to a specific error code and add a reason."),
    R("X4", "Untyped container", "low", GO,
      r"\binterface\{\}|\bany\b\s*[,)\]]",
      "Prefer a concrete type or a constrained generic."),
    R("X4", "unsafe block", "medium", RS, r"\bunsafe\s*\{",
      "Require a // SAFETY: comment stating the invariant being upheld."),
    R("X5", "Mutable default argument", "high", PY,
      r"def\s+\w+\s*\([^)]*=\s*(\[\s*\]|\{\s*\}|set\s*\(\s*\))",
      "Use None and construct inside the function; the default is shared across all calls."),

    # ---- F: fixed-value ---------------------------------------------------------------
    R("F2", "Unbounded DELETE", "high", SQL | PY | TS | GO | RS,
      r"\bDELETE\s+FROM\b(?!.*\bWHERE\b)",
      "Require a WHERE clause; refuse an empty predicate.", flags=re.I),
    R("F2", "Unbounded UPDATE", "high", SQL | PY | TS | GO | RS,
      r"\bUPDATE\s+[\w.\"`\[\]]+\s+SET\b(?!.*\bWHERE\b)",
      "Require a WHERE clause; refuse an empty predicate.", flags=re.I),
    R("F2", "Destructive DDL", "high", SQL | PY | TS | GO | RS,
      r"\b(DROP\s+(TABLE|COLUMN|DATABASE|SCHEMA)|TRUNCATE\s+TABLE)\b",
      "Use expand/contract; gate destructive DDL behind an explicit CI acknowledgment.",
      flags=re.I),
    R("F2", "Bulk delete", "high", TS | PY,
      r"\.(deleteMany|delete_many|destroy_all|delete_all|drop_all|removeMany)\s*\(\s*\)",
      "Refuse an empty filter; cap the affected count and require confirmation above it."),
    R("F2", "Recursive force remove", "high", ALL_EXTS,
      r"rm\s+-[a-zA-Z]*[rR][a-zA-Z]*f|rm\s+-[a-zA-Z]*f[a-zA-Z]*[rR]",
      "Validate the path is non-empty and inside the expected root before deleting."),
    R("F4", "Config read away from startup", "medium", PY,
      r"os\.(getenv|environ)",
      "Parse the whole config into a typed object at startup so a missing key fails the deploy.",
      negate=r"(settings|config|conf|env)\.py"),
    R("F4", "Config read away from startup", "medium", TS,
      r"process\.env\.\w+",
      "Parse the whole config into a typed object at startup so a missing key fails the deploy.",
      negate=r"(config|env|settings)\.(ts|js)"),
    R("F7", "Unbounded read", "low", PY | TS,
      r"\.read\s*\(\s*\)|\.readAll\s*\(|ioutil\.ReadAll",
      "Cap the size at the boundary; an unbounded read is a resource-exhaustion incident."),

    # ---- C: contact -------------------------------------------------------------------
    R("C2", "Boolean flag parameter", "medium", TS,
      r"\b\w+\s*:\s*boolean\s*[,)]",
      "Use an enum, a named options object, or two functions; booleans are unreadable at the call site."),
    R("C2", "Boolean flag parameter", "medium", GO,
      r"func\s+\w+\s*\([^)]*\bbool\b[^)]*\)",
      "Use a named option type; a bare bool is unreadable at the call site."),
    R("C2", "Boolean default parameter", "medium", PY,
      r"def\s+\w+\s*\([^)]*\b\w+\s*(:\s*bool\s*)?=\s*(True|False)",
      "Use an enum, or at minimum make it keyword-only so the name appears at the call site."),
    R("C5", "Duration without a unit", "medium", TS | GO | PY,
      r"\b(timeout|delay|interval|ttl|expiry|duration|retryAfter|retry_after)\s*:?\s*(number|int|float|=\s*\d+)",
      "Encode the unit in the type (Duration) or in the name (timeoutMs). Unit mismatches are silent."),
    R("C6", "Money as a float", "high", PY | TS | GO | RS,
      r"\b(price|amount|total|balance|cost|fee|subtotal|revenue)\w*\s*:\s*(float|number|f32|f64)\b"
      r"|\bfloat\s*\(\s*\w*(price|amount|total|balance)",
      "Use integer minor units in a Money type carrying its currency, or a decimal type."),
    R("C7", "Unvalidated parse", "high", TS,
      r"JSON\.parse\s*\(",
      "Parse into a schema (zod/valibot) at the boundary; JSON.parse returns any."),
    R("C7", "Unvalidated request body", "high", PY,
      r"(request|req)\.(json|get_json)\s*\(\s*\)(?!\s*\))",
      "Parse into a Pydantic model with extra='forbid' so unknown or missing fields fail loudly."),
    R("C9", "Naive datetime", "medium", PY,
      r"datetime\.utcnow\s*\(\s*\)|datetime\.now\s*\(\s*\)",
      "Use datetime.now(timezone.utc), and inject a clock so time is testable."),

    # ---- M: motion-step ---------------------------------------------------------------
    R("M4", "Unmanaged resource", "medium", PY,
      r"^\s*(\w+\s*=\s*)?open\s*\(",
      "Use a context manager; the error path will leak otherwise.",
      negate=r"\bwith\b"),
    R("M6", "Dangling async task", "high", PY,
      r"^\s*(await\s+)?asyncio\.create_task\s*\(",
      "Keep a reference; an unreferenced task can be garbage collected mid-flight (ruff RUF006).",
      negate=r"=\s*(await\s+)?asyncio\.create_task"),
    R("M6", "Unawaited promise-returning call", "low", TS,
      r"^\s*\w+\.(save|update|create|delete|insert|write|send|publish|commit)\s*\(",
      "If this returns a promise, await it: a floating write is silently lost. "
      "Enable @typescript-eslint/no-floating-promises.",
      negate=r"\b(await|return|yield|void)\b|\.then\(|=\s"),
    R("M2", "Retryable effect without an idempotency key", "high", ALL_EXTS,
      r"\b(def|func|function|fn|async\s+function)\s+\w*(charge|refund|capture|payout|transfer|"
      r"sendEmail|send_email|publish|notify)\w*\s*[(<]",
      "Require an idempotency key parameter, backed by a unique constraint on (entity, key).",
      negate=r"idempot", flags=re.I),
    R("M1", "Two-phase construction", "medium", ALL_EXTS,
      r"\b(def|func|function|fn)\s+(init|initialize|connect|setup|configure|start)\s*[(<]",
      "Have the constructor or a factory return a ready object, or use typestate; "
      "'call this first' is not enforceable.",
      negate=r"__init__|func\s+init\s*\(\s*\)\s*\{"),

    # ---- F1: exhaustiveness -----------------------------------------------------------
    R("F1", "Wildcard match arm", "medium", RS,
      r"^\s*_\s*=>",
      "In domain logic a wildcard turns a future compile error into a silent fallthrough."),
    R("F1", "Switch without exhaustiveness check", "low", TS,
      r"^\s*switch\s*\(",
      "Add a default arm calling assertNever(x: never) so a new variant breaks the build."),
    R("F1", "Switch without a default", "low", GO,
      r"^\s*switch\s+\w+\s*\{",
      "Enable the 'exhaustive' linter with default-signifies-exhaustive: false."),
]

# Rules a real linter already does better. They stay available behind --all for repos that
# do not run those linters, but they are off by default: a tool that does eight things
# nothing else does is more useful than one doing forty things worse. The value here is the
# pointer, knowing which linter to enable beats a second-rate reimplementation of it.
COVERED_BY: dict[tuple[str, str], str] = {
    ("X1", "Swallowed error"): "eslint no-empty",
    ("X1", "Bare except"): "ruff E722",
    ("X1", "Discarded error return"): "golangci-lint errcheck",
    ("X2", "Unwrap / expect on a fallible value"): "clippy::unwrap_used",
    ("X2", "Silent default on error"): "clippy",
    ("X2", "parseInt without radix"): "eslint radix",
    ("X3", "Focused test disables the suite"): "eslint jest/no-focused-tests",
    ("X3", "Skipped test"): "eslint jest/no-disabled-tests",
    ("X4", "Type-checker suppression"): "@typescript-eslint/ban-ts-comment, mypy --strict",
    ("X4", "Explicit any"): "@typescript-eslint/no-explicit-any",
    ("X4", "Untyped container"): "golangci-lint",
    ("X4", "unsafe block"): "clippy",
    ("X5", "Mutable default argument"): "ruff B006",
    ("C9", "Naive datetime"): "ruff DTZ",
    ("M4", "Unmanaged resource"): "ruff SIM115",
    ("M6", "Dangling async task"): "ruff RUF006",
    ("F1", "Wildcard match arm"): "clippy::wildcard_enum_match_arm",
    ("F7", "Unbounded read"): "",
    ("F3", "assert used for validation"): "ruff S101",
    ("C6", "Equality comparison on a float"): "ruff PLR0133",
}


def covered(rule_id: str, name: str) -> str:
    return COVERED_BY.get((rule_id, name), "")


# --------------------------------------------------------------------------------------
# AST pass (Python only), catches what regexes can't see
# --------------------------------------------------------------------------------------


def python_ast_findings(path: Path, source: str) -> list[dict]:
    """Structural checks that need real parsing: adjacent same-type params, assert-as-
    validation, and equality comparison on floats."""
    out = []
    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError:
        return out

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            args = node.args.posonlyargs + node.args.args
            # skip self/cls
            if args and args[0].arg in ("self", "cls"):
                args = args[1:]
            annotated = [(a.arg, ast.unparse(a.annotation)) for a in args if a.annotation]
            for i in range(len(annotated) - 1):
                (n1, t1), (n2, t2) = annotated[i], annotated[i + 1]
                if t1 == t2 and t1 in ("str", "int", "float", "bytes", "bool", "UUID"):
                    out.append({
                        "id": "C1",
                        "name": "Adjacent same-type parameters",
                        "severity": "high",
                        "line": node.lineno,
                        "snippet": f"def {node.name}(..., {n1}: {t1}, {n2}: {t2}, ...)",
                        "device": f"'{n1}' and '{n2}' are both {t1} and can be swapped silently. "
                                  "Use NewType per concept, or make them keyword-only.",
                    })
            # positional args on a wide signature
            if len(args) >= 4 and not node.args.kwonlyargs:
                out.append({
                    "id": "C1",
                    "name": "Wide positional signature",
                    "severity": "low",
                    "line": node.lineno,
                    "snippet": f"def {node.name}({len(args)} positional params)",
                    "device": "Make parameters keyword-only with '*' so names appear at the call site.",
                })

        elif isinstance(node, ast.Assert):
            out.append({
                "id": "F3",
                "name": "assert used for validation",
                "severity": "medium",
                "line": node.lineno,
                "snippet": ast.unparse(node)[:100],
                "device": "assert is stripped under python -O. Raise an explicit exception instead.",
            })

        elif isinstance(node, ast.Compare):
            for op in node.ops:
                if isinstance(op, (ast.Eq, ast.NotEq)):
                    src = ast.unparse(node)
                    if re.search(r"\d+\.\d+", src):
                        out.append({
                            "id": "C6",
                            "name": "Equality comparison on a float",
                            "severity": "medium",
                            "line": node.lineno,
                            "snippet": src[:100],
                            "device": "Use math.isclose, or a Decimal/integer-minor-unit type.",
                        })
    return out


# --------------------------------------------------------------------------------------
# File and diff collection
# --------------------------------------------------------------------------------------

SKIP_DIRS = {
    ".git", "node_modules", "vendor", "dist", "build", "target", "__pycache__",
    ".venv", "venv", ".tox", ".mypy_cache", ".pytest_cache", ".next", "coverage",
    ".terraform", "site-packages",
}


def git(*args: str, cwd: Path) -> str:
    try:
        r = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, timeout=30)
        return r.stdout if r.returncode == 0 else ""
    except (subprocess.SubprocessError, FileNotFoundError):
        return ""


def changed_files_and_lines(cwd: Path, mode: str, since: str | None):
    """Return {path: set(changed_line_numbers)}. Empty set means 'whole file'."""
    if mode == "staged":
        diff_args = ["diff", "--cached", "-U0"]
    elif mode == "since":
        diff_args = ["diff", f"{since}..HEAD", "-U0"]
    else:
        diff_args = ["diff", "HEAD", "-U0"]

    raw = git(*diff_args, cwd=cwd)
    if not raw.strip() and mode == "diff":
        # Clean tree, fall back to recent commits, which is what the user usually means.
        raw = git("diff", "HEAD~5..HEAD", "-U0", cwd=cwd)

    result: dict[str, set[int]] = {}
    current = None
    for line in raw.splitlines():
        if line.startswith("+++ b/"):
            current = line[6:]
            result.setdefault(current, set())
        elif line.startswith("@@") and current:
            m = re.search(r"\+(\d+)(?:,(\d+))?", line)
            if m:
                start = int(m.group(1))
                count = int(m.group(2) or 1)
                result[current].update(range(start, start + count))
    return {k: v for k, v in result.items() if v}


def collect_paths(roots: list[str]) -> list[Path]:
    out = []
    for root in roots:
        p = Path(root)
        if p.is_file():
            if p.suffix in ALL_EXTS:
                out.append(p)
        elif p.is_dir():
            for dirpath, dirnames, filenames in os.walk(p):
                dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
                for fn in filenames:
                    fp = Path(dirpath) / fn
                    if fp.suffix in ALL_EXTS:
                        out.append(fp)
    return out


# --------------------------------------------------------------------------------------
# Scanning
# --------------------------------------------------------------------------------------

COMMENT_ONLY = re.compile(r"^\s*(//|#|/\*|\*|--)")


def scan_file(path: Path, only_lines: set[int] | None) -> list[dict]:
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except (OSError, UnicodeDecodeError):
        return []
    if len(source) > 2_000_000:
        return []

    findings = []
    ext = path.suffix
    lines = source.splitlines()

    for lineno, line in enumerate(lines, 1):
        if only_lines and lineno not in only_lines:
            continue
        if COMMENT_ONLY.match(line) or len(line) > 500:
            continue
        for rule in RULES:
            if ext not in rule.exts:
                continue
            if not INCLUDE_COVERED and covered(rule.id, rule.name):
                continue
            if rule.negate and (rule.negate.search(line) or rule.negate.search(str(path))):
                continue
            if rule.pattern.search(line):
                findings.append({
                    "id": rule.id,
                    "name": rule.name,
                    "severity": rule.severity,
                    "line": lineno,
                    "snippet": line.strip()[:120],
                    "device": rule.device,
                })

    if ext in PY:
        for f in python_ast_findings(path, source):
            if not INCLUDE_COVERED and covered(f["id"], f["name"]):
                continue
            if not only_lines or f["line"] in only_lines:
                findings.append(f)

    for f in findings:
        f["file"] = str(path)
        f["lens"] = LENS.get(f["id"][0], "unknown")
    return findings


# --------------------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------------------

INCLUDE_COVERED = False

SEV_ORDER = {"high": 0, "medium": 1, "low": 2}
COLOR = {"high": "\033[31m", "medium": "\033[33m", "low": "\033[90m"}
RESET = "\033[0m"


def render(findings: list[dict], scope: str, use_color: bool) -> str:
    if not findings:
        return f"No hazards detected in {scope}.\n\nThe lenses still apply, run them by hand:\n" \
               "  contact:     can the wrong thing fit?\n" \
               "  fixed-value: can an incomplete or wrong-sized set pass?\n" \
               "  motion-step: can the steps happen in the wrong order?"

    findings.sort(key=lambda f: (SEV_ORDER[f["severity"]], f["file"], f["line"]))
    counts = {"high": 0, "medium": 0, "low": 0}
    for f in findings:
        counts[f["severity"]] += 1

    out = [
        f"Poka-yoke hazard scan, {scope}",
        f"{counts['high']} high · {counts['medium']} medium · {counts['low']} low",
        "",
        "Heuristics with real false positives. Read the surrounding code before acting.",
        "",
    ]

    grouped: dict[str, list[dict]] = {}
    for f in findings:
        grouped.setdefault(f"{f['id']} {f['name']}", []).append(f)

    for key, group in sorted(grouped.items(), key=lambda kv: SEV_ORDER[kv[1][0]["severity"]]):
        sev = group[0]["severity"]
        tag = f"{COLOR[sev]}{sev.upper():<6}{RESET}" if use_color else f"{sev.upper():<6}"
        out.append(f"{tag} {key}  ({group[0]['lens']} lens, {len(group)} site"
                   f"{'s' if len(group) > 1 else ''})")
        out.append(f"       device: {group[0]['device']}")
        for f in group[:8]:
            out.append(f"       {f['file']}:{f['line']}  {f['snippet']}")
        if len(group) > 8:
            out.append(f"       … and {len(group) - 8} more")
        out.append("")

    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Detect poka-yoke hazards, shapes in code that make mistakes easy.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Examples:")[-1],
    )
    src = ap.add_mutually_exclusive_group()
    src.add_argument("--diff", action="store_true",
                     help="scan uncommitted changes (falls back to HEAD~5..HEAD if clean)")
    src.add_argument("--staged", action="store_true", help="scan staged changes")
    src.add_argument("--since", metavar="REF", help="scan changes since REF (e.g. HEAD~10)")
    src.add_argument("--paths", nargs="+", metavar="PATH", help="scan these files or directories")
    ap.add_argument("--severity", choices=["high", "medium", "low"], default="low",
                    help="minimum severity to report (default: low)")
    ap.add_argument("--id", nargs="+", metavar="ID",
                    help="only report these hazard IDs (e.g. --id C1 F2 M2)")
    ap.add_argument("--all", action="store_true", dest="include_covered",
                    help="also run the rules a real linter does better (off by default)")
    ap.add_argument("--json", action="store_true", help="emit JSON")
    ap.add_argument("--repo", default=".", help="repository root (default: .)")
    args = ap.parse_args()

    global INCLUDE_COVERED
    INCLUDE_COVERED = args.include_covered
    repo = Path(args.repo).resolve()
    findings: list[dict] = []

    # poka-yoke: an empty scan reports itself instead of looking like a clean bill of health [control]
    scanned = 0

    if args.paths:
        scope = f"paths: {', '.join(args.paths)}"
        for p in collect_paths(args.paths):
            scanned += 1
            findings += scan_file(p, None)
        if scanned == 0:
            # Zero findings from zero files is not an all-clear, and it used to be
            # indistinguishable from one. Exit non-zero: failing to do the job should
            # not look like doing the job and finding nothing.
            msg = ("Scanned 0 files. This is NOT an all-clear.\n"
                   f"Nothing under {', '.join(args.paths)} has a supported extension.\n"
                   f"Supported: {', '.join(sorted(ALL_EXTS))}")
            print(json.dumps({"scope": scope, "files_scanned": 0, "count": 0,
                              "findings": [], "error": msg}, indent=2)
                  if args.json else msg, file=sys.stdout if args.json else sys.stderr)
            return 2
    else:
        mode = "staged" if args.staged else ("since" if args.since else "diff")
        scope = {"staged": "staged changes",
                 "since": f"changes since {args.since}",
                 "diff": "uncommitted changes"}[mode]
        changed = changed_files_and_lines(repo, mode, args.since)
        if not changed:
            msg = ("No changed files found. The tree may be clean and have no recent commits, "
                   "or this may not be a git repository.\nUse --paths to scan explicitly, "
                   "e.g. detect_hazards.py --paths src/")
            print(json.dumps({"findings": [], "note": msg}) if args.json else msg)
            return 0
        for rel, lines in changed.items():
            fp = repo / rel
            if fp.suffix in ALL_EXTS and fp.exists():
                scanned += 1
                findings += scan_file(fp, lines)

    threshold = SEV_ORDER[args.severity]
    findings = [f for f in findings if SEV_ORDER[f["severity"]] <= threshold]
    if args.id:
        wanted = {i.upper() for i in args.id}
        findings = [f for f in findings if f["id"] in wanted]

    if args.json:
        print(json.dumps({"scope": scope, "files_scanned": scanned,
                          "count": len(findings), "findings": findings}, indent=2))
    else:
        print(render(findings, scope, use_color=sys.stdout.isatty()))
        print(f"\nScanned {scanned} file{'' if scanned == 1 else 's'}.")
        if not INCLUDE_COVERED:
            tools = sorted({v.split(",")[0].split()[0] for v in COVERED_BY.values() if v})
            # len(COVERED_BY) counts ENTRIES, and one entry can suppress several
            # per-language rules, so it under-reported by three. Count the rules.
            n_suppressed = sum(1 for r in RULES if (r.id, r.name) in COVERED_BY)
            print(f"\nNot checked here, {n_suppressed} further hazard rules are covered "
                  f"better by {', '.join(tools)}.\nEnable those rather than relying on this: "
                  f"see assets/devices/lint/. Use --all to run them anyway.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
