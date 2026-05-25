from __future__ import annotations

import argparse
import base64
import html
import importlib
import json
import struct
import sys
from pathlib import Path
from typing import Any


MIME_BY_SUFFIX = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".bmp": "image/bmp",
	".webp": "image/webp",
}

RASTER_MODE = "embedded-raster"
VECTOR_MODE = "vector-trace"


def _png_size(data: bytes) -> tuple[int, int] | None:
	if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
		return struct.unpack(">II", data[16:24])
	return None


def _gif_size(data: bytes) -> tuple[int, int] | None:
	if data[:6] in {b"GIF87a", b"GIF89a"} and len(data) >= 10:
		return struct.unpack("<HH", data[6:10])
	return None


def _jpeg_size(data: bytes) -> tuple[int, int] | None:
	if not data.startswith(b"\xff\xd8"):
		return None
	index = 2
	while index + 9 < len(data):
		if data[index] != 0xFF:
			index += 1
			continue
		marker = data[index + 1]
		index += 2
		if marker in {0xD8, 0xD9}:
			continue
		if index + 2 > len(data):
			break
		segment_length = struct.unpack(">H", data[index:index + 2])[0]
		if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
			if index + 7 <= len(data):
				height, width = struct.unpack(">HH", data[index + 3:index + 7])
				return width, height
			break
		index += max(segment_length, 2)
	return None


def _webp_size(data: bytes) -> tuple[int, int] | None:
	if len(data) < 30 or not data.startswith(b"RIFF") or data[8:12] != b"WEBP":
		return None
	chunk = data[12:16]
	if chunk == b"VP8X" and len(data) >= 30:
		width = int.from_bytes(data[24:27], "little") + 1
		height = int.from_bytes(data[27:30], "little") + 1
		return width, height
	if chunk == b"VP8L" and len(data) >= 25:
		bits = int.from_bytes(data[21:25], "little")
		width = (bits & 0x3FFF) + 1
		height = ((bits >> 14) & 0x3FFF) + 1
		return width, height
	return None


def image_dimensions(data: bytes) -> tuple[int, int]:
	for reader in (_png_size, _jpeg_size, _gif_size, _webp_size):
		size = reader(data)
		if size:
			return size
	try:
		from io import BytesIO

		from PIL import Image

		with Image.open(BytesIO(data)) as image:
			return image.size
	except Exception:
		return 1, 1


def _trace_with_vtracer(
	source_path: Path,
	destination: Path,
	*,
	colormode: str,
	hierarchical: str,
	trace_mode: str,
	filter_speckle: int,
	color_precision: int,
	layer_difference: int,
	corner_threshold: int,
	length_threshold: float,
	max_iterations: int,
	splice_threshold: int,
	path_precision: int,
) -> dict[str, Any] | None:
	try:
		vtracer = importlib.import_module("vtracer")
	except ImportError:
		return {
			"ok": False,
			"error": "vtracer is not installed. Install plugin dependencies with vtracer support, or use --mode embedded-raster.",
			"code": "vtracer_not_installed",
		}

	try:
		vtracer.convert_image_to_svg_py(
			str(source_path),
			str(destination),
			colormode=colormode,
			hierarchical=hierarchical,
			mode=trace_mode,
			filter_speckle=filter_speckle,
			color_precision=color_precision,
			layer_difference=layer_difference,
			corner_threshold=corner_threshold,
			length_threshold=length_threshold,
			max_iterations=max_iterations,
			splice_threshold=splice_threshold,
			path_precision=path_precision,
		)
	except Exception as exc:
		return {"ok": False, "error": f"vtracer conversion failed: {exc}", "code": "vtracer_failed"}

	return None


def raster_to_svg(
	source: str | Path,
	output_path: str | Path | None = None,
	*,
	title: str | None = None,
	mode: str = RASTER_MODE,
	colormode: str = "color",
	hierarchical: str = "stacked",
	trace_mode: str = "spline",
	filter_speckle: int = 4,
	color_precision: int = 6,
	layer_difference: int = 16,
	corner_threshold: int = 60,
	length_threshold: float = 4.0,
	max_iterations: int = 10,
	splice_threshold: int = 45,
	path_precision: int = 3,
) -> dict[str, Any]:
	source_path = Path(source).expanduser()
	if not source_path.exists():
		return {"ok": False, "error": f"Source file does not exist: {source_path}", "code": "source_not_found"}

	destination = Path(output_path).expanduser() if output_path else source_path.with_suffix(".svg")
	destination.parent.mkdir(parents=True, exist_ok=True)

	data = source_path.read_bytes()
	width, height = image_dimensions(data)

	if mode == VECTOR_MODE:
		error = _trace_with_vtracer(
			source_path,
			destination,
			colormode=colormode,
			hierarchical=hierarchical,
			trace_mode=trace_mode,
			filter_speckle=filter_speckle,
			color_precision=color_precision,
			layer_difference=layer_difference,
			corner_threshold=corner_threshold,
			length_threshold=length_threshold,
			max_iterations=max_iterations,
			splice_threshold=splice_threshold,
			path_precision=path_precision,
		)
		if error:
			return error
		return {
			"ok": True,
			"source": str(source_path),
			"path": str(destination),
			"width": width,
			"height": height,
			"mode": VECTOR_MODE,
			"vectorizer": "vtracer",
			"trace_options": {
				"colormode": colormode,
				"hierarchical": hierarchical,
				"trace_mode": trace_mode,
				"filter_speckle": filter_speckle,
				"color_precision": color_precision,
				"layer_difference": layer_difference,
				"corner_threshold": corner_threshold,
				"length_threshold": length_threshold,
				"max_iterations": max_iterations,
				"splice_threshold": splice_threshold,
				"path_precision": path_precision,
			},
		}

	if mode != RASTER_MODE:
		return {"ok": False, "error": f"Unsupported mode: {mode}", "code": "unsupported_mode"}

	mime = MIME_BY_SUFFIX.get(source_path.suffix.lower(), "application/octet-stream")
	encoded = base64.b64encode(data).decode("ascii")
	safe_title = html.escape(title or source_path.stem)
	svg = (
		f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
		f'viewBox="0 0 {width} {height}" role="img" aria-label="{safe_title}">\n'
		f"  <title>{safe_title}</title>\n"
		f'  <image width="{width}" height="{height}" href="data:{mime};base64,{encoded}" preserveAspectRatio="xMidYMid meet"/>\n'
		"</svg>\n"
	)

	destination.write_text(svg, encoding="utf-8")
	return {
		"ok": True,
		"source": str(source_path),
		"path": str(destination),
		"width": width,
		"height": height,
		"mode": "embedded-raster",
		"mime": mime,
	}


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Wrap a raster image in a valid SVG image element.")
	parser.add_argument("--source", required=True, help="Path to a raster image.")
	parser.add_argument("--output-path", help="Destination SVG path. Defaults to the source name with .svg.")
	parser.add_argument("--title", help="Accessible SVG title.")
	parser.add_argument(
		"--mode",
		choices=(RASTER_MODE, VECTOR_MODE),
		default=RASTER_MODE,
		help="Conversion mode. embedded-raster wraps the source bytes; vector-trace uses optional vtracer paths.",
	)
	parser.add_argument("--colormode", choices=("color", "binary"), default="color", help="vtracer color mode.")
	parser.add_argument("--hierarchical", choices=("stacked", "cutout"), default="stacked", help="vtracer color clustering mode.")
	parser.add_argument("--trace-mode", choices=("spline", "polygon", "none"), default="spline", help="vtracer curve fitting mode.")
	parser.add_argument("--filter-speckle", type=int, default=4, help="Discard traced patches smaller than this pixel count.")
	parser.add_argument("--color-precision", type=int, default=6, help="Number of significant bits per RGB channel for vtracer.")
	parser.add_argument("--layer-difference", type=int, default=16, help="Color difference between vtracer gradient layers.")
	parser.add_argument("--corner-threshold", type=int, default=60, help="Minimum angle in degrees to be considered a corner.")
	parser.add_argument("--length-threshold", type=float, default=4.0, help="vtracer segment length threshold.")
	parser.add_argument("--max-iterations", type=int, default=10, help="vtracer smoothing iteration cap.")
	parser.add_argument("--splice-threshold", type=int, default=45, help="Minimum angle displacement in degrees to splice a spline.")
	parser.add_argument("--path-precision", type=int, default=3, help="Decimal places to use in traced SVG path data.")
	parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
	return parser


def main() -> int:
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8")
	args = build_parser().parse_args()
	payload = raster_to_svg(
		args.source,
		args.output_path,
		title=args.title,
		mode=args.mode,
		colormode=args.colormode,
		hierarchical=args.hierarchical,
		trace_mode=args.trace_mode,
		filter_speckle=args.filter_speckle,
		color_precision=args.color_precision,
		layer_difference=args.layer_difference,
		corner_threshold=args.corner_threshold,
		length_threshold=args.length_threshold,
		max_iterations=args.max_iterations,
		splice_threshold=args.splice_threshold,
		path_precision=args.path_precision,
	)
	print(json.dumps(payload, ensure_ascii=False, indent=2 if args.pretty else None))
	return 0 if payload.get("ok") else 1


if __name__ == "__main__":
	raise SystemExit(main())