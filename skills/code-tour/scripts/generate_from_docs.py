#!/usr/bin/env python3
"""
Generate a tour skeleton from repo documentation (README, CONTRIBUTING, docs/).

Reads README.md (and optionally CONTRIBUTING.md, docs/) to extract:
  - File and directory references
  - Architecture / structure sections
  - Setup instructions (becomes an orientation step)
  - External links (becomes uri steps)

Outputs a skeleton .tour JSON that the code-tour skill fills in with descriptions.
The skill reads this skeleton and enriches it — it does NOT replace the skill's judgment.

Usage:
    python generate_from_docs.py [--repo-root <path>] [--persona <persona>] [--output <file>]

Examples:
    python generate_from_docs.py
    python generate_from_docs.py --persona new-joiner --output .tours/from-readme.tour
    python generate_from_docs.py --repo-root /path/to/repo --persona vibecoder
"""

import json
import re
import sys
import os
from pathlib import Path
from typing import Optional


# ── Markdown extraction helpers ──────────────────────────────────────────────

# Matches inline code that looks like a file/directory path
_CODE_PATH = re.compile(r"`([^`]{2,80})`")
# Matches headings
_HEADING = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)
# Matches markdown links: [text](url)
_LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")
# Patterns that suggest a path (contains / or . with extension)
_LOOKS_LIKE_PATH = re.compile(r"^\.?[\w\-]+(/[\w\-\.]+)+$|^\./|^[\w]+\.[a-z]{1,5}$")
# Architecture / structure section keywords
_STRUCT_KEYWORDS = re.compile(
    r"\b(structure|architecture|layout|overview|directory|folder|module|component|"
    r"design|system|organization|getting.started|quick.start|setup|installation)\b",
    re.IGNORECASE,
)


def _extract_paths_from_text(text: str, repo_root: Path) -> list[str]:
    """Extract inline code that looks like real file/directory paths."""
    candidates = _CODE_PATH.findall(text)
    found = []
    for c in candidates:
        c = c.strip().lstrip("./")
        if not c:
            continue
        if not _LOOKS_LIKE_PATH.match(c) and "/" not in c and "." not in c:
            continue
        # check if path actually exists
        full = repo_root / c
        if full.exists():
            found.append(c)
    return found


def _extract_external_links(text: str) -> list[tuple[str, str]]:
    """Extract [label](url) pairs for URI steps."""
    links = _LINK.findall(text)
    # filter out image links and very generic anchors
    return [
        (label, url)
        for label, url in links
        if not url.endswith((".png", ".jpg", ".gif", ".svg"))
        and label.lower() not in ("here", "this", "link", "click", "see")
    ]


def _split_into_sections(text: str) -> list[tuple[str, str]]:
    """Split markdown into (heading, body) pairs."""
    headings = list(_HEADING.finditer(text))
    sections = []
    for i, m in enumerate(headings):
        heading = m.group(2).strip()
        start = m.end()
        end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
        body = text[start:end].strip()
        sections.append((heading, body))
    return sections


def _is_structure_section(heading: str) -> bool:
    return bool(_STRUCT_KEYWORDS.search(heading))


# ── Step builders ─────────────────────────────────────────────────────────────

def _make_content_step(title: str, hint: str) -> dict:
    return {
        "title": title,
        "description": f"[TODO: {hint}]",
    }


def _make_file_step(path: str, hint: str = "") -> dict:
    step = {
        "file": path,
        "title": f"[TODO: title for {path}]",
        "description": f"[TODO: {hint or 'explain this file for the persona'}]",
    }
    return step


def _make_dir_step(path: str, hint: str = "") -> dict:
    return {
        "directory": path,
        "title": f"[TODO: title for {path}/]",
        "description": f"[TODO: {hint or 'explain what lives here'}]",
    }


def _make_uri_step(url: str, label: str) -> dict:
    return {
        "uri": url,
        "title": label,
        "description": "[TODO: explain why this link is relevant and what the reader should notice]",
    }


# ── Core generator ────────────────────────────────────────────────────────────

def generate_skeleton(repo_root: str = ".", persona: str = "new-joiner") -> dict:
    repo = Path(repo_root).resolve()

    # ── Read documentation files ─────────────────────────────────────────
    doc_files = ["README.md", "readme.md", "Readme.md"]
    extra_docs = ["CONTRIBUTING.md", "ARCHITECTURE.md", "docs/architecture.md", "docs/README.md"]

    readme_text = ""
    for name in doc_files:
        p = repo / name
        if p.exists():
            readme_text = p.read_text(errors="replace")
            break

    extra_texts = []
    for name in extra_docs:
        p = repo / name
        if p.exists():
            extra_texts.append((name, p.read_text(errors="replace")))

    all_text = readme_text + "\n".join(t for _, t in extra_texts)

    # ── Collect steps ─────────────────────────────────────────────────────
    steps = []
    seen_paths: set[str] = set()

    # 1. Intro step
    steps.append(
        _make_content_step(
            "Welcome",
            f"Introduce the repo: what it does, who this {persona} tour is for, what they'll understand after finishing.",
        )
    )

    # 2. Parse README sections
    if readme_text:
        sections = _split_into_sections(readme_text)
        for heading, body in sections:
            # structure / architecture sections → directory steps
            if _is_structure_section(heading):
                paths = _extract_paths_from_text(body, repo)
                for p in paths:
                    if p in seen_paths:
                        continue
                    seen_paths.add(p)
                    full = repo / p
                    if full.is_dir():
                        steps.append(_make_dir_step(p, f"mentioned under '{heading}' in README"))
                    elif full.is_file():
                        steps.append(_make_file_step(p, f"mentioned under '{heading}' in README"))

    # 3. Scan all text for file/dir references not yet captured
    all_paths = _extract_paths_from_text(all_text, repo)
    for p in all_paths:
        if p in seen_paths:
            continue
        seen_paths.add(p)
        full = repo / p
        if full.is_dir():
            steps.append(_make_dir_step(p))
        elif full.is_file():
            steps.append(_make_file_step(p))

    # 4. If very few file steps found, fall back to top-level directory scan
    file_and_dir_steps = [s for s in steps if "file" in s or "directory" in s]
    if len(file_and_dir_steps) < 3:
        # add top-level directories
        for item in sorted(repo.iterdir()):
            if item.name.startswith(".") or item.name in ("node_modules", "__pycache__", ".git"):
                continue
            rel = str(item.relative_to(repo))
            if rel in seen_paths:
                continue
            seen_paths.add(rel)
            if item.is_dir():
                steps.append(_make_dir_step(rel, "top-level directory"))
            elif item.is_file() and item.suffix in (".ts", ".js", ".py", ".go", ".rs", ".java", ".rb"):
                steps.append(_make_file_step(rel, "top-level source file"))

    # 5. URI steps from external links in README
    links = _extract_external_links(readme_text)
    # Only include links that look like architecture / design references
    for label, url in links[:3]:  # cap at 3 to avoid noise
        steps.append(_make_uri_step(url, label))

    # 6. Closing step
    steps.append(
        _make_content_step(
            "What to Explore Next",
            "Summarize what the reader now understands. List 2–3 follow-up tours they should read next.",
        )
    )

    # Deduplicate steps by (file/directory/uri key)
    seen_keys: set = set()
    deduped = []
    for s in steps:
        key = s.get("file") or s.get("directory") or s.get("uri") or s.get("title")
        if key in seen_keys:
            continue
        seen_keys.add(key)
        deduped.append(s)

    return {
        "$schema": "https://aka.ms/codetour-schema",
        "title": f"[TODO: descriptive title for {persona} tour]",
        "description": f"[TODO: one sentence — who this is for and what they'll understand]",
        "_skeleton_generated_by": "generate_from_docs.py",
        "_instructions": (
            "This is a skeleton. Fill in every [TODO: ...] with real content. "
            "Read each referenced file before writing its description. "
            "Remove this _skeleton_generated_by and _instructions field before saving."
        ),
        "steps": deduped,
    }


def main():
    args = sys.argv[1:]
    if "--help" in args or "-h" in args:
        print(__doc__)
        sys.exit(0)

    repo_root = "."
    persona = "new-joiner"
    output: Optional[str] = None

    i = 0
    while i < len(args):
        if args[i] == "--repo-root" and i + 1 < len(args):
            repo_root = args[i + 1]
            i += 2
        elif args[i] == "--persona" and i + 1 < len(args):
            persona = args[i + 1]
            i += 2
        elif args[i] == "--output" and i + 1 < len(args):
            output = args[i + 1]
            i += 2
        else:
            i += 1

    skeleton = generate_skeleton(repo_root, persona)
    out_json = json.dumps(skeleton, indent=2)

    if output:
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        Path(output).write_text(out_json)
        print(f"✅ Skeleton written to {output}")
        print(f"   {len(skeleton['steps'])} steps generated from docs")
        print(f"   Fill in all [TODO: ...] entries before sharing")
    else:
        print(out_json)


if __name__ == "__main__":
    main()
