---
name: agent-skills-setup
version: 0.5.0
license: MIT
description: >
  Migrate ALL AI assistant context between IDEs — MCP servers, rules/instructions,
  skills, slash commands, agents, hooks, and memory. Detects installed IDEs,
  converts formats across platforms, safely merges without overwriting, verifies results.
  WHEN TO USE: trigger when the user wants to migrate, move, transfer, copy, convert,
  sync, or back up AI assistant context between IDEs — e.g. "migrate MCP config",
  "move skills from Cursor to Claude", "transfer rules from Windsurf to Cursor",
  "copy agents between IDEs", "sync memory bank", "ai ide migration".
triggers:
  - migrate mcp config
  - migrate ai ide settings
  - move skills from cursor to claude
  - transfer mcp servers between ide
  - migrate rules from windsurf to cursor
  - ai ide migration
  - copy mcp config to another ide
  - migrate ai assistant context
  - move skills between ide
  - migrate memory bank
---

# AI IDE Context Migration

Migrate AI assistant context (MCP, rules, skills, commands, agents, hooks, memory) between IDEs with format conversion, safe merging, and verification.

> **MCP Protocol**: 2025-11-25 (stable). SSE deprecated; use Streamable HTTP for remote servers.
> **Full IDE Registry**: Read `references/ide-registry.md` for detailed per-IDE paths of all migration objects.

---

## Migration Objects

| # | Object | Description |
|---|--------|-------------|
| 1 | **mcp** | MCP server configurations (stdio/HTTP) |
| 2 | **rules** | Instructions/rules/context files |
| 3 | **skills** | SKILL.md skill directories |
| 4 | **commands** | Slash commands / prompt templates |
| 5 | **agents** | Subagent definitions |
| 6 | **hooks** | Lifecycle event hooks |
| 7 | **memory** | Persistent memory / memory banks / context files |

**Never migrate**: API keys, tokens, OAuth tokens, chat history/transcripts, IDE UI settings, built-in vector indexes, workspace storage, SQLite databases.

---

## Execution Workflow

```
1. DETECT    — Scan filesystem for installed IDEs using detect_dir in IDE Registry
2. IDENTIFY  — Ask user: source IDE(s) and target IDE(s)
3. SCAN      — Read references/ide-registry.md; scan ALL migration objects for source IDE
4. DRY-RUN   — Generate migration preview: list objects, conversion plan, conflicts
5. CONFIRM   — Show preview to user; wait for explicit approval before writing
6. BACKUP    — Create .bak.TIMESTAMP copies of existing target files that will be modified
7. MIGRATE   — Execute migrations with format conversion per Object Conversion Rules
8. VERIFY    — Validate output files parse correctly; run verification commands; report results
```

**Critical rules**:
- Default to DRY-RUN. Never write without user confirmation.
- Always backup before overwriting. Use `.bak.<YYYYMMDDHHMMSS>` suffix.
- Merge, never overwrite. Conflicts renamed to `<name>_migrated`.
- Blank all secret values in env (keep key names, set values to "").
- If source or target config is invalid JSON/TOML/YAML, STOP and report.

---

## IDE Quick Reference

Root key and format differences — the most common migration errors:

| IDE | MCP Root Key | Format | Config Path | Key Pitfall |
|-----|-------------|--------|-------------|-------------|
| Claude Desktop | `mcpServers` | JSON | `claude_desktop_config.json` | MCP only; no rules/skills |
| Claude Code | `mcpServers` | JSON | `~/.claude.json` / `.mcp.json` | MCP NOT in settings.json |
| Cursor | `mcpServers` | JSON | `~/.cursor/mcp.json` / `.cursor/mcp.json` | Skills since v0.44; hooks supported |
| Cline | `mcpServers` | JSON | globalStorage path (VS Code) | CLI uses `~/.cline/mcp.json` separately |
| VS Code Copilot | `servers` | JSON | `.vscode/mcp.json` | `servers` NOT `mcpServers`; needs type |
| Copilot CLI | `mcpServers` | JSON | `~/.copilot/mcp-config.json` | Needs type; no longer reads .vscode/mcp.json |
| Windsurf | `mcpServers` | JSON | `~/.codeium/windsurf/mcp_config.json` | Uses `serverUrl` not `url` |
| Zed | `context_servers` | JSON | `settings.json` | 1.4.2+ uses AGENTS.md, removed @rule |
| Trae | `mcpServers` | JSON | `.trae/mcp.json` | Project MCP needs manual toggle |
| Trae Work | `mcpServers` | JSON | `.trae/mcp.json` | Shares Trae IDE config; SOLO/Code mode for agents |
| Codex CLI | `[mcp_servers.*]` | TOML | `~/.codex/config.toml` | Underscores in names; prompts deprecated→skills |
| Gemini CLI | `mcpServers` | JSON | `~/.gemini/settings.json` | Server names must use hyphens; commands are TOML |
| OpenCode | `mcp` | JSON | `opencode.json` | `mcp` not `mcpServers`; command is array; env is `environment` |
| Goose | `extensions` | YAML | `~/.config/goose/config.yaml` | `extensions` not `mcpServers`; cmd/args/envs |
| JetBrains Junie | `mcpServers` | JSON | `~/.junie/mcp/mcp.json` | Rules is `.junie/guidelines.md` single file |
| Kiro | `mcpServers` | JSON | `.kiro/settings/mcp.json` | Path has `settings/` subdir; supports hooks |
| Continue.dev | `mcpServers` | YAML | `~/.continue/config.yaml` | mcpServers is ARRAY not object |
| Sourcegraph Amp | CLI-managed | JSON | `~/.config/amp/` | MCP via `amp mcp add`, not config key |
| Sourcegraph Cody | `mcpServers` | JSON | `~/.config/cody/mcp_servers.json` | Free/Pro sunset 2025-06; MCP via feature flag; agentic gathering not @mentions |
| PearAI | `mcpServers` | JSON | `~/.pearai/config.json` | Standard object format; file is `config.json` |
| Forge | `mcpServers` | JSON | `~/.forge/.mcp.json` | Path is `~/.forge/` not `~/.config/forge/` |
| Void Editor | `mcpServers` | JSON | `~/.config/void/mcp_servers.json` | File is `mcp_servers.json` not `mcp.json` |
| Kilo Code | `mcpServers` | JSON | `~/.config/kilo/kilo.jsonc` | Global is `~/.config/kilo/`; agents from modes |
| Roo Code | `mcpServers` | JSON | `.roo/mcp.json` | Archived 2026-05; migrate to Kilo Code |
| Amazon Q | `mcpServers` | JSON | `~/.aws/amazonq/default.json` | Legacy mcp.json with useLegacyMcpJson flag |
| antigravity | `mcpServers` | JSON | `~/.gemini/config/mcp_config.json` | Config NOT in antigravity/ (that's cache) |
| Augment Code | `mcpServers` | JSON | `~/.augment/settings.json` | GUI primary; skills follow agentskills.io |
| OpenHands | `mcpServers` | JSON | `~/.openhands/mcp.json` | CLI 1.0+ JSON; GUI uses config.toml [mcp] |
| Aider | N/A | YAML | `~/.aider.conf.yml` | No native MCP; rules via CONVENTIONS.md |
| Helix | `[mcp_servers.*]` | TOML | `~/.config/helix/config.toml` | Via helix-ai plugin; tools-only |
| Tabnine | `mcpServers` | JSON | `.tabnine/mcp_servers.json` | Rules via guidelines/rules.md |
| Tongyi Lingma | `mcpServers` | JSON | `.lingma/mcp-settings.json` | GUI primary; ModelScope integration |
| Baidu Comate | `mcpServers` | JSON | `.comate/mcp.json` | Rules use .mdr format; supports .agents/skills/ |
| Tencent CodeBuddy | `mcpServers` | JSON | `~/.codebuddy/.mcp.json` | Full rules/agents/skills/memory system |
| Kimi Code | `mcpServers` | JSON | `~/.kimi-code/mcp.json` | Path is `.kimi-code` NOT `.kimi`; config is `config.toml` |
| ZCode (Zhipu) | `mcp.servers` | JSON | `~/.zcode/cli/config.json` | Root key `mcp.servers` (dot); uses AGENTS.md not CLAUDE.md |
| MiniMax Code | N/A | — | (desktop app) | Built-in Agent Team/Skills/Memory; MCP unconfirmed |
| mmx-cli (MiniMax) | N/A | JSON | `~/.mmx/config.json` | Region trap: api.minimax.io vs api.minimaxi.com |
| Qoder CN (fmr Tongyi Lingma) | `mcpServers` | JSON | `~/.qoder/` / `qodercli mcp add` | Renamed 2026-05-20; uses AGENTS.md; ModelScope MCP plaza |
| Baidu Comate IDE | `mcpServers` | JSON | (desktop app) | Distinct from plugin; Zulu multi-agent; .mdr rules; global config since 2025-08 |
| Tencent CodeBuddy IDE | `mcpServers` | JSON | (desktop app) | Distinct from plugin; shares config with CodeBuddy CLI |
| iFlyCode (讯飞) | `mcpServers` | JSON | (UI config) | MCP via UI paste JSON; no file-level config docs |
| Raccoon AI (商汤) | `mcpServers` | JSON | (UI config) | MCP via UI paste JSON; no file-level config docs |
| MonkeyCode (长亭) | `mcpServers` | JSON | `~/.monkeycode/` | AGPL-3.0 open source; SDD specs; MonkeyScan; private deploy |
| veCLI (火山引擎) | `mcpServers` | JSON | `~/.vecli/` | Distinct from Trae CLI (Volcano Engine vs Trae brand) |
| bolt.new / bolt.diy | `servers` | JSON | `~/.boltai/mcp.json` | Root key `servers` NOT `mcpServers`!; supports import from Cursor/Claude |
| Qodo (fmr CodiumAI) | `mcpServers` | JSON | IDE Tools Mgmt UI | CodiumAI ≠ Codeium; agents in .toml; CLI supports `--mcp` |
| Devin (Cognition) | `mcpServers` | JSON | (cloud dashboard) | Cloud SaaS only; bidirectional MCP; also exposes mcp.devin.ai |
| v0 (Vercel) | UI | — | `v0.app/.../mcp-connections` | Bidirectional MCP; also exposes mcp.v0.dev; whitelisted clients only |
| Lovable | UI | — | (lovable.dev chat connectors) | Bidirectional MCP; server OAuth limited to 5 clients; Enterprise disabled |
| gptel + mcp.el (Emacs) | elisp | — | `~/.emacs.d/init.el` | Emacs ecosystem; `mcp-hub-start`; requires lisp |
| WorkBuddy | `mcpServers` | JSON | `~/.workbuddy/.mcp.json` | Path is `~/.workbuddy/` not `~/.workbuddy` root; skills at `~/.workbuddy/skills/` |

---

## Universal Standard Locations

Migrate to these FIRST for maximum cross-IDE compatibility:

| Path | Purpose | Loaded By |
|------|---------|-----------|
| `AGENTS.md` | Universal project instructions | Claude Code, Cursor, Copilot, Codex, Gemini, Zed 1.4.2+, JetBrains/Goose/Kiro/Aider/OpenCode/Augment/Forge/Void/OpenHands/Kimi Code/ZCode/Qoder CN/veCLI |
| `.agents/skills/<name>/SKILL.md` | Universal skills | Cursor, Copilot, Codex, Trae, antigravity, OpenCode, Augment, Amp, Zed, Comate, Kimi Code |
| `.claude/skills/<name>/SKILL.md` | Claude-compatible skills | Claude Code, Cursor (loads natively), OpenCode, Augment, Copilot |
| `.mcp.json` | Universal project MCP | Claude Code, Copilot CLI |
| `.vscode/mcp.json` | VS Code ecosystem MCP | Copilot, Cline, Continue, Cody, Kilo Code, Void |

---

## Object Conversion Rules

### MCP Server Conversion

```
CONVERT_MCP(source_config, source_ide, target_ide):

  1. Read source MCP config using source_ide paths and root_key
  2. For each server entry:
     a. Extract: command, args, env, url, headers
     b. BLANK all secret values in env (keep key names, set to "")
     c. Convert to target format per root_key:
        - mcpServers (JSON object): direct copy
        - servers (JSON, VS Code Copilot): rename mcpServers→servers; add type:'stdio'|'http'
        - context_servers (JSON): rename root key (Zed)
        - mcp.servers (JSON): rename root key (ZCode; also accepts mcpServers)
        - mcp (JSON): rename; add type:'local'|'remote'; command→array; env→environment (OpenCode)
        - mcpServers ARRAY: object → [{name,type,...}] (Continue.dev ONLY)
        - servers (JSON, bolt.new/bolt.diy): rename mcpServers→servers (NO type field needed)
        - mcp_servers (TOML): → [mcp_servers.<name>] table; underscores (Codex/Helix)
        - extensions (YAML): rename; command→cmd, env→envs; add type (Goose)
        - amp: via `amp mcp add` CLI command (Sourcegraph Amp)
     d. Handle special fields:
        - Windsurf HTTP: url → serverUrl
        - antigravity HTTP: url → serverUrl
        - Copilot CLI: add type:'local'|'http'
        - Codex HTTP: uses url+bearer_token_env_var or http_headers
        - Gemini CLI: server names underscores → hyphens
        - Continue.dev: convert object to array [{name,type,...}]
        - Goose: add type:'stdio'|'sse'|'streamable_http'
  3. Merge with existing target config (backup first; duplicates → <name>_migrated)
  4. Write; verify parses correctly
```

### Rules/Instructions Conversion

Rules are MARKDOWN. The BODY is always reusable — only frontmatter and filename need adaptation. `AGENTS.md` is the universal intermediate format.

| Source | Conversion |
|--------|------------|
| `.cursorrules` / `.windsurfrules` / `.clinerules` / `.voidrules` | Copy body; rename to target's rules file |
| `.cursor/rules/*.mdc` | Extract body; adapt frontmatter (description, globs, alwaysApply) |
| `CLAUDE.md` / `GEMINI.md` / `CODY.md` / `CODEBUDDY.md` / `HELIX.md` | Copy body; rename to target's filename |
| `AGENTS.md` | Copy directly (universal standard) |
| `.kiro/steering/*.md` | Copy body; note conditional steering (inclusion: always/fileMatch/auto/manual) |
| `.augment/rules/*.md` | Extract body; adapt frontmatter (always/auto/manual) |
| `.comate/rules/*.mdr` | Extract body; .mdr is Markdown with Comate extensions |
| `.junie/guidelines.md` | Copy body; single file not directory |
| `.tabnine/guidelines/rules.md` | Copy body |
| Any rules → Zed/ZCode/Kimi Code/Qoder CN/veCLI | Append to AGENTS.md (all use AGENTS.md as universal) |
| Any rules → Aider | Use CONVENTIONS.md; add to `read:` in .aider.conf.yml |
| Any rules → Goose | Copy to .goosehints or AGENTS.md |

### Skills Conversion

```
CONVERT_SKILL(source_skill_dir, target_skill_dir):
  1. Keep: name, description (universally supported per agentskills.io)
  2. Remove IDE-specific frontmatter: allowed-tools (Claude), agent/fork/color (Augment)
  3. Copy entire skill directory (SKILL.md + scripts/ + references/ + assets/)
  4. Also copy to .agents/skills/ (universal) and .claude/skills/ (Claude-compatible)
  5. Verify SKILL.md has required name + description
```

### Commands/Prompts Conversion

Commands are markdown files (filename = command name). Exceptions:
- **Gemini CLI**: commands are `.toml` files, not markdown
- **VS Code Copilot**: rename to `*.prompt.md`; add mode/model/tools frontmatter
- **Cody**: convert to JSON format (`{commands: {key: {prompt, description, mode, context}}}`)
- **OpenCode**: support $ARGUMENTS, $1, !`cmd`, @filepath templates
- **Kimi Code**: no standalone commands dir; use skills or plugin commands

### Agents Conversion

Copy markdown body; adapt frontmatter. Supported fields by IDE:
- **Claude Code**: name, description, model, tools
- **VS Code Copilot**: name, description, tools, model
- **OpenCode**: description, mode, model, tools, permission
- **Forge**: name, description
- **Tencent CodeBuddy**: name, description, tools, model
- **Kiro**: name, description, prompt, mcpServers, tools, hooks (JSON format)
- **Kimi Code**: YAML format (extend, name, system_prompt_path, tools, exclude_tools, subagents)
- **Roo Code/Kilo Code**: Modes system (`.roomodes`/`kilo.jsonc`) — per-mode tool permissions
- **Gemini CLI**: via `/agents` command and extensions
- **ZCode**: Markdown (global `~/.zcode/agents/` or project `.zcode/agents/`)
- **Qodo**: TOML format (`agents/<command-name>.toml`: instructions, tools, commands)

### Hooks Conversion

| Source | Target | Conversion |
|--------|--------|------------|
| Claude Code (`settings.json` hooks) | Cursor (`.cursor/hooks.json`) | Adapt event names; Cursor supports sessionStart/End, preToolUse/postToolUse, etc. |
| Claude Code hooks | VS Code Copilot (`.github/hooks/*.json`) | Shared format; 8 lifecycle events |
| Claude Code hooks | Kiro (`.kiro/hooks/*.kiro.hook`) | Convert to JSON; when.type→fileEdited/preToolUse/postToolUse; then.type→runCommand/askAgent |
| Claude Code hooks | OpenCode (`.opencode/plugins/*.ts`) | Convert to TypeScript event handlers |
| Claude Code hooks | Kimi Code (`config.toml [[hooks]]`) | Convert to TOML array; 13 events; blocking: PreToolUse/Stop/UserPromptSubmit |
| Any hooks | Others | Note as manual step |

### Memory Conversion

| Source | Target | Conversion |
|--------|--------|------------|
| Claude Code (`~/.claude/projects/<encoded>/memory/MEMORY.md` + user_*.md etc.) | Any rules | Copy MEMORY.md + relevant .md files as project context |
| Cline `memory-bank/*.md` (6 files: projectbrief, productContext, activeContext, systemPatterns, techContext, progress) | Any rules | Copy as project context; prepend "## Project Context" |
| Goose `~/.config/goose/memory/` (JSON shards) | Any rules | Extract text from JSON shards; convert to markdown |
| Trae `~/.trae/memory/user_profile.md` | Any rules | Copy directly |
| Windsurf memories (`~/.codeium/windsurf/memories/`) | Any rules | Copy global_rules.md; other memories are auto-generated |
| CodeBuddy `CODEBUDDY.md` | Any rules | Copy directly |
| Gemini CLI `/memory` | Any rules | Use `/memory show` to export; copy to target |
| MiniMax Code (3-tier memory) | Any rules | Export via MiniMax Code UI; convert to markdown |
| Cross-IDE: mem0 MCP / OpenMemory / Pieces LTM | Same | Install as MCP server in target IDE; memory follows API key/device |

**Key rule**: Memory files are markdown/context. Convert to target IDE's rules or memory format. For MCP-based memory (mem0, Pieces), install the MCP server in target IDE.

---

## Safety Boundaries

| Never do this | Why |
|--------------|-----|
| Copy/migrate API keys, tokens, secrets | Security; blank values, tell user to fill in |
| Overwrite existing config without backup | Data loss; always .bak.TIMESTAMP first |
| Overwrite existing entries | Merge only; conflicts → `<name>_migrated` |
| Execute package installs (npm install -g, curl \| sh) | Don't modify user's system — NEVER silent; see the OpenClaw exception below |
| Modify shell rc files | PATH issues noted but not auto-fixed |
| Kill/restart IDE processes | Tell user to restart in manual steps |
| Migrate IDE UI settings / chat history / OAuth tokens / SQLite databases | Out of scope or privacy/security risk |
| Write in dry-run mode | Default to preview; write only after user confirms |
| Proceed when config is invalid JSON/TOML/YAML | Parse errors = corrupted; stop and report |

### Exception — OpenClaw auto-configuration (explicit, user-consented)

`scripts/auto-configure-openclaw-skills.sh` is the installer for **OpenClaw**, a
*target runtime* for this skill. It is the single deliberate, user-consented exception to the
"no global installs / no unverified curl|sh" rule above. It MAY:

- run `npm install -g clawhub` (installs the ClawHub package manager), and
- download and execute `https://openclaw.ai/install.sh` (the OpenClaw runtime installer),

**but ONLY when ALL of the following hold:**

1. The user passes `--yes` (explicit, recorded consent to modify their system).
2. For `install.sh`, the downloaded script's SHA-256 is verified against `OPENCLAW_INSTALL_SHA256`
   when a pin is provided; if no pin is set, the script prints a *prominent WARNING* showing the
   computed hash rather than silently trusting the download.
3. In `--dry-run` mode it only previews these actions and never executes them.

This exception applies **solely** to installing the OpenClaw runtime / ClawHub for this skill's own
target platform. It does **NOT** weaken the general rule for any other operation: no other command
may run silent global `npm install -g`, pipe a remote script to `sh`, or modify the user's system
without equivalent explicit consent and integrity verification.

**IDE-specific pitfalls** (will cause silent failure):

| IDE | Pitfall |
|-----|---------|
| VS Code Copilot | Root key `servers`; requires type:'stdio'\|'http' |
| Copilot CLI | Root key `mcpServers` + REQUIRES type:'local'\|'http'; no longer reads .vscode/mcp.json |
| Zed | Root key `context_servers`; 1.4.2+ uses AGENTS.md not @rule |
| Codex/Helix | TOML `[mcp_servers.<name>]` uses underscores; prompts deprecated→skills |
| Gemini CLI | Server names must use hyphens; commands are .toml files |
| OpenCode | Root key `mcp`; command must be array; requires type; env field is `environment` |
| Goose | Root key `extensions`; fields: cmd/args/envs; memory is directory not file |
| Continue.dev | mcpServers is ARRAY not OBJECT (only IDE using array) |
| Sourcegraph Cody | Free/Pro sunset 2025-06 (migrate to Amp); MCP via feature flag opt-in; agentic gathering NOT @mentions |
| Sourcegraph Amp | MCP via `amp mcp add` CLI, not config key |
| Windsurf | Uses `serverUrl` not `url` for HTTP |
| Kiro | Path has `settings/` subdir: `.kiro/settings/mcp.json`; hooks use .kiro.hook extension |
| Cline | VS Code extension uses globalStorage path; CLI uses ~/.cline/mcp.json separately |
| antigravity | Config at `~/.gemini/config/mcp_config.json`; antigravity/ dir is cache |
| PearAI | Config file is `config.json` not `mcp_config.json`; standard object format |
| Forge | Path is `~/.forge/` not `~/.config/forge/`; MCP file is `.mcp.json` |
| Void Editor | File is `mcp_servers.json` not `mcp.json`; .voidrules unconfirmed |
| Kilo Code | Global is `~/.config/kilo/kilo.jsonc`; agents evolved from modes |
| Roo Code | Archived 2026-05; migrate to Kilo Code |
| Aider | No native MCP; rules via CONVENTIONS.md read config |
| Trae | Project MCP requires manual toggle; SOLO mode unsupported |
| Kimi Code | Path `~/.kimi-code/` NOT `~/.kimi/`; config is `config.toml` NOT `config.json`; legacy kimi-cli deprecated |
| ZCode | Root key `mcp.servers` (dot notation); uses `AGENTS.md` not `CLAUDE.md`; ZCode ≠ CodeGeeX |
| mmx-cli | Region trap: global=api.minimax.io / cn=api.minimaxi.com (extra 'i'); Key+Host must match |
| MiniMax Code | Desktop config not file-exposed; official recommends mmx CLI over MCP |
| bolt.new/bolt.diy | Root key is `servers` NOT `mcpServers`; no type field needed (unlike VS Code Copilot) |
| Qodo | CodiumAI ≠ Codeium (Codeium→Windsurf); Enterprise has "Agentic Tools Allow List"; agents in .toml files |
| Devin/v0/Lovable | Cloud SaaS only (no local files); bidirectional MCP — distinguish client config from server endpoint |
| Qoder CN | Renamed from Tongyi Lingma 2026-05-20; path `~/.qoder/` not `~/.lingma/`; uses AGENTS.md |
| Baidu Comate IDE | Distinct from plugin version; global Rules/MCP only since 2025-08 late version; can't install MS Python/C++ plugins |
| veCLI | Distinct from Trae CLI (different ByteDance product lines: Volcano Engine vs Trae brand) |

---

## Verification

| IDE | Method |
|-----|--------|
| Claude Code | `claude mcp list` |
| Codex CLI | `codex mcp list` or `/mcp` |
| Copilot CLI | `copilot mcp list` |
| OpenCode | `opencode mcp list` |
| Kimi Code | `kimi mcp list` |
| Qoder CN | `qodercli mcp list` |
| Sourcegraph Amp | `amp mcp list` |
| OpenHands | `openhands mcp list` |
| Goose | `goose configure` |
| Cursor | GUI: Settings → MCP (hot reload) |
| Zed | GUI: Settings → AI → Context Servers (hot reload) |
| VS Code Copilot | Command Palette → "MCP: List Servers" |
| Windsurf | GUI: Settings → MCP panel |
| Trae | GUI: Settings → MCP |
| Cline | GUI: Cline sidebar → MCP Servers |
| ZCode | GUI: Settings → MCP Servers |
| mcphub-nvim | `:McpHub` in Neovim |
| codecompanion-nvim | `/mcp` in chat buffer |
| JSON/TOML/YAML | `python3 -c "import json/tomllib/yaml; ..."` parse check |
| All others | Check files exist, non-empty, parse without errors |

**Universal MCP debugger**: `npx @modelcontextprotocol/inspector`

---

## Existing Migration Script

`scripts/smart-ide-migration.sh` automates file operations between 30+ IDEs. Use it for bulk file copying; use the IDE Registry for format conversion it doesn't handle.

```bash
bash scripts/smart-ide-migration.sh --source cursor --target claude --dry-run
bash scripts/smart-ide-migration.sh --source cursor --target windsurf --objects skills,rules --strategy backup
```
