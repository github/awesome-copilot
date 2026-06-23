---
name: 'Fix Broken Links'
description: 'Checks changed web files for broken hyperlinks and SEO anchor issues after each Copilot tool use.'
tags: ['links', 'seo', 'html', 'markdown', 'post-tool-use']
---

# Fix Broken Links Hook

Scans recently-changed web files for broken hyperlinks after each GitHub Copilot
tool use. For each broken URL the hook tries common spelling variations, then hands
the link to the Copilot CLI agent for suggested replacements, and presents an
interactive fix menu. Generic anchor text (`click here`, `read more`, etc.) is
flagged as an SEO issue.

## Overview

Broken links accumulate silently in web projects. Running on the `postToolUse`
event, this hook checks the web files the agent just edited — and only those —
right after each change, so you can fix, replace, or remove each broken link in
the same terminal session.

The hook has two modes:

- **With file paths** (the edited files injected from the hook payload, or paths
  passed on the command line): it checks each link, looks up replacement
  candidates, and presents the interactive fix menu.
- **With no file arguments**: it simply lists the broken links it finds — no
  replacement lookups and no prompts.

## Features

- **Self-contained core**: bash and PowerShell ports — no runtime to install (the optional agent
 hand-off reuses the Copilot CLI you already have)
- **Edited-files scope**: as a `postToolUse` hook it only checks the files the agent just changed —
 never a full repo scan
- **Format-agnostic link scan**: extracts every `http(s)` URL with `grep`, covering HTML, Markdown,
 JS/TS, JSON, CSS, SQL, and templates at once
- **Automatic URL healing**: tries www, https, and trailing-slash variations
- **Agent-assisted suggestions**: hands the broken link to the Copilot CLI agent (a lightweight,
 low-token `gpt-5-mini` prompt with no tools) for replacement candidates; if the CLI is missing or
  errors, it simply offers none
- **SEO audit**: flags anchor text that is too generic to benefit search ranking
- **Large-file guard**: prompts before checking files with more than 50 links
- **Interactive fix menu**: replace with suggestion, enter custom URL, strip tag keeping text, or
 skip
- **Standard tools only**: `curl`, `grep`, `sed` — present on any POSIX system

## Installation

1. Copy the hook folder to your repository:

   ```bash
   cp -r hooks/fix-broken-links .github/hooks/
   ```

2. Make the script executable:

   ```bash
   chmod +x .github/hooks/fix-broken-links/link-fix.sh
   ```

3. Commit the hook configuration to your repository's default branch.

## Configuration

The hook is configured in `hooks.json` to run on the `postToolUse` event:

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": ".github/hooks/fix-broken-links/link-fix.sh",
        "powershell": ".github/hooks/fix-broken-links/link-fix.ps1",
        "cwd": ".",
        "timeoutSec": 120
      }
    ]
  }
}
```

## Supported Source Types

Links are found by scanning each file for `http(s)://` URLs, so the same logic
covers every format that embeds absolute URLs:

| Source | Examples matched |
| --- | --- |
| HTML | `<a href>`, `<img src>`, `<script src>`, `<link href>`, `<iframe src>` |
| Markdown | `[text](url)`, `[text][ref]`, bare `<url>` |
| JS / TS / Vue / Svelte | `fetch()`, `XMLHttpRequest.open()`, jQuery, axios, `href:`/`url:` props |
| JSON / JSONL | any string value that is an absolute URL |
| CSS | `url(...)` |
| SQL | URL literals in query strings |
| Templates | Jinja2, ERB, EJS, Handlebars, Pug |

The `d` (remove) action understands HTML `<a>` wrappers and Markdown `[text](url)`
links specifically, keeping the visible text. Other source types support
`r` (replace) and `c` (custom) via literal URL substitution.

## Fix Options

For each broken link:

| Key | Action |
| --- | --- |
| `r` | Replace with the suggested URL (a working variation, or an agent-proposed alternative) |
| `d` | Strip the link wrapper, keeping the visible text as plain text |
| `c` | Enter a custom replacement URL |
| `s` | Skip |

## Example Output

```text
  Checking 2 link(s) in docs/guide.md ...
    BROKEN (404) https://example.com/old-page

------------------------------------------------------------
  SEO anchor issues (consider descriptive link text)
    docs/guide.md: <a href="https://example.com/old-page">click here</a>

============================================================
  fix-broken-links report
============================================================

  [1] docs/guide.md
    URL : https://example.com/old-page
    HTTP: 404

    r  Replace -> https://example.com/docs/install
    1  Replace -> https://example.com/docs/getting-started
    d  Remove link, keep text
    c  Custom replacement URL
    s  Skip
  > r
    replaced

  1 file(s) updated:
    docs/guide.md
```

With no file arguments (or when the edited file carries no checkable links) the
hook stops after the broken-link list — the menu above is skipped.

## Requirements

- `curl` — HTTP status checks (the hook exits quietly if absent)
- `grep`, `sed` — link extraction (standard on any POSIX system)
- `jq` — required by the bash hook to parse the postToolUse JSON payload and discover edited files
- Bash 4+ (for `link-fix.sh`); on Windows use Git Bash or WSL, or run the PowerShell 7+ port
 `link-fix.ps1`
- `copilot` (GitHub Copilot CLI) — optional; powers the agent-suggested replacements. Without it,
 only verified spelling variations are offered
- `git` is used for changed-file discovery; the hook falls back to a full repo scan without it

## File Structure

```
.github/hooks/fix-broken-links/
├── hooks.json      GitHub Copilot hook configuration
├── link-fix.sh     Bash hook implementation
├── link-fix.ps1    PowerShell 7+ port
└── README.md       This file
```

## Limitations

- Only checks absolute `http://` and `https://` URLs; relative paths require a running server
- Dynamic links generated at runtime from database queries are not detectable from source alone
- When `copilot` suggestions are enabled, broken URLs are sent to the Copilot service as prompt input
- Agent-suggested replacements are model proposals and are not verified live; confirm each before
 accepting
- The `d` (remove) action targets HTML and Markdown link syntax; bare URLs in code are best handled
 with `r` or `c`
