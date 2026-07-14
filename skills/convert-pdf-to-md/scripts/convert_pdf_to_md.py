#!/usr/bin/env python3
"""Convert PDF documents to Markdown using Microsoft's MarkItDown, with
embedded images extracted to real files via PyMuPDF (MarkItDown's PDF
converter only extracts text/tables -- it does not detect or emit anything
for embedded images at all).

Usage:
    python convert_pdf_to_md.py <input> [-o OUTPUT] [--recursive]

<input> may be either:
  - a path to a single .pdf file, or
  - a path to a directory (batch mode: every .pdf file directly inside it
    is converted; pass --recursive to also descend into subdirectories).

Output:
  For each source .pdf (named "<name>.pdf"), a folder is created containing
  the Markdown and its images, in this layout:

      <name>/
          img/
              page001_img001.<ext>
              page001_img002.<ext>
              page002_img001.<ext>
              ...
          <name>.md

  IMPORTANT: MarkItDown's PDF text extraction does not preserve reliable
  per-page markers in the returned Markdown (pages are simply joined
  together, or in some cases returned as a single unmarked block of text).
  That means there is no safe way to know exactly where, inline, an image
  should go. Rather than guess and risk misplacing an image next to the
  wrong paragraph, this script appends a clearly labeled "## Extracted
  Images" section at the end of the Markdown, with a "### Page N"
  subheading per page that contains images. This is a deliberate, honest
  tradeoff -- read the images section separately from the main body text.

  - Single file mode: the "<name>/" folder is created next to the source
    file, or at -o/--output (treated as the exact destination folder) if
    given.
  - Batch/directory mode: a "<name>/" folder is created next to each source
    file, or under -o/--output (treated as a parent directory, created if
    missing) if given, preserving relative subfolder structure when
    --recursive is used.
  - If a document has no embedded images, no "img/" folder or "Extracted
    Images" section is created.

Exit codes:
  0 - all requested conversions succeeded
  1 - one or more conversions failed (partial success in batch mode)
  2 - a required dependency ("markitdown" or "pymupdf") is not installed
  3 - invalid input (path not found, or single-file input is not .pdf)
"""
import argparse
import sys
from pathlib import Path

EXIT_OK = 0
EXIT_CONVERSION_FAILED = 1
EXIT_MISSING_DEPENDENCY = 2
EXIT_INVALID_INPUT = 3


def _import_markitdown():
    """Import MarkItDown, failing with a clear, actionable message if absent."""
    try:
        from markitdown import MarkItDown
        return MarkItDown
    except ImportError:
        print(
            "ERROR: The 'markitdown' package is not installed.\n"
            "See references/setup.md for this skill, or run:\n"
            '    pip install "markitdown[pdf]"',
            file=sys.stderr,
        )
        sys.exit(EXIT_MISSING_DEPENDENCY)


def _import_fitz():
    """Import PyMuPDF (module name 'fitz'), failing with a clear message if absent."""
    try:
        import fitz
        return fitz
    except ImportError:
        print(
            "ERROR: The 'pymupdf' package is not installed (needed for image "
            "extraction).\nSee references/setup.md for this skill, or run:\n"
            "    pip install pymupdf",
            file=sys.stderr,
        )
        sys.exit(EXIT_MISSING_DEPENDENCY)


def extract_images(fitz, pdf_path: Path, img_dir: Path):
    """Extract embedded images from pdf_path, grouped by 1-based page number.
    Returns {page_num: [filename, ...]} in per-page image order. Files are
    named 'page{P:03d}_img{N:03d}.<ext>'. Corrupt/unreadable images are
    skipped with a warning rather than aborting the whole conversion."""
    written_by_page = {}
    try:
        doc = fitz.open(str(pdf_path))
    except Exception as exc:  # noqa: BLE001
        print(f"WARNING: could not open {pdf_path} for image extraction: {exc}", file=sys.stderr)
        return written_by_page

    try:
        for page_index in range(len(doc)):
            try:
                 images = doc[page_index].get_images(full=True)
            except Exception as exc:  # noqa: BLE001
                 print(
                     f"WARNING: failed to enumerate images on page {page_index + 1} "
                     f"of {pdf_path}: {exc}",
                     file=sys.stderr,
                 )
                 continue
            if not images:
                continue
            page_files = []
            for img_idx, img in enumerate(images, start=1):
                xref = img[0]
                try:
                    base_image = doc.extract_image(xref)
                except Exception as exc:  # noqa: BLE001
                    print(
                        f"WARNING: failed to extract image xref={xref} on page "
                        f"{page_index + 1} of {pdf_path}: {exc}",
                        file=sys.stderr,
                    )
                    continue
                ext = (base_image.get("ext") or "png").lower()
                out_name = f"page{page_index + 1:03d}_img{img_idx:03d}.{ext}"
                img_dir.mkdir(parents=True, exist_ok=True)
                (img_dir / out_name).write_bytes(base_image["image"])
                page_files.append(out_name)
            if page_files:
                written_by_page[page_index + 1] = page_files
    finally:
        doc.close()

    return written_by_page


def build_image_appendix(written_by_page) -> str:
    """Build the '## Extracted Images' appendix text. Returns "" if empty."""
    if not written_by_page:
        return ""
    lines = ["", "## Extracted Images", ""]
    for page_num in sorted(written_by_page):
        lines.append(f"### Page {page_num}")
        lines.append("")
        for name in written_by_page[page_num]:
            lines.append(f"![{name}](img/{name})")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def convert_one(md, fitz, source: Path, dest_dir: Path) -> bool:
    """Convert a single .pdf file to a '<name>/' folder containing the
    Markdown file and an 'img/' folder of extracted images. Returns True on
    success."""
    try:
        result = md.convert(str(source))
    except Exception as exc:  # noqa: BLE001 - surface any conversion error
        print(f"FAILED  {source} -> {exc}", file=sys.stderr)
        return False

    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
        written_by_page = extract_images(fitz, source, dest_dir / "img")
        appendix = build_image_appendix(written_by_page)
        text = result.text_content.rstrip("\n")
        full_text = f"{text}\n{appendix}" if appendix else f"{text}\n"
        md_path = dest_dir / f"{source.stem}.md"
        md_path.write_text(full_text, encoding="utf-8")
    except OSError as exc:
        print(f"FAILED  {source} -> could not write output in {dest_dir}: {exc}", file=sys.stderr)
        return False

    img_count = sum(len(v) for v in written_by_page.values())
    img_note = f", {img_count} image(s)" if img_count else ""
    print(f"OK      {source} -> {md_path}{img_note}")
    return True


def find_pdf_files(root: Path, recursive: bool):
    """Return (pdf_files, skipped_count) for files directly/recursively under root."""
    pattern_iter = root.rglob("*") if recursive else root.iterdir()
    pdf_files = []
    skipped = 0
    for entry in pattern_iter:
        if entry.is_dir():
            continue
        if entry.suffix.lower() == ".pdf":
            pdf_files.append(entry)
        else:
            skipped += 1
    return sorted(pdf_files), skipped


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("input", help="Path to a .pdf file or a directory of .pdf files")
    parser.add_argument(
        "-o", "--output",
        help=(
            "Destination folder for the '<name>/' output (single-file mode), "
            "or parent directory under which each '<name>/' output folder is "
            "created (batch mode)"
        ),
    )
    parser.add_argument(
        "--recursive", action="store_true",
        help="When input is a directory, also search subdirectories",
    )
    args = parser.parse_args()

    MarkItDown = _import_markitdown()
    fitz = _import_fitz()
    md = MarkItDown()

    source = Path(args.input)
    if not source.exists():
        print(f"ERROR: Input path not found: {source}", file=sys.stderr)
        return EXIT_INVALID_INPUT

    if source.is_file():
        if source.suffix.lower() != ".pdf":
            print(
                f"ERROR: Unsupported file type '{source.suffix}'. "
                "This skill only converts .pdf files.",
                file=sys.stderr,
            )
            return EXIT_INVALID_INPUT
        dest_dir = Path(args.output) if args.output else source.parent / source.stem
        return EXIT_OK if convert_one(md, fitz, source, dest_dir) else EXIT_CONVERSION_FAILED

    # Directory / batch mode
    pdf_files, skipped = find_pdf_files(source, args.recursive)
    if skipped:
        print(f"NOTE: skipped {skipped} non-.pdf file(s) in {source}")
    if not pdf_files:
        print(f"ERROR: No .pdf files found under {source}", file=sys.stderr)
        return EXIT_INVALID_INPUT

    out_dir = Path(args.output) if args.output else None
    success_count = 0
    for pdf_path in pdf_files:
        if out_dir is not None:
            rel = pdf_path.relative_to(source)
            dest_dir = out_dir / rel.parent / pdf_path.stem
        else:
            dest_dir = pdf_path.parent / pdf_path.stem
        if convert_one(md, fitz, pdf_path, dest_dir):
            success_count += 1

    total = len(pdf_files)
    print(f"\nConverted {success_count}/{total} file(s).")
    return EXIT_OK if success_count == total else EXIT_CONVERSION_FAILED


if __name__ == "__main__":
    sys.exit(main())
