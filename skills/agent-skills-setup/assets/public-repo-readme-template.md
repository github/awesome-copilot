# {{SKILL_NAME}}

[![GitHub](https://img.shields.io/badge/GitHub-{{REPO_NAME}}-181717?logo=github)](https://github.com/{{REPO_NAME}})
[![License](https://img.shields.io/badge/License-MIT-0b7285.svg)](LICENSE)

Reusable multi-agent skill for Antigravity, Claude Code, OpenAI Codex, GitHub Copilot, Trae, OpenClaw, and related tooling.

面向 Antigravity、Claude Code、OpenAI Codex、GitHub Copilot、Trae、OpenClaw 及相关工具链的可复用多代理 skill。

日本語: Antigravity を起点に、OpenClaw を含む複数のエージェントへ展開できる再利用可能な skill です。

Español: Skill reutilizable para varios agentes, diseñado para distribuirse desde Antigravity hacia OpenClaw y otros entornos.

## At A Glance

| Language | Summary |
|---|---|
| English | A publishable skill repository template with install guidance and multi-agent compatibility notes. |
| 中文 | 一个可直接公开发布的 skill 仓库模板，附带安装说明和多代理兼容提示。 |
| 日本語 | インストール手順とマルチエージェント対応情報を含む、公開向け skill リポジトリの雛形です。 |
| Español | Plantilla de repositorio publicable para skills, con instalación y notas de compatibilidad multiagente. |

## Table Of Contents

- [What It Does](#what-it-does)
- [Supported Agents](#supported-agents)
- [Repository Layout](#repository-layout)
- [Install](#install)
- [Example Prompts](#example-prompts)
- [Notes](#notes)

## What It Does

Describe the exact workflow or capability this skill adds.

说明这个 skill 具体解决什么问题，以及它覆盖的工作流。

## Supported Agents

- Antigravity
- Claude Code
- OpenAI Codex
- GitHub Copilot
- Trae
- Trae CN
- OpenClaw

Adjust this list if the skill only supports a subset.

如果只支持其中一部分 agent，请按实际情况裁剪列表。

## Repository Layout

```text
.
├── README.md
└── {{SKILL_NAME}}/
    ├── SKILL.md
    ├── scripts/
    ├── references/
    └── assets/
```

## Install

### skills.sh CLI

```bash
npx skills add {{REPO_NAME}}
```

### ClawHub

```bash
clawhub publish ./{{SKILL_NAME}} --slug {{SKILL_NAME}} --name "{{SKILL_NAME}}" --version 1.0.0 --tags latest
```

### Manual Install

Copy the `{{SKILL_NAME}}/` folder into the appropriate global or project-level skills directory for your agent.

将 `{{SKILL_NAME}}/` 目录复制到对应 agent 的全局或项目级 skills 目录中。

## Example Prompts

- Add practical prompt examples here.
- Explain when the skill should be invoked.
- 增加实际提示词示例。
- 说明什么场景下应该触发这个 skill。

## Notes

- Replace any local-only assumptions before publishing.
- Document OS or shell requirements for bundled scripts.
- Add a license before publishing publicly.
- 发布前替换所有本地私有路径或机器特定假设。
- 为脚本注明操作系统和 shell 要求。
- 公开发布前补齐许可证和 changelog。