---
name: publish-to-pages
description: 'Publish presentations and web content to GitHub Pages. Converts PPTX, PDF, HTML, or Google Slides to a live GitHub Pages URL. Handles repo creation, file conversion, Pages enablement, and returns the live URL. Use when the user wants to publish, deploy, or share a presentation or HTML file via GitHub Pages.'
---

# publish-to-pages

Publish any presentation or web content to GitHub Pages in one shot.

## 1. Prerequisites Check

Run these silently. Only surface errors:

```bash
command -v gh >/dev/null || echo "MISSING: gh CLI — install from https://cli.github.com"
gh auth status &>/dev/null || echo "MISSING: gh not authenticated — run 'gh auth login'"
command -v python3 >/dev/null || echo "MISSING: python3 (needed for PPTX conversion)"
```

`poppler-utils` is optional (PDF conversion via `pdftoppm`). Don't block on it.

## 2. Input Detection

Determine input type from what the user provides:

| Input | Detection |
|-------|-----------|
| HTML file | Extension `.html` or `.htm` |
| PPTX file | Extension `.pptx` |
| PDF file | Extension `.pdf` |
| Google Slides URL | URL contains `docs.google.com/presentation` |

Ask the user for a **repo name** if not provided. Default: filename without extension.

## 3. Conversion

### Large File Handling

Both conversion scripts automatically detect large files and switch to **external assets mode**:
- **PPTX:** Files >20MB or with >50 images → images saved as separate files in `assets/`
- **PDF:** Files >20MB or with >50 pages → page PNGs saved in `assets/`
- Files >150MB print a warning (PPTX suggests PDF path instead)

This keeps individual files well under GitHub's 100MB limit. Small files still produce a single self-contained HTML.

You can force the behavior with `--external-assets` or `--no-external-assets`.

### HTML
No conversion needed. Use the file directly as `index.html`.

### PPTX
Run the conversion script:
```bash
python3 SKILL_DIR/scripts/convert-pptx.py INPUT_FILE /tmp/output.html
# For large files, force external assets:
python3 SKILL_DIR/scripts/convert-pptx.py INPUT_FILE /tmp/output.html --external-assets
```
If `python-pptx` is missing, tell the user: `pip install python-pptx`

### PDF
Convert with the included script (requires `poppler-utils` for `pdftoppm`):
```bash
python3 SKILL_DIR/scripts/convert-pdf.py INPUT_FILE /tmp/output.html
# For large files, force external assets:
python3 SKILL_DIR/scripts/convert-pdf.py INPUT_FILE /tmp/output.html --external-assets
```
Each page is rendered as a PNG and embedded into HTML with slide navigation.
If `pdftoppm` is missing, tell the user: `apt install poppler-utils` (or `brew install poppler` on macOS).

### Google Slides
1. Extract the presentation ID from the URL (the long string between `/d/` and `/`)
2. Download as PPTX:
```bash
curl -L "https://docs.google.com/presentation/d/PRESENTATION_ID/export/pptx" -o /tmp/slides.pptx
```
3. Then convert the PPTX using the convert script above.

## 4. Publishing

### Visibility
Repos are created **public** by default. If the user specifies `private` (or wants a private repo), use `--private` — but note that GitHub Pages on private repos requires a Pro, Team, or Enterprise plan.

### Publish
```bash
bash SKILL_DIR/scripts/publish.sh /path/to/index.html REPO_NAME public "Description"
```

Pass `private` instead of `public` if the user requests it.

The script creates the repo, pushes `index.html` (plus `assets/` if present), and enables GitHub Pages.

**Note:** When external assets mode is used, the output HTML references files in `assets/`. The publish script automatically detects and copies the `assets/` directory alongside the HTML file. Make sure the HTML file and its `assets/` directory are in the same parent directory.

## 5. Output

Tell the user:
- **Repository:** `https://github.com/USERNAME/REPO_NAME`
- **Live URL:** `https://USERNAME.github.io/REPO_NAME/`
- **Note:** Pages takes 1-2 minutes to go live.

## Error Handling

- **Repo already exists:** Suggest appending a number (`my-slides-2`) or a date (`my-slides-2026`).
- **Pages enablement fails:** Still return the repo URL. User can enable Pages manually in repo Settings.
- **PPTX conversion fails:** Tell user to run `pip install python-pptx`.
- **PDF conversion fails:** Suggest installing `poppler-utils` (`apt install poppler-utils` or `brew install poppler`).
- **Google Slides download fails:** The presentation may not be publicly accessible. Ask user to make it viewable or download the PPTX manually.
