# IDE Registry — Full Migration Object Reference

Detailed per-IDE paths for all migration objects. Read this when executing STEP 3 (SCAN) of the migration workflow.

> **Verified**: 2026-07-16 via official docs. All paths are macOS/Linux unless noted.
> Objects not listed for an IDE = not supported by that IDE.

---

## Claude Family

### claude-desktop
- **detect**: `~/Library/Application Support/Claude/` (mac) · `~/.config/Claude/` (linux) · `%APPDATA%\Claude\` (win)
- **mcp**: `claude_desktop_config.json` in detect dir · root_key `mcpServers` · JSON · stdio+HTTP
- Other objects: none (MCP-only product)
- `.mcpb` (MCP Bundle, formerly `.dxt`) extensions: drag to Settings → Extensions

### claude-code
- **detect**: `~/.claude/`
- **mcp**: global `~/.claude.json` · project `.mcp.json` · root_key `mcpServers` · JSON · stdio+HTTP · `claude mcp list`
- **rules**: project `CLAUDE.md` / `.claude/rules/*.md` · global `~/.claude/CLAUDE.md` / `~/.claude/rules/*.md` · local `CLAUDE.local.md`
- **skills**: project `.claude/skills/<name>/SKILL.md` · global `~/.claude/skills/<name>/SKILL.md` · frontmatter: name, description
- **commands**: project `.claude/commands/*.md` · global `~/.claude/commands/*.md`
- **agents**: project `.claude/agents/*.md` · global `~/.claude/agents/*.md` · frontmatter: name, description, model, tools
- **hooks**: `~/.claude/settings.json` key `hooks` · events: PreToolUse, PostToolUse, PreCompact, SessionStart
- **memory**: `~/.claude/projects/<encoded-cwd>/memory/MEMORY.md` + `user_*.md` + `project_*.md` + `feedback_*.md` + `reference_*.md` (v2.1.59+; `/memory` command)
- **other**: `.claude/output-styles/` · `.claude/workflows/` · `~/.claude/plugins/`
- **note**: Do NOT use settings.json for MCP; use ~/.claude.json

### cursor
- **detect**: `~/Library/Application Support/Cursor/` (mac) · `~/.config/Cursor/` (linux) · `%APPDATA%\Cursor\` (win)
- **mcp**: global `~/.cursor/mcp.json` · project `.cursor/mcp.json` · root_key `mcpServers` · JSON · stdio+HTTP
- **rules**: legacy `.cursorrules` · project `.cursor/rules/*.mdc` · frontmatter: description, globs, alwaysApply
- **skills**: project `.cursor/skills/<name>/SKILL.md` · global `~/.cursor/skills/` · also loads `.agents/skills/`, `.claude/skills/`, `.codex/skills/` (since v0.44)
- **commands**: project `.cursor/commands/*.md` · `/migrate-to-skills` converts commands to skills
- **agents**: project `.cursor/agents/*.md`
- **hooks**: project `.cursor/hooks.json` · global `~/.cursor/hooks.json` · events: sessionStart/End, preToolUse/postToolUse, subagentStart/Stop, beforeShellExecution, afterFileEdit, stop
- **memory**: no native file-based memory (use MCP memory server)
- **other**: `.cursorignore` · `.cursor-plugin/plugin.json`

### cline
- **detect**: `~/.cline/`
- **mcp** (VS Code ext): `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` (mac) · `~/.config/Code/User/globalStorage/...` (linux) · `%APPDATA%\Code\User\globalStorage\...` (win)
- **mcp** (CLI): `~/.cline/mcp.json` · root_key `mcpServers` · JSON · stdio+HTTP · extra fields: disabled, autoApprove
- **rules**: project `.clinerules` / `.clinerules/*.md` · also reads `.cursorrules`, `.windsurfrules`, `AGENTS.md`
- **skills**: project `.cline/skills/` · global `~/.cline/skills/` (v3.17.10+)
- **memory**: `memory-bank/*.md` — community methodology (6 files: projectbrief, productContext, activeContext, systemPatterns, techContext, progress)
- **other**: `.clineignore`

### roo-code (archived 2026-05)
- **detect**: `~/.roo/`
- **mcp**: project `.roo/mcp.json` · global `mcp_settings.json` (extension dir) · root_key `mcpServers` · JSON
- **rules**: project `.roorules` / `.roo/rules/*.md` / `.roo/rules-{mode}/` · global `~/.roo/rules/`
- **skills**: project `.roo/skills/` / `.agents/skills/` · global `~/.roo/skills/`
- **commands**: project `.roo/commands/*.md`
- **modes**: project `.roomodes` · global `custom_modes.yaml` — per-mode tool permissions (unique to Roo)
- **memory**: `memory-bank/*.md` (community methodology, inherited from Cline)
- **note**: Migrate to Kilo Code: `.roo/`→`.kilocode/`, `.roomodes`→`.kilocodemodes`

---

## VS Code Ecosystem

### vscode-copilot
- **detect**: `~/.vscode/`
- **mcp**: project `.vscode/mcp.json` · global `~/Library/Application Support/Code/User/mcp.json` (mac, v1.102+) · root_key `servers` · JSON · needs type:'stdio'|'http'
- **rules**: `.github/copilot-instructions.md` · `.github/instructions/*.instructions.md` · frontmatter: applyTo
- **skills**: `.github/skills/` / `.claude/skills/` / `.agents/skills/` · global `~/.copilot/skills/`
- **commands**: `.github/prompts/*.prompt.md` · frontmatter: description, mode, model, tools
- **agents**: `.github/agents/*.agent.md` · frontmatter: name, description, tools, model
- **hooks**: `.github/hooks/*.json` — 8 lifecycle events (preview)
- **other**: `.github/plugins/*.plugin.md` (preview)

### copilot-cli
- **detect**: `~/.copilot/`
- **mcp**: global `~/.copilot/mcp-config.json` · project `.mcp.json` / `.github/mcp.json` · root_key `mcpServers` · JSON · REQUIRES type:'local'|'http'
- **rules**: `.github/copilot-instructions.md` · global `~/.copilot/copilot-instructions.md`
- **skills**: `.github/skills/` / `.claude/skills/` / `.agents/skills/` (auto-activation unstable in CLI)
- **commands**: `.github/prompts/*.prompt.md` (shared with VS Code)
- **agents**: `.github/agents/*.agent.md` (shared with VS Code)
- **hooks**: `.github/hooks/*.json` (shared)
- **note**: No longer reads `.vscode/mcp.json` since 2026-06

### windsurf
- **detect**: `~/.codeium/windsurf/`
- **mcp**: global `~/.codeium/windsurf/mcp_config.json` · root_key `mcpServers` · JSON · stdio+HTTP · url_field: `serverUrl`
- **rules**: legacy `.windsurfrules` · project `.windsurf/rules/*.md` · global `~/.codeium/windsurf/memories/global_rules.md` · frontmatter: trigger, description
- **skills**: project `.windsurf/skills/` · global `~/.windsurf/skills/`
- **commands**: project `.windsurf/workflows/` (slash commands via `/[name]`)
- **memory**: `~/.codeium/windsurf/memories/` (Cascade auto-generated, workspace-isolated)
- **note**: No project-level MCP; 6000 char per rule limit; 100 tool limit

### continue
- **detect**: `~/.continue/`
- **mcp**: global `~/.continue/config.yaml` · project `.continue/mcpServers/<name>.yaml` · root_key `mcpServers` · YAML · ARRAY format (not object)
- **rules**: `.continue/rules/*.md` · `CONTINUE.md` · frontmatter: name, globs, regex, alwaysApply, description
- **commands**: `.continue/prompts/*.md`
- **note**: config.yaml replaced config.json; mcpServers is array [{name, type, command, args, env}]

### augment-code
- **detect**: `~/.augment/`
- **mcp**: global `~/.augment/settings.json` · root_key `mcpServers` · JSON · stdio+HTTP
- **rules**: project `.augment/rules/*.md` · frontmatter: always_apply, agent_requested
- **skills**: project `.augment/skills/<name>/SKILL.md` · global `~/.augment/skills/` · also loads `~/.claude/skills/`, `~/.agents/skills/` · frontmatter: name, description, agent, fork, color
- **commands**: global `~/.augment/commands/`
- **other**: `~/.augment-plugin/` (plugins marketplace)

### kilo-code
- **detect**: `~/.kilocode/` (project) · `~/.config/kilo/` (global)
- **mcp**: project `.kilocode/mcp.json` · root_key `mcpServers` · JSON · stdio+HTTP
- **rules**: project `.kilo/rules/*.md` / `.kilocode/rules/` · config `kilo.jsonc` instructions array · global `~/.config/kilo/kilo.jsonc`
- **agents**: project `.kilo/agents/*.md` / `.kilocode/agents/*.md` · global `~/.config/kilo/agent/*.md` · frontmatter: description, mode, model, permission, color (evolved from Roo modes)
- **other**: `.kilocodemodes` (legacy, migrated to agent markdown)

---

## Standalone IDEs

### zed
- **detect**: `~/Library/Application Support/Zed/` (mac) · `~/.config/zed/` (linux) · `%APPDATA%\Zed\` (win)
- **mcp**: global `settings.json` · project `.zed/settings.json` · root_key `context_servers` · JSON · stdio+HTTP
- **rules**: `AGENTS.md` (since 1.4.2, removed @rule system)
- **skills**: `.agents/skills/<name>/SKILL.md` (universal standard)
- **agents**: via `agent_servers` config (ACP protocol to external agents)
- **note**: GUI-launched Zed lacks shell PATH — use absolute paths

### trae
- **detect**: `~/.trae/`
- **mcp**: global `~/Library/Application Support/Trae/User/mcp.json` (mac) / `~/.config/Trae/User/mcp.json` (linux) / `%APPDATA%\Trae\User\mcp.json` (win) · project `.trae/mcp.json` · root_key `mcpServers` · JSON
- **rules**: project `.trae/rules/*.md` · global `~/.trae/rules/*.md`
- **skills**: project `.trae/skills/<name>/SKILL.md` · global `~/.trae/skills/<name>/SKILL.md` · frontmatter: name, description
- **commands**: project `.trae/commands/*.md` (max 3 levels nesting) · global `~/.trae/commands/*.md`
- **agents**: project `.trae/agents/<name>.md`
- **memory**: global `~/.trae/memory/user_profile.md` · project `~/.trae/memory/projects/<path>/project_memory.md`
- **note**: Project MCP needs manual toggle; SOLO mode unsupported

### trae-work (2026-06-18, formerly Trae SOLO)
- Third TRAE product: Web + Desktop + Mobile. Work/Code/Design modes.
- Config shares Trae IDE体系完全一致: project `.trae/` and global `~/.trae/` (intl) / `~/.trae-cn/` (CN)
- All Trae IDE migration objects (mcp/rules/skills/commands/agents/hooks/memory) apply unchanged
- Unique: Cloud Agent, Global Memory (cross-session, 2026-06-23+), Work/Design modes
- Subagents: only available in SOLO mode (Trae IDE) / Code mode (Trae Work)
- Migrate to/from Trae IDE = direct copy; no format conversion needed

### trae-cn
- Same as Trae but global paths use `~/.trae-cn/` instead of `~/.trae/`
- **mcp** global: `~/Library/Application Support/Trae CN/User/mcp.json` (mac) / `~/.config/Trae CN/User/mcp.json` (linux)
- **memory**: `~/.trae-cn/memory/user_profile.md`

### jetbrains (Junie)
- **detect**: `~/.junie/`
- **mcp**: global `~/.junie/mcp/mcp.json` (mac/linux) · `%USERPROFILE%\.junie\mcp\mcp.json` (win) · root_key `mcpServers` · JSON
- **rules**: project `.junie/guidelines.md` (single file, NOT directory)
- **note**: JetBrains AI Assistant (separate from Junie) uses GUI config; MCP via Settings > Tools > AI Assistant

### kiro
- **detect**: `~/.kiro/`
- **mcp**: global `~/.kiro/settings/mcp.json` · project `.kiro/settings/mcp.json` · root_key `mcpServers` · JSON · stdio+HTTP+OAuth
- **rules**: project `.kiro/steering/*.md` · global `~/.kiro/steering/*.md` · frontmatter: inclusion (always|fileMatch|auto|manual)
- **skills**: Kiro Powers / Agent Skills
- **agents**: `.kiro/agents/*.json` · fields: name, description, prompt, mcpServers, tools, allowedTools, hooks, model
- **hooks**: `.kiro/hooks/*.kiro.hook` · when.type: fileEdited/userTriggered/preToolUse/postToolUse · then.type: runCommand/askAgent · version: "1.0.0"
- **specs**: `.kiro/specs/<feature>/{requirements,design,tasks}.md` — spec-driven dev docs

---

## CLI Agents

### codex
- **detect**: `~/.codex/`
- **mcp**: global `~/.codex/config.toml` · project `.codex/config.toml` · root_key `mcp_servers` · TOML · stdio+HTTP · `codex mcp list`
- **rules**: project `AGENTS.md` · global `~/.codex/AGENTS.md`
- **skills**: `.agents/skills/<name>/SKILL.md` · global `~/.agents/skills/` · admin `/etc/codex/skills/` (4-layer scan)
- **commands**: DEPRECATED (v0.117.0 migrated prompts to skills system)
- **hooks**: `~/.codex/hooks.json` or config.toml
- **note**: TOML [mcp_servers.<name>] uses underscores; HTTP via url+bearer_token_env_var

### gemini-cli
- **detect**: `~/.gemini/`
- **mcp**: global `~/.gemini/settings.json` · project `.gemini/settings.json` · root_key `mcpServers` · JSON · stdio+HTTP
- **rules**: `GEMINI.md` (configurable via contextFileName setting)
- **skills**: global `~/.gemini/skills/` / `~/.agents/skills/` · project `.gemini/skills/` / `.agents/skills/`
- **commands**: global `~/.gemini/commands/*.toml` · project `.gemini/commands/*.toml` · TOML format (not markdown!) · `{{args}}` placeholders
- **agents**: global `~/.gemini/agents/` · project `.gemini/agents/` · `/agents list/enable/disable`
- **memory**: `/memory show` · `/memory add` · checkpoint at `~/.gemini/tmp/<hash>/`
- **note**: Server names must use HYPHENS; 2026-06-18 personal版停服→migrate to antigravity

### antigravity
- **detect**: `~/.gemini/antigravity/`
- **mcp**: global `~/.gemini/config/mcp_config.json` · project `.agents/mcp_config.json` · root_key `mcpServers` · JSON · remote uses `serverUrl` (NOT `url`)
- **rules**: `AGENTS.md` (recommended) or `GEMINI.md`
- **skills**: global `~/.gemini/config/skills/` · project `.agents/skills/`
- **plugins**: `~/.gemini/antigravity-cli/plugins/<name>/` (plugin.json, mcp_config.json, hooks.json, skills/, agents/)
- **hooks**: plugin `hooks.json` or settings.json · `/hooks` to view
- **note**: `~/.gemini/antigravity/mcp/` is SERVER CACHE, not config

### amazon-q
- **detect**: `~/.aws/amazonq/`
- **mcp**: global `~/.aws/amazonq/default.json` · project `.amazonq/default.json` · root_key `mcpServers` · JSON · legacy `mcp.json` with `useLegacyMcpJson:true`
- **rules**: project `.amazonq/rules/`
- **commands**: global `~/.aws/amazonq/prompts/*.md` · `/prompts` · `@prompt_name`
- **agents**: `default.json` agents field
- **note**: CLI uses `~/.aws/amazonq/cli-agents/` (separate from IDE)

### opencode
- **detect**: `~/.config/opencode/`
- **mcp**: global `~/.config/opencode/opencode.json` · project `opencode.json` · root_key `mcp` · JSON · REQUIRES type:'local'|'remote' · command is ARRAY · env field is `environment`
- **rules**: `AGENTS.md` (via instructions field in config)
- **skills**: project `.opencode/skills/` · global `~/.config/opencode/skills/` · also loads `.claude/skills/`, `.agents/skills/`
- **commands**: project `.opencode/commands/*.md` · global `~/.config/opencode/commands/*.md` · frontmatter: description, agent, model · $ARGUMENTS, !`cmd`, @file templates
- **agents**: project `.opencode/agents/*.md` · global `~/.config/opencode/agents/*.md` · frontmatter: description, mode, model, tools, permission
- **hooks**: via `.opencode/plugins/*.ts` (TypeScript event-driven)
- **memory**: via plugins (OpenMemory, short-term-memory, agent-memory)
- **note**: Config is MERGED not replaced

### goose
- **detect**: `~/.config/goose/`
- **mcp**: global `~/.config/goose/config.yaml` · root_key `extensions` · YAML · fields: type(builtin/stdio/sse/streamable_http), cmd, args, envs, enabled
- **rules**: project `.goosehints`
- **recipes**: project `.goose/recipes/*.yaml` — NOT skills; contain instructions+extensions+parameters
- **commands**: global `~/.config/goose/prompts/` · project `.goose/prompts/`
- **memory**: global `~/.config/goose/memory/` (directory, JSON shards) · project `.goose/memory/`
- **other**: `~/.config/goose/permission.yaml` · `~/.config/goose/secrets.yaml`

### aider
- **detect**: `~/.aider.conf.yml`
- **rules**: `CONVENTIONS.md` (add to `read:` in .aider.conf.yml)
- **commands**: `.aider.commands.md`
- **other**: `.aider.model.settings.yml` · `.aider.model.metadata.json`
- **note**: NO native MCP client (official config has no mcp option)

### openhands
- **detect**: `~/.openhands/`
- **mcp** (CLI 1.0+): `~/.openhands/mcp.json` · root_key `mcpServers` · JSON · `openhands mcp list`
- **mcp** (GUI/legacy): `config.toml` [mcp] section · `sse_servers`/`shttp_servers`/`stdio_servers` arrays
- **rules**: `AGENTS.md`
- **skills**: project skills (via `load_project_skills()`, agentskills.io standard)
- **agents**: `~/.openhands-cli/persist/agent_settings.json`
- **memory**: Condenser system (config.toml [condenser]: type=amortized/llm_attention/llm_summarizing)

### sourcegraph-amp
- **detect**: `~/.config/amp/`
- **mcp**: via `amp mcp add <name> <url>` CLI (NOT config key) · `amp mcp list`
- **rules**: `AGENTS.md`
- **skills**: project `.amp/skills/<name>/SKILL.md` · global `~/.config/amp/skills/` / `~/.amp/skills/` / `~/.agents/skills/`
- **commands**: `~/.config/amp/` (slash commands)
- **agents**: built-in Oracle, Librarian, Painter, Code Review; custom via plugin API
- **hooks**: `~/.config/amp/plugins/*.ts` (TypeScript; events: session.start, agent.start/end, tool.result)
- **note**: Native HTTP+OAuth+DCR; no mcp-remote needed

### sourcegraph-cody
- **detect**: `~/.vscode/cody.json` · `~/.config/cody/`
- **mcp**: `~/.config/cody/mcp_servers.json` (since 2025-05-28, all tiers via feature flag opt-in) · root_key `mcpServers` · JSON · agentic context gathering (NOT via @mentions)
- **commands**: `~/.vscode/cody.json` (user) · `.vscode/cody.json` (workspace) · format: `{commands: {key: {prompt, description, mode, context}}}`
- **note**: Free/Pro sunset 2025-06/07 (migrate to Amp); Enterprise $59/user/month; Cody repo went private (public snapshot at sourcegraph/cody-public-snapshot); Sourcegraph MCP Server (separate product) exposes code search to external agents

---

## Forge / PearAI / Void

### forge
- **detect**: `~/.forge/` (FORGE_CONFIG env var can override)
- **mcp**: global `~/.forge/.mcp.json` · project `./.mcp.json` · root_key `mcpServers` · JSON · `forge mcp import/list`
- **rules**: `forge.yaml` custom_rules field · also `AGENTS.md`
- **skills**: project `.forge/skills/<name>/SKILL.md` · global `~/forge/skills/` · also `~/.agents/skills/`
- **commands**: `forge.yaml` commands array
- **agents**: `.forge/agents/<name>.md` · built-in: Forge, Sage, Muse
- **other**: `forge.yaml` (main config) · `.forge/templates/`

### pearai
- **detect**: `~/.pearai/`
- **mcp**: global `~/.pearai/config.json` (NOT mcp_config.json) · root_key `mcpServers` · JSON · standard OBJECT format
- **rules**: via `config.json` customCommands field (no independent rules files)
- **commands**: `config.json` customCommands array
- **other**: `~/.pearai/config.ts` (TypeScript advanced config)
- **note**: Fork of Continue.dev; standard mcpServers object (NOT array)

### void-editor
- **detect**: `~/.config/void/`
- **mcp**: global `~/.config/void/mcp_servers.json` (NOT mcp.json) · project `.void/mcp_servers.json` · root_key `mcpServers` · JSON
- **rules**: `.voidrules` (community-reported, unconfirmed by official docs)
- **note**: VS Code fork (MIT); settings encrypted via VoidSettingsService

---

## Tabnine / Helix / Neovim

### tabnine
- **detect**: `~/.tabnine/`
- **mcp**: global `~/.tabnine/mcp_servers.json` · project `.tabnine/mcp_servers.json` · root_key `mcpServers` · JSON · stdio auto from command, HTTP from url
- **rules**: `.tabnine/guidelines/rules.md`
- **other**: Enterprise MCP Governance (Admin Console whitelist)

### helix
- **detect**: `~/.config/helix/`
- **mcp**: `~/.config/helix/config.toml` · root_key `mcp_servers` · TOML · via helix-ai plugin · tools-only (no Resources/Prompts/Sampling)
- **rules**: `HELIX.md` (via helix-ai plugin, project-level)
- **other**: `~/.config/helix/languages.toml` (LSP config)

### mcphub-nvim
- **detect**: `~/.config/nvim/`
- **mcp**: `~/.config/mcphub/servers.json` · root_key `mcpServers` (also supports `servers` for VS Code compat) · JSON5 · `${env:VAR}` variables · verify: `:McpHub`
- **note**: Compatible with `.vscode/mcp.json`; can share config with VS Code/Cursor/Cline/Zed

### codecompanion-nvim
- **detect**: `~/.config/nvim/`
- **mcp**: Lua config · `mcp.servers` key · verify: `/mcp` in chat buffer
- **rules**: reads `.clinerules`, `.cursorrules`, `AGENTS.md`, `CLAUDE.md`, `.goosehints` (configurable)
- **commands**: `prompt_library` Lua table · `.prompts/*.md` (v18.0.0+)
- **hooks**: Events/Hooks system (Lua callbacks)

---

## Chinese AI Assistants

### tongyi-lingma
- **detect**: `~/.lingma/`
- **mcp**: project `.lingma/mcp-settings.json` · root_key `mcpServers` · JSON · GUI primary · ModelScope MCP plaza 3000+
- **rules**: project `.lingma/<rulename>.md`
- **skills**: project `.lingma/skills/<name>/SKILL.md` · global `~/.lingma/skills/`
- **commands**: project `.lingma/commands/` · global `~/.lingma/commands/`
- **agents**: project `.lingma/agents/<name>.md` · global `~/.lingma/agents/` · frontmatter: name, description, tools

### baidu-comate
- **detect**: `~/.comate/`
- **mcp**: global `~/.comate/mcp.json` · project `.comate/mcp.json` · local `.comate/mcp.local.json` · root_key `mcpServers` · JSON
- **rules**: `.comate/rules/*.mdr` — unique .mdr format (Markdown + Comate extensions) · Cursor Rules compatible · 4 activation modes
- **skills**: `.agents/skills/` or `.comate/skills/` · global `~/.comate/skills/`
- **agents**: `.comate/agents/` · global `~/.comate/agents/`
- **note**: Three-tier config (global/project/local); .mdr is unique format

### tencent-codebuddy
- **detect**: `~/.codebuddy/`
- **mcp**: global `~/.codebuddy/.mcp.json` (leading dot!) · project `.mcp.json` · root_key `mcpServers` · JSON · permissions: allow/ask/deny
- **rules**: project `.codebuddy/rules/*.md` · frontmatter: alwaysApply, paths
- **skills**: project `.codebuddy/skills/<name>/SKILL.md` · global `~/.codebuddy/skills/` · frontmatter: name, description, allowed-tools, context, agent, model, hooks
- **commands**: project `.codebuddy/commands/`
- **agents**: project `.codebuddy/agents/*.md` · global `~/.codebuddy/agents/*.md` · frontmatter: name, description, tools, model
- **memory**: `CODEBUDDY.md` (project/user) · `settings.json` autoMemoryEnabled, typedMemory
- **hooks**: SDK hooks + SKILL.md hooks field
- **other**: `settings.json` / `settings.local.json`

### kimi-code (Moonshot AI / 月之暗面)
- **detect**: `~/.kimi-code/` (env var `KIMI_CODE_HOME` overrides; legacy kimi-cli used `~/.kimi/` with `KIMI_SHARE_DIR`)
- **mcp**: global `~/.kimi-code/mcp.json` · project `<cwd>/.kimi-code/mcp.json` · root_key `mcpServers` · JSON · stdio+HTTP+SSE · `kimi mcp list`
- **rules**: global `~/.kimi-code/AGENTS.md` · project `AGENTS.md` (also `.kimi-code/AGENTS.md`, any subdir) · `/init` auto-generates
- **skills**: global `~/.kimi-code/skills/` / `~/.agents/skills/` · project `.kimi-code/skills/` / `.agents/skills/` · extra dirs via `config.toml extra_skill_dirs`
- **commands**: built-in slash commands (`/mcp`, `/init`, `/skill:<name>`, `/hooks`, `/config`) · plugin commands (`<plugin>:<cmd>`) · NO standalone commands dir
- **agents**: built-in `default`, `okabe` · custom via `--agent-file <path.yaml>` (YAML: extend, name, system_prompt_path, tools, exclude_tools, subagents) · subagents: coder, explore, plan
- **hooks**: `~/.kimi-code/config.toml` `[[hooks]]` array · 13 events (PreToolUse, PostToolUse, PostToolUseFailure, UserPromptSubmit, Stop, StopFailure, SessionStart, SessionEnd, SubagentStart, SubagentStop, PreCompact, PostCompact, Notification) · blocking: PreToolUse, Stop, UserPromptSubmit
- **memory**: no native memory · sessions at `~/.kimi-code/sessions/<workDirKey>/<id>/` (context.jsonl, wire.jsonl, state.json) · plans at `~/.kimi-code/plans/<slug>.md`
- **other**: `~/.kimi-code/config.toml` (main config, TOML NOT JSON) · `~/.kimi-code/tui.toml` · `~/.kimi-code/credentials/` · `~/.kimi-code/mcp-oauth/`
- **note**: Path is `~/.kimi-code/` NOT `~/.kimi/`; config is `config.toml` NOT `config.json`; legacy kimi-cli deprecated

### workbuddy (WorkBuddy)
- **detect**: `~/.workbuddy/`
- **mcp**: global `~/.workbuddy/.mcp.json` · root_key `mcpServers` · JSON · stdio+HTTP · `workbuddy mcp list`
- **skills**: global `~/.workbuddy/skills/` · project `.workbuddy/skills/`
- **settings**: `~/.workbuddy/settings.json`
- **note**: Path is `~/.workbuddy/` NOT `~/.workbuddy` root; skills live under `~/.workbuddy/skills/`

### zcode (Zhipu AI / 智谱)
- **detect**: `~/.zcode/`
- **mcp**: global `~/.zcode/cli/config.json` · project `.zcode/config.json` · root_key `mcp.servers` (dot-path; also accepts `mcpServers`) · JSON · stdio+SSE+HTTP · can import from ~/.claude, ~/.codex, ~/.config/opencode, ~/.agents
- **rules**: global `~/.zcode/AGENTS.md` · project `AGENTS.md` (uses AGENTS.md NOT CLAUDE.md; onboarding one-time CLAUDE.md import only)
- **skills**: global `~/.zcode/skills/<name>/SKILL.md` · project skills dir · frontmatter: name, description
- **commands**: user-level + project-level commands dirs (Markdown)
- **agents**: global `~/.zcode/agents/` · project `.zcode/agents/` (Markdown)
- **hooks**: settings.json `hooks` field (JSON)
- **memory**: agent-memory dirs (global + project, Markdown)
- **other**: API Key config via GUI (BigModel / Z.AI / Anthropic / OpenRouter / custom)
- **note**: Root key `mcp.servers` (dot notation); uses `AGENTS.md` not `CLAUDE.md`; ZCode ≠ CodeGeeX (CodeGeeX has NO MCP/skills/rules)

### minimax-code (MiniMax / 稀宇科技)
- **detect**: MiniMax Code desktop app (user data dir, path not publicly documented)
- **mcp**: MCP client capability not officially documented; built-in Agent Team / Skills / Memory system instead
- **skills**: built-in Skills system (domain capabilities: doc processing, table analysis, PDF parsing, content writing)
- **agents**: Agent Team (multi-agent cluster, auto task decomposition, parallel sub-agents)
- **memory**: 3-tier: session-level + agent-level + global-level (experience accumulation, long-term knowledge)
- **schedule**: built-in task scheduler (daily reports, email checks, periodic inspection)
- **note**: Official recommends mmx CLI over MCP; desktop config not file-exposed

### mmx-cli (MiniMax CLI)
- **detect**: `~/.mmx/`
- **mcp**: N/A (mmx IS the tool, not an MCP client) · config `~/.mmx/config.json` · JSON · Zod validated
- **skills**: `npx skills add MiniMax-AI/cli` symlinks to `~/.claude/skills/`, `~/.openclaw/skills/`, TRAE, OpenCode, etc.
- **commands**: `mmx text chat`, `mmx image generate`, `mmx video generate`, `mmx speech synthesize`, `mmx music generate`, `mmx vision describe`, `mmx search query`
- **note**: Region trap: global=api.minimax.io / cn=api.minimaxi.com (extra 'i'); API Key + Host must match region; `mmx config set --key region --value global|cn` if 401

### qoder-cn (Alibaba / 阿里 — formerly Tongyi Lingma, 2026-05-20 renamed)
- **detect**: `~/.qoder/` (formerly `~/.lingma/`)
- **mcp** (IDE): Settings → MCP Servers UI panel · root_key `mcpServers` · JSON
- **mcp** (CLI): `qodercli mcp add <name> -- <command> <args>` · config at `~/.qoder/`
- **rules**: project `AGENTS.md` (universal standard, not .cursorrules)
- **skills**: Quest 2.0 system · Experts (specialist agents) · Subagent system
- **commands**: `qodercli` CLI commands
- **agents**: Quest 2.0 multi-agent · Experts (specialist team)
- **note**: Renamed from Tongyi Lingma on 2026-05-20; Qoder CN (国内版, GLM/DeepSeek/Kimi/MiniMax models) vs Qoder (国际版 qoder.com, GPT/Claude); supports ModelScope MCP plaza

### baidu-comate-ide (Baidu / 百度 — standalone IDE, distinct from plugin)
- **detect**: Comate AI IDE desktop app (download from comate.baidu.com)
- **mcp**: Zulu agent dialog → MCP icon config · root_key `mcpServers` · JSON · stdio+HTTP
- **rules**: `.mdr` files · 3 activation modes (always/manual/fileMatch) · same .mdr format as plugin version
- **agents**: Zulu multi-agent system (default entry) · Custom Agent · domain agents
- **commands**: slash commands
- **note**: Standalone IDE (2025-06-23 released) distinct from plugin version; global Rules/MCP config only since 2025-08 late version; cannot install official MS Python/C++ plugins (use BasedPyright/clangd)

### tencent-codebuddy-ide (Tencent / 腾讯 — standalone IDE, distinct from plugin)
- **detect**: CodeBuddy IDE desktop app
- **mcp**: IDE settings → MCP · root_key `mcpServers` · JSON · shares config with CodeBuddy CLI (`~/.codebuddy/.mcp.json`)
- **rules/skills/commands/agents/hooks/memory**: shares underlying capability with tencent-codebuddy CLI entry (see above)
- **note**: Standalone IDE distinct from plugin version; "对话即编程" full-flow (requirement→design→dev→deploy)

### iflycode (iFlytek / 讯飞星火)
- **detect**: iFlyCode desktop client / plugin
- **mcp**: via UI config bar (paste JSON) · root_key `mcpServers` · JSON
- **rules/skills/commands/agents/hooks/memory**: primarily UI-configured; no documented file-level project config paths
- **note**: Limited public docs on file-level config; MCP via UI only

### raccoon-ai (SenseTime / 商汤代码小浣熊)
- **detect**: Raccoon AI desktop client
- **mcp**: via UI config bar (paste JSON) · root_key `mcpServers` · JSON
- **rules/skills**: UI-configured; no documented file-level project config paths
- **note**: Limited public docs on file-level config; MCP via UI only

### monkeycode (Chaitin Tech / 长亭科技)
- **detect**: `~/.monkeycode/` (AGPL-3.0 open source, private deploy supported)
- **mcp**: root_key `mcpServers` · JSON · multi-model dispatch middleware
- **rules**: SDD (Spec-Driven Development) specification files
- **skills**: MonkeyScan security scanning · Git async workflow (@Monickname task dispatch)
- **note**: Enterprise security-focused; AGPL-3.0 fully open source; supports offline private deployment

### vecli (Volcano Engine / 火山引擎)
- **detect**: `~/.vecli/` (npm `@volcengine/vecli`, 2025-09 released)
- **mcp**: root_key `mcpServers` · JSON · deep integration with Volcano cloud services · AK/SK or SSO auth
- **rules**: `AGENTS.md`
- **models**: Doubao 1.6, Kimi-K2, DeepSeek v3.1 (via Volcano Ark)
- **note**: Distinct from Trae CLI (different ByteDance product line: Volcano Engine vs Trae brand); `ve`/`@volcengine/cli` is cloud-resource CLI (NOT AI tool) — do not confuse

---

## Cloud / Web AI Platforms

### bolt-new (StackBlitz)
- **detect**: `~/.boltai/`
- **mcp**: `~/.boltai/mcp.json` · root_key `servers` (NOT `mcpServers`!) · JSON · stdio · supports import from Cursor/Claude Desktop · Smithery CLI auto-config · remote MCP via `mcp-remote`
- **note**: bolt.diy (open source) uses same `servers` root key; UI Plugin Dropdown to enable/disable; API key/MCP OAuth/None auth

### qodo (formerly CodiumAI)
- **detect**: VS Code/JetBrains plugin (Qodo Gen) + CLI (Qodo Command)
- **mcp**: IDE Tools Management UI · root_key `mcpServers` · JSON · local (stdio) + remote SSE (`url` field) · Qodo CLI supports `--mcp` (self as MCP server)
- **agents**: `agents/<command-name>.toml` (TOML format: instructions, tools, commands)
- **note**: CodiumAI ≠ Codeium (Codeium→Windsurf); Enterprise has "Agentic Tools Allow List"; open-aware context engine at `https://open-aware.qodo.ai/mcp/`

### devin (Cognition)
- **detect**: Cloud SaaS (dashboard config, no local files)
- **mcp**: Devin dashboard → MCP marketplace (50+ servers) · root_key `mcpServers` · JSON · stdio+SSE+HTTP · also exposes `https://mcp.devin.ai/mcp` as server
- **note**: Cloud-config only; bidirectional MCP (client + server); Devin's wiki exposed via MCP

### v0 (Vercel)
- **detect**: Web platform (`v0.app/chat/settings/mcp-connections`)
- **mcp**: UI config (chat connectors) · auth: No Auth / Custom Headers / Bearer Token / OAuth 2.1 · also exposes `https://mcp.v0.dev` / `https://mcp.vercel.com` as server
- **note**: Bidirectional MCP; Vercel MCP server only supports whitelisted AI clients; v0+MCP is 2026-03 feature

### lovable
- **detect**: Web platform (`lovable.dev`)
- **mcp**: Chat Connectors UI (client side) · built-in connectors: Notion, Linear, Jira, Confluence, n8n, Miro, Sentry · auth: OAuth/Bearer/None · also exposes `https://mcp.lovable.dev` as server (Research Preview, 2026-05)
- **note**: Bidirectional MCP; server-side OAuth limited to ChatGPT/Claude/Claude Code/Cursor/VS Code; Enterprise server disabled by default

### gptel-mcp-el (Emacs)
- **detect**: `~/.emacs.d/` (init.el config)
- **mcp**: via `mcp.el` package (elisp config) · `mcp-hub-start` · register MCP tools to gptel
- **rules**: elisp config
- **note**: Emacs ecosystem; requires lisp knowledge; gptel supports ChatGPT/Claude/Gemini/Ollama/Grok; integrated into Doom Emacs

---

## Cross-IDE Memory Solutions

| Solution | Type | Setup | Privacy | Cross-IDE |
|----------|------|-------|---------|-----------|
| **mem0 Cloud** | MCP server (HTTP) | `https://mcp.mem0.ai/mcp` + API key | Cloud | All MCP clients |
| **OpenMemory MCP** | MCP server (local Docker) | `http://localhost:8765` | Local | All MCP clients |
| **Pieces LTM-2.7** | MCP server (local PiecesOS) | `http://localhost:39300/.../sse` | Local | All MCP clients |
| **Cline memory-bank** | Markdown files | `memory-bank/*.md` in project | Local | Manual copy |
| **Claude Code memory** | Markdown files | `~/.claude/projects/<encoded>/memory/` | Local | Manual copy |

For MCP-based memory (mem0, OpenMemory, Pieces): install the MCP server in target IDE via standard MCP config. Memory follows API key (cloud) or stays on device (local).
