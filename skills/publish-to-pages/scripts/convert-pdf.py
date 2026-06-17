#!/usr/bin/env python3
"""Convert a PDF to an HTML presentation.

Each page is rendered as a PNG image (via pdftoppm). Supports external assets
mode for large files to avoid huge single-file HTML.

Requirements: poppler-utils (pdftoppm)
"""

import argparse
import base64
import glob
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def get_page_count(pdf_path):
    """Get page count using pdfinfo if available."""
    try:
        result = subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True)
        for line in result.stdout.splitlines():
            if line.startswith("Pages:"):
                return int(line.split(":")[1].strip())
    except:
        pass
    return None


def convert(pdf_path: str, output_path: str | None = None, dpi: int = 150, external_assets=None):
    pdf_path = str(Path(pdf_path).resolve())
    if not Path(pdf_path).exists():
        print(f"Error: {pdf_path} not found")
        sys.exit(1)

    if subprocess.run(["which", "pdftoppm"], capture_output=True).returncode != 0:
        print("Error: pdftoppm not found. Install poppler-utils:")
        print("  apt install poppler-utils  # Debian/Ubuntu")
        print("  brew install poppler       # macOS")
        sys.exit(1)

    file_size_mb = os.path.getsize(pdf_path) / (1024 * 1024)

    if file_size_mb > 150:
        print(f"WARNING: PDF is {file_size_mb:.0f}MB — conversion may be slow and memory-intensive.")

    page_count = get_page_count(pdf_path)

    # Auto-detect external assets mode
    if external_assets is None:
        external_assets = file_size_mb > 20 or (page_count is not None and page_count > 50)
        if external_assets:
            print(f"Auto-enabling external assets mode (file: {file_size_mb:.1f}MB, pages: {page_count or 'unknown'})")

    output = output_path or str(Path(pdf_path).with_suffix('.html'))
    output_dir = Path(output).parent

    if external_assets:
        assets_dir = output_dir / "assets"
        assets_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        prefix = os.path.join(tmpdir, "page")
        result = subprocess.run(
            ["pdftoppm", "-png", "-r", str(dpi), pdf_path, prefix],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"Error converting PDF: {result.stderr}")
            sys.exit(1)

        pages = sorted(glob.glob(f"{prefix}-*.png"))
        if not pages:
            print("Error: No pages rendered from PDF")
            sys.exit(1)

        slides_html = []
        for i, page_path in enumerate(pages, 1):
            with open(page_path, "rb") as f:
                page_bytes = f.read()

            if external_assets:
                img_name = f"img-{i:03d}.png"
                (assets_dir / img_name).write_bytes(page_bytes)
                src = f"assets/{img_name}"
            else:
                b64 = base64.b64encode(page_bytes).decode()
                src = f"data:image/png;base64,{b64}"

            slides_html.append(
                f'<section class="slide">'
                f'<div class="slide-inner">'
                f'<img src="{src}" alt="Page {i}">'
                f'</div></section>'
            )

    title = Path(pdf_path).stem.replace("-", " ").replace("_", " ")

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ height: 100%; overflow: hidden; background: #000; }}
.slide {{ width: 100vw; height: 100vh; display: none; align-items: center; justify-content: center; }}
.slide.active {{ display: flex; }}
.slide-inner {{ display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }}
.slide-inner img {{ max-width: 100%; max-height: 100%; object-fit: contain; }}
.progress {{ position: fixed; bottom: 0; left: 0; height: 4px; background: #0366d6; transition: width 0.3s; z-index: 100; }}
.counter {{ position: fixed; bottom: 12px; right: 20px; font-size: 14px; color: rgba(255,255,255,0.4); z-index: 100; }}
</style>
</head>
<body>
{chr(10).join(slides_html)}
<div class="progress" id="progress"></div>
<div class="counter" id="counter"></div>
<script>
const slides = document.querySelectorAll('.slide');
let current = 0;
function show(n) {{
    slides.forEach(s => s.classList.remove('active'));
    current = Math.max(0, Math.min(n, slides.length - 1));
    slides[current].classList.add('active');
    document.getElementById('progress').style.width = ((current + 1) / slides.length * 100) + '%';
    document.getElementById('counter').textContent = (current + 1) + ' / ' + slides.length;
}}
document.addEventListener('keydown', e => {{
    if (e.key === 'ArrowRight' || e.key === ' ') {{ e.preventDefault(); show(current + 1); }}
    if (e.key === 'ArrowLeft') {{ e.preventDefault(); show(current - 1); }}
}});
let touchStartX = 0;
document.addEventListener('touchstart', e => {{ touchStartX = e.changedTouches[0].screenX; }});
document.addEventListener('touchend', e => {{
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) {{ diff > 0 ? show(current - 1) : show(current + 1); }}
}});
document.addEventListener('click', e => {{
    if (e.clientX > window.innerWidth / 2) show(current + 1);
    else show(current - 1);
}});
show(0);
</script>
</body></html>'''

    Path(output).write_text(html, encoding='utf-8')
    output_size = os.path.getsize(output)

    print(f"Converted to: {output}")
    print(f"Pages: {len(slides_html)}")
    print(f"Output size: {output_size / (1024*1024):.1f}MB")
    print(f"External assets: {'yes' if external_assets else 'no'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert PDF to HTML presentation")
    parser.add_argument("input", help="Path to .pdf file")
    parser.add_argument("output", nargs="?", help="Output HTML path (default: same name with .html)")
    parser.add_argument("--external-assets", action="store_true", default=None,
                        help="Save page images as separate files in assets/ directory (auto-detected for large files)")
    parser.add_argument("--no-external-assets", action="store_true",
                        help="Force inline base64 even for large files")
    parser.add_argument("--dpi", type=int, default=150, help="Render DPI (default: 150)")
    args = parser.parse_args()

    ext_assets = None
    if args.external_assets:
        ext_assets = True
    elif args.no_external_assets:
        ext_assets = False

    convert(args.input, args.output, dpi=args.dpi, external_assets=ext_assets)
