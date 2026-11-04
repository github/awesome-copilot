# Foundry Agentic Loop

Build agentic solutions on Microsoft Foundry, GitHub and Azure, from a quick prototype to a verified, deployed solution.

## Install

In the GitHub Copilot App, click **Customize** in the sidebar, then **Plugins**. Find `foundry-agentic-loop` and click **Install**.

To install from the Copilot CLI instead:

```
copilot plugin install foundry-agentic-loop@awesome-copilot
```

Then ask Copilot in the App to **open the agentic loop**. The `foundry-agentic-loop` skill finds the bundled canvas and workflow, installs any that are missing and opens the canvas. It installs the `microsoft-foundry` skill only after you agree.

## Two ways to build

| Mode | Start with | Result |
| --- | --- | --- |
| **Rapid prototyping** | An existing Foundry project | Hosted agents, a governed toolbox, Foundry IQ grounding when needed and a React/FastAPI app on Container Apps, built from Chat |
| **Spec-driven development (SDD)** | A brief and an Azure subscription | `foundry-agentic-loop-workflow` creates the Foundry project and runs **Specify → Implement → Verify → Deploy** to a solution deployed with azd |

Start either mode from Chat or from the canvas. Its prompt template gallery opens with **Shape it with Copilot** for your own idea, followed by 61 industry templates you can filter by industry, capability, building block and pattern.

## Locked in by AGENTS.md

When a build starts, Copilot adds an Agentic Loop section to the workspace root `AGENTS.md`. It locks the chosen mode for Chat, the canvas and the workflow, and routes short commands in later prompts:

| Mode | Commands |
| --- | --- |
| Rapid prototyping | `run`, `test`, `add agent`, `add tool`, `add skill`, `deploy`, `improve`, `convert to SDD` |
| SDD | `status`, `approve`, `resume`, `deploy`, `specify`, `implement`, `verify`, `build <brief>`, `improve` |

For example, `deploy` in an SDD workspace resumes a run paused for deployment approval, or runs the Deploy phase when no run is active. `build <brief>` offers to resume a running or paused run before starting a new one. Other `AGENTS.md` content is kept. Azure settings, such as the subscription, region, Foundry project and resource names, live only in `.azure/deployment-plan.md`. To switch modes, ask Copilot; it confirms first, then rewrites the section.

## How SDD works

Each phase follows its guide in the `foundry-agentic-loop` skill, in fresh-context subagents:

| Phase | Work |
| --- | --- |
| Specify | EARS spec, frozen implementation contract, workstreams and deployment plan after a read-only Azure preflight |
| Implement | azd scaffold and provisioning, the hosted integration checkpoint, then parallel workstreams |
| Verify | Local end-to-end tests per acceptance criterion, hosted invocation, telemetry and Foundry evaluations |
| Deploy | `azd up` after approval, health checks and end-to-end tests against the deployed endpoints |

In each phase:

- A **lead** does the work.
- An independent **reviewer** reruns the checks and reports issues with evidence.
- **Fixers** get a bounded number of rounds, and the gate passes only on the reviewer's verdict.

The workflow pauses for your approval of the spec (unless autonomy is `auto`) and always before `azd up`. A gate that still fails after its fix rounds pauses with the evidence for your decision. Resuming replays completed steps from the journal, so finished work never runs twice. Every run writes a flight record to `.agentic-loop/runs/`.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [Foundry Agentic Loop](../../skills/foundry-agentic-loop/) | One skill: setup, mode selection, defaults and working rules, plus guides for rapid prototyping, each SDD phase and improve mode |
| Canvas | [Foundry Agentic Loop canvas](../../extensions/foundry-agentic-loop-canvas/) | Setup, project selection, the prompt template gallery, the live workflow view, exploration, optimization and costs |
| Workflow | [Foundry Agentic Loop workflow](../../extensions/foundry-agentic-loop-workflow/) | The dynamic workflow that runs the four SDD phases in sequence behind evidence gates |

## Improve mode

Each build records verified lessons in `docs/LOOP.md`, and each SDD run leaves a flight record. Ask Copilot to **improve the agentic loop** to mine both. Copilot proposes evidence-backed changes to the skill and workflow, each with a regression check, and applies only the changes you approve. The skill's eval runner (`scripts/evals.mjs`) measures each change against the base commit in isolated workspaces. Approvals, RBAC, safety and evidence gates are never weakened.

## Requirements

- GitHub Copilot App for the canvas. The workflow also runs from the Copilot CLI with `copilot workflow run foundry-agentic-loop-workflow`
- An Azure subscription, the Azure CLI and the Azure Developer CLI with its Foundry (`azure.ai.*`) extensions. The canvas Start tab helps install missing tools with Foundry DevPack, and the skill asks before installing or upgrading anything
- Python 3.13, Node.js and Git

Both modes create billable Azure resources, such as model deployments, hosted agents, Container Apps and monitoring, plus Azure AI Search when grounding needs it. Copilot confirms billable changes before making them. To remove an SDD environment, ask Copilot to tear it down. After you approve, it runs `azd down --purge` and deletes the Entra app registrations the build created, which live outside the resource group.

The skill never installs extensions from a URL or edits your Copilot settings. If the canvas or workflow is missing, it asks before reinstalling this plugin. If one is listed as disabled, re-enable it in your extension settings and continue in a new session: running sessions keep it disabled.

## Credits

Builds on [aiappsgbb/agentic-loop](https://github.com/aiappsgbb/agentic-loop) (MIT, Copyright (c) 2026 aiappsgbb) and the lean spec2cloud skills in [Azure-Samples/Spec2Cloud](https://github.com/Azure-Samples/Spec2Cloud) (MIT, Copyright (c) Microsoft Corporation).

Six industry runSkills in the skill catalog (`factory-operations-triage`, `production-flow-optimizer`, `care-gap-outreach-planner`, `post-discharge-care-coordinator`, `loan-file-readiness-reviewer` and `mortgage-underwriting-coordinator`) are pulled from [aiappsgbb/agentic-loop](https://github.com/aiappsgbb/agentic-loop) with `gh skill install` only when a build prompt names one; Copilot names the source repository before installing. Review them as you would any third-party skill.
