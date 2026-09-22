# Environment Setup for convert-excel-to-md

Follow these steps exactly, in order, before running `scripts/convert_excel_to_md.py`
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

## 3. Install MarkItDown with Excel (.xlsx) support

Use the `scripts/requirements.txt` file bundled with this skill to install a pinned,
known-good version of the dependency:

```powershell
python -m pip install -r scripts/requirements.txt
```

This pulls in `markitdown[xlsx]` (MarkItDown's XLSX table conversion
dependencies, which include `pandas` and `openpyxl`). No extra package is needed for image extraction — this
skill's script reads embedded images directly from the `.xlsx` zip
structure using Python's built-in `zipfile` and `xml` modules.

## 4. Verify the install

```powershell
python -c "from markitdown import MarkItDown; print('markitdown OK')"
```

Expect to see `markitdown OK` printed with no errors. If you see
`ModuleNotFoundError: No module named 'markitdown'`, repeat step 3 — pip may
be installing into a different Python environment than the one being
invoked (check `python -m pip --version` shows the same path as `python
--version`'s interpreter).

## Notes

- This setup only needs to be done once per environment/virtual environment,
  not once per conversion.
- `convert_excel_to_md.py` itself also checks for `markitdown` at startup
  and prints a pointer back to this file if it's missing, so re-running
  setup is safe and idempotent.
- Only `.xlsx` is supported by this skill. Legacy binary `.xls` files are
  out of scope (a completely different, harder-to-parse file format) — ask
  the user to re-save the file as `.xlsx` (Excel: File > Save As > Excel
  Workbook (.xlsx)) if one is encountered.
- Chart objects (as opposed to embedded pictures) are not extracted as
  images — only raster pictures actually embedded in the workbook's
  `xl/media` folder are. Native Excel charts would need to be rendered by
  Excel/LibreOffice to become images, which this lightweight skill does not
  attempt.
