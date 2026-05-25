from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def emit_payload(payload: dict[str, Any], *, pretty: bool = False) -> None:
	print(json.dumps(payload, ensure_ascii=False, indent=2 if pretty else None))


def convert_document(source: str | Path, *, enable_plugins: bool = False) -> dict[str, Any]:
	"""Convert a document supported by MarkItDown into markdown text."""
	source_path = Path(source).expanduser()
	if not source_path.exists():
		return {
			"ok": False,
			"error": f"Source file does not exist: {source_path}",
			"code": "source_not_found",
		}

	try:
		from markitdown import MarkItDown
	except Exception as exc:
		return {
			"ok": False,
			"error": "MarkItDown is not installed. Install the plugin dependencies with `uv sync --extra plugins`.",
			"detail": str(exc),
			"code": "dependency_missing",
		}

	try:
		result = MarkItDown(enable_plugins=enable_plugins).convert(str(source_path))
	except Exception as exc:
		return {"ok": False, "error": str(exc), "code": "conversion_failed"}

	markdown = getattr(result, "text_content", "") or ""
	title = getattr(result, "title", "") or source_path.stem
	return {
		"ok": True,
		"source": str(source_path),
		"title": title,
		"markdown": markdown,
		"charCount": len(markdown),
	}


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Convert a document to markdown with MarkItDown.")
	parser.add_argument("--source", required=True, help="Path to a document such as PDF, DOCX, PPTX, XLSX, HTML, or TXT.")
	parser.add_argument("--output-path", help="Optional path where markdown should be written.")
	parser.add_argument("--enable-plugins", action="store_true", help="Enable MarkItDown plugins.")
	parser.add_argument("--pretty", action="store_true", help="Pretty-print the JSON response.")
	return parser


def main() -> int:
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8")

	args = build_parser().parse_args()
	payload = convert_document(args.source, enable_plugins=args.enable_plugins)

	if payload.get("ok") and args.output_path:
		output_path = Path(args.output_path).expanduser()
		output_path.parent.mkdir(parents=True, exist_ok=True)
		output_path.write_text(str(payload["markdown"]), encoding="utf-8")
		payload["outputPath"] = str(output_path)

	emit_payload(payload, pretty=args.pretty)
	return 0 if payload.get("ok") else 1


if __name__ == "__main__":
	raise SystemExit(main())