# Visual Asset Guidelines

This skill cannot bundle helper scripts, so these guidelines show how to **perform each visual-asset
ability inline** using public APIs and short, self-contained snippets you run at request time
(scratch cell or terminal).

How to use a guideline:

1. Pick the ability you need below.
2. Run the inline snippet (adjust inputs) in an ephemeral scratch file or terminal — do not save it
   into the skill, since the skill keeps only `references/`.
3. Place the returned local asset path into `layout_tree.objects` with `content.path`, `content.alt`,
   `bbox`, `z_index`, and `classification`.

Shared rules:

- Always return a **local file path** for any placed asset, plus `content.alt`.
- Record provenance (`source`, `license`, `provider`, `model`) for audits.
- On failure, write a failure manifest; never substitute a placeholder and call it generated.
- Never request secrets in chat or a prompt dialog. For cloud auth use `.env` or `az login`.

---

## 1. Icon Search

Use the public Iconify API — no key required.

- Search: `https://api.iconify.design/search?query=<q>&limit=<n>`
- Download SVG: `https://api.iconify.design/<prefix>/<name>.svg?color=%23<hex>`

```python
import json, urllib.parse, urllib.request
from pathlib import Path

def icon_search(query, limit=8, prefix=None, color=None, out_dir="assets/icons"):
    q = urllib.parse.quote(query)
    url = f"https://api.iconify.design/search?query={q}&limit={limit}"
    if prefix:
        url += f"&prefix={urllib.parse.quote(prefix)}"
    data = json.load(urllib.request.urlopen(url, timeout=15))
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    results = []
    for icon_id in data.get("icons", []):
        pfx, name = icon_id.split(":", 1)
        svg_url = f"https://api.iconify.design/{pfx}/{name}.svg"
        if color:
            svg_url += f"?color=%23{color}"
        svg_path = Path(out_dir) / f"{pfx}_{name}.svg"
        svg_path.write_bytes(urllib.request.urlopen(svg_url, timeout=15).read())
        results.append({"id": icon_id, "svg_path": str(svg_path), "license": "per-set (see iconify.design)"})
    return {"query": query, "results": results}
```

- Prefer simple, single-color icons matching the theme accent.
- Use icons as supporting cues, not replacements for required text.

---

## 2. Web Image Search

Prefer the VS Code fetch tools (`fetch_webpage`) or an MCP image-search tool you have available.
When you already have a direct image URL (from search results or the user), download it locally:

```python
import urllib.request
from pathlib import Path

def download_image(url, out_path="assets/images/img1.jpg"):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "pptify/1.0"})
    Path(out_path).write_bytes(urllib.request.urlopen(req, timeout=20).read())
    return {"url": url, "local_path": out_path}
```

- Capture `source` and `license` for attribution; verify usage rights before placing.
- Reference the saved file via `content.path`; do not hotlink remote URLs into the deck.
- Do not use image placeholders as fallback assets; select an approved asset or omit the object.

---

## 3. Raster → SVG

**Wrap mode (default, no dependencies)** — embed the raster inside an SVG so it can live in an
editable container:

```python
import base64, mimetypes
from pathlib import Path

def raster_to_svg_wrap(source, output_path):
    src = Path(source)
    mime = mimetypes.guess_type(src.name)[0] or "image/png"
    b64 = base64.b64encode(src.read_bytes()).decode()
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
        f'<image xlink:href="data:{mime};base64,{b64}" /></svg>'
    )
    Path(output_path).write_text(svg, encoding="utf-8")
    return {"source": source, "output_path": output_path, "mode": "wrap", "status": "ok"}
```

**Vector-trace mode (optional)** — only when a true vector result is needed and `vtracer` is
available in the environment:

```python
# pip/uv add vtracer first; tracing can distort text.
import vtracer
vtracer.convert_image_to_svg_py("logo.png", "logo.svg")
```

- Vector tracing can lose or distort text. Keep the original raster on visible slides when text
  fidelity matters, and place any traced SVG on a separate hidden appendix slide for reference.

---

## 4. Text → Infographic

Generate through a user-managed provider (OpenAI or Azure OpenAI). Read credentials from environment;
never accept secrets via chat.

```python
import base64, json, os
from pathlib import Path
from openai import OpenAI, AzureOpenAI  # provided by the user's environment

def text_to_infographic(prompt, output_path, provider="openai",
                        model_or_deployment="gpt-image-1", size="1024x1024"):
    manifest = {"provider": provider, "model_or_deployment": model_or_deployment,
                "output_path": output_path}
    try:
        if provider == "azure-openai":
            client = AzureOpenAI(
                azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
                api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
                api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01"),
            )
        else:
            client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        result = client.images.generate(model=model_or_deployment, prompt=prompt, size=size)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(output_path).write_bytes(base64.b64decode(result.data[0].b64_json))
        manifest["status"] = "ok"
    except Exception as exc:  # report, never fake-generate
        manifest.update(status="error", error=str(exc))
    Path(output_path).with_suffix(".manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest
```

- Collect missing values via `vscode_askQuestions`: provider, prompt, model/deployment, size, output path.
- Use `.env` or `az login` for auth; never ask for keys/tokens in chat or the dialog.
- Prefer the raster output as the visible slide asset; add any vector trace as `hidden: true`.

---

## 5. NotebookLM Infographic Bridge

NotebookLM has no public generation API, so treat this as an optional, user-configured bridge.

- If the user has a NotebookLM/MCP bridge tool configured, call it with `source_refs` + `prompt`,
  then save the returned image locally and record provenance.
- If no bridge is configured, **fall back to Text → Infographic (section 4)** or omit the asset.
- Apply the same provenance and failure-manifest rules as the other generation guidelines.
