A tool to help verify AI statements, without (or at least with fewer) context switching pains.

When AI analyzes a document and tells you "Section 10 requires mutual indemnification," how do you know Section 10 actually says that? Eyeball lets you see for yourself.

This is a Copilot CLI plugin that generates document analyses as Word files with inline screenshots of relevant portions from the source material. Every factual claim in the analysis includes a highlighted excerpt from the original document, so you can verify each assertion without switching between files or hunting for the right page.

## What it does

You give Copilot a document (Word file, PDF, or web URL) and ask it to analyze something specific. Eyeball reads the source, writes the analysis, and for each claim, captures a screenshot of the relevant section from the original document with the cited text highlighted in yellow. The output is a Word document on your Desktop with analysis text and source screenshots interleaved.

If the analysis says "Section 9.3 allows termination for cause with a 30-day cure period," the screenshot below it shows Section 9.3 from the actual document with that language highlighted. If the screenshot shows something different, the analysis is wrong and you can see it immediately.

## Installation

### Prerequisites

- [Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) installed and authenticated
- Python 3.8 or later
- One of the following for Word document support (PDFs and web URLs work without these):
  - Microsoft Word (macOS or Windows)
  - LibreOffice (any platform)

### Install the plugin

Install via the Copilot CLI plugin system. In a Copilot CLI conversation:

```
install the eyeball plugin from github/awesome-copilot
```

### Install dependencies

After installing the plugin, install the Python dependencies:

```bash
pip install pymupdf pillow python-docx playwright
python -m playwright install chromium
```

On Windows, also install pywin32 for Word automation:
```bash
pip install pywin32
```

### Verify setup

```bash
python3 skills/eyeball/tools/eyeball.py setup-check
```

This shows which source types are supported on your machine.

## How to use it

In a Copilot CLI conversation, tell it to use eyeball and what you want analyzed:

```
use eyeball on ~/Desktop/vendor-agreement.docx -- analyze the indemnification
and liability provisions and flag anything unusual
```

```
run eyeball on https://example.com/terms-of-service -- identify the
developer-friendly aspects of these terms
```

```
use eyeball to analyze this NDA for non-compete provisions
```

Eyeball activates, reads the source document, writes the analysis with exact section references, and generates a Word document on your Desktop with source screenshots inline.

## What it supports

| Source type | Requirements |
|---|---|
| PDF files | Python + PyMuPDF (included in setup) |
| Web pages | Python + Playwright + Chromium (included in setup) |
| Word documents (.docx) | Microsoft Word (macOS/Windows) or LibreOffice (any platform). On Windows, pywin32 is also required (included in setup). |

## How it works

1. Eyeball reads the full text of the source document
2. It writes analysis with exact section numbers, page references, and verbatim quotes
3. For each claim, it searches the rendered source for the cited text
4. It captures a screenshot of the surrounding region with the cited text highlighted in yellow
5. It assembles a Word document with analysis paragraphs and screenshots interleaved
6. The output lands on your Desktop

The screenshots are dynamically sized: if a section of analysis references text that spans a large region, the screenshot expands to cover it. If the referenced text appears on multiple pages, the screenshots are stitched together.

## Why screenshots instead of quoted text?

In hallucination-sensitive contexts, sometimes we need to see receipts.

Quoted text is easy to fabricate. A model can generate a plausible-sounding quote that doesn't actually appear in the source, and without checking, you'd never know. Screenshots from the rendered source are harder to fake; they show the actual formatting, layout, and surrounding context of the original document. You can see at a glance whether the highlighted text matches the claim, and the surrounding text provides context that a cherry-picked quote might omit.

## Limitations

- Word document conversion requires Microsoft Word or LibreOffice. Without one of these, you can still use Eyeball with PDFs and web URLs.
- Text search is string-matching. If the source document uses unusual encoding, ligatures, or non-standard characters, some searches may not match. The skill instructions tell the AI to use verbatim phrases from the extracted text, which handles most cases.
- Web page rendering depends on Playwright and may not perfectly capture all dynamic content (e.g., content loaded by JavaScript after page load, content behind login walls).
- Screenshot quality depends on the source formatting. Dense multi-column layouts or very small text may produce less readable screenshots. Increase the DPI setting if needed.

## License

MIT
