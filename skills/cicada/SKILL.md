---
name: "cicada"
description: "Multi-agent team orchestrator for GitHub Copilot CLI — launches coordinated Coder, Reviewer, Tester, and Researcher agents in Windows Terminal"
---

# Cicada — Multi-Agent Copilot CLI Orchestrator

Orchestrate a team of specialized GitHub Copilot CLI agents that collaborate through a shared MCP coordination server.

## What It Does

Cicada launches multiple Copilot CLI instances in Windows Terminal, each with a defined role (Coder, Reviewer, Tester, Researcher). Agents communicate via an MCP server that provides:

- **Team messaging** — agents send messages to each other
- **Shared task board** — create, assign, and track tasks
- **Role awareness** — each agent knows its role and teammates

## Installation

```powershell
git clone https://github.com/lewiswigmore/cicada.git
cd cicada
pwsh -File .\Install-Cicada.ps1
```

## Usage

```powershell
cicada                    # launch default team
cicada --roles coder,reviewer  # custom team
cicada --doctor           # verify dependencies
```

## Requirements

- Windows + Windows Terminal
- PowerShell 7+
- Python 3.10+
- GitHub Copilot CLI

## Links

- [Repository](https://github.com/lewiswigmore/cicada)
- [Installation Guide](https://github.com/lewiswigmore/cicada/blob/master/INSTALL.md)
