#!/usr/bin/env python3
"""Audit and safely remove Git worktrees selected by an agent.

Remote issue and harness facts are intentionally supplied as normalized evidence.
This script owns only deterministic local Git inspection and mutation.
"""

from __future__ import annotations

import argparse
import datetime as dt
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple, Union


SCHEMA_VERSION = 1
PLAN_SCHEMA_VERSION = 1
REGENERABLE_IGNORED_NAMES = {
    ".cache",
    ".mypy_cache",
    ".next",
    ".nuxt",
    ".parcel-cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    ".venv",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "out",
    "target",
    "venv",
    "vendor",
}
SENSITIVE_IGNORED_GLOBS = (
    ".env",
    ".env.*",
    "*.db",
    "*.db3",
    "*.key",
    "*.p12",
    "*.pem",
    "*.sqlite",
    "*.sqlite3",
    "credentials*",
    "id_rsa*",
    "secrets*",
)
STRONG_BRANCH_ISSUE_RE = re.compile(
    r"(?:^|[/_-])(?:issues?[/_-]?)?#?(\d+)(?=$|[/_-])|(?:^|[/_-])(\d+)(?=$|[/_-])",
    re.IGNORECASE,
)
CLOSING_ISSUE_RE = re.compile(
    r"\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?[ \t]*#(\d+)\b",
    re.IGNORECASE,
)
WEAK_ISSUE_RE = re.compile(
    r"\b(?:ref(?:s|erence[sd])?|see)\s*:?[ \t]*#(\d+)\b", re.IGNORECASE
)


class CleanupError(RuntimeError):
    """A user-actionable safety or Git failure."""


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def emit_json(value: Any, stream: Any = sys.stdout) -> None:
    json.dump(value, stream, ensure_ascii=False, indent=2, sort_keys=True)
    stream.write("\n")


def run(
    command: Sequence[str],
    *,
    check: bool = True,
    cwd: Optional[Path] = None,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.setdefault("LC_ALL", "C")
    result = subprocess.run(
        list(command),
        cwd=str(cwd) if cwd else None,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        encoding="utf-8",
        errors="surrogateescape",
        check=False,
    )
    if check and result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown error"
        raise CleanupError(f"Command failed ({' '.join(command)}): {detail}")
    return result


def git(repo: Path, *arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(("git", "-C", str(repo), "-c", "core.quotePath=false", *arguments), check=check)


def canonical(path: Union[str, Path]) -> Path:
    return Path(path).expanduser().resolve()


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def repository_context(repo_arg: Union[str, Path]) -> Dict[str, str]:
    repo = canonical(repo_arg)
    top = canonical(git(repo, "rev-parse", "--show-toplevel").stdout.strip())
    common_raw = git(repo, "rev-parse", "--path-format=absolute", "--git-common-dir").stdout.strip()
    common = canonical(common_raw)
    return {"repo": str(repo), "top_level": str(top), "common_dir": str(common)}


def parse_worktree_porcelain(repo: Path) -> List[Dict[str, Any]]:
    output = git(repo, "worktree", "list", "--porcelain", "-z").stdout
    records: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None

    for token in output.split("\0"):
        if not token:
            continue
        if token.startswith("worktree "):
            if current:
                records.append(current)
            current = {
                "path": token[len("worktree ") :],
                "head": None,
                "branch": None,
                "detached": False,
                "bare": False,
                "locked": False,
                "locked_reason": None,
                "prunable": False,
                "prunable_reason": None,
            }
            continue
        if current is None:
            raise CleanupError("Unexpected `git worktree list --porcelain -z` output")
        if token.startswith("HEAD "):
            current["head"] = token[len("HEAD ") :]
        elif token.startswith("branch "):
            ref = token[len("branch ") :]
            current["branch"] = ref.removeprefix("refs/heads/")
        elif token == "detached":
            current["detached"] = True
        elif token == "bare":
            current["bare"] = True
        elif token == "locked" or token.startswith("locked "):
            current["locked"] = True
            current["locked_reason"] = token[len("locked") :].strip() or None
        elif token == "prunable" or token.startswith("prunable "):
            current["prunable"] = True
            current["prunable_reason"] = token[len("prunable") :].strip() or None

    if current:
        records.append(current)
    if not records:
        raise CleanupError("Git reported no worktrees")
    return records


def split_z(output: str) -> List[str]:
    return [item for item in output.split("\0") if item]


def status_entries(worktree: Path) -> List[str]:
    result = git(
        worktree,
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=all",
    )
    return split_z(result.stdout)


def ignored_entries(worktree: Path) -> List[str]:
    result = git(
        worktree,
        "status",
        "--porcelain=v1",
        "-z",
        "--ignored=matching",
        "--untracked-files=normal",
    )
    values: List[str] = []
    for entry in split_z(result.stdout):
        if entry.startswith("!! "):
            values.append(entry[3:])
    return sorted(set(values))


def classify_ignored(paths: Iterable[str]) -> Dict[str, List[str]]:
    result: Dict[str, List[str]] = {
        "regenerable": [],
        "sensitive": [],
        "unknown": [],
    }
    for raw in sorted(set(paths)):
        normalized = raw.rstrip("/")
        parts = [part for part in normalized.replace("\\", "/").split("/") if part]
        basenames = [normalized, Path(normalized).name, *(parts[:1] or [])]
        if any(
            fnmatch.fnmatch(name.lower(), pattern.lower())
            for name in basenames
            for pattern in SENSITIVE_IGNORED_GLOBS
        ):
            result["sensitive"].append(raw)
        elif any(part in REGENERABLE_IGNORED_NAMES for part in parts):
            result["regenerable"].append(raw)
        else:
            result["unknown"].append(raw)
    return result


def python_directory_size(path: Path) -> Tuple[Optional[int], Optional[str]]:
    total = 0
    try:
        for root, dirs, files in os.walk(path, followlinks=False):
            for name in dirs + files:
                candidate = Path(root) / name
                try:
                    total += candidate.lstat().st_size
                except OSError:
                    continue
        return total, None
    except OSError as exc:
        return None, str(exc)


def directory_size(path: Path) -> Tuple[Optional[int], Optional[str]]:
    du = shutil.which("du")
    if du:
        result = run((du, "-sk", str(path)), check=False)
        if result.returncode == 0:
            first = result.stdout.split(maxsplit=1)
            if first and first[0].isdigit():
                return int(first[0]) * 1024, None
    return python_directory_size(path)


def refs_containing(repo: Path, head: str) -> List[str]:
    result = git(repo, "for-each-ref", f"--contains={head}", "--format=%(refname)")
    return sorted(line.strip() for line in result.stdout.splitlines() if line.strip())


def branch_upstream(repo: Path, branch: Optional[str]) -> Optional[str]:
    if not branch:
        return None
    result = git(
        repo,
        "for-each-ref",
        "--format=%(upstream:short)",
        f"refs/heads/{branch}",
    )
    value = result.stdout.strip()
    return value or None


def issue_evidence(branch: Optional[str], commit_message: str, path: str) -> Dict[str, Any]:
    branch_ids: List[int] = []
    if branch:
        for match in STRONG_BRANCH_ISSUE_RE.finditer(branch):
            raw = match.group(1) or match.group(2)
            if raw:
                branch_ids.append(int(raw))
    closing_ids = [int(value) for value in CLOSING_ISSUE_RE.findall(commit_message)]
    weak_ids = [int(value) for value in WEAK_ISSUE_RE.findall(commit_message)]
    path_ids = [int(value) for value in re.findall(r"(?<!\d)(\d{1,7})(?!\d)", path)]
    return {
        "branch_ids": sorted(set(branch_ids)),
        "closing_commit_ids": sorted(set(closing_ids)),
        "weak_commit_ids": sorted(set(weak_ids)),
        "path_ids": sorted(set(path_ids)),
    }


def baseline_details(repo: Path, baseline: Optional[str], head: str) -> Dict[str, Any]:
    if not baseline:
        return {"ref": None, "resolved": None, "head_is_ancestor": None, "behind": None, "ahead": None}
    verify = git(repo, "rev-parse", "--verify", f"{baseline}^{{commit}}", check=False)
    if verify.returncode != 0:
        raise CleanupError(f"Baseline does not resolve to a commit: {baseline}")
    resolved = verify.stdout.strip()
    ancestor = git(repo, "merge-base", "--is-ancestor", head, resolved, check=False)
    if ancestor.returncode not in (0, 1):
        raise CleanupError(f"Unable to compare {head} with baseline {baseline}")
    counts = git(repo, "rev-list", "--left-right", "--count", f"{resolved}...{head}").stdout.split()
    behind, ahead = (int(counts[0]), int(counts[1]))
    return {
        "ref": baseline,
        "resolved": resolved,
        "head_is_ancestor": ancestor.returncode == 0,
        "behind": behind,
        "ahead": ahead,
    }


def inspect_worktree(
    repo: Path,
    record: Dict[str, Any],
    *,
    main_worktree: str,
    scan_anchor: str,
    baseline: Optional[str],
) -> Dict[str, Any]:
    path_text = record["path"]
    absolute = Path(path_text).expanduser().absolute()
    resolved = canonical(absolute) if absolute.exists() else absolute
    item = dict(record)
    item.update(
        {
            "path": str(absolute),
            "resolved_path": str(resolved),
            "path_is_symlinked": str(absolute) != str(resolved),
            "is_main": str(absolute) == main_worktree,
            "is_scan_anchor": str(absolute) == scan_anchor,
            "exists": absolute.exists(),
            "dirty": None,
            "status": [],
            "ignored": {"regenerable": [], "sensitive": [], "unknown": []},
            "ignored_entries": [],
            "size_bytes": None,
            "size_error": None,
            "commit_subject": None,
            "commit_date": None,
            "retaining_refs": [],
            "upstream": None,
            "issue_evidence": {"branch_ids": [], "closing_commit_ids": [], "weak_commit_ids": [], "path_ids": []},
            "baseline": {"ref": baseline, "resolved": None, "head_is_ancestor": None, "behind": None, "ahead": None},
        }
    )
    if not absolute.exists() or record.get("bare"):
        return item

    entries = status_entries(absolute)
    ignored = ignored_entries(absolute)
    ignored_classification = classify_ignored(ignored)
    size, size_error = directory_size(absolute)
    head = record.get("head") or git(absolute, "rev-parse", "HEAD").stdout.strip()
    commit_subject = git(absolute, "show", "-s", "--format=%s", head).stdout.strip()
    commit_message = git(absolute, "show", "-s", "--format=%B", head).stdout
    commit_date = git(absolute, "show", "-s", "--format=%cI", head).stdout.strip()
    item.update(
        {
            "head": head,
            "dirty": bool(entries),
            "status": entries,
            "ignored": ignored_classification,
            "ignored_entries": ignored,
            "size_bytes": size,
            "size_error": size_error,
            "commit_subject": commit_subject,
            "commit_date": commit_date,
            "retaining_refs": refs_containing(repo, head),
            "upstream": branch_upstream(repo, record.get("branch")),
            "issue_evidence": issue_evidence(record.get("branch"), commit_message, path_text),
            "baseline": baseline_details(repo, baseline, head),
        }
    )
    return item


def scan_repository(repo_arg: Union[str, Path], baseline: Optional[str] = None) -> Dict[str, Any]:
    context = repository_context(repo_arg)
    repo = Path(context["top_level"])
    records = parse_worktree_porcelain(repo)
    main_worktree = str(Path(records[0]["path"]).expanduser().absolute())
    scan_anchor = context["top_level"]
    baseline_resolved: Optional[str] = None
    if baseline:
        baseline_resolved = git(repo, "rev-parse", "--verify", f"{baseline}^{{commit}}").stdout.strip()
    worktrees = [
        inspect_worktree(
            repo,
            record,
            main_worktree=main_worktree,
            scan_anchor=scan_anchor,
            baseline=baseline,
        )
        for record in records
    ]
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": utc_now(),
        "repository": {
            "scan_anchor": scan_anchor,
            "common_dir": context["common_dir"],
            "main_worktree": main_worktree,
            "baseline": baseline,
            "baseline_resolved": baseline_resolved,
        },
        "worktrees": worktrees,
    }


def human_size(value: Optional[int]) -> str:
    if value is None:
        return "unknown"
    size = float(value)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if size < 1024.0 or unit == "TiB":
            return f"{size:.1f} {unit}" if unit != "B" else f"{int(size)} B"
        size /= 1024.0
    return f"{size:.1f} TiB"


def scan_markdown(scan: Dict[str, Any]) -> str:
    lines = [
        "# Git worktree inventory",
        "",
        f"Generated: `{scan['generated_at']}`",
        "",
        "| Path | Branch | Local state | Issue evidence | Retaining refs | Size |",
        "|---|---|---|---|---:|---:|",
    ]
    for item in scan["worktrees"]:
        branch = item.get("branch") or "(detached)"
        if item.get("prunable"):
            state = "prunable"
        elif item.get("locked"):
            state = "locked"
        elif item.get("dirty") is True:
            state = "dirty"
        elif item.get("dirty") is False:
            state = "clean"
        else:
            state = "unavailable"
        evidence = item.get("issue_evidence", {})
        issue_ids = sorted(
            set(evidence.get("branch_ids", []))
            | set(evidence.get("closing_commit_ids", []))
            | set(evidence.get("weak_commit_ids", []))
        )
        issue_text = ", ".join(f"#{value}" for value in issue_ids) or "—"
        path = str(item["path"]).replace("|", "\\|")
        lines.append(
            f"| `{path}` | `{branch}` | {state} | {issue_text} | "
            f"{len(item.get('retaining_refs', []))} | {human_size(item.get('size_bytes'))} |"
        )
    return "\n".join(lines) + "\n"


def write_text_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            stream.write(text)
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except OSError:
            pass
        raise


def load_json(path: Path) -> Dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as stream:
            value = json.load(stream)
    except (OSError, json.JSONDecodeError) as exc:
        raise CleanupError(f"Unable to read JSON from {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise CleanupError(f"Expected a JSON object in {path}")
    return value


def ignored_fingerprint(entries: Iterable[str]) -> str:
    payload = "\0".join(sorted(entries)).encode("utf-8", errors="surrogateescape")
    return hashlib.sha256(payload).hexdigest()


def validate_remote_evidence(evidence: Dict[str, Any], *, risk_acknowledged: bool) -> None:
    issue = evidence.get("issue")
    if not isinstance(issue, dict):
        raise CleanupError("Every selected worktree requires normalized issue/PR/MR evidence")
    kind = issue.get("kind")
    state = str(issue.get("state", "")).lower()
    if issue.get("provider") not in {"github", "gitlab"}:
        raise CleanupError("Remote evidence provider must be `github` or `gitlab`")
    if not isinstance(issue.get("repository_url"), str) or not issue["repository_url"]:
        raise CleanupError("Remote evidence requires repository_url")
    if not isinstance(issue.get("url"), str) or not issue["url"]:
        raise CleanupError("Remote evidence requires the exact issue/PR/MR URL")
    if not isinstance(issue.get("number"), int) or issue["number"] <= 0:
        raise CleanupError("Remote evidence requires a positive issue/PR/MR number")
    if kind == "issue":
        valid = state == "closed"
    elif kind in {"pull_request", "merge_request"}:
        valid = state == "merged"
    else:
        raise CleanupError(f"Unsupported remote item kind: {kind!r}")
    if not valid:
        raise CleanupError(f"Remote item is not eligible: kind={kind!r}, state={state!r}")

    linked_change = evidence.get("linked_change")
    if linked_change is not None:
        if not isinstance(linked_change, dict):
            raise CleanupError("linked_change must be an object when supplied")
        linked_state = str(linked_change.get("state", "")).lower()
        if linked_state != "merged" and not risk_acknowledged:
            raise CleanupError("Linked PR/MR is not merged and risk_acknowledged is false")

    confidence = evidence.get("mapping_confidence")
    if confidence != "strong" and not risk_acknowledged:
        raise CleanupError("Issue mapping is not strong and risk_acknowledged is false")

    harness = evidence.get("harness_state")
    if harness == "active":
        raise CleanupError("An active harness task may still be using this worktree")
    if harness not in {"inactive", "not_managed"} and not risk_acknowledged:
        raise CleanupError("Harness state is not proven inactive and risk_acknowledged is false")


def validate_target_for_plan(
    item: Dict[str, Any],
    selection: Dict[str, Any],
    *,
    main_worktree: str,
    scan_anchor: str,
    branch_action: str,
    backup_orphans: bool,
) -> Optional[str]:
    path = Path(item["path"])
    resolved = Path(item["resolved_path"])
    cwd = canonical(Path.cwd())
    home = canonical(Path.home())
    root = Path(path.anchor)
    risk_acknowledged = bool(selection.get("risk_acknowledged"))

    if item.get("is_main") or item["path"] == main_worktree:
        raise CleanupError(f"Refusing to remove the main worktree: {path}")
    if item.get("is_scan_anchor") or item["path"] == scan_anchor:
        raise CleanupError(f"Refusing to remove the scan anchor worktree: {path}")
    if path in {home, root}:
        raise CleanupError(f"Refusing broad destructive path: {path}")
    if is_within(cwd, resolved):
        raise CleanupError(f"Refusing to remove the current working directory or its ancestor: {path}")
    if item.get("path_is_symlinked"):
        raise CleanupError(f"Refusing a symlink-resolved worktree path: {path}")
    if not item.get("exists"):
        raise CleanupError(f"Worktree directory is missing: {path}")
    if item.get("locked"):
        raise CleanupError(f"Worktree is locked: {path}")
    if item.get("prunable"):
        raise CleanupError(
            f"Prunable metadata requires a separate explicitly confirmed workflow: {path}"
        )
    if item.get("dirty"):
        raise CleanupError(f"Worktree has tracked or untracked changes: {path}")

    ignored = item.get("ignored", {})
    risky_ignored = list(ignored.get("sensitive", [])) + list(ignored.get("unknown", []))
    if risky_ignored and not selection.get("ignored_paths_approved"):
        raise CleanupError(f"Worktree has unapproved ignored paths: {path}: {risky_ignored}")

    validate_remote_evidence(selection.get("evidence", {}), risk_acknowledged=risk_acknowledged)

    branch = item.get("branch")
    retaining_refs = item.get("retaining_refs", [])
    backup_branch: Optional[str] = None
    if not retaining_refs:
        if not backup_orphans:
            raise CleanupError(f"HEAD is not retained by any ref: {path}")
        date = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d")
        backup_branch = f"worktree-cleanup/backup-{date}-{item['head'][:12]}"
    if branch_action == "delete" and not branch:
        raise CleanupError(f"Cannot delete a branch for detached worktree: {path}")
    if branch_action == "delete" and not item.get("baseline", {}).get("head_is_ancestor"):
        raise CleanupError(
            f"Branch deletion requires Git ancestry to the selected baseline: {path}"
        )
    return backup_branch


def create_plan(repo_arg: str, selection_path: Path, output_path: Path) -> Dict[str, Any]:
    selection = load_json(selection_path)
    branch_action = selection.get("branch_action", "keep")
    if branch_action not in {"keep", "delete"}:
        raise CleanupError("branch_action must be `keep` or `delete`")
    backup_orphans = bool(selection.get("backup_orphans", False))
    baseline = selection.get("baseline")
    targets = selection.get("targets")
    if not isinstance(targets, list) or not targets:
        raise CleanupError("Selection must contain a non-empty targets list")

    scan = scan_repository(repo_arg, baseline=baseline)
    by_path = {item["path"]: item for item in scan["worktrees"]}
    main_worktree = scan["repository"]["main_worktree"]
    scan_anchor = scan["repository"]["scan_anchor"]
    selection_resolved = canonical(selection_path)
    output_absolute = output_path.expanduser().absolute()
    output_resolved = canonical(output_absolute.parent) / output_absolute.name
    for item in scan["worktrees"]:
        if not item.get("exists"):
            continue
        worktree_resolved = Path(item["resolved_path"])
        if is_within(selection_resolved, worktree_resolved):
            raise CleanupError("Selection JSON must be outside every registered worktree")
        if is_within(output_resolved, worktree_resolved):
            raise CleanupError("Plan JSON must be outside every registered worktree")
    plan_targets: List[Dict[str, Any]] = []
    seen: set[str] = set()
    backup_names: set[str] = set()

    for selected in targets:
        if not isinstance(selected, dict) or not isinstance(selected.get("path"), str):
            raise CleanupError("Each selection target requires an exact absolute path")
        selected_path = str(Path(selected["path"]).expanduser().absolute())
        if selected_path in seen:
            raise CleanupError(f"Duplicate selected path: {selected_path}")
        seen.add(selected_path)
        item = by_path.get(selected_path)
        if item is None:
            raise CleanupError(f"Selected path is not a registered worktree: {selected_path}")
        backup_branch = validate_target_for_plan(
            item,
            selected,
            main_worktree=main_worktree,
            scan_anchor=scan_anchor,
            branch_action=branch_action,
            backup_orphans=backup_orphans,
        )
        if backup_branch and backup_branch in backup_names:
            raise CleanupError(f"Multiple targets would create the same backup branch: {backup_branch}")
        if backup_branch:
            backup_names.add(backup_branch)
        plan_targets.append(
            {
                "path": item["path"],
                "resolved_path": item["resolved_path"],
                "head": item["head"],
                "branch": item.get("branch"),
                "detached": item.get("detached", False),
                "backup_branch": backup_branch,
                "ignored_fingerprint": ignored_fingerprint(item.get("ignored_entries", [])),
                "ignored_entries": item.get("ignored_entries", []),
                "retaining_refs": item.get("retaining_refs", []),
                "size_bytes": item.get("size_bytes"),
                "evidence": selected.get("evidence", {}),
                "risk_acknowledged": bool(selected.get("risk_acknowledged")),
            }
        )

    plan = {
        "schema_version": PLAN_SCHEMA_VERSION,
        "plan_id": secrets.token_hex(12),
        "created_at": utc_now(),
        "repository": scan["repository"],
        "branch_action": branch_action,
        "backup_orphans": backup_orphans,
        "estimated_reclaim_bytes": sum(item.get("size_bytes") or 0 for item in plan_targets),
        "targets": plan_targets,
    }
    write_text_atomic(output_path, json.dumps(plan, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    return plan


def verify_common_dir(repo: Path, expected: str) -> None:
    actual = repository_context(repo)["common_dir"]
    if actual != expected:
        raise CleanupError(f"Plan belongs to a different repository: expected {expected}, found {actual}")


def preflight_plan(repo: Path, plan: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    baseline = plan["repository"].get("baseline")
    fresh = scan_repository(repo, baseline=baseline)
    if fresh["repository"].get("baseline_resolved") != plan["repository"].get("baseline_resolved"):
        raise CleanupError("Baseline moved since confirmation")
    by_path = {item["path"]: item for item in fresh["worktrees"]}
    for target in plan["targets"]:
        path = target["path"]
        item = by_path.get(path)
        if item is None:
            raise CleanupError(f"Worktree is no longer registered: {path}")
        if item.get("head") != target.get("head"):
            raise CleanupError(f"HEAD changed since confirmation: {path}")
        if item.get("branch") != target.get("branch"):
            raise CleanupError(f"Branch changed since confirmation: {path}")
        if item.get("dirty"):
            raise CleanupError(f"Worktree became dirty after confirmation: {path}")
        if item.get("locked") or item.get("prunable"):
            raise CleanupError(f"Worktree lock/prunable state changed after confirmation: {path}")
        if item.get("resolved_path") != target.get("resolved_path") or item.get("path_is_symlinked"):
            raise CleanupError(f"Worktree path resolution changed after confirmation: {path}")
        if ignored_fingerprint(item.get("ignored_entries", [])) != target.get("ignored_fingerprint"):
            raise CleanupError(f"Ignored paths changed after confirmation: {path}")
        if not target.get("backup_branch") and not item.get("retaining_refs"):
            raise CleanupError(f"HEAD lost all retaining refs after confirmation: {path}")
        if target.get("backup_branch"):
            exists = git(repo, "show-ref", "--verify", "--quiet", f"refs/heads/{target['backup_branch']}", check=False)
            if exists.returncode == 0:
                raise CleanupError(f"Backup branch already exists: {target['backup_branch']}")
        if plan.get("branch_action") == "delete":
            baseline_info = item.get("baseline", {})
            if not baseline_info.get("head_is_ancestor"):
                raise CleanupError(
                    f"Branch deletion requires HEAD to be an ancestor of baseline {baseline!r}: {path}"
                )
    return by_path


def execute_plan(
    plan_path: Path,
    confirm_plan: str,
    repo_override: Optional[str],
    delete_plan_on_success: bool,
) -> Tuple[Dict[str, Any], int]:
    plan = load_json(plan_path)
    if plan.get("schema_version") != PLAN_SCHEMA_VERSION:
        raise CleanupError("Unsupported plan schema version")
    if confirm_plan != plan.get("plan_id"):
        raise CleanupError("--confirm-plan must exactly match the plan_id shown to the user")

    repo = canonical(repo_override or plan["repository"]["scan_anchor"])
    verify_common_dir(repo, plan["repository"]["common_dir"])
    preflight_plan(repo, plan)

    created_backups: List[Dict[str, str]] = []
    for target in plan["targets"]:
        backup = target.get("backup_branch")
        if backup:
            git(repo, "branch", backup, target["head"])
            created_backups.append({"branch": backup, "head": target["head"]})

    removed: List[Dict[str, Any]] = []
    untouched = [target["path"] for target in plan["targets"]]
    for target in plan["targets"]:
        path = target["path"]
        result = git(repo, "worktree", "remove", path, check=False)
        if result.returncode != 0:
            response = {
                "status": "partial_failure",
                "plan_id": plan["plan_id"],
                "error": result.stderr.strip() or result.stdout.strip(),
                "removed": removed,
                "failed": path,
                "untouched": untouched,
                "created_backups": created_backups,
            }
            return response, 3
        untouched.remove(path)
        record: Dict[str, Any] = {
            "path": path,
            "head": target["head"],
            "branch": target.get("branch"),
            "estimated_reclaim_bytes": target.get("size_bytes"),
            "branch_deleted": False,
        }
        removed.append(record)

        if plan.get("branch_action") == "delete" and target.get("branch"):
            deletion = git(repo, "branch", "-d", target["branch"], check=False)
            if deletion.returncode != 0:
                response = {
                    "status": "partial_failure",
                    "plan_id": plan["plan_id"],
                    "error": deletion.stderr.strip() or deletion.stdout.strip(),
                    "removed": removed,
                    "failed": f"branch:{target['branch']}",
                    "untouched": untouched,
                    "created_backups": created_backups,
                }
                return response, 3
            record["branch_deleted"] = True

    response = {
        "status": "completed",
        "plan_id": plan["plan_id"],
        "removed": removed,
        "failed": None,
        "untouched": [],
        "created_backups": created_backups,
        "estimated_reclaim_bytes": plan.get("estimated_reclaim_bytes", 0),
        "remaining_worktrees": len(parse_worktree_porcelain(repo)),
    }
    if delete_plan_on_success:
        try:
            plan_path.unlink()
            response["plan_deleted"] = True
        except OSError as exc:
            response["plan_deleted"] = False
            response["plan_delete_error"] = str(exc)
    return response, 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Audit and safely remove Git worktrees after closed-issue verification."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    scan_parser = subparsers.add_parser("scan", help="Create a read-only local worktree inventory")
    scan_parser.add_argument("--repo", default=".", help="Any path inside the target repository")
    scan_parser.add_argument("--baseline", help="Resolved default/target branch ref, such as upstream/main")
    scan_parser.add_argument("--json-out", type=Path, help="Optional JSON inventory output")
    scan_parser.add_argument("--markdown-out", type=Path, help="Optional Markdown inventory output")
    scan_parser.add_argument(
        "--stdout",
        choices=("json", "markdown", "none"),
        default="json",
        help="Output format written to stdout",
    )

    plan_parser = subparsers.add_parser("create-plan", help="Snapshot an exact user-reviewed selection")
    plan_parser.add_argument("--repo", default=".", help="Any path inside the target repository")
    plan_parser.add_argument("--selection", type=Path, required=True, help="Normalized reviewed selection JSON")
    plan_parser.add_argument("--output", type=Path, required=True, help="Temporary plan JSON path")

    execute_parser = subparsers.add_parser("execute", help="Revalidate and execute a confirmed plan")
    execute_parser.add_argument("--plan", type=Path, required=True, help="Plan JSON created by create-plan")
    execute_parser.add_argument("--confirm-plan", required=True, help="Exact plan_id displayed during confirmation")
    execute_parser.add_argument("--repo", help="Optional repository path override for a moved scan anchor")
    execute_parser.add_argument(
        "--delete-plan-on-success",
        action="store_true",
        help="Delete the temporary plan after a successful run",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "scan":
            scan = scan_repository(args.repo, baseline=args.baseline)
            json_text = json.dumps(scan, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
            markdown = scan_markdown(scan)
            if args.json_out:
                write_text_atomic(args.json_out, json_text)
            if args.markdown_out:
                write_text_atomic(args.markdown_out, markdown)
            if args.stdout == "json":
                sys.stdout.write(json_text)
            elif args.stdout == "markdown":
                sys.stdout.write(markdown)
            return 0
        if args.command == "create-plan":
            plan = create_plan(args.repo, args.selection, args.output)
            emit_json(
                {
                    "status": "plan_created",
                    "plan_id": plan["plan_id"],
                    "target_count": len(plan["targets"]),
                    "branch_action": plan["branch_action"],
                    "backup_count": sum(1 for item in plan["targets"] if item.get("backup_branch")),
                    "estimated_reclaim_bytes": plan["estimated_reclaim_bytes"],
                    "plan_path": str(args.output.absolute()),
                }
            )
            return 0
        if args.command == "execute":
            response, code = execute_plan(
                args.plan,
                args.confirm_plan,
                args.repo,
                args.delete_plan_on_success,
            )
            emit_json(response)
            return code
        parser.error(f"Unknown command: {args.command}")
        return 2
    except CleanupError as exc:
        emit_json({"status": "refused", "error": str(exc)}, stream=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
