#!/usr/bin/env python3
"""Measure a folder of team headshots and flag the ones that do not match the set.

Usage:
  python3 team_audit.py DIR [--json]
  python3 team_audit.py DIR --normalize OUT_DIR [--size 800] [--ratio 1:1] [--bg "#F2F2F2"]

Everything runs locally; nothing is uploaded. Needs Pillow (pip install pillow).
The audit measures pixels only (size, aspect ratio, brightness, colour temperature,
border colour); it does not detect faces, so framing must be checked by eye.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps, ImageStat
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: pip install pillow")

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
# A photo is flagged when it sits this far from the team median.
RATIO_TOLERANCE = 0.03       # aspect ratio difference
BRIGHTNESS_TOLERANCE = 25    # 0-255 luma
WARMTH_TOLERANCE = 18        # red minus blue, 0-255
BORDER_TOLERANCE = 40        # mean RGB distance of the outer 6% border
MIN_SHORT_EDGE = 400


def measure(path: Path) -> dict:
    img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    w, h = img.size
    stat = ImageStat.Stat(img)
    r, g, b = stat.mean
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    edge = max(1, round(min(w, h) * 0.06))
    strips = [img.crop((0, 0, w, edge)), img.crop((0, 0, edge, h)), img.crop((w - edge, 0, w, h))]
    border = [statistics.fmean(ImageStat.Stat(s).mean[i] for s in strips) for i in range(3)]
    return {
        "file": path.name, "width": w, "height": h, "ratio": round(w / h, 3),
        "brightness": round(luma, 1), "warmth": round(r - b, 1),
        "border": [round(c) for c in border],
    }


def distance(a: list[float], b: list[float]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def audit(rows: list[dict]) -> dict:
    med = {
        "ratio": statistics.median(r["ratio"] for r in rows),
        "brightness": statistics.median(r["brightness"] for r in rows),
        "warmth": statistics.median(r["warmth"] for r in rows),
        "border": [statistics.median(r["border"][i] for r in rows) for i in range(3)],
    }
    for r in rows:
        flags = []
        if min(r["width"], r["height"]) < MIN_SHORT_EDGE:
            flags.append(f"low resolution (short edge {min(r['width'], r['height'])} px)")
        if abs(r["ratio"] - med["ratio"]) > RATIO_TOLERANCE:
            flags.append(f"aspect ratio {r['ratio']} vs team {med['ratio']}")
        if abs(r["brightness"] - med["brightness"]) > BRIGHTNESS_TOLERANCE:
            flags.append("much darker than the team" if r["brightness"] < med["brightness"] else "much brighter than the team")
        if abs(r["warmth"] - med["warmth"]) > WARMTH_TOLERANCE:
            flags.append("warmer colour than the team" if r["warmth"] > med["warmth"] else "cooler colour than the team")
        if distance(r["border"], med["border"]) > BORDER_TOLERANCE:
            flags.append("background colour differs from the team")
        r["flags"] = flags
    return {"teamMedian": med, "photos": rows, "outliers": [r["file"] for r in rows if r["flags"]]}


def normalize(paths: list[Path], out: Path, size: int, ratio: float, bg: str) -> list[str]:
    """Same crop ratio and output size for everyone; pads (never stretches) when needed."""
    out.mkdir(parents=True, exist_ok=True)
    w, h = (size, round(size / ratio)) if ratio >= 1 else (round(size * ratio), size)
    written = []
    for p in paths:
        img = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
        fitted = ImageOps.fit(img, (w, h), Image.LANCZOS, centering=(0.5, 0.4))
        canvas = Image.new("RGB", (w, h), bg)
        canvas.paste(fitted, (0, 0))
        dest = out / f"{p.stem}.jpg"
        canvas.save(dest, "JPEG", quality=90, optimize=True)
        written.append(str(dest))
    return written


def parse_ratio(raw: str) -> float:
    a, _, b = raw.partition(":")
    try:
        value = float(a) / float(b)
    except (ValueError, ZeroDivisionError) as exc:
        raise argparse.ArgumentTypeError("use W:H, e.g. 1:1 or 4:5") from exc
    return value


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("dir", type=Path)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--normalize", type=Path, metavar="OUT_DIR")
    parser.add_argument("--size", type=int, default=800)
    parser.add_argument("--ratio", type=parse_ratio, default=1.0)
    parser.add_argument("--bg", default="#F2F2F2")
    args = parser.parse_args(argv)
    paths = sorted(p for p in args.dir.iterdir() if p.suffix.lower() in EXTENSIONS) if args.dir.is_dir() else []
    if len(paths) < 2:
        parser.error("need a folder with at least two .jpg/.png/.webp photos")
    if args.normalize:
        print(json.dumps({"written": normalize(paths, args.normalize, args.size, args.ratio, args.bg)}, indent=2))
        return 0
    report = audit([measure(p) for p in paths])
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        for r in report["photos"]:
            status = "OK " if not r["flags"] else "FIX"
            print(f"{status} {r['file']}: {'; '.join(r['flags']) or 'matches the set'}")
        print(f"\n{len(report['outliers'])} of {len(paths)} photos differ from the team median.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
