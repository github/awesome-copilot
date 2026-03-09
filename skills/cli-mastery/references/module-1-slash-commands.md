# Module 1: Slash Commands

Teach these categories one at a time, with examples and "when to use" guidance.

## Getting Started

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/login` | Authenticate with GitHub | First launch or expired session |
| `/logout` | Sign out | Switching accounts |
| `/help` | Show all commands | When lost |
| `/exit` `/quit` | Exit CLI | Done working |
| `/init` | Bootstrap copilot-instructions.md | New repo setup |
| `/terminal-setup` | Configure multiline input | First-time setup |

## Models & Agents

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/model` | Switch AI model | Need different capability/speed |
| `/agent` | Browse/select agents | Delegate to specialist |
| `/fleet` | Enable parallel subagents | Complex multi-part tasks |
| `/tasks` | View background tasks | Check on running subagents |

## Code & Review

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/diff` | Review changes in current dir | Before committing |
| `/review` | Run code review agent | Get feedback on changes |
| `/lsp` | Manage language servers | Need go-to-def, diagnostics |
| `/ide` | Connect to IDE workspace | Want IDE integration |

## Session & Context

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/context` | Show token usage visualization | Context getting large |
| `/usage` | Display session metrics | Check premium request count |
| `/compact` | Compress conversation history | Near context limit |
| `/session` | Show session info | Need session details |
| `/resume` | Switch to different session | Continue previous work |
| `/rename` | Rename current session | Better organization |
| `/share` | Export session to markdown/gist | Share with team |
| `/copy` | Copy last response to clipboard | Grab AI output quickly |
| `/clear` | Clear conversation history | Fresh start |

## Permissions & Directories

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/allow-all` | Enable all permissions | Trusted environment, move fast |
| `/add-dir` | Add trusted directory | Working across projects |
| `/list-dirs` | Show allowed directories | Check access scope |
| `/cwd` | Change working directory | Switch project context |
| `/reset-allowed-tools` | Revoke tool approvals | Tighten security |

## Configuration & Customization

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/instructions` | View active instruction files | Debug custom behavior |
| `/experimental` | Toggle experimental features | Try autopilot mode |
| `/theme` | Change terminal theme | Personalize |
| `/streamer-mode` | Hide sensitive info | Livestreaming/demos |
| `/changelog` | Show release notes | After update |
| `/update` | Update CLI | New version available |
| `/feedback` | Submit feedback | Report bug or request |

## Extensibility

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/skills` | Manage skills | Browse/enable capabilities |
| `/mcp` | Manage MCP servers | Add external tools |
| `/plugin` | Manage plugins | Extend functionality |

## Workflows & Research

| Command | What it does | When to use |
|---------|-------------|-------------|
| `/plan` | Create implementation plan | Before complex changes |
| `/research` | Run deep research investigation | Need thorough analysis with sources |
| `/user` | Manage GitHub user list | Team context |

## Quiz (5+ questions, use ask_user with 4 choices each)

Ask "Which command would you use to [scenario]?" style questions.
