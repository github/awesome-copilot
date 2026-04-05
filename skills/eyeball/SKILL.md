---
name: eyeball
description: 'Document analysis with inline source screenshots. When you ask Copilot to analyze a document, Eyeball generates a Word doc where every factual claim includes a highlighted screenshot from the source material so you can verify it with your own eyes.'
---

# Eyeball

Analyze documents with visual proof. When activated, Eyeball produces a Word document on the user's Desktop where every factual assertion includes an inline screenshot from the source material with the cited text highlighted in yellow.

## Activation

When the user invokes this skill (e.g., "use eyeball", "run eyeball on this", "eyeball this document"), respond with:

> **Eyeball is active.** I'll analyze the document and produce a Word doc with inline source screenshots so you can verify every claim with your own eyes.

Then follow the workflow below.

## Supported Sources

- **Local files:** Word documents (.docx, .doc), PDFs (.pdf), RTF files
- **Web URLs:** Any publicly accessible web page

## Tool Location

The Eyeball Python utility is located at:
```
<plugin_dir>/skills/eyeball/tools/eyeball.py
```

To find the actual path, run:
```bash
find ~/.copilot/installed-plugins -name "eyeball.py" -path "*/eyeball/*" 2>/dev/null
```

If not found there, check the project directory or the user's home directory for the eyeball repo.

## First-Run Setup

Before first use, check that dependencies are installed:

```bash
python3 <path-to>/eyeball.py setup-check
```

If anything is missing, install the required dependencies:
```bash
pip3 install pymupdf pillow python-docx playwright
python3 -m playwright install chromium
```

On Windows, also install pywin32 for Word automation:
```bash
pip install pywin32
```

## Workflow

Follow these steps exactly. The order matters.

### Step 1: Read the source text

Before writing any analysis, extract and read the full text of the source document:

```bash
python3 <path-to>/eyeball.py extract-text --source "<path-or-url>"
```

Read the output carefully. Identify actual section numbers, headings, page numbers, and key language.

**CRITICAL:** Do not skip this step. Do not write analysis based on assumptions about how the document is structured. Read the actual text.

### Step 2: Write analysis with exact citations

For each point in your analysis, you must:

1. **Reference the correct section number as it appears in the document** (e.g., "Section 9" not "Section 8" because you assumed the numbering).
2. **Reference the correct page number** where the section appears in the extracted text.
3. **Select anchors that are verbatim phrases from the source** that directly support your claim.

### Step 3: Select anchors correctly

This is the most important step. Anchors determine what gets highlighted in the screenshots.

**DO:**
- Use verbatim phrases from the source text that directly support your assertion
- Use multiple anchors to span the full range of text the reader should see
- Use specific, uncommon phrases that appear only where you intend

**DO NOT:**
- Use generic topic labels (e.g., "Confidentiality") that appear throughout the document
- Use section titles alone when they appear as cross-references elsewhere
- Use single common words that match in many places

**Examples:**

WRONG -- uses a generic topic label that matches everywhere:
```json
{"anchors": ["User-Generated Content"], "target_page": 8}
```

RIGHT -- uses the specific language that supports the claim:
```json
{"anchors": ["retain ownership", "Ownership of Content, Right to Post"], "target_page": 8}
```

WRONG -- section title appears as a cross-reference on earlier pages:
```json
{"anchors": ["LIMITATION OF LIABILITY"]}
```

RIGHT -- includes the section number for precision, targets the correct page:
```json
{"anchors": ["12. LIMITATION OF LIABILITY", "INDIRECT", "CONSEQUENTIAL"], "target_page": 13}
```

### Step 4: Build the analysis document

Construct a JSON array of sections and call the build command:

```bash
python3 <path-to>/eyeball.py build \
  --source "<path-or-url>" \
  --output ~/Desktop/<title>.docx \
  --title "Analysis Title" \
  --subtitle "Source description" \
  --sections '[
    {
      "heading": "1. Section Title",
      "analysis": "Your analysis text here. Reference Section X on page Y...",
      "anchors": ["verbatim phrase 1", "verbatim phrase 2"],
      "target_page": 5,
      "context_padding": 40
    },
    {
      "heading": "2. Another Section",
      "analysis": "More analysis...",
      "anchors": ["exact quote from source"],
      "target_pages": [10, 11],
      "context_padding": 50
    }
  ]'
```

Section object fields:
- `heading` (required): Section heading in the output document
- `analysis` (required): Your analysis text
- `anchors` (required): List of verbatim phrases from the source to search for and highlight
- `target_page` (optional): Single page number (1-indexed) to search on
- `target_pages` (optional): List of page numbers to search across (screenshots stitched vertically)
- `context_padding` (optional): Padding in PDF points above/below the anchor region (default: 40). Increase for more context.

### Step 5: Deliver the output

Save the output to the user's Desktop. Tell the user the filename and that they can open it to verify each claim against the highlighted source screenshots.

## Self-Check Before Delivery

Before saving the final document, mentally verify:

1. Does each section's analysis text reference the correct section number from the source?
2. Are the anchors verbatim phrases that appear on the target page?
3. Does each anchor directly support the claim in the analysis, not just relate to the same topic?
4. If the screenshot doesn't match the analysis, is the analysis wrong or is the anchor wrong? Fix whichever is incorrect.

## Notes

- The output document includes highlighted screenshots that are dynamically sized. If you provide multiple anchors, the screenshot expands to cover all of them.
- When a search term is not found, the output document will note this. If this happens, the anchor was likely not verbatim enough. Adjust and rebuild.
- For web pages, Playwright renders the page to PDF first. The resulting page numbers may differ from what you see in a browser. Use the extracted text output (step 1) to determine correct page numbers.
- If the user has already provided the source text or you have already read it in the current conversation, you can skip step 1. But always verify section numbers and page references against the actual text before writing analysis.
