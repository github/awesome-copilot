---
description: Generate complete Power Platform custom connector with MCP integration for Copilot Studio - includes schema generation, troubleshooting, and validation
agent: agent
---

# Power Platform MCP Connector Suite

Generate comprehensive Power Platform custom connector implementations with Model Context Protocol integration for Microsoft Copilot Studio.

## MCP Capabilities in Copilot Studio

**Currently Supported:**
- ✅ **Tools**: Functions that the LLM can call (with user approval)
- ✅ **Resources**: File-like data that agents can read (must be tool outputs)

**Not Yet Supported:**
- ❌ **Prompts**: Pre-written templates (prepare for future support)

## Connector Generation

Create complete Power Platform connector with:

**Core Files:**
- `apiDefinition.swagger.json` with `x-ms-agentic-protocol: mcp-streamable-1.0`
- `apiProperties.json` with connector metadata and authentication
- `script.csx` with custom C# transformations for MCP JSON-RPC handling
- `readme.md` with connector documentation

**MCP Integration:**
- POST `/mcp` endpoint for JSON-RPC 2.0 communication
- McpResponse and McpErrorResponse schema definitions
- Copilot Studio constraint compliance (no reference types, single types)
- Resource integration as tool outputs (Resources and Tools supported; Prompts not yet supported)

## Schema Validation & Troubleshooting

**Validate schemas for Copilot Studio compliance:**
- ✅ No reference types (`$ref`) in tool inputs/outputs
- ✅ Single type values only (not `["string", "number"]`)
- ✅ Primitive types: string, number, integer, boolean, array, object
- ✅ Resources as tool outputs, not separate entities
- ✅ Full URIs for all endpoints

**Common issues and fixes:**
- Tools filtered → Remove reference types, use primitives
- Type errors → Single types with validation logic
- Resources unavailable → Include in tool outputs
- Connection failures → Verify `x-ms-agentic-protocol` header

## Context Variables

- **Connector Name**: [Display name for the connector]
- **Server Purpose**: [What the MCP server should accomplish]
- **Tools Needed**: [List of MCP tools to implement]
- **Resources**: [Types of resources to provide]
- **Authentication**: [none, api-key, oauth2, basic]
- **Host Environment**: [Azure Function, Express.js, etc.]
- **Target APIs**: [External APIs to integrate with]

## Generation Modes

### Mode 1: Complete New Connector
Generate all files for a new Power Platform MCP connector from scratch, including CLI validation setup.

### Mode 2: Schema Validation
Analyze and fix existing schemas for Copilot Studio compliance using paconn and validation tools.

### Mode 3: Integration Troubleshooting
Diagnose and resolve MCP integration issues with Copilot Studio using CLI debugging tools.

### Mode 4: Hybrid Connector
Add MCP capabilities to existing Power Platform connector with proper validation workflows.

### Mode 5: Certification Preparation
Prepare connector for Microsoft certification submission with complete metadata and validation compliance.

### Mode 6: OAuth Security Hardening
Implement OAuth 2.0 authentication enhanced with MCP security best practices and advanced token validation.

## Expected Output

**1. apiDefinition.swagger.json**
- Swagger 2.0 format with Microsoft extensions
- MCP endpoint: `POST /mcp` with proper protocol header
- Compliant schema definitions (primitive types only)
- McpResponse/McpErrorResponse definitions

**2. apiProperties.json**
- Connector metadata and branding (`iconBrandColor` required)
- Authentication configuration
- Policy templates for MCP transformations

**3. script.csx**
- JSON-RPC 2.0 message handling
- Request/response transformations
- MCP protocol compliance logic
- Error handling and validation

**4. Implementation guidance**
- Tool registration and execution patterns
- Resource management strategies
- Copilot Studio integration steps
- Testing and validation procedures

## Validation Checklist

### Technical Compliance
- [ ] `x-ms-agentic-protocol: mcp-streamable-1.0` in MCP endpoint
- [ ] No reference types in any schema definitions
- [ ] All type fields are single types (not arrays)
- [ ] Resources included as tool outputs
- [ ] JSON-RPC 2.0 compliance in script.csx
- [ ] Full URI endpoints throughout
- [ ] Clear descriptions for Copilot Studio agents
- [ ] Authentication properly configured
- [ ] Policy templates for MCP transformations
- [ ] Generative Orchestration compatibility

### CLI Validation
- [ ] **paconn validate**: `paconn validate --api-def apiDefinition.swagger.json` passes without errors
- [ ] **pac CLI ready**: Connector can be created/updated with `pac connector create/update`
- [ ] **Script validation**: script.csx passes automatic validation during pac CLI upload
- [ ] **Package validation**: `ConnectorPackageValidator.ps1` runs successfully

### OAuth and Security Requirements
- [ ] **OAuth 2.0 Enhanced**: Standard OAuth 2.0 with MCP security best practices implementation
- [ ] **Token Validation**: Implement token audience validation to prevent passthrough attacks
- [ ] **Custom Security Logic**: Enhanced validation in script.csx for MCP compliance
- [ ] **State Parameter Protection**: Secure state parameters for CSRF prevention
- [ ] **HTTPS Enforcement**: All production endpoints use HTTPS only
- [ ] **MCP Security Practices**: Implement confused deputy attack prevention within OAuth 2.0

### Certification Requirements
- [ ] **Complete metadata**: settings.json with product and service information
- [ ] **Icon compliance**: PNG format, 230x230 or 500x500 dimensions
- [ ] **Documentation**: Certification-ready readme with comprehensive examples
- [ ] **Security compliance**: OAuth 2.0 enhanced with MCP security practices, privacy policy
- [ ] **Authentication flow**: OAuth 2.0 with custom security validation properly configured

## Example Usage

```yaml
Mode: Complete New Connector
Connector Name: Customer Analytics MCP
Server Purpose: Customer data analysis and insights
Tools Needed:
  - searchCustomers: Find customers by criteria
  - getCustomerProfile: Retrieve detailed customer data
  - analyzeCustomerTrends: Generate trend analysis
Resources:
  - Customer profiles (JSON data)
  - Analysis reports (structured data)
Authentication: oauth2
Host Environment: Azure Function
Target APIs: CRM REST API
```