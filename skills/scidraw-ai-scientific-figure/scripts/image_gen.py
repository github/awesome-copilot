#!/usr/bin/env python3
"""Optional OpenAI-compatible image API adapter for SciDraw figure generation."""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from openai import OpenAI


DEFAULT_MODEL = "gpt-image-2"
DEFAULT_SIZE = "2560x1440"
DEFAULT_QUALITY = "medium"


def die(message: str, code: int = 1) -> None:
    print(f"Error: {message}", file=sys.stderr)
    raise SystemExit(code)


def read_prompt(prompt: str | None, prompt_file: str | None) -> str:
    if prompt and prompt_file:
        die("Use --prompt or --prompt-file, not both.")
    if prompt_file:
        if prompt_file == "-":
            data = sys.stdin.read()
        else:
            data = Path(prompt_file).read_text(encoding="utf-8")
    elif prompt:
        data = prompt
    else:
        die("Missing prompt. Use --prompt or --prompt-file.")
    data = data.strip()
    if not data:
        die("Prompt is empty.")
    return data


def build_prompt(user_prompt: str) -> str:
    return (
        "Create one publication-ready scientific figure. Use clean academic layout, "
        "readable labels, consistent typography, clear arrows, and accurate scientific "
        "visual hierarchy. Output exactly one image.\n\n"
        + user_prompt
    )


def save_image(result: object, out_path: Path) -> None:
    data = getattr(result, "data", None)
    if not data:
        die("Image API returned no image data.")

    first = data[0]
    b64_json = getattr(first, "b64_json", None)
    url = getattr(first, "url", None)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    if b64_json:
        out_path.write_bytes(base64.b64decode(b64_json))
        return
    if url:
        with urllib.request.urlopen(url, timeout=60) as response:
            out_path.write_bytes(response.read())
        return

    die("Image API returned neither b64_json nor url.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate one SciDraw-style scientific figure via an OpenAI-compatible image API."
    )
    parser.add_argument("--prompt")
    parser.add_argument("--prompt-file")
    parser.add_argument("--out", default="outputs/figure.png")
    parser.add_argument("--model", default=os.getenv("SCIDRAW_IMAGE_MODEL", DEFAULT_MODEL))
    parser.add_argument("--size", default=os.getenv("SCIDRAW_IMAGE_SIZE", DEFAULT_SIZE))
    parser.add_argument("--quality", default=os.getenv("SCIDRAW_IMAGE_QUALITY", DEFAULT_QUALITY))
    parser.add_argument("--json", action="store_true", help="Print machine-readable result.")
    args = parser.parse_args()

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        die("OPENAI_API_KEY is required for API mode.")

    prompt = build_prompt(read_prompt(args.prompt, args.prompt_file))
    out_path = Path(args.out).expanduser().resolve()

    client = OpenAI(
        api_key=api_key,
        base_url=os.getenv("OPENAI_BASE_URL") or None,
    )

    started = time.time()
    try:
        result = client.images.generate(
            model=args.model,
            prompt=prompt,
            n=1,
            size=args.size,
            quality=args.quality,
        )
    except Exception as exc:
        die(f"Image API request failed: {exc}")

    save_image(result, out_path)
    payload = {
        "status": "ok",
        "backend": "image_api",
        "model": args.model,
        "size": args.size,
        "quality": args.quality,
        "out": str(out_path),
        "elapsed_seconds": round(time.time() - started, 2),
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False))
    else:
        print(f"Image saved: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
