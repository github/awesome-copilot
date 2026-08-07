"""Shared bounded retry loop for immutable collection attempts.

Platform wrappers own their collection command and protection policy.  This
module owns only the invariant mechanics: fresh attempt workspaces, sealed
metadata reads, evidence-based selection, and fixed backoff.
"""

from __future__ import annotations

import json
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from immutable_workspace import WorkspaceError, ensure_container


BACKOFF_SECONDS = (30, 60)
Task = dict[str, object]
CommandBuilder = Callable[[Path], list[str]]
TaskPolicy = Callable[[Task], bool]
TaskScore = Callable[[Task, int], tuple[int, int, int, int]]
AttemptObserver = Callable[[int, int, Path, Task], None]


@dataclass(frozen=True)
class AttemptRunResult:
    """The richest sealed result selected from one bounded attempt series."""

    success: bool
    attempt_count: int
    selected_workspace: Path
    selected_task: Task


class AttemptCommandError(ValueError):
    """A child collection process could not be started safely."""


def read_sealed_attempt_task(workspace: Path) -> Task:
    """Read task metadata only after the workspace has been sealed."""
    if not (workspace / ".complete").is_file():
        return {}
    try:
        value = json.loads((workspace / "task.json").read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def default_task_score(task: Task, attempt: int) -> tuple[int, int, int, int]:
    """Prefer evidence count, then usable status, then exhaustive coverage."""
    coverage = task.get("collection_coverage")
    coverage = coverage if isinstance(coverage, dict) else {}
    count = task.get("collected_count")
    count = count if type(count) is int and count >= 0 else 0
    return (
        count,
        {"COMPLETED": 2, "PARTIAL": 1}.get(task.get("task_status"), 0),
        int(coverage.get("is_exhaustive") is True),
        -attempt,
    )


def run_bounded_attempts(
    *,
    output_prefix: Path,
    max_attempts: int,
    build_command: CommandBuilder,
    is_success: TaskPolicy,
    is_retryable: TaskPolicy,
    run_command: Callable[[list[str]], int] | None = None,
    sleep_fn: Callable[[int], None] = time.sleep,
    score_task: TaskScore = default_task_score,
    observe_attempt: AttemptObserver | None = None,
) -> AttemptRunResult:
    """Run at most three fresh attempts without changing platform identity."""
    if type(max_attempts) is not int or not 1 <= max_attempts <= 3:
        raise ValueError("max_attempts must be an integer from 1 to 3")
    try:
        ensure_container(str(output_prefix.parent))
    except WorkspaceError as exc:
        raise ValueError("output prefix parent is unsafe or unavailable") from exc

    runner = run_command or (lambda command: subprocess.run(command).returncode)
    selected = output_prefix.with_name(f"{output_prefix.name}-attempt-1")
    selected_task: Task = {}
    selected_score = (-1, -1, -1, -1)

    for attempt in range(1, max_attempts + 1):
        workspace = output_prefix.with_name(f"{output_prefix.name}-attempt-{attempt}")
        if workspace.exists():
            raise ValueError(f"attempt workspace already exists: {workspace}")
        try:
            runner(build_command(workspace))
        except OSError as exc:
            raise AttemptCommandError("collection attempt command could not start") from exc
        task = read_sealed_attempt_task(workspace)
        score = score_task(task, attempt)
        if score > selected_score:
            selected, selected_task, selected_score = workspace, task, score
        if observe_attempt is not None:
            observe_attempt(attempt, max_attempts, workspace, task)
        if is_success(task):
            return AttemptRunResult(True, attempt, workspace, task)
        if not is_retryable(task) or attempt >= max_attempts:
            return AttemptRunResult(False, attempt, selected, selected_task)
        sleep_fn(BACKOFF_SECONDS[attempt - 1])

    raise AssertionError("bounded retry loop must return")
