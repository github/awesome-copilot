# Environment Setup for convert-pdf-to-md

Follow these steps exactly, in order, before running `scripts/convert_pdf_to_md.py`
for the first time in a given environment. Don't skip steps or improvise
alternatives — they're written to be deterministic and safe to re-run.

## 1. Check Python is available (3.10+)

```powershell
python --version
```

- If this fails (command not found), install Python 3.10 or newer:
  - Windows: `winget install --id Python.Python.3.12 -e`
  - macOS: `brew install python@3.12`
  - Linux (Debian/Ubuntu): `sudo apt-get update && sudo apt-get install -y python3 python3-pip python-is-python3`
- If the reported version is older than 3.10, install a newer Python using
  the same command above (MarkItDown requires 3.10+).

## 2. Check pip is available

```powershell
python -m pip --version
```

- If this fails, bootstrap pip:

```powershell
python -m ensurepip --upgrade
```

## 3. Install MarkItDown with PDF support, plus PyMuPDF for image extraction

Use the `scripts/requirements.txt` file bundled with this skill to install pinned,
known-good versions of the dependencies:

```powershell
python -m pip install -r scripts/requirements.txt
```

This pulls in `markitdown[pdf]` and `pymupdf>=1.24.0`. PyMuPDF (imported as `fitz`)
is required separately because MarkItDown's PDF
converter only extracts text and tables — it has no support for embedded
images at all, so this skill's script extracts them itself.

## 4. Verify the install

```powershell
python -c "from markitdown import MarkItDown; import fitz; print('markitdown + pymupdf OK')"
```

Expect to see `markitdown + pymupdf OK` printed with no errors. If you see a
`ModuleNotFoundError`, repeat step 3 — pip may be installing into a
different Python environment than the one being invoked (check
`python -m pip --version` shows the same path as `python --version`'s
interpreter).

## Notes

- This setup only needs to be done once per environment/virtual environment,
  not once per conversion.
- `convert_pdf_to_md.py` itself also checks for `markitdown` and `fitz` at
  startup and prints a pointer back to this file if either is missing, so
  re-running setup is safe and idempotent.
- Only `.pdf` is supported by this skill — it's MarkItDown's only PDF-family
  format, so there's no legacy-format equivalent to worry about (unlike
  Word's `.doc` or Excel's `.xls`).
- Scanned/image-only PDFs (no embedded text layer) will produce little or
  no text from MarkItDown, since it does not perform OCR. The images
  themselves will still be extracted and appended, but the text body may be
  empty or near-empty in that case — mention this to the user if it happens.
