---
name: vardoger-analyze
description: "Use when the user asks to personalize the GitHub Copilot CLI assistant, adapt Copilot to their style, use vardoger, or analyze their Copilot CLI conversation history. Reads the local session directory at `~/.copilot/session-state/`, extracts recurring preferences and conventions, and writes a fenced personalization block into `~/.copilot/copilot-instructions.md`. Runs entirely on the user's machine via the local `vardoger` CLI (`pipx install vardoger`); no network calls and no uploads. Triggers: 'personalize my copilot', 'analyze my copilot history', 'tailor copilot to me', 'run vardoger', 'update my copilot instructions from history', 'make copilot learn my style'."
license: Apache-2.0
---

# Analyze Copilot CLI history and generate personalized instructions

Drive the local `vardoger` CLI to read the user's GitHub Copilot CLI conversation history, extract behavioral patterns, and write a personalization block into `~/.copilot/copilot-instructions.md`.

## How it works

`vardoger` prepares the history in batches. You (the assistant) summarize each batch for behavioral signals, then synthesize all summaries into a final personalization. `vardoger` writes the result, fenced by `<!-- vardoger:start -->` / `<!-- vardoger:end -->` markers so any hand-authored rules in the same file are preserved.

## Sandbox note (read before running any command)

`vardoger` reads and writes files **outside** the current workspace:

- Reads Copilot CLI history from `~/.copilot/session-state/`.
- Writes a checkpoint state file to `~/.vardoger/state.json` (created on first run).
- Writes the final personalization to `~/.copilot/copilot-instructions.md`.

When the host asks to approve a `vardoger` command, grant it write access beyond the workspace. Otherwise the first `vardoger prepare` call will fail with `PermissionError: ... ~/.vardoger/state.tmp` because the sandbox blocks writes outside the current working directory.

## Workflow

1. Verify the `vardoger` CLI is installed and fail fast with install guidance if not.
2. Check staleness with `vardoger status --platform copilot --json` and stop early if the personalization is still fresh.
3. Get batch metadata with `vardoger prepare --platform copilot` to learn the number of batches.
4. For each batch, run `vardoger prepare --platform copilot --batch <N>` and write a concise bullet summary of the behavioral signals.
5. Get the synthesis prompt with `vardoger prepare --platform copilot --synthesize`.
6. Synthesize all batch summaries into a single personalization following the synthesis prompt.
7. Write the result by piping the personalization into `vardoger write --platform copilot --scope global` (or `--scope project --project <path>`).
8. Report back to the user what was written, where, and that the write is idempotent.

## Steps

### 1. Verify vardoger is installed

```bash
if ! command -v vardoger >/dev/null 2>&1; then
  cat <<'INSTALL_EOF'
vardoger CLI is not installed.

This skill calls the `vardoger` CLI to read your Copilot CLI history and
write a personalization file, so the CLI must be on PATH.

Install options:

  # Recommended:
  pipx install vardoger

  # Or run without installing:
  uvx vardoger --help

If you do not have pipx, see https://pipx.pypa.io/stable/installation/.

Project page: https://github.com/dstrupl/vardoger

After installing, re-run the personalization request.
INSTALL_EOF
  exit 1
fi
```

### 2. Check if a refresh is needed

```bash
vardoger status --platform copilot --json
```

If the output shows `"is_stale": false`, tell the user their personalization is up to date and ask if they want to re-run anyway. If stale or never generated, continue with the analysis.

### 3. Get batch metadata

```bash
vardoger prepare --platform copilot
```

This prints JSON like `{"batches": 3, "total_conversations": 29}`. Note the number of batches. Tell the user: "Found N conversations in M batches. Analyzing..."

### 4. Summarize each batch

For each batch number from 1 to N, run:

```bash
vardoger prepare --platform copilot --batch 1
```

The output contains a summarization prompt followed by conversation data. Read the output carefully and produce a concise bullet-point summary of the behavioral signals you observe in that batch. Keep your summary for later.

Tell the user which batch you are processing: "Analyzing batch 1 of N..."

Repeat for all batches (`--batch 2`, `--batch 3`, etc.).

### 5. Get the synthesis prompt

```bash
vardoger prepare --platform copilot --synthesize
```

### 6. Synthesize the personalization

Following the synthesis prompt, combine all your batch summaries into a single personalization. The output should be clean markdown with actionable instructions for an AI assistant.

### 7. Write the result

Pipe your personalization to `vardoger`:

```bash
echo "YOUR_PERSONALIZATION_HERE" | vardoger write --platform copilot --scope global
```

Replace `YOUR_PERSONALIZATION_HERE` with the actual personalization markdown you generated. `--scope global` writes to `~/.copilot/copilot-instructions.md`; use `--scope project --project <path>` to scope the write to a specific repository instead.

### 8. Report to the user

Tell the user what was written and where. Mention they can ask you to re-run vardoger any time to update the personalization, and that writes are idempotent (the fenced block is replaced; anything outside it is preserved).

## When to use

- When the user asks to personalize their Copilot CLI assistant.
- When the user asks to analyze their Copilot CLI conversation history.
- When the user mentions "vardoger".
