from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug or "sheet"


def _write_manifest(path: Path, manifest: dict[str, Any]) -> None:
    temporary_path = path.with_suffix(".json.tmp")
    temporary_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary_path.replace(path)


def capture_selected_sheets(
    source_path: str | Path,
    structure: dict[str, Any],
    selected_sheets: list[str],
    output_dir: str | Path,
    *,
    include_hidden: bool = False,
    selection_note: str = "",
) -> dict[str, Any]:
    """Capture explicitly selected sheets as PDFs and page PNGs through Excel COM."""
    source = Path(source_path).resolve()
    destination = Path(output_dir).resolve()
    if not source.is_file():
        raise ValueError(f"workbook does not exist: {source.name}")
    if destination.exists():
        raise FileExistsError(f"output directory already exists: {destination}")
    if not selected_sheets:
        raise ValueError("select at least one worksheet for visual capture")
    if len(set(selected_sheets)) != len(selected_sheets):
        raise ValueError("selected worksheet names must be unique")

    source_sha256 = _sha256(source)
    if structure.get("source_sha256") != source_sha256:
        raise ValueError("structure data does not match the current workbook hash")

    sheet_metadata = {item["name"]: item for item in structure.get("sheets", [])}
    missing_sheets = [name for name in selected_sheets if name not in sheet_metadata]
    if missing_sheets:
        raise ValueError(f"selected worksheets are not in structure data: {missing_sheets}")
    hidden_sheets = [
        name for name in selected_sheets
        if sheet_metadata[name].get("state") != "visible"
    ]
    if hidden_sheets and not include_hidden:
        raise ValueError(
            f"selected worksheets are hidden; confirm with include_hidden=True: {hidden_sheets}"
        )

    pythoncom = importlib.import_module("pythoncom")
    win32_client = importlib.import_module("win32com.client")
    pdfium = importlib.import_module("pypdfium2")
    destination.mkdir(parents=True, exist_ok=False)
    sheets_dir = destination / "sheets"
    sheets_dir.mkdir()
    manifest_path = destination / "visual-evidence-manifest.json"
    manifest: dict[str, Any] = {
        "schema_version": 1,
        "source_file": source.name,
        "source_sha256": source_sha256,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "selection_note": selection_note,
        "requested_sheets": selected_sheets,
        "status": "in_progress",
        "selected_sheets": [],
    }
    _write_manifest(manifest_path, manifest)

    application = None
    workbook = None
    co_initialized = False
    capture_error = ""
    try:
        pythoncom.CoInitialize()
        co_initialized = True
        application = win32_client.DispatchEx("Excel.Application")
        application.Visible = False
        application.DisplayAlerts = False
        application.EnableEvents = False
        application.ScreenUpdating = False
        application.AskToUpdateLinks = False
        application.AutomationSecurity = 3
        workbook = application.Workbooks.Open(
            Filename=str(source),
            UpdateLinks=0,
            ReadOnly=True,
            IgnoreReadOnlyRecommended=True,
            AddToMru=False,
        )

        for sheet_index, sheet_name in enumerate(selected_sheets, start=1):
            record: dict[str, Any] = {
                "sheet_name": sheet_name,
                "status": "error",
                "pdf_file": "",
                "pdf_sha256": "",
                "capture_basis": "",
                "page_count": 0,
                "pages": [],
                "error": "",
            }
            manifest["selected_sheets"].append(record)
            sheet = None
            original_visibility = None
            original_print_area = None
            try:
                sheet = workbook.Worksheets(sheet_name)
                original_visibility = sheet.Visible
                if original_visibility != -1 and not include_hidden:
                    raise ValueError(
                        f"selected worksheet is hidden; confirm with include_hidden=True: {sheet_name}"
                    )
                original_print_area = str(sheet.PageSetup.PrintArea or "")
                if original_visibility != -1:
                    sheet.Visible = -1
                sheet.Activate()
                used_range = sheet.UsedRange
                capture_basis = original_print_area or str(used_range.Address)
                record["capture_basis"] = capture_basis
                if not original_print_area:
                    sheet.PageSetup.PrintArea = capture_basis

                basename = f"sheet-{sheet_index:03d}-{_safe_slug(sheet_name)}"
                pdf_path = sheets_dir / f"{basename}.pdf"
                sheet.ExportAsFixedFormat(
                    Type=0,
                    Filename=str(pdf_path),
                    Quality=0,
                    IncludeDocProperties=False,
                    IgnorePrintAreas=False,
                    OpenAfterPublish=False,
                )
                if not pdf_path.is_file() or pdf_path.stat().st_size == 0:
                    raise RuntimeError("Excel did not create a non-empty PDF")
                record["pdf_file"] = pdf_path.relative_to(destination).as_posix()
                record["pdf_sha256"] = _sha256(pdf_path)
                _write_manifest(manifest_path, manifest)

                with pdfium.PdfDocument(pdf_path) as pdf_document:
                    if len(pdf_document) <= 0:
                        raise RuntimeError("Excel created a PDF without pages")
                    record["page_count"] = len(pdf_document)
                    _write_manifest(manifest_path, manifest)
                    for page_index in range(1, len(pdf_document) + 1):
                        image_path = sheets_dir / f"{basename}-page-{page_index:03d}.png"
                        page = pdf_document[page_index - 1]
                        try:
                            bitmap = page.render(scale=2)
                            try:
                                with bitmap.to_pil() as image:
                                    page_record = {
                                        "page": page_index,
                                        "image_file": image_path.relative_to(destination).as_posix(),
                                        "image_sha256": "",
                                    }
                                    record["pages"].append(page_record)
                                    _write_manifest(manifest_path, manifest)
                                    image.save(image_path, format="PNG")
                                    page_record["image_sha256"] = _sha256(image_path)
                            finally:
                                bitmap.close()
                        finally:
                            page.close()
                        _write_manifest(manifest_path, manifest)

                record["status"] = "success"
            except Exception as error:
                record["error"] = f"{type(error).__name__}: {error}"
            finally:
                if sheet is not None:
                    try:
                        if original_print_area is not None:
                            sheet.PageSetup.PrintArea = original_print_area
                        if original_visibility is not None:
                            sheet.Visible = original_visibility
                    except Exception as restore_error:
                        record["restore_warning"] = f"{type(restore_error).__name__}: {restore_error}"

            _write_manifest(manifest_path, manifest)
    except Exception as error:
        capture_error = f"{type(error).__name__}: {error}"

    finally:
        if workbook is not None:
            try:
                workbook.Close(SaveChanges=False)
            except Exception as error:
                capture_error = capture_error or f"workbook close failed: {error}"
        if application is not None:
            try:
                application.Quit()
            except Exception as error:
                capture_error = capture_error or f"Excel quit failed: {error}"
        if co_initialized:
            pythoncom.CoUninitialize()

    try:
        source_sha256_after = _sha256(source)
    except OSError as error:
        source_sha256_after = ""
        capture_error = capture_error or f"could not recheck source workbook: {error}"
    manifest["source_sha256_after"] = source_sha256_after
    if capture_error:
        manifest["status"] = "error"
        manifest["error"] = capture_error
    elif source_sha256_after != source_sha256:
        manifest["status"] = "error"
        manifest["error"] = "source workbook changed during capture"
    elif len(manifest["selected_sheets"]) == len(selected_sheets) and all(
        item["status"] == "success" for item in manifest["selected_sheets"]
    ):
        manifest["status"] = "complete"
    else:
        manifest["status"] = "partial_failure"
    _write_manifest(manifest_path, manifest)

    if manifest["status"] != "complete":
        raise RuntimeError(f"visual capture did not complete; see {manifest_path}")
    try:
        verify_visual_evidence(source, manifest_path, selected_sheets)
    except Exception as error:
        manifest["status"] = "error"
        manifest["error"] = f"verification failed: {type(error).__name__}: {error}"
        _write_manifest(manifest_path, manifest)
        raise
    return manifest


def verify_visual_evidence(
    source_path: str | Path,
    manifest_path: str | Path,
    expected_sheets: list[str],
) -> dict[str, Any]:
    """Check the source, requested sheets, PDF pages, and image hashes on disk."""
    path = Path(manifest_path).resolve()
    root = path.parent
    manifest = json.loads(path.read_text(encoding="utf-8"))
    source_hash = _sha256(Path(source_path))
    if manifest.get("status") != "complete" or not expected_sheets:
        raise ValueError("manifest is not complete or sheet selection is empty")
    if len(set(expected_sheets)) != len(expected_sheets):
        raise ValueError("expected worksheet names must be unique")
    if manifest.get("source_sha256") != source_hash or manifest.get("source_sha256_after") != source_hash:
        raise ValueError("manifest source hashes do not match the workbook")
    records = manifest.get("selected_sheets", [])
    if manifest.get("requested_sheets") != expected_sheets or [
        record.get("sheet_name") for record in records
    ] != expected_sheets:
        raise ValueError("manifest worksheet selection does not match the request")

    pdfium = importlib.import_module("pypdfium2")
    pillow_image = importlib.import_module("PIL.Image")
    artifact_paths: set[Path] = set()

    def checked_artifact(relative_path: str, expected_hash: str) -> Path:
        artifact = (root / relative_path).resolve()
        if not artifact.is_relative_to(root) or artifact == root or artifact in artifact_paths:
            raise ValueError("artifact path escapes the output directory or is duplicated")
        if not artifact.is_file() or _sha256(artifact) != expected_hash:
            raise ValueError(f"artifact is missing or changed: {relative_path}")
        artifact_paths.add(artifact)
        return artifact

    for record in records:
        if record.get("status") != "success" or not record.get("capture_basis"):
            raise ValueError("worksheet capture is incomplete")
        pdf_path = checked_artifact(record["pdf_file"], record["pdf_sha256"])
        pages = record.get("pages", [])
        with pdfium.PdfDocument(pdf_path) as document:
            if len(document) <= 0 or len(document) != record.get("page_count"):
                raise ValueError("PDF page count does not match the manifest")
        if len(pages) != record["page_count"] or [page.get("page") for page in pages] != list(
            range(1, len(pages) + 1)
        ):
            raise ValueError("image page sequence does not match the PDF")
        for page in pages:
            image_path = checked_artifact(page["image_file"], page["image_sha256"])
            with pillow_image.open(image_path) as image:
                if image.format != "PNG" or image.width <= 0 or image.height <= 0:
                    raise ValueError("image is not a non-empty PNG")
                image.load()
    actual_paths = {
        artifact.resolve()
        for artifact in root.rglob("*")
        if artifact.is_file() and artifact.resolve() != path
    }
    if actual_paths != artifact_paths:
        raise ValueError("artifact files do not exactly match the manifest")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Capture or verify selected Excel worksheet evidence.")
    commands = parser.add_subparsers(dest="command", required=True)
    capture_parser = commands.add_parser("capture")
    capture_parser.add_argument("--workbook", required=True, type=Path)
    capture_parser.add_argument("--structure", required=True, type=Path)
    capture_parser.add_argument("--sheet", action="append", required=True)
    capture_parser.add_argument("--out-dir", required=True, type=Path)
    capture_parser.add_argument("--include-hidden", action="store_true")
    capture_parser.add_argument("--selection-note", required=True)
    verify_parser = commands.add_parser("verify")
    verify_parser.add_argument("--workbook", required=True, type=Path)
    verify_parser.add_argument("--manifest", required=True, type=Path)
    verify_parser.add_argument("--sheet", action="append", required=True)
    args = parser.parse_args()
    try:
        if args.command == "capture":
            structure = json.loads(args.structure.read_text(encoding="utf-8"))
            if not args.selection_note.strip():
                raise ValueError("selection note must not be blank")
            manifest = capture_selected_sheets(
                args.workbook, structure, args.sheet, args.out_dir,
                include_hidden=args.include_hidden, selection_note=args.selection_note,
            )
            print(f"VISUAL_CAPTURE_OK sheets={len(manifest['selected_sheets'])}")
        else:
            manifest = verify_visual_evidence(args.workbook, args.manifest, args.sheet)
            print(f"VISUAL_EVIDENCE_VERIFIED sheets={len(manifest['selected_sheets'])}")
        return 0
    except Exception as error:
        print(f"VISUAL_EVIDENCE_ERROR {type(error).__name__}: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())