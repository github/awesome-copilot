---
description: 'Guidelines for creating high-quality custom agent files for GitHub Copilot'
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
model: 'claude-4.5-sonnet'
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
- Example: `'claude-4.5-sonnet'`, `'gpt-4'`, `'gpt-4o'`
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

Agents can invoke other agents using the `runSubagent` function. This enables complex workflows where a coordinator agent orchestrates multiple specialized agents to accomplish multi-step tasks.

### When to Use Sub-Agents

**Use sub-agents when**:
- Breaking complex tasks into specialized subtasks
- Creating orchestration/workflow agents
- Delegating specific responsibilities to expert agents
- Enabling agent composition and reusability
- Implementing pipeline or sequential workflows

**Examples**:
- An orchestrator agent managing a multi-step question generation pipeline
- A CI/CD coordinator delegating tasks to specialized agents
- A project manager agent breaking down work across technical specialists
- A code review system with different agents for security, performance, style

### Sub-Agent Configuration

To enable sub-agent invocation, include `agent` in the tools list:

```yaml
---
description: 'Orchestrates specialized agents for multi-step workflows'
name: 'Orchestrator Agent'
tools: ['read', 'edit', 'search', 'agent']
---
```

### Sub-Agent Invocation Syntax

Use `runSubagent` to invoke another agent with a detailed prompt:

```javascript
const result = await runSubagent({
  description: 'Brief description of what this sub-task accomplishes',
  prompt: `You are the [Agent Name] specialist.

Your task:
1. [Step 1 description]
2. [Step 2 description]
3. [Step 3 description]

Input parameters:
- Parameter 1: [value]
- Parameter 2: [value]

Expected output:
[Specify format and location of results]

Quality standards:
- [Standard 1]
- [Standard 2]
- [Standard 3]`
});
```

### Best Practices for Sub-Agent Orchestration

#### 1. **Clear Task Definition**
- Provide explicit, unambiguous instructions
- Define inputs and outputs clearly
- Specify expected file locations and formats
- Include quality standards and validation criteria

```javascript
// Good: Clear and specific
const result = await runSubagent({
  description: 'Generate course materials from transcripts',
  prompt: `Process certification: ${certName}

Read all .transcript files from: certifications/${certName}/formation/transcripts/
Create organized course document at: certifications/${certName}/formation/course.md

Structure requirements:
- Use ## for sections, ### for subsections
- Include code blocks for formulas and examples
- Preserve all technical terminology
- No additional information beyond transcripts

Return: Summary of sections created and files processed`
});
```

#### 2. **Parameter Passing**
- Pass all necessary context to sub-agents
- Use consistent naming conventions
- Include file paths, configuration details, and constraints
- Specify output format and location explicitly

```javascript
// Pattern: Context-aware parameters
const step1Result = await runSubagent({
  description: 'Step 1: Data preparation',
  prompt: `Parameters:
- Project: ${projectName}
- Base path: ${basePath}
- Input files: ${inputDir}
- Output location: ${outputDir}

Task: [detailed instructions]`
});
```

#### 3. **Error Handling and Recovery**
- Capture and log results from each sub-agent call
- Handle failures gracefully (continue if non-critical)
- Log timestamps and durations for troubleshooting
- Provide fallback strategies

```javascript
// Pattern: Error handling with logging
try {
  const result = await runSubagent({
    description: 'Process data',
    prompt: buildPromptForSubAgent(params)
  });

  const duration = calculateDuration(startTime, new Date());
  logStepCompletion(stepNumber, 'SUCCESS', duration, result);
  return { status: 'success', result };

} catch (error) {
  const duration = calculateDuration(startTime, new Date());
  logStepCompletion(stepNumber, 'FAILED', duration, error.message);

  if (isComposingStep) throw error;  // Critical step
  return { status: 'failed', error: error.message };
}
```

#### 4. **Sequential vs Parallel Execution**
- Execute critical steps sequentially
- Ensure each step receives correct input from previous step
- Log completion before proceeding to next step
- Wait for results before using them as input to next agent

```javascript
// Sequential execution pattern
async function executeWorkflow(params) {
  // Step 1: Requires no prior output
  const step1 = await runSubagent({
    description: 'Step 1: Data ingestion',
    prompt: buildStep1Prompt(params)
  });
  logStep(1, step1);

  // Step 2: Depends on Step 1
  const step2 = await runSubagent({
    description: 'Step 2: Data processing',
    prompt: buildStep2Prompt(params, step1.result)
  });
  logStep(2, step2);

  // Step 3: Depends on Step 2
  const step3 = await runSubagent({
    description: 'Step 3: Validation',
    prompt: buildStep3Prompt(params, step2.result)
  });
  logStep(3, step3);

  return { step1, step2, step3 };
}
```

#### 5. **Result Logging and Tracking**
- Create detailed logs for pipeline execution
- Track timestamps (start, complete, duration)
- Document agent responses and outputs
- Include statistics and summaries

```javascript
// Pattern: Comprehensive logging
function logStepCompletion(stepNum, stepName, status, startTime, endTime,
                          result, error = null) {
  const duration = calculateDuration(startTime, endTime);

  const logEntry = `
## Step ${stepNum}: ${stepName}
**Status:** ${status}
**Started:** ${startTime.toISOString()}
**Completed:** ${endTime.toISOString()}
**Duration:** ${duration}
**Output:** ${result ? result.summary : 'N/A'}
${error ? `**Error:** ${error}` : ''}
`;

  appendToLog(logEntry);
}
```

#### 6. **Conditional Sub-Agent Invocation**
- Check prerequisites before invoking sub-agents
- Skip optional steps if conditions not met
- Verify input files/folders exist
- Log skip reasons

```javascript
// Pattern: Conditional execution
async function conditionalPipelineStep(stepNumber, params) {
  const inputPath = `${params.basePath}/${params.inputFolder}`;

  // Check if input exists
  if (!await fileExists(inputPath)) {
    logStep(stepNumber, 'SKIPPED', 'Input folder does not exist');
    return { status: 'skipped', reason: 'Input not found' };
  }

  // Proceed with sub-agent invocation
  return await runSubagent({
    description: `Execute Step ${stepNumber}`,
    prompt: buildPromptForStep(stepNumber, params)
  });
}
```

### Sub-Agent Communication Pattern

**Orchestrator Agent Structure**:

```markdown
# Orchestrator Agent

You are a workflow coordinator that manages specialized agents.

## Responsibilities
- Break complex tasks into focused subtasks
- Invoke specialized agents via runSubagent
- Log and track each step
- Handle errors and recovery
- Generate summary reports

## Sub-agents Managed
- @specialized-agent-1: Handles task X
- @specialized-agent-2: Handles task Y
- @specialized-agent-3: Handles task Z

## Workflow Pattern

For each task:
1. Validate prerequisites
2. Invoke appropriate sub-agent with detailed prompt
3. Log results with timestamps
4. Proceed to next step or handle failure
5. Generate final summary
```

### Real-World Example: Question Generation Pipeline

Based on the Orchestrator agent example:

```javascript
// Orchestrator invokes multiple specialized agents
async function questionGenerationPipeline(certificationName) {
  const basePath = `certifications/${certificationName}`;

  // Step 1: Resume Transcripts
  const transcriptResult = await runSubagent({
    description: 'Generate course from transcripts',
    prompt: `You are the Resume Transcript specialist.

Process: ${certificationName}
Input: ${basePath}/formation/transcripts/
Output: ${basePath}/formation/course.md

Task:
1. Read all .transcript files
2. Organize by topic (##) and subtopic (###)
3. Create structured course document
4. Preserve all technical accuracy

Return: Summary of sections and files processed`
  });

  // Step 2: Create Question Sets
  const setResult = await runSubagent({
    description: 'Generate CSV question sets',
    prompt: `You are the Create Set specialist.

Process: ${certificationName}
Input: ${basePath}/dumps/ and ${basePath}/formation/
Output: ${basePath}/imports/ (CSV files)

Task:
1. Convert dumps to CSV format (max 30 questions per file)
2. Generate questions from course material
3. Apply proper formatting
4. Save all to imports folder

Return: List of CSV files created with counts`
  });

  // Step 3: Add Explanations
  const explResult = await runSubagent({
    description: 'Add explanations to all questions',
    prompt: `You are the Add Explanation specialist.

Process: ${certificationName}
Input: ${basePath}/imports/ (CSV files)
Output: ${basePath}/imports/ (updated CSV files)

Task:
1. Read all CSV files
2. For each question, use MCP Context7 to find official documentation
3. Write detailed explanations with references
4. Update CSV files

Return: Summary of explanations added`
  });

  // Step 4: Verify Questions
  const verifyResult = await runSubagent({
    description: 'Validate all questions and generate reports',
    prompt: `You are the Verify Question specialist.

Process: ${certificationName}
Input: ${basePath}/imports/ (CSV files with explanations)
Output: ${basePath}/imports/report/ (validation reports)

Task:
1. Validate each question against official documentation
2. Check answer accuracy
3. Verify explanation quality
4. Generate detailed validation reports

Return: Summary of issues found and reports generated`
  });

  // Generate final summary
  generatePipelineSummary(certificationName, {
    transcriptResult,
    setResult,
    explResult,
    verifyResult
  });
}
```

### Common Sub-Agent Patterns

**Pattern 1: Sequential Data Processing**
```
Input → Agent1 (transform) → Agent2 (enrich) → Agent3 (validate) → Output
```

**Pattern 2: Parallel Task Distribution**
```
Input → Agent1 (task A)  → Agent3 (combine)
      → Agent2 (task B)  → Output
```

**Pattern 3: Conditional Branching**
```
Input → Check condition → Agent1 or Agent2 → Output
```

**Pattern 4: Error Recovery**
```
Input → Agent1 (primary) → Success? → Output
                     ↓ Failure
                   Agent2 (fallback) → Output
```

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

```markdown
# Orchestrator Agent - Question Generation Pipeline

## Dynamic Parameters

- **Certification Name**: Extracted from user prompt (e.g., "Platform Sharing Architect")
- **Base Path**: Derived as `certifications/[Certification Name]/`
- **Log File**: Set to `certifications/[Certification Name]/.pipeline-log.md`

## Your Mission

Execute the complete question generation pipeline for the **${certificationName}** certification by invoking specialized agents without human validation between steps.

### Initial Setup

If no certification name is provided in your request, **ASK THE USER** which certification to process.

## Pre-flight Checks

Verify the certification structure at `${basePath}`:
- ✅ presentation.md exists
- ✅ formation/transcripts/ exists (checking for .transcript files)
- ℹ️ formation/course.md will be created
- ✅ dumps/ exists
- ℹ️ imports/ directory will be created

## Pipeline Execution

### Step 1: Resume Transcript
Invoke `@resume-transcript` agent:

Parameters to pass:
- Certification: ${certificationName}
- Input: ${basePath}/formation/transcripts/
- Output: ${basePath}/formation/course.md

### Step 2: Dump Transform
Invoke `@dump-transform` agent:

Parameters to pass:
- Certification: ${certificationName}
- Input: ${basePath}/dumps/original/
- Output: ${basePath}/dumps/transform/

### Step 3: Create Question Sets
Invoke `@create-set` agent:

Parameters to pass:
- Certification: ${certificationName}
- Inputs: ${basePath}/dumps/transform/ and ${basePath}/formation/
- Output: ${basePath}/imports/

## Logging

All operations logged to: `${logFile}`

Track for each step:
- Status (✅ SUCCESS / ⚠️ SKIPPED / ❌ FAILED)
- Timestamps for start and completion
- Duration of execution
- Summary of results
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
