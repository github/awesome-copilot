"""Small, monotonic execution-timing ledger for committed task artifacts."""

from __future__ import annotations

import time
from contextlib import contextmanager
from datetime import datetime, timezone, tzinfo
from typing import Iterator


class ExecutionTimer:
    """Record wall-clock bounds and non-negative phase durations in milliseconds."""

    def __init__(self, *, wall_timezone: tzinfo = timezone.utc) -> None:
        self._wall_timezone = wall_timezone
        self._started_at = datetime.now(wall_timezone)
        self._started_ns = time.monotonic_ns()
        self._phase_durations_ns: dict[str, int] = {}

    @contextmanager
    def phase(self, name: str) -> Iterator[None]:
        """Measure one phase; repeated uses of the same name are accumulated."""
        started_ns = time.monotonic_ns()
        try:
            yield
        finally:
            elapsed_ns = max(0, time.monotonic_ns() - started_ns)
            self._phase_durations_ns[name] = (
                self._phase_durations_ns.get(name, 0) + elapsed_ns
            )

    def snapshot(self) -> dict[str, object]:
        """Return a JSON-safe snapshot without stopping future measurements."""
        ended_at = datetime.now(self._wall_timezone)
        duration_ns = max(0, time.monotonic_ns() - self._started_ns)
        duration_ms = duration_ns // 1_000_000
        phase_items = sorted(self._phase_durations_ns.items())
        phase_durations_ms = {
            name: phase_ns // 1_000_000 for name, phase_ns in phase_items
        }
        remainder_ms = duration_ms - sum(phase_durations_ms.values())
        if phase_items and remainder_ms >= 0:
            rounds, extra = divmod(remainder_ms, len(phase_items))
            phase_durations_ms = {
                name: phase_durations_ms[name] + rounds + (index < extra)
                for index, (name, _phase_ns) in enumerate(phase_items)
            }
        elif phase_items:
            total_phase_ns = sum(phase_ns for _name, phase_ns in phase_items)
            phase_durations_ms = {
                name: phase_ns * duration_ms // total_phase_ns
                for name, phase_ns in phase_items
            }
            extra = duration_ms - sum(phase_durations_ms.values())
            for name, _phase_ns in phase_items[:extra]:
                phase_durations_ms[name] += 1
        return {
            "started_at": self._started_at.isoformat(),
            "ended_at": ended_at.isoformat(),
            "duration_ms": duration_ms,
            "phase_durations_ms": phase_durations_ms,
        }
