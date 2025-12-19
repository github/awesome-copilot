---
description: 'Guidelines for creating custom agent files for GitHub Copilot'
applyTo: '**/*.agent.md'
---

# Custom Agent File Guidelines

Instructions for creating effective and maintainable custom agent files that provide specialized expertise for specific development tasks in GitHub Copilot.

## Project Context

- Target audience: Developers creating custom agents for GitHub Copilot
- File format: Markdown with YAML frontmatter
- File naming convention: lowercase with hyphens (e.g., `test-specialist.agent.md`)
- Location: `.github/agents/` directory (repository-level) or `agents/` directory (organization/enterprise-level)
- Purpose: Define specialized agents with tailored expertise, tools, and instructions for specific tasks
- Official documentation: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents

## Required Frontmatter

Every agent file must include YAML frontmatter with the following fields:

```yaml
---
description: 'Brief description of the agent purpose and capabilities'
name: 'Agent Display Name'
tools: ['read', 'edit', 'search']
model: 'Claude Sonnet 4.5'
target: 'vscode'
infer: true
---
```

### Core Frontmatter Properties

#### **description** (REQUIRED)
- Single-quoted string, clearly stating the agent's purpose and domain expertise
- Should be concise (50-150 characters) and actionable
- Example: `'Focuses on test coverage, quality, and testing best practices'`

#### **name** (OPTIONAL)
- Display name for the agent in the UI
- If omitted, defaults to filename (without `.md` or `.agent.md`)
- Use title case and be descriptive
- Example: `'Testing Specialist'`

#### **tools** (OPTIONAL)
- List of tool names or aliases the agent can use
- Supports comma-separated string or YAML array format
- If omitted, agent has access to all available tools
- See "Tool Configuration" section below for details

#### **model** (STRONGLY RECOMMENDED)
- Specifies which AI model the agent should use
- Supported in VS Code, JetBrains IDEs, Eclipse, and Xcode
- Example: `'Claude Sonnet 4.5'`, `'gpt-4'`, `'gpt-4o'`
- Choose based on agent complexity and required capabilities

#### **target** (OPTIONAL)
- Specifies target environment: `'vscode'` or `'github-copilot'`
- If omitted, agent is available in both environments
- Use when agent has environment-specific features

#### **infer** (OPTIONAL)
- Boolean controlling whether Copilot can automatically use this agent based on context
- Default: `true` if omitted
- Set to `false` to require manual agent selection

#### **metadata** (OPTIONAL, GitHub.com only)
- Object with name-value pairs for agent annotation
- Example: `metadata: { category: 'testing', version: '1.0' }`
- Not supported in VS Code

#### **mcp-servers** (OPTIONAL, Organization/Enterprise only)
- Configure MCP servers available only to this agent
- Only supported for organization/enterprise level agents
- See "MCP Server Configuration" section below

## Tool Configuration

### Tool Specification Strategies

**Enable all tools** (default):
```yaml
# Omit tools property entirely, or use:
tools: ['*']
```

**Enable specific tools**:
```yaml
tools: ['read', 'edit', 'search', 'execute']
```

**Enable MCP server tools**:
```yaml
tools: ['read', 'edit', 'github/*', 'playwright/navigate']
```

**Disable all tools**:
```yaml
tools: []
```

### Standard Tool Aliases

All aliases are case-insensitive:

| Alias | Alternative Names | Category | Description |
|-------|------------------|----------|-------------|
| `execute` | shell, Bash, powershell | Shell execution | Execute commands in appropriate shell |
| `read` | Read, NotebookRead, view | File reading | Read file contents |
| `edit` | Edit, MultiEdit, Write, NotebookEdit | File editing | Edit and modify files |
| `search` | Grep, Glob, search | Code search | Search for files or text in files |
| `agent` | custom-agent, Task | Agent invocation | Invoke other custom agents |
| `web` | WebSearch, WebFetch | Web access | Fetch web content and search |
| `todo` | TodoWrite | Task management | Create and manage task lists (VS Code only) |

### Built-in MCP Server Tools

**GitHub MCP Server**:
```yaml
tools: ['github/*']  # All GitHub tools
tools: ['github/get_file_contents', 'github/search_repositories']  # Specific tools
```
- All read-only tools available by default
- Token scoped to source repository

**Playwright MCP Server**:
```yaml
tools: ['playwright/*']  # All Playwright tools
tools: ['playwright/navigate', 'playwright/screenshot']  # Specific tools
```
- Configured to access localhost only
- Useful for browser automation and testing

### Tool Selection Best Practices

- **Principle of Least Privilege**: Only enable tools necessary for the agent's purpose
- **Security**: Limit `execute` access unless explicitly required
- **Focus**: Fewer tools = clearer agent purpose and better performance
- **Documentation**: Comment why specific tools are required for complex configurations

## Sub-Agent Invocation (Agent Orchestration)

Agents can invoke other agents using `runSubagent` to orchestrate multi-step workflows.

### How It Works

Include `agent` in tools list, then invoke other agents with detailed prompts:

```yaml
tools: ['read', 'edit', 'search', 'agent']
```

### Example: Code Review Pipeline

```javascript
async function codeReviewPipeline(repositoryName, prNumber) {
  const basePath = `projects/${repositoryName}/pr-${prNumber}`;

  // Step 1: Security Review
  const security = await runSubagent({
    description: 'Analyze security issues in pull request',
    prompt: `You are the Security Reviewer specialist.
Repository: ${repositoryName}
PR: ${prNumber}
Files: ${basePath}/changes/

Scan for OWASP Top 10, injection attacks, auth flaws, and report findings in ${basePath}/security-review.md`
  });

  // Step 2: Performance Analysis (if applicable)
  if (hasComputationalCode(basePath)) {
    const performance = await runSubagent({
      description: 'Check performance and optimization opportunities',
      prompt: `You are the Performance Analyzer specialist.
Repository: ${repositoryName}
Files: ${basePath}/changes/

Analyze database queries, algorithms, and memory usage. Report in ${basePath}/performance-report.md`
    });
  }

  // Step 3: Test Coverage
  const coverage = await runSubagent({
    description: 'Verify test coverage for changed code',
    prompt: `You are the Test Coverage Checker specialist.
Repository: ${repositoryName}
PR: ${prNumber}
Changes: ${basePath}/changes/

Check test coverage and suggest missing tests. Report in ${basePath}/coverage-analysis.md`
  });

  // Step 4: Compile Results
  const finalReport = await runSubagent({
    description: 'Aggregate all review findings',
    prompt: `You are the Review Aggregator specialist.
Repository: ${repositoryName}
Reviews: ${basePath}/*.md

Combine all reviews into final report at ${basePath}/final-review.md with verdict (APPROVED/NEEDS_FIXES/BLOCKED)`
  });

  return finalReport;
}
```

### Key Points

- Pass all context via `${variables}` in the prompt
- Use `try/catch` for error handling
- Sequential execution (await each step) when results depend on prior steps
- Log results with timestamps for troubleshooting

## Variable Definition and Extraction

Agents can define dynamic parameters to extract values from user input and use them throughout the agent's behavior and sub-agent communications. This enables flexible, context-aware agents that adapt to user-provided data.

### When to Use Variables

**Use variables when**:
- Agent behavior depends on user input
- Need to pass dynamic values to sub-agents
- Want to make agents reusable across different contexts
- Require parameterized workflows
- Need to track or reference user-provided context

**Examples**:
- Extract project name from user prompt
- Capture certification name for pipeline processing
- Identify file paths or directories
- Extract configuration options
- Parse feature names or module identifiers

### Variable Declaration Pattern

Define variables section early in the agent prompt to document expected parameters:

```markdown
# Agent Name

## Dynamic Parameters

- **Parameter Name**: Description and usage
- **Another Parameter**: How it's extracted and used

## Your Mission

Process [PARAMETER_NAME] to accomplish [task].
```

### Variable Extraction Methods

#### 1. **Explicit User Input**
Ask the user to provide the variable if not detected in the prompt:

```markdown
## Your Mission

Process the project by analyzing your codebase.

### Step 1: Identify Project
If no project name is provided, **ASK THE USER** for:
- Project name or identifier
- Base path or directory location
- Configuration type (if applicable)

Use this information to contextualize all subsequent tasks.
```

#### 2. **Implicit Extraction from Prompt**
Automatically extract variables from the user's natural language input:

```javascript
// Example: Extract certification name from user input
const userInput = "Process My Certification";

// Extract key information
const certificationName = extractCertificationName(userInput);
// Result: "My Certification"

const basePath = `certifications/${certificationName}`;
// Result: "certifications/My Certification"
```

#### 3. **Contextual Variable Resolution**
Use file context or workspace information to derive variables:

```markdown
## Variable Resolution Strategy

1. **From User Prompt**: First, look for explicit mentions in user input
2. **From File Context**: Check current file name or path
3. **From Workspace**: Use workspace folder or active project
4. **From Settings**: Reference configuration files
5. **Ask User**: If all else fails, request missing information
```

### Using Variables in Agent Prompts

#### Variable Substitution in Instructions

Use template variables in agent prompts to make them dynamic:

```markdown
# Agent Name

## Dynamic Parameters
- **Project Name**: ${projectName}
- **Base Path**: ${basePath}
- **Output Directory**: ${outputDir}

## Your Mission

Process the **${projectName}** project located at `${basePath}`.

## Process Steps

1. Read input from: `${basePath}/input/`
2. Process files according to project configuration
3. Write results to: `${outputDir}/`
4. Generate summary report

## Quality Standards

- Maintain project-specific coding standards for **${projectName}**
- Follow directory structure: `${basePath}/[structure]`
```

#### Passing Variables to Sub-Agents

Use extracted variables when invoking sub-agents:

```javascript
// Example: Pass projectName and basePath to sub-agent
const basePath = `projects/${projectName}`;

// Pass to sub-agent with variable
const result = await runSubagent({
  description: 'Process project files',
  prompt: `You are the Project Processor specialist.

Process: ${projectName}
Location: ${basePath}

Task:
1. Read all files from ${basePath}/src/
2. Analyze project structure
3. Generate documentation
4. Save to ${basePath}/docs/

Return: Summary of analysis`
});
```

### Real-World Example: Parameterized Orchestrator Agent

Example of a code review orchestrator that validates pull requests across multiple dimensions:

```markdown
# Code Review Orchestrator Agent

## Dynamic Parameters

- **Repository Name**: Extracted from user prompt (e.g., "my-awesome-app")
- **Pull Request ID**: Provided in user request (e.g., "PR #42")
- **Base Path**: Derived as `projects/${repositoryName}/pr-${prNumber}/`
- **Review Report**: Set to `projects/${repositoryName}/pr-${prNumber}/review-report.md`

## Your Mission

Execute a comprehensive multi-aspect code review for **PR #${prNumber}** on **${repositoryName}** by invoking specialized agents without requiring manual coordination between steps.

### Initial Setup

If repository or PR details are not provided, **ASK THE USER** for:
- Repository name or identifier
- Pull request number
- Review scope (all aspects or specific areas)

## Pre-flight Checks

Verify the pull request structure at `${basePath}`:
- ✅ PR metadata exists
- ✅ Changed files are accessible
- ℹ️ Review reports will be generated
- ✅ Code quality tools configured

## Review Pipeline Execution

### Step 1: Security Analysis
Invoke `@security-reviewer` agent:

**Condition:** Always execute for code reviews

Parameters to pass:
- Repository: ${repositoryName}
- PR: ${prNumber}
- Input: ${basePath}/changes/
- Output: ${basePath}/security-review.md

### Step 2: Performance Audit
Invoke `@performance-analyzer` agent:

**Condition:** Only if code contains computational components or database queries

Parameters to pass:
- Repository: ${repositoryName}
- PR: ${prNumber}
- Input: ${basePath}/changes/
- Output: ${basePath}/performance-report.md

### Step 3: Test Coverage Analysis
Invoke `@test-coverage-checker` agent:

**Condition:** Always execute

Parameters to pass:
- Repository: ${repositoryName}
- PR: ${prNumber}
- Input: ${basePath}/changes/ and test configuration
- Output: ${basePath}/coverage-analysis.md

### Step 4: Code Style Validation
Invoke `@style-validator` agent:

**Condition:** Only if style rules are configured for repository

Parameters to pass:
- Repository: ${repositoryName}
- PR: ${prNumber}
- Input: ${basePath}/changes/
- Output: ${basePath}/style-report.md

### Step 5: Documentation Validation
Invoke `@documentation-reviewer` agent:

**Condition:** Only if API/public methods were modified

Parameters to pass:
- Repository: ${repositoryName}
- PR: ${prNumber}
- Input: ${basePath}/changes/
- Output: ${basePath}/documentation-review.md

### Step 6: Compile Final Review
Invoke `@review-aggregator` agent:

**Condition:** Always execute after individual reviews

Parameters to pass:
- Repository: ${repositoryName}
- PR: ${prNumber}
- Input: ${basePath}/ (all review reports)
- Output: ${basePath}/review-report.md

## Logging

All review operations logged to: `${reviewReport}`

Track for each review aspect:
- Status (✅ APPROVED / ⚠️ NEEDS FIXES / ❌ BLOCKED)
- Critical issues count
- Warnings count
- Recommendations count
- Timestamps for start and completion
- Duration of review
```


### Variable Best Practices

#### 1. **Clear Documentation**
Always document what variables are expected:

```markdown
## Required Variables
- **projectName**: The name of the project (string, required)
- **basePath**: Root directory for project files (path, required)

## Optional Variables
- **mode**: Processing mode - quick/standard/detailed (enum, default: standard)
- **outputFormat**: Output format - markdown/json/html (enum, default: markdown)

## Derived Variables
- **outputDir**: Automatically set to ${basePath}/output
- **logFile**: Automatically set to ${basePath}/.log.md
```

#### 2. **Consistent Naming**
Use consistent variable naming conventions:

```javascript
// Good: Clear, descriptive naming
const variables = {
  projectName,          // What project to work on
  basePath,            // Where project files are located
  outputDirectory,     // Where to save results
  processingMode,      // How to process (detail level)
  configurationPath    // Where config files are
};

// Avoid: Ambiguous or inconsistent
const bad_variables = {
  name,     // Too generic
  path,     // Unclear which path
  mode,     // Too short
  config    // Too vague
};
```

#### 3. **Validation and Constraints**
Document valid values and constraints:

```markdown
## Variable Constraints

**projectName**:
- Type: string (alphanumeric, hyphens, underscores allowed)
- Length: 1-100 characters
- Required: yes
- Pattern: `/^[a-zA-Z0-9_-]+$/`

**processingMode**:
- Type: enum
- Valid values: "quick" (< 5min), "standard" (5-15min), "detailed" (15+ min)
- Default: "standard"
- Required: no
```

#### 4. **Variable Scope**
Be clear about variable scope and lifetime:

```markdown
## Variable Scope

### Global Variables (used throughout agent execution)
- ${projectName}: Available in all prompts and sub-agents
- ${basePath}: Used for all file operations
- ${timestamp}: Available for logging

### Local Variables (used in specific sections)
- ${currentStep}: Only in step-specific prompts
- ${stepResult}: Only after step completion
- ${errorMessage}: Only in error handling

### Sub-Agent Variables (passed to child agents)
- ${projectName}: Always pass to maintain context
- ${basePath}: Critical for file operations
- ${mode}: Inherit from parent agent
```

## Agent Prompt Structure

The markdown content below the frontmatter defines the agent's behavior, expertise, and instructions. Maximum length: 30,000 characters.

### Recommended Sections

#### 1. Agent Identity and Role
```markdown
# Agent Name

Brief introduction explaining who the agent is and its primary role.
```

#### 2. Core Responsibilities
```markdown
## Core Responsibilities

Clear list of what the agent does:
- Primary task 1
- Primary task 2
- Primary task 3
```

#### 3. Approach and Methodology
```markdown
## Approach

Step-by-step methodology:
1. First step
2. Second step
3. Third step
```

#### 4. Guidelines and Constraints
```markdown
## Guidelines

- What the agent should always do
- What the agent should avoid
- Quality standards to maintain
```

#### 5. Output Expectations
```markdown
## Output Format

Specify expected output structure, format, and quality criteria.
```

### Prompt Writing Best Practices

**Be Specific and Direct**:
- Use imperative mood ("Analyze", "Generate", "Focus on")
- Avoid ambiguous terms ("should", "might", "possibly")
- Provide concrete examples when appropriate

**Define Boundaries**:
- Clearly state what the agent should and shouldn't do
- Define scope limits explicitly
- Specify when to ask for clarification

**Include Context**:
- Explain the agent's domain expertise
- Reference relevant frameworks, standards, or methodologies
- Provide technical context when necessary

**Focus on Behavior**:
- Describe how the agent should think and work
- Include decision-making criteria
- Specify quality standards and validation steps

**Use Structured Format**:
- Break content into clear sections with headers
- Use bullet points and numbered lists
- Make instructions scannable and hierarchical

## MCP Server Configuration (Organization/Enterprise Only)

MCP servers extend agent capabilities with additional tools. Only supported for organization and enterprise-level agents.

### Configuration Format

```yaml
---
name: my-custom-agent
description: 'Agent with MCP integration'
tools: ['read', 'edit', 'custom-mcp/tool-1']
mcp-servers:
  custom-mcp:
    type: 'local'
    command: 'some-command'
    args: ['--arg1', '--arg2']
    tools: ["*"]
    env:
      ENV_VAR_NAME: ${{ secrets.API_KEY }}
---
```

### MCP Server Properties

- **type**: Server type (`'local'` or `'stdio'`)
- **command**: Command to start the MCP server
- **args**: Array of command arguments
- **tools**: Tools to enable from this server (`["*"]` for all)
- **env**: Environment variables (supports secrets)

### Environment Variables and Secrets

Secrets must be configured in repository settings under "copilot" environment.

**Supported syntax**:
```yaml
env:
  # Environment variable only
  VAR_NAME: COPILOT_MCP_ENV_VAR_VALUE

  # Variable with header
  VAR_NAME: $COPILOT_MCP_ENV_VAR_VALUE
  VAR_NAME: ${COPILOT_MCP_ENV_VAR_VALUE}

  # GitHub Actions-style (YAML only)
  VAR_NAME: ${{ secrets.COPILOT_MCP_ENV_VAR_VALUE }}
  VAR_NAME: ${{ var.COPILOT_MCP_ENV_VAR_VALUE }}
```

## File Organization and Naming

### Repository-Level Agents
- Location: `.github/agents/`
- Scope: Available only in the specific repository
- Access: Uses repository-configured MCP servers

### Organization/Enterprise-Level Agents
- Location: `.github-private/agents/` (then move to `agents/` root)
- Scope: Available across all repositories in org/enterprise
- Access: Can configure dedicated MCP servers

### Naming Conventions
- Use lowercase with hyphens: `test-specialist.agent.md`
- Name should reflect agent purpose
- Filename becomes default agent name (if `name` not specified)
- Allowed characters: `.`, `-`, `_`, `a-z`, `A-Z`, `0-9`

## Agent Processing and Behavior

### Versioning
- Based on Git commit SHAs for the agent file
- Create branches/tags for different agent versions
- Instantiated using latest version for repository/branch
- PR interactions use same agent version for consistency

### Name Conflicts
Priority (highest to lowest):
1. Repository-level agent
2. Organization-level agent
3. Enterprise-level agent

Lower-level configurations override higher-level ones with the same name.

### Tool Processing
- `tools` list filters available tools (built-in and MCP)
- No tools specified = all tools enabled
- Empty list (`[]`) = all tools disabled
- Specific list = only those tools enabled
- Unrecognized tool names are ignored (allows environment-specific tools)

### MCP Server Processing Order
1. Out-of-the-box MCP servers (e.g., GitHub MCP)
2. Custom agent MCP configuration (org/enterprise only)
3. Repository-level MCP configurations

Each level can override settings from previous levels.

## Agent Creation Checklist

### Frontmatter
- [ ] `description` field present and descriptive (50-150 chars)
- [ ] `description` wrapped in single quotes
- [ ] `name` specified (optional but recommended)
- [ ] `tools` configured appropriately (or intentionally omitted)
- [ ] `model` specified for optimal performance
- [ ] `target` set if environment-specific
- [ ] `infer` set to `false` if manual selection required

### Prompt Content
- [ ] Clear agent identity and role defined
- [ ] Core responsibilities listed explicitly
- [ ] Approach and methodology explained
- [ ] Guidelines and constraints specified
- [ ] Output expectations documented
- [ ] Examples provided where helpful
- [ ] Instructions are specific and actionable
- [ ] Scope and boundaries clearly defined
- [ ] Total content under 30,000 characters

### File Structure
- [ ] Filename follows lowercase-with-hyphens convention
- [ ] File placed in correct directory (`.github/agents/` or `agents/`)
- [ ] Filename uses only allowed characters
- [ ] File extension is `.agent.md`

### Quality Assurance
- [ ] Agent purpose is unique and not duplicative
- [ ] Tools are minimal and necessary
- [ ] Instructions are clear and unambiguous
- [ ] Agent has been tested with representative tasks
- [ ] Documentation references are current
- [ ] Security considerations addressed (if applicable)

## Common Agent Patterns

### Testing Specialist
**Purpose**: Focus on test coverage and quality
**Tools**: All tools (for comprehensive test creation)
**Approach**: Analyze, identify gaps, write tests, avoid production code changes

### Implementation Planner
**Purpose**: Create detailed technical plans and specifications
**Tools**: Limited to `['read', 'search', 'edit']`
**Approach**: Analyze requirements, create documentation, avoid implementation

### Code Reviewer
**Purpose**: Review code quality and provide feedback
**Tools**: `['read', 'search']` only
**Approach**: Analyze, suggest improvements, no direct modifications

### Refactoring Specialist
**Purpose**: Improve code structure and maintainability
**Tools**: `['read', 'search', 'edit']`
**Approach**: Analyze patterns, propose refactorings, implement safely

### Security Auditor
**Purpose**: Identify security issues and vulnerabilities
**Tools**: `['read', 'search', 'web']`
**Approach**: Scan code, check against OWASP, report findings

## Common Mistakes to Avoid

### Frontmatter Errors
- ❌ Missing `description` field
- ❌ Description not wrapped in quotes
- ❌ Invalid tool names without checking documentation
- ❌ Incorrect YAML syntax (indentation, quotes)

### Tool Configuration Issues
- ❌ Granting excessive tool access unnecessarily
- ❌ Missing required tools for agent's purpose
- ❌ Not using tool aliases consistently
- ❌ Forgetting MCP server namespace (`server-name/tool`)

### Prompt Content Problems
- ❌ Vague, ambiguous instructions
- ❌ Conflicting or contradictory guidelines
- ❌ Lack of clear scope definition
- ❌ Missing output expectations
- ❌ Overly verbose instructions (exceeding character limits)
- ❌ No examples or context for complex tasks

### Organizational Issues
- ❌ Filename doesn't reflect agent purpose
- ❌ Wrong directory (confusing repo vs org level)
- ❌ Using spaces or special characters in filename
- ❌ Duplicate agent names causing conflicts

## Testing and Validation

### Manual Testing
1. Create the agent file with proper frontmatter
2. Reload VS Code or refresh GitHub.com
3. Select the agent from the dropdown in Copilot Chat
4. Test with representative user queries
5. Verify tool access works as expected
6. Confirm output meets expectations

### Integration Testing
- Test agent with different file types in scope
- Verify MCP server connectivity (if configured)
- Check agent behavior with missing context
- Test error handling and edge cases
- Validate agent switching and handoffs

### Quality Checks
- Run through agent creation checklist
- Review against common mistakes list
- Compare with example agents in repository
- Get peer review for complex agents
- Document any special configuration needs

## Additional Resources

### Official Documentation
- [Creating Custom Agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [Custom Agents Configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Custom Agents in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [MCP Integration](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp)

### Community Resources
- [Awesome Copilot Agents Collection](https://github.com/github/awesome-copilot/tree/main/agents)
- [Customization Library Examples](https://docs.github.com/en/copilot/tutorials/customization-library/custom-agents)
- [Your First Custom Agent Tutorial](https://docs.github.com/en/copilot/tutorials/customization-library/custom-agents/your-first-custom-agent)

### Related Files
- [Prompt Files Guidelines](./prompt.instructions.md) - For creating prompt files
- [Instructions Guidelines](./instructions.instructions.md) - For creating instruction files

## Version Compatibility Notes

### GitHub.com (Coding Agent)
- ✅ Fully supports all standard frontmatter properties
- ✅ Repository and org/enterprise level agents
- ✅ MCP server configuration (org/enterprise)
- ❌ Does not support `model`, `argument-hint`, `handoffs` properties

### VS Code / JetBrains / Eclipse / Xcode
- ✅ Supports `model` property for AI model selection
- ✅ Supports `argument-hint` and `handoffs` properties
- ✅ User profile and workspace-level agents
- ❌ Cannot configure MCP servers at repository level
- ⚠️ Some properties may behave differently

When creating agents for multiple environments, focus on common properties and test in all target environments. Use `target` property to create environment-specific agents when necessary.
