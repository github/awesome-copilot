#!/usr/bin/env python3
"""Generate a small AstrBot plugin without overwriting existing files.

Uses only the Python standard library. Run validate_plugin.py and the generated
tests after adapting the example to the actual requirement.
"""

import argparse
import json
import re
from pathlib import Path

ASSETS = Path(__file__).resolve().parents[1] / "assets"
TOKEN = re.compile(r"\{\{([a-z_]+)\}\}")


def nonempty(value: str) -> str:
    if not value.strip():
        raise argparse.ArgumentTypeError("must be a non-empty string")
    return value


def scaffold(args: argparse.Namespace) -> Path:
    destination = Path(args.destination).expanduser().absolute()
    if destination.exists() or destination.is_symlink():
        raise ValueError(
            f"Destination already exists; refusing to overwrite: {destination}"
        )
    if not re.fullmatch(r"astrbot_plugin_[a-z0-9][a-z0-9_]*", destination.name):
        raise ValueError("Use a directory named astrbot_plugin_<lowercase_name>")
    if not re.fullmatch(r"[a-z][a-z0-9_-]*", args.command):
        raise ValueError(
            "Command must start with a lowercase letter and contain no spaces"
        )

    # JSON-quoted strings are valid YAML scalars, including colons and newlines.
    values = {
        "plugin_name": destination.name,
        "command": args.command,
        "runtime_install": (
            "python -m pip install -r requirements.txt" if args.with_openapi else ""
        ),
        "repo_line": (
            "repo: " + json.dumps(args.repo, ensure_ascii=False) if args.repo else ""
        ),
    }
    for key, value in {
        "name": destination.name,
        "author": args.author,
        "description": args.description,
        "version": args.version,
        "astrbot_version": args.astrbot_version,
    }.items():
        values[f"{key}_yaml"] = json.dumps(value, ensure_ascii=False)

    templates = {
        "main.py": "main.py.template",
        "plugin_logic.py": "plugin_logic.py.template",
        "metadata.yaml": "metadata.yaml.template",
        "_conf_schema.json": "_conf_schema.json.template",
        "requirements-dev.txt": "requirements-dev.txt.template",
        "tests/test_plugin_behavior.py": "test_plugin_behavior.py.template",
        "runtime_tests/test_plugin_runtime.py": "test_plugin_smoke.py.template",
        "README.md": "plugin-readme.md.template",
        "ruff.toml": "ruff.toml.template",
    }
    if args.with_openapi:
        templates.update(
            {
                "openapi_client.py": "openapi_client.py.template",
                "requirements.txt": "requirements.txt.template",
                "tests/test_openapi.py": "test_openapi_auth_and_shape.py.template",
            }
        )

    # Render everything before creating the destination. Replacements are single
    # pass so user text containing {{tokens}} is never interpreted as a template.
    rendered = {
        name: TOKEN.sub(
            lambda match: values[match.group(1)],
            (ASSETS / template).read_text(encoding="utf-8"),
        )
        for name, template in templates.items()
    }
    rendered["pytest.ini"] = "[pytest]\ntestpaths = tests\n"
    rendered[".gitignore"] = (
        ".venv/\n__pycache__/\n.pytest_cache/\n.ruff_cache/\n*.pyc\ndata/\n.env\n"
    )
    destination.mkdir(parents=True, exist_ok=False)
    for name, content in rendered.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8", newline="\n")
    return destination


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", help="New astrbot_plugin_<name> directory")
    parser.add_argument("--author", required=True, type=nonempty)
    parser.add_argument("--description", required=True, type=nonempty)
    parser.add_argument("--command", default="greet")
    parser.add_argument("--repo", type=nonempty, help="Known plugin repository URL")
    parser.add_argument("--version", default="0.1.0", type=nonempty)
    parser.add_argument("--astrbot-version", default=">=4.28.0", type=nonempty)
    parser.add_argument("--with-openapi", action="store_true")
    args = parser.parse_args()
    try:
        destination = scaffold(args)
    except (OSError, ValueError, KeyError) as exc:
        parser.exit(1, f"Scaffold failed: {exc}\n")
    print(f"Created {destination}")
    print("Adapt the greeting example, then run the checks in its README.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
