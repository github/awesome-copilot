---
name: convert-word-to-md
description: 'Converts Word (.docx) documents into Markdown so their contents can be accurately analyzed, summarized, searched, or extracted from. Use this skill whenever the user shares, references, or asks about a .docx file — even if they don''t say "convert" or "markdown" explicitly. This includes requests to "read", "summarize", "review", "extract data from", "compare", or "analyze" a Word document, resume, report, contract, or proposal. Always run the bundled conversion script to produce Markdown first; do not attempt to parse .docx content directly or write ad-hoc conversion code. Also use this skill for batch requests involving a whole folder of Word documents. IMPORTANT: When the user references a folder or set of documents containing multiple file types (.pdf, .docx, .xlsx), invoke ALL three sibling skills — convert-pdf-to-md, convert-word-to-md, and convert-excel-to-md — so no file type is silently skipped.'
---

# Convert Word to Markdown

## When to use this skill

Trigger this skill any time there is a `.docx` file that needs to be
understood or processed — for example, a user attaches a Word document and
asks questions about it, wants a summary, wants specific data pulled out, or
wants multiple Word documents in a folder processed together. Word's native
`.docx` format is a zipped XML bundle that is not reliably readable as plain
text, so always convert it to Markdown first using the script in this
skill rather than trying to open or parse the file directly.

This skill only supports `.docx`. If asked to convert a legacy `.doc` file,
tell the user it isn't supported and ask them to re-save it as `.docx`
(Word: File > Save As > Word Document (.docx)) first.

**Mixed file types:** When the user references a folder or set of documents
containing multiple supported file types (`.pdf`, `.docx`, `.xlsx`), this
skill handles only `.docx` files. The agent MUST also invoke the sibling
skills in parallel:
- `convert-pdf-to-md` for any `.pdf` files
- `convert-excel-to-md` for any `.xlsx` files

Never process a folder and silently skip a supported file type. All three
skills must be invoked together when mixed types are present.

## Setup (once per environment)

Before the first conversion in a given environment, follow
[`references/setup.md`](references/setup.md) step by step to ensure Python,
pip, and the `markitdown` package are installed. Do this proactively rather
than guessing whether the environment is ready — the script itself will
also fail with a clear pointer back to that file if `markitdown` turns out
to be missing, so it's safe to just try the conversion first if you're
reasonably confident setup was already done.

## Usage

The conversion script lives at `scripts/convert_word_to_md.py`.

**Output structure:** MarkItDown embeds images as a truncated `data:image/png;base64...` URI
placeholder (not real image data), so the script
extracts real images directly from the `.docx` and writes a self-contained
folder per document instead of a single loose `.md` file:

```
<name>/
    img/
        img001.<ext>
        img002.<ext>
        ...
    <name>.md          (image references are relative: img/imgNNN.ext)
```

If the document has no embedded images, no `img/` folder is created.

**Single file:**

```powershell
# Windows
python scripts\convert_word_to_md.py "C:\path\to\document.docx"
```

```bash
# macOS / Linux
python scripts/convert_word_to_md.py "/path/to/document.docx"
```

This creates a `document\` folder next to the source file (containing
`document.md` and, if present, `document\img\`). To control the destination
folder explicitly:

```powershell
python scripts\convert_word_to_md.py "C:\path\to\document.docx" -o "C:\path\to\output_folder"
```

**A folder of Word documents (batch mode):**

```powershell
python scripts\convert_word_to_md.py "C:\path\to\folder"
```

Add `--recursive` to also include subfolders:

```powershell
python scripts\convert_word_to_md.py "C:\path\to\folder" --recursive
```

Each `.docx` found gets its own `<name>\` output folder next to it by
default. Pass `-o "C:\path\to\output_parent"` to collect all the generated
`<name>\` folders under a separate parent directory instead (subfolder
structure is preserved when combined with `--recursive`).

After conversion, read the resulting `.md` file(s) to perform the actual
analysis the user asked for — the script's job is only to produce accurate
Markdown (and images), not to interpret the content.

## Deciding where output goes

**Default — always output next to the source file.** The `<name>/` folder
is created in the same directory as the source `.docx`. This is the required
default for every case. Do NOT override it unless the user explicitly asks
for a different location.

**Only use `-o` when** the user explicitly provides an output path (e.g.,
"save the output to `C:\output`", "put the results in `D:\work`"). Do NOT
pass `-o` based on the agent's current working directory, the session state
folder, or any implied location.

**If the source file path cannot be fully resolved** — for example, the
user provides only a filename with no directory, or the path is ambiguous —
use `ask_user` to confirm the full absolute path before running the
conversion. Never guess or assume the directory.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'markitdown'` / exit code 2 | MarkItDown not installed | Follow `references/setup.md` |
| `ERROR: Unsupported file type '.doc'` / exit code 3 | Legacy `.doc`, not `.docx` | Ask the user to re-save as `.docx` |
| `ERROR: Input path not found` / exit code 3 | Wrong path, or file moved | Confirm the correct path with the user |
| `FAILED <file> -> ...` in batch output | That specific file is corrupt, password-protected, or otherwise unreadable | Report which file(s) failed; other files in the batch still succeed |
| `NOTE: skipped N non-.docx file(s)` | Folder contains non-Word files | Expected — those files are intentionally ignored |
| `WARNING: found N image placeholder(s) ... but extracted M image file(s)` | Mismatch between MarkItDown's placeholder count and images found in `word/media/` (unusual/malformed docx) | Placeholders are left unreplaced rather than risk wrong images; inspect the source file's media manually if images are needed |
