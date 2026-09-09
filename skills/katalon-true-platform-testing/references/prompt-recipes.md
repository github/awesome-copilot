# Prompt recipes + cross-model / cross-agent execution notes

These skills are agent-neutral and must run on any coding agent (Claude, ChatGPT/Codex, Gemini, Copilot, Cursor, Kiro, Windsurf, Cline, Continue) and any model tier (Opus down to Haiku/small). Smaller models reason less, so the skills are written to be **followed, not interpreted**.

## Cross-model design principles (why the skills read the way they do)

1. **Deterministic tool order.** Steps are numbered and the tool sequence is fixed. A small model should never have to decide *which* tool — only execute the next numbered call.
2. **Explicit stop conditions.** Every loop states when to stop (e.g. "poll `read_manual_ai_session` until no item is TODO/IN_TESTING, then stop"). No open-ended "keep checking".
3. **One decision at a time.** Resolve project -> repository -> requirement in that fixed order. Ask only when a value cannot be resolved safely.
4. **Boundary stated up front.** Each skill names what the MCP cannot do first, so a weaker model does not hallucinate create-requirement / create-release / self-heal.
5. **Report template supplied.** Each workflow ends with an exact output shape so weaker models produce a structured answer instead of rambling.
6. **Platform tool names only.** Reference MCP tools by their platform name (`create_manual_test_run`), never an agent-specific wrapper, so the same instruction works in Copilot/Cursor/Kiro/Windsurf.

## Small-model guardrails (Haiku / small Copilot / Gemini Flash)

- Do one recipe at a time; do not chain R1..R6 in a single prompt.
- Confirm scope (project + repository) before any write.
- After each mutating call, read back (`read_test_case` / `read_test_suite` / `read_execution`) before moving on.
- If a tool errors, report the exact error and stop; do not retry blindly or invent a workaround.

## Copy-paste prompts by intent

Setup: `Set up the Katalon MCP and verify my projects.`
Plan: `Plan testing for sprint 3.2: show coverage gaps and build the executable suite.`
Design: `Design and import atomic manual cases from requirement CEL-6 and link them.`
Manage/trace: `Audit requirement-to-test traceability for project X and list orphan requirements.`
Review: `Review the regression suite for release 3.2 and give a verdict with weak cases.`
Execute: `Run this suite with AI and report pass/fail/blocked.`
Analyze: `Triage execution 8842: product bug vs flaky vs environment, and what to file.`
Release: `Is release 3.2 ready to ship based on the quality metrics?`
Maintain: `Which cases went flaky this month, and repair vs regenerate?`
Cross-verify: `Run this critical suite with AI and with Playwright, then reconcile any disagreement.`
Full chain: `Analyze CEL-6, design and import cases, build a suite, run with AI, and tell me if we can ship.`

## Non-Claude agent notes

- **Copilot / Cursor / Kiro / Windsurf / Cline / Continue:** invoke the skill by its name or `/skill-name`; the MCP tool calls are identical. The generated adapter for each agent carries the same skill body.
- **Codex / ChatGPT:** the plugin declares the MCP in `.mcp.json`; follow the numbered steps exactly, they are model-agnostic.
- **Any agent via AGENTS.md:** read `AGENTS.md`, match the request to a skill description, open that `SKILL.md`, follow it.
