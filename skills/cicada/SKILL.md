---
name: "cicada"
description: "Multi-agent team orchestrator for GitHub Copilot CLI — launches coordinated PM, Engineer, Reviewer, and Tester agents in Windows Terminal"
---

# Cicada — Multi-Agent Copilot CLI Orchestrator

Orchestrate a team of specialized GitHub Copilot CLI agents that collaborate through a shared MCP coordination server.

## What It Does

Cicada launches multiple Copilot CLI instances in Windows Terminal, each with a defined role (PM, Engineer, Reviewer, Tester). Agents communicate via an MCP server that provides:

- **Team messaging** — agents send messages to each other
- **Shared task board** — create, assign, and track tasks with needs-rework cycles
- **Role awareness** — each agent knows its role and teammates
- **Autopilot mode** — agents re-prompt automatically when pending work arrives

## Installation

```powershell
git clone https://github.com/lewiswigmore/cicada.git
cd cicada
pwsh -File .\Install-Cicada.ps1
```

## Usage

```powershell
cicada                          # launch default 4-agent team
cicada --team engineer,reviewer # custom team
cicada --autopilot              # autopilot + auto-approve
cicada --doctor                 # verify dependencies
```

## Requirements

- Windows + Windows Terminal
- PowerShell 7+
- Python 3.10+
- GitHub Copilot CLI

## Links

- [Repository](https://github.com/lewiswigmore/cicada)
- [Installation Guide](https://github.com/lewiswigmore/cicada/blob/master/INSTALL.md)
