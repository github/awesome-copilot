# Tasks by microsoft/edge-ai

Task Researcher and Task Planner for intermediate to expert users and large codebases - Brought to you by microsoft/edge-ai

**Tags:** architecture, planning, research, tasks, implementation

## Items in this Collection

| Title | Type | Description | MCP Servers |
| ----- | ---- | ----------- | ----------- |
| [Task Plan Implementation Instructions](../instructions/task-implementation.instructions.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/instructions?url=vscode%3Achat-instructions%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Finstructions%2Ftask-implementation.instructions.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/instructions?url=vscode-insiders%3Achat-instructions%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Finstructions%2Ftask-implementation.instructions.md) | Instruction | Instructions for implementing task plans with progressive tracking and change record - Brought to you by microsoft/edge-ai [see usage](#task-plan-implementation-instructions) |  |
| [Task Planner Instructions](../agents/task-planner.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Ftask-planner.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Ftask-planner.agent.md) | Agent | Task planner for creating actionable implementation plans - Brought to you by microsoft/edge-ai [see usage](#task-planner-instructions) |  |
| [Task Researcher Instructions](../agents/task-researcher.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Ftask-researcher.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Ftask-researcher.agent.md) | Agent | Task research specialist for comprehensive project analysis - Brought to you by microsoft/edge-ai [see usage](#task-researcher-instructions) |  |

## Collection Usage

### Task Plan Implementation Instructions

Continue to use `task-planner` to iterate on the plan until you have exactly what you want done to your codebase.

When you are ready to implement the plan, **create a new chat** and switch to `Agent` mode then fire off the newly generated prompt.

```markdown, implement-fabric-rti-changes.prompt.md
---
mode: agent
title: Implement microsoft fabric realtime intelligence terraform support
---
/implement-fabric-rti-blueprint-modification phaseStop=true
```

This prompt has the added benefit of attaching the plan as instructions, which helps with keeping the plan in context throughout the whole conversation.

**Expert Warning** ->>Use `phaseStop=false` to have Copilot implement the whole plan without stopping. Additionally, you can use `taskStop=true` to have Copilot stop after every Task implementation for finer detail control.

To use these generated instructions and prompts, you'll need to update your `settings.json` accordingly:

```json
    "chat.instructionsFilesLocations": {
        // Existing instructions folders...
        ".copilot-tracking/plans": true
    },
    "chat.promptFilesLocations": {
        // Existing prompts folders...
        ".copilot-tracking/prompts": true
    },
```

---

### Task Planner Instructions

Also, task-researcher will provide additional ideas for implementation which you can work with GitHub Copilot on selecting the right one to focus on.

```markdown, task-plan.prompt.md
---
mode: task-planner
title: Plan microsoft fabric realtime intelligence terraform support
---
#file: .copilot-tracking/research/*-fabric-rti-blueprint-modification-research.md
Build a plan to support adding fabric rti to this project
```

`task-planner` will help you create a plan for implementing your task(s). It will use your fully researched ideas or build new research if not already provided.

`task-planner` will produce three (3) files that will be used by `task-implementation.instructions.md`.

* `.copilot-tracking/plan/*-plan.instructions.md`

  * A newly generated instructions file that has the plan as a checklist of Phases and Tasks.
* `.copilot-tracking/details/*-details.md`

  * The details for the implementation, the plan file refers to this file for specific details (important if you have a big plan).
* `.copilot-tracking/prompts/implement-*.prompt.md`

  * A newly generated prompt file that will create a `.copilot-tracking/changes/*-changes.md` file and proceed to implement the changes.

Continue to use `task-planner` to iterate on the plan until you have exactly what you want done to your codebase.

---

### Task Researcher Instructions

Now you can iterate on research for your tasks!

```markdown, research.prompt.md
---
mode: task-researcher
title: Research microsoft fabric realtime intelligence terraform support
---
Review the microsoft documentation for fabric realtime intelligence
and come up with ideas on how to implement this support into our terraform components.
```

Research is dumped out into a .copilot-tracking/research/*-research.md file and will include discoveries for GHCP along with examples and schema that will be useful during implementation.

Also, task-researcher will provide additional ideas for implementation which you can work with GitHub Copilot on selecting the right one to focus on.

---

