---
applyTo: '**'
description: 'Cross-agent AI work digest. Reads sessions from Hermes, OpenAI Codex CLI, Claude Code, GitHub Copilot CLI, and Continue. Outputs a value report with effort estimates, project groupings, and ROI in Markdown, JSON, and HTML formats.'
---

# whatidid — Cross-Agent AI Work Digest

Generate a comprehensive report of everything your local AI tools have done:
estimated human-equivalent hours, dollar value delivered, project breakdowns,
and a confidence-scored ROI summary.

## Instructions

- Install with `pip install whatidid`
- Run `whatidid --days 7` to generate a report for the last 7 days
- The tool reads local session stores from all installed AI agents — it never calls any external API
- Output is written to `~/whatidid-reports/` as HTML, Markdown, and JSON

## Supported Sources

- **Hermes Agent** — `~/.hermes/sessions.db`
- **OpenAI Codex CLI** — `~/.codex/`
- **Claude Code** — `~/.claude/projects/`
- **GitHub Copilot CLI** — `~/.config/github-copilot/`
- **Continue** — `~/.continue/`

## Key CLI Options

```
whatidid --days INT            # look-back window (default: 7)
whatidid --hourly-rate FLOAT   # blended rate for value calc (default: 125.0)
whatidid --max-sessions INT    # cap session count (default: 100)
whatidid --no-html             # skip HTML output
whatidid --output-dir PATH     # report destination
```

## Output

The report includes:
- Sessions, projects, estimated hours, and value delivered
- AI credit cost estimate and value multiple (e.g. 1318×)
- Work grouped by project and workstream type
- Confidence score with evidence quality notes
- Methodology and caveats so the report is safe to share

## GitHub Action

```yaml
- uses: th0mps0nty/whatidid/action@v1
  with:
    days: '7'
    hourly-rate: '125'
    upload-artifact: 'true'
```

## Privacy and Safety

- Never reads `.env`, credential files, keychains, tokens, or auth stores
- Automatically redacts API keys, bearer tokens, and private key patterns
- Local-only: no network calls, no telemetry

## Repository

https://github.com/th0mps0nty/whatidid
