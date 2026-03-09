# Automate This

You know that thing you do every week — the fifteen-click, four-app, copy-paste-into-spreadsheet-and-email-it process that makes you want to throw your laptop into the ocean? Record yourself doing it once, hand the video to Copilot CLI, and let it write the script that does it for you.

## How It Works

1. **Record your screen.** Use QuickTime, OBS, Loom, or whatever you already have. Do the process exactly the way you normally do. If you want to talk through it while you record ("now I'm downloading this report because finance needs it every Monday"), even better — the plugin transcribes your narration and uses it to understand *why* you're doing each step, not just *what* you're clicking.

2. **Drop the recording on your Desktop** (or anywhere — it just needs a file path).

3. **Tell Copilot CLI to analyze it:**
   ```
   copilot
   > /skills
   > (select automate-this)
   > Analyze ~/Desktop/weekly-report-process.mov and automate it
   ```

4. **Review what it found.** The plugin extracts frames from your video every couple of seconds, transcribes any narration, and reconstructs your process as a numbered step list. It asks you to confirm it got it right before proposing anything.

5. **Pick your automation level.** You'll get up to three proposals ranging from "here's a one-liner that handles the worst part" to "here's a full script with scheduling and error handling." Each one uses tools you already have installed — no surprise dependency chains.

## What Happens Under the Hood

The plugin uses `ffmpeg` to pull frames and audio from your recording. If you narrated, it uses OpenAI's Whisper (running locally on your machine, not in the cloud) to transcribe what you said. The frames go to the AI model, which can read text on screen, identify applications, see what you're clicking, and follow the flow of your process.

Before proposing automation, the plugin checks your environment — what's installed, what shell you use, what scripting languages are available — so it only suggests things you can actually run without spending an hour on setup.

## Prerequisites

- **ffmpeg** (required) — for extracting frames and audio from your recording
  ```bash
  brew install ffmpeg
  ```

- **Whisper** (optional) — only needed if your recording has narration
  ```bash
  pip install openai-whisper
  ```
  Or the C++ version: `brew install whisper-cpp`

If Whisper isn't installed and your recording has audio, the plugin will let you know and offer to proceed with visual-only analysis.

## Installation

```bash
copilot plugin install automate-this@awesome-copilot
```

## What Gets Analyzed Well

The plugin works best when your recording clearly shows what you're doing. Some examples of processes people automate with this:

- **Report generation** — downloading data from a dashboard, filtering it, formatting it, sending it to someone
- **File organization** — sorting downloads into folders, renaming files by date, cleaning up duplicates
- **Data entry** — copying information from one app and entering it into another
- **Dev environment setup** — the sequence of commands and config changes you run every time you start a new project
- **Repetitive terminal workflows** — running the same sequence of commands with different inputs
- **Email-based workflows** — pulling data from emails, processing it, replying with results

## What Stays Manual

The plugin proposes automation for mechanical steps. It preserves human judgment — if your recording shows you pausing to review something or making a decision based on what you see, that step stays manual in the automation with a prompt for your input.

## Example

Say you record yourself doing a weekly task: you open a browser, navigate to an internal dashboard, download three CSV exports, open each in Excel, filter for rows marked "pending," combine them into one sheet, and email it to your manager.

The plugin would reconstruct that process, confirm it with you, and propose something like:

- **Tier 1:** A `curl` command that downloads all three CSVs in one shot (if the dashboard has direct download URLs), skipping the browser entirely.
- **Tier 2:** A Python script that downloads the CSVs, filters for "pending" rows using pandas, merges them, and saves the result — ready to attach to an email.
- **Tier 3:** The same script, plus it sends the email automatically via your mail client and runs every Monday at 8am via `launchd`.

Each tier includes the working code, instructions to test it with a dry run, and how to undo anything if it goes sideways.

## Privacy

Frame extraction (ffmpeg) and audio transcription (Whisper) run entirely on your machine. Extracted frames and audio are written to a secure temporary directory and deleted when analysis is complete. The extracted frames and transcript are sent to the AI model powering your Copilot CLI session for analysis — this is the same model and data pipeline used by all Copilot interactions. No data is sent to additional third-party services beyond what Copilot already uses.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
