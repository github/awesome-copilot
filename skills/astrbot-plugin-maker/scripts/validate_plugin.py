#!/usr/bin/env python3
"""Static checks for AstrBot plugin files; no plugin imports or network access.

Requires PyYAML and packaging. This intentionally does not freeze adapter names
or reject new metadata fields. Check those against the target AstrBot release.
"""

import argparse
import ast
import json
import os
import re
from pathlib import Path

import yaml
from packaging.specifiers import InvalidSpecifier, SpecifierSet

REQUIRED_METADATA = ("name", "desc", "version", "author")
IGNORED_DIRS = {".git", ".venv", "venv", "__pycache__", "node_modules"}
CONFIG_TYPES = {
    "string": str,
    "text": str,
    "int": int,
    "float": (int, float),
    "bool": bool,
    "object": dict,
    "dict": dict,
    "list": list,
    "template_list": list,
    "file": list,
}


class UniqueKeyLoader(yaml.SafeLoader):
    """Reject duplicate metadata keys rather than silently accepting the last."""


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if not isinstance(key, str):
            raise ValueError("metadata keys must be strings")
        if key in result:
            raise ValueError(f"duplicate metadata key: {key}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping
)


def check_schema(schema, errors, warnings, prefix="_conf_schema.json"):
    if not isinstance(schema, dict):
        errors.append(
            f"{prefix}: expected an object mapping setting names to definitions"
        )
        return
    for key, definition in schema.items():
        label = f"{prefix}.{key}"
        if not isinstance(definition, dict) or not isinstance(
            definition.get("type"), str
        ):
            errors.append(f"{label}: setting needs a string type")
            continue
        kind = definition["type"]
        if kind not in CONFIG_TYPES:
            warnings.append(
                f"{label}: verify unrecognized type {kind!r} in target AstrBot"
            )
            continue
        if "default" in definition:
            value = definition["default"]
            valid = isinstance(value, CONFIG_TYPES[kind])
            if kind in {"int", "float"} and isinstance(value, bool):
                valid = False
            if not valid:
                errors.append(f"{label}: default does not match type {kind}")
        if kind == "object":
            check_schema(definition.get("items"), errors, warnings, f"{label}.items")
        if kind == "template_list":
            templates = definition.get("templates")
            if not isinstance(templates, dict):
                errors.append(f"{label}: template_list needs a templates object")
            else:
                for name, template in templates.items():
                    items = (
                        template.get("items") if isinstance(template, dict) else None
                    )
                    check_schema(
                        items, errors, warnings, f"{label}.templates.{name}.items"
                    )


def validate_plugin(root: Path, require_repo: bool = False):
    errors, warnings = [], []
    python_count = 0
    if not root.is_dir():
        return [f"Plugin directory does not exist: {root}"], warnings, python_count
    metadata_path = root / "metadata.yaml"
    if not metadata_path.exists():
        metadata_path = root / "metadata.yml"
    try:
        if not metadata_path.is_file():
            raise ValueError("metadata.yaml or metadata.yml is missing")
        metadata = yaml.load(
            metadata_path.read_text(encoding="utf-8-sig"), UniqueKeyLoader
        )
        if not isinstance(metadata, dict):
            raise ValueError("expected a YAML mapping")
        # AstrBot v4.28.0 accepts description as a legacy alias for desc.
        if "desc" not in metadata and "description" in metadata:
            metadata["desc"] = metadata["description"]
        for key in REQUIRED_METADATA:
            if not isinstance(metadata.get(key), str) or not metadata[key].strip():
                errors.append(f"metadata: {key} must be a non-empty string")
        if require_repo and not (
            isinstance(metadata.get("repo"), str) and metadata["repo"].strip()
        ):
            errors.append("metadata: set the real repo URL before release")
        if "support_platforms" in metadata:
            platforms = metadata["support_platforms"]
            if not isinstance(platforms, list) or any(
                not isinstance(item, str) or not item.strip() for item in platforms
            ):
                errors.append(
                    "metadata: support_platforms must be a list of non-empty strings"
                )
        if "astrbot_version" in metadata:
            constraint = metadata["astrbot_version"]
            try:
                if not isinstance(constraint, str) or not constraint.strip():
                    raise InvalidSpecifier("use a non-empty string")
                if re.search(r"(?:^|[<>=!~,])\s*v(?=\d)", constraint):
                    raise InvalidSpecifier("omit the v prefix in astrbot_version")
                SpecifierSet(constraint)
            except InvalidSpecifier as exc:
                errors.append(f"metadata: invalid astrbot_version: {exc}")
    except (OSError, ValueError, yaml.YAMLError) as exc:
        errors.append(f"metadata: {exc}")

    if not (root / "main.py").is_file():
        errors.append("main.py is missing")
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = [
            name
            for name in dirs
            if name not in IGNORED_DIRS and not name.startswith(".")
        ]
        for name in files:
            if not name.endswith(".py"):
                continue
            path = Path(directory) / name
            python_count += 1
            try:
                ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
            except (OSError, SyntaxError, ValueError) as exc:
                errors.append(f"{path.relative_to(root)}: {exc}")

    schema_path = root / "_conf_schema.json"
    if schema_path.exists():
        try:
            schema = json.loads(schema_path.read_text(encoding="utf-8-sig"))
            check_schema(schema, errors, warnings)
        except (OSError, ValueError) as exc:
            errors.append(f"_conf_schema.json: {exc}")
    return errors, warnings, python_count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plugin_dir", type=Path)
    parser.add_argument(
        "--require-repo", action="store_true", help="Release metadata check"
    )
    args = parser.parse_args()
    errors, warnings, count = validate_plugin(args.plugin_dir, args.require_repo)
    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}")
    if errors:
        return 1
    print(
        f"Static checks passed ({count} Python files). "
        "Runtime import/load was not tested."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
