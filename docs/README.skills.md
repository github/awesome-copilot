# 🎯 Agent Skills

Agent Skills are self-contained folders with instructions and bundled resources that enhance AI capabilities for specialized tasks. Based on the [Agent Skills specification](https://agentskills.io/specification), each skill contains a `SKILL.md` file with detailed instructions that agents load on-demand.

Skills differ from other primitives by supporting bundled assets (scripts, code samples, reference data) that agents can utilize when performing specialized tasks.
### How to Use Agent Skills

**What's Included:**
- Each skill is a folder containing a `SKILL.md` instruction file
- Skills may include helper scripts, code templates, or reference data
- Skills follow the Agent Skills specification for maximum compatibility

**When to Use:**
- Skills are ideal for complex, repeatable workflows that benefit from bundled resources
- Use skills when you need code templates, helper utilities, or reference data alongside instructions
- Skills provide progressive disclosure - loaded only when needed for specific tasks

**Usage:**
- Browse the skills table below to find relevant capabilities
- Copy the skill folder to your local skills directory
- Reference skills in your prompts or let the agent discover them automatically

| Name | Description | Bundled Assets |
| ---- | ----------- | -------------- |
| [agentic-workflow-guide](../skills/agentic-workflow-guide/SKILL.md) | Design, review, and improve agent workflows based on proven design principles (SSOT, SRP, Fail Fast, Iterative Refinement). Supports Prompt Chaining, Parallelization, Orchestrator-Workers, Evaluator-Optimizer patterns. Use when: (1) Designing new agent workflows, (2) Reviewing/improving existing workflows, (3) Planning multi-agent architectures, (4) Detecting anti-patterns, (5) Scaffolding workflow templates/directory structures, (6) Creating agent definitions, prompts, or copilot-instructions | `LICENSE.txt`<br />`references/anti-patterns.md`<br />`references/design-principles.md`<br />`references/review-checklist.md`<br />`references/workflow-patterns.md`<br />`scripts/scaffold_workflow.py` |
| [webapp-testing](../skills/webapp-testing/SKILL.md) | Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs. | `test-helper.js` |
