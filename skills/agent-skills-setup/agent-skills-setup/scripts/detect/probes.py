"""Detection probes for products / profiles.

A probe returns an :class:`InstallState` based on the available
evidence on the local device.  Probes are pure-Python where possible
(``shutil.which`` + filesystem inspection) and never reach the
network.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Iterable


class InstallState(str, Enum):
    INSTALLED = "installed"
    CONFIGURED_ONLY = "configured-only"
    COMPATIBILITY_ONLY = "compatibility-only"
    CLOUD_CONNECTED = "cloud-connected"
    LEGACY = "legacy"
    AMBIGUOUS = "ambiguous"
    NOT_DETECTED = "not-detected"


@dataclass(frozen=True)
class ProbeResult:
    product: str
    profile: str
    state: InstallState
    evidence: tuple[str, ...]

    def to_dict(self) -> dict[str, str]:
        return {
            "product": self.product,
            "profile": self.profile,
            "state": self.state.value,
            "evidence": list(self.evidence),
        }


def probe_binary(
    product: str,
    profile: str,
    binary_names: Iterable[str],
    *,
    version_command: Iterable[str] | None = None,
) -> ProbeResult:
    """Locate a binary in ``$PATH`` and capture its version."""
    names = list(binary_names)
    if not names:
        return ProbeResult(product, profile, InstallState.NOT_DETECTED, ())
    for name in names:
        path = shutil.which(name)
        if path:
            evidence = [f"binary:{path}"]
            if version_command:
                try:
                    proc = subprocess.run(
                        list(version_command),
                        capture_output=True,
                        text=True,
                        timeout=2,
                        check=False,
                    )
                    stdout = proc.stdout.strip() or proc.stderr.strip()
                    if stdout:
                        evidence.append(f"version:{stdout.splitlines()[0][:64]}")
                except (OSError, subprocess.SubprocessError):
                    pass
            return ProbeResult(product, profile, InstallState.INSTALLED, tuple(evidence))
    return ProbeResult(product, profile, InstallState.NOT_DETECTED, ())


_SHARED_COMPATIBILITY_SUFFIXES = (
    ".agents/skills",
    ".agents",
)


def _is_shared_compatibility_path(path: Path) -> bool:
    p_posix = path.as_posix()
    if path.name == "AGENTS.md":
        return True
    if any(p_posix.endswith(suf) for suf in _SHARED_COMPATIBILITY_SUFFIXES):
        return True
    # Generic workspace-level "skills" without a product-specific dot directory (e.g. .cursor, .cline)
    if path.name == "skills" and not any(part.startswith(".") and part != ".agents" for part in path.parts):
        return True
    return False


def probe_file_signature(
    product: str,
    profile: str,
    candidate_paths: Iterable[Path | str],
    *,
    workspace: Path | None = None,
    home: Path | None = None,
) -> ProbeResult:
    """Check whether any of the candidate paths exists on disk.

    Supports exact paths, globs (e.g. ``github.copilot-*``), home resolution,
    and workspace-relative resolution.
    """
    effective_home = home or Path.home()
    for raw in candidate_paths:
        p_str = str(raw)
        if p_str.startswith("~"):
            target_str = str(effective_home) + p_str[1:]
        elif workspace is not None and not (p_str.startswith("/") or re.match(r"^[a-zA-Z]:", p_str)):
            target_str = str(workspace / p_str)
        else:
            target_str = p_str

        # Check for glob wildcard matching
        if any(char in target_str for char in ("*", "?", "[")):
            target_path = Path(target_str)
            parent = target_path.parent
            pattern = target_path.name
            if parent.exists() and parent.is_dir():
                matches = list(parent.glob(pattern))
                if matches:
                    matched = matches[0]
                    is_shared = _is_shared_compatibility_path(matched)
                    state = (
                        InstallState.COMPATIBILITY_ONLY
                        if is_shared
                        else (InstallState.INSTALLED if matched.is_dir() or matched.is_file() else InstallState.CONFIGURED_ONLY)
                    )
                    return ProbeResult(product, profile, state, (f"file:{matched}",))
            continue

        path = Path(target_str)
        if path.exists():
            # Distinguish shared/fallback paths from product-specific installation evidence
            is_shared = _is_shared_compatibility_path(path)
            if is_shared:
                state = InstallState.COMPATIBILITY_ONLY
            else:
                state = (
                    InstallState.INSTALLED
                    if path.is_dir() or path.is_file()
                    else InstallState.CONFIGURED_ONLY
                )
            return ProbeResult(product, profile, state, (f"file:{path}",))
    return ProbeResult(product, profile, InstallState.NOT_DETECTED, ())


DARWIN_BUNDLE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.-]{0,255}$")


def probe_app_bundle(
    product: str,
    profile: str,
    *,
    darwin_bundle_id: str | None = None,
) -> ProbeResult:
    """Best-effort macOS app-bundle probe."""
    if (
        not darwin_bundle_id
        or sys.platform != "darwin"
        or not DARWIN_BUNDLE_ID_RE.match(darwin_bundle_id)
    ):
        return ProbeResult(product, profile, InstallState.NOT_DETECTED, ())

    # 1. Search standard macOS app locations
    for app_dir in (Path("/Applications"), Path.home() / "Applications"):
        if not app_dir.is_dir():
            continue
        for app in app_dir.glob("*.app"):
            plist = app / "Contents" / "Info.plist"
            if plist.is_file():
                try:
                    text = plist.read_text(encoding="utf-8", errors="ignore")
                    if darwin_bundle_id in text:
                        return ProbeResult(
                            product, profile, InstallState.INSTALLED,
                            (f"app-bundle:{app}",),
                        )
                except OSError:
                    pass

    # 2. Try mdfind for Spotlight index lookup
    try:
        proc = subprocess.run(
            ["mdfind", f"kMDItemCFBundleIdentifier == '{darwin_bundle_id}'"],
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            found_app = proc.stdout.strip().splitlines()[0]
            if Path(found_app).exists():
                return ProbeResult(
                    product, profile, InstallState.INSTALLED,
                    (f"app-bundle:{found_app}",),
                )
    except (OSError, subprocess.SubprocessError):
        pass

    return ProbeResult(product, profile, InstallState.NOT_DETECTED, ())


# Local import to keep the top of the module focused on data classes.
import sys  # noqa: E402


def resolve_home(home: Path | None) -> Path:
    """Pick the home directory honoring ``HOME`` overrides."""
    if home is not None:
        return home.resolve()
    env_home = os.environ.get("HOME")
    if env_home:
        # Guard against stale or foreign-format values (e.g. an MSYS-style
        # path leaking into native Windows Python, where it cannot exist).
        candidate = Path(env_home)
        if candidate.is_dir():
            return candidate.resolve()
    return Path.home().resolve()


def detect_product(
    product: str,
    profile: str,
    *,
    binary: Iterable[str] | None = None,
    version_command: Iterable[str] | None = None,
    file_signature: Iterable[Path | str] | None = None,
    home: Path | None = None,
    workspace: Path | None = None,
    app_bundle_id: str | None = None,
) -> ProbeResult:
    """Run a small, deterministic detection probe for one product."""
    if binary:
        result = probe_binary(
            product, profile, binary, version_command=version_command
        )
        if result.state is InstallState.INSTALLED:
            return result
    if file_signature:
        result = probe_file_signature(
            product,
            profile,
            file_signature,
            workspace=workspace,
            home=home,
        )
        if result.state is not InstallState.NOT_DETECTED:
            return result
    if app_bundle_id:
        result = probe_app_bundle(product, profile, darwin_bundle_id=app_bundle_id)
        if result.state is InstallState.INSTALLED:
            return result
    return ProbeResult(product, profile, InstallState.NOT_DETECTED, ())


def detect_profile(
    product: str,
    profile: str,
    *,
    binaries: Iterable[str] = (),
    version_command: Iterable[str] | None = None,
    file_signatures: Iterable[str | Path] = (),
    home: Path | None = None,
    workspace: Path | None = None,
    app_bundle_id: str | None = None,
) -> ProbeResult:
    """Convenience wrapper that accepts string paths and expands ``~``."""
    return detect_product(
        product,
        profile,
        binary=binaries,
        version_command=version_command,
        file_signature=file_signatures,
        home=home,
        workspace=workspace,
        app_bundle_id=app_bundle_id,
    )