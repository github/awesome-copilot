#!/usr/bin/env python3
"""Export timestamped subtitle chunks for AI study, without a model API.

python scripts/study_material.py <courseId> <new-output-directory> [--state state.json]
Offline: append --input subtitles.json (platform response with a data array).
"""
import argparse
import json
import sys
from pathlib import Path

from nuaa_api import _check_id, call, load_state
from nuaa_runtime import STATE_DEFAULT


def normalize(entries):
    if not isinstance(entries, list):
        raise ValueError("字幕 data 必须是数组")
    result = []
    for entry in entries:
        start, end = int(entry["bg"]), int(entry["ed"])
        if start < 0 or end < start:
            raise ValueError("字幕时间轴无效")
        text = str(entry.get("res") or "").strip()
        if text:
            result.append({"start_ms": start, "end_ms": end, "text": text})
    result.sort(key=lambda item: (item["start_ms"], item["end_ms"]))
    if not result:
        raise ValueError("平台暂无有效字幕；不能据此生成课堂摘要或题目")
    return result


def split_chunks(entries, max_chars=6000, max_span_ms=480000):
    """Reading chunks, not semantic chapters; keep each subtitle intact."""
    chunks, current, size = [], [], 0
    for entry in entries:
        if current and (size + len(entry["text"]) > max_chars
                        or entry["end_ms"] - current[0]["start_ms"] > max_span_ms):
            chunks.append(current)
            current, size = [], 0
        current.append(entry)
        size += len(entry["text"])
    if current:
        chunks.append(current)
    return chunks


def export_material(course_id, raw, output):
    course_id = _check_id(course_id, "courseId")
    entries = normalize(raw)
    chunks = split_chunks(entries)
    output = Path(output).expanduser().resolve()
    output.mkdir(parents=True, exist_ok=False)
    manifest = {"schema_version": 1, "course_id": str(course_id),
                "source": "platform_ai_subtitle", "entry_count": len(entries),
                "start_ms": entries[0]["start_ms"],
                "end_ms": max(e["end_ms"] for e in entries), "chunks": []}
    for index, chunk in enumerate(chunks, 1):
        name = f"chunk-{index:03d}.json"
        item = {"course_id": str(course_id), "index": index,
                "start_ms": chunk[0]["start_ms"], "end_ms": max(e["end_ms"] for e in chunk),
                "entries": chunk}
        (output / name).write_text(json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8")
        manifest["chunks"].append({"file": name, "start_ms": item["start_ms"],
                                    "end_ms": item["end_ms"], "entry_count": len(chunk)})
    path = output / "manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("course_id")
    parser.add_argument("output", help="新建资料目录，拒绝覆盖已有目录")
    parser.add_argument("--state", default=STATE_DEFAULT)
    parser.add_argument("--input", type=Path, help="离线字幕响应 JSON，不登录或联网")
    args = parser.parse_args()
    _check_id(args.course_id, "courseId")
    if args.input:
        response = json.loads(args.input.read_text(encoding="utf-8-sig"))
    else:
        response = call(f"/v1/course_vod_subtitle?courseId={args.course_id}", load_state(args.state))
    try:
        path = export_material(args.course_id, response.get("data") or [], args.output)
    except (ValueError, FileExistsError) as error:
        parser.exit(1, f"{error}\n")
    print(json.dumps({"manifest": str(path)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
