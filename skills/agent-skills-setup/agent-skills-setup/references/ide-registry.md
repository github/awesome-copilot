# IDE Reference Index

Read only the selected source and target entries. Each link records documented
paths, supported migration surfaces, and manual boundaries; a few UI-only
clients intentionally share one reference. `ide-paths.json` remains the
legacy compatibility mapping. [Registry v2](registry-v2.json) is authoritative
for product profiles, lifecycle, storage type, scope, migration policy, source,
version range, and freshness.

Registry support levels are evidence contracts, not marketing labels. No
profile is currently `full`: reviewed automatic subsets are `partial`; disputed
or undocumented products remain `manual`, `source-only`, `provider`, `legacy`,
or `unverified`. Product templates cannot authorize a legacy write. Promotion
requires current official sources, a versioned surface contract, an adapter,
fixtures, secret/rollback coverage, and a fresh documentation check.

## Lifecycle and target eligibility

| Classification | Products | Default behavior |
| --- | --- | --- |
| Legacy/source-only | Roo Code, Void, Supermaven, Firebase Studio | Inventory and export only; never target. |
| Brand alias | Codeium, Tongyi Lingma | Resolve to the named current profile; do not invent paths. |
| Provider | Pieces | Configure the consuming MCP client. |
| Editor host | Emacs, Neovim, Helix | Select a concrete plugin profile first. |
| Cloud/UI | Devin, v0, Lovable, Bolt, TRAE Work, Cody | Use official API/UI or a rebuild checklist. |
| Profiled local client | Cline, Amazon Q, Codex, ForgeCode, Augment, Windsurf, Qoder and the new CLI entries | Enforce per-surface policy and loss reporting. |

## IDE references

- [`claude-desktop`](ides/claude-desktop.md) — claude-desktop (Claude Desktop app)
- [`codely`](ides/codely.md) — codely (Tuanjie Codely / Tuanjie Cowork; Unity 中国 AI Agent)
- [`claude`](ides/claude.md) — claude (Claude Code)
- [`cursor`](ides/cursor.md) — cursor
- [`cline`](ides/cline.md) — cline
- [`roo-code`](ides/roo-code.md) — roo-code (archived 2026-05)
- [`vscode`](ides/vscode.md) — vscode (VS Code + GitHub Copilot IDE; not cloud agent or the `copilot` script target)
- [`visual-studio`](ides/visual-studio.md) — visual-studio (Visual Studio 2026/2022 + GitHub Copilot; Windows only)
- [`firebase-studio`](ides/firebase-studio.md) — firebase-studio (sunsetting 2027-03-22; existing-workspace rules source)
- [`android-studio`](ides/android-studio.md) — android-studio (Gemini in Android Studio, Quail 1+)
- [`copilot`](ides/copilot.md) — copilot-cli
- [`windsurf`](ides/windsurf.md) — windsurf
- [`codeium`](ides/codeium.md) — codeium (Codeium → Windsurf)
- [`continue`](ides/continue.md) — continue
- [`emacs`](ides/emacs.md) — emacs (GNU Emacs)
- [`augment-code`](ides/augment-code.md) — augment-code
- [`kilocode`](ides/kilocode.md) — kilocode
- [`zed`](ides/zed.md) — zed
- [`trae`](ides/trae.md) — trae
- [`trae-work`](ides/trae-work.md) — trae-work (separate product; not a supported mapper target)
- [`trae-cn`](ides/trae-cn.md) — trae-cn
- [`jetbrains`](ides/jetbrains.md) — jetbrains (Junie in JetBrains IDEs; not JetBrains AI Assistant)
- [`jetbrains-ai`](ides/jetbrains-ai.md) — jetbrains-ai (JetBrains AI Assistant; distinct from Junie)
- [`kiro`](ides/kiro.md) — kiro
- [`codex`](ides/codex.md) — codex
- [`gemini-cli`](ides/gemini-cli.md) — gemini-cli
- [`antigravity`](ides/antigravity.md) — antigravity (Antigravity IDE / shared 2.0 surface)
- [`amazon-q`](ides/amazon-q.md) — amazon-q
- [`opencode`](ides/opencode.md) — opencode
- [`goose-cli`](ides/goose-cli.md) — goose-cli (Goose CLI)
- [`openclaw`](ides/openclaw.md) — openclaw (OpenClaw)
- [`aider`](ides/aider.md) — aider
- [`openhands`](ides/openhands.md) — openhands
- [`replit`](ides/replit.md) — replit (Replit AI)
- [`sourcegraph-amp`](ides/sourcegraph-amp.md) — sourcegraph-amp
- [`cody`](ides/cody.md) — sourcegraph-cody
- [`forge`](ides/forge.md) — forge
- [`pearai`](ides/pearai.md) — pearai
- [`void-editor`](ides/void-editor.md) — void-editor
- [`tabnine`](ides/tabnine.md) — tabnine
- [`supermaven`](ides/supermaven.md) — supermaven
- [`blackbox`](ides/blackbox.md) — blackbox (Blackbox AI)
- [`pieces`](ides/pieces.md) — pieces (Pieces for Developers)
- [`helix`](ides/helix.md) — helix
- [`neovim`](ides/neovim.md) — neovim
- [`mcphub-nvim`](ides/mcphub-nvim.md) — mcphub-nvim
- [`codecompanion-nvim`](ides/codecompanion-nvim.md) — codecompanion-nvim
- [`tongyi-lingma`](ides/tongyi-lingma.md) — tongyi-lingma (DEPRECATED — renamed to Qoder CN on 2026-05-20, see `qoder-cn`)
- [`baidu-comate`](ides/baidu-comate.md) — baidu-comate
- [`tencent-codebuddy`](ides/tencent-codebuddy.md) — tencent-codebuddy
- [`kimiai`](ides/kimiai.md) — kimi-code (Moonshot AI)
- [`workbuddy`](ides/workbuddy.md) — workbuddy (WorkBuddy)
- [`zcode`](ides/zcode.md) — zcode (Zhipu AI)
- [`minimax-code`](ides/minimax-code.md) — minimax-code (MiniMax)
- [`mmx-cli`](ides/mmx-cli.md) — mmx-cli (MiniMax CLI)
- [`qoder-cn`](ides/qoder-cn.md) — qoder-cn (Alibaba — formerly Tongyi Lingma, renamed 2026-05-20)
- [`baidu-comate-ide`](ides/baidu-comate-ide.md) — baidu-comate-ide (Baidu — standalone IDE, distinct from plugin)
- [`tencent-codebuddy-ide`](ides/tencent-codebuddy-ide.md) — tencent-codebuddy-ide (Tencent — standalone IDE, distinct from plugin)
- [`iflycode`](ides/ui-only-mcp.md) — iflycode (iFlytek; shared UI-only reference)
- [`raccoon-ai`](ides/ui-only-mcp.md) — raccoon-ai (SenseTime; shared UI-only reference)
- [`monkeycode`](ides/monkeycode.md) — monkeycode (Chaitin Tech)
- [`vecli`](ides/vecli.md) — vecli (Volcano Engine)
- [`bolt-new`](ides/bolt-new.md) — bolt-new (StackBlitz)
- [`qodo`](ides/qodo.md) — qodo (formerly CodiumAI)
- [`devin`](ides/devin.md) — devin (Cognition)
- [`v0`](ides/v0.md) — v0 (Vercel)
- [`lovable`](ides/lovable.md) — lovable
- [`xcode`](ides/xcode.md) — xcode (Xcode 26.3+/27 coding agents; manual configuration boundary)
- [`gptel-mcp-el`](ides/gptel-mcp-el.md) — gptel-mcp-el (third-party Emacs packages)
- [`qoder`](ides/qoder.md) — Qoder International CLI / IDE profiles
- [`qwen-code`](ides/qwen-code.md) — Qwen Code
- [`mistral-vibe`](ides/mistral-vibe.md) — Mistral Vibe Code
- [`factory-droid`](ides/factory-droid.md) — Factory Droid
- [`warp-oz`](ides/warp-oz.md) — Warp Oz local/cloud agent CLI
- [`pi`](ides/pi.md) — Pi coding agent
- [`crush`](ides/crush.md) — Crush terminal coding agent
- [`gemini-code-assist`](ides/gemini-code-assist.md) — Gemini Code Assist
- [`gitlab-duo`](ides/gitlab-duo.md) — GitLab Duo Agent Platform
- [`hermes`](ides/hermes.md) — Hermes Agent
- [`ibm-bob`](ides/ibm-bob.md) — IBM Bob
- [`jules`](ides/jules.md) — Google Jules
- [`letta`](ides/letta.md) — Letta
- [`letta-code`](ides/letta-code.md) — Letta Code
- [`rovodev`](ides/rovodev.md) — Atlassian Rovo Dev
- [`warp`](ides/warp.md) — Warp
- [`zencoder`](ides/zencoder.md) — Zencoder
- [`zenflow`](ides/zenflow.md) — Zenflow
