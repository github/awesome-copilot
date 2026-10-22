"""Offline checks: no credentials, browser, school API or model calls."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
import nuaa_api
from study_material import export_material, normalize, split_chunks


class StudyTests(unittest.TestCase):
    def test_export_preserves_all_text_and_timestamps_in_order(self):
        raw = [{"bg": i * 60000, "ed": i * 60000 + 1000, "res": f"知识点 {i}"}
               for i in reversed(range(20))]
        with tempfile.TemporaryDirectory() as temp:
            path = export_material("123456", raw, Path(temp) / "lesson")
            manifest = json.loads(path.read_text(encoding="utf-8"))
            self.assertGreater(len(manifest["chunks"]), 1)
            entries = []
            for chunk in manifest["chunks"]:
                item = json.loads((path.parent / chunk["file"]).read_text(encoding="utf-8"))
                self.assertEqual(item["course_id"], "123456")
                entries.extend(item["entries"])
            self.assertEqual(entries, normalize(raw))
            self.assertEqual(manifest["entry_count"], len(raw))
            with self.assertRaises(FileExistsError):
                export_material("123456", raw, path.parent)

    def test_empty_invalid_material_does_not_create_output(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "lesson"
            for raw in ([], [{"bg": 0, "ed": 10, "res": " "}],
                        [{"bg": 10, "ed": 0, "res": "bad"}]):
                with self.assertRaises(ValueError):
                    export_material("123456", raw, output)
                self.assertFalse(output.exists())

    def test_character_split_keeps_subtitle_intact(self):
        entries = normalize([{"bg": i, "ed": i + 1, "res": "字" * 4000} for i in range(3)])
        chunks = split_chunks(entries)
        self.assertEqual(len(chunks), 3)
        self.assertEqual([entry for chunk in chunks for entry in chunk], entries)

    def test_course_json_and_empty_lists(self):
        record = {"teclId": "12345", "subjName": "软件工程", "teclName": "一班"}
        with patch.object(nuaa_api, "call", return_value={"data": {"records": [record]}}):
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                nuaa_api.cmd_courses("软件", {}, True)
            self.assertEqual(json.loads(output.getvalue()), [record])
        with patch.object(nuaa_api, "call", return_value={"data": None}):
            for command in (lambda: nuaa_api.cmd_courses("", {}, True),
                            lambda: nuaa_api.cmd_list("12345", {}, True)):
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    command()
                self.assertEqual(json.loads(output.getvalue()), [])

    def test_cli_offline_export_and_missing_subtitles(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "input.json"
            source.write_text(json.dumps({"data": [{"bg": 100, "ed": 200, "res": "测试"}]}), encoding="utf-8")
            command = [sys.executable, "-X", "utf8", str(SCRIPTS / "study_material.py"),
                       "12345", str(Path(temp) / "export"), "--input", str(source)]
            result = subprocess.run(command, capture_output=True, encoding="utf-8")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(Path(json.loads(result.stdout)["manifest"]).is_file())
            source.write_text('{"data": []}', encoding="utf-8")
            result = subprocess.run(command, capture_output=True, encoding="utf-8")
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("暂无有效字幕", result.stderr)


if __name__ == "__main__":
    unittest.main()
