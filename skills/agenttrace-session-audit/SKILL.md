---
name: agenttrace-session-audit
description: 'Audit local AI coding-agent sessions with agenttrace. Use when inspecting Claude Code, Codex CLI, Gemini CLI, Aider, Cursor, OpenCode, Kimi, Copilot-style, or generic JSON/JSONL sessions for cost, tokens, tool failures, latency, anomalies, health, diffs, or CI gates.'
license: MIT
metadata:
  short-description: Audit AI agent session health
---

# AgentTrace Session Audit

Use this skill when local AI coding-agent session logs need an operational read:
spend, token burn, cache use, tool failures, retry loops, latency, health,
anomalies, and CI gate readiness.

## Workflow

1. Prefer the installed `agenttrace` binary when it is available on `PATH`.
2. If the binary is not available and the current directory is the
   `luoyuctl/agenttrace` repository, use `go run ./cmd/agenttrace`.
3. If `agenttrace` is not available, ask before installing it. Do not download
   or run installation scripts without explicit user approval.
4. Start with discovery unless the user gave a specific file or directory:

   ```bash
   agenttrace --doctor
   agenttrace --overview
   ```

5. For a fast human report, use Markdown:

   ```bash
   agenttrace --overview -f markdown -o agenttrace-overview.md
   ```

6. For automation or CI, use JSON or health gates:

   ```bash
   agenttrace --overview -f json -o agenttrace-overview.json
   agenttrace --overview --fail-under-health 80 --fail-on-critical --max-tool-fail-rate 15
   ```

7. For a single recent session:

   ```bash
   agenttrace --latest
   agenttrace --latest -f json
   ```

8. For a specific export or session directory:

   ```bash
   agenttrace path/to/session-or-export.json
   agenttrace --overview -d path/to/session-dir
   ```

## Report Focus

- Lead with the highest-risk sessions and the reason they matter.
- Call out token/cost waste, repeated tool failures, retry loops, long gaps,
  and low health scores.
- When proposing a CI gate, include the exact `agenttrace` command and
  threshold.
- If no sessions are detected, run `agenttrace --doctor` and report the
  detected agent directories and next step.

## Guardrails

- Treat prompts, code, and session contents as local/private data. Do not upload
  logs to external services.
- Do not invent metrics. If a parser cannot infer cost, model, or latency, say
  which field is missing.
- Do not overwrite user reports unless the user asked for that output path.
