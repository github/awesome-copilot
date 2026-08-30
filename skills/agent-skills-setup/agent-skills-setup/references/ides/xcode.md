# xcode (Xcode coding agents)

**Registry status:** `unverified/manual-reference`; Xcode is a host and runtime
bridge here, not an automatic context-migration target.

Xcode 26.3+/27 can host external coding agents and extensions, but its agent-specific data under `~/Library/Developer/Xcode/CodingAssistant/` is isolated implementation state rather than a portable migration target. Do not copy `ClaudeAgentConfig`, `codex`, `gemini`, credentials, sessions, approvals, or caches.

Use each agent's documented configuration UI or CLI and verify inside Xcode. Xcode exposes IDE capabilities to external agents through `xcrun mcpbridge`; this is a runtime bridge, not an MCP configuration file to migrate. Extension-bundled skills, subagents, and MCP declarations remain package-owned and manual.

Sources: [customizing agents](https://developer.apple.com/documentation/Xcode/extending-and-customizing-agents), [external agent access](https://developer.apple.com/documentation/Xcode/giving-external-agents-access-to-xcode).
