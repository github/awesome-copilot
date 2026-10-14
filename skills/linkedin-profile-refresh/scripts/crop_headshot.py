#!/usr/bin/env python3
"""Crop one headshot into platform-ready sizes, locally. Nothing is uploaded.

Usage:
  python3 crop_headshot.py PHOTO [--out DIR] [--targets linkedin,slack,github,cover]
          [--face-center X,Y] [--grayscale]

The crop is centred on --face-center (fractions of width/height, default 0.5,0.4,
which suits a typical head-and-shoulders photo). Needs Pillow (pip install pillow).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover - exercised manually
    sys.exit("Pillow is required: pip install pillow")

# Sizes come from each platform's official help page (see references/platform-specs.md).
# Where a platform publishes only a range, we export a size inside that range.
# Square targets export at the source resolution, clamped to the platform's range, so a
# photo is never upscaled when the platform would accept it as is. The cover is a fixed size.
TARGETS = {
    "linkedin": {"square": (400, 1200), "note": "LinkedIn: 400x400 to 7680x4320 px, max 8 MB, JPG/PNG"},
    "slack": {"square": (512, 1024), "note": "Slack: 512x512 to 1024x1024 px"},
    "github": {"square": (400, 1200), "note": "GitHub: no published size; square works best"},
    "cover": {"size": (1584, 396), "note": "LinkedIn cover: 1584x396 px recommended, max 8 MB"},
}
MAX_BYTES = 8 * 1024 * 1024


def parse_center(raw: str) -> tuple[float, float]:
    try:
        x, y = (float(v) for v in raw.split(","))
    except ValueError as exc:
        raise argparse.ArgumentTypeError("use X,Y fractions, e.g. 0.5,0.4") from exc
    if not (0 <= x <= 1 and 0 <= y <= 1):
        raise argparse.ArgumentTypeError("X and Y must be between 0 and 1")
    return x, y


def crop_box(width: int, height: int, ratio: float, center: tuple[float, float]) -> tuple[int, int, int, int]:
    """Largest box with the given aspect ratio, centred on `center`, kept inside the image."""
    if width / height > ratio:
        box_h, box_w = height, round(height * ratio)
    else:
        box_w, box_h = width, round(width / ratio)
    cx, cy = center[0] * width, center[1] * height
    left = min(max(round(cx - box_w / 2), 0), width - box_w)
    top = min(max(round(cy - box_h / 2), 0), height - box_h)
    return left, top, left + box_w, top + box_h


def export(img: Image.Image, path: Path) -> int:
    """Save as JPEG under the 8 MB cap, lowering quality only if needed."""
    for quality in (92, 85, 75, 65):
        img.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
        if path.stat().st_size <= MAX_BYTES:
            return quality
    return quality


def run(photo: Path, out: Path, targets: list[str], center: tuple[float, float], grayscale: bool) -> list[dict]:
    img = ImageOps.exif_transpose(Image.open(photo)).convert("RGB")
    if grayscale:
        img = ImageOps.grayscale(img).convert("RGB")
    out.mkdir(parents=True, exist_ok=True)
    results = []
    for name in targets:
        spec = TARGETS[name]
        if "square" in spec:
            low, high = spec["square"]
            side = max(low, min(high, min(img.width, img.height)))
            w = h = side
        else:
            w, h = spec["size"]
        box = crop_box(img.width, img.height, w / h, center)
        cropped = img.crop(box)
        upscaled = cropped.width < w
        resized = cropped.resize((w, h), Image.LANCZOS)
        dest = out / f"{photo.stem}-{name}.jpg"
        quality = export(resized, dest)
        results.append({
            "target": name, "file": str(dest), "size": [w, h], "jpegQuality": quality,
            "bytes": dest.stat().st_size, "upscaled": upscaled, "spec": spec["note"],
        })
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("photo", type=Path)
    parser.add_argument("--out", type=Path, default=Path("headshot-exports"))
    parser.add_argument("--targets", default="linkedin,slack,github,cover")
    parser.add_argument("--face-center", type=parse_center, default=(0.5, 0.4))
    parser.add_argument("--grayscale", action="store_true")
    args = parser.parse_args(argv)
    targets = [t.strip() for t in args.targets.split(",") if t.strip()]
    unknown = [t for t in targets if t not in TARGETS]
    if unknown:
        parser.error(f"unknown target(s): {', '.join(unknown)}; choose from {', '.join(TARGETS)}")
    if not args.photo.is_file():
        parser.error(f"not a file: {args.photo}")
    print(json.dumps(run(args.photo, args.out, targets, args.face_center, args.grayscale), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
