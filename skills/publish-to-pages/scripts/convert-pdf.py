#!/usr/bin/env python3
"""Convert a PDF to a self-contained HTML presentation.

Each page is rendered as a PNG image (via pdftoppm) and base64-embedded
into a single HTML file with slide navigation (arrows, swipe, click).

Requirements: poppler-utils (pdftoppm)
Usage: python3 convert-pdf.py input.pdf [output.html]
"""

import base64
import glob
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def convert(pdf_path: str, output_path: str | None = None, dpi: int = 150):
    pdf_path = str(Path(pdf_path).resolve())
    if not Path(pdf_path).exists():
        print(f"Error: {pdf_path} not found")
        sys.exit(1)

    # Check for pdftoppm
    if subprocess.run(["which", "pdftoppm"], capture_output=True).returncode != 0:
        print("Error: pdftoppm not found. Install poppler-utils:")
        print("  apt install poppler-utils  # Debian/Ubuntu")
        print("  brew install poppler       # macOS")
        sys.exit(1)

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
                b64 = base64.b64encode(f.read()).decode()
            slides_html.append(
                f'<section class="slide">'
                f'<div class="slide-inner">'
                f'<img src="data:image/png;base64,{b64}" alt="Page {i}">'
                f'</div></section>'
            )

    # Try to extract title from filename
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

    output = output_path or str(Path(pdf_path).with_suffix('.html'))
    Path(output).write_text(html, encoding='utf-8')
    print(f"Converted to: {output}")
    print(f"Pages: {len(slides_html)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: convert-pdf.py <file.pdf> [output.html]")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
