"""
wiki_store.py — Manages the persistent wiki layer.

Inspired by Karpathy's LLM Wiki pattern: the wiki is a directory of LLM-generated
markdown pages that the agent writes and maintains. This module provides the
deterministic file I/O and index/log management so the agent can focus on
reasoning, not bookkeeping.

Wiki structure (relative to project root):
    wiki/
        index.md        ← content-oriented catalog of all pages
        log.md          ← chronological append-only operation log
        entities/       ← one page per entity (person, concept, system, etc.)
        summaries/      ← source document summary pages
        topics/         ← cross-cutting synthesis and topic pages

The agent WRITES pages; this module handles the filesystem + index + log.
"""
from __future__ import annotations

import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config

_WIKI_DIR = Path(os.environ.get("MINI_CONTEXT_GRAPH_WIKI_DIR", str(config.WIKI_DIR)))
_INDEX_FILE = _WIKI_DIR / "index.md"
_LOG_FILE = _WIKI_DIR / "log.md"

_CATEGORY_DIRS = {
    "entity": _WIKI_DIR / "entities",
    "summary": _WIKI_DIR / "summaries",
    "topic": _WIKI_DIR / "topics",
}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _ensure_dirs() -> None:
    _WIKI_DIR.mkdir(parents=True, exist_ok=True)
    for d in _CATEGORY_DIRS.values():
        d.mkdir(parents=True, exist_ok=True)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _slug(title: str) -> str:
    """Convert a title to a filesystem-safe slug."""
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def _page_path(category: str, slug: str) -> Path:
    base = _CATEGORY_DIRS.get(category, _WIKI_DIR)
    return base / f"{slug}.md"


# ---------------------------------------------------------------------------
# Index management
# ---------------------------------------------------------------------------

def _load_index() -> list[dict]:
    """Parse index.md into a list of entry dicts."""
    if not _INDEX_FILE.exists():
        return []
    entries = []
    for line in _INDEX_FILE.read_text().splitlines():
        # Expected table row: | [[slug]] | category | summary | date |
        if line.startswith("| [["):
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) >= 3:
                link = parts[0]  # [[slug]]
                category = parts[1] if len(parts) > 1 else ""
                summary = parts[2] if len(parts) > 2 else ""
                date = parts[3] if len(parts) > 3 else ""
                slug = re.sub(r"\[\[|\]\]", "", link)
                entries.append({
                    "slug": slug,
                    "category": category,
                    "summary": summary,
                    "date": date,
                })
    return entries


def _save_index(entries: list[dict]) -> None:
    """Rewrite index.md from the entries list."""
    _ensure_dirs()
    lines = [
        "# Wiki Index\n",
        "_Auto-managed by wiki_store. Do not edit the table manually._\n\n",
        "| Page | Category | Summary | Date |\n",
        "|------|----------|---------|------|\n",
    ]
    for e in entries:
        lines.append(
            f"| [[{e['slug']}]] | {e['category']} | {e['summary']} | {e['date']} |\n"
        )
    _INDEX_FILE.write_text("".join(lines))


def _append_log(operation: str, detail: str) -> None:
    """Append a timestamped entry to log.md."""
    _ensure_dirs()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = f"\n## [{timestamp}] {operation} | {detail}\n"
    with open(_LOG_FILE, "a") as f:
        f.write(entry)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def write_page(
    category: str,
    title: str,
    content: str,
    summary: str = "",
) -> str:
    """
    Write (or overwrite) a wiki page.

    The agent provides the full markdown content. This method handles:
    - Writes the .md file to the appropriate category subfolder.
    - Updates index.md with a one-line entry.
    - Appends an entry to log.md.

    Args:
        category: One of "entity", "summary", "topic".
        title:    Human-readable page title (used for slug + index).
        content:  Full markdown content the agent wrote.
        summary:  One-line summary for the index (optional; auto-extracted if empty).

    Returns:
        Relative path from wiki root (e.g. "entities/memory-leak.md").
    """
    _ensure_dirs()
    slug = _slug(title)
    path = _page_path(category, slug)

    # Auto-extract first non-heading, non-empty line as summary if not provided
    if not summary:
        for line in content.splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                summary = stripped[:100]
                break

    path.write_text(content)

    # Update index
    entries = _load_index()
    existing = next((e for e in entries if e["slug"] == slug), None)
    if existing:
        existing["summary"] = summary
        existing["date"] = _now_iso()
    else:
        entries.append({
            "slug": slug,
            "category": category,
            "summary": summary,
            "date": _now_iso(),
        })
    _save_index(entries)
    _append_log("write", title)

    return str(path.relative_to(_WIKI_DIR))


def read_page(category: str, title: str) -> str | None:
    """Read a wiki page's content. Returns None if not found."""
    slug = _slug(title)
    path = _page_path(category, slug)
    if not path.exists():
        return None
    return path.read_text()


def read_page_by_slug(slug: str) -> str | None:
    """Read a wiki page by slug, searching across all categories."""
    for d in list(_CATEGORY_DIRS.values()) + [_WIKI_DIR]:
        path = d / f"{slug}.md"
        if path.exists():
            return path.read_text()
    return None


def search_wiki(query: str) -> list[dict]:
    """
    Simple keyword search over all wiki pages.
    Returns list of {slug, category, path, snippet} sorted by relevance.
    """
    query_tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
    if not query_tokens:
        return []

    results = []
    for category, base_dir in _CATEGORY_DIRS.items():
        if not base_dir.exists():
            continue
        for page_path in base_dir.glob("*.md"):
            content = page_path.read_text().lower()
            content_tokens = set(re.findall(r"[a-z0-9]+", content))
            overlap = len(query_tokens & content_tokens)
            if overlap > 0:
                # Extract a short snippet around first match
                first_token = next(iter(query_tokens & content_tokens), "")
                idx = content.find(first_token)
                snippet = content[max(0, idx - 30):idx + 80].replace("\n", " ").strip()
                results.append({
                    "slug": page_path.stem,
                    "category": category,
                    "path": str(page_path.relative_to(_WIKI_DIR)),
                    "score": overlap,
                    "snippet": snippet,
                })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def list_pages(category: str | None = None) -> list[dict]:
    """List all wiki pages, optionally filtered by category."""
    entries = _load_index()
    if category:
        return [e for e in entries if e["category"] == category]
    return entries


def get_log(last_n: int = 20) -> list[str]:
    """Return the last N log entries from log.md."""
    if not _LOG_FILE.exists():
        return []
    lines = _LOG_FILE.read_text().splitlines()
    entries = [l for l in lines if l.startswith("## [")]
    return entries[-last_n:]


def lint_wiki() -> dict:
    """
    Health-check the wiki as described in Karpathy's LLM Wiki pattern.

    Checks for:
    - Orphan pages (in directory but not in index)
    - Missing pages (in index but file deleted)
    - Broken wikilinks ([[slug]] pointing to non-existent file)
    - Pages with no wikilinks (isolated pages)

    Returns:
        {
          "orphan_pages": [...],
          "missing_pages": [...],
          "broken_wikilinks": {slug: [broken_links]},
          "isolated_pages": [...],
        }
    """
    index_entries = {e["slug"] for e in _load_index()}
    file_slugs: dict[str, Path] = {}
    for d in _CATEGORY_DIRS.values():
        if d.exists():
            for p in d.glob("*.md"):
                file_slugs[p.stem] = p

    orphans = [s for s in file_slugs if s not in index_entries]
    missing = [s for s in index_entries if s not in file_slugs]

    broken_wikilinks: dict[str, list[str]] = {}
    isolated: list[str] = []
    all_slugs = set(file_slugs.keys())

    for slug, path in file_slugs.items():
        content = path.read_text()
        links = re.findall(r"\[\[([^\]]+)\]\]", content)
        if not links:
            isolated.append(slug)
        broken = [lnk for lnk in links if _slug(lnk) not in all_slugs]
        if broken:
            broken_wikilinks[slug] = broken

    return {
        "orphan_pages": orphans,
        "missing_pages": missing,
        "broken_wikilinks": broken_wikilinks,
        "isolated_pages": isolated,
    }
