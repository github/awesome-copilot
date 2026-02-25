# ⚡ Agentic Workflows

[Agentic Workflows](https://github.github.com/gh-aw) are AI-powered repository automations that run coding agents in GitHub Actions. Defined in markdown with natural language instructions, they enable event-triggered and scheduled automation with built-in guardrails and security-first design.
### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-agentic-workflows) for guidelines on how to contribute new workflows, improve existing ones, and share your use cases.

### How to Use Agentic Workflows

**What's Included:**
- Each workflow is a single `.md` file with YAML frontmatter and natural language instructions
- Workflows are compiled to `.lock.yml` GitHub Actions files via `gh aw compile`
- Workflows follow the [GitHub Agentic Workflows specification](https://github.github.com/gh-aw)

**To Install:**
- Install the `gh aw` CLI extension: `gh extension install github/gh-aw`
- Copy the workflow `.md` file to your repository's `.github/workflows/` directory
- Compile with `gh aw compile` to generate the `.lock.yml` file
- Commit both the `.md` and `.lock.yml` files

**To Activate/Use:**
- Workflows run automatically based on their configured triggers (schedules, events, slash commands)
- Use `gh aw run <workflow>` to trigger a manual run
- Monitor runs with `gh aw status` and `gh aw logs`

**When to Use:**
- Automate issue triage and labeling
- Generate daily status reports
- Maintain documentation automatically
- Run scheduled code quality checks
- Respond to slash commands in issues and PRs
- Orchestrate multi-step repository automation

| Name | Description | Triggers |
| ---- | ----------- | -------- |
| [Daily Issues Report](../workflows/daily-issues-report.md) | Generates a daily summary of open issues and recent activity as a GitHub issue | schedule |
