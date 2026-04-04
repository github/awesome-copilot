---
name: agentify-openapi
description: 'Transform OpenAPI specs into agent interface files (AGENTS.md, MCP servers, Skills, and more) using Agentify CLI'
---

# Generate Agent Interfaces from OpenAPI with Agentify

Your goal is to help the user transform an OpenAPI specification into agent-ready interface files using [Agentify](https://github.com/koriyoshi2041/agentify), a CLI tool that compiles OpenAPI specs into multiple agent interface formats.

## What is Agentify?

Agentify is an open-source TypeScript CLI that reads an OpenAPI specification and generates up to 9 agent interface formats from a single source of truth:

| Format | Description |
|--------|-------------|
| **AGENTS.md** | Standard agent instructions file (GitHub Copilot, 60K+ repos) |
| **MCP Server** | Model Context Protocol server for tool-calling agents |
| **CLAUDE.md** | Claude Code project instructions |
| **Skills** | Reusable agent skill definitions (skills.json) |
| **.cursorrules** | Cursor editor rules for AI-assisted coding |
| **llms.txt** | Machine-readable site description for LLMs |
| **GEMINI.md** | Gemini agent instructions |
| **A2A Card** | Agent-to-Agent protocol discovery card |
| **CLI** | Standalone Commander.js CLI from API endpoints |

## Prerequisites

Agentify requires Node.js 18+ and is available on npm:

```bash
npm install -g agentify-cli
```

Or run directly without installing:

```bash
npx agentify-cli transform <openapi-spec>
```

## Usage

### Basic: Generate All Formats

```bash
npx agentify-cli transform https://petstore3.swagger.io/api/v3/openapi.json
```

This generates all supported formats into an `output/` directory.

### Selective Formats

Generate only specific formats using the `-f` flag:

```bash
# Generate only AGENTS.md
npx agentify-cli transform ./openapi.yaml -f agents.md

# Generate AGENTS.md and MCP server
npx agentify-cli transform ./openapi.yaml -f agents.md -f mcp

# Generate AGENTS.md, Skills, and CLI
npx agentify-cli transform ./openapi.yaml -f agents.md -f skills -f cli
```

### Custom Output Directory

```bash
npx agentify-cli transform ./openapi.yaml -o ./my-output
```

## Workflow

### Step 1: Identify the OpenAPI Spec

Help the user locate their OpenAPI specification. It can be:

- A URL (e.g., `https://api.example.com/openapi.json`)
- A local file path (`.json` or `.yaml`)
- Swagger 2.0 or OpenAPI 3.x format

If the user does not have an OpenAPI spec, suggest they create one first or point them to their framework's auto-generation feature (e.g., FastAPI, ASP.NET, Spring Boot).

### Step 2: Run Agentify

Run the transform command with the appropriate options:

```bash
npx agentify-cli transform <spec-url-or-path>
```

### Step 3: Review Generated Files

After generation, review the output files with the user:

- **AGENTS.md**: Should accurately describe the API's capabilities, endpoints, authentication, and usage patterns
- **MCP Server**: Check that tool definitions map correctly to API endpoints
- **Skills**: Verify capability descriptions and parameter schemas

### Step 4: Integrate into Project

Guide the user to place the generated files in the correct locations:

- `AGENTS.md` goes in the repository root
- `.cursorrules` goes in the repository root
- `CLAUDE.md` goes in the repository root
- MCP server code goes in a dedicated directory (e.g., `mcp-server/`)
- Skills JSON can be placed in a `.copilot/skills/` directory or published

## Tiered Generation Strategy

Agentify automatically selects a generation strategy based on API size:

| API Size | Endpoints | Strategy |
|----------|-----------|----------|
| Small | < 30 | One tool per endpoint |
| Medium | 30-100 | Tool search + lazy loading |
| Large | 100+ | Code execution + docs search |

This ensures agent context windows are not overwhelmed by large APIs.

## Example

Transform the Petstore API into agent interfaces:

```bash
npx agentify-cli transform https://petstore3.swagger.io/api/v3/openapi.json -o ./petstore-agents
```

This produces:

```
petstore-agents/
  AGENTS.md
  CLAUDE.md
  GEMINI.md
  .cursorrules
  llms.txt
  skills.json
  a2a-card.json
  mcp-server/
    index.ts
    package.json
  cli/
    index.ts
    package.json
```

## When to Use This Skill

- You have an existing REST API with an OpenAPI spec and want to make it agent-accessible
- You want to generate an AGENTS.md file automatically instead of writing one by hand
- You need to create MCP server tooling for an API
- You want consistent agent interface files across multiple formats from a single source

## Links

- **GitHub**: [koriyoshi2041/agentify](https://github.com/koriyoshi2041/agentify)
- **npm**: [agentify-cli](https://www.npmjs.com/package/agentify-cli)
- **License**: MIT
