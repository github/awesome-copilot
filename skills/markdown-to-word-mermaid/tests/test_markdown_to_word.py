from __future__ import annotations

import os
import re
import tempfile
import unittest
from pathlib import Path
import sys
import struct
import zlib
import json
import subprocess
from unittest.mock import patch
from zipfile import ZipFile

from lxml import etree

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import markdown_to_word
from markdown_to_word import convert_markdown


PNG_DATA = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDAT"
    b"x\x9cc\x00\x02\x00\x00\x05\x00\x01\xa5\xf6E\x8c\x00\x00\x00\x00IEND\xaeB`\x82"
)


def png_data() -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        payload = kind + data
        return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload))

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">2I5B", 1, 1, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00\x00"))
        + chunk(b"IEND", b"")
    )


class MarkdownToWordTests(unittest.TestCase):
    def test_thematic_breaks_do_not_strip_document_content(self) -> None:
        markdown = (
            "---\n# Design\n\n```mermaid\nflowchart LR\nA --> B\n```\n\n"
            "---\nRemaining text\n"
        )

        title, body = markdown_to_word._extract_frontmatter(markdown)

        self.assertIsNone(title)
        self.assertEqual(body, markdown)

    def test_custom_font_and_multiple_svg_relationships(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "input.md"
            output = root / "output.docx"
            source.write_text(
                "# Workflow\n\n```mermaid\nflowchart LR\nA --> B\n```\n\n"
                "```mermaid\nsequenceDiagram\nAlice->>Bob: Review\n```\n",
                encoding="utf-8",
            )
            commands: list[list[str]] = []

            def fake_command(command: list[str], **_: object) -> None:
                commands.append(command)
                config_path = Path(command[command.index("-c") + 1])
                config = json.loads(config_path.read_text(encoding="utf-8"))
                self.assertEqual(config["themeVariables"]["fontFamily"], "Aptos, sans-serif")
                self.assertFalse(config["htmlLabels"])
                self.assertFalse(config["flowchart"]["htmlLabels"])
                output_path = Path(command[command.index("-o") + 1])
                if output_path.suffix == ".svg":
                    output_path.write_text(
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100">'
                        '<text font-family="Aptos">Review</text></svg>',
                        encoding="utf-8",
                    )
                else:
                    self.assertEqual(command[command.index("-s") + 1], "3")
                    output_path.write_bytes(png_data())

            with patch("markdown_to_word._resolve_cli", return_value="mmdc"), patch(
                "markdown_to_word._run_command", side_effect=fake_command
            ):
                convert_markdown(source, output, "mmdc", font_family="Aptos")

            self.assertEqual(len(commands), 4)
            with ZipFile(output) as docx:
                document_xml = etree.fromstring(docx.read("word/document.xml"))
                relationships = etree.fromstring(docx.read("word/_rels/document.xml.rels"))
                styles = etree.fromstring(docx.read("word/styles.xml"))
                for number in (1, 2):
                    self.assertIn(f"word/media/mermaid-{number}.svg", docx.namelist())
                svg_ids = document_xml.xpath(
                    ".//asvg:svgBlip/@r:embed",
                    namespaces={
                        "asvg": "http://schemas.microsoft.com/office/drawing/2016/SVG/main",
                        "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
                    },
                )
                self.assertEqual(len(set(svg_ids)), 2)
                targets = [
                    relationships.xpath(
                        f"string(.//*[local-name()='Relationship' and @Id='{relationship_id}']/@Target)"
                    )
                    for relationship_id in svg_ids
                ]
                self.assertEqual(targets, ["media/mermaid-1.svg", "media/mermaid-2.svg"])
                self.assertTrue(styles.xpath(
                    ".//w:style[@w:styleId='Normal']/w:rPr/w:rFonts[@w:ascii='Aptos' and @w:eastAsia='Aptos']",
                    namespaces={"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"},
                ))

    def test_rejects_empty_font_before_rendering(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "input.md"
            source.write_text("# Input\n", encoding="utf-8")
            with patch("markdown_to_word._render_mermaid") as renderer:
                with self.assertRaises(ValueError):
                    convert_markdown(source, root / "output.docx", "mmdc", font_family=" ")
            renderer.assert_not_called()
            self.assertFalse((root / "output.docx").exists())

    def test_rendering_failure_does_not_create_document(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "input.md"
            output = root / "output.docx"
            source.write_text("```mermaid\ninvalid diagram\n```\n", encoding="utf-8")
            with patch("markdown_to_word._resolve_cli", return_value="mmdc"), patch(
                "markdown_to_word._run_command", side_effect=RuntimeError("Mermaid rendering failed")
            ):
                with self.assertRaisesRegex(RuntimeError, "Mermaid rendering failed"):
                    convert_markdown(source, output, "mmdc")
            self.assertFalse(output.exists())

    def test_embeds_svg_vectors_with_png_fallback_and_page_layout(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "input.md"
            output = root / "output.docx"
            browser = root / "chrome.exe"
            browser.touch()
            source.write_text(
                "---\ntitle: Sample Document\nstatus: draft\n---\n\n"
                "# Design\n\nA table follows.\n\n| Item | Value |\n| --- | --- |\n| One | Two |\n\n"
                "```mermaid\ngraph TD\n  A[Start] --> B[End]\n```\n",
                encoding="utf-8",
            )

            def fake_renderer(command: list[str], **_: object) -> object:
                input_path = Path(command[command.index("-i") + 1])
                output_path = Path(command[command.index("-o") + 1])
                puppeteer_config = Path(command[command.index("-p") + 1])
                self.assertEqual(json.loads(puppeteer_config.read_text(encoding="utf-8"))["executablePath"], str(browser))
                if output_path.suffix == ".svg":
                    config_path = Path(command[command.index("-c") + 1])
                    config = config_path.read_text(encoding="utf-8")
                    self.assertIn("Noto Sans JP", config)
                    self.assertFalse(json.loads(config)["htmlLabels"])
                    self.assertIn("graph TD", input_path.read_text(encoding="utf-8"))
                    output_path.write_text(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="400px" height="500px" '
                        'viewBox="0 0 400 500"><text>図</text></svg>',
                        encoding="utf-8",
                    )
                else:
                    output_path.write_bytes(png_data())

                class Result:
                    returncode = 0
                    stdout = ""
                    stderr = ""

                return Result()

            with patch.dict("os.environ", {"MERMAID_BROWSER_PATH": str(browser)}), patch(
                "markdown_to_word.shutil.which", return_value="mmdc"
            ), patch(
                "markdown_to_word.subprocess.run", side_effect=fake_renderer
            ):
                convert_markdown(source, output, "mmdc")

            with ZipFile(output) as docx:
                names = docx.namelist()
                self.assertIn("word/media/mermaid-1.svg", names)
                self.assertIn("word/media/image1.png", names)
                document_xml = etree.fromstring(docx.read("word/document.xml"))
                relationships_xml = etree.fromstring(docx.read("word/_rels/document.xml.rels"))
                content_types = etree.fromstring(docx.read("[Content_Types].xml"))
                core_properties = etree.fromstring(docx.read("docProps/core.xml"))

            svg_blips = document_xml.xpath(
                ".//asvg:svgBlip",
                namespaces={"asvg": "http://schemas.microsoft.com/office/drawing/2016/SVG/main"},
            )
            self.assertEqual(len(svg_blips), 1)
            svg_relationship_id = svg_blips[0].get(
                "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"
            )
            relationships = relationships_xml.xpath(
                f".//*[local-name()='Relationship' and @Id='{svg_relationship_id}']"
            )
            self.assertEqual(relationships[0].get("Target"), "media/mermaid-1.svg")
            self.assertTrue(
                content_types.xpath(
                    ".//*[local-name()='Default' and @Extension='svg' and @ContentType='image/svg+xml']"
                )
            )
            drawings = document_xml.xpath(".//*[local-name()='docPr' and @name='mermaid-svg-1']")
            self.assertEqual(len(drawings), 1)
            self.assertEqual(
                core_properties.xpath("string(.//*[local-name()='title'])"),
                "Sample Document",
            )
            document_text = "".join(document_xml.xpath(".//*[local-name()='t']/text()"))
            self.assertIn("Sample Document", document_text)
            page_breaks = document_xml.xpath(".//*[local-name()='pageBreakBefore']")
            self.assertEqual(len(page_breaks), 1)

    def test_fails_if_mermaid_cli_is_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "input.md"
            source.write_text("```mermaid\ngraph TD\n  A --> B\n```\n", encoding="utf-8")
            with patch("markdown_to_word.shutil.which", return_value=None):
                with self.assertRaises(FileNotFoundError):
                    convert_markdown(source, root / "output.docx", "mmdc")
                plain_source = root / "plain.md"
                plain_source.write_text("# No diagram\n\nPlain text.\n", encoding="utf-8")
                plain_output = root / "plain.docx"
                convert_markdown(plain_source, plain_output, "mmdc")
                self.assertTrue(plain_output.is_file())

    def test_existing_output_is_preserved_without_rendering(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            input_path = directory / "input.md"
            output_path = directory / "input.docx"
            original_output = b"existing document"
            input_path.write_text("# Input\n", encoding="utf-8")
            output_path.write_bytes(original_output)

            with (
                patch.object(markdown_to_word, "Document") as document,
                patch.object(markdown_to_word, "_convert_blocks") as render,
                self.assertRaisesRegex(FileExistsError, "refusing to overwrite"),
            ):
                convert_markdown(input_path, output_path, "mmdc")

            document.assert_not_called()
            render.assert_not_called()
            self.assertEqual(output_path.read_bytes(), original_output)

    def test_injection_failure_does_not_leave_output_or_adjacent_temp_file(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "input.md"
            output = root / "output.docx"
            adjacent_tmp = root / "output.tmp.docx"
            adjacent_tmp.write_bytes(b"preexisting adjacent file")
            source.write_text("```mermaid\nflowchart LR\nA --> B\n```\n", encoding="utf-8")

            def fake_command(command: list[str], **_: object) -> None:
                output_path = Path(command[command.index("-o") + 1])
                if output_path.suffix == ".svg":
                    output_path.write_text(
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><text>Node</text></svg>',
                        encoding="utf-8",
                    )
                else:
                    output_path.write_bytes(png_data())

            with (
                patch("markdown_to_word._resolve_cli", return_value="mmdc"),
                patch("markdown_to_word._run_command", side_effect=fake_command),
                patch("markdown_to_word._inject_svg_parts", side_effect=RuntimeError("SVG injection failed")),
                self.assertRaisesRegex(RuntimeError, "SVG injection failed"),
            ):
                convert_markdown(source, output, "mmdc")

            self.assertFalse(output.exists())
            self.assertEqual(adjacent_tmp.read_bytes(), b"preexisting adjacent file")

    def test_preserves_ordered_list_start_and_separate_list_boundaries(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "lists.md"
            output = root / "lists.docx"
            source.write_text(
                "# Lists\n\n"
                "5. Fifth item\n"
                "6. Sixth item\n\n"
                "Intervening paragraph.\n\n"
                "1. Restarted first\n"
                "2. Restarted second\n",
                encoding="utf-8",
            )
            convert_markdown(source, output, "mmdc")
            with ZipFile(output) as docx:
                document_xml = etree.fromstring(docx.read("word/document.xml"))
            paragraphs = [
                "".join(paragraph.xpath(".//*[local-name()='t']/text()"))
                for paragraph in document_xml.xpath(".//*[local-name()='p']")
            ]
            self.assertIn("5. Fifth item", paragraphs)
            self.assertIn("6. Sixth item", paragraphs)
            self.assertIn("1. Restarted first", paragraphs)
            self.assertIn("2. Restarted second", paragraphs)

    def test_populates_contextual_diagram_alt_text_and_enforces_timeout(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "alt.md"
            output = root / "alt.docx"
            source.write_text(
                "## Approval Flow\n\n"
                "```mermaid\n"
                "flowchart LR\n"
                "  accTitle: Release Gate\n"
                "  accDescr: Validates package before release\n"
                "  A --> B\n"
                "```\n",
                encoding="utf-8",
            )

            def fake_command(command: list[str], **_: object) -> None:
                output_path = Path(command[command.index("-o") + 1])
                if output_path.suffix == ".svg":
                    output_path.write_text(
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><text>Gate</text></svg>',
                        encoding="utf-8",
                    )
                else:
                    output_path.write_bytes(png_data())

            with (
                patch("markdown_to_word._resolve_cli", return_value="mmdc"),
                patch("markdown_to_word._run_command", side_effect=fake_command),
            ):
                convert_markdown(source, output, "mmdc")

            with ZipFile(output) as docx:
                document_xml = etree.fromstring(docx.read("word/document.xml"))
            doc_pr = document_xml.xpath(".//*[local-name()='docPr' and @name='mermaid-svg-1']")[0]
            self.assertEqual(doc_pr.get("title"), "Release Gate")
            self.assertIn("Validates package before release", doc_pr.get("descr", ""))
            self.assertIn("flowchart", doc_pr.get("descr", ""))

            with patch(
                "markdown_to_word.subprocess.run",
                side_effect=subprocess.TimeoutExpired(cmd=["mmdc"], timeout=5.0),
            ):
                with self.assertRaisesRegex(RuntimeError, "timed out after 5s"):
                    markdown_to_word._run_command(["mmdc"], timeout=5.0)

    @unittest.skipUnless(os.name == "nt", "Windows command-shim coverage")
    def test_windows_mermaid_cli_avoids_shell_for_ampersand_paths(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory) / "R&D"
            shim = root / "node_modules" / ".bin" / "mmdc.cmd"
            entry_point = root / "node_modules" / "@mermaid-js" / "mermaid-cli" / "src" / "cli.js"
            node = root / "node.exe"
            shim.parent.mkdir(parents=True)
            entry_point.parent.mkdir(parents=True)
            shim.touch()
            entry_point.touch()
            node.touch()
            commands: list[tuple[list[str], dict[str, object]]] = []

            def fake_run(command: list[str], **kwargs: object) -> object:
                commands.append((command, kwargs))
                output_path = Path(command[command.index("-o") + 1])
                if output_path.suffix == ".svg":
                    output_path.write_text(
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"/>',
                        encoding="utf-8",
                    )
                else:
                    output_path.write_bytes(png_data())

                class Result:
                    returncode = 0
                    stdout = ""
                    stderr = ""

                return Result()

            with patch(
                "markdown_to_word.shutil.which",
                side_effect=lambda name: str(node) if name == "node" else None,
            ), patch("markdown_to_word.subprocess.run", side_effect=fake_run):
                markdown_to_word._render_mermaid("flowchart LR\nA --> B", 1, root, str(shim))

            self.assertEqual(len(commands), 2)
            for command, kwargs in commands:
                self.assertEqual(command[:2], [str(node), str(entry_point)])
                self.assertNotIn("cmd.exe", command[0].lower())
                self.assertFalse(kwargs.get("shell", False))
                self.assertIn("R&D", command[command.index("-o") + 1])

    def test_hard_link_failure_never_exposes_a_partial_destination(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            staged = root / "staged.docx"
            output = root / "output.docx"
            staged.write_bytes(b"complete document")

            with patch("markdown_to_word.os.link", side_effect=OSError("hard links unavailable")):
                if os.name == "nt":
                    markdown_to_word._publish_docx_exclusively(staged, output)
                    self.assertEqual(output.read_bytes(), b"complete document")
                    self.assertFalse(staged.exists())
                    second_staged = root / "second-staged.docx"
                    second_staged.write_bytes(b"replacement document")
                    with patch(
                        "markdown_to_word.os.link",
                        side_effect=OSError("hard links unavailable"),
                    ), self.assertRaisesRegex(FileExistsError, "refusing to overwrite"):
                        markdown_to_word._publish_docx_exclusively(second_staged, output)
                    self.assertEqual(output.read_bytes(), b"complete document")
                else:
                    with self.assertRaisesRegex(OSError, "Cannot publish DOCX atomically"):
                        markdown_to_word._publish_docx_exclusively(staged, output)
                    self.assertFalse(output.exists())
                    self.assertEqual(staged.read_bytes(), b"complete document")

    def test_preserves_multi_paragraph_list_items_and_atomic_publication(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "continuation-lists.md"
            output = root / "continuation-lists.docx"
            source.write_text(
                "# Multi-Paragraph Lists\n\n"
                "1. Ordered first paragraph\n\n"
                "   Ordered continuation paragraph\n\n"
                "2. Ordered second item\n\n"
                "- Bullet first paragraph\n\n"
                "  Bullet continuation paragraph\n",
                encoding="utf-8",
            )
            convert_markdown(source, output, "mmdc")
            with ZipFile(output) as docx:
                document_xml = etree.fromstring(docx.read("word/document.xml"))
            entries = [
                (
                    paragraph.xpath("string(./*[local-name()='pPr']/*[local-name()='pStyle']/@*[local-name()='val'])"),
                    "".join(paragraph.xpath(".//*[local-name()='t']/text()")),
                )
                for paragraph in document_xml.xpath(".//*[local-name()='p']")
            ]
            self.assertIn(("ListContinue", "1. Ordered first paragraph"), entries)
            self.assertIn(("ListContinue", "Ordered continuation paragraph"), entries)
            self.assertIn(("ListContinue", "2. Ordered second item"), entries)
            self.assertNotIn(("ListContinue", "3. Ordered second item"), entries)
            self.assertIn(("ListBullet", "Bullet first paragraph"), entries)
            self.assertIn(("ListContinue", "Bullet continuation paragraph"), entries)

            staged = root / "staged.docx"
            staged.write_bytes(b"new content")
            conflict_target = root / "conflict.docx"
            conflict_target.write_bytes(b"existing content")
            with self.assertRaisesRegex(FileExistsError, "refusing to overwrite"):
                markdown_to_word._publish_docx_exclusively(staged, conflict_target)
            self.assertEqual(conflict_target.read_bytes(), b"existing content")


@unittest.skipUnless(os.environ.get("MERMAID_CLI"), "set MERMAID_CLI to run real-renderer coverage")
class RealMermaidRendererTests(unittest.TestCase):
    def test_example_renders_svg_and_png_for_all_diagrams(self) -> None:
        skill_root = Path(__file__).resolve().parents[1]
        source = skill_root / "assets" / "example.md"
        source_text = source.read_text(encoding="utf-8")
        expected_diagrams = len(re.findall(r"(?m)^```mermaid\s*$", source_text))

        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "example.docx"
            convert_markdown(source, output, os.environ["MERMAID_CLI"])

            with ZipFile(output) as docx:
                names = docx.namelist()
                svg_names = sorted(
                    name for name in names
                    if re.fullmatch(r"word/media/mermaid-\d+\.svg", name)
                )
                png_names = [
                    name for name in names
                    if re.fullmatch(r"word/media/image\d+\.png", name)
                ]
                document_xml = etree.fromstring(docx.read("word/document.xml"))
                relationships = etree.fromstring(docx.read("word/_rels/document.xml.rels"))
                svg_relationship_ids = document_xml.xpath(
                    ".//asvg:svgBlip/@r:embed",
                    namespaces={
                        "asvg": "http://schemas.microsoft.com/office/drawing/2016/SVG/main",
                        "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
                    },
                )
                relationship_targets = [
                    relationships.xpath(
                        f"string(.//*[local-name()='Relationship' and @Id='{relationship_id}']/@Target)"
                    )
                    for relationship_id in svg_relationship_ids
                ]

                self.assertEqual(len(svg_names), expected_diagrams)
                self.assertEqual(len(png_names), expected_diagrams)
                self.assertEqual(len(svg_relationship_ids), expected_diagrams)
                self.assertEqual(
                    relationship_targets,
                    [f"media/mermaid-{number}.svg" for number in range(1, expected_diagrams + 1)],
                )

                svg_text = []
                for name in svg_names:
                    svg_root = etree.fromstring(docx.read(name))
                    self.assertFalse(svg_root.xpath(".//*[local-name()='foreignObject']"))
                    svg_text.append("".join(svg_root.itertext()))
                joined_svg_text = " ".join(svg_text)
                for label in ("Draft", "Publish", "入力", "差戻し"):
                    self.assertIn(label, joined_svg_text)

                dimensions = document_xml.xpath(
                    ".//wp:extent/@cx | .//wp:extent/@cy",
                    namespaces={"wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"},
                )
                self.assertEqual(len(dimensions), expected_diagrams * 2)
                self.assertTrue(all(int(dimension) > 0 for dimension in dimensions))


if __name__ == "__main__":
    unittest.main()
