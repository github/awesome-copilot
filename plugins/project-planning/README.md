# Project Planning & Management Plugin

Tools and guidance for software project planning, feature breakdown, epic management, implementation planning, and task organization for development teams.

## Installation

```bash
# Using Copilot CLI
copilot plugin install project-planning@awesome-copilot
```

## What's Included

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/project-planning:breakdown-feature-implementation` | Prompt for creating detailed feature implementation plans, following Epoch monorepo structure. |
| `/project-planning:breakdown-feature-prd` | Prompt for creating Product Requirements Documents (PRDs) for new features, based on an Epic. |
| `/project-planning:breakdown-epic-arch` | Prompt for creating the high-level technical architecture for an Epic, based on a Product Requirements Document. |
| `/project-planning:breakdown-epic-pm` | Prompt for creating an Epic Product Requirements Document (PRD) for a new epic. This PRD will be used as input for generating a technical architecture specification. |
| `/project-planning:create-implementation-plan` | Create a new implementation plan file for new features, refactoring existing code or upgrading packages, design, architecture or infrastructure. |
| `/project-planning:update-implementation-plan` | Update an existing implementation plan file with new or update requirements to provide new features, refactoring existing code or upgrading packages, design, architecture or infrastructure. |
| `/project-planning:create-github-issues-feature-from-implementation-plan` | Create GitHub Issues from implementation plan phases using feature_request.yml or chore_request.yml templates. |
| `/project-planning:create-technical-spike` | Create time-boxed technical spike documents for researching and resolving critical development decisions before implementation. |

### Agents

| Agent | Description |
|-------|-------------|
| `task-planner` | Task planner for creating actionable implementation plans - Brought to you by microsoft/edge-ai |
| `task-researcher` | Task research specialist for comprehensive project analysis - Brought to you by microsoft/edge-ai |
| `planner` | Generate an implementation plan for new features or refactoring existing code. |
| `plan` | Strategic planning and architecture assistant focused on thoughtful analysis before implementation. Helps developers understand codebases, clarify requirements, and develop comprehensive implementation strategies. |
| `prd` | Generate a comprehensive Product Requirements Document (PRD) in Markdown, detailing user stories, acceptance criteria, technical considerations, and metrics. Optionally create GitHub issues upon user confirmation. |
| `implementation-plan` | Generate an implementation plan for new features or refactoring existing code. |
| `research-technical-spike` | Systematically research and validate technical spike documents through exhaustive investigation and controlled experimentation. |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
