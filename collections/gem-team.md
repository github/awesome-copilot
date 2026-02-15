# Gem Team Multi-Agent Orchestration

A modular multi-agent team for complex project execution with DAG-based planning, parallel execution, TDD verification, and automated testing.

**Tags:** multi-agent, orchestration, dag-planning, parallel-execution, tdd, verification, automation, security

## Items in this Collection

| Title | Type | Description | MCP Servers |
| ----- | ---- | ----------- | ----------- |
| [Gem Orchestrator](../agents/gem-orchestrator.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-orchestrator.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-orchestrator.agent.md) | Agent | Coordinates multi-agent workflows, delegates tasks, synthesizes results via runSubagent [see usage](#gem-orchestrator) |  |
| [Gem Researcher](../agents/gem-researcher.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-researcher.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-researcher.agent.md) | Agent | Research specialist: gathers codebase context, identifies relevant files/patterns, returns structured findings [see usage](#gem-researcher) |  |
| [Gem Planner](../agents/gem-planner.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-planner.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-planner.agent.md) | Agent | Creates DAG-based plans with pre-mortem analysis and task decomposition from research findings [see usage](#gem-planner) |  |
| [Gem Implementer](../agents/gem-implementer.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-implementer.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-implementer.agent.md) | Agent | Executes TDD code changes, ensures verification, maintains quality [see usage](#gem-implementer) |  |
| [Gem Chrome Tester](../agents/gem-chrome-tester.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-chrome-tester.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-chrome-tester.agent.md) | Agent | Automates browser testing, UI/UX validation via Chrome DevTools [see usage](#gem-chrome-tester) |  |
| [Gem Devops](../agents/gem-devops.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-devops.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-devops.agent.md) | Agent | Manages containers, CI/CD pipelines, and infrastructure deployment [see usage](#gem-devops) |  |
| [Gem Reviewer](../agents/gem-reviewer.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-reviewer.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-reviewer.agent.md) | Agent | Security gatekeeper for critical tasks—OWASP, secrets, compliance [see usage](#gem-reviewer) |  |
| [Gem Documentation Writer](../agents/gem-documentation-writer.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-documentation-writer.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fgem-documentation-writer.agent.md) | Agent | Generates technical docs, diagrams, maintains code-documentation parity [see usage](#gem-documentation-writer) |  |

## Collection Usage

### Gem Orchestrator

recommended

The Orchestrator is the coordination hub that coordinates multi-agent workflows, delegates tasks via runSubagent, and synthesizes results. It does not execute tasks directly but manages the overall workflow.

This agent is ideal for:
- Coordinating complex multi-agent workflows
- Managing task delegation and parallel execution
- Synthesizing results from multiple agents
- Maintaining plan.yaml state

To get the best results, consider:
- Start with the Orchestrator for any complex project
- Provide clear goals and constraints
- Review the plan.yaml before execution
- Use the walkthrough summaries to track progress

---

### Gem Researcher

recommended

The Researcher gathers codebase context, identifies relevant files/patterns, and returns structured findings. It is typically invoked by the Orchestrator with a specific focus area.

This agent is ideal for:
- Understanding codebase structure and patterns
- Identifying relevant files for a specific feature
- Gathering context before making changes
- Researching technical dependencies

To get the best results, consider:
- Specify a clear focus area or question
- Provide context about what you're trying to achieve
- Use multiple Researchers in parallel for different areas

---

### Gem Planner

recommended

The Planner creates DAG-based plans with pre-mortem analysis, presents for approval, and iterates on feedback. It synthesizes research findings into a structured plan.

This agent is ideal for:
- Breaking down complex goals into atomic tasks
- Creating task dependencies (DAG)
- Running pre-mortem analysis to identify risks
- Getting approval before execution

To get the best results, consider:
- Provide clear research findings from the Researcher
- Review the plan carefully before approving
- Ask for iterations if the plan is not optimal
- Use the plan_review tool for collaborative planning

---

### Gem Implementer

recommended

The Implementer executes TDD code changes, ensures verification, and maintains quality. It follows strict TDD discipline with verification commands.

This agent is ideal for:
- Implementing features with TDD discipline
- Writing tests first, then code
- Ensuring verification commands pass
- Maintaining code quality

To get the best results, consider:
- Always provide verification commands
- Follow TDD: red, green, refactor
- Check get_errors after every edit
- Keep changes minimal and focused

---

### Gem Chrome Tester

optional

The Chrome Tester automates browser testing and UI/UX validation via Chrome DevTools. It requires Chrome DevTools MCP server.

This agent is ideal for:
- Automated browser testing
- UI/UX validation
- Capturing screenshots and snapshots
- Testing web applications

To get the best results, consider:
- Have Chrome DevTools MCP server installed
- Provide clear test scenarios
- Use snapshots for debugging
- Test on different viewports

---

### Gem Devops

optional

The DevOps agent manages containers, CI/CD pipelines, and infrastructure deployment. It handles infrastructure as code and deployment automation.

This agent is ideal for:
- Setting up CI/CD pipelines
- Managing containers (Docker, Kubernetes)
- Infrastructure deployment
- DevOps automation

To get the best results, consider:
- Provide clear infrastructure requirements
- Use IaC best practices
- Test pipelines locally
- Document deployment processes

---

### Gem Reviewer

recommended

The Reviewer is a security gatekeeper for critical tasks. It applies OWASP scanning, secrets detection, and compliance verification.

This agent is ideal for:
- Security code reviews
- OWASP Top 10 scanning
- Secrets and PII detection
- Compliance verification

To get the best results, consider:
- Use for all critical security changes
- Review findings carefully
- Address all security issues
- Keep documentation updated

---

### Gem Documentation Writer

optional

The Documentation Writer generates technical docs, diagrams, and maintains code-documentation parity.

This agent is ideal for:
- Generating technical documentation
- Creating diagrams
- Keeping docs in sync with code
- API documentation

To get the best results, consider:
- Provide clear context and requirements
- Review generated docs for accuracy
- Update docs with code changes
- Use consistent documentation style

---

*This collection includes 8 curated items for **Gem Team Multi-Agent Orchestration**.*