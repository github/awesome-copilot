# 🪝 Hooks

Hooks enable automated workflows triggered by specific events during GitHub Copilot coding agent sessions, such as session start, session end, user prompts, and tool usage.
### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-hooks) for guidelines on how to contribute new hooks, improve existing ones, and share your use cases.

### How to Use Hooks

**What's Included:**
- Each hook is a folder containing a `README.md` file and a `hooks.json` configuration
- Hooks may include helper scripts, utilities, or other bundled assets
- Hooks follow the [GitHub Copilot hooks specification](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)

**To Install:**
- Copy the hook folder to your repository's `.github/hooks/` directory
- Ensure any bundled scripts are executable (`chmod +x script.sh`)
- Commit the hook to your repository's default branch

**To Activate/Use:**
- Hooks automatically execute during Copilot coding agent sessions
- Configure hook events in the `hooks.json` file
- Available events: `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `errorOccurred`

**When to Use:**
- Automate session logging and audit trails
- Auto-commit changes at session end
- Track usage analytics
- Integrate with external tools and services
- Custom session workflows

| Name | Description | Events | Bundled Assets |
| ---- | ----------- | ------ | -------------- |
| [Governance Audit](../hooks/governance-audit/README.md) | Scans Copilot agent prompts for threat signals and logs governance events | sessionStart, sessionEnd, userPromptSubmitted | `audit-prompt.sh`<br />`audit-session-end.sh`<br />`audit-session-start.sh`<br />`hooks.json` |
| [Session Auto-Commit](../hooks/session-auto-commit/README.md) | Automatically commits and pushes changes when a Copilot coding agent session ends | sessionEnd | `auto-commit.sh`<br />`hooks.json` |
| [Session Logger](../hooks/session-logger/README.md) | Logs all Copilot coding agent session activity for audit and analysis | sessionStart, sessionEnd, userPromptSubmitted | `hooks.json`<br />`log-prompt.sh`<br />`log-session-end.sh`<br />`log-session-start.sh` |
