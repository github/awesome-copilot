#!/usr/bin/env python3
"""Context collection utilities for automatic context gathering."""

import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any

_REDACTED = "***REDACTED***"

# Well-known token prefixes: GitHub (ghp_/gho_/ghu_/ghs_/ghr_/github_pat_),
# OpenAI (sk-, sk-proj-, sk-svcacct-), AWS (AKIA/ASIA), Slack (xox*), GitLab (glpat-), and JWTs.
_TOKEN_PREFIX = re.compile(
    r"(?i)\b(gh[pousr]_[a-zA-Z0-9]{10,}|github_pat_[a-zA-Z0-9_]{20,}|sk-[a-zA-Z0-9_.-]{16,}|"
    r"AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|xox[baprs]-[a-zA-Z0-9-]{10,}|glpat-[a-zA-Z0-9_-]{20,}|"
    r"eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})"
)

# Authorization header / assignment values (mask the whole value).
# Matches unquoted headers (`Authorization: Bearer ...`), quoted curl headers
# (`-H "Authorization: ..."`) and JSON/dict keys (`"Authorization": "..."`).
# The value stops at a quote or shell separator so the trailing quote, brace,
# URL, or `;` is left intact.
_AUTHORIZATION = re.compile(
    r"""(?im)(\b["']?Authorization["']?\s*[:=]\s*)("[^"\r\n]*"|'[^'\r\n]*'|[^\r\n"']+)"""
)


def _mask_authorization(match: re.Match[str]) -> str:
    """Mask an Authorization value while preserving its quote style."""
    prefix, value = match.group(1), match.group(2)
    if value[:1] in ("\"", "'"):
        return f"{prefix}{value[0]}{_REDACTED}{value[0]}"
    return prefix + _REDACTED

# Standalone bearer tokens not already covered by the Authorization rule.
_BEARER = re.compile(r"(?i)(\bbearer\s+)([a-zA-Z0-9._~+/=-]{16,})")

# Assignments whose key names a secret: NAME=value or NAME: value. Handles
# unquoted values (stopping at whitespace, quotes, '&', or '#'), single-quoted
# values, and double-quoted values (including JSON objects and escaped quotes),
# so `password: 'fixture'` and {"password": "fixture"} are both masked.
_SECRET_ASSIGNMENT = re.compile(
    r"(?i)(\b[a-z0-9_.-]*(?:secret|token|password|passwd|api[_-]?key|access[_-]?key|"
    r"private[_-]?key|client[_-]?secret|credential|auth[_-]?key)[a-z0-9_.-]*[\"']?\s*[:=]\s*)"
    r"(?:\"((?:\\.|[^\"\\])*)\"|'((?:\\.|[^'\\])*)'|([^&\s\"'#]+))"
)

# A bare `key=`/`key:` with a long (16+ char) value is usually a real secret;
# short values such as "name" or "value" are left alone to avoid false
# positives on dict literals and config examples. Quoted values must also be
# 16+ characters to qualify.
_SUSPICIOUS_KEY = re.compile(
    r"(?i)(\b[a-z0-9_.-]*key[\"']?\s*[:=]\s*)"
    r"(?:\"((?:\\.|[^\"\\]){16,})\"|'((?:\\.|[^'\\]){16,})'|([^&\s\"'#]{16,}))"
)


def _mask_assignment(match: re.Match[str]) -> str:
    """Replace an assignment's value while preserving its quote style."""
    prefix = match.group(1)
    if match.group(2) is not None:
        return f'{prefix}"{_REDACTED}"'
    if match.group(3) is not None:
        return f"{prefix}'{_REDACTED}'"
    return prefix + _REDACTED

# Long base64-looking blobs. Only blobs that are true base64 credentials are
# masked: blobs containing both '+' and '/' (real base64), blobs ending in '='
# padding, or pure alphanumeric tokens (no dots, no slashes) of 40+ chars. This
# preserves ordinary file paths (which contain '/' and dots) and hex SHAs while
# still redacting real base64 credentials like `ZGV2OnNlY3JldA==`.
_LONG_BASE64 = re.compile(r"\b[A-Za-z0-9+/]{40,}={0,2}(?![A-Za-z0-9+/])")


def sanitize_text(text: str) -> str:
    """Mask secret-like content in collected context.

    Masks well-known token prefixes, Authorization/Bearer values, assignments
    whose key names a secret (password, token, api key, credential, ...), bare
    ``key=`` values that are long enough to be real keys, and long base64
    blobs. Benign prose, identifiers, and hashes are left unchanged.
    """
    text = _TOKEN_PREFIX.sub(_REDACTED, text)
    text = _AUTHORIZATION.sub(_mask_authorization, text)
    text = _BEARER.sub(lambda m: m.group(1) + _REDACTED, text)
    text = _SECRET_ASSIGNMENT.sub(_mask_assignment, text)
    text = _SUSPICIOUS_KEY.sub(_mask_assignment, text)

    def _mask_base64(match: re.Match[str]) -> str:
        blob = match.group(0)
        # Real base64 credentials carry '+' and '/' together, end in '=' padding,
        # or are pure alphanumeric blobs with no path separators — never mask
        # ordinary file paths (which contain '/' and/or '.').
        if "+" in blob and "/" in blob:
            return _REDACTED
        if blob.endswith("="):
            return _REDACTED
        if "." not in blob and "/" not in blob:
            return _REDACTED
        return blob

    return _LONG_BASE64.sub(_mask_base64, text)


def sanitize_data(value: Any) -> Any:
    """Recursively mask secret-like strings in collected context data.

    ``collect_all`` returns nested lists and dicts, so scrubbing only a few
    top-level keys can leave secrets in other strings (filenames, metadata,
    future context sources). Walking the whole structure keeps the
    documented default-on scrub guarantee.
    """
    if isinstance(value, str):
        return sanitize_text(value)
    if isinstance(value, list):
        return [sanitize_data(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_data(item) for key, item in value.items()}
    return value


# Directories never walked when git is unavailable: their contents are build
# artifacts or vendored code, not "edited files" (see issue #14).
SKIP_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    ".tox",
    ".mypy_cache",
    ".pytest_cache",
    "__pycache__",
    "build",
    "dist",
    ".idea",
    ".vscode",
}

# How much of the end of a history file to read. Enough for thousands of
# commands, without loading multi-hundred-MB files wholesale.
HISTORY_TAIL_BYTES = 256 * 1024


class ContextCollector:
    """Collects execution context from git, file system, and shell history."""

    def __init__(
        self,
        repo_path: Path | None = None,
        lookback_hours: float = 1.0,
        sanitize_secrets: bool = True,
        include_shell_history: bool = False,
        methods: dict[str, bool] | None = None,
    ):
        """Initialize the context collector.

        Args:
            repo_path: Path to the repository to analyze (defaults to cwd)
            lookback_hours: How far back (in hours) to look for recently
                edited files. Defaults to 1 hour.
            sanitize_secrets: Mask secret-like content in collected context
                (default True; disable with False to keep raw output)
            include_shell_history: Read ~/.bash_history / ~/.zsh_history /
                ~/.history into the context. Off by default: shell history can
                leak credentials and captures commands unrelated to the repo,
                so auto-context stays repo-only unless the caller opts in.
            methods: Per-source switches mirroring
                ``context_collection.methods`` (``git_diff``,
                ``recent_commits``, ``edited_files``, ``recent_commands``,
                ``file_changes``). Disabled sources return empty values.
        """
        self.repo_path = repo_path or Path.cwd()
        self.lookback_seconds = lookback_hours * 3600
        self.sanitize_secrets = sanitize_secrets
        self.include_shell_history = include_shell_history
        self.methods = dict(methods or {})

    def _enabled(self, name: str, default: bool = True) -> bool:
        """Return whether a configured collection source is enabled."""
        return bool(self.methods.get(name, default))

    def collect_all(self) -> dict[str, Any]:
        """Collect all available context.

        Returns:
            Dictionary with execution context data
        """
        context: dict[str, Any] = {}

        # Git-based context, filtered by context_collection.methods.
        context["git_diff"] = self.get_git_diff() if self._enabled("git_diff") else ""
        context["recent_commits"] = (
            self.get_recent_commits() if self._enabled("recent_commits") else []
        )
        context["edited_files"] = (
            self.get_edited_files() if self._enabled("edited_files") else []
        )

        # Shell command history — explicit opt-in only (privacy, #13). Repo-only
        # signals are collected above; reading the user's history files is the
        # surprising part and stays off unless include_shell_history is set.
        # A user config can also opt in with methods.recent_commands: true.
        collect_commands = self.include_shell_history or self._enabled(
            "recent_commands", default=False
        )
        context["recent_commands"] = self.get_recent_commands() if collect_commands else []

        # File changes
        context["file_changes"] = (
            self.get_file_changes()
            if self._enabled("file_changes")
            else {"added": [], "modified": [], "deleted": []}
        )

        # Analysis metadata
        context["metadata"] = {
            "repo_path": str(self.repo_path),
            "collected_at": self.get_timestamp(),
        }

        # Mask secret-like content before the context is handed to the
        # analyzer and exporters (default-on scrub).
        if self.sanitize_secrets:
            return sanitize_data(context)
        return context

    def get_git_diff(self) -> str:
        """Get git diff for uncommitted changes."""
        try:
            result = subprocess.run(
                ["git", "diff", "HEAD"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                return result.stdout
        except (subprocess.SubprocessError, FileNotFoundError):
            pass
        return ""

    def get_recent_commits(self, count: int = 5) -> list[str]:
        """Get recent commit messages."""
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", f"-{count}"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                return result.stdout.strip().split("\n")
        except (subprocess.SubprocessError, FileNotFoundError):
            pass
        return []

    def get_edited_files(self) -> list[str]:
        """Get list of recently edited files."""
        edited = []

        # Git status
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                for line in result.stdout.splitlines():
                    # Format: XY filename. Keep the status columns intact so a
                    # leading space (unstaged change) is not eaten as padding.
                    if len(line) < 4:
                        continue
                    path = line[3:]
                    if " -> " in path:  # rename/copy: keep the destination
                        path = path.split(" -> ", 1)[1]
                    edited.append(path.strip().strip('"'))
        except (subprocess.SubprocessError, FileNotFoundError):
            pass

        # Also check for recently modified files: git-aware first (respects
        # .gitignore via --exclude-standard), with a bounded fallback walk for
        # non-git repos that skips .git/node_modules/.venv and friends.
        edited.extend(self._recently_modified_files())

        return list(set(edited))  # Remove duplicates

    def _recently_modified_files(self) -> list[str]:
        """List files modified within the lookback window, gitignore-aware.

        Only untracked or recently-modified (via git status) files are included.
        Clean tracked files from a fresh checkout are excluded so the default
        24-hour lookback does not add the entire clean checkout to edited_files.
        """
        cutoff = time.time() - self.lookback_seconds
        edited: list[str] = []

        # Only untracked files need the mtime scan: tracked working-tree
        # changes already come from `git status` in get_edited_files(), and
        # their checkout mtime is not an edit signal (a fresh clone would
        # otherwise "edit" the whole repo).
        git_ok = False
        try:
            # Only untracked, gitignore-excluded paths are considered here.
            # Tracked working-tree changes already come from `git status` in
            # get_edited_files(); scanning tracked mtimes would treat a fresh
            # clone or checkout as "edited".
            untracked = subprocess.run(
                ["git", "ls-files", "-z", "--others", "--exclude-standard"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10,
            )

            untracked_names: list[str] = []
            if untracked.returncode == 0:
                git_ok = True
                for name in untracked.stdout.split("\0"):
                    if not name:
                        continue
                    path = self.repo_path / name
                    try:
                        if path.is_file() and path.stat().st_mtime > cutoff:
                            untracked_names.append(name)
                    except OSError:
                        continue

            # Now process the untracked names collected above
            for name in untracked_names:
                edited.append(name)

            # Additionally, process truly newly modified tracked files from
            # git status --porcelain (already captured upstream in
            # get_edited_files). We do not double-count mtime-identified tracked
            # files here.
        except (subprocess.SubprocessError, FileNotFoundError):
            pass

        if git_ok:
            return edited

        # Fallback for non-git repos: bounded walk skipping heavy/vendored
        # directories, including only files outside the tracked set.
        try:
            tracked_names: set[str] = set()
            # Get tracked names for filtering
            tracked_res = subprocess.run(
                ["git", "ls-files", "-z"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if tracked_res.returncode == 0:
                tracked_names = {
                    n for n in (tracked_res.stdout + "").split("\0") if n
                }
            for root, dirs, files in os.walk(self.repo_path):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for name in files:
                    path = Path(root) / name
                    try:
                        rel = str(path.relative_to(self.repo_path))
                        if rel in tracked_names:
                            # Skip clean tracked files from the mtime scan;
                            # they were already handled via git status above.
                            continue
                        if path.is_file() and path.stat().st_mtime > cutoff:
                            edited.append(rel)
                    except OSError:
                        continue
        except (OSError, PermissionError):
            pass

        return edited

    def get_recent_commands(self) -> list[str]:
        """Get recent shell commands from history."""
        commands = []

        # Check common shell history files
        history_files = [
            Path.home() / ".bash_history",
            Path.home() / ".zsh_history",
            Path.home() / ".history",
        ]

        for hist_file in history_files:
            if hist_file.exists():
                # Read only the tail of the file instead of loading the whole
                # history (a .zsh_history can be hundreds of MB; #14).
                lines = self._read_history_tail(hist_file).splitlines()
                commands.extend(lines[-20:])

        # Clean and filter
        cleaned = []
        for cmd in commands:
            cmd = cmd.strip()
            if cmd and not cmd.startswith("#"):
                # Remove timestamps from zsh history
                if cmd[0].isdigit() and ";" in cmd[:20]:
                    cmd = cmd.split(";", 1)[-1]
                cleaned.append(cmd)

        return cleaned[-20:] if cleaned else []

    @staticmethod
    def _read_history_tail(hist_file: Path) -> str:
        """Return the last ``HISTORY_TAIL_BYTES`` of a history file as text.

        Seeks to the end and reads backwards a bounded window, so a huge
        history file is never loaded wholesale. Skips the first (partial) line
        of the window.
        """
        try:
            size = hist_file.stat().st_size
            with open(hist_file, "rb") as f:
                if size > HISTORY_TAIL_BYTES:
                    f.seek(size - HISTORY_TAIL_BYTES)
                    f.readline()  # drop the partial first line
                    return f.read().decode("utf-8", errors="ignore")
                return f.read().decode("utf-8", errors="ignore")
        except OSError:
            return ""

    def get_file_changes(self) -> dict[str, Any]:
        """Analyze file changes for insights."""
        changes: dict[str, list[str]] = {"added": [], "modified": [], "deleted": []}

        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                # splitlines(), not strip().split(): stripping removes the
                # leading status space of the first unstaged record, which
                # would shift line[3:] and truncate the filename.
                for line in result.stdout.splitlines():
                    if not line:
                        continue
                    status = line[:2]
                    filename = line[3:]

                    # Normalize rename destinations (old -> new keeps the new path).
                    if " -> " in filename:
                        filename = filename.split(" -> ", 1)[1]

                    filename = filename.strip().strip('"')

                    # Untracked files (?? or ?M / ?D) count as additions.
                    if status[0] == "?" or status[1] == "?":
                        changes["added"].append(filename)
                    elif status[0] == "A" or status[1] == "A":
                        changes["added"].append(filename)
                    elif status[0] == "D" or status[1] == "D":
                        changes["deleted"].append(filename)
                    elif status[0] in ("M", "R") or status[1] in ("M", "R"):
                        changes["modified"].append(filename)
        except (subprocess.SubprocessError, FileNotFoundError):
            pass

        return changes

    def get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime

        return datetime.now().isoformat()
