#!/usr/bin/env python3
"""Read-only inventory and overlap/risk indicator scan for agent skills."""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Iterable


SKIP_DIRS = {
    ".git",
    ".archive",
    ".curator_backups",
    ".hub",
    "__pycache__",
    "node_modules",
}
SCRIPT_SUFFIXES = {".py", ".sh", ".js", ".ts", ".mjs", ".cjs", ".ps1", ".rb", ".go"}
STOPWORDS = {
    "about", "agent", "agents", "also", "and", "any", "are", "can", "for", "from",
    "help", "into", "its", "other", "skill", "skills", "that", "the", "their", "this",
    "through", "tool", "tools", "use", "user", "users", "using", "when", "with", "workflow",
    "一个", "一款", "一些", "什么", "可以", "帮我", "技能", "我想", "有没有", "这个", "这件",
}
RISK_PATTERNS = {
    "destructive-command": re.compile(r"\brm\s+-[^\n]*r[^\n]*f|git\s+reset\s+--hard|shutil\.rmtree", re.I),
    "credential-or-secret-access": re.compile(
        r"\.ssh\b|\.aws\b|keychain|credential|cookie|secret|api[_-]?key|\.env\b|os\.environ", re.I
    ),
    "network-or-download": re.compile(
        r"\bcurl\b|\bwget\b|requests\.|httpx\.|urllib\.|fetch\s*\(|https?://", re.I
    ),
    "dynamic-or-obfuscated-execution": re.compile(
        r"base64[^\n]{0,80}(decode|-d)|\beval\s*\(|\bexec\s*\(|child_process|subprocess\.", re.I
    ),
    "persistence-or-system-service": re.compile(r"\bcrontab\b|\blaunchctl\b|systemctl\s+enable|launchagents", re.I),
    "privilege-or-broad-permission": re.compile(r"\bsudo\b|chmod\s+777|chown\s+-R", re.I),
    "external-mutation-language": re.compile(
        r"\b(publish|send|upload|delete|remove|purchase|comment|post)\b|发布|发送|上传|删除|购买|评论", re.I
    ),
    "possible-hardcoded-token": re.compile(r"\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{12,}\b|\bAKIA[A-Z0-9]{12,}\b"),
}


def parse_frontmatter(text: str) -> tuple[dict[str, str], list[str]]:
    issues: list[str] = []
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, ["missing opening frontmatter delimiter"]
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        return {}, ["missing closing frontmatter delimiter"]

    data: dict[str, str] = {}
    i = 1
    while i < end:
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", lines[i])
        if not match:
            i += 1
            continue
        key, raw = match.group(1), match.group(2).strip()
        if raw in {">", "|"}:
            mode = raw
            block: list[str] = []
            i += 1
            while i < end and (not lines[i].strip() or lines[i][:1].isspace()):
                block.append(lines[i].strip())
                i += 1
            data[key] = (" " if mode == ">" else "\n").join(part for part in block if part)
            continue
        if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in {'"', "'"}:
            raw = raw[1:-1]
        data[key] = raw
        i += 1

    if not data.get("name"):
        issues.append("missing name")
    if not data.get("description"):
        issues.append("missing description")
    return data, issues


def iter_skill_files(root: Path) -> Iterable[Path]:
    for current, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        if "SKILL.md" in files:
            yield Path(current) / "SKILL.md"


def tokenize(text: str) -> set[str]:
    tokens = {
        token for token in re.findall(r"[a-z][a-z0-9-]{2,}", text.lower())
        if token not in STOPWORDS
    }
    for run in re.findall(r"[\u3400-\u9fff]{2,}", text):
        if len(run) <= 8 and run not in STOPWORDS:
            tokens.add(run)
        tokens.update(run[i:i + 2] for i in range(len(run) - 1) if run[i:i + 2] not in STOPWORDS)
    return set(sorted(tokens)[:120])


def scan_indicators(skill_dir: Path) -> list[dict[str, object]]:
    findings: dict[tuple[str, str], int] = {}
    candidates = [skill_dir / "SKILL.md"]
    for current, dirs, files in os.walk(skill_dir, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        for filename in files:
            path = Path(current) / filename
            if path == skill_dir / "SKILL.md":
                continue
            if path.suffix.lower() in SCRIPT_SUFFIXES or filename in {"package.json", "pyproject.toml"}:
                candidates.append(path)

    for path in sorted(set(candidates))[:250]:
        try:
            if path.is_symlink() or path.stat().st_size > 1_000_000:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        relative = str(path.relative_to(skill_dir))
        for label, pattern in RISK_PATTERNS.items():
            count = len(pattern.findall(text))
            if count:
                findings[(label, relative)] = count

    return [
        {"indicator": label, "file": filename, "matches": count}
        for (label, filename), count in sorted(findings.items())
    ]


def skill_record(skill_file: Path, root: Path) -> dict[str, object]:
    try:
        text = skill_file.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return {"path": str(skill_file.parent), "root": str(root), "issues": [f"read error: {exc}"]}

    data, issues = parse_frontmatter(text[:300_000])
    name = data.get("name", "")
    description = data.get("description", "")
    if name and skill_file.parent.name != name:
        issues.append(f"directory name '{skill_file.parent.name}' differs from skill name '{name}'")
    return {
        "name": name,
        "description": description,
        "path": str(skill_file.parent),
        "root": str(root),
        "trigger_tokens": sorted(tokenize(f"{name} {description}")),
        "risk_indicators": scan_indicators(skill_file.parent),
        "issues": issues,
    }


def find_overlaps(skills: list[dict[str, object]], threshold: float, limit: int) -> list[dict[str, object]]:
    overlaps: list[dict[str, object]] = []
    for i, left in enumerate(skills):
        left_tokens = set(left.get("trigger_tokens", []))
        if not left_tokens:
            continue
        for right in skills[i + 1:]:
            right_tokens = set(right.get("trigger_tokens", []))
            shared = left_tokens & right_tokens
            union = left_tokens | right_tokens
            if len(shared) < 3 or not union:
                continue
            score = len(shared) / len(union)
            if score >= threshold:
                overlaps.append({
                    "left": left.get("name") or left.get("path"),
                    "right": right.get("name") or right.get("path"),
                    "score": round(score, 3),
                    "shared_terms": sorted(shared)[:20],
                })
    overlaps.sort(key=lambda item: (-float(item["score"]), str(item["left"]), str(item["right"])))
    return overlaps[:limit]


def render_markdown(report: dict[str, object]) -> str:
    summary = report["summary"]
    lines = [
        "# Skill inventory",
        "",
        f"- Skills found: {summary['skills_found']}",
        f"- Duplicate names: {summary['duplicate_names']}",
        f"- Trigger overlaps reported: {summary['trigger_overlaps']}",
        f"- Skills with indicators: {summary['skills_with_risk_indicators']}",
        "",
        "| Skill | Root | Issues | Indicators |",
        "|---|---|---:|---:|",
    ]
    for skill in report.get("skills", []):
        lines.append(
            f"| {skill.get('name') or '(invalid)'} | {skill.get('root')} | "
            f"{len(skill.get('issues', []))} | {len(skill.get('risk_indicators', []))} |"
        )
    if report["duplicates"]:
        lines.extend(["", "## Duplicate names", "", "```json", json.dumps(report["duplicates"], ensure_ascii=False, indent=2), "```"])
    if report["overlaps"]:
        lines.extend(["", "## Trigger overlaps", "", "```json", json.dumps(report["overlaps"], ensure_ascii=False, indent=2), "```"])
    lines.extend(["", "> Indicators require manual review; they are not a malware verdict."])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", action="append", required=True, help="Skill root; repeat for multiple roots")
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--overlap-threshold", type=float, default=0.28)
    parser.add_argument("--max-overlaps", type=int, default=200)
    parser.add_argument("--summary-only", action="store_true", help="Omit per-skill records from output")
    args = parser.parse_args()

    roots: list[Path] = []
    missing_roots: list[str] = []
    for raw in args.root:
        root = Path(os.path.expandvars(os.path.expanduser(raw))).resolve()
        if root.is_dir():
            roots.append(root)
        else:
            missing_roots.append(str(root))

    records: list[dict[str, object]] = []
    seen_paths: set[Path] = set()
    for root in roots:
        for skill_file in iter_skill_files(root):
            resolved = skill_file.resolve()
            if resolved in seen_paths:
                continue
            seen_paths.add(resolved)
            records.append(skill_record(skill_file, root))
    records.sort(key=lambda item: (str(item.get("name", "")), str(item.get("path", ""))))

    by_name: dict[str, list[str]] = {}
    for record in records:
        name = str(record.get("name", ""))
        if name:
            by_name.setdefault(name, []).append(str(record["path"]))
    duplicates = {name: paths for name, paths in sorted(by_name.items()) if len(paths) > 1}
    overlaps = find_overlaps(records, args.overlap_threshold, args.max_overlaps)

    report: dict[str, object] = {
        "roots": [str(root) for root in roots],
        "missing_roots": missing_roots,
        "summary": {
            "skills_found": len(records),
            "duplicate_names": len(duplicates),
            "trigger_overlaps": len(overlaps),
            "skills_with_risk_indicators": sum(bool(r.get("risk_indicators")) for r in records),
        },
        "duplicates": duplicates,
        "overlaps": overlaps,
        "skills": records,
        "notice": "Risk indicators and trigger overlap require manual review; they are not verdicts.",
    }
    if args.summary_only:
        report.pop("skills")
    if args.format == "markdown":
        print(render_markdown(report))
    else:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
