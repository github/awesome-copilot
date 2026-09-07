#!/usr/bin/env python3
"""Map a repository's source files against its tests, so coverage gaps are evidence, not guesses.

Read-only. Standard library only. Writes nothing. Runs no tests.

    python coverage_map.py                    # text summary of the current repo
    python coverage_map.py --repo ../other    # a different repo
    python coverage_map.py --format json      # machine-readable
    python coverage_map.py --top 40           # more rows per section

Detects the test framework and naming convention, then matches each source file to
tests by basename, mirrored path, and — most importantly — by scanning what the test
files actually import. The import scan is what makes "no tests found for X" worth
reporting instead of merely plausible.

HEURISTIC. It cannot see coverage through indirection, fixtures, or end-to-end tests
that exercise a file without naming it. Treat an `untested` entry as a lead to confirm
by hand, never as a finding on its own.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GIT_TIMEOUT = 30
MAX_READ_BYTES = 400_000  # skip pathological files rather than stalling

IGNORED_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "vendor", "venv", ".venv", "env",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox",
    "dist", "build", "target", "out", ".next", ".nuxt", ".svelte-kit",
    ".idea", ".vscode", ".gradle", "Pods", ".terraform", "coverage",
}

SOURCE_EXTS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte",
    ".go", ".rs", ".rb", ".php", ".java", ".kt", ".swift", ".scala", ".cs", ".ex", ".exs", ".dart",
}

# Files that are configuration, generated, or entry-point glue rather than logic worth testing.
NON_LOGIC = re.compile(
    r"(^|/)(setup|conftest|__init__|index|main|migrations?|__generated__)\.[A-Za-z]+$"
    r"|\.(config|d)\.[A-Za-z]+$"
    r"|(^|/)(migrations|__generated__|generated|\.storybook)/",
    re.IGNORECASE,
)

TEST_PATH = re.compile(
    r"(^|/)(tests?|spec|specs|__tests__|e2e|integration|cypress|playwright)(/|$)"
    r"|(^|/)[^/]*[._-](test|spec)s?\.[A-Za-z0-9]+$"
    r"|(^|/)test_[^/]*\.[A-Za-z0-9]+$"
    r"|_test\.[A-Za-z0-9]+$",
    re.IGNORECASE,
)

# Framework marker -> label. Searched in manifests and config filenames.
FRAMEWORKS = {
    "vitest": "Vitest", "jest": "Jest", "mocha": "Mocha", "jasmine": "Jasmine",
    "@playwright/test": "Playwright", "cypress": "Cypress", "ava": "AVA",
    "@testing-library": "Testing Library", "karma": "Karma", "node:test": "node:test",
    "pytest": "pytest", "unittest": "unittest", "nose": "nose", "tox": "tox",
    "rspec": "RSpec", "minitest": "Minitest", "phpunit": "PHPUnit", "pest": "Pest",
    "junit": "JUnit", "testng": "TestNG", "go test": "go test", "cargo test": "cargo test",
    "xunit": "xUnit", "nunit": "NUnit", "exunit": "ExUnit",
}

ASSERTION_TOKENS = re.compile(
    r"\b(expect|assert|assert_|assertEqual|assertTrue|assertRaises|should|"
    r"toBe|toEqual|toThrow|toHaveBeenCalled|require\.Equal|assert\.|"
    r"refute|is_a|must_equal|shouldBe|verify)\b",
    re.IGNORECASE,
)
# Actual test cases only. `describe`, `context` and `class Test` are grouping
# constructs, and counting them inflates the case count -- a file with one it()
# inside one describe() would report two cases, which then skews the
# assertions-per-case ratio below.
TEST_CASE_TOKENS = re.compile(
    r"^\s*(it|test|def test_|func Test|scenario|@Test|it\.each|test\.each)\b",
    re.MULTILINE,
)

RISK_KEYWORDS = (
    "auth", "login", "session", "token", "password", "permission", "role", "admin",
    "billing", "payment", "invoice", "subscription", "checkout", "charge", "refund",
    "migration", "delete", "destroy", "export", "import", "webhook", "crypto", "wallet",
    "security", "secret", "upload",
)

# Import forms across the languages we handle. Group 1 is always the module reference.
IMPORT_RES = [
    re.compile(r"""(?:from|import)\s+['"]([^'"]+)['"]"""),          # JS/TS
    re.compile(r"""require\(\s*['"]([^'"]+)['"]\s*\)"""),            # CJS
    re.compile(r"""^\s*from\s+([A-Za-z0-9_.]+)\s+import""", re.M),   # Python from-import
    re.compile(r"""^\s*import\s+([A-Za-z0-9_.]+)""", re.M),          # Python/Java/Go import
    re.compile(r"""use\s+([A-Za-z0-9_:]+)"""),                       # Rust
    re.compile(r"""require(?:_relative)?\s+['"]([^'"]+)['"]"""),     # Ruby
]

warnings: list[str] = []


def run_git(args: list[str], repo: Path) -> str | None:
    git = shutil.which("git")
    if git is None:
        return None
    try:
        r = subprocess.run(
            [git, *args], cwd=str(repo), text=True, timeout=GIT_TIMEOUT,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            encoding="utf-8", errors="replace",
        )
    except (OSError, subprocess.SubprocessError) as exc:
        warnings.append(f"git {' '.join(args)} failed: {exc}")
        return None
    return r.stdout if r.returncode == 0 else None


def list_files(repo: Path) -> list[str]:
    out = run_git(["ls-files", "--cached", "--other", "--exclude-standard"], repo)
    if out is not None:
        files = [ln.strip() for ln in out.splitlines() if ln.strip()]
        if files:
            return sorted(files)
    warnings.append("git unavailable or empty index; using a filesystem walk (ignore rules approximated)")
    files = []
    for root, dirnames, filenames in os.walk(repo):
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS and not d.startswith(".")]
        for fn in filenames:
            files.append(Path(root, fn).relative_to(repo).as_posix())
    return sorted(files)


def read(path: Path) -> str:
    try:
        if path.stat().st_size > MAX_READ_BYTES:
            return ""
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def detect_frameworks(repo: Path, files: list[str]) -> list[str]:
    found: set[str] = set()
    haystacks: list[str] = []
    for name in ("package.json", "pyproject.toml", "requirements.txt", "Gemfile",
                 "composer.json", "pom.xml", "build.gradle", "mix.exs", "Cargo.toml"):
        for rel in [f for f in files if Path(f).name == name][:5]:
            haystacks.append(read(repo / rel).lower())
    config_names = " ".join(Path(f).name.lower() for f in files)
    haystacks.append(config_names)
    blob = "\n".join(haystacks)
    for marker, label in FRAMEWORKS.items():
        m = marker.lower()
        # Short bare words such as "ava", "nose" and "pest" substring-match inside
        # "available", "javascript" and so on, so require word boundaries for them.
        # Markers carrying punctuation ("@playwright/test", "node:test") are already
        # specific enough, and \b would not behave around those characters anyway.
        if m.isalnum():
            if re.search(rf"\b{re.escape(m)}\b", blob):
                found.add(label)
        elif m in blob:
            found.add(label)
    # Language-implied runners that need no manifest entry.
    if any(f.endswith("_test.go") for f in files):
        found.add("go test")
    if any(f.endswith(".rs") for f in files) and any("#[test]" in read(repo / f) for f in
                                                     [x for x in files if x.endswith(".rs")][:20]):
        found.add("cargo test")
    return sorted(found)


def infer_convention(test_files: list[str]) -> list[str]:
    patterns: Counter[str] = Counter()
    for rel in test_files:
        name = Path(rel).name
        if re.match(r"^test_.*\.py$", name):
            patterns["test_*.py"] += 1
        elif re.search(r"_test\.go$", name):
            patterns["*_test.go"] += 1
        elif re.search(r"\.(test|spec)\.[jt]sx?$", name):
            patterns[f"*.{'test' if '.test.' in name else 'spec'}.[jt]s(x)"] += 1
        elif re.search(r"_spec\.rb$", name):
            patterns["*_spec.rb"] += 1
        elif re.search(r"Test\.(java|kt|cs)$", name):
            patterns["*Test.{java,kt,cs}"] += 1
        if "__tests__/" in rel:
            patterns["__tests__/ directory"] += 1
        elif re.match(r"^tests?/", rel):
            patterns["tests/ directory"] += 1
        elif re.match(r"^spec/", rel):
            patterns["spec/ directory"] += 1
    return [f"{p} ({n})" for p, n in patterns.most_common()]


def module_tokens(rel: str) -> set[str]:
    """Identifiers by which a test might refer to this source file."""
    p = Path(rel)
    stem = p.stem
    tokens = {stem.lower()}
    # A component at foo/Button/index.tsx is referred to as "Button".
    if stem.lower() in ("index", "__init__", "mod"):
        tokens.add(p.parent.name.lower())
    tokens.add(rel.lower())
    tokens.add(p.with_suffix("").as_posix().lower())
    return {t for t in tokens if t and t not in ("", ".")}


def build(repo: Path, files: list[str]) -> dict:
    test_files = [f for f in files if TEST_PATH.search(f) and Path(f).suffix in SOURCE_EXTS]
    test_set = set(test_files)
    source_files = [
        f for f in files
        if Path(f).suffix in SOURCE_EXTS and f not in test_set and not NON_LOGIC.search(f)
    ]

    # Index what the tests import, plus every bare identifier they mention.
    imported: set[str] = set()
    mentioned: set[str] = set()
    weak: list[dict] = []
    for rel in test_files:
        text = read(repo / rel)
        if not text:
            continue
        for regex in IMPORT_RES:
            for m in regex.findall(text):
                ref = m.strip()
                imported.add(ref.lower())
                imported.add(Path(ref).name.lower())
                imported.add(Path(ref).stem.lower())
                for part in re.split(r"[./:\\]", ref):
                    if part and part not in (".", "..", "src", "lib", "app"):
                        mentioned.add(part.lower())
        assertions = len(ASSERTION_TOKENS.findall(text))
        cases = len(TEST_CASE_TOKENS.findall(text))
        lines = text.count("\n") + 1
        # A test file with cases but almost no assertions is usually asserting nothing useful.
        if cases and assertions <= max(1, cases // 4):
            weak.append({"path": rel, "test_cases": cases, "assertions": assertions, "lines": lines})

    # Test files whose filename itself marks them as a test, as opposed to files that
    # merely live under tests/ or e2e/ (fixtures, helpers, page objects, factories).
    named_test_re = re.compile(r"([._-](test|spec)s?$)|(^test_)|(^test$)", re.IGNORECASE)
    named_tests = [t for t in test_files if named_test_re.search(Path(t).stem)]

    matched: dict[str, list[str]] = {}
    untested: list[dict] = []
    for rel in source_files:
        tokens = module_tokens(rel)
        how: list[str] = []

        stem = Path(rel).stem.lower()
        mirror = Path(rel).with_suffix("").as_posix().lower()

        # 1. a test file whose *own name* carries a test marker and embeds this file's name.
        #    Requiring the marker matters: a helper like e2e/lib/api.mjs is classified as a
        #    test file because of its directory, and would otherwise "cover" every api.js
        #    in the repo. A false match here hides a real gap, so keep this rule strict.
        for t in named_tests:
            tl = Path(t).stem.lower()
            if tl in {f"{stem}test", f"test{stem}", f"{stem}spec", f"{stem}_test",
                      f"test_{stem}", f"{stem}.test", f"{stem}.spec"} or \
               re.sub(r"[._-]?(test|spec)s?$", "", tl) == stem:
                how.append(f"name match: {t}")
                break
        # 2. mirrored directory layout, e.g. src/a/b.ts -> tests/a/b.test.ts
        if not how:
            tail = "/".join(mirror.split("/")[1:]) if "/" in mirror else mirror
            if tail and any(tail in t.lower() for t in test_files):
                how.append("mirrored path match")
        # 3. a test actually imports it
        if not how and (tokens & imported):
            how.append("imported by a test")
        # 4. weakest signal: a test mentions the identifier
        if not how and stem in mentioned and len(stem) > 3:
            how.append("mentioned in a test (weak signal)")

        if how:
            matched[rel] = how
        else:
            lines = read(repo / rel).count("\n") + 1
            hits = [k for k in RISK_KEYWORDS if k in rel.lower()]
            untested.append({
                "path": rel,
                "lines": lines,
                "dir": str(Path(rel).parent).replace("\\", "/"),
                "risk_keywords": hits,
            })

    untested.sort(key=lambda x: (not x["risk_keywords"], -x["lines"]))
    weak.sort(key=lambda x: -x["test_cases"])

    by_dir: dict[str, dict] = defaultdict(lambda: {"untested": 0, "lines": 0})
    for u in untested:
        by_dir[u["dir"]]["untested"] += 1
        by_dir[u["dir"]]["lines"] += u["lines"]

    return {
        "repo": str(repo),
        "frameworks": detect_frameworks(repo, files),
        "conventions": infer_convention(test_files),
        "totals": {
            "source_files": len(source_files),
            "test_files": len(test_files),
            "matched": len(matched),
            "untested": len(untested),
            "coverage_ratio": round(len(matched) / len(source_files), 3) if source_files else None,
        },
        "untested": untested,
        "untested_by_directory": sorted(
            ({"dir": d, **v} for d, v in by_dir.items()),
            key=lambda x: -x["untested"],
        ),
        "weak_tests": weak,
        "matched_sample": [{"path": p, "why": w} for p, w in list(matched.items())[:15]],
        "warnings": warnings,
    }


def truncate(items: list, limit: int, label: str, out: list[str]) -> list:
    if len(items) > limit:
        out.append(f"  TRUNCATED: showing top {limit} of {len(items)} {label}")
        return items[:limit]
    return items


def render(d: dict, top: int) -> str:
    t = d["totals"]
    L = ["# Test Coverage Map", "", f"Repo: {d['repo']}"]
    ratio = f"{t['coverage_ratio']:.0%}" if t["coverage_ratio"] is not None else "n/a"
    L.append(f"Source files: {t['source_files']}   Test files: {t['test_files']}   "
             f"Matched: {t['matched']} ({ratio})   Unmatched: {t['untested']}")
    L.append("")
    L.append(f"Frameworks detected: {', '.join(d['frameworks']) or 'none detected'}")
    L.append(f"Naming conventions: {', '.join(d['conventions']) or 'none inferred'}")
    L.append("")

    L.append("## Unmatched source files (risk-flagged first, then largest)")
    if d["untested"]:
        for u in truncate(d["untested"], top, "unmatched files", L):
            flag = f"  [risk: {', '.join(u['risk_keywords'])}]" if u["risk_keywords"] else ""
            L.append(f"- {u['path']}: {u['lines']} lines{flag}")
    else:
        L.append("- none; every source file matched at least one test signal")
    L.append("")

    L.append("## Unmatched by directory")
    for row in truncate(d["untested_by_directory"], top, "directories", L):
        L.append(f"- {row['dir']}: {row['untested']} files, {row['lines']} lines")
    L.append("")

    L.append("## Test files with test cases but few assertions")
    if d["weak_tests"]:
        for w in truncate(d["weak_tests"], top, "test files", L):
            L.append(f"- {w['path']}: {w['test_cases']} cases, {w['assertions']} assertions")
    else:
        L.append("- none flagged")
    L.append("")

    if d["warnings"]:
        L.append("## Warnings")
        L.extend(f"- {w}" for w in d["warnings"])
        L.append("")

    L.append("HEURISTIC MATCHER. An unmatched file is a lead, not a finding: coverage through")
    L.append("fixtures, end-to-end tests, or indirection is invisible here. Confirm by grepping for")
    L.append("the module name before reporting anything as P0 or P1.")
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser(description="Map source files against tests. Read-only.")
    ap.add_argument("--repo", default=".", help="Path inside the repository.")
    ap.add_argument("--format", choices=["text", "json"], default="text", help="Output format.")
    ap.add_argument("--top", type=int, default=25, help="Rows per section. Default 25.")
    ap.add_argument(
        "--no-git-root",
        action="store_true",
        help=(
            "Treat --repo literally instead of expanding to the enclosing git repository root. "
            "Use this to scope the survey to one package or subdirectory of a monorepo."
        ),
    )
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    if not repo.is_dir():
        print(f"error: not a directory: {repo}", file=sys.stderr)
        return 2
    if not args.no_git_root:
        root = run_git(["rev-parse", "--show-toplevel"], repo)
        if root and root.strip():
            repo = Path(root.strip()).resolve()

    files = list_files(repo)
    if not files:
        print(f"error: no files found under {repo}", file=sys.stderr)
        return 2

    data = build(repo, files)
    print(json.dumps(data, indent=2) if args.format == "json" else render(data, args.top))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
