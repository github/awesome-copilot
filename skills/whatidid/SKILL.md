---
name: whatidid
description: "Generate a branded HTML impact report showing what GitHub Copilot helped you accomplish — goals delivered, human effort equivalent, skills augmented, collaboration patterns, and estimation evidence grounded in peer-reviewed research. Works with any Copilot CLI or VS Code agent session."
---

# What I Did (Copilot) — Impact Report Generator

Generate a professional impact report from your GitHub Copilot session logs. Shows what you accomplished, quantifies the human-equivalent effort, and presents it in a branded HTML report you can share with your manager or team.

## What It Does

- **Harvests** session data from `~/.copilot/session-state/` (local, private)
- **Analyses** each day's work using an AI prompt calibrated against peer-reviewed research
- **Generates** a self-contained HTML report with:
  - Goals accomplished with task-level detail
  - Human effort equivalent (research-grounded estimation)
  - Skills augmented and collaboration patterns
  - Estimation evidence with transparent methodology
- **Emails** the report via Outlook (optional)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/microsoft/What-I-Did-Copilot.git
cd What-I-Did-Copilot

# Generate a 7-day report
python whatidid.py --date 7D

# Generate and email a 30-day report
python whatidid.py --date 30D --email
```

## Requirements

- Python 3.10+
- GitHub CLI (`gh auth login`) for AI analysis
- Active Copilot CLI or VS Code agent sessions

## Privacy

Your data stays on your machine. No telemetry, no cloud uploads. The AI analysis uses your own GitHub Models API token. No one has access to your report unless you share it.

## Research Basis

Effort estimates are grounded in 13 peer-reviewed sources including Alaswad et al. 2026, Cambon et al. 2023 (Microsoft Research), and the SPACE framework. See [full methodology](https://github.com/microsoft/What-I-Did-Copilot/blob/main/docs/effort-estimation-methodology.md).
