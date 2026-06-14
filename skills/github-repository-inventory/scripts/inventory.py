#!/usr/bin/env python3
"""github-repository-inventory — read-only, privacy-first GitHub account inventory.

Discovers the repositories connected to the authenticated GitHub account — owned,
collaborator/organization (access), and contribution-evidenced (authored/reviewed PRs,
authored issues, commits) — inspects each lightly (README, structure, technology stack,
project type), models the user's relationship to each repo with evidence + confidence, and
renders catalog.json + PROJECTS.md + warnings.json (plus optional derived reports).

Design:
  * All GitHub access goes through the `gh` CLI (`gh api` / `gh api graphql`). No PyGithub;
    `gh` owns auth.
  * Impure I/O (subprocess, files) is isolated in clearly-named functions.
  * The transform/render core is PURE and deterministic, so it is unit-testable against
    recorded fixtures without ever touching the live API.
  * Read-only: only GET/GraphQL-query requests are issued; no mutating endpoint is ever called.
  * Public-only by default. Collaborator/org repos require --include-accessible; private
    repos require --include-private (README content redacted, gitignored output).

Determinism: identical input produces byte-identical output. Repositories are sorted by
`full_name`; arrays are sorted by stable keys; JSON is written with sorted keys.
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import detect_technologies

SCHEMA_VERSION = "1.0.0"
MIN_GH_VERSION = (2, 90, 0)
DEFAULT_OUT = "github-inventory"

# Files relative to the skill root (this script lives in scripts/).
SKILL_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = SKILL_ROOT.parent.parent / "schemas" / "repository-inventory.schema.json"


# --------------------------------------------------------------------------------------
# Errors
# --------------------------------------------------------------------------------------
class GhError(RuntimeError):
    """A `gh` invocation failed (non-zero exit) for a non-404 reason."""


class GhNotFound(GhError):
    """A `gh api` call returned HTTP 404 (used to mean 'no README' / 'empty repo')."""


# --------------------------------------------------------------------------------------
# gh access (impure) — the ONLY place subprocess/network happens
# --------------------------------------------------------------------------------------
def _run_gh(args: list[str]) -> str:
    """Run `gh <args>` read-only and return stdout. Raise GhNotFound on 404, GhError else."""
    proc = subprocess.run(
        ["gh", *args],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        stderr = proc.stderr or ""
        if "HTTP 404" in stderr or "Not Found" in stderr:
            raise GhNotFound(stderr.strip())
        raise GhError(stderr.strip() or f"gh exited {proc.returncode}")
    return proc.stdout


def gh_version() -> tuple[int, int, int]:
    out = _run_gh(["--version"])
    m = re.search(r"gh version (\d+)\.(\d+)\.(\d+)", out)
    if not m:
        raise GhError(f"could not parse gh version from: {out!r}")
    return (int(m.group(1)), int(m.group(2)), int(m.group(3)))


def gh_auth_ok() -> bool:
    try:
        _run_gh(["auth", "status"])
        return True
    except GhError:
        return False


def authenticated_login() -> str:
    return _run_gh(["api", "/user", "--jq", ".login"]).strip()


DISCOVERY_ENDPOINT = (
    "/user/repos?affiliation=owner&visibility=public&per_page=100"
)


def repos_endpoint(affiliation: str, visibility: str) -> str:
    return f"/user/repos?affiliation={affiliation}&visibility={visibility}&per_page=100"


def fetch_repos_by_affiliation(affiliation: str, visibility: str) -> list[dict[str, Any]]:
    """Discover repos for one affiliation (owner / collaborator / organization_member).

    NOTE on the gh quirk: `gh api --paginate --slurp` returns a JSON ARRAY OF PAGES (one
    element per page), NOT a merged array — and `--slurp` cannot be combined with `--jq`.
    So we slurp without --jq and flatten the pages here in Python.
    """
    raw = _run_gh(["api", repos_endpoint(affiliation, visibility), "--paginate", "--slurp"])
    return flatten_pages(json.loads(raw))


def fetch_owned_public_repos_raw() -> list[dict[str, Any]]:
    """Discover owned PUBLIC repos (Phase 1 entry point; kept for compatibility)."""
    return fetch_repos_by_affiliation("owner", "public")


def fetch_readme_raw(full_name: str) -> dict[str, Any] | None:
    """Return the README content object, or None if the repo has no README (404)."""
    try:
        return json.loads(_run_gh(["api", f"/repos/{full_name}/readme"]))
    except GhNotFound:
        return None


def fetch_root_contents_raw(full_name: str) -> list[dict[str, Any]]:
    """Return the top-level contents list, or [] for an empty repo (404)."""
    try:
        data = json.loads(_run_gh(["api", f"/repos/{full_name}/contents"]))
    except GhNotFound:
        return []
    # The contents endpoint returns a list for a directory; guard against a single-file root.
    return data if isinstance(data, list) else [data]


def fetch_repo_metadata(full_name: str) -> dict[str, Any] | None:
    """Fetch a single repo's metadata object, or None if inaccessible (404 / private)."""
    try:
        return json.loads(_run_gh(["api", f"/repos/{full_name}"]))
    except GhNotFound:
        return None


def fetch_core_rate_limit() -> dict[str, int]:
    """Return the REST core rate-limit resource ({limit, remaining, reset})."""
    try:
        return json.loads(_run_gh(["api", "/rate_limit", "--jq", ".resources.core"]))
    except GhError:
        return {}


COMMIT_CONTRIBUTIONS_QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      commitContributionsByRepository(maxRepositories: 100) {
        repository { nameWithOwner isPrivate }
        contributions { totalCount }
      }
    }
  }
}
"""
COMMIT_CONTRIB_MAX_REPOS = 100  # maxRepositories in the GraphQL query above.


def fetch_commit_contributions(login: str) -> list[dict[str, Any]]:
    """Pass C (commits): repos with commit contributions in ~the last year, via GraphQL."""
    raw = _run_gh(
        ["api", "graphql", "-F", f"login={login}", "-f", f"query={COMMIT_CONTRIBUTIONS_QUERY}"]
    )
    return parse_commit_contributions(json.loads(raw))


def fetch_search_issues(query: str) -> tuple[list[dict[str, Any]], int]:
    """Run a read-only `/search/issues` query, return (all items across pages, total_count).

    The Search API returns {total_count, items[]} (different shape from /user/repos) and is
    rate-limited (~30/min). `-f q=...` lets gh URL-encode the query safely.
    """
    raw = _run_gh(
        ["api", "-X", "GET", "/search/issues", "-f", f"q={query}", "-f", "per_page=100",
         "--paginate", "--slurp"]
    )
    pages = json.loads(raw)
    return flatten_search_pages(pages)


def fetch_file_text(full_name: str, path: str) -> str | None:
    """Fetch and decode a single file's text content, or None if absent (404)."""
    try:
        raw = json.loads(_run_gh(["api", f"/repos/{full_name}/contents/{path}"]))
    except GhNotFound:
        return None
    if raw.get("encoding") == "base64":
        try:
            return base64.b64decode(raw["content"]).decode("utf-8", errors="replace")
        except (KeyError, ValueError):
            return None
    return raw.get("content")


# --------------------------------------------------------------------------------------
# Transform core (PURE) — unit-tested against fixtures
# --------------------------------------------------------------------------------------
def flatten_pages(pages: Any) -> list[dict[str, Any]]:
    """Flatten the array-of-pages returned by `gh api --slurp` into a single list."""
    out: list[dict[str, Any]] = []
    for page in pages:
        if isinstance(page, list):
            out.extend(page)
        elif page is not None:
            out.append(page)
    return out


_CONF_ORDER = {"low": 0, "medium": 1, "high": 2}

OWNER_RELATIONSHIP = {
    "type": "owner",
    "evidence": "owner.login matches authenticated user",
    "confidence": "high",
}


def merge_relationships(relationships: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Union relationships by type (keeping the highest-confidence one), sorted by type.

    A repo can be both `owner` and `issue-author`; this keeps one entry per type.
    """
    by_type: dict[str, dict[str, Any]] = {}
    for rel in relationships:
        t = rel["type"]
        if t not in by_type or _CONF_ORDER[rel["confidence"]] > _CONF_ORDER[by_type[t]["confidence"]]:
            by_type[t] = rel
    return sorted(by_type.values(), key=lambda r: r["type"])


def dedupe_by_full_name(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Dedupe by full_name (case-insensitive), merging discovered_via AND relationships."""
    by_key: dict[str, dict[str, Any]] = {}
    for rec in records:
        key = rec["full_name"].lower()
        if key in by_key:
            existing = by_key[key]
            existing["discovered_via"] = sorted(
                set(existing["discovered_via"]) | set(rec["discovered_via"])
            )
            existing["relationships"] = merge_relationships(
                existing["relationships"] + rec["relationships"]
            )
        else:
            by_key[key] = dict(rec)
    return list(by_key.values())


# Accessible discovery (Phase 4): (gh affiliation, relationship type, evidence).
ACCESSIBLE_AFFILIATIONS = [
    ("collaborator", "collaborator", "explicit collaborator permission (affiliation)"),
    ("organization_member", "organization-member", "organization membership (affiliation)"),
]
# Relationship types that count as CONTRIBUTION (vs. mere access) for the render split.
CONTRIBUTION_RELATIONSHIP_TYPES = {
    "pull-request-author", "pull-request-reviewer", "issue-author", "commit-contributor",
}
# Output dirs that .gitignore already excludes — safe to write private data into.
GITIGNORED_OUTPUT_DIRS = {"github-inventory", ".inventory-cache"}

# Contribution discovery (Phase 3): relationship type -> (search query template, evidence).
SEARCH_RESULT_CAP = 1000  # GitHub Search API hard cap.
CONTRIBUTION_SEARCHES = [
    ("pull-request-author", "author:{u} type:pr", "authored {n} pull request(s) (search)"),
    ("pull-request-reviewer", "reviewed-by:{u} type:pr", "reviewed {n} pull request(s) (search)"),
    ("issue-author", "author:{u} type:issue", "authored {n} issue(s) (search)"),
]


def flatten_search_pages(pages: Any) -> tuple[list[dict[str, Any]], int]:
    """Flatten `/search/issues` slurped pages -> (items, total_count)."""
    items: list[dict[str, Any]] = []
    total = 0
    for page in pages or []:
        if not isinstance(page, dict):
            continue
        items.extend(page.get("items", []) or [])
        total = max(total, int(page.get("total_count", 0)))
    return items, total


def repo_full_from_item(item: dict[str, Any]) -> str | None:
    """Extract 'owner/name' from a search item's repository_url."""
    url = item.get("repository_url", "")
    prefix = "https://api.github.com/repos/"
    return url[len(prefix):] if url.startswith(prefix) else None


def aggregate_contributions(
    items_by_relationship: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    """Aggregate search items into skeleton records keyed by repo, one entry per repo.

    Returns [{full_name, relationships[], discovered_via[]}] sorted by full_name. Counts
    per relationship type become the evidence (e.g. 'authored 3 issue(s)').
    """
    evidence_tmpl = {rel: tmpl for rel, _q, tmpl in CONTRIBUTION_SEARCHES}
    counts: dict[str, dict[str, int]] = {}
    for rel_type, items in items_by_relationship.items():
        for item in items:
            full = repo_full_from_item(item)
            if not full:
                continue
            counts.setdefault(full, {})
            counts[full][rel_type] = counts[full].get(rel_type, 0) + 1

    records: list[dict[str, Any]] = []
    for full, rel_counts in counts.items():
        relationships = [
            {
                "type": rel_type,
                "evidence": evidence_tmpl[rel_type].format(n=count),
                "confidence": "high",
            }
            for rel_type, count in rel_counts.items()
        ]
        records.append(
            {
                "full_name": full,
                "relationships": merge_relationships(relationships),
                "discovered_via": sorted(rel_counts.keys()),
            }
        )
    return sorted(records, key=lambda r: r["full_name"])


def parse_commit_contributions(graphql_response: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract [{full_name, commits, private}] from a GraphQL contributions response."""
    try:
        nodes = (
            graphql_response["data"]["user"]["contributionsCollection"][
                "commitContributionsByRepository"
            ]
        )
    except (KeyError, TypeError):
        return []
    entries: list[dict[str, Any]] = []
    for node in nodes or []:
        repo = node.get("repository") or {}
        full = repo.get("nameWithOwner")
        if not full:
            continue
        entries.append(
            {
                "full_name": full,
                "commits": int((node.get("contributions") or {}).get("totalCount", 0)),
                "private": bool(repo.get("isPrivate", False)),
            }
        )
    return entries


def commit_contribution_records(
    entries: list[dict[str, Any]], *, include_private: bool
) -> list[dict[str, Any]]:
    """Turn commit-contribution entries into skeleton records, sorted by full_name.

    Private repos are dropped unless include_private. Each carries a commit-contributor
    relationship at high confidence with the commit count as evidence.
    """
    records: list[dict[str, Any]] = []
    for entry in entries:
        if entry["private"] and not include_private:
            continue
        records.append(
            {
                "full_name": entry["full_name"],
                "relationships": [
                    {
                        "type": "commit-contributor",
                        "evidence": f"authored {entry['commits']} commit(s) in the last year (GraphQL contributions)",
                        "confidence": "high",
                    }
                ],
                "discovered_via": ["commit-contributor"],
            }
        )
    return sorted(records, key=lambda r: r["full_name"])


def _spdx_or_none(license_obj: Any) -> str | None:
    if not license_obj:
        return None
    spdx = license_obj.get("spdx_id")
    if not spdx or spdx == "NOASSERTION":
        return None
    return spdx


def normalize_repo(
    raw: dict[str, Any],
    *,
    scanned_at: str,
    source: str = "owned",
    relationships: list[dict[str, Any]] | None = None,
    discovered_via: list[str] | None = None,
) -> dict[str, Any]:
    """Map a raw GitHub repo object to a normalized record (pre-inspection).

    Defaults to an `owner` relationship discovered via `owned`. Callers supply
    `relationships`/`discovered_via` for contribution-discovered (external) repos — access
    is never labelled as contribution, and contribution is never labelled as ownership.
    """
    owner_login = (raw.get("owner") or {}).get("login", "")
    return {
        "name": raw["name"],
        "owner": owner_login,
        "full_name": raw["full_name"],
        "url": raw["html_url"],
        "description": raw.get("description"),
        "homepage": raw.get("homepage") or None,
        "visibility": raw.get("visibility", "private" if raw.get("private") else "public"),
        "private": bool(raw.get("private", False)),
        "archived": bool(raw.get("archived", False)),
        "fork": bool(raw.get("fork", False)),
        "is_template": bool(raw.get("is_template", False)),
        "default_branch": raw.get("default_branch", "main"),
        "created_at": raw["created_at"],
        "updated_at": raw["updated_at"],
        "pushed_at": raw.get("pushed_at"),
        "language": raw.get("language"),
        "topics": sorted(raw.get("topics") or []),
        "license": _spdx_or_none(raw.get("license")),
        "stargazers_count": int(raw.get("stargazers_count", 0)),
        "forks_count": int(raw.get("forks_count", 0)),
        "readme": {"present": False, "path": None, "size": None, "content": None},
        "top_level": [],
        "relationships": relationships if relationships is not None else [dict(OWNER_RELATIONSHIP)],
        "discovered_via": sorted(discovered_via) if discovered_via is not None else [source],
        "last_scanned_at": scanned_at,
    }


def _decode_readme_content(readme_raw: dict[str, Any]) -> str | None:
    if readme_raw.get("encoding") != "base64":
        return readme_raw.get("content")
    try:
        return base64.b64decode(readme_raw["content"]).decode("utf-8", errors="replace")
    except (KeyError, ValueError):
        return None


def build_readme(readme_raw: dict[str, Any] | None, *, private: bool) -> dict[str, Any]:
    """Build the readme sub-record. Private README content is redacted, never copied."""
    if readme_raw is None:
        return {"present": False, "path": None, "size": None, "content": None}
    entry: dict[str, Any] = {
        "present": True,
        "path": readme_raw.get("path"),
        "size": readme_raw.get("size"),
    }
    if private:
        entry["content"] = None
        entry["redacted"] = True
    else:
        entry["content"] = _decode_readme_content(readme_raw)
    return entry


def build_top_level(contents_raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sorted top-level entries: [{name, type}]. Stable order for determinism."""
    items = [{"name": e["name"], "type": e["type"]} for e in (contents_raw or [])]
    return sorted(items, key=lambda e: (e["name"], e["type"]))


def apply_inspection(
    record: dict[str, Any],
    *,
    readme_raw: dict[str, Any] | None,
    contents_raw: list[dict[str, Any]],
) -> dict[str, Any]:
    """Return a copy of record enriched with README presence/content and top-level contents."""
    enriched = dict(record)
    enriched["readme"] = build_readme(readme_raw, private=record.get("private", False))
    enriched["top_level"] = build_top_level(contents_raw)
    return enriched


def build_catalog(
    records: list[dict[str, Any]],
    *,
    login: str,
    scan: dict[str, Any],
    generated_at: str,
) -> dict[str, Any]:
    """Assemble the catalog wrapper with repositories sorted by full_name (deterministic)."""
    repos = sorted(dedupe_by_full_name(records), key=lambda r: r["full_name"])
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "account": {"login": login},
        "scan": scan,
        "repositories": repos,
    }


def build_warnings(
    catalog: dict[str, Any],
    *,
    errors: list[dict[str, Any]] | None = None,
    extra_warnings: list[dict[str, Any]] | None = None,
    truncated: bool = False,
    generated_at: str | None = None,
) -> dict[str, Any]:
    """Collect incompleteness/redaction/error warnings. Deterministically ordered."""
    repos = catalog["repositories"]
    warnings: list[dict[str, Any]] = list(extra_warnings or [])

    for repo in repos:
        if not repo["readme"]["present"]:
            warnings.append(
                {
                    "code": "missing-readme",
                    "repo": repo["full_name"],
                    "message": "No README found for this repository.",
                }
            )
        if repo["readme"].get("redacted"):
            warnings.append(
                {
                    "code": "redacted-readme",
                    "repo": repo["full_name"],
                    "message": "Private README content was withheld from shareable output.",
                }
            )

    for err in errors or []:
        warnings.append(
            {
                "code": "inspection-error",
                "repo": err.get("repo", ""),
                "message": err.get("message", "Inspection failed."),
            }
        )

    if truncated:
        warnings.append(
            {
                "code": "results-truncated",
                "repo": "",
                "message": "Results may be incomplete due to API rate limiting or pagination limits.",
            }
        )

    warnings.append(
        {
            "code": "coverage-scope",
            "repo": "",
            "message": (
                "Covers PUBLIC repositories the account owns plus those with PUBLIC "
                "contribution evidence (authored/reviewed pull requests, authored issues). "
                "Collaborator, organization, and private repositories are not included by "
                "default. This is not 'everything you ever contributed to'."
            ),
        }
    )
    warnings.append(
        {
            "code": "commit-contributions-window",
            "repo": "",
            "message": (
                "Commit contributions reflect roughly the last year (GitHub's "
                "contributionsCollection default window); commits outside that window are "
                "not counted."
            ),
        }
    )

    warnings.sort(key=lambda w: (w["code"], w["repo"], w["message"]))

    with_readme = sum(1 for r in repos if r["readme"]["present"])
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at or catalog["generated_at"],
        "counts": {
            "repositories": len(repos),
            "with_readme": with_readme,
            "without_readme": len(repos) - with_readme,
            "errors": len(errors or []),
        },
        "warnings": warnings,
    }


# --------------------------------------------------------------------------------------
# Localization (PROJECTS.md + reports). Data values (repo names, tech, relationship type
# identifiers) stay as-is; only structural labels are localized. Translations are
# community-reviewable — `my` (Burmese) is the first non-English locale.
# --------------------------------------------------------------------------------------
STRINGS: dict[str, dict[str, str]] = {
    "en": {
        "title": "GitHub Project Inventory",
        "subtitle": "Generated by github-repository-inventory. Source of truth: catalog.json.",
        "account": "Account", "generated": "Generated", "scan": "Scan",
        "repositories": "Repositories",
        "owned": "Owned Projects", "contributions": "External Contributions",
        "accessible": "Accessible Repositories",
        "status": "Status", "stack": "Stack", "visibility": "Visibility",
        "relationship": "Relationship", "readme": "README",
        "project_type": "Project type", "technologies": "Technologies", "topics": "Topics",
        "no_description": "_No description._", "none_found": "_None found._",
        "no_contrib": "_No public contribution evidence (authored/reviewed PRs, authored "
                      "issues, commits) found for repos outside your account._",
        "no_access": "_No collaborator or organization repositories in this scan. "
                     "(Run with --include-accessible to discover them.)_",
        "footer": "Some repositories may be missing. See warnings.json for known gaps "
                  "(rate limits, redactions, expired permissions, deleted repos).",
        "readme_none": "none", "readme_redacted": "available (redacted)",
        "unknown": "unknown",
    },
    "my": {
        "title": "GitHub ပရောဂျက် စာရင်း",
        "subtitle": "github-repository-inventory မှ ထုတ်လုပ်သည်။ မူရင်းအချက်အလက်- catalog.json။",
        "account": "အကောင့်", "generated": "ထုတ်လုပ်ချိန်", "scan": "စကင်ဖတ်ခြင်း",
        "repositories": "သိုလှောင်ခန်းများ",
        "owned": "ပိုင်ဆိုင်သော ပရောဂျက်များ", "contributions": "ပြင်ပ ပံ့ပိုးမှုများ",
        "accessible": "ဝင်ရောက်ခွင့်ရှိသော သိုလှောင်ခန်းများ",
        "status": "အခြေအနေ", "stack": "နည်းပညာ", "visibility": "မြင်နိုင်မှု",
        "relationship": "ဆက်နွယ်မှု", "readme": "README",
        "project_type": "ပရောဂျက်အမျိုးအစား", "technologies": "နည်းပညာများ",
        "topics": "ခေါင်းစဉ်များ",
        "no_description": "_ဖော်ပြချက် မရှိပါ။_", "none_found": "_မတွေ့ပါ။_",
        "no_contrib": "_သင့်အကောင့်ပြင်ပ သိုလှောင်ခန်းများအတွက် အများမြင် ပံ့ပိုးမှု သက်သေ မတွေ့ပါ။_",
        "no_access": "_ဤစကင်တွင် collaborator သို့မဟုတ် organization သိုလှောင်ခန်း မရှိပါ။ "
                     "(--include-accessible ဖြင့် ရှာဖွေပါ။)_",
        "footer": "အချို့ သိုလှောင်ခန်းများ ကျန်ရှိနိုင်သည်။ သိရှိထားသော အကွက်လပ်များအတွက် "
                  "warnings.json ကို ကြည့်ပါ။",
        "readme_none": "မရှိ", "readme_redacted": "ရှိသည် (ဖျောက်ထားသည်)",
        "unknown": "မသိ",
    },
}


def strings_for(lang: str) -> dict[str, str]:
    return STRINGS.get(lang, STRINGS["en"])


# --------------------------------------------------------------------------------------
# Markdown rendering (PURE, deterministic)
# --------------------------------------------------------------------------------------
def md_escape(value: Any) -> str:
    """Make a value safe for inline Markdown: collapse newlines, escape table/format chars."""
    if value is None:
        return ""
    text = str(value)
    text = re.sub(r"\s*[\r\n]+\s*", " ", text)
    text = text.replace("\\", "\\\\").replace("|", "\\|").replace("`", "\\`")
    return text.strip()


def _status_label(repo: dict[str, Any]) -> str:
    parts = []
    if repo["archived"]:
        parts.append("archived")
    if repo["fork"]:
        parts.append("fork")
    if repo["is_template"]:
        parts.append("template")
    if not parts:
        parts.append("active")
    return ", ".join(parts)


def _readme_label(repo: dict[str, Any], s: dict[str, str]) -> str:
    rd = repo["readme"]
    if not rd["present"]:
        return s["readme_none"]
    if rd.get("redacted"):
        return s["readme_redacted"]
    size = rd.get("size")
    return f"available ({size} bytes)" if size is not None else "available"


def _render_repo_block(repo: dict[str, Any], s: dict[str, str]) -> str:
    desc = md_escape(repo["description"]) or s["no_description"]
    rels = "; ".join(
        f"{md_escape(r['type'])} — {md_escape(r['evidence'])} ({md_escape(r['confidence'])})"
        for r in repo["relationships"]
    )
    lines = [
        f"### [{md_escape(repo['full_name'])}]({md_escape(repo['url'])})",
        "",
        desc,
        "",
        f"- **{s['status']}:** {md_escape(_status_label(repo))}",
        f"- **{s['stack']}:** {md_escape(repo['language']) or '_' + s['unknown'] + '_'}",
        f"- **{s['visibility']}:** {md_escape(repo['visibility'])}",
        f"- **{s['relationship']}:** {rels}",
        f"- **{s['readme']}:** {md_escape(_readme_label(repo, s))}",
    ]
    if repo.get("project_type"):
        lines.append(f"- **{s['project_type']}:** {md_escape(repo['project_type'])}")
    techs = repo.get("technologies") or []
    if techs:
        rendered = ", ".join(
            f"{md_escape(t['name'])} ({md_escape(t['confidence'])})" for t in techs
        )
        lines.append(f"- **{s['technologies']}:** {rendered}")
    if repo["topics"]:
        lines.append(f"- **{s['topics']}:** {md_escape(', '.join(repo['topics']))}")
    return "\n".join(lines)


def render_markdown(catalog: dict[str, Any], lang: str = "en") -> str:
    """Render PROJECTS.md. Deterministic: depends only on the (sorted) catalog + lang."""
    s = strings_for(lang)
    repos = catalog["repositories"]
    login = catalog["account"]["login"]
    scan = catalog["scan"]
    scan_summary = (
        f"visibility={scan['visibility']}, affiliation={scan['affiliation']}, "
        f"include_private={str(scan['include_private']).lower()}, "
        f"sources={','.join(scan['sources'])}"
    )

    def _has(rel_types: set[str], repo: dict[str, Any]) -> bool:
        return any(rel["type"] in rel_types for rel in repo["relationships"])

    # Single pass partition into the three sections (no O(n^2) list-membership).
    owned, contributions, accessible = [], [], []
    for r in repos:
        if _has({"owner"}, r):
            owned.append(r)
        elif _has(CONTRIBUTION_RELATIONSHIP_TYPES, r):  # contribution outranks mere access
            contributions.append(r)
        else:
            accessible.append(r)

    out: list[str] = [
        f"# {s['title']}",
        "",
        f"_{s['subtitle']}_",
        "",
        f"- **{s['account']}:** {md_escape(login)}",
        f"- **{s['generated']}:** {md_escape(catalog['generated_at'])}",
        f"- **{s['scan']}:** {md_escape(scan_summary)}",
        f"- **{s['repositories']}:** {len(repos)}",
        "",
        f"## {s['owned']} ({len(owned)})",
        "",
        "\n\n".join(_render_repo_block(r, s) for r in owned) if owned else s["none_found"],
        "",
        f"## {s['contributions']} ({len(contributions)})",
        "",
        "\n\n".join(_render_repo_block(r, s) for r in contributions) if contributions
        else s["no_contrib"],
        "",
        f"## {s['accessible']} ({len(accessible)})",
        "",
        "\n\n".join(_render_repo_block(r, s) for r in accessible) if accessible
        else s["no_access"],
        "",
        "---",
        "",
        f"_{s['footer']}_",
        "",
    ]
    return "\n".join(out)


# --------------------------------------------------------------------------------------
# Derived reports (Phase 6) — PURE, deterministic, derived only from catalog.json
# --------------------------------------------------------------------------------------
def _is_owned(repo: dict[str, Any]) -> bool:
    return any(rel["type"] == "owner" for rel in repo["relationships"])


def report_technology_summary(catalog: dict[str, Any]) -> str:
    """Aggregate detected technologies across all repos, by repo count (desc), then name."""
    counts: dict[str, int] = {}
    for repo in catalog["repositories"]:
        for tech in repo.get("technologies") or []:
            counts[tech["name"]] = counts.get(tech["name"], 0) + 1
    rows = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    out = ["# Technology Summary", "",
           "_Technologies detected across the inventory, by number of repositories._", "",
           "| Technology | Repositories |", "| --- | ---: |"]
    out += [f"| {md_escape(name)} | {count} |" for name, count in rows] or ["| _none_ | 0 |"]
    out.append("")
    return "\n".join(out)


def report_missing_readmes(catalog: dict[str, Any]) -> str:
    """List repositories without a README (owned first, then others), sorted by name."""
    missing = [r for r in catalog["repositories"] if not r["readme"]["present"]]
    owned = sorted((r for r in missing if _is_owned(r)), key=lambda r: r["full_name"])
    others = sorted((r for r in missing if not _is_owned(r)), key=lambda r: r["full_name"])
    out = ["# Repositories Without a README", "",
           f"_{len(missing)} repositories have no README._", ""]
    for title, group in (("Owned", owned), ("Other", others)):
        if group:
            out += [f"## {title} ({len(group)})", ""]
            out += [f"- [{md_escape(r['full_name'])}]({md_escape(r['url'])})" for r in group]
            out.append("")
    if not missing:
        out += ["_Every repository has a README._", ""]
    return "\n".join(out)


def _portfolio_score(repo: dict[str, Any]) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []
    if repo["readme"]["present"] and not repo["readme"].get("redacted"):
        score += 2
        reasons.append("README")
    if repo.get("description"):
        score += 1
        reasons.append("description")
    if repo["topics"]:
        score += 1
        reasons.append(f"{len(repo['topics'])} topics")
    high = [t for t in (repo.get("technologies") or []) if t["confidence"] == "high"]
    if high:
        score += min(len(high), 3)
        reasons.append(f"{len(high)} detected technologies")
    stars = repo.get("stargazers_count", 0)
    if stars:
        score += min(stars, 5)
        reasons.append(f"{stars} stars")
    ptype = repo.get("project_type")
    if ptype and ptype != "unknown":
        score += 1
        reasons.append(ptype)
    if not repo["archived"] and not repo["fork"]:
        score += 1
    return score, reasons


def report_portfolio_candidates(catalog: dict[str, Any], top: int = 10) -> str:
    """Rank owned, non-archived, non-fork repos by a portfolio-readiness heuristic."""
    owned = [r for r in catalog["repositories"]
             if _is_owned(r) and not r["archived"] and not r["fork"]]
    scored = [( *(_portfolio_score(r)), r) for r in owned]
    scored.sort(key=lambda t: (-t[0], t[2]["full_name"]))
    out = ["# Portfolio Candidates", "",
           "_Owned projects ranked by a simple readiness heuristic (README, description, "
           "topics, detected technologies, stars, classified type). A ranking aid, not a "
           "judgement of quality._", ""]
    shown = [t for t in scored if t[0] > 0][:top]
    for score, reasons, repo in shown:
        out += [
            f"### [{md_escape(repo['full_name'])}]({md_escape(repo['url'])}) — score {score}",
            "",
            md_escape(repo["description"]) or "_No description._",
            "",
            f"- **Signals:** {md_escape(', '.join(reasons))}",
            "",
        ]
    if not shown:
        out += ["_No strong portfolio candidates found._", ""]
    return "\n".join(out)


def report_contribution_summary(catalog: dict[str, Any]) -> str:
    """Summarize external repositories grouped by relationship type, with evidence."""
    external = [r for r in catalog["repositories"] if not _is_owned(r)]
    by_type: dict[str, list[tuple[str, str, str]]] = {}
    for repo in external:
        for rel in repo["relationships"]:
            by_type.setdefault(rel["type"], []).append(
                (repo["full_name"], repo["url"], rel["evidence"])
            )
    out = ["# External Contribution Summary", "",
           f"_{len(external)} repositories outside your account with access or contribution "
           f"evidence._", ""]
    for rel_type in sorted(by_type):
        entries = sorted(set(by_type[rel_type]))
        out += [f"## {md_escape(rel_type)} ({len(entries)})", ""]
        out += [f"- [{md_escape(name)}]({md_escape(url)}) — {md_escape(evidence)}"
                for name, url, evidence in entries]
        out.append("")
    if not external:
        out += ["_No external repositories in this scan._", ""]
    return "\n".join(out)


REPORTS = {
    "technology-summary.md": report_technology_summary,
    "missing-readmes.md": report_missing_readmes,
    "portfolio-candidates.md": report_portfolio_candidates,
    "contribution-summary.md": report_contribution_summary,
}


# --------------------------------------------------------------------------------------
# Deterministic serialization
# --------------------------------------------------------------------------------------
def dumps_json(obj: Any) -> str:
    """Stable JSON: sorted keys, 2-space indent, trailing newline."""
    return json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


# --------------------------------------------------------------------------------------
# Minimal JSON Schema validator (subset) — zero external dependencies
# --------------------------------------------------------------------------------------
_TYPE_MAP = {
    "string": str,
    "integer": int,
    "number": (int, float),
    "boolean": bool,
    "object": dict,
    "array": list,
    "null": type(None),
}


def _type_matches(value: Any, type_spec: Any) -> bool:
    types = type_spec if isinstance(type_spec, list) else [type_spec]
    for t in types:
        py = _TYPE_MAP[t]
        if t in ("integer", "number") and isinstance(value, bool):
            continue  # bool is a subclass of int — exclude it
        if isinstance(value, py):
            return True
    return False


def _resolve_ref(ref: str, root: dict[str, Any]) -> dict[str, Any]:
    node: Any = root
    for part in ref.lstrip("#/").split("/"):
        node = node[part]
    return node


def validate_instance(
    instance: Any, schema: dict[str, Any], root: dict[str, Any], path: str = "$"
) -> list[str]:
    """Validate against the subset of JSON Schema used by our schema. Returns error strings."""
    errors: list[str] = []
    if "$ref" in schema:
        schema = _resolve_ref(schema["$ref"], root)

    if "type" in schema and not _type_matches(instance, schema["type"]):
        errors.append(f"{path}: expected type {schema['type']}, got {type(instance).__name__}")
        return errors

    if "enum" in schema and instance not in schema["enum"]:
        errors.append(f"{path}: {instance!r} not in enum {schema['enum']}")

    if "pattern" in schema and isinstance(instance, str):
        if not re.search(schema["pattern"], instance):
            errors.append(f"{path}: {instance!r} does not match pattern {schema['pattern']!r}")

    if "minimum" in schema and isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if instance < schema["minimum"]:
            errors.append(f"{path}: {instance} < minimum {schema['minimum']}")

    if isinstance(instance, dict):
        for req in schema.get("required", []):
            if req not in instance:
                errors.append(f"{path}: missing required property '{req}'")
        props = schema.get("properties", {})
        addl = schema.get("additionalProperties", True)
        for key, val in instance.items():
            if key in props:
                errors += validate_instance(val, props[key], root, f"{path}.{key}")
            elif addl is False:
                errors.append(f"{path}: additional property '{key}' not allowed")
            elif isinstance(addl, dict):
                errors += validate_instance(val, addl, root, f"{path}.{key}")

    if isinstance(instance, list):
        if "minItems" in schema and len(instance) < schema["minItems"]:
            errors.append(f"{path}: array shorter than minItems {schema['minItems']}")
        if "items" in schema:
            for i, item in enumerate(instance):
                errors += validate_instance(item, schema["items"], root, f"{path}[{i}]")

    return errors


def load_schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


# --------------------------------------------------------------------------------------
# Orchestration helpers
# --------------------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def scan_descriptor(
    *, include_accessible: bool = False, include_private: bool = False
) -> dict[str, Any]:
    affiliations = ["owner"]
    accessible_sources: list[str] = []
    if include_accessible:
        affiliations += ["collaborator", "organization_member"]
        accessible_sources = ["collaborator", "organization-member"]
    return {
        "include_private": include_private,
        "affiliation": ",".join(affiliations),
        "visibility": "all" if include_private else "public",
        "sources": ["owned"]
        + accessible_sources
        + ["pull-request-author", "pull-request-reviewer", "issue-author", "commit-contributor"],
    }


def cache_dir(out: Path) -> Path:
    return out / ".cache"


def ensure_prerequisites() -> tuple[bool, str]:
    """Return (ok, message). Checks gh version and auth without touching repos."""
    try:
        ver = gh_version()
    except (GhError, FileNotFoundError):
        return False, "GitHub CLI (gh) is not installed or not on PATH. Install it (e.g. `brew install gh`)."
    if ver < MIN_GH_VERSION:
        got = ".".join(map(str, ver))
        need = ".".join(map(str, MIN_GH_VERSION))
        return False, f"gh {got} is too old; need {need}+."
    if not gh_auth_ok():
        return False, "gh is not authenticated. Run `gh auth login`."
    return True, "ok"


def discover_records(scanned_at: str, *, visibility: str = "public") -> list[dict[str, Any]]:
    """Pass A: owned repos (public by default; all when private is included)."""
    raw = fetch_repos_by_affiliation("owner", visibility)
    return [normalize_repo(r, scanned_at=scanned_at) for r in raw]


def discover_contributions(login: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Pass C: contribution evidence via the Search API. Returns (skeletons, warnings)."""
    items_by_rel: dict[str, list[dict[str, Any]]] = {}
    warnings: list[dict[str, Any]] = []
    for rel_type, query_tmpl, _ev in CONTRIBUTION_SEARCHES:
        items, total = fetch_search_issues(query_tmpl.format(u=login))
        items_by_rel[rel_type] = items
        if total > len(items):
            warnings.append(
                {
                    "code": "search-truncated",
                    "repo": "",
                    "message": (
                        f"Search for '{rel_type}' reported {total} results but only "
                        f"{len(items)} were retrieved (GitHub Search API caps at "
                        f"{SEARCH_RESULT_CAP}); contribution coverage may be incomplete."
                    ),
                }
            )
    return aggregate_contributions(items_by_rel), warnings


def _merge_or_add(
    records: list[dict[str, Any]],
    by_key: dict[str, dict[str, Any]],
    stats: dict[str, int],
    *,
    full_name: str,
    raw: dict[str, Any] | None,
    relationships: list[dict[str, Any]],
    discovered_via: list[str],
    scanned_at: str,
    include_private: bool,
) -> None:
    """Merge a relationship into an existing record, or add a new one (fetching metadata if
    needed).

    Private/inaccessible repos are excluded and only COUNTED in `stats` — their names are
    never written anywhere, so a private repo cannot leak into shareable output (warnings.json)
    even in the default public-only scan.
    """
    key = full_name.lower()
    if key in by_key:
        rec = by_key[key]
        rec["relationships"] = merge_relationships(rec["relationships"] + relationships)
        rec["discovered_via"] = sorted(set(rec["discovered_via"]) | set(discovered_via))
        return
    if raw is None:
        raw = fetch_repo_metadata(full_name)
    if raw is None:
        stats["inaccessible"] = stats.get("inaccessible", 0) + 1
        return
    if raw.get("private") and not include_private:
        stats["private_excluded"] = stats.get("private_excluded", 0) + 1
        return
    rec = normalize_repo(
        raw, scanned_at=scanned_at, relationships=relationships, discovered_via=discovered_via
    )
    records.append(rec)
    by_key[key] = rec


def assemble_records(
    scanned_at: str, *, include_accessible: bool = False, include_private: bool = False
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    """Run discovery passes (A owned, B accessible, C contributions) and merge.

    Returns (login, records, extra_warnings). A repo can carry several relationships (e.g.
    `owner` + `issue-author`, or `collaborator` + `pull-request-author`); access is never
    labelled as contribution. Private repos are included only with include_private, with
    README content redacted downstream; otherwise excluded and warned.
    """
    login = authenticated_login()
    visibility = "all" if include_private else "public"
    warnings: list[dict[str, Any]] = []
    stats: dict[str, int] = {}

    records = discover_records(scanned_at, visibility=visibility)
    by_key = {r["full_name"].lower(): r for r in records}

    # Pass B: accessible (collaborator / organization member) — opt-in.
    if include_accessible:
        for affiliation, rel_type, evidence in ACCESSIBLE_AFFILIATIONS:
            for raw in fetch_repos_by_affiliation(affiliation, visibility):
                _merge_or_add(
                    records, by_key, stats,
                    full_name=raw["full_name"], raw=raw,
                    relationships=[{"type": rel_type, "evidence": evidence, "confidence": "high"}],
                    discovered_via=[rel_type],
                    scanned_at=scanned_at, include_private=include_private,
                )

    # Pass C: contribution evidence — PR/issue authorship (Search API) + commits (GraphQL).
    skeletons, search_warnings = discover_contributions(login)
    warnings.extend(search_warnings)

    commit_entries = fetch_commit_contributions(login)
    if len(commit_entries) >= COMMIT_CONTRIB_MAX_REPOS:
        warnings.append({
            "code": "commit-contributions-truncated",
            "repo": "",
            "message": (
                f"Commit-contribution repos were capped at {COMMIT_CONTRIB_MAX_REPOS}; "
                f"some repositories with commits may be missing."
            ),
        })
    skeletons = skeletons + commit_contribution_records(
        commit_entries, include_private=include_private
    )

    for skel in skeletons:
        _merge_or_add(
            records, by_key, stats,
            full_name=skel["full_name"], raw=None,
            relationships=skel["relationships"],
            discovered_via=skel["discovered_via"],
            scanned_at=scanned_at, include_private=include_private,
        )

    # Aggregate, name-free exclusion warnings (never leak private/inaccessible repo names).
    if stats.get("private_excluded"):
        n = stats["private_excluded"]
        warnings.append({
            "code": "private-excluded",
            "repo": "",
            "message": (
                f"{n} repositor{'y' if n == 1 else 'ies'} with contribution or access evidence "
                f"{'was' if n == 1 else 'were'} private and excluded (public-only default; "
                f"pass --include-private to include them). Names are withheld."
            ),
        })
    if stats.get("inaccessible"):
        n = stats["inaccessible"]
        warnings.append({
            "code": "external-inaccessible",
            "repo": "",
            "message": (
                f"{n} contribution-evidenced repositor{'y' if n == 1 else 'ies'} "
                f"{'was' if n == 1 else 'were'} inaccessible (deleted or now private) and "
                f"excluded. Names are withheld."
            ),
        })
    return login, records, warnings


# Inspection fields cached/reused by the incremental cache (Phase 5).
INSPECTION_FIELDS = ("readme", "top_level", "manifests", "technologies", "project_type")


def inspect_one(rec: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Inspect a single repo (README + top-level + manifests/tech). Returns (record, errors)."""
    errors: list[dict[str, Any]] = []
    full = rec["full_name"]
    try:
        readme_raw = fetch_readme_raw(full)
    except GhError as exc:
        readme_raw = None
        errors.append({"repo": full, "message": f"README fetch failed: {exc}"})
    try:
        contents_raw = fetch_root_contents_raw(full)
    except GhError as exc:
        contents_raw = []
        errors.append({"repo": full, "message": f"contents fetch failed: {exc}"})
    enriched = apply_inspection(rec, readme_raw=readme_raw, contents_raw=contents_raw)

    manifests = detect_technologies.detect_manifests(enriched["top_level"])
    manifest_contents: dict[str, str] = {}
    for manifest in detect_technologies.manifests_to_fetch(manifests):
        try:
            text = fetch_file_text(full, manifest)
        except GhError as exc:
            errors.append({"repo": full, "message": f"{manifest} fetch failed: {exc}"})
            continue
        if text is not None:
            manifest_contents[manifest] = text
    enriched = detect_technologies.apply_detection(enriched, manifest_contents)
    return enriched, errors


def inspect_records(
    records: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    inspected: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    for rec in records:
        enriched, errs = inspect_one(rec)
        inspected.append(enriched)
        errors.extend(errs)
    return inspected, errors


def cache_signature(rec: dict[str, Any]) -> list[Any]:
    """Fields that, when unchanged, mean a repo's inspection can be reused."""
    return [rec.get("updated_at"), rec.get("pushed_at"), rec.get("default_branch")]


def inspect_records_cached(
    records: list[dict[str, Any]], cache: dict[str, Any], *, use_cache: bool = True
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], int]:
    """Inspect records, reusing cached inspection for repos whose signature is unchanged.

    Returns (inspected, errors, reused_count). Cache hits skip all per-repo API calls.
    """
    inspected: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    reused = 0
    for rec in records:
        entry = cache.get(rec["full_name"]) if use_cache else None
        if entry and entry.get("signature") == cache_signature(rec):
            enriched = dict(rec)
            for field in INSPECTION_FIELDS:
                enriched[field] = entry["fields"][field]
            inspected.append(enriched)
            reused += 1
        else:
            enriched, errs = inspect_one(rec)
            inspected.append(enriched)
            errors.extend(errs)
    return inspected, errors, reused


def build_inspection_cache(
    inspected: list[dict[str, Any]], exclude: set[str] | None = None
) -> dict[str, Any]:
    """Build the cache map {full_name: {signature, fields}} from inspected records.

    Records in `exclude` (those that hit an inspection error this run) are NOT cached, so a
    transient failure is retried on the next scan instead of being reused as a stale result.
    """
    skip = exclude or set()
    return {
        rec["full_name"]: {
            "signature": cache_signature(rec),
            "fields": {field: rec.get(field) for field in INSPECTION_FIELDS},
        }
        for rec in inspected
        if rec["full_name"] not in skip
    }


def load_inspection_cache(out: Path) -> dict[str, Any]:
    path = cache_dir(out) / "inspection-cache.json"
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def save_inspection_cache(
    out: Path, inspected: list[dict[str, Any]], errors: list[dict[str, Any]] | None = None
) -> None:
    cdir = cache_dir(out)
    cdir.mkdir(parents=True, exist_ok=True)
    errored = {e["repo"] for e in (errors or []) if e.get("repo")}
    (cdir / "inspection-cache.json").write_text(
        dumps_json(build_inspection_cache(inspected, exclude=errored)), encoding="utf-8"
    )


def write_outputs(
    out: Path,
    catalog: dict[str, Any],
    errors: list[dict[str, Any]],
    extra_warnings: list[dict[str, Any]] | None = None,
    lang: str = "en",
) -> None:
    out.mkdir(parents=True, exist_ok=True)
    warnings = build_warnings(catalog, errors=errors, extra_warnings=extra_warnings)
    (out / "catalog.json").write_text(dumps_json(catalog), encoding="utf-8")
    (out / "PROJECTS.md").write_text(render_markdown(catalog, lang=lang), encoding="utf-8")
    (out / "warnings.json").write_text(dumps_json(warnings), encoding="utf-8")


def write_reports(out: Path, catalog: dict[str, Any]) -> list[str]:
    """Write the derived report files into <out>/reports/. Returns the filenames written."""
    rdir = out / "reports"
    rdir.mkdir(parents=True, exist_ok=True)
    for filename, fn in REPORTS.items():
        (rdir / filename).write_text(fn(catalog), encoding="utf-8")
    return sorted(REPORTS)


# --------------------------------------------------------------------------------------
# Subcommands
# --------------------------------------------------------------------------------------
def private_output_guard(out: Path, include_private: bool) -> dict[str, Any] | None:
    """Warn if private data would be written outside a known-gitignored directory."""
    if not include_private:
        return None
    if out.resolve().name in GITIGNORED_OUTPUT_DIRS:
        return None
    return {
        "code": "private-output-location",
        "repo": "",
        "message": (
            f"Private repositories were included and written to '{out}', which is not a "
            f"known gitignored output directory ({', '.join(sorted(GITIGNORED_OUTPUT_DIRS))}). "
            f"Ensure this path is gitignored before sharing — it may contain private metadata."
        ),
    }


def cmd_scan(args: argparse.Namespace) -> int:
    out = Path(args.out)
    if args.dry_run:
        print("DRY RUN — no network calls will be made.")
        vis = "all" if args.include_private else "public"
        print(f"  1. discover owned        : gh api /user/repos?affiliation=owner&visibility={vis} …")
        if args.include_accessible:
            print(f"  1b. discover accessible  : affiliation=collaborator, organization_member (visibility={vis})")
        print("  2. discover contributions: gh api /search/issues -f q='author:<you> type:pr' …")
        print("                             (+ reviewed-by PRs, authored issues)")
        print("  3. inspect  : per repo -> gh api /repos/<owner>/<name>/readme, /contents, manifests")
        print(f"  4. render   : write {out}/catalog.json, PROJECTS.md, warnings.json")
        if args.include_private:
            print("  NOTE: private repos included -> README content redacted; write only to a gitignored dir.")
        return 0

    ok, msg = ensure_prerequisites()
    if not ok:
        print(f"ERROR: {msg}", file=sys.stderr)
        return 1

    scanned_at = now_iso()
    login, records, extra_warnings = assemble_records(
        scanned_at,
        include_accessible=args.include_accessible,
        include_private=args.include_private,
    )
    guard = private_output_guard(out, args.include_private)
    if guard:
        print(f"WARNING: {guard['message']}", file=sys.stderr)
        extra_warnings.append(guard)

    use_cache = not args.no_cache
    cache = load_inspection_cache(out) if use_cache else {}
    owned_n = sum(1 for r in records if any(rel["type"] == "owner" for rel in r["relationships"]))
    print(f"Discovered {len(records)} repositories for {login} "
          f"({owned_n} owned, {len(records) - owned_n} non-owned). Inspecting …")

    rate = fetch_core_rate_limit()
    remaining = rate.get("remaining")
    to_inspect = sum(1 for r in records if not (
        use_cache and (c := cache.get(r["full_name"])) and c.get("signature") == cache_signature(r)
    ))
    if remaining is not None and to_inspect * 3 > remaining:
        extra_warnings.append({
            "code": "rate-limit-low",
            "repo": "",
            "message": (
                f"About {to_inspect} repos need inspection (~{to_inspect * 3} core API calls) "
                f"but only {remaining} remain this hour; results may be truncated or fail."
            ),
        })
        print(f"  WARNING: low API budget ({remaining} core calls remain).", file=sys.stderr)

    inspected, errors, reused = inspect_records_cached(records, cache, use_cache=use_cache)
    if use_cache:
        save_inspection_cache(out, inspected, errors)
    catalog = build_catalog(
        inspected, login=login,
        scan=scan_descriptor(include_accessible=args.include_accessible, include_private=args.include_private),
        generated_at=scanned_at,
    )
    write_outputs(out, catalog, errors, extra_warnings, lang=args.lang)
    cache_note = f" (reused {reused} from cache)" if use_cache and reused else ""
    print(f"Wrote {out}/catalog.json, {out}/PROJECTS.md, {out}/warnings.json{cache_note}")
    if errors:
        print(f"  {len(errors)} inspection error(s) recorded in warnings.json.", file=sys.stderr)
    return 0


def cmd_discover(args: argparse.Namespace) -> int:
    out = Path(args.out)
    if args.dry_run:
        vis = "all" if args.include_private else "public"
        print(f"DRY RUN: gh api /user/repos?affiliation=owner&visibility={vis} --paginate --slurp")
        return 0
    ok, msg = ensure_prerequisites()
    if not ok:
        print(f"ERROR: {msg}", file=sys.stderr)
        return 1
    scanned_at = now_iso()
    login, records, extra_warnings = assemble_records(
        scanned_at,
        include_accessible=args.include_accessible,
        include_private=args.include_private,
    )
    guard = private_output_guard(out, args.include_private)
    if guard:
        extra_warnings.append(guard)
    cdir = cache_dir(out)
    cdir.mkdir(parents=True, exist_ok=True)
    (cdir / "discovered.json").write_text(dumps_json(records), encoding="utf-8")
    (cdir / "meta.json").write_text(
        dumps_json({
            "login": login,
            "extra_warnings": extra_warnings,
            "include_accessible": args.include_accessible,
            "include_private": args.include_private,
        }),
        encoding="utf-8",
    )
    print(f"Discovered {len(records)} repositories -> {cdir / 'discovered.json'}")
    return 0


def cmd_inspect(args: argparse.Namespace) -> int:
    out = Path(args.out)
    cdir = cache_dir(out)
    src = cdir / "discovered.json"
    if not src.exists():
        print(f"ERROR: {src} not found. Run `discover` first.", file=sys.stderr)
        return 1
    if args.dry_run:
        print("DRY RUN: would fetch README + contents for each discovered repo.")
        return 0
    records = json.loads(src.read_text(encoding="utf-8"))
    use_cache = not args.no_cache
    cache = load_inspection_cache(out) if use_cache else {}
    inspected, errors, reused = inspect_records_cached(records, cache, use_cache=use_cache)
    if use_cache:
        save_inspection_cache(out, inspected, errors)
    (cdir / "inspected.json").write_text(dumps_json(inspected), encoding="utf-8")
    (cdir / "errors.json").write_text(dumps_json(errors), encoding="utf-8")
    note = f" (reused {reused} from cache)" if use_cache and reused else ""
    print(f"Inspected {len(inspected)} repositories -> {cdir / 'inspected.json'}{note}")
    return 0


def cmd_render(args: argparse.Namespace) -> int:
    out = Path(args.out)
    cdir = cache_dir(out)
    src = cdir / "inspected.json"
    if not src.exists():
        src = cdir / "discovered.json"
    if not src.exists():
        print(f"ERROR: no cached records in {cdir}. Run `discover`/`inspect` first.", file=sys.stderr)
        return 1
    records = json.loads(src.read_text(encoding="utf-8"))
    errors_path = cdir / "errors.json"
    errors = json.loads(errors_path.read_text(encoding="utf-8")) if errors_path.exists() else []
    meta_path = cdir / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    login = meta.get("login") or authenticated_login()
    extra_warnings = meta.get("extra_warnings", [])
    catalog = build_catalog(
        records, login=login,
        scan=scan_descriptor(
            include_accessible=meta.get("include_accessible", False),
            include_private=meta.get("include_private", False),
        ),
        generated_at=now_iso(),
    )
    write_outputs(out, catalog, errors, extra_warnings, lang=args.lang)
    print(f"Rendered {out}/catalog.json, {out}/PROJECTS.md, {out}/warnings.json")
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    out = Path(args.out)
    catalog_path = out / "catalog.json"
    if not catalog_path.exists():
        print(f"ERROR: {catalog_path} not found.", file=sys.stderr)
        return 1
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    schema = load_schema()
    errors = validate_instance(catalog, schema, schema)
    if errors:
        print(f"INVALID: {len(errors)} error(s):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    print(f"VALID: {catalog_path} conforms to the schema ({len(catalog['repositories'])} repos).")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    out = Path(args.out)
    if args.dry_run:
        print(f"DRY RUN: would write {len(REPORTS)} reports to {out}/reports/: {', '.join(sorted(REPORTS))}")
        return 0
    catalog_path = out / "catalog.json"
    if not catalog_path.exists():
        print(f"ERROR: {catalog_path} not found. Run `scan` first.", file=sys.stderr)
        return 1
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    written = write_reports(out, catalog)
    print(f"Wrote {len(written)} reports to {out}/reports/: {', '.join(written)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="inventory.py",
        description="Read-only, privacy-first GitHub repository inventory.",
    )
    sub = p.add_subparsers(dest="command", required=True)

    def add_common(sp: argparse.ArgumentParser) -> None:
        sp.add_argument("--out", default=DEFAULT_OUT, help=f"output directory (default: {DEFAULT_OUT})")
        sp.add_argument("--dry-run", action="store_true", help="show planned actions without calling the API")

    def add_discovery_flags(sp: argparse.ArgumentParser) -> None:
        sp.add_argument(
            "--include-accessible", action="store_true",
            help="also discover collaborator + organization repositories (access, not contribution)",
        )
        sp.add_argument(
            "--include-private", action="store_true",
            help="include private repositories (README content redacted; write only to a gitignored dir)",
        )

    for name, fn, help_text in [
        ("scan", cmd_scan, "discover + inspect + render in one step"),
        ("discover", cmd_discover, "discover owned (and optionally accessible) repositories"),
        ("inspect", cmd_inspect, "add README presence + top-level contents"),
        ("render", cmd_render, "write catalog.json + PROJECTS.md + warnings.json"),
        ("report", cmd_report, "write derived reports (technology, portfolio, …) to reports/"),
        ("validate", cmd_validate, "validate catalog.json against the schema"),
    ]:
        sp = sub.add_parser(name, help=help_text)
        add_common(sp)
        if name in ("scan", "discover"):
            add_discovery_flags(sp)
        if name in ("scan", "inspect"):
            sp.add_argument(
                "--no-cache", action="store_true",
                help="ignore the inspection cache and re-inspect every repository",
            )
        if name in ("scan", "render"):
            sp.add_argument(
                "--lang", choices=sorted(STRINGS), default="en",
                help="language for PROJECTS.md section headers and labels (default: en)",
            )
        sp.set_defaults(func=fn)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
