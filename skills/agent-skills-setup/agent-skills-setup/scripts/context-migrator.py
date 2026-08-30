#!/usr/bin/env python3
"""Safe profile-aware CLI for agent context migration."""

from __future__ import annotations

import argparse
import contextlib
import copy
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_SCRIPT_DIR = str(Path(__file__).resolve().parent)
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from migration_core import (
    ADAPTER_VERSIONS,
    AUTOMATIC_MIGRATION_POLICIES,
    AUTOMATIC_OBJECT_TYPES,
    INVENTORY_ONLY_OBJECT_TYPES,
    KNOWN_COMMANDS,
    OPT_IN_WRITABLE_OBJECT_TYPES,
    Registry,
    apply_plan,
    atomic_write,
    build_plan,
    build_plan_document,
    choose_surface,
    git_provenance,
    hash_path,
    json_sha256,
    load_plan_document,
    parse_mcp_document,
    path_state,
    paths_overlap,
    rollback_manifest,
    validate_plan_document,
    verify_manifest,
    _plan_hash_payload,
)

from acb.bundle import (
    ACB_CHECKSUMS_NAME,
    ACB_OBJECTS_DIR,
    ACB_SCHEMA_VERSION,
    ACBError,
    ACBManifest,
    ACBSecretLeak,
    collect_reauth,
    collect_rebuild,
    collect_requirements,
    collect_source_objects,
    load_manifest,
    make_bundle_id,
    restore_bundle_objects,
    sign_bundle,
    verify_bundle,
    verify_bundle_signature,
    write_bundle,
)


SCRIPT_DIR = Path(__file__).resolve().parent
REGISTRY_PATH = SCRIPT_DIR.parent / "references" / "registry-v2.json"
LEGACY_SCRIPT = SCRIPT_DIR / "legacy-smart-ide-migration.sh"


def emit(value: Any, as_json: bool) -> None:
    if as_json:
        print(json.dumps(value, indent=2, sort_keys=True))
        return
    if isinstance(value, list):
        for row in value:
            print(json.dumps(row, sort_keys=True))
    elif isinstance(value, dict):
        print(json.dumps(value, indent=2, sort_keys=True))
    else:
        print(value)


def common_workspace(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--workspace", type=Path, default=Path.cwd())
    parser.add_argument("--registry", type=Path, default=REGISTRY_PATH)
    parser.add_argument("--json", action="store_true")


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Inventory, plan, apply, verify, and roll back agent context migrations."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    detect = subparsers.add_parser("detect")
    common_workspace(detect)
    detect.add_argument("--product")
    detect.add_argument("--profile")

    inventory = subparsers.add_parser("inventory")
    common_workspace(inventory)
    inventory.add_argument("--product")
    inventory.add_argument("--profile")

    plan = subparsers.add_parser("plan")
    common_workspace(plan)
    plan.add_argument("--source", required=True)
    plan.add_argument("--target", required=True)
    plan.add_argument(
        "--objects", default="skills,instructions,mcp", help="comma-separated surfaces"
    )
    plan.add_argument(
        "--scope", choices=("user", "project", "local", "all"), default="project"
    )
    plan.add_argument("--output", type=Path)

    migrate = subparsers.add_parser(
        "migrate",
        help="One-sentence migration: detect -> inventory -> plan -> apply -> verify.",
    )
    common_workspace(migrate)
    migrate.add_argument("--source", required=True, help="<product>/<profile>")
    migrate.add_argument("--target", required=True, help="<product>/<profile>")
    migrate.add_argument(
        "--objects",
        default="all-portable",
        help=(
            "Comma-separated object list, 'all-portable' (default), or "
            "'all-inventory' (also records forbidden/generated items)."
        ),
    )
    migrate.add_argument(
        "--scope",
        default="user,project",
        help="user, project, user+project, all (all requires --yes)",
    )
    migrate.add_argument(
        "--plan-only", action="store_true", help="Stop after planning."
    )
    migrate.add_argument("--plan-out", type=Path)
    migrate.add_argument("--manifest-out", type=Path)
    migrate.add_argument("--verify-out", type=Path)
    migrate.add_argument("--yes", action="store_true")
    migrate.add_argument(
        "--include",
        dest="include_lossy",
        choices=("lossy",),
        help="Also apply ready-lossy items.",
    )
    migrate.add_argument(
        "--accept-loss",
        dest="accept_loss",
        default="",
        help="Comma-separated plan indices to apply as lossy.",
    )
    migrate.add_argument(
        "--strict",
        action="store_true",
        help="Reject plans containing any non-ready item.",
    )

    migrate.add_argument(
        "--include-session",
        dest="include_session",
        action="store_true",
        help=(
            "Explicitly opt in to handoff/session transfer "
            "(whitelisted fields only: reviewed summary, git branch, "
            "selected file list, reviewed patch)."
        ),
    )
    migrate.add_argument(
        "--include-plugins",
        dest="include_plugins",
        action="store_true",
        help="Explicitly opt in to plugin package transfer.",
    )
    apply = subparsers.add_parser("apply")
    apply.add_argument("plan", type=Path)
    apply.add_argument("--registry", type=Path, default=REGISTRY_PATH)
    apply.add_argument("--manifest", type=Path)
    apply.add_argument(
        "--bundle",
        type=Path,
        help="Path to .acb bundle archive for bundle-backed restore plans.",
    )
    apply.add_argument("--yes", action="store_true")
    apply.add_argument("--json", action="store_true")
    apply.add_argument(
        "--apply-safe",
        dest="apply_safe",
        action="store_true",
        default=True,
        help="Apply ready and draft-disabled items; manifest the rest (default).",
    )
    apply.add_argument(
        "--no-apply-safe",
        dest="apply_safe",
        action="store_false",
        help="Disable safe apply; require every item to be ready.",
    )
    apply.add_argument(
        "--include",
        dest="include_lossy",
        choices=("lossy",),
        help="Include lossy items alongside ready items.",
    )
    apply.add_argument(
        "--accept-loss",
        dest="accept_loss",
        default="",
        help="Comma-separated plan indices to apply as lossy even without --include lossy.",
    )
    apply.add_argument(
        "--strict",
        action="store_true",
        help="Reject any plan containing a non-ready item (legacy semantics).",
    )

    apply.add_argument(
        "--include-session",
        dest="include_session",
        action="store_true",
        help=(
            "Explicitly opt in to handoff/session transfer for replayed "
            "plans (whitelisted fields only)."
        ),
    )
    apply.add_argument(
        "--include-plugins",
        dest="include_plugins",
        action="store_true",
        help="Explicitly opt in to plugin package transfer.",
    )
    verify = subparsers.add_parser("verify")
    verify.add_argument("--manifest", type=Path, required=True)
    verify.add_argument("--json", action="store_true")

    rollback = subparsers.add_parser("rollback")
    rollback.add_argument("--manifest", type=Path, required=True)
    rollback.add_argument("--yes", action="store_true")
    rollback.add_argument("--json", action="store_true")

    legacy = subparsers.add_parser(
        "legacy", help="run the explicit lookup and zero-write compatibility interface"
    )
    legacy.add_argument("legacy_args", nargs=argparse.REMAINDER)

    snapshot = subparsers.add_parser(
        "snapshot",
        help="Capture a portable Agent Context Bundle (ACB) of the current device.",
    )
    common_workspace(snapshot)
    snapshot.add_argument("--output", type=Path, help="Bundle output directory (default: <workspace>/device.acb).")
    snapshot.add_argument("--source", default="cline/ide")
    snapshot.add_argument("--target", default="forge/cli")
    snapshot.add_argument("--scope", default="user,project")
    snapshot.add_argument(
        "--all-installed",
        action="store_true",
        help="Snapshot all detected and installed products on this device.",
    )
    snapshot.add_argument(
        "--include-configured",
        action="store_true",
        help="Include products detected in configured-only state.",
    )
    snapshot.add_argument(
        "--include-compatibility",
        action="store_true",
        help="Include products detected in compatibility-only state.",
    )

    verify_bundle = subparsers.add_parser(
        "bundle-verify",
        help="Verify checksums and optional Ed25519 signature inside an ACB directory.",
    )
    verify_bundle.add_argument("bundle", type=Path)
    verify_bundle.add_argument(
        "--trusted-key",
        type=Path,
        help="Path to trusted Ed25519 public key file to verify bundle signature.",
    )
    verify_bundle.add_argument("--json", action="store_true", default=True)

    bundle_sign = subparsers.add_parser(
        "bundle-sign",
        help="Sign an ACB directory with an Ed25519 private key.",
    )
    bundle_sign.add_argument("bundle", type=Path)
    bundle_sign.add_argument(
        "--key",
        type=Path,
        required=True,
        help="Path to Ed25519 private key file (must be chmod 600).",
    )
    bundle_sign.add_argument(
        "--signer",
        default="local-operator",
        help="Identifier or name of the signer.",
    )
    bundle_sign.add_argument("--json", action="store_true", default=True)

    bundle_keygen = subparsers.add_parser(
        "bundle-keygen",
        help="Generate Ed25519 keypair for signing and verifying ACBs.",
    )
    bundle_keygen.add_argument(
        "--out-private",
        type=Path,
        required=True,
        help="Destination path for private key file (will be chmod 600).",
    )
    bundle_keygen.add_argument(
        "--out-public",
        type=Path,
        required=True,
        help="Destination path for public key file.",
    )
    bundle_keygen.add_argument("--json", action="store_true", default=True)

    restore = subparsers.add_parser(
        "restore",
        help="Verify an ACB and rebuild a local restore plan against the current device.",
    )
    common_workspace(restore)
    restore.add_argument("bundle", type=Path)
    restore.add_argument("--source", default="cline/ide")
    restore.add_argument("--target", default="forge/cli")
    restore.add_argument("--scope", default="user,project")
    restore.add_argument(
        "--all-installed",
        action="store_true",
        help="Restore context across all detected and installed target products.",
    )
    restore.add_argument(
        "--include-configured",
        action="store_true",
        help="Include target products detected in configured-only state.",
    )
    restore.add_argument(
        "--include-compatibility",
        action="store_true",
        help="Include target products detected in compatibility-only state.",
    )
    restore.add_argument(
        "--include-session",
        dest="include_session",
        action="store_true",
        help="Explicitly opt in to handoff/session transfer.",
    )
    restore.add_argument(
        "--include-plugins",
        dest="include_plugins",
        action="store_true",
        help="Explicitly opt in to plugin package transfer.",
    )
    restore.add_argument(
        "--trusted-key",
        type=Path,
        help="Path to trusted Ed25519 public key file to verify bundle signature.",
    )
    restore.add_argument("--plan-out", type=Path)
    restore.add_argument(
        "--plan-in",
        "--plan",
        dest="plan_in",
        type=Path,
        help="Replay a previously reviewed plan document.",
    )
    restore.add_argument("--manifest-out", type=Path)
    restore.add_argument("--apply-safe", action="store_true", default=True)
    restore.add_argument(
        "--no-apply-safe", dest="apply_safe", action="store_false"
    )
    restore.add_argument(
        "--include", dest="include_lossy", choices=("lossy",),
    )
    restore.add_argument("--strict", action="store_true")
    restore.add_argument("--yes", action="store_true")
    restore.add_argument(
        "--plan-only",
        action="store_true",
        help="Build and review restore plan without applying to target surfaces.",
    )
    restore.add_argument(
        "--restore-root",
        type=Path,
        help="Destination tree for bundle/objects/ restore (default: <workspace>/.acb-restored).",
    )
    restore.add_argument(
        "--allow-noop",
        action="store_true",
        help="Allow restore to succeed with zero applied items (otherwise a bundle that resolves no eligible items is a hard failure).",
    )
    restore.add_argument(
        "--dry-run",
        action="store_true",
        help="Plan and stage objects/ without writing.",
    )

    doctor = subparsers.add_parser(
        "doctor",
        help="Inspect an ACB and surface missing executables / re-auth actions.",
    )
    doctor.add_argument("bundle", type=Path)
    doctor.add_argument("--json", action="store_true", default=True)
    return parser


def selector(product: str | None, profile: str | None) -> str | None:
    if not product:
        if profile:
            raise ValueError("--profile requires --product")
        return None
    return f"{product}/{profile}" if profile else product


def reject_legacy_write(argv: list[str]) -> None:
    """Enforce the legacy subcommand as strictly read-only.

    The guarantee is structural, not flag filtering (audit SDI-4 /
    AST4): only the documented read-only modes --print-path and
    --dry-run are allowed through to the legacy engine at all.  Any
    other invocation — with or without --yes — is refused here.
    """
    if "--yes" in argv or "-y" in argv:
        raise ValueError(
            "legacy writes are disabled; create a saved plan with 'plan --output', "
            "then apply that exact plan file"
        )
    if not argv or "--help" in argv or "-h" in argv:
        return
    readonly = "--print-path" in argv or "--dry-run" in argv
    if not readonly:
        raise ValueError(
            "legacy subcommand is read-only lookup compatibility only: "
            "pass --print-path <ide> <object> or --dry-run. "
            "Use 'plan' / 'apply' for migrations."
        )


def resolve_objects(value: str) -> list[str]:
    """Translate --objects shorthand into an explicit object list."""
    tokens = [token.strip() for token in value.split(",") if token.strip()]
    if not tokens:
        return ["skills", "instructions", "mcp"]
    if tokens == ["all-portable"]:
        return ["skills", "instructions", "mcp"]
    if tokens == ["all-inventory"]:
        return [
            "skills",
            "instructions",
            "mcp",
            *sorted(INVENTORY_ONLY_OBJECT_TYPES),
        ]
    return tokens


def default_workspace_migration_dir(workspace: Path) -> Path:
    return workspace / ".migration"


def run_detection(args: argparse.Namespace) -> int:
    """Run per-product detection probes against the local device.

    Uses the Registry v2 ``detection`` block on each profile (binary,
    file-signature, app-bundle). Detection is PROBE-ONLY: inventory.exists
    is NOT used as a fallback to claim "installed" (audit P0-3).
    Returns one ``InstallState`` per profile.
    """
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from detect.probes import (
        detect_profile,
        detect_product,
        probe_binary,
        probe_file_signature,
        InstallState,
    )
    workspace = args.workspace.resolve()
    registry = Registry(args.registry, workspace)
    home = registry.home
    profiles_to_check: set[tuple[str, str]] = set()
    for product_id, product in registry.products.items():
        for profile_id in product.get("profiles", {}):
            profiles_to_check.add((product_id, profile_id))

    filter_prod = getattr(args, "product", None)
    filter_prof = getattr(args, "profile", None)
    if filter_prod:
        profiles_to_check = {p for p in profiles_to_check if p[0] == filter_prod}
    if filter_prof:
        profiles_to_check = {p for p in profiles_to_check if p[1] == filter_prof}

    detections: list[dict[str, str]] = []
    for product_id, profile_id in sorted(profiles_to_check):
        product = registry.products[product_id]
        profile = product["profiles"][profile_id]
        detection = profile.get("detection", []) or []
        profile_state = InstallState.NOT_DETECTED
        profile_evidence: list[str] = []
        for probe in detection:
            if not isinstance(probe, dict):
                continue
            kind = probe.get("type")
            if kind == "binary":
                names = probe.get("command") or probe.get("binaries") or []
                version_command = probe.get("version_command")
                if isinstance(names, str):
                    names = [names]
                result = probe_binary(
                    product_id, profile_id, names,
                    version_command=version_command,
                )
                # Use the most definitive state across all probes for this profile
                # Priority: INSTALLED > CONFIGURED_ONLY > COMPATIBILITY_ONLY > CLOUD_CONNECTED > LEGACY > AMBIGUOUS > NOT_DETECTED
                if result.state.value == "installed":
                    profile_state = InstallState.INSTALLED
                    profile_evidence.extend(result.evidence)
                    break  # INSTALLED is definitive
                elif result.state.value == "configured-only" and profile_state not in (InstallState.INSTALLED,):
                    profile_state = InstallState.CONFIGURED_ONLY
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "compatibility-only" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY):
                    profile_state = InstallState.COMPATIBILITY_ONLY
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "cloud-connected" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY):
                    profile_state = InstallState.CLOUD_CONNECTED
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "legacy" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY, InstallState.CLOUD_CONNECTED):
                    profile_state = InstallState.LEGACY
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "ambiguous" and profile_state == InstallState.NOT_DETECTED:
                    profile_state = InstallState.AMBIGUOUS
                    profile_evidence.extend(result.evidence)
                # NOT_DETECTED doesn't change anything
            elif kind == "file-signature":
                paths = probe.get("paths") or []
                result = probe_file_signature(
                    product_id, profile_id, paths,
                    workspace=workspace, home=home,
                )
                if result.state.value == "installed":
                    profile_state = InstallState.INSTALLED
                    profile_evidence.extend(result.evidence)
                    break
                elif result.state.value == "configured-only" and profile_state not in (InstallState.INSTALLED,):
                    profile_state = InstallState.CONFIGURED_ONLY
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "compatibility-only" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY):
                    profile_state = InstallState.COMPATIBILITY_ONLY
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "cloud-connected" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY):
                    profile_state = InstallState.CLOUD_CONNECTED
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "legacy" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY, InstallState.CLOUD_CONNECTED):
                    profile_state = InstallState.LEGACY
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "ambiguous" and profile_state == InstallState.NOT_DETECTED:
                    profile_state = InstallState.AMBIGUOUS
                    profile_evidence.extend(result.evidence)
            elif kind == "app-bundle":
                result = detect_product(
                    product_id, profile_id,
                    app_bundle_id=probe.get("darwin_bundle_id"),
                )
                if result.state.value == "installed":
                    profile_state = InstallState.INSTALLED
                    profile_evidence.extend(result.evidence)
                    break
                elif result.state.value == "configured-only" and profile_state not in (InstallState.INSTALLED,):
                    profile_state = InstallState.CONFIGURED_ONLY
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "compatibility-only" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY):
                    profile_state = InstallState.COMPATIBILITY_ONLY
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "cloud-connected" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY):
                    profile_state = InstallState.CLOUD_CONNECTED
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "legacy" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY, InstallState.CLOUD_CONNECTED):
                    profile_state = InstallState.LEGACY
                    profile_evidence.extend(result.evidence)
                elif result.state.value == "ambiguous" and profile_state == InstallState.NOT_DETECTED:
                    profile_state = InstallState.AMBIGUOUS
                    profile_evidence.extend(result.evidence)
            # Other probe types (vscode-extension, schema-probe, cloud-account, environment)
            # are declared in Registry but not yet implemented in probes.py

        # Targeted fallback: check inventory for workspace-relative paths only.
        # Home-relative paths (user-scoped) are covered by probes; workspace-relative
        # paths (project-scoped) may not have probes but are valid installations.
        # This avoids the old bug where inventory.exists claimed "installed" for
        # shared/compatibility-only paths like AGENTS.md or .agents/skills.
        if profile_state is InstallState.NOT_DETECTED:
            rows = registry.inventory(f"{product_id}/{profile_id}")
            for row in rows:
                if not row.get("exists"):
                    continue
                resolved = row.get("resolved_path")
                if not resolved:
                    continue
                resolved_path = Path(resolved)
                # Only claim INSTALLED if the path is under workspace (project-scoped)
                # and NOT under home (user-scoped). Home paths should be caught by probes.
                try:
                    is_under_workspace = resolved_path.is_relative_to(workspace)
                    is_under_home = resolved_path.is_relative_to(home)
                except ValueError:
                    is_under_workspace = False
                    is_under_home = False
                if is_under_workspace and not is_under_home:
                    # Check if this is a shared/compatibility path
                    c_path = row.get("canonical_path", "")
                    role = row.get("location_role", "canonical")
                    if c_path in ("AGENTS.md", ".agents/skills", ".agents") or role != "canonical":
                        profile_state = InstallState.COMPATIBILITY_ONLY
                    else:
                        profile_state = InstallState.INSTALLED
                    profile_evidence.append(f"inventory:{row.get('object_type')}:{c_path}")
                    break

        detections.append(
            {
                "product": product_id,
                "profile": profile_id,
                "state": profile_state.value,
                "evidence": profile_evidence,
            }
        )
    emit(
        {
            "ok": True,
            "stage": "detect",
            "platform": sys.platform,
            "home": str(home),
            "detections": detections,
        },
        args.json,
    )
    return 0


def run_snapshot(args: argparse.Namespace) -> int:
    """Capture a portable ACB snapshot of the current device.

    Strict Snapshot Allowlist (audit P0-2):
    - Collects only the requested source product/profile and requested scope(s).
    - Collects only portable object types (skills, instructions, mcp) in the migration plan.
    - Strictly rejects forbidden-regenerate, never-migrate, session, chat, runtime,
      database, generated memory, and trust/credential stores.
    """
    workspace = args.workspace.resolve()
    registry = Registry(args.registry, workspace)
    bundle_root = (args.output or workspace / "device.acb").resolve(strict=False)
    inventory_rows = registry.inventory(None)
    detect_rows = [row for row in inventory_rows if row.get("exists")]

    requested_scopes = {
        s.strip().lower()
        for s in (args.scope or "user,project").split(",")
        if s.strip()
    }
    if "all" in requested_scopes:
        requested_scopes = {"user", "project", "local"}
    allowed_object_types = set(
        resolve_objects(getattr(args, "objects", "skills,instructions,mcp"))
    )

    all_installed = getattr(args, "all_installed", False) or args.source in ("auto", "all-installed")
    source_product, source_profile = (
        (None, None)
        if all_installed
        else (args.source.split("/", 1) if "/" in args.source else (args.source, None))
    )

    if all_installed:
        # Auto-orchestrate snapshot across all detected and installed products.
        #
        # Audit P0-3 (0.8.27): detection result is the SINGLE source of truth.
        # inventory_rows.exists must NEVER be used as a fallback to claim
        # "installed" — that previously masked failing detection probes and
        # produced bundles that claimed to contain a product with no files.
        from detect.probes import detect_profile, InstallState
        detected_selectors: set[str] = set()  # "product/profile" pairs
        detection_status: dict[str, str] = {}  # "product/profile" -> state
        for prod_id, prod in registry.products.items():
            for prof_id, prof in prod.get("profiles", {}).items():
                detection = prof.get("detection", []) or []
                profile_state = InstallState.NOT_DETECTED
                profile_evidence: list[str] = []
                for probe in detection:
                    if not isinstance(probe, dict):
                        continue
                    paths = probe.get("paths", [])
                    binaries = probe.get("command") or probe.get("binaries") or []
                    if isinstance(binaries, str):
                        binaries = [binaries]
                    res = detect_profile(
                        prod_id,
                        prof_id,
                        binaries=binaries,
                        file_signatures=paths,
                        home=registry.home,
                        workspace=workspace,
                        app_bundle_id=probe.get("darwin_bundle_id"),
                    )
                    # Use the most definitive state across all probes for this profile
                    # Priority: INSTALLED > CONFIGURED_ONLY > COMPATIBILITY_ONLY > CLOUD_CONNECTED > LEGACY > AMBIGUOUS > NOT_DETECTED
                    if res.state.value == "installed":
                        profile_state = InstallState.INSTALLED
                        profile_evidence.extend(res.evidence)
                        break  # INSTALLED is definitive
                    elif res.state.value == "configured-only" and profile_state not in (InstallState.INSTALLED,):
                        profile_state = InstallState.CONFIGURED_ONLY
                        profile_evidence.extend(res.evidence)
                    elif res.state.value == "compatibility-only" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY):
                        profile_state = InstallState.COMPATIBILITY_ONLY
                        profile_evidence.extend(res.evidence)
                    elif res.state.value == "cloud-connected" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY):
                        profile_state = InstallState.CLOUD_CONNECTED
                        profile_evidence.extend(res.evidence)
                    elif res.state.value == "legacy" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY, InstallState.CLOUD_CONNECTED):
                        profile_state = InstallState.LEGACY
                        profile_evidence.extend(res.evidence)
                    elif res.state.value == "ambiguous" and profile_state == InstallState.NOT_DETECTED:
                        profile_state = InstallState.AMBIGUOUS
                        profile_evidence.extend(res.evidence)
                    # NOT_DETECTED doesn't change anything
                selector = f"{prod_id}/{prof_id}"
                detection_status[selector] = profile_state.value
                include_configured = getattr(args, "include_configured", False)
                include_compatibility = getattr(args, "include_compatibility", False)
                if (
                    profile_state == InstallState.INSTALLED
                    or (include_configured and profile_state == InstallState.CONFIGURED_ONLY)
                    or (include_compatibility and profile_state == InstallState.COMPATIBILITY_ONLY)
                ):
                    detected_selectors.add(selector)

        plan_rows: list[dict[str, Any]] = []
        failed_products: list[dict[str, str]] = []
        for selector in sorted(detected_selectors):
            try:
                doc = build_plan_document(
                    registry,
                    selector,
                    selector,
                    sorted(allowed_object_types),
                    args.scope,
                )
                plan_rows.extend(doc.get("items", []))
            except Exception as error:
                # Audit P1-2: never silently swallow per-product plan build
                # failures. Capture and surface them so the snapshot summary
                # can report parse_failed / plan_failed per product.
                failed_products.append({"selector": selector, "error": str(error)})
                print(
                    f"WARNING: failed to build plan for {selector}: {error}",
                    file=sys.stderr,
                )
    else:
        src_sel = args.source or "cline/ide"
        document = build_plan_document(
            registry,
            src_sel,
            args.target or src_sel,
            sorted(allowed_object_types),
            args.scope,
        )
        plan_rows = document.get("items", [])
    installed_products_list = (
            sorted(detected_selectors)
            if all_installed
            else sorted({row["product"] for row in detect_rows})
        )
    inventory_summary = {
        "installed_products": installed_products_list,
        "surface_count": sum(
            1 for row in inventory_rows if row.get("object_type")
        ),
        "detection_status": detection_status if all_installed else {},
        "failed_products": failed_products if all_installed else [],
    }

    # Only include authorized, planned objects in manifest
    manifest_objects = []
    for item in plan_rows:
        surface_type = item.get("object_type", "")
        item_scope = (item.get("source") or {}).get("scope", "")
        if surface_type not in allowed_object_types:
            continue
        if requested_scopes and item_scope not in requested_scopes:
            continue
        manifest_objects.append(
            {
                "object_id": item.get("object_id", ""),
                "product": (item.get("source") or {}).get("product", ""),
                "profile": (item.get("source") or {}).get("profile", ""),
                "surface": surface_type,
                "scope": item_scope,
                "status": item.get("status", ""),
                "reason": item.get("reason", ""),
                "secret_status": "clean",
            }
        )

    manifest = ACBManifest(
        schema_version=ACB_SCHEMA_VERSION,
        bundle_id=make_bundle_id(),
        created_at=datetime.now(timezone.utc).isoformat(),
        source_platform={
            "system": sys.platform,
            "python": sys.version.split()[0],
        },
        inventory_summary=inventory_summary,
        objects=manifest_objects,
    )
    # Copy source files under objects/ using strict allowlist (audit P0-2 & 0.8.25).
    if not all_installed:
        source_product, source_profile = (
            args.source.split("/", 1) if "/" in args.source else (args.source, None)
        )
    else:
        source_product, source_profile = None, None

    collect_summary = {"captured": 0, "manual_rebuild": 0, "excluded_by_policy": 0, "parse_failed": 0, "secret_rejected": 0, "conflict": 0}
    try:
        objects_dir_files, collect_summary, object_file_map = collect_source_objects(
            registry,
            inventory_rows,
            home=registry.home,
            workspace=workspace,
            source_product=source_product,
            source_profile=source_profile,
            allowed_scopes=requested_scopes,
            allowed_object_types=allowed_object_types,
            plan_items=plan_rows,
        )
    except ACBError as error:
        # Parse failure during object collection - emit failure with summary
        inventory_summary["collection_summary"] = collect_summary
        emit(
            {
                "ok": False,
                "stage": "snapshot",
                "error": str(error),
                "summary": inventory_summary,
            },
            args.json,
        )
        return 1

    # compatibility: source_product x target_product matrix sourced from
    # Registry v2 migration_policy and support_level. Audit P1-2: check
    # migration_policy (bidirectional-reviewed) rather than assuming
    # support_level == "bidirectional-reviewed".
    compatibility_products = sorted(registry.products.keys())
    compatibility_pairs: list[dict[str, str]] = []
    for src in compatibility_products:
        src_product = registry.products.get(src, {})
        src_default_profile = src_product.get("default_profile", "cli")
        for tgt in compatibility_products:
            if src == tgt:
                continue
            tgt_product = registry.products.get(tgt, {})
            tgt_default_profile = tgt_product.get("default_profile", "cli")
            try:
                # Silently resolve: the matrix walks every product pair, and
                # Registry._log_resolution would otherwise spam one alias line
                # per call (O(N^2) stderr noise during snapshot).
                buffer = io.StringIO()
                with contextlib.redirect_stderr(buffer):
                    src_profile_data = registry.profile(f"{src}/{src_default_profile}")
                    tgt_profile_data = registry.profile(f"{tgt}/{tgt_default_profile}")
            except Exception as error:
                print(f"WARNING: failed to get profile for compatibility pair {src}->{tgt}: {error}", file=sys.stderr)
                continue
            # profile() returns (resolved_product, resolved_profile, profile_data)
            src_profile = src_profile_data[2] if len(src_profile_data) > 2 else {}
            tgt_profile = tgt_profile_data[2] if len(tgt_profile_data) > 2 else {}
            src_policy = src_profile.get("migration_policy") or src_profile.get("support_level")
            tgt_policy = tgt_profile.get("migration_policy") or tgt_profile.get("support_level")
            if (
                (src_policy == "bidirectional-reviewed" or src_policy in AUTOMATIC_MIGRATION_POLICIES)
                and (tgt_policy == "bidirectional-reviewed" or tgt_policy in AUTOMATIC_MIGRATION_POLICIES)
            ):
                compatibility_pairs.append({
                    "source": src,
                    "target": tgt,
                    "supported": True,
                    "evidence": src_profile.get("evidence"),
                })
    compatibility = {
        "schema_version": 2,
        "matrix_kind": "source_x_target_bidirectional_reviewed",
        "products": compatibility_products,
        "pairs": compatibility_pairs,
    }

    requirements, requirements_summary = collect_requirements(
        inventory_rows, plan_rows, objects_dir_files=objects_dir_files
    )
    reauth = collect_reauth(plan_rows)
    rebuild = collect_rebuild(plan_rows)
    # secrets_required: each entry is a non-secret description of a
    # credential the user must re-supply on the target device. The name
    # is derived from the MCP server's command / package, not the
    # object_id. The shape is designed so doctor / human readers can
    # understand "what credential" without inspecting the bundle.
    secrets_required = []
    for action in reauth:
        obj_id = action.get("object_id", "")
        # Audit P1-7: surface credential names instead of object IDs.
        # Derive a stable, human-readable name from the package/command
        # when possible, falling back to the object_id only when no
        # better signal is available.
        package = (
            action.get("source", {}).get("package")
            or action.get("source", {}).get("command")
            or ""
        )
        if package:
            cred_name = f"{package}::credential"
        else:
            cred_name = obj_id or "unknown-credential"
        secrets_required.append({
            "name": cred_name,
            "used_by": [obj_id] if obj_id else [],
            "recommended_storage": "environment-or-keychain",
        })
    try:
        write_bundle(
            bundle_root=bundle_root,
            manifest=manifest,
            inventory_rows=inventory_rows,
            compatibility=compatibility,
            requirements=requirements,
            secrets_required=secrets_required,
            reauth=reauth,
            rebuild=rebuild,
            objects_dir_files=objects_dir_files,
            adapter_versions=ADAPTER_VERSIONS,
            object_file_map=object_file_map,
        )
    except ACBSecretLeak as error:
        print(f"ERROR: ACB secret leak: {error}", file=sys.stderr)
        return 1
    emit(
        {
            "ok": True,
            "stage": "snapshot",
            "bundle": str(bundle_root),
            "bundle_id": manifest.bundle_id,
            "manifest": str(bundle_root / "manifest.json"),
            "checksums": str(bundle_root / ACB_CHECKSUMS_NAME),
            "objects_dir": str(bundle_root / ACB_OBJECTS_DIR),
            "objects_captured": len(objects_dir_files),
            "detected": detect_rows[:50],
            "summary": inventory_summary,
            "collection_summary": collect_summary,
        },
        args.json,
    )
    return 0


def run_bundle_verify(args: argparse.Namespace) -> int:
    """Verify checksums and optional Ed25519 signature for an ACB."""
    bundle_path = args.bundle.resolve()
    errors = verify_bundle(bundle_path)
    trusted_key = getattr(args, "trusted_key", None)
    if trusted_key:
        sig_errors = verify_bundle_signature(bundle_path, trusted_key.resolve())
        errors.extend(sig_errors)
    emit(
        {
            "ok": not errors,
            "bundle": str(bundle_path),
            "errors": errors,
            "signature_verified": bool(trusted_key and not errors),
        },
        args.json,
    )
    return 0 if not errors else 1


def run_bundle_sign(args: argparse.Namespace) -> int:
    """Sign an ACB bundle with an Ed25519 private key."""
    bundle_path = args.bundle.resolve()
    try:
        sig_path = sign_bundle(bundle_path, args.key.resolve(), signer=args.signer)
        emit(
            {
                "ok": True,
                "bundle": str(bundle_path),
                "signature": str(sig_path),
                "signer": args.signer,
            },
            args.json,
        )
        return 0
    except Exception as error:
        emit({"ok": False, "bundle": str(bundle_path), "error": str(error)}, args.json)
        return 1


def run_bundle_keygen(args: argparse.Namespace) -> int:
    """Generate Ed25519 keypair for signing and verifying ACBs."""
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
        from cryptography.hazmat.primitives import serialization
        priv = Ed25519PrivateKey.generate()
        priv_bytes = priv.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption(),
        )
        pub_bytes = priv.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        out_priv = args.out_private.resolve()
        out_pub = args.out_public.resolve()
        out_priv.parent.mkdir(parents=True, exist_ok=True)
        out_pub.parent.mkdir(parents=True, exist_ok=True)
        out_priv.write_bytes(priv_bytes)
        try:
            os.chmod(out_priv, 0o600)
        except Exception:
            pass
        out_pub.write_bytes(pub_bytes)
        emit(
            {
                "ok": True,
                "private_key": str(out_priv),
                "public_key": str(out_pub),
            },
            args.json,
        )
        return 0
    except Exception as error:
        emit({"ok": False, "error": str(error)}, args.json)
        return 1


def _detect_target_profiles_for_restore(
    target_registry: Registry,
    workspace: Path,
    include_configured: bool = False,
    include_compatibility: bool = False,
) -> tuple[set[str], dict[str, str]]:
    """Probe and filter target profiles on destination device for all-installed restore."""
    from detect.probes import detect_profile, InstallState

    target_detected_selectors: set[str] = set()
    target_detection_status: dict[str, str] = {}

    for prod_id, prod in target_registry.products.items():
        for prof_id, prof in prod.get("profiles", {}).items():
            detection = prof.get("detection", []) or []
            profile_state = InstallState.NOT_DETECTED
            profile_evidence: list[str] = []
            for probe in detection:
                if not isinstance(probe, dict):
                    continue
                paths = probe.get("paths", [])
                binaries = probe.get("command") or probe.get("binaries") or []
                if isinstance(binaries, str):
                    binaries = [binaries]
                res = detect_profile(
                    prod_id,
                    prof_id,
                    binaries=binaries,
                    file_signatures=paths,
                    home=target_registry.home,
                    workspace=workspace,
                    app_bundle_id=probe.get("darwin_bundle_id"),
                )
                if res.state.value == "installed":
                    profile_state = InstallState.INSTALLED
                    profile_evidence.extend(res.evidence)
                    break
                elif res.state.value == "configured-only" and profile_state not in (InstallState.INSTALLED,):
                    profile_state = InstallState.CONFIGURED_ONLY
                    profile_evidence.extend(res.evidence)
                elif res.state.value == "compatibility-only" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY):
                    profile_state = InstallState.COMPATIBILITY_ONLY
                    profile_evidence.extend(res.evidence)
                elif res.state.value == "cloud-connected" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY):
                    profile_state = InstallState.CLOUD_CONNECTED
                    profile_evidence.extend(res.evidence)
                elif res.state.value == "legacy" and profile_state not in (InstallState.INSTALLED, InstallState.CONFIGURED_ONLY, InstallState.COMPATIBILITY_ONLY, InstallState.CLOUD_CONNECTED):
                    profile_state = InstallState.LEGACY
                    profile_evidence.extend(res.evidence)
                elif res.state.value == "ambiguous" and profile_state == InstallState.NOT_DETECTED:
                    profile_state = InstallState.AMBIGUOUS
                    profile_evidence.extend(res.evidence)

            selector = f"{prod_id}/{prof_id}"
            target_detection_status[selector] = profile_state.value
            # Audit P1-3: strictly filter targets (0.9.1: INSTALLED default, configured/compat opt-in)
            if (
                profile_state == InstallState.INSTALLED
                or (include_configured and profile_state == InstallState.CONFIGURED_ONLY)
                or (include_compatibility and profile_state == InstallState.COMPATIBILITY_ONLY)
            ):
                target_detected_selectors.add(selector)

    return target_detected_selectors, target_detection_status


def _build_all_installed_restore_items(
    source_registry: Registry,
    target_registry: Registry,
    bundle_source_selectors: list[str],
    target_detected_selectors: set[str],
    object_types: list[str],
    scope: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, str]]]:
    """Build restore plan items with object-level identity, deduplication, and conflict tracking."""
    all_items: list[dict[str, Any]] = []
    dropped_losses: list[dict[str, Any]] = []
    seen_target_skills: dict[tuple[str, str], tuple[str, str]] = {}
    seen_target_files: dict[str, tuple[str, str]] = {}
    seen_target_plugins: dict[tuple[str, str], tuple[str, str]] = {}
    mcp_candidates_by_target: dict[str, list[tuple[dict[str, Any], str, str]]] = {}
    failed_targets: list[dict[str, str]] = []

    for tgt_selector in sorted(target_detected_selectors):
        for src_selector in bundle_source_selectors:
            try:
                doc = build_plan_document(
                    source_registry,
                    src_selector,
                    tgt_selector,
                    object_types,
                    scope,
                    target_registry=target_registry,
                )
                for item in doc.get("items", []):
                    obj_type = item.get("object_type")
                    target_dict = item.get("target") or {}
                    source_dict = item.get("source") or {}
                    target_path = target_dict.get("resolved_path")
                    source_path_str = source_dict.get("resolved_path")
                    source_path = Path(source_path_str) if source_path_str else None

                    if not target_path or item.get("status") in {"invalid", "manual-rebuild"}:
                        continue

                    # Audit P0-1: Child-level skill conflict detection & deduplication (0.9.1)
                    if obj_type == "skills" and source_path and source_path.is_dir():
                        skill_subdirs = [
                            p for p in source_path.iterdir()
                            if p.is_dir() and (p / "SKILL.md").is_file()
                        ] if source_path.exists() else []

                        for skill_dir in skill_subdirs:
                            skill_name = skill_dir.name
                            skill_key = (target_path, skill_name)
                            skill_hash = hash_path(skill_dir)
                            child_target_path = str(Path(target_path) / skill_name)
                            child_source_path = str(skill_dir)

                            child_item = copy.deepcopy(item)
                            if child_item.get("source"):
                                child_item["source"]["resolved_path"] = child_source_path
                            if child_item.get("target"):
                                child_item["target"]["resolved_path"] = child_target_path
                            child_item["source_state"] = path_state(Path(child_source_path))
                            child_item["target_state"] = path_state(Path(child_target_path))

                            if skill_key in seen_target_skills:
                                prev_hash, prev_src = seen_target_skills[skill_key]
                                if skill_hash != prev_hash:
                                    conflict_msg = (
                                        f"Skill conflict on '{skill_name}': target {child_target_path} "
                                        f"already claimed by {prev_src} with differing content"
                                    )
                                    dropped_losses.append({
                                        "object_type": "skills",
                                        "field": skill_name,
                                        "reason": conflict_msg,
                                        "detail": None,
                                    })
                                    child_item["status"] = "conflict"
                                    child_item["reason"] = conflict_msg
                                    all_items.append(child_item)
                                # If skill_hash == prev_hash: identical deduplication (skip)
                            else:
                                seen_target_skills[skill_key] = (skill_hash, src_selector)
                                child_item["status"] = "ready"
                                all_items.append(child_item)

                    elif obj_type == "instructions":
                        target_path_obj = Path(target_path)
                        if target_dict.get("storage") == "file" or target_path_obj.suffix in (".md", ".json", ".txt"):
                            file_key = target_path
                            source_hash = hash_path(source_path) if (source_path and source_path.exists()) else ""
                            if file_key in seen_target_files:
                                prev_hash, prev_src = seen_target_files[file_key]
                                if source_hash == prev_hash:
                                    continue
                                else:
                                    item_copy = dict(item)
                                    item_copy["status"] = "conflict"
                                    item_copy["reason"] = (
                                        f"Instruction conflict: multiple sources ({prev_src}, {src_selector}) "
                                        f"target same file {target_path} with different content"
                                    )
                                    dropped_losses.append({
                                        "object_type": "instructions",
                                        "field": target_path,
                                        "reason": item_copy["reason"],
                                        "detail": None,
                                    })
                                    all_items.append(item_copy)
                            else:
                                seen_target_files[file_key] = (source_hash, src_selector)
                                all_items.append(item)
                        else:
                            all_items.append(item)

                    elif obj_type == "mcp":
                        mcp_candidates_by_target.setdefault(target_path, []).append(
                            (item, src_selector, source_path_str or "")
                        )

                    elif obj_type == "plugins":
                        pkg_name = source_path.name if source_path else "pkg"
                        plugin_key = (target_path, pkg_name)
                        source_hash = hash_path(source_path) if (source_path and source_path.exists()) else ""
                        if plugin_key in seen_target_plugins:
                            prev_hash, prev_src = seen_target_plugins[plugin_key]
                            if source_hash == prev_hash:
                                continue
                            else:
                                item_copy = dict(item)
                                item_copy["status"] = "conflict"
                                item_copy["reason"] = f"Plugin conflict: multiple sources ({prev_src}, {src_selector}) targeting {plugin_key}"
                                dropped_losses.append({
                                    "object_type": "plugins",
                                    "field": str(target_path),
                                    "reason": item_copy["reason"],
                                    "detail": None,
                                })
                                all_items.append(item_copy)
                        else:
                            seen_target_plugins[plugin_key] = (source_hash, src_selector)
                            all_items.append(item)

                    else:
                        all_items.append(item)

            except Exception as error:
                # Audit P1-2: never silently swallow per-target plan
                # build failures during all-installed restore. Surface
                # the failure so the restore summary can report it.
                failed_targets.append({
                    "source": src_selector,
                    "target": tgt_selector,
                    "error": str(error),
                })
                print(
                    f"WARNING: restore plan build failed for source={src_selector} target={tgt_selector}: {error}",
                    file=sys.stderr,
                )

    # Consolidate and merge multi-source MCP configs per target file (0.9.1)
    for target_path, candidates in sorted(mcp_candidates_by_target.items()):
        if len(candidates) == 1:
            all_items.append(candidates[0][0])
        else:
            hashes = [
                hash_path(Path(c[2])) for c in candidates
                if c[2] and Path(c[2]).is_file()
            ]
            if len(set(hashes)) == 1:
                all_items.append(candidates[0][0])
            else:
                seen_servers: dict[str, tuple[Any, str, dict[str, Any]]] = {}
                conflicting_servers: set[str] = set()
                for cand_item, cand_src, cand_path_str in candidates:
                    if not cand_path_str or not Path(cand_path_str).is_file():
                        continue
                    cand_path = Path(cand_path_str)
                    src_format = cand_item.get("source", {}).get("source_format", "json:mcpServers")
                    try:
                        text = cand_path.read_text(encoding="utf-8")
                        servers = parse_mcp_document(text, src_format)
                        for srv in servers:
                            if srv.name in seen_servers:
                                prev_srv, prev_src, _ = seen_servers[srv.name]
                                is_same = (
                                    srv.transport == prev_srv.transport
                                    and srv.command == prev_srv.command
                                    and srv.args == prev_srv.args
                                    and srv.env == prev_srv.env
                                    and srv.url == prev_srv.url
                                    and srv.headers == prev_srv.headers
                                    and srv.cwd == prev_srv.cwd
                                )
                                if not is_same:
                                    conflicting_servers.add(srv.name)
                                    conflict_msg = (
                                        f"MCP server conflict on '{srv.name}': differing command/args/transport "
                                        f"between {prev_src} and {cand_src}"
                                    )
                                    dropped_losses.append({
                                        "object_type": "mcp",
                                        "field": f"{srv.name}@{target_path}",
                                        "reason": conflict_msg,
                                        "detail": None,
                                    })
                            else:
                                seen_servers[srv.name] = (srv, cand_src, cand_item)
                    except Exception as error:
                        print(f"WARNING: failed to parse MCP document for {cand_src} ({cand_path_str}): {error}", file=sys.stderr)

                valid_servers = [
                    srv for name, (srv, _, _) in seen_servers.items()
                    if name not in conflicting_servers
                ]

                if valid_servers:
                    mcp_temp_dir = Path(tempfile.mkdtemp(prefix="acb-mcp-merged-"))
                    merged_file = mcp_temp_dir / f"merged_mcp_{hashlib.sha256(target_path.encode()).hexdigest()[:8]}.json"
                    servers_map: dict[str, Any] = {}
                    for srv in valid_servers:
                        s_dict: dict[str, Any] = {}
                        if srv.command is not None:
                            s_dict["command"] = srv.command
                        if srv.args:
                            s_dict["args"] = srv.args
                        if srv.env:
                            s_dict["env"] = srv.env
                        if srv.url is not None:
                            s_dict["url"] = srv.url
                        if srv.headers:
                            s_dict["headers"] = srv.headers
                        if srv.transport and srv.transport != "stdio":
                            s_dict["transport"] = srv.transport
                        if srv.cwd:
                            s_dict["cwd"] = srv.cwd
                        servers_map[srv.name] = s_dict

                    merged_doc = {"mcpServers": servers_map}
                    atomic_write(merged_file, json.dumps(merged_doc, indent=2) + "\n")

                    merged_item = copy.deepcopy(candidates[0][0])
                    merged_item["source"]["resolved_path"] = str(merged_file)
                    merged_item["source"]["boundary"] = str(mcp_temp_dir)
                    merged_item["source"]["source_format"] = "json:mcpServers"
                    merged_item["source_state"] = path_state(merged_file)
                    merged_item["target_state"] = path_state(Path(target_path))
                    merged_item["status"] = "ready"
                    merged_item["reason"] = f"Merged {len(valid_servers)} MCP server(s) from multiple sources"
                    all_items.append(merged_item)
                else:
                    conflict_item = copy.deepcopy(candidates[0][0])
                    conflict_item["status"] = "conflict"
                    conflict_item["reason"] = f"MCP conflict: all servers targeting {target_path} conflicted across sources"
                    conflict_item["source_state"] = path_state(Path(candidates[0][2])) if (candidates[0][2] and Path(candidates[0][2]).exists()) else None
                    conflict_item["target_state"] = path_state(Path(target_path))
                    all_items.append(conflict_item)

    return all_items, dropped_losses, failed_targets


def run_restore(args: argparse.Namespace) -> int:
    """Verify and rebuild a plan from an ACB on the current device.

    Dual-side Plan Architecture (audit P0-1 & P0-3):
    1. Restore source is ALWAYS the verified bundle. Local source installation on
       device B does not alter or replace bundle content.
    2. Bundle objects are staged into an isolated temporary source tree.
    3. Source surfaces are resolved from the staged source registry; target
       surfaces are resolved from the real destination registry on this device.
    4. The reviewed PlanDocument contains the real destination target paths,
       real pre-apply target states (evaluating exists -> replace vs create),
       real unified/semantic diffs against the destination, and real workspace.
    5. The hash of this exact document is locked as plan_sha256 and recorded in
       provenance upon apply.
    6. Executed target paths == reviewed plan target paths at all times.
    """
    bundle_root = args.bundle.resolve()
    errors = verify_bundle(bundle_root)
    trusted_key = getattr(args, "trusted_key", None)
    if trusted_key:
        sig_errors = verify_bundle_signature(bundle_root, trusted_key.resolve())
        errors.extend(sig_errors)
    if errors:
        emit({"ok": False, "stage": "verify", "errors": errors}, args.json)
        return 1
    manifest = load_manifest(bundle_root)
    workspace = args.workspace.resolve()
    target_registry = Registry(args.registry, workspace)
    detected = [row for row in target_registry.inventory(None) if row.get("exists")]

    all_installed = getattr(args, "all_installed", False) or args.target in ("auto", "all-installed")
    source_sel = args.source or "cline/ide"
    target_sel = args.target or "forge/cli"
    object_types = resolve_objects(getattr(args, "objects", "skills,instructions,mcp"))
    have_bundle_objects = (bundle_root / ACB_OBJECTS_DIR).is_dir()

    # Optional object extraction into an explicit restore-root (audit #4:
    # opt-in; defaults OFF so we never imply a transaction landed there).
    restore_root = (
        args.restore_root.resolve(strict=False) if args.restore_root else None
    )
    restore_result = (
        restore_bundle_objects(bundle_root, restore_root, dry_run=args.dry_run)
        if restore_root is not None
        else None
    )

    temp_dir: str | None = None
    try:
        temp_dir = tempfile.mkdtemp(prefix="acb-source-stage-")
        temp_source_dir = Path(temp_dir)
        staged_home = temp_source_dir / "home"
        staged_home.mkdir(parents=True, exist_ok=True)

        if have_bundle_objects:
            objects_root = bundle_root / ACB_OBJECTS_DIR
            requested_scopes = {
                s.strip().lower()
                for s in (args.scope or "user,project").split(",")
                if s.strip()
            }
            if "all" in requested_scopes:
                requested_scopes = {"user", "project", "local"}

            for source_file in sorted(objects_root.rglob("*")):
                if source_file.is_file():
                    rel = source_file.relative_to(objects_root)
                    parts = rel.parts
                    if len(parts) >= 5:
                        obj_t, prod, prof, scp = parts[0], parts[1], parts[2], parts[3]
                        # For all_installed, stage all products; otherwise filter by source_prod
                        if all_installed or prod == source_sel.split("/")[0]:
                            if scp.lower() in requested_scopes:
                                if parts[4] == "home" and len(parts) >= 6:
                                    target_staged = staged_home / Path(*parts[5:])
                                elif scp.lower() == "user":
                                    target_staged = staged_home / Path(*parts[4:])
                                else:
                                    target_staged = temp_source_dir / Path(*parts[4:])
                                target_staged.parent.mkdir(parents=True, exist_ok=True)
                                target_staged.write_bytes(source_file.read_bytes())

        source_registry = Registry(
            args.registry, temp_source_dir, home=staged_home
        )

        plan_in = getattr(args, "plan_in", None)
        if plan_in:
            document = load_plan_document(plan_in.resolve())
            plan_items, _ = validate_plan_document(
                document, target_registry, source_registry=source_registry
            )
        elif all_installed:
            target_detected_selectors, target_detection_status = (
                _detect_target_profiles_for_restore(
                    target_registry=target_registry,
                    workspace=workspace,
                    include_configured=getattr(args, "include_configured", False),
                    include_compatibility=getattr(args, "include_compatibility", False),
                )
            )

            bundle_source_selectors = sorted({
                f"{obj.get('product')}/{obj.get('profile')}"
                for obj in manifest.objects
                if obj.get("product") and obj.get("profile")
            })
            if not bundle_source_selectors:
                bundle_source_selectors = [source_sel] if source_sel else ["cline/ide"]

            all_items, dropped_losses, failed_targets = _build_all_installed_restore_items(
                source_registry=source_registry,
                target_registry=target_registry,
                bundle_source_selectors=bundle_source_selectors,
                target_detected_selectors=target_detected_selectors,
                object_types=object_types,
                scope=args.scope,
            )

            document = {
                "schema_version": 1,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "workspace": str(target_registry.workspace),
                "source": "all-installed",
                "source_profile": "all",
                "source_support_level": "bidirectional-reviewed",
                "target": "all-installed",
                "target_profile": "all",
                "target_support_level": "bidirectional-reviewed",
                "scope": args.scope or "user,project",
                "objects": object_types,
                "registry_sha256": hash_path(target_registry.path),
                "adapter_versions": ADAPTER_VERSIONS,
                "git_provenance": git_provenance(target_registry.workspace),
                "items": all_items,
                "loss_report": {"dropped_fields": dropped_losses, "warnings": []},
                "rebuild_manifest": {
                    "credential_policy": "references-only; never include literal credentials",
                    "items": [],
                },
                "detection_status": target_detection_status,
                "failed_targets": failed_targets,
            }
            document["plan_sha256"] = json_sha256(_plan_hash_payload(document))
            plan_items, _ = validate_plan_document(
                document, target_registry, source_registry=source_registry
            )
        else:
            # Build dual-side plan: source=bundle (source_registry), target=destination device (target_registry)
            document = build_plan_document(
                source_registry,
                source_sel,
                target_sel,
                object_types,
                args.scope,
                target_registry=target_registry,
            )
            # Enforce TOCTOU state lock validation on the generated plan document
            plan_items, _ = validate_plan_document(
                document, target_registry, source_registry=source_registry
            )

        # Write the reviewed plan document if requested
        plan_out = None
        if args.plan_out and not args.dry_run:
            plan_out = args.plan_out.resolve(strict=False)
            plan_out.parent.mkdir(parents=True, exist_ok=True)
            atomic_write(
                plan_out,
                json.dumps(document, indent=2, sort_keys=True) + "\n",
            )

        plan_display = str(plan_out) if plan_out else (str(plan_in) if plan_in else None)

        if args.dry_run:
            # Zero-write guarantee for dry-run.
            emit(
                {
                    "ok": True,
                    "stage": "plan",
                    "bundle": str(bundle_root),
                    "bundle_id": manifest.bundle_id,
                    "plan": plan_display,
                    "plan_sha256": document["plan_sha256"],
                    "restore": restore_result,
                    "dry_run": True,
                    "detected": detected[:50],
                    "failed_targets": document.get("failed_targets", []),
                },
                args.json,
            )
            return 0

        is_plan_only = getattr(args, "plan_only", False) or not args.yes
        if is_plan_only:
            emit(
                {
                    "ok": True,
                    "stage": "plan",
                    "bundle": str(bundle_root),
                    "bundle_id": manifest.bundle_id,
                    "plan": plan_display,
                    "plan_sha256": document["plan_sha256"],
                    "restore": restore_result,
                    "detected": detected[:50],
                    "failed_targets": document.get("failed_targets", []),
                },
                args.json,
            )
            return 0

        if args.apply_safe:
            # No-op guard (audit #2): bundle carried objects but nothing
            # eligible was resolved — refuse to report success.
            if have_bundle_objects and not any(
                item.status == "ready" for item in plan_items
            ):
                if not getattr(args, "allow_noop", False):
                    emit(
                        {
                            "ok": False,
                            "stage": "apply",
                            "error": "restore resolved no eligible items; refusing silent no-op (use --allow-noop to override)",
                        },
                        args.json,
                    )
                    return 1
            return _apply_restore(
                plan_items, workspace, args, bundle_root, manifest,
                document, restore_result, detected,
            )

        emit(
            {
                "ok": True,
                "stage": "plan",
                "bundle": str(bundle_root),
                "bundle_id": manifest.bundle_id,
                "plan": plan_display,
                "plan_sha256": document["plan_sha256"],
                "restore": restore_result,
                "detected": detected[:50],
                "failed_targets": document.get("failed_targets", []),
            },
            args.json,
        )
        return 0
    finally:
        # The staged source tree must stay alive until apply_plan has read it,
        # so it is cleaned up only here (audit #5: never leak to /tmp).
        if temp_dir is not None and Path(temp_dir).exists():
            shutil.rmtree(temp_dir, ignore_errors=True)


def _apply_restore(
    plan_items: list,
    workspace: Path,
    args: argparse.Namespace,
    bundle_root: Path,
    manifest,
    document: dict,
    restore_result,
    detected,
) -> int:
    """Apply a resolved plan, verify it, and emit the result."""
    manifest_obj, manifest_path_out = apply_plan(
        plan_items, workspace, args.manifest_out,
        provenance={
            "bundle_path": str(bundle_root),
            "bundle_id": manifest.bundle_id,
            "plan_sha256": document["plan_sha256"],
            "registry_sha256": document["registry_sha256"],
            "adapter_versions": document["adapter_versions"],
        },
        apply_safe=True,
        include_lossy=(args.include_lossy == "lossy"),
        accept_loss_ids=set(),
        strict=args.strict,
        allow_plugin_copy=bool(getattr(args, "include_plugins", False)),
        allow_session_handoff=bool(getattr(args, "include_session", False)),
    )
    verify_errors = verify_manifest(manifest_path_out)
    emit(
        {
            "ok": not verify_errors,
            "stage": "verify",
            "bundle": str(bundle_root),
            "plan": str(args.plan_out) if getattr(args, "plan_out", None) else None,
            "manifest": str(manifest_path_out),
            "restore": restore_result,
            "stale_targets": [],
            "detected": detected[:50],
            "summary": manifest_obj.get("summary", {}),
            "errors": verify_errors,
            "failed_targets": document.get("failed_targets", []),
        },
        args.json,
    )
    return 0 if not verify_errors else 1


def run_doctor(args: argparse.Namespace) -> int:
    """Inspect a bundle and surface missing executables / re-auth work."""
    bundle_root = args.bundle.resolve()
    errors = verify_bundle(bundle_root)
    if errors:
        emit({"ok": False, "stage": "verify", "errors": errors}, args.json)
        return 1
    requirements = json.loads(
        (bundle_root / "requirements.json").read_text(encoding="utf-8")
    )
    reauth = json.loads((bundle_root / "reauth.json").read_text(encoding="utf-8"))
    rebuild = json.loads((bundle_root / "rebuild.json").read_text(encoding="utf-8"))
    missing_executables: list[str] = []
    for binary in requirements.get("executables", []):
        if not shutil.which(binary):
            missing_executables.append(binary)
    emit(
        {
            "ok": not missing_executables,
            "bundle": str(bundle_root),
            "missing_executables": missing_executables,
            "reauth_actions": reauth.get("items", []),
            "rebuild_actions": rebuild.get("items", []),
            "platform_notes": requirements.get("platform_notes", []),
        },
        args.json,
    )
    return 0 if not missing_executables else 1


def run_migrate(args: argparse.Namespace) -> int:
    """Orchestrate detect -> inventory -> plan -> apply -> verify."""
    workspace = args.workspace.resolve()
    registry = Registry(args.registry, workspace)

    # 1. detect --installed (informational; does not gate the run).
    detect_rows = [row for row in registry.inventory(None) if row.get("exists")]

    # 2. Resolve --objects.
    object_types = resolve_objects(args.objects)

    # Reject unsupported automatic object types unless all-inventory.
    unsupported = sorted(
        set(object_types) - AUTOMATIC_OBJECT_TYPES - OPT_IN_WRITABLE_OBJECT_TYPES - INVENTORY_ONLY_OBJECT_TYPES
    )
    if unsupported:
        raise ValueError(
            "unsupported automatic objects: "
            + ", ".join(unsupported)
            + "; use --objects 'skills,instructions,mcp' or 'all-portable'"
        )
    # Include automatic and opt-in writable types in the plan
    auto_object_types = [
        obj for obj in object_types
        if obj in AUTOMATIC_OBJECT_TYPES or obj in OPT_IN_WRITABLE_OBJECT_TYPES
    ]

    # 3. scope handling: default user,project; full-disk 'all' requires --yes.
    scope = args.scope
    if scope == "all" and not args.yes:
        raise ValueError("--scope all requires --yes")
    if scope not in {"user", "project", "user,project", "all"}:
        raise ValueError(f"unsupported scope: {scope}")

    # 4. plan
    document = build_plan_document(
        registry, args.source, args.target, auto_object_types, scope,
    )

    # 5. save plan
    plan_out = (
        args.plan_out.resolve(strict=False)
        if args.plan_out
        else default_workspace_migration_dir(workspace) / "migrate-plan.json"
    )
    plan_out.parent.mkdir(parents=True, exist_ok=True)
    atomic_write(
        plan_out,
        json.dumps(document, indent=2, sort_keys=True) + "\n",
    )

    if args.plan_only:
        emit(
            {
                "ok": True,
                "stage": "plan",
                "plan": str(plan_out),
                "plan_sha256": document["plan_sha256"],
                "detected": detect_rows,
            },
            args.json,
        )
        return 0

    # 6. apply (re-load the saved plan so the apply path matches the
    # production flow exactly).
    plan_items, _ = validate_plan_document(document, registry)
    accept_loss_ids = {
        token.strip() for token in args.accept_loss.split(",") if token.strip()
    }
    default_manifest_out = (
        args.manifest_out.resolve(strict=False)
        if args.manifest_out
        else default_workspace_migration_dir(workspace) / "migrate-manifest.json"
    )
    manifest, manifest_path_out = apply_plan(
        plan_items,
        workspace,
        default_manifest_out,
        provenance={
            "plan_path": str(plan_out.resolve()),
            "plan_sha256": document["plan_sha256"],
            "registry_sha256": document["registry_sha256"],
            "adapter_versions": document["adapter_versions"],
            "git_provenance": document.get("git_provenance"),
        },
        apply_safe=True,
        include_lossy=(args.include_lossy == "lossy"),
        accept_loss_ids=accept_loss_ids,
        strict=args.strict,
        allow_plugin_copy=bool(getattr(args, "include_plugins", False)),
        allow_session_handoff=bool(getattr(args, "include_session", False)),
    )

    # 7. verify
    errors = verify_manifest(manifest_path_out)
    verify_out = (
        args.verify_out.resolve(strict=False)
        if args.verify_out
        else default_workspace_migration_dir(workspace) / "migrate-verify.json"
    )
    verify_out.parent.mkdir(parents=True, exist_ok=True)
    atomic_write(
        verify_out,
        json.dumps(
            {
                "ok": not errors,
                "errors": errors,
                "manifest": str(manifest_path_out),
                "plan": str(plan_out),
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
    )

    emit(
        {
            "ok": not errors,
            "stage": "verify",
            "plan": str(plan_out),
            "manifest": str(manifest_path_out),
            "verify": str(verify_out),
            "summary": manifest.get("summary", {}),
            "errors": errors,
            "detected": detect_rows,
        },
        args.json,
    )
    return 0 if not errors else 1


def run_legacy_cli(argv: list[str]) -> int:
    reject_legacy_write(argv)
    environment = dict(os.environ)
    environment["AGENT_SKILLS_SETUP_INTERNAL_LEGACY"] = "1"
    bash_exe = "bash"
    if os.name == "nt":
        # On Windows hosts PATH can resolve bare "bash" to the System32
        # WSL launcher, which is not an MSYS shell: its output carries
        # NUL bytes and its lookups return nothing. Prefer Git Bash.
        for candidate in (
            Path(os.environ.get("PROGRAMW6432", r"C:\Program Files")) / "Git" / "bin" / "bash.exe",
            Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Git" / "usr" / "bin" / "bash.exe",
        ):
            if candidate.is_file():
                bash_exe = str(candidate)
                break
    completed = subprocess.run(
        [bash_exe, str(LEGACY_SCRIPT), *argv],
        check=False,
        env=environment,
    )
    return completed.returncode


def run_new_cli(argv: list[str]) -> int:
    args = create_parser().parse_args(argv)
    if args.command == "verify":
        errors = verify_manifest(args.manifest)
        result = {"ok": not errors, "errors": errors, "manifest": str(args.manifest)}
        emit(result, args.json)
        return 0 if not errors else 1
    if args.command == "rollback":
        if not args.yes:
            raise ValueError("rollback requires --yes")
        restored = rollback_manifest(args.manifest)
        emit({"ok": True, "restored": restored}, args.json)
        return 0

    if args.command == "apply":
        if not args.yes:
            raise ValueError("apply requires --yes after reviewing the saved plan")
        document = load_plan_document(args.plan)
        workspace_value = document.get("workspace")
        if not isinstance(workspace_value, str) or not Path(workspace_value).is_absolute():
            raise ValueError("plan workspace must be an absolute path")
        registry = Registry(args.registry, Path(workspace_value))

        source_registry = None
        temp_dir = None
        bundle_root = None
        try:
            if getattr(args, "bundle", None):
                bundle_root = args.bundle.resolve()
                errors = verify_bundle(bundle_root)
                if errors:
                    emit({"ok": False, "stage": "verify", "errors": errors}, args.json)
                    return 1
                temp_dir = tempfile.mkdtemp(prefix="acb-source-stage-")
                temp_source_dir = Path(temp_dir)
                staged_home = temp_source_dir / "home"
                staged_home.mkdir(parents=True, exist_ok=True)
                objects_root = bundle_root / ACB_OBJECTS_DIR
                if objects_root.is_dir():
                    for source_file in sorted(objects_root.rglob("*")):
                        if source_file.is_file():
                            rel = source_file.relative_to(objects_root)
                            parts = rel.parts
                            if len(parts) >= 5:
                                if parts[4] == "home" and len(parts) >= 6:
                                    target_staged = staged_home / Path(*parts[5:])
                                elif parts[3].lower() == "user":
                                    target_staged = staged_home / Path(*parts[4:])
                                else:
                                    target_staged = temp_source_dir / Path(*parts[4:])
                                target_staged.parent.mkdir(parents=True, exist_ok=True)
                                target_staged.write_bytes(source_file.read_bytes())
                source_registry = Registry(
                    args.registry, temp_source_dir, home=staged_home
                )

            plan_items, _ = validate_plan_document(
                document, registry, source_registry=source_registry
            )
            accept_loss_ids = {
                token.strip()
                for token in args.accept_loss.split(",")
                if token.strip()
            }
            provenance = {
                "plan_path": str(args.plan.resolve()),
                "plan_sha256": document["plan_sha256"],
                "registry_sha256": document["registry_sha256"],
                "adapter_versions": document["adapter_versions"],
                "git_provenance": document.get("git_provenance"),
            }
            if bundle_root is not None:
                provenance["bundle_path"] = str(bundle_root)
            manifest, manifest_path = apply_plan(
                plan_items,
                registry.workspace,
                args.manifest,
                provenance=provenance,
                apply_safe=args.apply_safe,
                include_lossy=(args.include_lossy == "lossy"),
                accept_loss_ids=accept_loss_ids,
                strict=args.strict,
                allow_plugin_copy=bool(getattr(args, "include_plugins", False)),
                allow_session_handoff=bool(getattr(args, "include_session", False)),
            )
            emit(
                {
                    "ok": True,
                    "plan": str(args.plan),
                    "plan_sha256": document["plan_sha256"],
                    "manifest": str(manifest_path),
                    "changes": manifest["changes"],
                    "loss_report": manifest["loss_report"],
                },
                args.json,
            )
            return 0
        finally:
            if temp_dir is not None and Path(temp_dir).exists():
                shutil.rmtree(temp_dir, ignore_errors=True)

    if args.command == "migrate":
        if not args.yes:
            raise ValueError(
                "migrate requires --yes after specifying source/target/objects"
            )
        return run_migrate(args)

    if args.command == "snapshot":
        return run_snapshot(args)

    if args.command == "bundle-verify":
        return run_bundle_verify(args)

    if args.command == "bundle-sign":
        return run_bundle_sign(args)

    if args.command == "bundle-keygen":
        return run_bundle_keygen(args)

    if args.command == "restore":
        return run_restore(args)

    if args.command == "doctor":
        return run_doctor(args)

    registry = Registry(args.registry, args.workspace)
    if args.command in {"detect", "inventory"}:
        if args.command == "detect":
            return run_detection(args)
        selected = selector(args.product, args.profile)
        rows = registry.inventory(selected)
        emit(rows, args.json)
        return 0

    object_types = resolve_objects(args.objects)
    unsupported = sorted(
        set(object_types) - AUTOMATIC_OBJECT_TYPES - OPT_IN_WRITABLE_OBJECT_TYPES - INVENTORY_ONLY_OBJECT_TYPES
    )
    if unsupported:
        raise ValueError(f"unsupported automatic objects: {', '.join(unsupported)}")
    document = build_plan_document(
        registry,
        args.source,
        args.target,
        object_types,
        args.scope,
    )
    if args.output:
        output_path = args.output.resolve(strict=False)
        protected_paths = [args.registry.resolve(strict=False)]
        for item in document["items"]:
            for side in ("source", "target"):
                surface = item.get(side)
                if isinstance(surface, dict) and isinstance(
                    surface.get("resolved_path"), str
                ):
                    protected_paths.append(Path(surface["resolved_path"]))
        if any(paths_overlap(output_path, path) for path in protected_paths):
            raise ValueError(
                "plan output overlaps the Registry or a planned source/target "
                f"surface: {output_path}"
            )
        atomic_write(
            output_path,
            json.dumps(document, indent=2, sort_keys=True) + "\n",
        )
    emit(document, args.json)
    return 0


def main() -> int:
    argv = sys.argv[1:]
    if not argv or argv[0] in {"-h", "--help"}:
        create_parser().print_help()
        return 0
    if argv[0] == "legacy":
        try:
            return run_legacy_cli(argv[1:])
        except (OSError, ValueError, json.JSONDecodeError) as error:
            print(f"ERROR: {error}", file=sys.stderr)
            return 1
    if argv[0].startswith("-"):
        print(
            "ERROR: implicit legacy flags are disabled; use the explicit "
            "'legacy' subcommand for lookup or zero-write dry-run compatibility",
            file=sys.stderr,
        )
        return 2
    if argv[0] not in KNOWN_COMMANDS:
        print(f"ERROR: unknown command: {argv[0]}", file=sys.stderr)
        return 2
    try:
        return run_new_cli(argv)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
