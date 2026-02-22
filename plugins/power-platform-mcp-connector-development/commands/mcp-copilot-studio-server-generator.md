---
description: Generate a complete MCP server implementation optimized for Copilot Studio integration with proper schema constraints and streamable HTTP support
agent: agent
---

# Power Platform MCP Connector Generator

Generate a complete Power Platform custom connector with Model Context Protocol (MCP) integration for Microsoft Copilot Studio. This prompt creates all necessary files following Power Platform connector standards with MCP streamable HTTP support.

## Instructions

Create a complete MCP server implementation that:

1. **Uses Copilot Studio MCP Pattern:**
   - Implement `x-ms-agentic-protocol: mcp-streamable-1.0`
   - Support JSON-RPC 2.0 communication protocol
   - Provide streamable HTTP endpoint at `/mcp`
   - Follow Power Platform connector structure

2. **Schema Compliance Requirements:**
   - **NO reference types** in tool inputs/outputs (filtered by Copilot Studio)
   - **Single type values only** (not arrays of multiple types)
   - **Avoid enum inputs** (interpreted as string, not enum)
   - Use primitive types: string, number, integer, boolean, array, object
   - Ensure all endpoints return full URIs

3. **MCP Components to Include:**
   - **Tools**: Functions for the language model to call (✅ Supported in Copilot Studio)
   - **Resources**: File-like data outputs from tools (✅ Supported in Copilot Studio - must be tool outputs to be accessible)
   - **Prompts**: Predefined templates for specific tasks (❌ Not yet supported in Copilot Studio)

4. **Implementation Structure:**
   ```
   /apiDefinition.swagger.json  (Power Platform connector schema)
   /apiProperties.json         (Connector metadata and configuration)
   /script.csx                 (Custom code transformations and logic)
   /server/                    (MCP server implementation)
   /tools/                     (Individual MCP tools)
   /resources/                 (MCP resource handlers)
   ```

## Context Variables

- **Server Purpose**: [Describe what the MCP server should accomplish]
- **Tools Needed**: [List of specific tools to implement]  
- **Resources**: [Types of resources to provide]
- **Authentication**: [Auth method: none, api-key, oauth2]
- **Host Environment**: [Azure Function, Express.js, FastAPI, etc.]
- **Target APIs**: [External APIs to integrate with]

## Expected Output

Generate:

1. **apiDefinition.swagger.json** with:
   - Proper `x-ms-agentic-protocol: mcp-streamable-1.0`
   - MCP endpoint at POST `/mcp`
   - Compliant schema definitions (no reference types)
   - McpResponse and McpErrorResponse definitions

2. **apiProperties.json** with:
   - Connector metadata and branding
   - Authentication configuration
   - Policy templates if needed

3. **script.csx** with:
   - Custom C# code for request/response transformations
   - MCP JSON-RPC message handling logic
   - Data validation and processing functions
   - Error handling and logging capabilities

4. **MCP Server Code** with:
   - JSON-RPC 2.0 request handler
   - Tool registration and execution
   - Resource management (as tool outputs)
   - Proper error handling
   - Copilot Studio compatibility checks

5. **Individual Tools** that:
   - Accept only primitive type inputs
   - Return structured outputs
   - Include resources as outputs when needed
   - Provide clear descriptions for Copilot Studio

6. **Deployment Configuration** for:
   - Power Platform environment
   - Copilot Studio agent integration
   - Testing and validation

## Validation Checklist

Ensure generated code:
- [ ] No reference types in schemas
- [ ] All type fields are single types
- [ ] Enum handling via string with validation
- [ ] Resources available through tool outputs
- [ ] Full URI endpoints
- [ ] JSON-RPC 2.0 compliance
- [ ] Proper x-ms-agentic-protocol header
- [ ] McpResponse/McpErrorResponse schemas
- [ ] Clear tool descriptions for Copilot Studio
- [ ] Generative Orchestration compatible

## Example Usage

```yaml
Server Purpose: Customer data management and analysis
Tools Needed: 
  - searchCustomers
  - getCustomerDetails
  - analyzeCustomerTrends
Resources:
  - Customer profiles
  - Analysis reports
Authentication: oauth2
Host Environment: Azure Function
Target APIs: CRM System REST API
```