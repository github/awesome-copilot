---
name: check-web-page-with-assay
description: 'Run the assay command-line QA tool on a web page you just wrote or changed, then report its one-line result. assay serves the page locally, opens it in a real Chromium browser through Playwright, drives every control it finds, and reports where the page contradicts itself. It is deterministic and needs no test code, no LLM, and no API key. Use this skill after you create or edit an HTML page, or the JavaScript or CSS a page loads, and when the user asks you to check, QA, or verify that a web page actually works. Report assay''s result and do not change code because of a finding unless the user asks.'
license: MIT
compatibility: 'Cross-platform. Requires Python 3.10+ and assay from PyPI (install with pip install assay-ui). The first run downloads Chromium through Playwright, so that run needs network access.'
---

# Check a web page with assay

A page you just wrote has no tests yet. assay opens it in a real browser, finds every control on it, uses all of them, and reports what it did and what happened. assay is a deterministic command-line tool, so it runs no model, needs no API key, and gives the same result every run.

## When to use this skill

Use this skill after the work on a page is done, not while you are still editing. Run assay once at the end, on each page you created or changed. That includes changes to the JavaScript or CSS a page loads, not only the HTML. The page is often a folder or two above the file you edited.

Do not run assay on a source tree that still needs a build. Point it at the built output, such as `dist/index.html`.

## Prerequisites

- Python 3.10 or newer.
- Install assay once with `pip install assay-ui`. The command it provides is `assay`.
- The first run downloads Chromium through Playwright, so that run needs network access. Later runs do not.

## Run exactly this

```bash
assay <the page you changed> --one-line
```

Point assay at the page itself, such as `todo.html` or `dist/index.html`. A folder also works and opens the `index.html` inside it. A small page takes seconds, and a busy one can take a minute or more.

## Report the result verbatim

Put assay's output, unchanged, as the last thing in your reply. It is one line, or one line and a short list, and the numbers and wording are assay's own:

```
assay: checked todo/todo.html, 8 checks, nothing flagged.
```

Print it whether assay flagged anything or not. Do not summarize it, reformat it, or write your own version.

If the command did not run, say so in your own words, name the page, and quote what the shell printed. Never describe a check that did not happen as one that passed.

## Do not act on a finding unless asked

Report the result and stop. Do not edit code in response to a finding in the same reply.

assay does not know what the page is for. It presses what the page offers and reports what followed, so a finding is a place to look, not a confirmed bug. A control can correctly do nothing in the state it was pressed in, and a value can be limited on purpose. If the user asks you to fix something assay found, then fix it.

## Limitations

- assay checks one page and does not crawl, so run it on each page you changed.
- assay will not build your project. Given a source tree, it says so and names the command to run.
- assay cannot check intent. A control that runs but does the wrong thing is usually not caught.
