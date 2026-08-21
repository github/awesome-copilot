#!/usr/bin/env python3
"""Render a safe, dependency-free SVG recommendation card from JSON."""

from __future__ import annotations

import argparse
import html
import json
import os
import tempfile
import textwrap
from pathlib import Path


STATUS_COLORS = {
    "available": ("#0f766e", "#ccfbf1"),
    "recommended": ("#1d4ed8", "#dbeafe"),
    "optional": ("#7c3aed", "#ede9fe"),
    "not-recommended": ("#b45309", "#fef3c7"),
    "verified": ("#15803d", "#dcfce7"),
}


def clean_text(value: object, limit: int) -> str:
    text = " ".join(str(value or "").split())
    return text[:limit]


def wrap(value: object, width: int, limit: int) -> list[str]:
    text = clean_text(value, limit)
    return textwrap.wrap(text, width=width, break_long_words=False) or [""]


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(content)
        temporary = handle.name
    os.replace(temporary, path)


def validate(payload: object) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise ValueError("card input must be a JSON object")
    if not clean_text(payload.get("title"), 120):
        raise ValueError("title is required")
    if not clean_text(payload.get("goal"), 400):
        raise ValueError("goal is required")
    skills = payload.get("skills")
    if not isinstance(skills, list) or not skills:
        raise ValueError("skills must be a non-empty list")
    if len(skills) > 8:
        raise ValueError("a shareable card supports at most 8 Skills")
    for index, skill in enumerate(skills):
        if not isinstance(skill, dict) or not clean_text(skill.get("name"), 80):
            raise ValueError(f"skills[{index}].name is required")
    return payload


def text_element(x: int, y: int, text: object, size: int, color: str, weight: int = 400) -> str:
    return (
        f'<text x="{x}" y="{y}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" '
        f'font-size="{size}" font-weight="{weight}" fill="{color}">{html.escape(str(text))}</text>'
    )


def render(payload: dict[str, object]) -> str:
    width = 1200
    title = clean_text(payload.get("title"), 120)
    goal_lines = wrap(payload.get("goal"), 82, 400)[:3]
    skills = payload["skills"]
    warnings = payload.get("boundaries", [])
    if not isinstance(warnings, list):
        warnings = [warnings]
    warning_lines: list[str] = []
    for warning in warnings[:3]:
        warning_lines.extend(wrap(warning, 92, 240)[:2])
    height = 250 + len(goal_lines) * 34 + len(skills) * 92 + max(1, len(warning_lines)) * 30 + 110

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">',
        f'<title id="title">{html.escape(title)}</title>',
        f'<desc id="desc">{html.escape(clean_text(payload.get("goal"), 400))}</desc>',
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#07152f"/><stop offset="1" stop-color="#123b5d"/></linearGradient></defs>',
        f'<rect width="{width}" height="{height}" rx="36" fill="url(#bg)"/>',
        '<circle cx="1080" cy="90" r="160" fill="#38bdf8" opacity="0.10"/>',
        '<circle cx="1120" cy="30" r="80" fill="#a78bfa" opacity="0.12"/>',
        text_element(64, 72, "AGENT SKILL STACK", 22, "#7dd3fc", 700),
        text_element(64, 122, title, 38, "#ffffff", 750),
    ]
    y = 166
    for line in goal_lines:
        parts.append(text_element(64, y, line, 24, "#dbeafe", 400))
        y += 34
    y += 22

    for skill in skills:
        name = clean_text(skill.get("name"), 80)
        role = clean_text(skill.get("role"), 180)
        status = clean_text(skill.get("status"), 40).lower() or "recommended"
        foreground, background = STATUS_COLORS.get(status, ("#334155", "#e2e8f0"))
        parts.extend([
            f'<rect x="56" y="{y}" width="1088" height="72" rx="18" fill="#ffffff" opacity="0.96"/>',
            text_element(84, y + 31, name, 24, "#0f172a", 700),
            text_element(84, y + 57, role, 18, "#475569", 400),
            f'<rect x="956" y="{y + 18}" width="160" height="36" rx="18" fill="{background}"/>',
            text_element(976, y + 43, status.replace("-", " ").title(), 16, foreground, 700),
        ])
        y += 92

    parts.append(text_element(64, y + 4, "SAFETY BOUNDARY", 18, "#7dd3fc", 700))
    y += 34
    if not warning_lines:
        warning_lines = ["No additional boundary recorded."]
    for line in warning_lines:
        parts.append(text_element(72, y, f"• {line}", 19, "#e2e8f0", 400))
        y += 30

    verified = clean_text(payload.get("verified"), 40) or "not recorded"
    footer = clean_text(payload.get("footer"), 120) or "Minimal. Audited. Project-specific."
    parts.extend([
        f'<line x1="64" y1="{height - 78}" x2="1136" y2="{height - 78}" stroke="#7dd3fc" opacity="0.25"/>',
        text_element(64, height - 38, footer, 17, "#bae6fd", 500),
        text_element(934, height - 38, f"Verified: {verified}", 17, "#bae6fd", 500),
        "</svg>",
    ])
    return "\n".join(parts) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="JSON card definition")
    parser.add_argument("--output", required=True, help="SVG destination")
    parser.add_argument("--force", action="store_true", help="Replace an existing output file")
    args = parser.parse_args()

    source = Path(args.input).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"input is not a file: {source}")
    if output.exists() and not args.force:
        raise SystemExit(f"refusing to overwrite existing output: {output}")
    if output.suffix.lower() != ".svg":
        raise SystemExit("output must use the .svg extension")

    try:
        payload = validate(json.loads(source.read_text(encoding="utf-8")))
        svg = render(payload)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc
    atomic_write(output, svg)
    print(json.dumps({"status": "created", "output": str(output)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
