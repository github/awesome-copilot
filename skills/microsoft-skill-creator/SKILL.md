---
name: microsoft-skill-creator
description: Create agent skills for Microsoft technologies using Learn MCP tools. Use when users want to create a skill that teaches agents about any Microsoft technology, library, framework, or service (Azure, .NET, M365, VS Code, Bicep, etc.). Investigates topics deeply, then generates a hybrid skill storing essential knowledge locally while enabling dynamic deeper investigation.
context: fork
compatibility: Requires Microsoft Learn MCP Server (https://learn.microsoft.com/api/mcp)
---

# Microsoft Skill Creator

Create hybrid skills for Microsoft technologies that store essential knowledge locally while enabling dynamic Learn MCP lookups for deeper details.

## About Skills

Skills are modular packages that extend agent capabilities with specialized knowledge and workflows. A skill transforms a general-purpose agent into a specialized one for a specific domain.

### Skill Structure

```
skill-name/
├── SKILL.md (required)     # Frontmatter (name, description) + instructions
├── references/             # Documentation loaded into context as needed
├── sample_codes/           # Working code examples
└── assets/                 # Files used in output (templates, etc.)
```

### Key Principles

- **Frontmatter is critical**: `name` and `description` determine when the skill triggers—be clear and comprehensive
- **Concise is key**: Only include what agents don't already know; context window is shared
- **No duplication**: Information lives in SKILL.md OR reference files, not both

## Learn MCP Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `microsoft_docs_search` | Search official docs | First pass discovery, finding topics |
| `microsoft_docs_fetch` | Get full page content | Deep dive into important pages |
| `microsoft_code_sample_search` | Find code examples | Get implementation patterns |

## Creation Process

### Step 1: Investigate the Topic

Build deep understanding using Learn MCP tools in three phases:

**Phase 1 - Scope Discovery:**
```
microsoft_docs_search(query="{technology} overview what is")
microsoft_docs_search(query="{technology} concepts architecture")
microsoft_docs_search(query="{technology} getting started tutorial")
```

**Phase 2 - Core Content:**
```
microsoft_docs_fetch(url="...")  # Fetch pages from Phase 1
microsoft_code_sample_search(query="{technology}", language="{lang}")
```

**Phase 3 - Depth:**
```
microsoft_docs_search(query="{technology} best practices")
microsoft_docs_search(query="{technology} troubleshooting errors")
```

#### Investigation Checklist

After investigating, verify:
- [ ] Can explain what the technology does in one paragraph
- [ ] Identified 3-5 key concepts
- [ ] Have working code for basic usage
- [ ] Know the most common API patterns
- [ ] Have search queries for deeper topics

### Step 2: Clarify with User

Present findings and ask:
1. "I found these key areas: [list]. Which are most important?"
2. "What tasks will agents primarily perform with this skill?"
3. "Which programming language should code samples prioritize?"

### Step 3: Generate the Skill

Use the appropriate template from [skill-templates.md](references/skill-templates.md):

| Technology Type | Template |
|-----------------|----------|
| Client library, NuGet/npm package | SDK/Library |
| Azure resource | Azure Service |
| App development framework | Framework/Platform |
| REST API, protocol | API/Protocol |

#### Generated Skill Structure

```
{skill-name}/
├── SKILL.md                    # Core knowledge + Learn MCP guidance
├── references/                 # Detailed local documentation (if needed)
└── sample_codes/               # Working code examples
    ├── getting-started/
    └── common-patterns/
```

### Step 4: Balance Local vs Dynamic Content

**Store locally when:**
- Foundational (needed for any task)
- Frequently accessed
- Stable (won't change)
- Hard to find via search

**Keep dynamic when:**
- Exhaustive reference (too large)
- Version-specific
- Situational (specific tasks only)
- Well-indexed (easy to search)

#### Content Guidelines

| Content Type | Local | Dynamic |
|--------------|-------|---------|
| Core concepts (3-5) | ✅ Full | |
| Hello world code | ✅ Full | |
| Common patterns (3-5) | ✅ Full | |
| Top API methods | Signature + example | Full docs via fetch |
| Best practices | Top 5 bullets | Search for more |
| Troubleshooting | | Search queries |
| Full API reference | | Doc links |

### Step 5: Validate

1. Review: Is local content sufficient for common tasks?
2. Test: Do suggested search queries return useful results?
3. Verify: Do code samples run without errors?

## Common Investigation Patterns

### For SDKs/Libraries
```
"{name} overview" → purpose, architecture
"{name} getting started quickstart" → setup steps
"{name} API reference" → core classes/methods
"{name} samples examples" → code patterns
"{name} best practices performance" → optimization
```

### For Azure Services
```
"{service} overview features" → capabilities
"{service} quickstart {language}" → setup code
"{service} REST API reference" → endpoints
"{service} SDK {language}" → client library
"{service} pricing limits quotas" → constraints
```

### For Frameworks/Platforms
```
"{framework} architecture concepts" → mental model
"{framework} project structure" → conventions
"{framework} tutorial walkthrough" → end-to-end flow
"{framework} configuration options" → customization
```

## Example: Creating a "Semantic Kernel" Skill

### Investigation

```
microsoft_docs_search(query="semantic kernel overview")
microsoft_docs_search(query="semantic kernel plugins functions")
microsoft_code_sample_search(query="semantic kernel", language="csharp")
microsoft_docs_fetch(url="https://learn.microsoft.com/semantic-kernel/overview/")
```

### Generated Skill

```
semantic-kernel/
├── SKILL.md
└── sample_codes/
    ├── getting-started/
    │   └── hello-kernel.cs
    └── common-patterns/
        ├── chat-completion.cs
        └── function-calling.cs
```

### Generated SKILL.md

```markdown
---
name: semantic-kernel
description: Build AI agents with Microsoft Semantic Kernel. Use for LLM-powered apps with plugins, planners, and memory in .NET or Python.
---

# Semantic Kernel

Orchestration SDK for integrating LLMs into applications with plugins, planners, and memory.

## Key Concepts

- **Kernel**: Central orchestrator managing AI services and plugins
- **Plugins**: Collections of functions the AI can call
- **Planner**: Sequences plugin functions to achieve goals
- **Memory**: Vector store integration for RAG patterns

## Quick Start

See [getting-started/hello-kernel.cs](sample_codes/getting-started/hello-kernel.cs)

## Learn More

| Topic | How to Find |
|-------|-------------|
| Plugin development | `microsoft_docs_search(query="semantic kernel plugins custom functions")` |
| Planners | `microsoft_docs_search(query="semantic kernel planner")` |
| Memory | `microsoft_docs_fetch(url="https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-memory")` |
```
