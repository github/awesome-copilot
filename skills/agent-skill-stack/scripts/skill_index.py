#!/usr/bin/env python3
"""Build and search a local, read-only index of installed agent Skills."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from inventory_skills import iter_skill_files, parse_frontmatter, tokenize


QUERY_EXPANSIONS = [
    (
        ("技能组合", "技能栈", "技能包", "配齐", "skill stack", "一套skills", "一套 skills"),
        "agent-skill-stack build curate skill stack capability workflow project profile local index compare conflicts install 组合 技能栈 能力 工作流 项目",
    ),
    (
        ("找一个", "找个", "找一款", "find a skill", "有没有skill", "有没有 skill", "有没有能"),
        "find-skills find skills discover install common capability 查找 单个 技能",
    ),
    (
        ("去ai", "ai味", "humanize", "natural writing", "文风", "自然一点"),
        "humanizer humanize writing rewrite natural style tone voice 文案 改写 自然 文风",
    ),
    (
        ("事实核查", "fact check", "引用", "citation", "可信"),
        "fact check verify evidence citation grounded accuracy 核查 引用 证据 准确",
    ),
    (
        ("合规", "compliance", "版权", "copyright", "规则"),
        "compliance policy copyright legal safety audit 合规 版权 规则 审核",
    ),
    (
        ("调研", "research", "对标", "竞品", "搜集"),
        "research search collect compare benchmark competitor evidence 调研 搜索 收集 对标 竞品",
    ),
    (
        ("发布", "publish", "定时", "schedule"),
        "publish schedule post upload automation approval 发布 定时 上传 自动化 审批",
    ),
    (
        ("整理", "入库", "知识库", "organize", "knowledge base"),
        "organize knowledge base notes database deduplicate structure 整理 入库 知识库 去重 结构化",
    ),
]


def utc_iso(timestamp: float | None = None) -> str:
    moment = datetime.fromtimestamp(timestamp, tz=timezone.utc) if timestamp is not None else datetime.now(timezone.utc)
    return moment.isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = handle.name
    os.replace(temporary, path)


def infer_scope(skill_file: Path, project_root: Path | None) -> str:
    if project_root is not None:
        try:
            skill_file.relative_to(project_root)
            return "project"
        except ValueError:
            pass
    return "global"


def build_record(skill_file: Path, root: Path, project_root: Path | None) -> dict[str, object]:
    text = skill_file.read_text(encoding="utf-8", errors="replace")
    metadata, issues = parse_frontmatter(text[:300_000])
    name = metadata.get("name", "")
    description = metadata.get("description", "")
    headings = [
        re.sub(r"\s+#+$", "", heading).strip()
        for heading in re.findall(r"^#{1,3}\s+(.+)$", text, flags=re.MULTILINE)
    ][:40]
    capability_terms = sorted(tokenize(" ".join([name, description, *headings])))
    if name and skill_file.parent.name != name:
        issues.append(f"directory name '{skill_file.parent.name}' differs from skill name '{name}'")
    fingerprint = sha256_file(skill_file)
    summary = re.sub(r"\s+", " ", description).strip()
    if len(summary) > 360:
        summary = summary[:357].rstrip() + "..."
    return {
        "id": f"{name or 'invalid'}:{fingerprint[:12]}",
        "name": name,
        "display_name": name.replace("-", " ").strip().title() if name else "Invalid Skill",
        "summary": summary,
        "scope": infer_scope(skill_file, project_root),
        "aliases": capability_terms[:80],
        "capability_terms": capability_terms,
        "headings": headings,
        "last_local_change": utc_iso(skill_file.stat().st_mtime),
        "issues": issues,
        "technical": {
            "source_root": str(root),
            "path": str(skill_file.parent),
            "skill_file_fingerprint": fingerprint,
        },
    }


def build_index(args: argparse.Namespace) -> int:
    project_root = Path(args.project_root).expanduser().resolve() if args.project_root else None
    roots: list[Path] = []
    missing: list[str] = []
    for raw in args.root:
        root = Path(os.path.expandvars(os.path.expanduser(raw))).resolve()
        if root.is_dir():
            roots.append(root)
        else:
            missing.append(str(root))

    records: list[dict[str, object]] = []
    seen: set[Path] = set()
    for root in roots:
        for skill_file in iter_skill_files(root):
            resolved = skill_file.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            records.append(build_record(skill_file, root, project_root))
    records.sort(key=lambda item: (str(item.get("name", "")), str(item["technical"]["path"])))

    names: dict[str, list[str]] = {}
    for record in records:
        if record["name"]:
            names.setdefault(str(record["name"]), []).append(str(record["id"]))
    duplicates = {name: ids for name, ids in sorted(names.items()) if len(ids) > 1}

    output = Path(os.path.expandvars(os.path.expanduser(args.output))).resolve()
    payload: dict[str, object] = {
        "schema": 1,
        "generated_at": utc_iso(),
        "roots": [str(root) for root in roots],
        "missing_roots": missing,
        "skills": records,
        "duplicates": duplicates,
        "privacy": "This index stores Skill metadata only. It contains no prompts, usage history, or routing feedback.",
    }
    atomic_write_json(output, payload)
    print(json.dumps({
        "status": "built",
        "output": str(output),
        "skills_indexed": len(records),
        "duplicate_names": len(duplicates),
        "missing_roots": missing,
    }, ensure_ascii=False, indent=2))
    return 0


def expanded_query(query: str) -> str:
    lower = query.lower()
    additions = [terms for triggers, terms in QUERY_EXPANSIONS if any(trigger in lower for trigger in triggers)]
    return " ".join([query, *additions])


def score_record(
    record: dict[str, object],
    query: str,
    direct_tokens: set[str],
    expanded_tokens: set[str],
) -> tuple[float, list[str]]:
    name = str(record.get("name", "")).lower()
    summary = str(record.get("summary", "")).lower()
    aliases = set(str(item) for item in record.get("aliases", []))
    capability_terms = set(str(item) for item in record.get("capability_terms", []))
    lower_query = query.lower().strip()
    record_tokens = aliases | capability_terms
    direct_matched = sorted(direct_tokens & record_tokens)
    helper_matched = sorted((expanded_tokens - direct_tokens) & record_tokens)
    matched = [*direct_matched, *helper_matched]

    # What the user actually said must outrank generic query-expansion terms.
    score = float(len(direct_matched) * 4 + len(helper_matched))
    if lower_query and lower_query == name:
        score += 20
    elif lower_query and lower_query in name:
        score += 10
    if lower_query and lower_query in summary:
        score += 8
    if name and name in direct_tokens:
        score += 18
    elif name and name in expanded_tokens:
        score += 14
    if direct_tokens:
        score += 10 * len(direct_matched) / len(direct_tokens)
    if score > 0 and record.get("scope") == "project":
        score += 1
    if record.get("issues"):
        score -= 2
    return score, matched


def search_index(args: argparse.Namespace) -> int:
    index_path = Path(os.path.expandvars(os.path.expanduser(args.index))).resolve()
    payload = json.loads(index_path.read_text(encoding="utf-8"))
    expanded = expanded_query(args.query)
    direct_tokens = tokenize(args.query)
    expanded_tokens = tokenize(expanded)
    results: list[dict[str, object]] = []
    for record in payload.get("skills", []):
        score, matched = score_record(record, args.query, direct_tokens, expanded_tokens)
        if score <= 0:
            continue
        results.append({
            "name": record.get("name"),
            "display_name": record.get("display_name"),
            "summary": record.get("summary"),
            "scope": record.get("scope"),
            "score": round(score, 3),
            "matched_terms": matched[:20],
            "issues": record.get("issues", []),
            "technical": record.get("technical", {}),
        })
    results.sort(key=lambda item: (-float(item["score"]), str(item["name"])))
    results = results[:args.limit]

    if args.format == "simple":
        for position, result in enumerate(results, start=1):
            scope = "项目内" if result["scope"] == "project" else "全局"
            print(f"{position}. {result['display_name']}（{scope}）— {result['summary']}")
    else:
        print(json.dumps({
            "query": args.query,
            "expanded_query": expanded,
            "results": results,
            "notice": "Search scores are retrieval hints, not quality or installation scores.",
        }, ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    build = subparsers.add_parser("build", help="Build or refresh a local Skill index")
    build.add_argument("--root", action="append", required=True, help="Skill root; repeatable")
    build.add_argument("--output", required=True, help="Index JSON output path")
    build.add_argument("--project-root", help="Optional project root used to mark project-scoped Skills")
    build.set_defaults(handler=build_index)

    search = subparsers.add_parser("search", help="Search a previously built local Skill index")
    search.add_argument("--index", required=True, help="Index JSON path")
    search.add_argument("--query", required=True, help="Natural-language capability query")
    search.add_argument("--limit", type=int, default=10)
    search.add_argument("--format", choices=("json", "simple"), default="json")
    search.set_defaults(handler=search_index)

    args = parser.parse_args()
    return int(args.handler(args))


if __name__ == "__main__":
    raise SystemExit(main())
