# OpenClaw Skills Configuration / OpenClaw 技能配置

OpenClaw has the richest skills model in this repository: it supports bundled skills, shared user-managed skills, per-agent workspace skills, ClawHub registry distribution, metadata-driven dependency installers, per-run env injection, and hot reload.

OpenClaw 是本仓库里技能模型最完整的运行时之一，支持运行时内置技能、用户共享技能、按 agent 隔离的工作区技能、ClawHub 注册表分发、基于元数据的依赖安装、按次注入环境变量，以及技能热重载。

This guide maps those official capabilities into a reproducible setup and maintenance workflow.

本指南把这些官方能力整理成可复现的配置、同步和维护流程。

## 1. Official Paths and Load Order / 官方路径与加载顺序

OpenClaw loads skills from four sources.

OpenClaw 会从四类来源加载技能。

| Layer / 层级 | Path / 路径 | Scope / 作用域 | Precedence / 优先级 |
|---|---|---|---|
| Workspace skills / 工作区技能 | `<agent-workspace>/skills/` | One agent only / 单个 agent | Highest / 最高 |
| Managed skills / 共享托管技能 | `~/.openclaw/skills/` | Shared on one machine / 单机共享 | Medium / 中 |
| Bundled skills / 内置技能 | Built into OpenClaw / OpenClaw 自带 | Runtime-wide / 运行时级别 | Lower / 较低 |
| Extra dirs / 额外目录 | `skills.load.extraDirs` | Shared packs / 共享技能包 | Lowest / 最低 |

Resolution order for duplicate skill names:

同名 skill 的解析顺序为：

`<agent-workspace>/skills` → `~/.openclaw/skills` → bundled skills → `skills.load.extraDirs`

Important filesystem locations from the official docs:

官方文档中最重要的路径：

- Config file / 配置文件: `~/.openclaw/openclaw.json`
- Global env fallback / 全局环境变量兜底文件: `~/.openclaw/.env`
- Shared skills / 共享技能目录: `~/.openclaw/skills`
- Default workspace / 默认工作区: `~/.openclaw/workspace`
- Agent sessions / agent 会话目录: `~/.openclaw/agents/<agentId>/sessions/`
- Multi-instance overrides / 多实例覆盖变量: `OPENCLAW_CONFIG_PATH`, `OPENCLAW_STATE_DIR`

## 2. Global Configuration / 全局配置

All OpenClaw skill settings live under the `skills` key in `~/.openclaw/openclaw.json`.

OpenClaw 的技能配置统一写在 `~/.openclaw/openclaw.json` 的 `skills` 节点下。

### 2.1 Core fields / 核心字段

| Field / 字段 | Purpose / 作用 | Official behavior / 官方行为 |
|---|---|---|
| `skills.allowBundled` | Allowlist bundled skills / 限定启用哪些内置技能 | Does not affect managed or workspace skills / 不影响托管或工作区技能 |
| `skills.load.extraDirs` | Extra scan roots / 额外扫描目录 | Lowest precedence / 最低优先级 |
| `skills.load.watch` | Skill watcher switch / 技能监听开关 | Default `true` / 默认为 `true` |
| `skills.load.watchDebounceMs` | Watch debounce / 监听防抖 | Default `250` / 默认为 `250` |
| `skills.install.preferBrew` | Prefer Homebrew / 优先 Homebrew | Default `true` / 默认为 `true` |
| `skills.install.nodeManager` | Node package backend / Node 包管理器 | `npm`, `pnpm`, `yarn`, `bun` |
| `skills.entries.<skill>.enabled` | Enable or disable one skill / 启用或禁用单个技能 | `false` disables it even if present / 即使目录存在也会被禁用 |
| `skills.entries.<skill>.env` | Per-skill env injection / 单 skill 环境变量注入 | Added only if absent from process env / 仅在进程环境缺失时补充 |
| `skills.entries.<skill>.apiKey` | SecretRef or convenience key / SecretRef 或密钥快捷配置 | Useful with `metadata.openclaw.primaryEnv` / 常用于 `metadata.openclaw.primaryEnv` |
| `skills.entries.<skill>.config` | Free-form config bag / 自定义配置对象 | Skill-defined settings / 由 skill 自己解释 |

### 2.2 Example / 示例

```json5
// ~/.openclaw/openclaw.json
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
  skills: {
    allowBundled: ["peekaboo", "gifgrep"],
    load: {
      extraDirs: [
        "~/.gemini/antigravity/skills",
        "~/Projects/internal-openclaw-skill-pack/skills",
      ],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",
    },
    entries: {
      "agent-skills-setup": {
        enabled: true,
        env: {
          OPENCLAW_SKILLS_SOURCE: "~/.gemini/antigravity/skills",
        },
        config: {
          preferredScope: "managed",
        },
      },
    },
  },
}
```

### 2.3 Environment resolution / 环境变量解析顺序

OpenClaw reads missing env vars from these sources:

当进程环境变量缺失时，OpenClaw 会依次尝试以下来源：

1. Parent process environment / 父进程环境变量
2. `.env` in the current working directory / 当前工作目录下的 `.env`
3. `~/.openclaw/.env`
4. `skills.entries.<skill>.env` in `openclaw.json`

Important caveat: `skills.entries.*.env` and `skills.entries.*.apiKey` only affect host runs. They do not automatically populate Docker sandbox env.

重要限制：`skills.entries.*.env` 和 `skills.entries.*.apiKey` 只对宿主机运行有效，不会自动注入 Docker sandbox。

## 3. Per-Agent Configuration, Isolation, and Inheritance / 单 Agent 配置、隔离与继承

OpenClaw isolates agents through workspaces. Each workspace can carry its own `skills/` directory.

OpenClaw 通过工作区实现 agent 隔离，每个工作区都可以拥有独立的 `skills/` 目录。

### 3.1 Default workspace and explicit agents / 默认工作区与显式 agent

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
    list: [
      {
        id: "home",
        default: true,
        workspace: "~/.openclaw/workspace-home",
      },
      {
        id: "work",
        workspace: "~/.openclaw/workspace-work",
      },
    ],
  },
}
```

Each workspace can then override shared skills through its own directory.

随后每个工作区都可以通过自己的目录覆盖共享技能。

- `~/.openclaw/workspace-home/skills/`
- `~/.openclaw/workspace-work/skills/`

### 3.2 Scope isolation rules / 作用域隔离规则

| Scope / 范围 | Isolation / 隔离度 | Shared? / 是否共享 | Typical use / 典型用途 |
|---|---|---|---|
| `<agent-workspace>/skills/` | Per agent / 单 agent | No / 否 | Persona or team overrides / 角色或团队定制 |
| `~/.openclaw/skills/` | Machine-wide / 单机级别 | Yes / 是 | Shared personal pack / 共享个人技能包 |
| `skills.load.extraDirs` | Machine-wide / 单机级别 | Yes / 是 | Mirrored read-only packs / 镜像只读技能包 |
| Bundled skills / 内置技能 | Runtime-wide / 运行时级别 | Yes / 是 | Baseline built-ins / 基础内置能力 |

### 3.3 Priority and inheritance / 优先级与继承

OpenClaw skill precedence is path-based:

OpenClaw 的技能优先级是按路径决定的：

1. Workspace skill wins / 工作区技能优先。
2. Shared managed skill is next / 其次是共享托管技能。
3. Bundled skill is fallback / 然后是内置技能。
4. `skills.load.extraDirs` are lowest / `skills.load.extraDirs` 最低。

Config inheritance is different:

配置继承与技能文件继承不同：

- `agents.defaults.*` provides base agent settings.
- `agents.defaults.*` 提供默认 agent 配置。
- `agents.list[]` overrides only the matching agent.
- `agents.list[]` 只覆盖匹配到的 agent。
- `skills.entries.*` is global to the gateway process.
- `skills.entries.*` 对当前 gateway 进程全局生效。

If you need full isolation of config, skills, sessions, and credentials, split by `OPENCLAW_CONFIG_PATH` and `OPENCLAW_STATE_DIR`.

如果你需要配置、技能、会话和凭据的完全隔离，应拆分 `OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_STATE_DIR`。

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/work.json \
OPENCLAW_STATE_DIR=~/.openclaw-work \
openclaw gateway --port 19001
```

### 3.4 Sandboxed agents / 沙箱 agent

When a skill must run inside Docker sandboxed agents, mirror env into sandbox settings as well.

当 skill 需要在 Docker sandbox 中运行时，除了 `skills.entries` 外，还要把环境变量同步到 sandbox 配置中。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        backend: "docker",
        docker: {
          env: {
            LANG: "C.UTF-8",
            GEMINI_API_KEY: "${GEMINI_API_KEY}",
          },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
        },
      },
    },
  },
}
```

## 4. Skill Metadata and Installers / 技能元数据与安装器

OpenClaw extends skill metadata under `metadata.openclaw`.

OpenClaw 通过 `metadata.openclaw` 扩展技能元数据。

### 4.1 Example metadata / 元数据示例

```yaml
---
name: gifgrep
description: Search GIF providers with CLI/TUI, download results, and extract stills/sheets.
homepage: https://gifgrep.com
metadata: {"openclaw":{"emoji":"🧲","requires":{"bins":["gifgrep"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/gifgrep","bins":["gifgrep"],"label":"Install gifgrep (brew)"}]}}
---
```

### 4.2 Official installer kinds / 官方安装器类型

| Kind | Fields |
|---|---|
| `brew` | `formula`, `bins`, `label`, `os` |
| `node` | `package`, `bins`, `label`, `os` |
| `go` | `module`, `bins`, `label`, `os` |
| `uv` | `package`, `bins`, `label`, `os` |
| `download` | `url`, `sha256`, `archive`, `extract`, `stripComponents`, `targetDir`, `bins`, `label`, `os` |

Notes:

说明：

- OpenClaw prefers `brew` when available, otherwise `node` if multiple installers exist.
- 存在多个安装器时，OpenClaw 优先使用 `brew`，否则通常回落到 `node`。
- `download` installers default to `~/.openclaw/tools/<skillKey>` if `targetDir` is omitted.
- `download` 安装器在未指定 `targetDir` 时，默认解压到 `~/.openclaw/tools/<skillKey>`。
- Set `sha256` to the expected 64-character SHA-256 digest. The helper verifies it before extracting or writing to `targetDir`; legacy specs without it emit a warning.
- 请把 `sha256` 设为预期的 64 位 SHA-256 摘要。辅助脚本会在解压或写入 `targetDir` 前完成校验；旧版未提供该字段的配置会输出警告。
- `skills.install.nodeManager` affects skill dependency installs, not the OpenClaw runtime itself.
- `skills.install.nodeManager` 只控制 skill 依赖安装，不控制 OpenClaw 运行时本身的安装方式。

## 5. Automatic Setup Workflow / 自动化配置流程

This repository includes a dedicated helper:

本仓库已经内置了一个专用自动化脚本：

```bash
bash skills/agent-skills-setup/scripts/auto-configure-openclaw-skills.sh \
  --yes \
  --scope both \
  --agent home:~/.openclaw/workspace-home \
  --agent work:~/.openclaw/workspace-work \
  --default-agent home \
  --node-manager npm \
  --env agent-skills-setup:OPENCLAW_SKILLS_SOURCE=~/.gemini/antigravity/skills
```

What it does:

它会完成以下动作：

1. Install OpenClaw if `openclaw` is missing.
2. 如果 `openclaw` 缺失，则安装 OpenClaw。
3. Install ClawHub if `clawhub` is missing.
4. 如果 `clawhub` 缺失，则安装 ClawHub。
5. Sync selected skills into `~/.openclaw/skills/` and workspace `skills/` directories.
6. 把指定技能同步到 `~/.openclaw/skills/` 和各 workspace 的 `skills/` 目录。
7. Parse `metadata.openclaw.install` and install declared dependencies.
8. 解析 `metadata.openclaw.install` 并安装声明的依赖。
9. Patch `~/.openclaw/openclaw.json` with `skills.*` and `agents.*` settings.
10. 把 `skills.*` 和 `agents.*` 配置写入 `~/.openclaw/openclaw.json`。
11. Run `openclaw doctor` after a real apply.
12. 真正执行后运行 `openclaw doctor` 做健康检查。

## 6. Updates and Lifecycle / 更新与生命周期管理

OpenClaw has two first-class update surfaces plus local mirrors.

OpenClaw 存在两个一等更新面，再加上本地镜像更新层。

### 6.1 Runtime updates / 运行时更新

```bash
openclaw update
openclaw update --channel beta
openclaw update --tag main
openclaw update --dry-run
```

### 6.2 ClawHub updates / ClawHub 更新

```bash
clawhub update --all
```

ClawHub stores install state in `.clawhub/lock.json` and compares local content hashes against published versions.

ClawHub 会把安装状态记录在 `.clawhub/lock.json` 中，并用内容哈希对比本地版本和已发布版本。

### 6.3 Local mirror updates / 本地镜像更新

```bash
bash skills/agent-skills-setup/scripts/update-openclaw-skills.sh
```

This helper combines:

这个脚本会把以下流程串起来：

1. `openclaw update`
2. `clawhub update --all`
3. `rsync` refresh for `~/.openclaw/skills/` and workspace `skills/`

## 7. OpenClaw vs Other IDE Skills / OpenClaw 与其他 IDE 技能体系对比

| Capability / 能力 | OpenClaw | Claude/Codex/Trae/Copilot |
|---|---|---|
| Bundled skills / 内置技能 | Yes | Usually no |
| Shared managed skills / 共享托管技能 | Yes | Sometimes, but less structured |
| Per-agent workspaces / 按 agent 工作区隔离 | Yes | Usually project or global only |
| Load-time gating / 加载时条件门控 | Yes | Rare |
| Metadata-driven installers / 基于元数据安装依赖 | Yes | Rare |
| Per-run env injection / 单次运行环境注入 | Yes | Usually external only |
| Registry updates / 注册表更新 | Yes, via ClawHub | Usually ad hoc Git repos |
| Watcher and hot reload / 监听与热更新 | Yes | Rare |

Practical implication:

实际含义：

OpenClaw is not just another folder for `SKILL.md`; it is a managed skill runtime.

OpenClaw 不只是多了一个放 `SKILL.md` 的目录，而是一个带安装、门控、更新和发现能力的托管技能运行时。

## 8. Cross-IDE Integration Strategy / 跨 IDE 集成策略

Recommended model:

推荐模型：

1. Keep Antigravity as the authoring source of truth.
2. 保持 Antigravity 为唯一事实来源。
3. Run `sync-global-skills.sh --targets claude,codex,copilot,openclaw,trae,trae-cn` for global mirrors.
4. 通过 `sync-global-skills.sh --targets claude,codex,copilot,openclaw,trae,trae-cn` 做全局镜像。
5. Use `auto-configure-openclaw-skills.sh` when OpenClaw-specific dependency installs or per-agent routing are required.
6. 当需要 OpenClaw 特有的依赖安装和按 agent 路由时，使用 `auto-configure-openclaw-skills.sh`。
7. Use `update-openclaw-skills.sh` for maintenance.
8. 维护阶段使用 `update-openclaw-skills.sh`。

## 9. Validation Plan / 验证方案

### 9.1 Automated smoke test / 自动化冒烟测试

```bash
bash skills/agent-skills-setup/scripts/test-openclaw-support.sh
```

This covers managed sync, workspace sync, config patching, dependency install flow, and update refresh behavior.

这个测试覆盖共享目录同步、工作区同步、配置写入、依赖安装流程以及更新刷新行为。

### 9.2 Real-machine test guidance / 真实机器测试指引

Use isolated state roots when testing on a machine that already has OpenClaw installed.

当你在已经安装 OpenClaw 的机器上测试时，必须使用隔离的状态目录。

```bash
OPENCLAW_STATE_DIR=/tmp/openclaw-test-state \
OPENCLAW_CONFIG_PATH=/tmp/openclaw-test-state/openclaw.json \
AGENT_SKILLS_OPENCLAW_DIR=/tmp/openclaw-test-state/skills \
bash skills/agent-skills-setup/scripts/auto-configure-openclaw-skills.sh --dry-run
```

The script refuses global installs, config writes, and replacement syncs unless `--yes` is supplied. Review `--dry-run` output first; existing skill directories and config files receive timestamped `.bak.*` copies before replacement.

该脚本在未提供 `--yes` 时会拒绝全局安装、配置写入和替换同步。请先审查 `--dry-run` 输出；替换前，已有技能目录和配置文件会生成带时间戳的 `.bak.*` 备份。

Important note: even with isolated config paths, `openclaw doctor` may still observe or interact with machine-global gateway state such as a running local service or LaunchAgent. Use dry runs first when non-interference matters.

重要说明：即使配置目录和状态目录已经隔离，`openclaw doctor` 仍然可能探测到本机级别的网关状态，例如正在运行的本地服务或 LaunchAgent。在“绝不干预现有环境”这一要求下，应优先使用 dry run。

### 9.3 Release guardrails / 发布门槛

1. `bash -n` passes for every new script.
2. `test-openclaw-support.sh` passes locally.
3. `sync-global-skills.sh --dry-run --targets openclaw` shows only expected changes.
4. `auto-configure-openclaw-skills.sh --dry-run` prints the expected plan.
5. Real-machine verification is documented with any observed gateway-side effects.

1. 每个新增脚本都通过 `bash -n`。
2. `test-openclaw-support.sh` 本地通过。
3. `sync-global-skills.sh --dry-run --targets openclaw` 只显示预期变更。
4. `auto-configure-openclaw-skills.sh --dry-run` 能输出正确计划。
5. 真实机器验证结果已记录，任何网关侧副作用都已明确写出。
