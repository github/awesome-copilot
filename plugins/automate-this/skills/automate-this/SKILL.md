---
name: automate-this
description: 'Analyze a screen recording of a manual process and produce targeted, working automation scripts. Extracts frames and audio narration from video files, reconstructs the step-by-step workflow, and proposes automation at multiple complexity levels using tools already installed on the user machine.'
---

# Automate This

Analyze a screen recording of a manual process and build working automation for it.

The user records themselves doing something repetitive or tedious, hands you the video file, and you figure out what they're doing, why, and how to script it away.

## Prerequisites Check

Before analyzing any recording, verify the required tools are available. Run these checks silently and only surface problems:

```bash
command -v ffmpeg >/dev/null 2>&1 && ffmpeg -version 2>/dev/null | head -1 || echo "NO_FFMPEG"
command -v whisper >/dev/null 2>&1 || command -v whisper-cpp >/dev/null 2>&1 || echo "NO_WHISPER"
```

- **ffmpeg is required.** If missing, tell the user: `brew install ffmpeg` (macOS) or the equivalent for their OS.
- **Whisper is optional.** Only needed if the recording has narration. If missing AND the recording has an audio track, suggest: `pip install openai-whisper` or `brew install whisper-cpp`. If the user declines, proceed with visual analysis only.

## Phase 1: Extract Content from the Recording

Given a video file path (typically on `~/Desktop/`), extract both visual frames and audio:

### Frame Extraction

Extract frames at one frame every 2 seconds. This balances coverage with context window limits.

```bash
WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/automate-this-XXXXXX")
chmod 700 "$WORK_DIR"
mkdir -p "$WORK_DIR/frames"
ffmpeg -y -i "<VIDEO_PATH>" -vf "fps=0.5" -q:v 2 -loglevel warning "$WORK_DIR/frames/frame_%04d.jpg"
ls "$WORK_DIR/frames/" | wc -l
```

Use `$WORK_DIR` for all subsequent temp file paths in the session. The per-run directory with mode 0700 ensures extracted frames are only readable by the current user.

If the recording is longer than 5 minutes (more than 150 frames), increase the interval to one frame every 4 seconds to stay within context limits. Tell the user you're sampling less frequently for longer recordings.

### Audio Extraction and Transcription

Check if the video has an audio track:

```bash
ffprobe -i "<VIDEO_PATH>" -show_streams -select_streams a -loglevel error | head -5
```

If audio exists:

```bash
ffmpeg -y -i "<VIDEO_PATH>" -ac 1 -ar 16000 -loglevel warning "$WORK_DIR/audio.wav"

# Use whichever whisper binary is available
if command -v whisper >/dev/null 2>&1; then
  whisper "$WORK_DIR/audio.wav" --model small --language en --output_format txt --output_dir "$WORK_DIR/"
  cat "$WORK_DIR/audio.txt"
elif command -v whisper-cpp >/dev/null 2>&1; then
  whisper-cpp -m "$(brew --prefix 2>/dev/null)/share/whisper-cpp/models/ggml-small.bin" -l en -f "$WORK_DIR/audio.wav" -otxt -of "$WORK_DIR/audio"
  cat "$WORK_DIR/audio.txt"
else
  echo "NO_WHISPER"
fi
```

If neither whisper binary is available and the recording has audio, inform the user they're missing narration context and ask if they want to install Whisper (`pip install openai-whisper` or `brew install whisper-cpp`) or proceed with visual-only analysis.

## Phase 2: Reconstruct the Process

Analyze the extracted frames (and transcript, if available) to build a structured understanding of what the user did. Work through the frames sequentially and identify:

1. **Applications used** — Which apps appear in the recording? (browser, terminal, Finder, mail client, spreadsheet, IDE, etc.)
2. **Sequence of actions** — What did the user do, in order? Click-by-click, step-by-step.
3. **Data flow** — What information moved between steps? (copied text, downloaded files, form inputs, etc.)
4. **Decision points** — Were there moments where the user paused, checked something, or made a choice?
5. **Repetition patterns** — Did the user do the same thing multiple times with different inputs?
6. **Pain points** — Where did the process look slow, error-prone, or tedious? The narration often reveals this directly ("I hate this part," "this always takes forever," "I have to do this for every single one").

Present this reconstruction to the user as a numbered step list and ask them to confirm it's accurate before proposing automation. This is critical — a wrong understanding leads to useless automation.

Format:

```
Here's what I see you doing in this recording:

1. Open Chrome and navigate to [specific URL]
2. Log in with credentials
3. Click through to the reporting dashboard
4. Download a CSV export
5. Open the CSV in Excel
6. Filter rows where column B is "pending"
7. Copy those rows into a new spreadsheet
8. Email the new spreadsheet to [recipient]

You repeated steps 3-8 three times for different report types.

[If narration was present]: You mentioned that the export step is the slowest
part and that you do this every Monday morning.

Does this match what you were doing? Anything I got wrong or missed?
```

Do NOT proceed to Phase 3 until the user confirms the reconstruction is accurate.

## Phase 3: Environment Fingerprint

Before proposing automation, understand what the user actually has to work with. Run these checks:

```bash
echo "=== OS ===" && uname -a
echo "=== Shell ===" && echo $SHELL
echo "=== Python ===" && { command -v python3 && python3 --version 2>&1; } || echo "not installed"
echo "=== Node ===" && { command -v node && node --version 2>&1; } || echo "not installed"
echo "=== Homebrew ===" && { command -v brew && echo "installed"; } || echo "not installed"
echo "=== Common Tools ===" && for cmd in curl jq playwright selenium osascript automator crontab; do command -v $cmd >/dev/null 2>&1 && echo "$cmd: yes" || echo "$cmd: no"; done
```

Use this to constrain proposals to tools the user already has. Never propose automation that requires installing five new things unless the simpler path genuinely doesn't work.

## Phase 4: Propose Automation

Based on the reconstructed process and the user's environment, propose automation at up to three tiers. Not every process needs three tiers — use judgment.

### Tier Structure

**Tier 1 — Quick Win (under 5 minutes to set up)**
The smallest useful automation. A shell alias, a one-liner, a keyboard shortcut, an AppleScript snippet. Automates the single most painful step, not the whole process.

**Tier 2 — Script (under 30 minutes to set up)**
A standalone script (bash, Python, or Node — whichever the user has) that automates the full process end-to-end. Handles common errors. Can be run manually when needed.

**Tier 3 — Full Automation (under 2 hours to set up)**
The script from Tier 2, plus: scheduled execution (cron, launchd, or GitHub Actions), logging, error notifications, and any necessary integration scaffolding (API keys, auth tokens, etc.).

### Proposal Format

For each tier, provide:

```
## Tier [N]: [Name]

**What it automates:** [Which steps from the reconstruction]
**What stays manual:** [Which steps still need a human]
**Time savings:** [Estimated time saved per run, based on the recording length and repetition count]
**Prerequisites:** [Anything needed that isn't already installed — ideally nothing]

**How it works:**
[2-3 sentence plain-English explanation]

**The code:**
[Complete, working, commented code — not pseudocode]

**How to test it:**
[Exact steps to verify it works, starting with a dry run if possible]

**How to undo:**
[How to reverse any changes if something goes wrong]
```

### Application-Specific Automation Strategies

Use these strategies based on which applications appear in the recording:

**Browser-based workflows:**
- First choice: Check if the website has a public API. API calls are 10x more reliable than browser automation. Search for API documentation.
- Second choice: `curl` or `wget` for simple HTTP requests with known endpoints.
- Third choice: Playwright or Selenium for workflows that require clicking through UI. Prefer Playwright — it's faster and less flaky.
- Look for patterns: if the user is downloading the same report from a dashboard repeatedly, it's almost certainly available via API or direct URL with query parameters.

**Spreadsheet and data workflows:**
- Python with pandas for data filtering, transformation, and aggregation.
- If the user is doing simple column operations in Excel, a 5-line Python script replaces the entire manual process.
- `csvkit` for quick command-line CSV manipulation without writing code.
- If the output needs to stay in Excel format, use openpyxl.

**Email workflows:**
- macOS: `osascript` can control Mail.app to send emails with attachments.
- Cross-platform: Python `smtplib` for sending, `imaplib` for reading.
- If the email follows a template, generate the body from a template file with variable substitution.

**File management workflows:**
- Shell scripts for move/copy/rename patterns.
- `find` + `xargs` for batch operations.
- `fswatch` or `watchman` for triggered-on-change automation.
- If the user is organizing files into folders by date or type, that's a 3-line shell script.

**Terminal/CLI workflows:**
- Shell aliases for frequently typed commands.
- Shell functions for multi-step sequences.
- Makefiles for project-specific task sets.
- If the user ran the same command with different arguments, that's a loop.

**macOS-specific workflows:**
- AppleScript/JXA for controlling native apps (Mail, Calendar, Finder, Preview, etc.).
- Shortcuts.app for simple multi-app workflows that don't need code.
- `automator` for file-based workflows.
- `launchd` plist files for scheduled tasks (prefer over cron on macOS).

**Cross-application workflows (data moves between apps):**
- Identify the data transfer points. Each transfer is an automation opportunity.
- Clipboard-based transfers in the recording suggest the apps don't talk to each other — look for APIs, file-based handoffs, or direct integrations instead.
- If the user copies from App A and pastes into App B, the automation should read from A's data source and write to B's input format directly.

### Making Proposals Targeted

Apply these principles to every proposal:

1. **Automate the bottleneck first.** The narration and timing in the recording reveal which step is actually painful. A 30-second automation of the worst step beats a 2-hour automation of the whole process.

2. **Match the user's skill level.** If the recording shows someone comfortable in a terminal, propose shell scripts. If it shows someone navigating GUIs, propose something with a simple trigger (double-click a script, run a Shortcut, or type one command).

3. **Estimate real time savings.** Count the recording duration and multiply by how often they do it. "This recording is 4 minutes. You said you do this daily. That's 17 hours per year. Tier 1 cuts it to 30 seconds each time — you get 16 hours back."

4. **Handle the 80% case.** The first version of the automation should cover the common path perfectly. Edge cases can be handled in Tier 3 or flagged for manual intervention.

5. **Preserve human checkpoints.** If the recording shows the user reviewing or approving something mid-process, keep that as a manual step. Don't automate judgment calls.

6. **Propose dry runs.** Every script should have a mode where it shows what it *would* do without doing it. `--dry-run` flags, preview output, or confirmation prompts before destructive actions.

7. **Account for auth and secrets.** If the process involves logging in or using credentials, never hardcode them. Use environment variables, keychain access (macOS `security` command), or prompt for them at runtime.

8. **Consider failure modes.** What happens if the website is down? If the file doesn't exist? If the format changes? Good proposals mention this and handle it.

## Phase 5: Build and Test

When the user picks a tier:

1. Write the complete automation code to a file (suggest a sensible location — the user's project directory if one exists, or `~/Desktop/` otherwise).
2. Walk through a dry run or test with the user watching.
3. If the test works, show how to run it for real.
4. If it fails, diagnose and fix — don't give up after one attempt.

## Cleanup

After analysis is complete (regardless of outcome), clean up extracted frames and audio:

```bash
rm -rf "$WORK_DIR"
```

Tell the user you're cleaning up temporary files so they know nothing is left behind.
