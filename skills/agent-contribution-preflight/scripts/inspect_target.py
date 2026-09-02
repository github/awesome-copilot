#!/usr/bin/env python3
"""Read-only preflight for contribution controls and hidden machine-targeted text."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import time
from collections.abc import Iterable
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import quote

REPO_SLUG = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
HTML_COMMENT = re.compile(r"<!--[\s\S]*?-->", re.IGNORECASE)
MACHINE_AUDIENCE = re.compile(
    r"\b(?:llms?|ai\s+agents?|coding\s+assistants?|bots?|"
    r"automated\s+(?:agents?|systems?|readers?)|"
    r"machine[- ]targeted|message_for_llms)\b",
    re.IGNORECASE,
)
HIDDEN_CONTROL = re.compile(
    r"\b(?:if\s+you\s+can\s+read\s+this|do\s+not\s+reply|"
    r"next\s+comment|verification\s+code|reply\s+with|must\s+consist\s+of)\b",
    re.IGNORECASE,
)
INTEGRATION_MARKERS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "AgentScan Action reference",
        re.compile(r"MatteoGabriele/agentscan-action", re.IGNORECASE),
    ),
    ("AgentScan site link", re.compile(r"https?://agentscan\.tools", re.IGNORECASE)),
    ("AgentScan App marker", re.compile(r"agentscanapp", re.IGNORECASE)),
    ("AgentScan label or marker", re.compile(r"agent-?scan:", re.IGNORECASE)),
    (
        "AgentScan plain-text reference",
        re.compile(r"(?<![/\w-])agentscan(?![./\w:-])", re.IGNORECASE),
    ),
    (
        "AgentScan community-report link",
        re.compile(
            r"https?://github\.com/MatteoGabriele/agentscan/issues/\d+",
            re.IGNORECASE,
        ),
    ),
    (
        "Anti-slop Action reference",
        re.compile(r"(?:peakoss/)?anti-slop", re.IGNORECASE),
    ),
    (
        "Automated-contributor control label",
        re.compile(
            r"\b(?:possible\s+bot|bot:\s*(?:likely|maybe)|"
            r"spam:(?:automated-account|community-flagged|mixed-signals))\b",
            re.IGNORECASE,
        ),
    ),
)
REMOTE_SEARCH_TERMS = (
    "agentscan",
    "anti-slop",
)
CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f-\x9f]+")
CONTROL_LABEL = re.compile(
    r"^(?:agent-?scan:.*|bot:\s*(?:likely|maybe)|possible\s+bot|"
    r"spam:(?:automated-account|community-flagged|mixed-signals))$",
    re.IGNORECASE,
)
CONTROL_ACTION = re.compile(
    r"(?:MatteoGabriele/agentscan-action|peakoss/anti-slop)", re.IGNORECASE
)
POLICY_LANGUAGE = re.compile(
    r"\b(?:generative\s+AI|AI[- ](?:assisted|generated)|LLM[- ]generated|"
    r"automated\s+contributions?|automation\s+policy)\b|openjdk\.org/legal/ai",
    re.IGNORECASE,
)
POLICY_RESTRICTION = re.compile(
    r"\b(?:must\s+not|not\s+allowed|prohibit(?:ed|s)?|decline|"
    r"do\s+not\s+submit|does\s+not\s+accept|will\s+not\s+accept)\b",
    re.IGNORECASE,
)


def safe_text(value: object, limit: int = 500) -> str:
    cleaned = CONTROL_CHARACTERS.sub(" ", str(value))
    cleaned = " ".join(cleaned.split())
    return cleaned[:limit]


def is_control_label(value: str) -> bool:
    return bool(CONTROL_LABEL.fullmatch(value.strip()))


def is_policy_path(value: str) -> bool:
    normalized = value.replace("\\", "/").lower()
    name = normalized.rsplit("/", 1)[-1]
    suffix_ok = name.endswith((".md", ".rst", ".txt", ".adoc"))
    template_yaml = (
        "/.github/issue_template/" in f"/{normalized}"
        and name.endswith((".yml", ".yaml"))
    )
    if not suffix_ok and not template_yaml:
        return False
    return any(
        marker in name or marker in normalized
        for marker in (
            "contribut",
            "ai_policy",
            "ai-policy",
            "ai-guideline",
            "generative-ai",
            "code_of_conduct",
            "code-of-conduct",
            "security.md",
            "agents.md",
            "pull_request_template",
            ".github/issue_template/",
        )
    )


@dataclass(frozen=True)
class Finding:
    kind: str
    severity: str
    source: str
    summary: str

    def __post_init__(self) -> None:
        object.__setattr__(self, "kind", safe_text(self.kind, 80))
        object.__setattr__(self, "severity", safe_text(self.severity, 20))
        object.__setattr__(self, "source", safe_text(self.source, 500))
        object.__setattr__(self, "summary", safe_text(self.summary, 500))


class InspectionError(RuntimeError):
    pass


class InspectorArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise InspectionError(safe_text(message))


def scan_text(text: str, source: str) -> list[Finding]:
    """Scan text without returning hidden instruction bodies."""
    findings: list[Finding] = []
    hidden_comments = HTML_COMMENT.findall(text)
    visible_text = HTML_COMMENT.sub("", text)
    for label, pattern in INTEGRATION_MARKERS:
        if pattern.search(visible_text):
            findings.append(
                Finding(
                    kind="contributor-control-signal",
                    severity="notice",
                    source=source,
                    summary=label,
                )
            )

    for comment in hidden_comments:
        if MACHINE_AUDIENCE.search(comment) or HIDDEN_CONTROL.search(comment):
            findings.append(
                Finding(
                    kind="machine-targeted-hidden-content",
                    severity="stop",
                    source=source,
                    summary=(
                        "Hidden HTML content may address or control an automated reader. "
                        "Its body is withheld; pause for human review."
                    ),
                )
            )
    return deduplicate(findings)


def scan_policy_text(text: str, source: str) -> list[Finding]:
    visible_text = HTML_COMMENT.sub("", text)
    if not POLICY_LANGUAGE.search(visible_text):
        return []
    restrictive = bool(POLICY_RESTRICTION.search(visible_text))
    return [
        Finding(
            kind="ai-contribution-policy",
            severity="notice",
            source=source,
            summary=(
                "Potentially restrictive AI/automation contribution policy detected; "
                "read the source before any external write."
                if restrictive
                else "AI/automation contribution policy detected; read the source "
                "before any external write."
            ),
        )
    ]


def relevant_setting_lines(text: str, *, config_file: bool) -> list[str]:
    lines = HTML_COMMENT.sub("", text).splitlines()
    if config_file:
        return lines

    selected: list[str] = []
    for index, line in enumerate(lines):
        if not CONTROL_ACTION.search(line):
            continue
        base_indent = len(line) - len(line.lstrip())
        selected.append(line)
        for following in lines[index + 1 :]:
            stripped = following.strip()
            indent = len(following) - len(following.lstrip())
            if stripped and (
                indent < base_indent
                or (indent <= base_indent and stripped.startswith("-"))
            ):
                break
            selected.append(following)
    return selected


def extract_control_settings(
    text: str, source: str, *, config_file: bool = False
) -> list[Finding]:
    """Extract a small, conservative set of visible AgentScan settings."""
    findings: list[Finding] = []
    current_top_level = ""
    allowed_values = {
        "true",
        "false",
        "full",
        "labels",
        "comment",
        "silent",
        "organic",
        "mixed",
        "automation",
    }
    direct_keys = {
        "auto-close",
        "honeypot",
        "mode",
        "scan-issues",
        "scan-pull-requests",
        "auto-close-classifications",
        "close-pr",
    }

    pending_list: tuple[str, int] | None = None
    pending_values: list[str] = []

    def add_setting(key: str, value: str) -> None:
        findings.append(
            Finding(
                kind="contributor-control-setting",
                severity="notice",
                source=source,
                summary=f"Visible contributor-control setting: {key}={value}",
            )
        )

    def flush_pending() -> None:
        nonlocal pending_list, pending_values
        if pending_list and pending_values:
            add_setting(pending_list[0], ",".join(dict.fromkeys(pending_values)))
        pending_list = None
        pending_values = []

    for raw_line in [
        *relevant_setting_lines(text, config_file=config_file),
        "",
    ]:
        indent = len(raw_line) - len(raw_line.lstrip())
        if pending_list:
            item = re.match(r"^\s*-\s*(organic|mixed|automation)\s*(?:#.*)?$", raw_line, re.IGNORECASE)
            if indent > pending_list[1] and item:
                pending_values.append(item.group(1).lower())
                continue
            flush_pending()

        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        match = re.match(r"^\s*([A-Za-z0-9_-]+)\s*:\s*(.*?)\s*$", raw_line)
        if not match:
            continue
        key = match.group(1).lower()
        raw_value = match.group(2).split("#", 1)[0].strip().strip("'\"")
        value = raw_value.lower()
        if indent == 0:
            current_top_level = key if not value else ""

        canonical = key
        if current_top_level == "scan" and key in {"issues", "pull-requests"}:
            canonical = f"scan.{key}"
        elif key not in direct_keys:
            continue

        if canonical == "auto-close-classifications":
            if not value:
                pending_list = (canonical, indent)
                continue
            values = re.findall(r"\b(?:organic|mixed|automation)\b", value)
            if not values:
                continue
            value = ",".join(dict.fromkeys(values))
        elif value not in allowed_values:
            continue

        add_setting(canonical, value)
    return deduplicate(findings)


def deduplicate(findings: Iterable[Finding]) -> list[Finding]:
    seen: set[tuple[str, str, str, str]] = set()
    result: list[Finding] = []
    for finding in findings:
        key = (
            finding.kind,
            finding.severity,
            finding.source,
            finding.summary,
        )
        if key not in seen:
            seen.add(key)
            result.append(finding)
    return result


def scan_local_repository(root: Path) -> list[Finding]:
    root = root.resolve()
    if not root.is_dir():
        raise InspectionError(f"Local repository path is not a directory: {root}")

    findings: list[Finding] = []
    for config_name in ("agentscan.yml", "agentscan.yaml"):
        config = root / ".github" / config_name
        if config.is_file():
            findings.append(
                Finding(
                    kind="agentscan-config",
                    severity="notice",
                    source=str(config),
                    summary=f"Repository contains .github/{config_name}.",
                )
            )
            config_text = config.read_text(encoding="utf-8", errors="replace")
            findings.extend(scan_text(config_text, str(config)))
            findings.extend(
                extract_control_settings(config_text, str(config), config_file=True)
            )

    workflow_dir = root / ".github" / "workflows"
    if workflow_dir.is_dir():
        for path in sorted(workflow_dir.iterdir()):
            if path.is_file() and path.suffix.lower() in {".yml", ".yaml"}:
                text = path.read_text(encoding="utf-8", errors="replace")
                findings.extend(scan_text(text, str(path)))
                findings.extend(extract_control_settings(text, str(path)))

    policy_paths: set[Path] = set()
    for path in root.iterdir():
        if path.is_file() and is_policy_path(path.name):
            policy_paths.add(path)
    for policy_root in (root / ".github", root / "docs"):
        if policy_root.is_dir():
            for path in policy_root.rglob("*"):
                if path.is_file() and is_policy_path(str(path.relative_to(root))):
                    policy_paths.add(path)
    for path in sorted(policy_paths):
        text = path.read_text(encoding="utf-8", errors="replace")
        findings.extend(scan_policy_text(text, str(path)))
        findings.extend(scan_text(text, str(path)))
    return deduplicate(findings)


def gh_json(endpoint: str, *, paginate: bool = False) -> Any:
    command = ["gh", "api"]
    if paginate:
        command.extend(["--paginate", "--slurp"])
    command.append(endpoint)
    last_detail = "unknown error"
    clean_environment = os.environ.copy()
    for variable in ("GH_DEBUG", "GH_TRACE", "DEBUG"):
        clean_environment.pop(variable, None)
    for attempt in range(3):
        try:
            process = subprocess.run(
                command,
                check=False,
                capture_output=True,
                text=True,
                encoding="utf-8",
                env=clean_environment,
            )
        except OSError as exc:
            raise InspectionError(
                f"GitHub CLI could not start: {safe_text(exc, 300)}"
            ) from None
        if process.returncode == 0:
            try:
                return json.loads(process.stdout)
            except json.JSONDecodeError:
                last_detail = "invalid JSON response"
        else:
            last_detail = safe_text(process.stderr, 300)
            if not last_detail:
                last_detail = f"gh exited with code {process.returncode}"

        transient = any(
            marker in last_detail.lower()
            for marker in (
                "eof",
                "timeout",
                "timed out",
                "connection reset",
                "http 502",
                "http 503",
                "http 504",
            )
        )
        if attempt == 2 or not transient:
            break
        time.sleep(0.25 * (attempt + 1))

    raise InspectionError(
        f"GitHub read failed for {safe_text(endpoint, 300)}: {last_detail}"
    )


def decode_content(payload: dict[str, Any]) -> str:
    content = payload.get("content")
    if not isinstance(content, str):
        return ""
    return base64.b64decode(content).decode("utf-8", errors="replace")


def flatten_pages(payload: Any) -> list[Any]:
    if not isinstance(payload, list):
        return []
    if payload and all(isinstance(page, list) for page in payload):
        return [item for page in payload for item in page]
    return payload


def append_error(errors: list[str], context: str, error: object) -> None:
    errors.append(f"{safe_text(context, 200)}: {safe_text(error, 500)}")


def scan_remote_repository(
    repo: str,
    errors: list[str] | None = None,
    history: list[dict[str, Any]] | None = None,
) -> list[Finding]:
    errors = errors if errors is not None else []
    history = history if history is not None else []
    if not REPO_SLUG.fullmatch(repo):
        raise InspectionError("Repository must be in owner/name form.")

    try:
        metadata = gh_json(f"repos/{repo}")
    except InspectionError as exc:
        append_error(errors, "repository metadata", exc)
        return []
    if not isinstance(metadata, dict):
        append_error(errors, "repository metadata", "unexpected response type")
        return []
    branch = metadata.get("default_branch")
    if not isinstance(branch, str) or not branch:
        append_error(errors, "repository metadata", "default branch is unavailable")
        return []

    control_paths: set[str] = set()
    policy_paths: set[str] = set()
    encoded_branch = quote(branch, safe="")
    try:
        tree_payload = gh_json(
            f"repos/{repo}/git/trees/{encoded_branch}?recursive=1"
        )
    except InspectionError as exc:
        append_error(errors, "repository policy tree", exc)
        tree_payload = None
    if isinstance(tree_payload, dict):
        tree_entries = tree_payload.get("tree", [])
        for entry in tree_entries if isinstance(tree_entries, list) else []:
            path = entry.get("path") if isinstance(entry, dict) else None
            if not isinstance(path, str):
                continue
            if path.lower() in {".github/agentscan.yml", ".github/agentscan.yaml"}:
                control_paths.add(path)
            if is_policy_path(path):
                policy_paths.add(path)
        if tree_payload.get("truncated") is True:
            append_error(
                errors,
                "repository policy tree",
                "GitHub marked the recursive tree incomplete",
            )
    elif tree_payload is not None:
        append_error(errors, "repository policy tree", "unexpected response type")

    entries: list[Any] = []
    for term in REMOTE_SEARCH_TERMS:
        query = quote(f"{term} repo:{repo}", safe="")
        try:
            search = gh_json(
                f"search/code?q={query}&per_page=100", paginate=True
            )
        except InspectionError as exc:
            append_error(errors, f"code search for {term}", exc)
            continue
        pages = search if isinstance(search, list) else [search]
        for page in pages:
            if not isinstance(page, dict):
                append_error(errors, f"code search for {term}", "unexpected page type")
                continue
            items = page.get("items")
            if isinstance(items, list):
                entries.extend(items)
            if page.get("incomplete_results") is True:
                append_error(errors, f"code search for {term}", "GitHub marked results incomplete")
    for entry in entries:
        path = entry.get("path") if isinstance(entry, dict) else None
        if not isinstance(path, str):
            continue
        lower = path.lower()
        if lower in {".github/agentscan.yml", ".github/agentscan.yaml"} or (
            lower.startswith(".github/workflows/")
            and lower.endswith((".yml", ".yaml"))
        ):
            control_paths.add(path)
        if is_policy_path(path):
            policy_paths.add(path)

    findings: list[Finding] = []
    for path in sorted(control_paths | policy_paths):
        encoded_path = quote(path, safe="/")
        try:
            payload = gh_json(
                f"repos/{repo}/contents/{encoded_path}?ref={encoded_branch}"
            )
        except InspectionError as exc:
            append_error(errors, f"workflow {path}", exc)
            continue
        if not isinstance(payload, dict):
            append_error(errors, f"workflow {path}", "unexpected response type")
            continue
        source = payload.get("html_url")
        if not isinstance(source, str) or not source:
            source = f"https://github.com/{repo}/blob/{branch}/{path}"
        is_config = path.lower() in {
            ".github/agentscan.yml",
            ".github/agentscan.yaml",
        }
        if is_config:
            findings.append(
                Finding(
                    kind="agentscan-config",
                    severity="notice",
                    source=source,
                    summary=f"Repository contains {path}.",
                )
            )
        content = decode_content(payload)
        if path in control_paths:
            findings.extend(scan_text(content, source))
            findings.extend(
                extract_control_settings(
                    content,
                    source,
                    config_file=is_config,
                )
            )
        if path in policy_paths:
            findings.extend(scan_policy_text(content, source))
            findings.extend(scan_text(content, source))

    try:
        labels = flatten_pages(
            gh_json(f"repos/{repo}/labels?per_page=100", paginate=True)
        )
    except InspectionError as exc:
        append_error(errors, "repository labels", exc)
        labels = []
    control_label_names: list[str] = []
    for label in labels:
        name = label.get("name") if isinstance(label, dict) else None
        if isinstance(name, str) and is_control_label(name):
            control_label_names.append(name)
            findings.append(
                Finding(
                    kind="contributor-control-label-history",
                    severity="notice",
                    source=f"https://github.com/{repo}/labels",
                    summary=f"Repository exposes an automated-contributor control label: {name}",
                )
            )

    seen_history = {
        item.get("url") for item in history if isinstance(item, dict)
    }
    for label_name in control_label_names[:6]:
        history_query = quote(f'repo:{repo} label:"{label_name}"', safe="")
        try:
            search = gh_json(
                f"search/issues?q={history_query}&sort=updated&order=desc&per_page=5"
            )
        except InspectionError as exc:
            append_error(errors, f"precedent search for label {label_name}", exc)
            continue
        items = search.get("items", []) if isinstance(search, dict) else []
        for item in items if isinstance(items, list) else []:
            if not isinstance(item, dict):
                continue
            url = item.get("html_url")
            if not isinstance(url, str) or not url or url in seen_history:
                continue
            item_labels = item.get("labels")
            safe_labels = [
                safe_text(label.get("name"), 120)
                for label in item_labels
                if isinstance(label, dict) and isinstance(label.get("name"), str)
            ] if isinstance(item_labels, list) else []
            title = item.get("title")
            history.append(
                {
                    "url": safe_text(url, 500),
                    "number": item.get("number")
                    if isinstance(item.get("number"), int)
                    else None,
                    "type": (
                        "pull-request"
                        if isinstance(item.get("pull_request"), dict)
                        else "issue"
                    ),
                    "title": (
                        safe_text(HTML_COMMENT.sub("", title), 300)
                        if isinstance(title, str)
                        else ""
                    ),
                    "state": safe_text(item.get("state", "unknown"), 30),
                    "updated_at": safe_text(item.get("updated_at", ""), 50),
                    "labels": safe_labels,
                    "matched_label": safe_text(label_name, 120),
                }
            )
            seen_history.add(url)
    return deduplicate(findings)


def scan_remote_thread(
    repo: str,
    number: int,
    errors: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> list[Finding]:
    errors = errors if errors is not None else []
    try:
        issue = gh_json(f"repos/{repo}/issues/{number}")
    except InspectionError as exc:
        append_error(errors, "thread metadata", exc)
        return []
    if not isinstance(issue, dict):
        append_error(errors, "thread metadata", "unexpected response type")
        return []

    issue_url = issue.get("html_url")
    if not isinstance(issue_url, str) or not issue_url:
        issue_url = f"https://github.com/{repo}/issues/{number}"
    body = issue.get("body")
    title = issue.get("title")
    findings = scan_text(title if isinstance(title, str) else "", issue_url)
    findings.extend(scan_text(body if isinstance(body, str) else "", issue_url))

    is_pull_request = isinstance(issue.get("pull_request"), dict)
    labels: list[str] = []
    for label in issue.get("labels", []) if isinstance(issue.get("labels"), list) else []:
        name = label.get("name") if isinstance(label, dict) else None
        if not isinstance(name, str):
            continue
        labels.append(safe_text(name, 120))
        is_agentscan_report_label = (
            repo.lower() == "matteogabriele/agentscan"
            and name.lower().startswith("automation")
        )
        if is_control_label(name) or is_agentscan_report_label:
            findings.append(
                Finding(
                    kind="thread-control-label",
                    severity="notice",
                    source=issue_url,
                    summary=f"Thread carries an automated-contributor control label: {name}",
                )
            )

    author = issue.get("user")
    author_login = author.get("login") if isinstance(author, dict) else None
    if metadata is not None:
        metadata.update(
            {
                "url": safe_text(issue_url, 500),
                "number": number,
                "type": "pull-request" if is_pull_request else "issue",
                "title": (
                    safe_text(HTML_COMMENT.sub("", title), 300)
                    if isinstance(title, str)
                    else ""
                ),
                "state": safe_text(issue.get("state", "unknown"), 30),
                "state_reason": safe_text(issue.get("state_reason", ""), 50),
                "locked": bool(issue.get("locked")),
                "author": safe_text(author_login, 100) if author_login else "",
                "labels": labels,
            }
        )

    endpoints = [
        (
            f"repos/{repo}/issues/{number}/comments?per_page=100",
            "issue comments",
        )
    ]
    if is_pull_request:
        endpoints.extend(
            [
                (
                    f"repos/{repo}/pulls/{number}/reviews?per_page=100",
                    "pull-request reviews",
                ),
                (
                    f"repos/{repo}/pulls/{number}/comments?per_page=100",
                    "pull-request inline comments",
                ),
            ]
        )

    for endpoint, context in endpoints:
        try:
            items = flatten_pages(gh_json(endpoint, paginate=True))
        except InspectionError as exc:
            append_error(errors, context, exc)
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            item_body = item.get("body")
            item_url = item.get("html_url")
            if not isinstance(item_url, str) or not item_url:
                item_url = issue_url
            findings.extend(
                scan_text(item_body if isinstance(item_body, str) else "", item_url)
            )

    if is_pull_request:
        try:
            pull = gh_json(f"repos/{repo}/pulls/{number}")
        except InspectionError as exc:
            append_error(errors, "pull-request metadata", exc)
            pull = None
        head = pull.get("head") if isinstance(pull, dict) else None
        head_sha = head.get("sha") if isinstance(head, dict) else None
        if isinstance(head_sha, str) and head_sha:
            encoded_sha = quote(head_sha, safe="")
            try:
                checks_payload = gh_json(
                    f"repos/{repo}/commits/{encoded_sha}/check-runs?per_page=100",
                    paginate=True,
                )
            except InspectionError as exc:
                append_error(errors, "pull-request check runs", exc)
                checks_payload = None
            check_pages = (
                checks_payload if isinstance(checks_payload, list) else [checks_payload]
            )
            checks: list[Any] = []
            for page in check_pages:
                if isinstance(page, dict) and isinstance(page.get("check_runs"), list):
                    checks.extend(page["check_runs"])
            for check in checks:
                if not isinstance(check, dict):
                    continue
                output = check.get("output")
                output = output if isinstance(output, dict) else {}
                check_text = "\n".join(
                    value
                    for value in (
                        check.get("name"),
                        check.get("details_url"),
                        output.get("title"),
                        output.get("summary"),
                        output.get("text"),
                    )
                    if isinstance(value, str)
                )
                details_url = check.get("details_url")
                check_source = (
                    details_url
                    if isinstance(details_url, str) and details_url
                    else f"{issue_url}/checks"
                )
                findings.extend(scan_text(check_text, check_source))
    return deduplicate(findings)


def status_for(
    findings: Iterable[Finding], *, complete: bool = True
) -> tuple[str, int]:
    findings = list(findings)
    if any(finding.severity == "stop" for finding in findings):
        return "human-review-required", 3
    if not complete:
        return "inspection-incomplete", 1
    if findings:
        return "contributor-control-signal-observed", 2
    return "no-public-signal-observed", 0


def render_text(report: dict[str, Any]) -> str:
    lines = [
        f"status: {report['status']}",
        f"complete: {str(report['complete']).lower()}",
        f"exit_code: {report['exit_code']}",
    ]
    for thread in report.get("threads", []):
        lines.append(
            f"thread: {thread['type']} #{thread['number']} "
            f"state={thread['state']} locked={str(thread['locked']).lower()} "
            f"({thread['url']})"
        )
        if thread.get("labels"):
            lines.append(f"  labels: {', '.join(thread['labels'])}")
    for precedent in report.get("precedents", []):
        lines.append(
            f"precedent: {precedent['type']} #{precedent['number']} "
            f"state={precedent['state']} "
            f"matched_label={precedent['matched_label']} ({precedent['url']})"
        )
    for finding in report["findings"]:
        lines.append(
            f"- [{finding['severity']}] {finding['kind']}: "
            f"{finding['summary']} ({finding['source']})"
        )
    for error in report["errors"]:
        lines.append(f"- [inspection-error] {error}")
    lines.append(f"note: {report['note']}")
    return "\n".join(lines)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = InspectorArgumentParser(
        description=(
            "Read-only check for contribution policies, AgentScan or related "
            "control signals, precedent, and hidden machine-targeted content."
        )
    )
    parser.add_argument("--local", type=Path, help="Local repository checkout")
    parser.add_argument("--repo", help="Public GitHub repository as owner/name")
    parser.add_argument("--thread", type=int, help="Issue or pull-request number")
    parser.add_argument("--text-file", type=Path, help="Already-downloaded thread text")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args(argv)
    if not any((args.local, args.repo, args.text_file)):
        parser.error("provide --local, --repo, or --text-file")
    if args.thread is not None and not args.repo:
        parser.error("--thread requires --repo")
    if args.thread is not None and args.thread < 1:
        parser.error("--thread must be positive")
    return args


def main(argv: list[str] | None = None) -> int:
    try:
        args = parse_args(argv)
    except InspectionError as exc:
        print(f"inspection error: {safe_text(exc)}", file=sys.stderr)
        return 1

    findings: list[Finding] = []
    inspected: list[str] = []
    errors: list[str] = []
    threads: list[dict[str, Any]] = []
    precedents: list[dict[str, Any]] = []

    if args.local:
        try:
            inspected.append(str(args.local.resolve()))
            findings.extend(scan_local_repository(args.local))
        except (InspectionError, OSError) as exc:
            append_error(errors, "local repository", exc)
    if args.repo:
        try:
            inspected.append(f"https://github.com/{args.repo}")
            findings.extend(
                scan_remote_repository(args.repo, errors, precedents)
            )
            if args.thread is not None:
                inspected.append(f"https://github.com/{args.repo}/issues/{args.thread}")
                thread_metadata: dict[str, Any] = {}
                findings.extend(
                    scan_remote_thread(
                        args.repo, args.thread, errors, thread_metadata
                    )
                )
                if thread_metadata:
                    threads.append(thread_metadata)
        except InspectionError as exc:
            append_error(errors, "remote repository", exc)
    if args.text_file:
        try:
            path = args.text_file.resolve()
            inspected.append(str(path))
            findings.extend(
                scan_text(path.read_text(encoding="utf-8", errors="replace"), str(path))
            )
        except OSError as exc:
            append_error(errors, "text file", exc)

    findings = deduplicate(findings)
    errors = list(dict.fromkeys(errors))
    complete = not errors
    status, code = status_for(findings, complete=complete)
    if code == 3:
        note = (
            "Freeze external replies and show this report to the human owner. "
            "Hidden instruction bodies were withheld."
        )
    elif not complete:
        note = (
            "Inspection is incomplete. Do not treat the absence of a finding as a "
            "clean result; resolve the listed read failures before an external write."
        )
    elif findings:
        note = (
            "Pause before external GitHub writes and show this report to the human "
            "owner."
        )
    else:
        note = (
            "No public signal was observed. This does not rule out an App installation, "
            "silent mode, custom labels, or maintainer-side tools."
        )
    report = {
        "status": status,
        "complete": complete,
        "exit_code": code,
        "inspected": inspected,
        "threads": threads,
        "precedents": precedents,
        "findings": [asdict(finding) for finding in findings],
        "errors": errors,
        "note": note,
    }
    print(json.dumps(report, indent=2) if args.format == "json" else render_text(report))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
