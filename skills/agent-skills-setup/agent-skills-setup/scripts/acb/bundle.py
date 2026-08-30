"""Agent Context Bundle (.acb) creation, verification, and restore.

Layout::

    <bundle>.acb/
        manifest.json          schema_version, source_platform, objects
        inventory.json         portable per-product surface inventory
        compatibility.json     per-product target-eligibility matrix
        requirements.json      executables, packages, extensions, manual_installs
        secrets.required.json  non-secret names of required credentials
        reauth.json            per-MCP re-auth action list
        rebuild.json           per-object manual-rebuild manifest
        checksums.json         sha256 of every other file
        objects/<surface>/     reviewed object content (no secrets)

The bundle is created from a snapshot of the local filesystem plus the
Registry v2 inventory.  :func:`verify_bundle` performs closed-world integrity
checks ensuring no unexpected or missing files, no symlinks/devices, and
accurate SHA256 hashes.
"""

from __future__ import annotations

import base64
import dataclasses
import hashlib
import json
import os
import re
import shutil
import stat
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import skill_secret_scanner

ACB_SCHEMA_VERSION = 1
ACB_MANIFEST_NAME = "manifest.json"
ACB_INVENTORY_NAME = "inventory.json"
ACB_COMPATIBILITY_NAME = "compatibility.json"
ACB_REQUIREMENTS_NAME = "requirements.json"
ACB_SECRETS_NAME = "secrets.required.json"
ACB_REAUTH_NAME = "reauth.json"
ACB_REBUILD_NAME = "rebuild.json"
ACB_CHECKSUMS_NAME = "checksums.json"
ACB_OBJECTS_DIR = "objects"

ACB_JSON_FILES = (
    ACB_MANIFEST_NAME,
    ACB_INVENTORY_NAME,
    ACB_COMPATIBILITY_NAME,
    ACB_REQUIREMENTS_NAME,
    ACB_SECRETS_NAME,
    ACB_REAUTH_NAME,
    ACB_REBUILD_NAME,
)

# Resource safety limits
MAX_BUNDLE_FILES = 5000
MAX_FILE_SIZE = 10 * 1024 * 1024       # 10 MB per file
MAX_TOTAL_SIZE = 100 * 1024 * 1024     # 100 MB total
MAX_DIR_DEPTH = 16

# Safe binary extensions allowlist
SAFE_BINARY_EXTENSIONS = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
    ".svg", ".woff", ".woff2", ".ttf", ".eot", ".otf"
})

# Forbidden snapshot policies and non-migratable object types (audit P0-2)
FORBIDDEN_SNAPSHOT_POLICIES = frozenset({
    "forbidden-regenerate",
    "never-migrate",
    "source-only",
    "cloud-rebuild",
    "disabled-draft-only",
})

FORBIDDEN_SNAPSHOT_OBJECT_TYPES = frozenset({
    "generated_memory",
    "session",
    "chat",
    "runtime",
    "database",
    "trust",
    "approval",
    "oauth_state",
    "credentials",
})

_SENSITIVE_FILENAME_HINT = re.compile(
    r"(?i)(^\.env(\..+)?$|\.pem$|\.key$|^id_rsa|^id_ed25519|^id_ecdsa|\.p12$|\.pfx$)"
)


class ACBError(Exception):
    """Base class for ACB failures."""


class ACBSecretLeak(ACBError):
    """Raised when literal secret values are detected in bundle content."""


class ACBIntegrityError(ACBError):
    """Raised when bundle integrity or containment check fails."""


@dataclasses.dataclass
class ACBManifest:
    schema_version: int
    bundle_id: str
    created_at: str
    source_platform: dict[str, str]
    inventory_summary: dict[str, Any]
    objects: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "bundle_id": self.bundle_id,
            "created_at": self.created_at,
            "source_platform": self.source_platform,
            "inventory_summary": self.inventory_summary,
            "objects": self.objects,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "ACBManifest":
        return cls(
            schema_version=int(payload["schema_version"]),
            bundle_id=str(payload["bundle_id"]),
            created_at=str(payload["created_at"]),
            source_platform=dict(payload.get("source_platform", {})),
            inventory_summary=dict(payload.get("inventory_summary", {})),
            objects=list(payload.get("objects", [])),
        )


def enrich_manifest_object(
    obj: dict[str, Any],
    objects_dir_files: dict[str, bytes],
    adapter_versions: dict[str, str] | None = None,
    object_file_map: dict[str, list[str]] | None = None,
) -> dict[str, Any]:
    """Enrich a manifest object with file list, hashes, and metadata.

    Adds:
    - object_path: logical path under objects/
    - files: list of {path, sha256, size} for each file
    - source_format_version: format version from plan/registry
    - adapter_version: adapter version used for this object type
    - portability_mode: "full" | "lossy" | "manual" | "excluded"
    - content_hash: SHA256 of primary content file (for quick comparison)
    """
    obj_dict = dict(obj)
    obj_type = obj_dict.get("surface") or obj_dict.get("object_type", "")
    prod = obj_dict.get("product", "")
    prof = obj_dict.get("profile", "")
    scp = obj_dict.get("scope", "")

    # Build logical object path
    obj_key = f"{obj_type}/{prod}/{prof}/{scp}"
    obj_dict["object_path"] = obj_key

    # Collect files for this object
    obj_files = []
    prefix = f"{obj_key}/"
    primary_hash = None

    if object_file_map is not None and obj_key in object_file_map:
        file_paths = sorted(set(object_file_map[obj_key]))
    else:
        file_paths = sorted([
            rel_path for rel_path in (objects_dir_files or {}).keys()
            if rel_path.startswith(prefix)
        ])

    for rel_path in file_paths:
        data = (objects_dir_files or {}).get(rel_path, b"")
        file_hash = hashlib.sha256(data).hexdigest()
        file_entry = {
            "path": f"{ACB_OBJECTS_DIR}/{Path(rel_path).as_posix()}",
            "sha256": file_hash,
            "size": len(data),
        }
        obj_files.append(file_entry)
        if primary_hash is None:
            primary_hash = file_hash
    obj_dict["files"] = obj_files
    obj_dict["content_hash"] = primary_hash

    # Add source format version and adapter version if available
    if adapter_versions:
        obj_dict["adapter_version"] = adapter_versions.get(obj_type, "")
    # source_format_version would come from plan item; placeholder for now
    obj_dict["source_format_version"] = obj_dict.get("source_format", "")

    # Determine portability mode from status
    status = obj_dict.get("status", "")
    if status == "ready":
        obj_dict["portability_mode"] = "full"
    elif status == "ready-lossy":
        obj_dict["portability_mode"] = "lossy"
    elif status in ("manual-rebuild", "draft-disabled", "forbidden"):
        obj_dict["portability_mode"] = "manual"
    elif status == "excluded":
        obj_dict["portability_mode"] = "excluded"
    else:
        obj_dict["portability_mode"] = "unknown"

    return obj_dict


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def is_binary_bytes(data: bytes) -> bool:
    """Determine whether data is non-text binary."""
    if b"\x00" in data:
        return True
    try:
        data.decode("utf-8")
        return False
    except UnicodeDecodeError:
        return True


def looks_like_secret_value(value: Any) -> bool:
    """Heuristic check: does this string look like a literal credential?

    Uses the SAME unified scanner as Skills/objects (audit #6) so that only
    genuine credential SHAPES are flagged — provider tokens, private-key
    blocks, or ``key=value`` / ``key: value`` assignments — not prose that
    merely mentions words like "secret" or "token".
    """
    if not isinstance(value, str):
        return False
    if not value or value.startswith("${") or value.startswith("$") or value.startswith("<"):
        return False
    return skill_secret_scanner.finding_reason(value.encode("utf-8")) is not None


def scan_object_bytes(data: bytes, path_name: str) -> None:
    """Perform strict secret, private-key, and binary safety scans on raw object bytes."""
    path = Path(path_name)
    base_name = path.name

    # 1. Block sensitive file names (.env, private keys, certificates)
    if _SENSITIVE_FILENAME_HINT.search(base_name):
        raise ACBSecretLeak(f"forbidden sensitive file in bundle: {path_name}")

    # 2. Check binary safety
    if is_binary_bytes(data):
        # Check executable magic headers
        if data.startswith(b"\x7fELF"):
            raise ACBSecretLeak(f"executable ELF binary rejected: {path_name}")
        if data.startswith((b"\xfe\xed\xfa\xce", b"\xfe\xed\xfa\xcf", b"\xcf\xfa\xed\xfe", b"\xca\xfe\xba\xbe")):
            raise ACBSecretLeak(f"executable Mach-O binary rejected: {path_name}")
        if data.startswith(b"MZ"):
            raise ACBSecretLeak(f"executable PE binary rejected: {path_name}")

        # Check extension against binary allowlist
        ext = path.suffix.lower()
        if ext not in SAFE_BINARY_EXTENSIONS:
            raise ACBSecretLeak(f"unallowlisted binary file rejected: {path_name}")
        return

    # 3. Unified generic secret scan. Reuses skill_secret_scanner.finding_reason
    # so that credentials are detected identically across the Skill scanner and
    # ACB objects (audit #6): private keys, provider patterns, Bearer tokens,
    # connection-string userinfo, and literal credential assignments
    # (password=, client_secret:, DATABASE_URL with embedded creds, etc.).
    secret_reason = skill_secret_scanner.finding_reason(data)
    if secret_reason is not None:
        raise ACBSecretLeak(f"{secret_reason} in {path_name}")

    # 4. Require clean UTF-8 text for non-binary allowlisted content.
    try:
        data.decode("utf-8")
    except UnicodeDecodeError:
        raise ACBSecretLeak(f"undecodable non-allowlisted text: {path_name}")


def assert_no_lateral_secrets(payload: dict[str, Any]) -> None:
    """Reject literal secret-looking strings in a structured payload."""
    for key, value in _walk(payload):
        if isinstance(value, str) and looks_like_secret_value(value):
            if key.endswith(".name") or key == "name":
                if isinstance(value, str) and re.match(r"^[A-Z][A-Z0-9_]+$", value):
                    continue
            raise ACBSecretLeak(
                f"literal credential-looking string at {key}: {value[:32]!r}"
            )


def _walk(payload: Any, path: tuple[str, ...] = ()) -> Any:
    if isinstance(payload, dict):
        for key, value in payload.items():
            yield from _walk(value, path + (str(key),))
    elif isinstance(payload, list):
        for index, value in enumerate(payload):
            yield from _walk(value, path + (f"[{index}]",))
    else:
        yield ".".join(path), payload


def validate_path_containment(relative_path: str | Path, base_dir: Path) -> Path:
    """Ensure path has no absolute segments, traversal, drive specifiers, and stays within base_dir."""
    p_str = str(relative_path).replace("\\", "/")
    if p_str.startswith("/") or re.match(r"^[a-zA-Z]:", p_str) or p_str.startswith("//"):
        raise ACBIntegrityError(f"forbidden absolute/UNC path: {relative_path}")
    parts = Path(p_str).parts
    if ".." in parts or any(part.startswith("/") for part in parts):
        raise ACBIntegrityError(f"path traversal detected: {relative_path}")
    resolved_target = (base_dir / p_str).resolve()
    try:
        resolved_target.relative_to(base_dir.resolve())
    except ValueError:
        raise ACBIntegrityError(f"path escapes base directory: {relative_path}")
    return resolved_target


def sanitize_inventory_for_bundle(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sanitize inventory rows for portable bundles by stripping machine-specific paths and local user info."""
    clean_rows: list[dict[str, Any]] = []
    for row in rows:
        clean_row = {
            "product": row.get("product", ""),
            "profile": row.get("profile", "default"),
            "object_type": row.get("object_type", ""),
            "scope": row.get("scope", ""),
            "canonical_path": row.get("canonical_path", ""),
            "format": row.get("format", ""),
            "policy": row.get("policy", ""),
            "content_hash": row.get("content_hash", ""),
            "exists": bool(row.get("exists", False)),
        }
        clean_rows.append(clean_row)
    return clean_rows


def collect_requirements(
    inventory_rows: list[dict[str, Any]],
    plan_rows: list[dict[str, Any]],
    objects_dir_files: dict[str, bytes] | None = None,
) -> tuple[dict[str, Any], dict[str, int]]:
    """Compute bundle-level prerequisites and surface parse failures.

    Audit P1-2 (0.8.27): never silently swallow MCP parse failures. If a
    Gemini / Augment / VS Code / Qoder settings.json changes shape and we
    cannot extract its MCP servers, we record the failure in ``summary``
    rather than emitting a "successful" bundle with missing data.

    Returns ``(requirements, summary)`` where summary contains:
    - parse_failed: count of MCP sources we could not parse
    - parse_failed_details: list[dict] with per-source error context
    """
    executables: set[str] = set()
    extensions: set[str] = set()
    packages: list[dict[str, str]] = []
    manual_installs: list[str] = []
    platform_notes: list[str] = []
    parse_failed_details: list[dict[str, str]] = []

    def _record_parse_failure(source_label: str, error: Exception) -> None:
        parse_failed_details.append(
            {"source": source_label, "error": str(error)}
        )

    def _normalize_package_name(name: str, manager: str) -> str:
        """Normalize package name by stripping version suffixes and common prefixes."""
        # Remove version specifiers (@version, @latest, etc.)
        if "@" in name and not name.startswith("@"):
            name = name.split("@")[0]
        # Remove common prefixes
        for prefix in ["npm:", "pypi:", "github:"]:
            if name.startswith(prefix):
                name = name[len(prefix):]
        return name

    def _add_package(manager: str, name: str) -> None:
        """Add a package with normalized name."""
        normalized = _normalize_package_name(name, manager)
        if normalized:
            packages.append({"manager": manager, "name": normalized})

    # 1. Inspect captured raw object files for MCP server requirements
    if objects_dir_files:
        for rel, data in objects_dir_files.items():
            if rel.startswith("mcp/"):
                try:
                    doc = json.loads(data.decode("utf-8"))
                    servers = doc.get("mcpServers") or doc.get("servers") or {}
                    if isinstance(servers, dict):
                        for _, s_cfg in servers.items():
                            if isinstance(s_cfg, dict):
                                cmd = s_cfg.get("command") or s_cfg.get("runner") or ""
                                if cmd and not str(cmd).endswith(".json") and not str(cmd).startswith("~"):
                                    executables.add(str(cmd))
                                args = s_cfg.get("args") or []
                                if isinstance(args, list):
                                    for arg in args:
                                        if isinstance(arg, str):
                                            if arg.startswith("@") or "mcp-server" in arg:
                                                _add_package("npm" if cmd in ("npx", "npm", "node") else "auto", arg)
                                            # VS Code extension IDs in args (e.g., "ms-vscode.cpptools")
                                            elif "." in arg and not arg.endswith((".py", ".js", ".json")) and "/" not in arg:
                                                extensions.add(arg)
                                            # Python/JS script paths - these are manual installs, not packages
                                            elif arg.endswith(".py") or arg.endswith(".js"):
                                                manual_installs.append(arg)
                except Exception as error:
                    _record_parse_failure(f"objects_dir_files:{rel}", error)

    # 2. Inspect plan items to discover required tools & packages from disk sources
    for item in plan_rows:
        if item.get("status") not in {"ready", "ready-lossy", "draft-disabled", "manual-rebuild"}:
            continue
        obj_type = item.get("object_type")
        if obj_type == "mcp":
            src = item.get("source") or {}
            resolved = src.get("resolved_path")
            if resolved and Path(resolved).is_file():
                try:
                    raw_text = Path(resolved).read_text(encoding="utf-8")
                    from migration_core import parse_mcp_document
                    servers = parse_mcp_document(raw_text, src.get("source_format", "json:mcpServers"))
                    for s in servers:
                        if s.command and not str(s.command).endswith(".json") and not str(s.command).startswith("~"):
                            executables.add(str(s.command))
                        for arg in s.args:
                            if isinstance(arg, str):
                                if arg.startswith("@") or "mcp-server" in arg:
                                    _add_package("npm" if s.command in ("npx", "npm", "node") else "auto", arg)
                                elif "." in arg and not arg.endswith((".py", ".js", ".json")) and "/" not in arg:
                                    extensions.add(arg)
                                elif arg.endswith(".py") or arg.endswith(".js"):
                                    manual_installs.append(arg)
                except Exception as error:
                    src_label = (
                        f"plan_item:{src.get('product', '')}/{src.get('profile', '')}"
                        f"/{src.get('scope', '')}:{resolved}"
                    )
                    _record_parse_failure(src_label, error)
        elif obj_type in ("skills", "instructions"):
            # Skills and instructions may require the target IDE to be installed
            tgt = item.get("target") or {}
            tgt_product = tgt.get("product", "")
            if tgt_product:
                # Add platform-specific notes about required IDE
                platform_notes.append(f"Target {tgt_product} must be installed to use {obj_type}")

    clean_packages = []
    seen_pkg = set()
    for p in packages:
        key = (p.get("manager"), p.get("name"))
        if key not in seen_pkg:
            seen_pkg.add(key)
            clean_packages.append(p)

    requirements = {
        "executables": sorted(executables),
        "extensions": sorted(extensions),
        "packages": clean_packages,
        "manual_installs": sorted(set(manual_installs)),
        "platform_notes": platform_notes,
    }
    summary = {
        "parse_failed": len(parse_failed_details),
        "parse_failed_details": parse_failed_details,
    }
    return requirements, summary


def collect_reauth(
    plan_rows: list[dict[str, Any]],
) -> list[dict[str, str]]:
    actions: list[dict[str, str]] = []
    for item in plan_rows:
        if item.get("status") == "manual-rebuild" and item.get("object_type") == "mcp":
            src = item.get("source") or {}
            actions.append(
                {
                    "object_id": item.get("object_id", ""),
                    "reason": item.get("reason", "OAuth re-auth required"),
                    "action": "Open the target product's MCP UI, sign in, and re-add the server.",
                    "source": {
                        "package": src.get("package", ""),
                        "command": src.get("command", ""),
                    },
                }
            )
    return actions


def collect_rebuild(
    plan_rows: list[dict[str, Any]],
) -> list[dict[str, str]]:
    actions: list[dict[str, str]] = []
    for item in plan_rows:
        if item.get("status") in {"manual-rebuild", "forbidden"}:
            actions.append(
                {
                    "object_id": item.get("object_id", ""),
                    "object_type": item.get("object_type", ""),
                    "reason": item.get("reason", ""),
                    "actions": item.get("manual_actions", []),
                }
            )
    return actions


def write_bundle(
    *,
    bundle_root: Path,
    manifest: ACBManifest,
    inventory_rows: list[dict[str, Any]],
    compatibility: dict[str, Any],
    requirements: dict[str, Any],
    secrets_required: list[dict[str, str]],
    reauth: list[dict[str, str]],
    rebuild: list[dict[str, str]],
    objects_dir_files: dict[str, bytes] | None = None,
    adapter_versions: dict[str, str] | None = None,
    object_file_map: dict[str, list[str]] | None = None,
) -> Path:
    """Write a fully-formed, closed-world ACB at ``bundle_root`` atomically.

    Staging & Atomic Swap with Rollback Protection (audit P1-7):
    1. Writes all JSON payloads, object files, and checksums to a temporary staging directory
       on the same filesystem.
    2. Performs byte-level secret scanning and path containment checks during staging.
    3. Runs verify_bundle() on the staged bundle.
    4. Upon successful verification, atomically replaces staging into bundle_root via backup/rename.
    5. If any error occurs during write, verification, or replace, rolls back cleanly.
    """
    bundle_root = bundle_root.resolve()
    parent_dir = bundle_root.parent
    parent_dir.mkdir(parents=True, exist_ok=True)

    staging_dir = Path(tempfile.mkdtemp(prefix=f".tmp_{bundle_root.name}_", dir=parent_dir))
    backup_dir: Path | None = None
    try:
        objects_root = staging_dir / ACB_OBJECTS_DIR
        objects_root.mkdir(parents=True, exist_ok=True)

        # Sanitize inventory for portable bundle
        portable_inventory = sanitize_inventory_for_bundle(inventory_rows)

        # Build 1:1 object-to-file mapping for manifest with rich metadata
        enriched_manifest_objects = []
        for obj in manifest.objects:
            enriched = enrich_manifest_object(
                obj, objects_dir_files, adapter_versions, object_file_map
            )
            enriched_manifest_objects.append(enriched)

        manifest_payload = manifest.to_dict()
        manifest_payload["objects"] = enriched_manifest_objects

        json_payloads: dict[str, dict[str, Any]] = {
            ACB_MANIFEST_NAME: manifest_payload,
            ACB_INVENTORY_NAME: {"rows": portable_inventory},
            ACB_COMPATIBILITY_NAME: compatibility,
            ACB_REQUIREMENTS_NAME: requirements,
            ACB_SECRETS_NAME: {"items": secrets_required},
            ACB_REAUTH_NAME: {"items": reauth},
            ACB_REBUILD_NAME: {"items": rebuild},
        }
        for name, payload in json_payloads.items():
            assert_no_lateral_secrets(payload)
            (staging_dir / name).write_text(
                json.dumps(payload, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )

        # Verify and write raw object files with byte-level scanning
        total_bytes = 0
        file_count = 0
        if objects_dir_files:
            for relative, data in sorted(objects_dir_files.items()):
                file_count += 1
                total_bytes += len(data)
                if file_count > MAX_BUNDLE_FILES:
                    raise ACBError(f"bundle file count exceeded limit ({MAX_BUNDLE_FILES})")
                if len(data) > MAX_FILE_SIZE:
                    raise ACBError(f"file size exceeded limit ({MAX_FILE_SIZE} bytes): {relative}")
                if total_bytes > MAX_TOTAL_SIZE:
                    raise ACBError(f"bundle total size exceeded limit ({MAX_TOTAL_SIZE} bytes)")

                # Strict byte-level secret and binary scan
                scan_object_bytes(data, relative)

                # Strict path containment check
                target = validate_path_containment(relative, objects_root)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)

        # Post-write directory-wide secret scan
        for p in staging_dir.rglob("*"):
            if p.is_file() and p.name != ACB_CHECKSUMS_NAME:
                scan_object_bytes(p.read_bytes(), str(p.relative_to(staging_dir)))

        # Compute checksums for all written files
        checksums: dict[str, str] = {}
        for name in ACB_JSON_FILES:
            checksums[name] = sha256_file(staging_dir / name)
        for relative_path in sorted((objects_dir_files or {}).keys()):
            norm_path = Path(relative_path).as_posix()
            checksums[f"{ACB_OBJECTS_DIR}/{norm_path}"] = sha256_file(
                objects_root / norm_path
            )
        (staging_dir / ACB_CHECKSUMS_NAME).write_text(
            json.dumps(checksums, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

        # Validate staging directory before atomic replace
        verify_errors = verify_bundle(staging_dir)
        if verify_errors:
            raise ACBIntegrityError(f"staged bundle failed verification: {verify_errors}")

        # Atomic replace with rollback protection (audit P1-7)
        if bundle_root.exists():
            backup_dir = Path(tempfile.mkdtemp(prefix=f".bak_{bundle_root.name}_", dir=parent_dir))
            backup_target = backup_dir / "old_bundle"
            bundle_root.rename(backup_target)

        try:
            staging_dir.rename(bundle_root)
            if backup_dir and backup_dir.exists():
                shutil.rmtree(backup_dir, ignore_errors=True)
        except Exception:
            # If staging rename failed, restore the previous bundle from backup
            if backup_dir and (backup_dir / "old_bundle").exists() and not bundle_root.exists():
                (backup_dir / "old_bundle").rename(bundle_root)
                shutil.rmtree(backup_dir, ignore_errors=True)
            raise

        return bundle_root

    except Exception:
        if staging_dir.exists():
            shutil.rmtree(staging_dir, ignore_errors=True)
        raise


def collect_source_objects(
    registry: Any,
    rows: list[dict[str, Any]],
    *,
    home: Path | None = None,
    workspace: Path | None = None,
    source_product: str | None = None,
    source_profile: str | None = None,
    allowed_scopes: set[str] | None = None,
    allowed_object_types: set[str] | None = None,
    plan_items: list[dict[str, Any]] | None = None,
) -> tuple[dict[str, bytes], dict[str, int], dict[str, list[str]]]:
    """Walk plan items and copy source files into stable paths under ``objects/``.

    Audit P1-1 (0.8.27): primary iteration is over plan_items. Each
    selected PlanItem is processed by reading ``item.source.resolved_path``
    directly; inventory rows are consulted only as a metadata lookup for
    fields plan_items do not carry (canonical_path, source_format, storage,
    policy). This eliminates the previous "row-driven" path that silently
    widened a single Instructions plan item to every Instructions row in
    the same profile/scope, and that overwrote canonical/compatibility
    conflicts at the same bundle-relative path.

    Audit P1-2 (0.8.27): each portable object outcome is tracked in
    ``summary`` with explicit statuses:
    - captured           - bytes written under objects/
    - manual_rebuild     - plan status=manual-rebuild (no source to extract)
    - excluded_by_policy - forbidden policy, scope, or object type
    - parse_failed       - source path missing, unreadable, or parse error
    - secret_rejected    - sensitive filename or secret scan hit
    - conflict           - same bundle-relative path mapped from multiple sources

    Audit P0-2: returns explicit 1:1 ``object_file_map`` tracking which
    files under ``objects/`` belong to each (object_type, product, profile, scope).

    Strict Allowlist (audit P0-2 & 0.8.25):
    - Refuses forbidden policies (forbidden-regenerate, never-migrate, source-only, etc.)
    - Refuses non-migratable types (generated_memory, session, chat, runtime, database, trust, etc.)
    - Only collects requested scopes and requested object types

    Returns ``(objects, summary, object_file_map)``.
    """
    objects: dict[str, bytes] = {}
    object_file_map: dict[str, list[str]] = {}
    summary: dict[str, int] = {
        "captured": 0,
        "manual_rebuild": 0,
        "excluded_by_policy": 0,
        "parse_failed": 0,
        "secret_rejected": 0,
        "conflict": 0,
    }
    # Audit P1-1: detect alias / canonical-vs-compatibility conflicts where
    # two distinct sources collapse to the same bundle-relative path.
    seen_relative_sources: dict[str, set[str]] = {}

    def _record(status: str) -> None:
        summary[status] = summary.get(status, 0) + 1

    # Build (product, profile, object_type, scope) -> inventory row index.
    # Plan items don't carry storage/format/policy, so rows remain the
    # canonical metadata source for those fields.
    row_index: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for row in rows:
        key = (
            row.get("product", ""),
            row.get("profile", ""),
            row.get("object_type", ""),
            row.get("scope", ""),
        )
        row_index.setdefault(key, row)

    def _process_plan_item(item: dict[str, Any]) -> None:
        src = item.get("source") or {}
        obj_type = item.get("object_type") or ""
        prod = src.get("product") or ""
        prof = src.get("profile") or ""
        scope = src.get("scope") or ""
        resolved_path = src.get("resolved_path")
        item_status = item.get("status") or ""

        obj_key = f"{obj_type}/{prod}/{prof}/{scope}"

        # source_product / source_profile are passed only in single-source
        # mode. In all-installed mode they are None, so this is a no-op.
        if source_product and prod != source_product:
            return
        if source_profile and prof != source_profile:
            return

        if allowed_object_types is not None and obj_type not in allowed_object_types:
            _record("excluded_by_policy")
            return
        if allowed_scopes is not None and scope not in allowed_scopes:
            _record("excluded_by_policy")
            return
        if item_status == "manual-rebuild":
            _record("manual_rebuild")
            return

        row = row_index.get((prod, prof, obj_type, scope)) or {}
        policy = row.get("policy") or ""
        if policy in FORBIDDEN_SNAPSHOT_POLICIES:
            _record("excluded_by_policy")
            return
        if obj_type in FORBIDDEN_SNAPSHOT_OBJECT_TYPES:
            _record("excluded_by_policy")
            return

        if not resolved_path:
            _record("parse_failed")
            return
        source_path = Path(resolved_path)
        if not source_path.exists() or source_path.is_symlink():
            _record("parse_failed")
            return

        canonical = row.get("canonical_path") or source_path.name
        relative = _path_for_object(obj_type, prod, prof, scope, canonical)

        storage = row.get("storage") or ""
        format_name = row.get("source_format") or row.get("format") or ""

        # Conflict detection (audit P1-1): two distinct sources collapsing
        # to the same bundle-relative path is recorded as a conflict rather
        # than silently overwriting the first write.
        source_id = f"{prod}/{prof}/{obj_type}/{scope}@{resolved_path}"
        seen = seen_relative_sources.setdefault(relative, set())
        if seen and source_id not in seen:
            _record("conflict")
            return
        seen.add(source_id)

        if _SENSITIVE_FILENAME_HINT.search(source_path.name):
            _record("secret_rejected")
            return

        try:
            if source_path.is_file():
                if obj_type == "mcp" or storage == "config-subobject":
                    if obj_type == "mcp":
                        # MCP objects never travel as raw bytes (clawscan
                        # 0.8.30): shared host settings files such as
                        # ~/.gemini/settings.json or ~/.claude.json carry
                        # sibling state the skill promises not to copy.
                        # Extract only the authorized servers subobject;
                        # an undecodable document is a policy exclusion,
                        # never a raw-copy fallback.
                        from migration_core import parse_mcp_document, emit_mcp_document
                        try:
                            raw_text = source_path.read_text(encoding="utf-8")
                            servers = parse_mcp_document(raw_text, format_name)
                        except ValueError:
                            _record("excluded_by_policy")
                            return
                        emitted_text, _ = emit_mcp_document(servers, format_name)
                        objects[relative] = emitted_text.encode("utf-8")
                        object_file_map.setdefault(obj_key, []).append(relative)
                    elif obj_type == "instructions":
                        from migration_core import parse_instruction, emit_instruction
                        raw_text = source_path.read_text(encoding="utf-8")
                        instruction = parse_instruction(raw_text, format_name, scope, storage)
                        emitted_text, _ = emit_instruction(instruction, format_name)
                        objects[relative] = emitted_text.encode("utf-8")
                        object_file_map.setdefault(obj_key, []).append(relative)
                    else:
                        # Refuse to copy raw host config files for unsupported
                        # subobject types. Audit P1-2: this is an explicit
                        # policy exclusion, not a silent skip.
                        _record("excluded_by_policy")
                        return
                else:
                    objects[relative] = source_path.read_bytes()
                    object_file_map.setdefault(obj_key, []).append(relative)
            elif source_path.is_dir():
                start_keys = set(objects.keys())
                _collect_tree(source_path, relative, objects, depth=0)
                new_keys = set(objects.keys()) - start_keys
                object_file_map.setdefault(obj_key, []).extend(sorted(new_keys))
            else:
                _record("parse_failed")
                return
        except ACBSecretLeak:
            _record("secret_rejected")
            return
        except Exception as error:
            # Audit P1-2: surface parse failures; do not silently skip a
            # requested portable object. The summary records parse_failed, and
            # we re-raise so run_snapshot can decide whether to fail the
            # snapshot rather than emit a "successful" bundle with missing
            # data.
            _record("parse_failed")
            raise ACBError(
                f"snapshot parse failed for portable object {relative}: {error}"
            ) from error

        _record("captured")

    def _process_inventory_row(row: dict[str, Any]) -> None:
        """Legacy path used only when plan_items is None (single-source mode)."""
        if not row.get("exists"):
            return
        if source_product and row.get("product") != source_product:
            return
        if source_profile and row.get("profile") != source_profile:
            return

        object_type = row.get("object_type") or ""
        if not object_type:
            return
        policy = row.get("policy") or ""
        scope = row.get("scope") or "unknown"
        product = row.get("product") or ""
        profile = row.get("profile") or "default"

        obj_key = f"{object_type}/{product}/{profile}/{scope}"

        if policy in FORBIDDEN_SNAPSHOT_POLICIES:
            _record("excluded_by_policy")
            return
        if object_type in FORBIDDEN_SNAPSHOT_OBJECT_TYPES:
            _record("excluded_by_policy")
            return
        if allowed_scopes is not None and scope not in allowed_scopes:
            _record("excluded_by_policy")
            return
        if allowed_object_types is not None and object_type not in allowed_object_types:
            _record("excluded_by_policy")
            return

        resolved = row.get("resolved_path")
        if not isinstance(resolved, str):
            _record("parse_failed")
            return
        source_path = Path(resolved)
        if not source_path.exists() or source_path.is_symlink():
            _record("parse_failed")
            return

        canonical = row.get("canonical_path") or source_path.name
        relative = _path_for_object(object_type, product, profile, scope, canonical)

        storage = row.get("storage") or ""
        format_name = row.get("source_format") or row.get("format") or ""

        try:
            if source_path.is_file():
                if _SENSITIVE_FILENAME_HINT.search(source_path.name):
                    _record("secret_rejected")
                    return
                if object_type == "mcp" or storage == "config-subobject":
                    if object_type == "mcp":
                        # Same subobject-only contract as the plan-item
                        # path: shared host settings files must never be
                        # bundled as raw bytes.
                        from migration_core import parse_mcp_document, emit_mcp_document
                        try:
                            raw_text = source_path.read_text(encoding="utf-8")
                            servers = parse_mcp_document(raw_text, format_name)
                        except ValueError:
                            _record("excluded_by_policy")
                            return
                        emitted_text, _ = emit_mcp_document(servers, format_name)
                        objects[relative] = emitted_text.encode("utf-8")
                        object_file_map.setdefault(obj_key, []).append(relative)
                    elif object_type == "instructions":
                        from migration_core import parse_instruction, emit_instruction
                        raw_text = source_path.read_text(encoding="utf-8")
                        instruction = parse_instruction(raw_text, format_name, scope, storage)
                        emitted_text, _ = emit_instruction(instruction, format_name)
                        objects[relative] = emitted_text.encode("utf-8")
                        object_file_map.setdefault(obj_key, []).append(relative)
                    else:
                        _record("excluded_by_policy")
                        return
                else:
                    objects[relative] = source_path.read_bytes()
                    object_file_map.setdefault(obj_key, []).append(relative)
            elif source_path.is_dir():
                start_keys = set(objects.keys())
                _collect_tree(source_path, relative, objects, depth=0)
                new_keys = set(objects.keys()) - start_keys
                object_file_map.setdefault(obj_key, []).extend(sorted(new_keys))
            else:
                _record("parse_failed")
                return
        except ACBSecretLeak:
            _record("secret_rejected")
            return
        except Exception as error:
            _record("parse_failed")
            raise ACBError(
                f"snapshot parse failed for {relative}: {error}"
            ) from error
        _record("captured")

    if plan_items is not None:
        for item in plan_items:
            _process_plan_item(item)
    else:
        for row in rows:
            _process_inventory_row(row)

    return objects, summary, object_file_map


def _collect_tree(dir_path: Path, prefix: str, out: dict[str, bytes], depth: int = 0) -> None:
    if depth > MAX_DIR_DEPTH:
        return
    for item in sorted(dir_path.iterdir()):
        if item.is_symlink():
            continue
        if _SENSITIVE_FILENAME_HINT.search(item.name):
            continue
        rel = f"{prefix}/{item.name}"
        if item.is_file():
            out[rel] = item.read_bytes()
        elif item.is_dir():
            _collect_tree(item, rel, out, depth + 1)


def _path_for_object(
    object_type: str, product: str, profile: str, scope: str, canonical: str
) -> str:
    """Build a sanitized stable relative path under ``objects/``."""
    safe_canonical = canonical.strip("/\\").replace("~", "home").replace("..", "_")
    safe_canonical = re.sub(r"[/\\:]+", "/", safe_canonical)
    return f"{object_type}/{product}/{profile}/{scope}/{safe_canonical}"


def restore_bundle_objects(
    bundle_root: Path,
    destination_root: Path,
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Extract files from ``bundle/objects/`` safely into destination tree."""
    bundle_root = bundle_root.resolve()
    destination_root = destination_root.resolve()
    objects_root = bundle_root / ACB_OBJECTS_DIR
    if not objects_root.is_dir():
        raise ACBError(f"bundle has no objects/ directory: {bundle_root}")
    written: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []
    for source in sorted(objects_root.rglob("*")):
        if not source.is_file() or source.is_symlink():
            continue
        relative = source.relative_to(objects_root).as_posix()
        try:
            target = validate_path_containment(relative, destination_root)
            if target.is_symlink():
                raise ACBIntegrityError(f"target path is a symlink: {target}")
        except ACBIntegrityError as error:
            skipped.append({"path": relative, "reason": str(error)})
            continue

        try:
            data = source.read_bytes()
            scan_object_bytes(data, relative)
        except ACBSecretLeak as error:
            skipped.append({"path": relative, "reason": str(error)})
            continue

        if not dry_run:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        written.append(
            {
                "path": relative,
                "sha256": sha256_file(source),
                "size": source.stat().st_size,
            }
        )
    return {
        "bundle": str(bundle_root),
        "destination": str(destination_root),
        "written": written,
        "skipped": skipped,
        "dry_run": dry_run,
    }


def verify_bundle(bundle_root: Path) -> list[str]:
    """Perform closed-world verification of ACB bundle integrity."""
    bundle_root = bundle_root.resolve()
    if not bundle_root.is_dir():
        return [f"bundle directory not found: {bundle_root}"]

    checksums_path = bundle_root / ACB_CHECKSUMS_NAME
    if not checksums_path.is_file() or checksums_path.is_symlink():
        return [f"missing or invalid {ACB_CHECKSUMS_NAME}"]

    try:
        checksums = json.loads(checksums_path.read_text(encoding="utf-8"))
    except Exception as error:
        return [f"corrupted {ACB_CHECKSUMS_NAME}: {error}"]

    errors: list[str] = []

    # 1. Closed-world file enumeration: actual files == expected files
    expected_files = set(checksums.keys())
    actual_files: set[str] = set()

    for path in sorted(bundle_root.rglob("*")):
        # Reject non-regular files: symlinks, sockets, FIFOs, devices
        st = path.lstat()
        if stat.S_ISLNK(st.st_mode) or stat.S_ISFIFO(st.st_mode) or stat.S_ISSOCK(st.st_mode) or stat.S_ISCHR(st.st_mode) or stat.S_ISBLK(st.st_mode):
            errors.append(f"illegal non-regular file in bundle: {path.relative_to(bundle_root).as_posix()}")
            continue
        if path.is_file():
            rel_posix = path.relative_to(bundle_root).as_posix()
            if rel_posix not in (ACB_CHECKSUMS_NAME, ACB_SIGNATURE_NAME):
                actual_files.add(rel_posix)

    extra_files = actual_files - expected_files
    if extra_files:
        for extra in sorted(extra_files):
            errors.append(f"unexpected extra file in bundle: {extra}")

    missing_files = expected_files - actual_files
    if missing_files:
        for missing in sorted(missing_files):
            errors.append(f"missing file: {missing}")

    # 2. Checksum validation for all listed files
    for relative, expected in sorted(checksums.items()):
        target = bundle_root / relative
        if target.is_file() and not target.is_symlink():
            actual = sha256_file(target)
            if actual != expected:
                errors.append(f"checksum mismatch: {relative}")

    # 3. Validate JSON schemas & secret scans
    for json_name in ACB_JSON_FILES:
        target = bundle_root / json_name
        if target.is_file():
            try:
                payload = json.loads(target.read_text(encoding="utf-8"))
                assert_no_lateral_secrets(payload)
            except Exception as error:
                errors.append(f"invalid JSON payload in {json_name}: {error}")

    # 3b. Re-scan every stored object with the same strict secret/binary
    # scanner used at write time (audit #7). A bundle that passed write-time
    # scanning but was later tampered (or supplied by an untrusted source)
    # must still be rejected at verify time. We also re-apply the
    # resource safety limits (file count, per-file size, total size, depth).
    objects_root = bundle_root / ACB_OBJECTS_DIR
    if not objects_root.is_dir():
        errors.append(f"bundle has no {ACB_OBJECTS_DIR}/ directory")
    else:
        total_object_bytes = 0
        max_depth_seen = 0
        object_count = 0
        for source in sorted(objects_root.rglob("*")):
            if not source.is_file() or source.is_symlink():
                continue
            object_count += 1
            rel = source.relative_to(objects_root).as_posix()
            depth = len(Path(rel).parts)
            max_depth_seen = max(max_depth_seen, depth)
            if object_count > MAX_BUNDLE_FILES:
                errors.append(
                    f"object file count exceeded limit ({MAX_BUNDLE_FILES}): {rel}"
                )
                break
            try:
                data = source.read_bytes()
            except Exception as error:
                errors.append(f"cannot read object {rel}: {error}")
                continue
            if len(data) > MAX_FILE_SIZE:
                errors.append(
                    f"object size exceeded limit ({MAX_FILE_SIZE} bytes): {rel}"
                )
            total_object_bytes += len(data)
            try:
                scan_object_bytes(data, rel)
            except ACBSecretLeak as error:
                errors.append(f"secret/binary violation in object {rel}: {error}")
        if max_depth_seen > MAX_DIR_DEPTH:
            errors.append(
                f"object directory depth exceeded limit ({MAX_DIR_DEPTH}): {max_depth_seen}"
            )
        if total_object_bytes > MAX_TOTAL_SIZE:
            errors.append(
                f"object total size exceeded limit ({MAX_TOTAL_SIZE} bytes)"
            )

    # 4. Closed-world 1:1 Manifest-to-Objects verification
    manifest_path = bundle_root / ACB_MANIFEST_NAME
    if manifest_path.is_file() and not manifest_path.is_symlink():
        try:
            manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
            declared_objects = manifest_data.get("objects", [])
            manifest_files: set[str] = set()
            file_claimants: dict[str, list[str]] = {}
            for obj in declared_objects:
                obj_path = obj.get("object_path") or f"{obj.get('object_type')}/{obj.get('product')}/{obj.get('profile')}/{obj.get('scope')}"
                obj_status = obj.get("status", "")
                obj_files = obj.get("files", [])
                if obj_status in {"ready", "ready-lossy"} and not obj_files:
                    errors.append(f"manifest object {obj_path} ({obj_status}) declares no files")
                for file_entry in obj_files:
                    rel_p = file_entry.get("path", "")
                    if rel_p:
                        manifest_files.add(rel_p)
                        file_claimants.setdefault(rel_p, []).append(obj_path)
                        expected_sha = file_entry.get("sha256")
                        disk_p = bundle_root / rel_p
                        if not disk_p.is_file():
                            errors.append(f"manifest declared file missing on disk: {rel_p}")
                        elif expected_sha:
                            actual_sha = sha256_file(disk_p)
                            if actual_sha != expected_sha:
                                errors.append(
                                    f"manifest file sha256 mismatch for {rel_p}: expected {expected_sha}, got {actual_sha}"
                                )

            # Enforce 1:1: Each file must be claimed by at most one object
            for rel_p, claimants in file_claimants.items():
                if len(claimants) > 1:
                    errors.append(
                        f"manifest file {rel_p} claimed by multiple objects: {claimants}"
                    )

            # If manifest declared specific object files, ensure no undeclared files exist in objects/
            objects_root = bundle_root / ACB_OBJECTS_DIR
            if objects_root.is_dir() and manifest_files:
                for disk_file in sorted(objects_root.rglob("*")):
                    if disk_file.is_file():
                        rel = f"{ACB_OBJECTS_DIR}/{disk_file.relative_to(objects_root).as_posix()}"
                        if rel not in manifest_files:
                            errors.append(f"unclaimed file in objects directory not declared in manifest: {rel}")
        except Exception as error:
            errors.append(f"manifest verification error: {error}")

    return errors


# Audit P1-5 (0.8.27): Ed25519 over `checksums.json`. cryptography is
# lazy-imported so snapshot / restore work without it; sign / verify
# fail fast with a clear message if it is missing.
ACB_SIGNATURE_NAME = "signature.json"
ACB_SIGNATURE_SCHEMA_VERSION = 2
_ED25519_KEY_BYTES = 32


def _read_signing_key(key_path: Path) -> bytes:
    if not key_path.is_file():
        raise ACBError(f"signing key not found: {key_path}")
    # Refuse group/world bits: a leaked signing key is a leaked bundle.
    if stat.S_IMODE(key_path.stat().st_mode) & 0o077:
        raise ACBError(
            f"signing key {key_path} is group/world accessible; chmod 600 before use"
        )
    raw = key_path.read_bytes()
    if len(raw) != _ED25519_KEY_BYTES:
        raise ACBError(
            f"signing key must be {_ED25519_KEY_BYTES} raw bytes; got {len(raw)}"
        )
    return raw


def _load_public_key(key_path: Path) -> bytes:
    if not key_path.is_file():
        raise ACBError(f"public key not found: {key_path}")
    # Public keys are non-secret but we still refuse symlinks so the
    # caller can rely on the path being the actual file.
    if key_path.is_symlink():
        raise ACBError(f"public key path is a symlink: {key_path}")
    raw = key_path.read_bytes()
    if len(raw) != _ED25519_KEY_BYTES:
        raise ACBError(
            f"public key must be {_ED25519_KEY_BYTES} raw bytes; got {len(raw)}"
        )
    return raw


def _ensure_cryptography() -> tuple[Any, Any, Any]:
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import (
            Ed25519PrivateKey,
            Ed25519PublicKey,
        )
        from cryptography.hazmat.primitives import serialization
    except ImportError as error:
        raise ACBError(
            "Ed25519 signing requires the 'cryptography' package. "
            "Install with: pip install cryptography"
        ) from error
    return Ed25519PrivateKey, Ed25519PublicKey, serialization


def _build_signature_document(
    public_key: Any,
    private_key: Any,
    payload: bytes,
    signer: str,
) -> dict[str, Any]:
    from cryptography.hazmat.primitives import serialization
    public_bytes = public_key.public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw,
    )
    return {
        "schema_version": ACB_SIGNATURE_SCHEMA_VERSION,
        "algorithm": "ed25519",
        "signer": signer,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "checksum_algorithm": "sha256",
        "bundle_hash": sha256_bytes(payload),
        "public_key": base64.b64encode(public_bytes).decode("ascii"),
        "public_key_fingerprint": sha256_bytes(public_bytes)[:16],
        "signature": base64.b64encode(private_key.sign(payload)).decode("ascii"),
    }


def _load_signature_artifact(
    bundle_root: Path,
) -> tuple[dict[str, Any] | None, bytes, list[str]]:
    sig_path = bundle_root / ACB_SIGNATURE_NAME
    checksums_path = bundle_root / ACB_CHECKSUMS_NAME
    errors: list[str] = []
    if not sig_path.is_file():
        return None, checksums_path, [f"missing signature: {sig_path}"]
    if not checksums_path.is_file():
        return None, checksums_path, [f"missing {ACB_CHECKSUMS_NAME}"]
    try:
        return json.loads(sig_path.read_text(encoding="utf-8")), checksums_path.read_bytes(), errors
    except Exception as error:
        return None, checksums_path, [f"corrupted signature.json: {error}"]


def _check_signature_metadata(
    sig_doc: dict[str, Any],
    payload: bytes,
) -> list[str]:
    errors: list[str] = []
    if sig_doc.get("algorithm") != "ed25519":
        errors.append(
            f"unsupported signature algorithm: {sig_doc.get('algorithm')!r} "
            "(expected 'ed25519')"
        )
    if sig_doc.get("schema_version") != ACB_SIGNATURE_SCHEMA_VERSION:
        errors.append(
            f"unsupported signature schema_version: {sig_doc.get('schema_version')!r} "
            f"(expected {ACB_SIGNATURE_SCHEMA_VERSION})"
        )
    if sig_doc.get("bundle_hash") != sha256_bytes(payload):
        errors.append(
            f"bundle_hash mismatch: signature={sig_doc.get('bundle_hash')} "
            f"actual={sha256_bytes(payload)}"
        )
    return errors


def _decode_signature_fields(sig_doc: dict[str, Any]) -> tuple[bytes, bytes] | list[str]:
    sig_b64 = sig_doc.get("signature")
    pub_b64 = sig_doc.get("public_key")
    if not isinstance(sig_b64, str) or not isinstance(pub_b64, str):
        return ["signature.json missing signature/public_key fields"]
    try:
        return base64.b64decode(sig_b64, validate=True), base64.b64decode(pub_b64, validate=True)
    except Exception as error:
        return [f"signature.json fields are not valid base64: {error}"]


def _verify_signature_payload(
    public_key: Any,
    signature: bytes,
    payload: bytes,
) -> list[str]:
    try:
        public_key.verify(signature, payload)
    except Exception as error:
        return [f"signature verification failed: {error}"]
    return []


def sign_bundle(bundle_root: Path, key_path: Path, signer: str) -> Path:
    Ed25519PrivateKey, _, _ = _ensure_cryptography()
    bundle_root = bundle_root.resolve()
    checksums_path = bundle_root / ACB_CHECKSUMS_NAME
    if not checksums_path.is_file():
        raise ACBError(f"cannot sign: {checksums_path} missing")
    private_key = Ed25519PrivateKey.from_private_bytes(_read_signing_key(key_path))
    payload = checksums_path.read_bytes()
    signature_doc = _build_signature_document(
        private_key.public_key(),
        private_key,
        payload,
        signer,
    )
    sig_path = bundle_root / ACB_SIGNATURE_NAME
    sig_path.write_text(
        json.dumps(signature_doc, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return sig_path


def verify_bundle_signature(bundle_root: Path, key_path: Path) -> list[str]:
    _, Ed25519PublicKeyClass, _ = _ensure_cryptography()
    bundle_root = bundle_root.resolve()
    sig_doc, payload, load_errors = _load_signature_artifact(bundle_root)
    if load_errors:
        return load_errors
    assert sig_doc is not None
    errors = _check_signature_metadata(sig_doc, payload)
    decoded = _decode_signature_fields(sig_doc)
    if isinstance(decoded, list):
        return errors + decoded
    signature, signature_public_key = decoded
    try:
        trusted_public_key = _load_public_key(key_path)
    except ACBError as error:
        return errors + [str(error)]
    if signature_public_key != trusted_public_key:
        errors.append(
            "public key in signature.json does not match trusted_key "
            f"(fingerprint mismatch: signature={sha256_bytes(signature_public_key)[:16]} "
            f"trusted={sha256_bytes(trusted_public_key)[:16]})"
        )
    return errors + _verify_signature_payload(
        Ed25519PublicKeyClass.from_public_bytes(trusted_public_key),
        signature,
        payload,
    )


class BundleSurfaceProvider:
    """Provides virtual surface items and content from verified bundle objects."""

    def __init__(self, bundle_root: Path):
        self.bundle_root = bundle_root.resolve()
        self.objects_root = self.bundle_root / ACB_OBJECTS_DIR
        self.manifest = load_manifest(self.bundle_root)

    def get_object_tree(self, object_type: str, product: str, profile: str, scope: str) -> list[Path]:
        """Find all files belonging to a specific surface object in the bundle."""
        target_dir = self.objects_root / object_type / product / profile / scope
        if not target_dir.is_dir():
            return []
        return sorted(p for p in target_dir.rglob("*") if p.is_file())


def load_manifest(bundle_root: Path) -> ACBManifest:
    bundle_root = bundle_root.resolve()
    return ACBManifest.from_dict(
        json.loads((bundle_root / ACB_MANIFEST_NAME).read_text(encoding="utf-8"))
    )


def make_bundle_id(timestamp: datetime | None = None) -> str:
    timestamp = timestamp or datetime.now(timezone.utc)
    return f"acb-{timestamp.strftime('%Y%m%dT%H%M%SZ')}"
