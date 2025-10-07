---
description: 'Instructions for developing Power Platform custom connectors with Model Context Protocol (MCP) integration for Microsoft Copilot Studio'
applyTo: '**/*.{json,csx,md}'
---

# Power Platform MCP Custom Connector Development

## Instructions

### MCP Protocol Integration
- Always implement JSON-RPC 2.0 standard for MCP communication
- Use `x-ms-agentic-protocol: mcp-streamable-1.0` header for Copilot Studio compatibility
- Structure endpoints to support both standard REST operations and MCP tool invocation
- Transform responses to comply with Copilot Studio constraints (no reference types, single types only)

### Schema Design Best Practices
- Remove `$ref` and other reference types from JSON schemas as Copilot Studio cannot handle them
- Use single types instead of arrays of types in schema definitions
- Flatten `anyOf`/`oneOf` constructs to single schemas for Copilot Studio compatibility
- Ensure all tool input schemas are self-contained without external references

### Authentication and Security
- Implement OAuth 2.0 with MCP security best practices within Power Platform constraints
- Use connection parameter sets for flexible authentication configuration
- Validate token audience to prevent passthrough attacks
- Add MCP-specific security headers for enhanced validation
- Support multiple authentication methods (OAuth standard, OAuth enhanced, API key fallback)

### Custom Script Implementation
- Handle JSON-RPC transformation in the custom script (script.csx)
- Implement proper error handling with JSON-RPC error response format
- Add token validation and audience checking in authentication flow
- Transform MCP server responses for Copilot Studio compatibility
- Use connection parameters for dynamic security configuration

### Swagger Definition Guidelines
- Use Swagger 2.0 specification for Power Platform compatibility
- Implement proper `operationId` values for each endpoint
- Define clear parameter schemas with appropriate types and descriptions
- Add comprehensive response schemas for all success and error cases
- Include proper HTTP status codes and response headers

### Resource and Tool Management
- Structure MCP resources to be consumable as tool outputs in Copilot Studio
- Ensure proper MIME type declarations for resource content
- Add audience and priority annotations for better Copilot Studio integration
- Implement resource transformation to meet Copilot Studio requirements

### Connection Parameter Configuration
- Use enum dropdowns for OAuth version and security level selection
- Provide clear parameter descriptions and constraints
- Support multiple authentication parameter sets for different deployment scenarios
- Include validation rules and default values where appropriate
- Enable dynamic configuration through connection parameter values

### Error Handling and Logging
- Implement comprehensive error responses following JSON-RPC 2.0 error format
- Add detailed logging for authentication, validation, and transformation steps
- Provide clear error messages that help with troubleshooting
- Include proper HTTP status codes aligned with error conditions

### Testing and Validation
- Test connector with actual MCP server implementations
- Validate schema transformations work correctly with Copilot Studio
- Verify authentication flows for all supported parameter sets
- Ensure proper error handling for various failure scenarios
- Test connection parameter configurations and dynamic behavior

## Additional Guidelines

### Power Platform Certification Requirements
- Include comprehensive documentation (readme.md, CUSTOMIZE.md)
- Provide clear setup and configuration instructions
- Document all authentication options and security considerations
- Include proper publisher and stack owner information
- Ensure compliance with Power Platform connector certification standards

### MCP Server Compatibility
- Design for compatibility with standard MCP server implementations
- Support common MCP methods like `tools/list`, `tools/call`, `resources/list`
- Handle streaming responses appropriately for `mcp-streamable-1.0` protocol
- Implement proper protocol negotiation and capability detection

### Copilot Studio Integration
- Ensure tool definitions work correctly within Copilot Studio's constraints
- Test resource access and tool invocation from Copilot Studio interface
- Validate that transformed schemas produce expected behavior in conversations
- Confirm proper integration with Copilot Studio's agent framework