---
name: markdown-to-word-mermaid
description: 'Export Markdown containing Mermaid code fences to Word (.docx) with embedded SVG diagrams and PNG fallbacks. Use when diagram sharpness, Office-compatible labels, or page-aware placement matters. Not for Word-to-Markdown conversion, editable Office shapes, or general slide creation.'
license: MIT
argument-hint: 'Markdown input file and optional DOCX output path'
user-invocable: true
---

# Markdown to Word with Mermaid

Export technical documents without manually replacing Mermaid fences with screenshots. The bundled converter renders each diagram locally, embeds the SVG through Office OOXML relationships, and retains a 3x PNG fallback. Word is not required to generate the file; an SVG-capable Word version is needed to inspect vector rendering.

## When to use

- A design document, runbook, or report contains Mermaid code fences and must be delivered as DOCX.
- Diagram labels must remain sharp when zoomed or printed.
- A tall diagram needs page-aware placement rather than being split across pages.

For general Markdown-to-DOCX conversion with existing PNG images, a general converter such as `md-to-docx` may be simpler. This skill focuses on rendering and packaging Mermaid diagrams. SVG embedding does not create editable Word shapes, connectors, or text boxes.

## Requirements and setup

- Python 3.10+ and the packages in [scripts/requirements.txt](scripts/requirements.txt).
- Node.js compatible with the chosen Mermaid CLI release, plus `@mermaid-js/mermaid-cli`.
- A local browser usable by Puppeteer and an installed font covering the document's characters.
- Default font: Noto Sans JP. Use `--font-family` to select another installed family.

Resolve paths relative to this skill's installation directory, not an assumed repository name. The examples below run from the skill directory. Use the user's selected Python environment (`python`, `python3`, or its absolute path).

Before installing dependencies, confirm the environment and obtain permission if required. Reuse an existing Mermaid CLI when available. Otherwise install it into a user-approved local tools directory, not globally:

```sh
python -m pip install -r scripts/requirements.txt
npm install --prefix ./run/mermaid-cli @mermaid-js/mermaid-cli
```

The local executable is `./run/mermaid-cli/node_modules/.bin/mmdc` on POSIX and `./run/mermaid-cli/node_modules/.bin/mmdc.cmd` on Windows. Keep installed dependencies out of the submitted skill package. Lock the selected dependency versions in the consuming project for reproducible installations.

On Windows the converter detects standard Chrome and Edge paths. For another browser location, set `MERMAID_BROWSER_PATH` to its absolute executable path:

```powershell
$env:MERMAID_BROWSER_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

On POSIX, use `export MERMAID_BROWSER_PATH=/absolute/path/to/browser`, or use Puppeteer's installed browser. Do not disable the browser sandbox just to make a conversion pass.

## Workflow

1. Confirm the input Markdown file, output destination, and font. If no destination is provided, use the input path with a `.docx` extension.
2. Check that the output does not exist. Never delete or overwrite an existing document; ask for a different destination.
3. Run [scripts/markdown_to_word.py](scripts/markdown_to_word.py). Preserve the user's diagram source and meaning. Do not silently repair invalid Mermaid.
4. Check the generated package and, when Word is available, inspect the document visually. Report package checks and visual checks separately.

With `mmdc` on PATH:

```sh
python scripts/markdown_to_word.py input.md --output output.docx
```

Using a workspace-local CLI on Windows:

```powershell
python scripts/markdown_to_word.py input.md --output output.docx --mermaid-cli ./run/mermaid-cli/node_modules/.bin/mmdc.cmd
```

Selecting an installed font:

```sh
python scripts/markdown_to_word.py input.md --output output.docx --font-family "Noto Sans JP" --timeout 120
```

For a reproducible example, convert [assets/example.md](assets/example.md) to a new output path. It includes English and Japanese labels, multiple diagrams, and a tall diagram.

## Conversion behavior

- Headings, paragraphs, emphasis, lists (preserving ordered list start numbers and separate list boundaries), blockquotes, tables, and code blocks become Word content.
- Each Mermaid fence renders to SVG and a 3x PNG with a per-command timeout (default: 120 seconds). Office SVG extensions reference the SVG; the normal image reference retains the PNG fallback, and drawing metadata (`title` and `descr`) includes the section heading or Mermaid `accTitle`/`accDescr` plus the diagram type.
- Output DOCX files are staged and SVG-injected inside a temporary directory before moving to the destination path so failed runs never leave partial files behind.
- The selected font is applied to Word paragraph styles and Mermaid's font configuration. Code runs use Consolas. Fonts are not embedded; unavailable fonts may be substituted.
- `htmlLabels: false` is set globally and for flowcharts to avoid HTML `foreignObject` labels that Office may not display. Check actual SVG output for unsupported constructs.
- Diagrams are centered, keep their aspect ratio, and use a non-splitting paragraph. Diagrams occupying at least 70% of the page body height start on a new page. Oversized diagrams are scaled to the page body height. Large diagrams generate a readability warning.
- A simple single-line frontmatter `title` becomes the document title; other frontmatter fields are removed from the body. This is not a full YAML metadata parser.
- Ordinary Markdown image links remain alt text and a source path or URL; they are not embedded. Raw HTML is reduced to text, not executed.

## Stop conditions and limitations

- Missing input, wrong extensions, an existing output, missing CLI, invalid Mermaid, rendering failure, or unusable SVG dimensions stop the conversion with an error.
- The converter does not call an external rendering service or a separate AI API. Dependency installation and browser execution are not an offline sandbox. Review untrusted diagram content, including external resources, before rendering it.
- Diagrams are not semantically editable Office objects. Word rendering, font substitution, and final pagination depend on the viewer and must be checked there.
- A successfully created DOCX is not proof that every diagram label is readable. Split large diagrams in the source only with the user's approval.

## Verification

Run the test suite from the skill directory:

```sh
python -m unittest discover -s tests -v
```

The ordinary suite mocks Mermaid rendering. To run the real-renderer test as well, set `MERMAID_CLI` to the CLI executable's absolute path, then run the command again. On Windows PowerShell:

```powershell
$env:MERMAID_CLI = (Join-Path $env:APPDATA "npm\mmdc.cmd")
python -m unittest discover -s tests -v
```

That test renders the bundled sample and checks the resulting DOCX's SVG references, PNG fallbacks, labels, and drawing dimensions. It does not automate Word visual inspection.

Before reporting completion:

- Count Mermaid fences and verify the same number of SVG parts and SVG image references in the DOCX.
- Confirm PNG fallback references exist and no label `foreignObject` remains in the sample's SVGs.
- In Word, inspect node names, branch labels, font, diagram placement, and page boundaries; check zoomed or printed output when sharpness matters.
- If Word or the actual renderer was unavailable, state which checks were not performed.

For contribution scope, evaluation cases, and a draft submission description, see [references/publication.md](references/publication.md). That file is maintainer guidance, not permission to publish.
## Gotchas

- `mmdc.cmd` needs Windows command handling; pass its path with `--mermaid-cli` rather than rewriting the script.
- A missing font can affect both PNG rendering and SVG display. Use a family installed on the rendering and viewing machines.
- Keep the SVG and PNG paired. Replacing SVG with a screenshot defeats the vector-preserving workflow.
- Package validation, renderer tests, agent-selection evaluation, and human visual acceptance are different checks.
