#!/usr/bin/env python3
"""
scaffold_workflow.py - Generate directory structure for agent workflows

Usage:
    python scaffold_workflow.py <workflow-name> [--pattern <pattern>] [--path <output-dir>]

Examples:
    python scaffold_workflow.py my-workflow
    python scaffold_workflow.py code-review --pattern evaluator-optimizer
    python scaffold_workflow.py data-pipeline --pattern orchestrator-workers --path ./projects
"""

import argparse
import os
from pathlib import Path

# Common templates (used for all patterns)
COMMON_TEMPLATES = {
    "Agent.md": '''# {workflow_name} - Agent Workflow

## Overview

This workflow implements the **{pattern}** pattern for {purpose}.

## Agents

| Agent | Role | Done Criteria |
|-------|------|---------------|
| | | |

## Workflow Flow

```mermaid
graph TD
    A[Input] --> B[Agent 1]
    B --> C[Output]
```

## I/O Contract

- **Input**: [Description of input format]
- **Output**: [Description of output format]
- **IR Format**: (if applicable) Intermediate representation specification

## Design Principles

This workflow follows:
- **SSOT**: Single source of truth for all data
- **SRP**: Each agent has one responsibility
- **Fail Fast**: Errors are caught early
- **Iterative**: Small, verifiable steps
- **Idempotency**: Same input → same output

## Quick Start

1. Configure agents in `agents/`
2. Set up prompts in `prompts/`
3. Run with your orchestration framework

## References

- [Design Document](docs/design.md)
- [agentic-workflow-guide](https://github.com/aktsmm/Agent-Skills/tree/master/agentic-workflow-guide)
''',
    
    ".github/copilot-instructions.md": '''# Repository Copilot Instructions for {workflow_name}

In this workflow, Copilot is treated as part of an autonomous agent workflow.

## Agent Behavior Guidelines

1. **Plan First**:
   - Present a step-by-step plan before tackling complex tasks
   - Get user approval before execution

2. **Context Awareness**:
   - Read relevant files before working to understand project context
   - Don't write code based on assumptions; check existing implementation patterns

3. **Self-Correction**:
   - After making code changes, run verification when possible
   - When errors occur, analyze and present/execute fix proposals

## Workflow Pattern

**{pattern}** - {pattern_description}

## Coding Standards

- **DRY & SOLID**: Avoid duplication, follow single responsibility principle
- **SSOT**: Manage information in one place, others reference it
- **Fail Fast**: Detect and report errors early

## Communication Style

- **Conclusion First**: State conclusion first, then reasons and details
- **Match User Language**: Respond in the user's language

## File Structure

- Agent definitions: `agents/*.agent.md`
- Prompts: `prompts/*.prompt.md`
- Configuration: `config/*.yaml`
- Instructions: `.github/instructions/`

## References

- [Agent.md](../Agent.md) - Workflow overview
- [docs/design.md](../docs/design.md) - Design document
''',
    
    ".github/instructions/workflow.instructions.md": '''---
applyTo: "**"
---

# Workflow Instructions

Rules applied to the entire workflow.

## Basic Principles

- Each agent has a single responsibility
- Errors are detected early with clear messages
- Intermediate state is always verifiable

## Naming Conventions

- Agents: `{{role}}_agent.md`
- Prompts: `{{purpose}}_prompt.md`
- Config: `{{scope}}_config.yaml`

## File Structure

```
{workflow_name}/
├── Agent.md                 # Workflow overview
├── .github/
│   ├── copilot-instructions.md
│   └── instructions/
│       └── workflow.instructions.md
├── agents/                  # Agent definitions
├── prompts/                 # Prompt templates
├── docs/                    # Design documents
└── config/                  # Configuration files
```
''',
    
    ".github/instructions/agents.instructions.md": '''---
applyTo: "agents/**"
---

# Agent Instructions

Rules applied when editing files in the `agents/` directory.

## Agent Definition Structure

```markdown
# Agent: {{name}}

## Role
Describe the agent's role in one sentence

## Responsibilities
- Responsibility 1
- Responsibility 2

## Input
- input1: Description

## Output
- output1: Description

## Constraints
- Constraint details
```

## Best Practices

1. **1 Agent = 1 Responsibility** - Split if there are multiple responsibilities
2. **Clear I/O** - Avoid ambiguous definitions
3. **Explicit Constraints** - Consider edge cases
''',
    
    ".github/instructions/prompts.instructions.md": '''---
applyTo: "prompts/**"
---

# Prompt Instructions

Rules applied when editing files in the `prompts/` directory.

## Prompt Structure

```markdown
# {{Purpose}} Prompt

## Context
Background information

## Task
Task description

## Guidelines
1. Guideline 1
2. Guideline 2

## Output Format
Expected output format
```

## Best Practices

1. **Clear Instructions** - Avoid ambiguous expressions
2. **Include Examples** - Show expected output examples
3. **Explicit Constraints** - Write what should NOT be done
4. **Use `{{placeholder}}` format for variables** - Enable dynamic substitution
''',
    
    "prompts/system_prompt.md": '''# System Prompt

You are a specialized agent in the {workflow_name} workflow.

## Your Role

[Describe the agent's role in one sentence]

## Guidelines

1. **Plan First**: Present a plan before executing complex tasks
2. **Single Responsibility**: Focus on your responsibility, delegate the rest
3. **Validate First**: Validate input before processing
4. **Fail Fast**: Detect and report errors early
5. **Transparency**: Report progress explicitly

## Constraints

- Do not fill in data based on assumptions (confirm unclear points)
- Stop processing if validation fails
- Request confirmation before destructive operations
- `git push` is prohibited by default

## Output Format

- Conclusion first (conclusion → reasons → details)
- Strive for structured output
''',
    
    "prompts/create-agent.prompt.md": '''# Prompt: Create New Agent

Prompt for creating a new agent definition (`.agent.md`).

## Prerequisites

- Reference: `agents/sample.agent.md` (template)
- Reference: `.github/instructions/agents.instructions.md`

## Instructions

1. Define **Role** and **Goals** from user requirements
2. Write **Done Criteria** in verifiable form
3. Follow the principle of least privilege for **Permissions**
4. Clearly define **I/O Contract**
5. Break down **Workflow** into specific steps

## Output Format

```markdown
# [Agent Name]

## Role
[Role in one sentence]

## Goals
- [Goal 1]
- [Goal 2]

## Done Criteria
- [Verifiable completion condition 1]
- [Verifiable completion condition 2]

## Permissions
- **Allowed**: [Permitted operations]
- **Denied**: `git push`, deletion without user permission

## I/O Contract
- **Input**: [Input format]
- **Output**: [Output format]

## Workflow
1. **Plan**: Analyze request and present steps
2. **Act**: Execute after approval
3. **Verify**: Verify results

## Error Handling
- When errors occur, analyze and attempt to fix
- Report to human after 3 consecutive failures

## Idempotency
- Check existing state before operations
- Avoid duplicate processing
```
''',
    
    "prompts/design-workflow.prompt.md": '''# Prompt: Design Agent Workflow

Prompt for designing an agent workflow.

## Prerequisites

- Reference: `docs/design.md`
- Principles: SSOT, SRP, Simplicity First, Fail Fast

## Instructions

Design the following based on user requirements:

### Step 1: Determine Complexity Level

| Level | Agent Count | Use Case |
|-------|-------------|----------|
| Simple | 1 | Single task, simple processing |
| Medium | 2-3 | Orchestrator + workers |
| Complex | 4+ | Multiple specialized agents |

**Principle: Start Simple** - Try the minimum configuration first

### Step 2: Create Design Document

1. **Workflow Purpose**: What problem does it solve?
2. **Agent Composition**: Roles and responsibilities
3. **I/O Contract**: Input/output definitions
4. **Interaction Flow**: Data flow
5. **Verification Points**: Gate/Checkpoint placement
6. **Error Handling**: Response to failures

## Output Format

```markdown
# [Workflow Name] Design

## Overview
- **Purpose**: 
- **Complexity**: Simple | Medium | Complex
- **Pattern**: [Prompt Chaining | Routing | Parallelization | Orchestrator-Workers | Evaluator-Optimizer]

## Agents
| Agent | Role | Input | Output |
|-------|------|-------|--------|

## Flow
```mermaid
graph TD
    A[Input] --> B[Agent 1]
    B --> C{{Gate}}
    C -->|Pass| D[Agent 2]
    C -->|Fail| E[Error Handler]
```

## Checkpoints
1. [Verification points between steps]

## Error Handling
- [Response on error]
```
''',
    
    "prompts/plan-workflow.prompt.md": '''# Prompt: Plan Agent Workflow

Prompt for planning a combination of multiple agents.

## Prerequisites

- Reference: `Agent.md` (list of available agents)

## Instructions

Follow these steps to create a plan for achieving the user's task:

1. **Task Decomposition**: Break down into independent subtasks
2. **Agent Selection**: Choose the optimal agent for each subtask
3. **Flow Definition**: Define data handoff and sequence
4. **Verification Points**: Verification method after each step
5. **Execution Plan**: Specific execution steps

## Output Example

### Step 1: Requirements Definition
- **Agent**: orchestrator
- **Goal**: Organize user's requirements
- **Output**: `docs/requirements.md`
- **Validation**: User confirmation

### Step 2: Implementation
- **Agent**: worker
- **Input**: requirements.md from Step 1
- **Goal**: Perform implementation
- **Output**: Implementation files
- **Validation**: Run tests
''',
    
    "prompts/review-agent.prompt.md": '''# Prompt: Review Agent Definition

Prompt for reviewing agent definitions.

## Design Principles Checklist

### Tier 1: Core Principles (Required)
- [ ] **SRP**: Is it 1 agent = 1 responsibility?
- [ ] **SSOT**: Is information centrally managed?
- [ ] **Fail Fast**: Can errors be detected early?

### Tier 2: Quality Principles (Recommended)
- [ ] **I/O Contract**: Are inputs/outputs clearly defined?
- [ ] **Done Criteria**: Are completion conditions verifiable?
- [ ] **Idempotency**: Is the design retry-safe?
- [ ] **Error Handling**: Is error handling documented?

### Structure Check
- [ ] Is Role clear in one sentence?
- [ ] Are Goals specific?
- [ ] Are Permissions minimal?
- [ ] Is Workflow broken into steps?

## Output Format

```markdown
## Review Result

### ✅ Good Points
- [Good points]

### ⚠️ Improvements Needed
- [Improvement points]

### Recommendation
[Overall evaluation and recommended actions]
```
''',
    
    "prompts/error_handling_prompt.md": '''# Error Handling Prompt

Protocol for handling errors.

## Error Classification

| Type | Description | Recovery |
|------|-------------|----------|
| ValidationError | Invalid input data | Fix input and retry |
| ProcessingError | Failure during processing | Analyze cause and retry |
| TimeoutError | Timeout | Retry or skip |
| DependencyError | External service failure | Fallback |

## Response Format

```yaml
error:
  type: {{error_type}}
  message: {{error_message}}
  context: {{relevant_context}}
  recovery:
    possible: true/false
    suggestion: {{recovery_suggestion}}
    retry_count: {{current_retry}}/3
```

## Escalation Rules

1. **Retry**: Same error up to 3 times max
2. **Fallback**: Try alternative method if possible
3. **Handoff**: Report to human after 3 failures
4. **Log**: Record all context

## Fail Fast Principle

- Detect errors early
- Report immediately when problems occur
- Do not continue in an ambiguous state
'''
}

# Templates for each workflow pattern
PATTERNS = {
    "basic": {
        "description": "Basic workflow structure",
        "structure": {
            "agents": {
                "__description__": "Agent definitions",
                "sample.agent.md": '''# Sample Agent

## Role

You are a [role name]. You perform [action] on [target].

## Goals

- [Goal 1]
- [Goal 2]

## Done Criteria

- [Completion condition 1: Describe in verifiable form]
- [Completion condition 2]

## Permissions

- **Allowed**: File reading, proposal creation
- **Denied**: `git push`, file deletion without user permission

## I/O Contract

- **Input**: [Description of input format]
- **Output**: [Description of output format]
- **IR Format**: (if applicable) Structured data specification

## References

- [Workflow Instructions](../.github/instructions/workflow.instructions.md)

## Workflow

1. **Plan**: Analyze user's request and present steps
2. **Act**: Execute after approval
3. **Verify**: Confirm results

## Error Handling

- When errors occur, analyze error messages and attempt to fix
- Report to human after 3 consecutive failures
- Always request confirmation before destructive operations

## Idempotency

- Check for existing files before operations
- Always check state to avoid duplicate processing
''',
                "orchestrator.agent.md": '''# Orchestrator Agent

## Role

You are the orchestrator (commander). You analyze user requests, delegate work to appropriate sub-agents, and manage overall progress.

## Goals

- Understand user requests and decompose tasks
- Assign appropriate work to each sub-agent
- Monitor progress and report results to users

## Done Criteria

- All subtasks have `completed` or `skipped` status
- Final report has been presented to the user

## Permissions

- **Allowed**: Task decomposition, delegation to sub-agents, progress reporting
- **Denied**: Direct code editing, file deletion, `git push`

## Non-Goals (What not to do)

- Do not write code directly (delegate implementation to specialized agents)
- Do not review yourself (delegate reviews to specialized agents)
- Do not assume user intent (confirm unclear points)

## I/O Contract

- **Input**: Natural language request from user
- **Output**:
  - Task decomposition results
  - Final report (deliverables list + status)

## Workflow

1. **Analyze**: Analyze user request and identify required tasks
2. **Plan**: Decompose tasks and present plan for which sub-agent to delegate to
3. **Delegate**: After user approval, invoke sub-agents
4. **Monitor**: Check results from each sub-agent and handle any issues
5. **Report**: Report overall results to user

## Error Handling

- If a sub-agent fails 3 times consecutively, report to human and handoff
- Log failed tasks and maintain retry-capable state

## Idempotency

- Always read task state from files (do not depend on conversation history)
- Do not re-execute already completed tasks
'''
            },
            "prompts": {
                "__description__": "Prompt templates"
            },
            "docs": {
                "__description__": "Design documents",
                "design.md": '''# Workflow Design Document

## Overview
- **Name**: 
- **Purpose**: 
- **Pattern**: 

## Agents
| Agent | Role | Input | Output |
|-------|------|-------|--------|
| | | | |

## Flow
```mermaid
graph TD
    A[Start] --> B[Agent 1]
    B --> C[Agent 2]
    C --> D[End]
```

## Design Principles Check
- [ ] SSOT: Is information centrally managed?
- [ ] SRP: Is each agent single responsibility?
- [ ] Fail Fast: Stop immediately on error?
- [ ] Iterative: Is it divided into small steps?
- [ ] Feedback Loop: Can results be verified?
''',
                "review_notes.md": '''# Review Notes

## Review Date
- 

## Reviewer
- 

## Checklist Results
See: agentic-workflow-guide/references/review-checklist.md

## Issues Found
1. 

## Action Items
1. 
'''
            },
            "config": {
                "__description__": "Configuration files",
                "workflow_config.yaml": '''# Workflow Configuration

name: "{workflow_name}"
version: "1.0.0"

# Agents
agents:
  - name: agent_1
    prompt: prompts/system_prompt.md
    
# Flow
flow:
  - step: 1
    agent: agent_1
    next: 2
    
# Error handling
error_handling:
  max_retries: 3
  on_failure: stop
'''
            }
        }
    },
    "prompt-chaining": {
        "description": "Sequential processing pattern",
        "structure": {
            "agents": {
                "__description__": "Sequentially executed agents",
                "step1_agent.md": "# Step 1 Agent\n\n## Role\nHandle the first step\n",
                "step2_agent.md": "# Step 2 Agent\n\n## Role\nHandle the second step\n",
                "step3_agent.md": "# Step 3 Agent\n\n## Role\nHandle the final step\n"
            },
            "prompts": {
                "__description__": "Prompts for each step"
            },
            "gates": {
                "__description__": "Validation gates between steps",
                "gate_template.md": '''# Gate: Step N → Step N+1

## Validation Criteria
- [ ] Condition 1
- [ ] Condition 2

## On Pass
Proceed to next step

## On Fail
Error handling or retry
'''
            },
            "docs": {
                "__description__": "Design documents",
                "design.md": "# Prompt Chaining Workflow\n\n## Pattern: Prompt Chaining\nSequential processing with validation at each step\n"
            },
            "config": {
                "__description__": "Configuration files"
            }
        }
    },
    "parallelization": {
        "description": "Parallel processing pattern",
        "structure": {
            "agents": {
                "__description__": "Parallel executed agents",
                "worker1_agent.md": "# Worker 1 Agent\n\n## Role\nHandle parallel task 1\n",
                "worker2_agent.md": "# Worker 2 Agent\n\n## Role\nHandle parallel task 2\n",
                "worker3_agent.md": "# Worker 3 Agent\n\n## Role\nHandle parallel task 3\n",
                "aggregator_agent.md": "# Aggregator Agent\n\n## Role\nAggregate results from all workers\n"
            },
            "prompts": {
                "__description__": "Prompts for workers"
            },
            "docs": {
                "__description__": "Design documents",
                "design.md": "# Parallelization Workflow\n\n## Pattern: Parallelization\nExecute independent tasks simultaneously\n"
            },
            "config": {
                "__description__": "Configuration files"
            }
        }
    },
    "orchestrator-workers": {
        "description": "Orchestrator + workers pattern",
        "structure": {
            "agents": {
                "__description__": "Orchestrator and workers",
                "orchestrator_agent.md": '''# Orchestrator Agent

## Role
Dynamically decompose tasks and assign to workers

## Responsibilities
1. Analyze input
2. Generate subtasks
3. Launch workers
4. Integrate results
''',
                "worker_agent.md": '''# Worker Agent Template

## Role
Execute assigned subtask

## Input
- task: Subtask content
- context: Required context

## Output
- result: Task result
- status: Success/Failure
''',
                "synthesizer_agent.md": '''# Synthesizer Agent

## Role
Integrate results from all workers to generate final output
'''
            },
            "prompts": {
                "__description__": "Prompts for each agent"
            },
            "docs": {
                "__description__": "Design documents",
                "design.md": "# Orchestrator-Workers Workflow\n\n## Pattern: Orchestrator-Workers\nDynamically decompose tasks and dispatch to workers\n"
            },
            "config": {
                "__description__": "Configuration files"
            }
        }
    },
    "evaluator-optimizer": {
        "description": "Evaluation-improvement loop pattern",
        "structure": {
            "agents": {
                "__description__": "Generator and evaluator",
                "generator_agent.md": '''# Generator Agent

## Role
Generate content

## Input
- request: Generation request
- feedback: Previous feedback (if any)

## Output
- content: Generated content
''',
                "evaluator_agent.md": '''# Evaluator Agent

## Role
Evaluate generated content

## Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Output
- passed: true/false
- feedback: Improvement points (on failure)
'''
            },
            "prompts": {
                "__description__": "Generation and evaluation prompts"
            },
            "docs": {
                "__description__": "Design documents",
                "design.md": '''# Evaluator-Optimizer Workflow

## Pattern: Evaluator-Optimizer
Generate → Evaluate → Improve loop

## Flow
```mermaid
graph TD
    A[Input] --> B[Generator]
    B --> C[Output]
    C --> D[Evaluator]
    D -->|Not Good| E[Feedback]
    E --> B
    D -->|Good| F[Final Output]
```

## Loop Control
- max_iterations: 5
- on_max_reached: return_best
'''
            },
            "config": {
                "__description__": "Configuration files",
                "loop_config.yaml": '''# Evaluator-Optimizer Loop Configuration

max_iterations: 5
evaluation_criteria:
  - name: criteria_1
    weight: 0.4
  - name: criteria_2
    weight: 0.3
  - name: criteria_3
    weight: 0.3

threshold: 0.8
on_max_reached: return_best  # or: fail
'''
            }
        }
    },
    "routing": {
        "description": "Routing pattern",
        "structure": {
            "agents": {
                "__description__": "Router and specialized handlers",
                "router_agent.md": '''# Router Agent

## Role
Classify input and route to appropriate handler

## Categories
- type_a: Route to Handler A
- type_b: Route to Handler B
- type_c: Route to Handler C
''',
                "handler_a_agent.md": "# Handler A Agent\n\n## Role\nHandle Type A processing\n",
                "handler_b_agent.md": "# Handler B Agent\n\n## Role\nHandle Type B processing\n",
                "handler_c_agent.md": "# Handler C Agent\n\n## Role\nHandle Type C processing\n"
            },
            "prompts": {
                "__description__": "Routing and handler prompts"
            },
            "docs": {
                "__description__": "Design documents",
                "design.md": "# Routing Workflow\n\n## Pattern: Routing\nClassify input and route to specialized processing\n"
            },
            "config": {
                "__description__": "Configuration files"
            }
        }
    }
}


def create_structure(base_path: Path, structure: dict, workflow_name: str):
    """Recursively create directory structure"""
    for name, content in structure.items():
        if name == "__description__":
            continue
            
        path = base_path / name
        
        if isinstance(content, dict):
            # Create directory
            path.mkdir(parents=True, exist_ok=True)
            # Create .gitkeep for empty directory
            if not any(k for k in content.keys() if k != "__description__"):
                (path / ".gitkeep").touch()
            else:
                create_structure(path, content, workflow_name)
        else:
            # Create file
            file_content = content.format(
                workflow_name=workflow_name,
                name=workflow_name,
                role_description="",
                context="",
                task_description="",
                output_format=""
            )
            path.write_text(file_content, encoding="utf-8")


def scaffold_workflow(name: str, pattern: str = "basic", output_path: str = "."):
    """Generate workflow directory structure"""
    
    if pattern not in PATTERNS:
        print(f"❌ Unknown pattern: {pattern}")
        print(f"   Available patterns: {', '.join(PATTERNS.keys())}")
        return False
    
    pattern_info = PATTERNS[pattern]
    base_path = Path(output_path) / name
    
    if base_path.exists():
        print(f"❌ Directory already exists: {base_path}")
        return False
    
    print(f"🚀 Creating workflow: {name}")
    print(f"   Pattern: {pattern} - {pattern_info['description']}")
    print(f"   Location: {base_path.absolute()}")
    print()
    
    # Create directory structure
    base_path.mkdir(parents=True, exist_ok=True)
    create_structure(base_path, pattern_info["structure"], name)
    
    # Create .github directory and instructions
    github_dir = base_path / ".github"
    github_dir.mkdir(parents=True, exist_ok=True)
    instructions_dir = github_dir / "instructions"
    instructions_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate common templates
    for filename, template in COMMON_TEMPLATES.items():
        file_path = base_path / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        content = template.format(
            workflow_name=name,
            pattern=pattern,
            pattern_description=pattern_info['description'],
            purpose="your use case",
            agent_role="Describe your agent's role here",
            context="",
            task_description="",
            input_data="",
            output_format="",
            good_example="",
            bad_example=""
        )
        file_path.write_text(content, encoding="utf-8")
    
    # Generate README.md
    readme_content = f'''# {name}

## Overview
Generated with `agentic-workflow-guide` skill.

## Pattern
**{pattern}** - {pattern_info['description']}

## Directory Structure
```
{name}/
├── Agent.md                    # Workflow overview
├── .github/
│   ├── copilot-instructions.md # Copilot instructions
│   └── instructions/           # Individual instructions
│       ├── workflow.instructions.md
│       ├── agents.instructions.md
│       └── prompts.instructions.md
'''
    
    for dir_name, dir_content in pattern_info["structure"].items():
        if dir_name != "__description__":
            desc = dir_content.get("__description__", "")
            readme_content += f"├── {dir_name}/                    # {desc}\n"
    
    readme_content += '''```

## Quick Start

1. Edit **Agent.md** to describe your workflow overview
2. Create agent definitions in **agents/**
3. Customize prompt templates in **prompts/**
4. Document design in **docs/design.md**
5. Adjust settings in **config/**

## Files

| File | Purpose |
|------|---------|
| `Agent.md` | Workflow overview and agent list |
| `.github/copilot-instructions.md` | Development guidelines for GitHub Copilot |
| `.github/instructions/*.instructions.md` | File pattern-specific rules |
| `prompts/system_prompt.md` | System prompt for agents |
| `prompts/task_prompt.md` | Task prompt template |
| `prompts/error_handling_prompt.md` | Error handling prompt |

## Design Principles

This workflow should follow:

- **SSOT** - Single Source of Truth
- **SRP** - Single Responsibility Principle
- **Fail Fast** - Early error detection
- **Iterative Refinement** - Small iterations
- **Feedback Loop** - Verify results

See: `agentic-workflow-guide` for full checklist.

## References

- [agentic-workflow-guide](https://github.com/aktsmm/Agent-Skills/tree/master/agentic-workflow-guide)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
'''
    
    (base_path / "README.md").write_text(readme_content, encoding="utf-8")
    
    print("✅ Created structure:")
    print(f"   📄 Agent.md")
    print(f"   📄 README.md")
    print(f"   📁 .github/")
    print(f"      📄 copilot-instructions.md")
    print(f"      📁 instructions/")
    print(f"         📄 workflow.instructions.md")
    print(f"         📄 agents.instructions.md")
    print(f"         📄 prompts.instructions.md")
    for dir_name in pattern_info["structure"].keys():
        if dir_name != "__description__":
            print(f"   📁 {dir_name}/")
    
    print(f"\n✅ Workflow '{name}' scaffolded successfully!")
    print("\nGenerated files:")
    print("  📄 Agent.md - Workflow overview")
    print("  📄 .github/copilot-instructions.md - Copilot instructions")
    print("  📄 .github/instructions/*.instructions.md - Individual rules")
    print("  📄 prompts/*.md - Prompt templates")
    print("\nNext steps:")
    print("1. Edit Agent.md to describe your workflow")
    print("2. Customize agents/ for your use case")
    print("3. Update prompts/ with your prompts")
    print("4. Review with agentic-workflow-guide checklist")
    
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Generate agent workflow directory structure"
    )
    parser.add_argument("name", nargs="?", help="Workflow name")
    parser.add_argument(
        "--pattern", "-p",
        choices=list(PATTERNS.keys()),
        default="basic",
        help="Workflow pattern (default: basic)"
    )
    parser.add_argument(
        "--path",
        default=".",
        help="Output directory (default: current directory)"
    )
    parser.add_argument(
        "--list-patterns",
        action="store_true",
        help="List available patterns"
    )
    
    args = parser.parse_args()
    
    if args.list_patterns:
        print("Available patterns:\n")
        for name, info in PATTERNS.items():
            print(f"  {name}")
            print(f"    {info['description']}")
            print()
        return
    
    if not args.name:
        parser.print_help()
        return
    
    scaffold_workflow(args.name, args.pattern, args.path)


if __name__ == "__main__":
    main()
