#!/usr/bin/env python3
"""
Cowork Plugin Converter
Converts a GitHub Copilot CLI / Claude Code plugin to a Microsoft 365 Cowork package.
"""

import argparse
import json
import os
import re
import shutil
import struct
import sys
import uuid
import zipfile
import zlib
from pathlib import Path

# ── Helpers ──────────────────────────────────────────────────────────────────

KEBAB_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
FIELD_RE = re.compile(r"^(\w[\w-]*):\s*(.+)$", re.MULTILINE)

UNSAFE_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    *[f"COM{i}" for i in range(1, 10)],
    *[f"LPT{i}" for i in range(1, 10)],
}


def parse_frontmatter(text: str) -> dict:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}
    block = m.group(1)
    fields: dict = {}
    # Handle multi-line values (yaml block scalars): naive single-key extraction
    for key, val in FIELD_RE.findall(block):
        fields[key] = val.strip().strip('"').strip("'")
    return fields


def validate_name(name: str) -> list[str]:
    errors = []
    if not name:
        errors.append("'name' field is missing")
        return errors
    if not KEBAB_RE.match(name):
        errors.append(f"'name' field '{name}' is not valid kebab-case")
    if len(name) > 64:
        errors.append(f"'name' field '{name}' exceeds 64 characters")
    return errors


def validate_description(desc: str) -> list[str]:
    if not desc:
        return ["'description' field is missing"]
    if len(desc) > 1024:
        return [f"'description' field exceeds 1024 characters ({len(desc)} chars)"]
    return []


def companion_file_ok(path: Path) -> tuple[bool, str]:
    name = path.name
    if name.startswith("."):
        return False, f"hidden file: {name}"
    if name.upper() in UNSAFE_NAMES:
        return False, f"Windows reserved name: {name}"
    if ".." in path.parts:
        return False, f"path traversal: {path}"
    return True, ""


def generate_placeholder_icon(size: int, color_hex: str = "#0078D4") -> bytes:
    """Generate a minimal solid-color PNG."""
    r = int(color_hex[1:3], 16)
    g = int(color_hex[3:5], 16)
    b = int(color_hex[5:7], 16)

    def chunk(name: bytes, data: bytes) -> bytes:
        c = struct.pack(">I", len(data)) + name + data
        crc = zlib.crc32(name + data) & 0xFFFFFFFF
        return c + struct.pack(">I", crc)

    # IHDR
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    # IDAT: one row per line, filter byte 0 + RGB per pixel
    raw = (bytes([0]) + bytes([r, g, b] * size)) * size
    compressed = zlib.compress(raw, 9)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", compressed)
    png += chunk(b"IEND", b"")
    return png


def discover_skills(source: Path) -> list[Path]:
    """
    Return a list of skill folders (each containing SKILL.md).
    Supports:
      - source/skills/<name>/SKILL.md  (Copilot CLI / Claude plugin)
      - source/<name>/SKILL.md         (bare skills dir)
    """
    candidates: list[Path] = []

    skills_dir = source / "skills"
    if skills_dir.is_dir():
        for d in sorted(skills_dir.iterdir()):
            if d.is_dir() and (d / "SKILL.md").exists():
                candidates.append(d)
        if candidates:
            return candidates

    # Bare structure: SKILL.md directly in sub-dirs
    for d in sorted(source.iterdir()):
        if d.is_dir() and (d / "SKILL.md").exists():
            candidates.append(d)

    return candidates


def find_shared_references(source: Path) -> list[Path]:
    """Collect reference files at source root or source/references/."""
    refs: list[Path] = []
    ref_dir = source / "references"
    if ref_dir.is_dir():
        refs.extend(sorted(ref_dir.glob("*.md")))
    # Top-level .md files that aren't SKILL.md or README-like
    for f in sorted(source.glob("*.md")):
        if f.name.upper() not in {"README.MD", "SKILL.MD", "CHANGELOG.MD", "LICENSE.MD"}:
            refs.append(f)
    return refs


def skill_links_to(skill_md_text: str, filename: str) -> bool:
    """Return True if the SKILL.md body references the given filename."""
    return filename.lower() in skill_md_text.lower()


def deterministic_uuid(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, name))


# ── Main ─────────────────────────────────────────────────────────────────────

def convert(args: argparse.Namespace) -> int:
    source = Path(args.source).expanduser().resolve()
    if not source.is_dir():
        print(f"ERROR: source directory not found: {source}", file=sys.stderr)
        return 1

    plugin_slug = re.sub(r"[^a-z0-9-]", "-", args.name_short.lower()).strip("-")
    output_root = Path(args.output).expanduser().resolve() if args.output else source.parent
    out = output_root / f"{plugin_slug}-cowork"

    if out.exists():
        print(f"Output directory already exists: {out}")
        print("Remove it first or choose a different output path.")
        return 1

    out.mkdir(parents=True)
    skills_out = out / "skills"
    skills_out.mkdir()

    # ── Discover skills ───────────────────────────────────────────────────────
    skill_folders = discover_skills(source)
    if not skill_folders:
        print("ERROR: No skills found (looking for SKILL.md in sub-directories).", file=sys.stderr)
        return 1

    shared_refs = find_shared_references(source)

    # ── Process skills ────────────────────────────────────────────────────────
    agent_skills: list[dict] = []
    report_rows: list[tuple] = []
    all_valid = True

    for skill_folder in skill_folders:
        skill_md_path = skill_folder / "SKILL.md"
        skill_text = skill_md_path.read_text(encoding="utf-8")
        fm = parse_frontmatter(skill_text)
        name = fm.get("name", "").strip()
        description = fm.get("description", "").strip()
        folder_name = skill_folder.name

        errors = []
        errors.extend(validate_name(name))
        errors.extend(validate_description(description))

        if name and name != folder_name:
            errors.append(f"folder '{folder_name}' does not match name '{name}'")

        # Use folder name as canonical name if missing
        canonical = name or folder_name

        dest_skill = skills_out / canonical
        dest_skill.mkdir()

        # Copy SKILL.md
        shutil.copy2(skill_md_path, dest_skill / "SKILL.md")

        # Copy all companion files from skill folder (excluding SKILL.md)
        companion_count = 0
        companion_total_size = 0

        for item in sorted(skill_folder.rglob("*")):
            if item == skill_md_path or not item.is_file():
                continue
            rel = item.relative_to(skill_folder)
            ok, reason = companion_file_ok(rel)
            if not ok:
                print(f"  SKIP {rel}: {reason}")
                continue
            dest_file = dest_skill / rel
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest_file)
            size = item.stat().st_size
            companion_count += 1
            companion_total_size += size
            if size > 5 * 1024 * 1024:
                errors.append(f"companion file {rel} exceeds 5 MB")

        # Copy shared references if skill links to them
        refs_dest = dest_skill / "references"
        for ref in shared_refs:
            if skill_links_to(skill_text, ref.name):
                refs_dest.mkdir(exist_ok=True)
                dest_ref = refs_dest / ref.name
                if not dest_ref.exists():
                    shutil.copy2(ref, dest_ref)
                    companion_count += 1
                    companion_total_size += ref.stat().st_size

        if companion_count > 20:
            errors.append(f"exceeds 20 companion files ({companion_count})")
        if companion_total_size > 10 * 1024 * 1024:
            errors.append(f"total companion size {companion_total_size // 1024} KB exceeds 10 MB")

        agent_skills.append({"folder": f"./skills/{canonical}"})

        status = "✓" if not errors else "✗ " + "; ".join(errors)
        if errors:
            all_valid = False
        report_rows.append((canonical, status, f"{companion_count}/20", f"{companion_total_size // 1024} KB"))

    # ── Icons ─────────────────────────────────────────────────────────────────
    icon_note = ""

    for filename, size in [("color.png", 192), ("outline.png", 32)]:
        src_icon = source / filename
        dest_icon = out / filename
        if src_icon.exists():
            shutil.copy2(src_icon, dest_icon)
        else:
            placeholder = generate_placeholder_icon(size, args.accent_color)
            dest_icon.write_bytes(placeholder)
            icon_note += f"  ⚠ {filename}: generated placeholder ({size}×{size}). Replace before store submission.\n"

    # ── Manifest ──────────────────────────────────────────────────────────────
    plugin_id = args.app_id or deterministic_uuid(f"cowork.{plugin_slug}")

    manifest = {
        "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.28/MicrosoftTeams.schema.json",
        "manifestVersion": "1.28",
        "version": "1.0.0",
        "id": plugin_id,
        "developer": {
            "name": args.developer_name,
            "websiteUrl": args.website,
            "privacyUrl": args.privacy_url,
            "termsOfUseUrl": args.terms_url,
        },
        "name": {
            "short": args.name_short,
            "full": args.name_full,
        },
        "description": {
            "short": args.description_short,
            "full": args.description_full,
        },
        "icons": {
            "color": "color.png",
            "outline": "outline.png",
        },
        "accentColor": args.accent_color,
        "agentSkills": agent_skills,
    }

    (out / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    # ── ZIP ───────────────────────────────────────────────────────────────────
    zip_path = output_root / f"{plugin_slug}-cowork.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(out.rglob("*")):
            if file.is_file() and not file.name.startswith("."):
                zf.write(file, file.relative_to(out))

    # ── Report ────────────────────────────────────────────────────────────────
    col_w = max(len(r[0]) for r in report_rows) + 2
    print(f"\n{'Skill':<{col_w}}{'Name/folder match':<22}{'Companions':<14}Size")
    print("-" * (col_w + 46))
    for skill, status, companions, size in report_rows:
        print(f"{skill:<{col_w}}{status:<22}{companions:<14}{size}")

    print(f"\nTotal: {len(agent_skills)} skill(s), {'all valid ✓' if all_valid else 'validation errors above ✗'}")
    print(f"\nOutput:  {out}")
    print(f"Package: {zip_path}")

    if icon_note:
        print(f"\nIcon warnings:\n{icon_note.rstrip()}")

    print(f"\nNext — sideload for testing:")
    print(f"  npm install -g @microsoft/m365agentstoolkit-cli")
    print(f"  atk auth login")
    print(f"  atk install --file-path \"{zip_path}\" --scope Personal")

    return 0 if all_valid else 2


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert a Copilot CLI / Claude plugin to a Microsoft 365 Cowork package."
    )
    parser.add_argument("--source", required=True, help="Source plugin directory")
    parser.add_argument("--output", default=None, help="Output directory (default: parent of source)")
    parser.add_argument("--name-short", required=True, help="Short name (≤30 chars)")
    parser.add_argument("--name-full", required=True, help="Full display name")
    parser.add_argument("--description-short", required=True, help="Short description (≤80 chars)")
    parser.add_argument("--description-full", required=True, help="Full description")
    parser.add_argument("--developer-name", default="Unknown", help="Developer name")
    parser.add_argument("--website", default="https://example.com")
    parser.add_argument("--privacy-url", default="https://example.com/privacy")
    parser.add_argument("--terms-url", default="https://example.com/terms")
    parser.add_argument("--accent-color", default="#0078D4")
    parser.add_argument("--app-id", default=None, help="Override auto-generated GUID")
    return convert(parser.parse_args())


if __name__ == "__main__":
    sys.exit(main())
