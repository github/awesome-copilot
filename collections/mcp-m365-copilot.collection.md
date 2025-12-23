# MCP-based M365 Agents Collection

A comprehensive collection of prompts and instructions for building declarative agents with Model Context Protocol (MCP) integration for Microsoft 365 Copilot.

## Overview

The Model Context Protocol (MCP) is a universal standard that allows AI models to integrate with external systems through standardized server endpoints. This collection provides everything you need to build, deploy, and manage MCP-based declarative agents that extend Microsoft 365 Copilot with custom capabilities.

## What is Model Context Protocol?

MCP is an open protocol developed to streamline how AI models connect to external data sources and tools. Instead of custom integration code for each system, MCP provides a consistent interface for:

- **Server Metadata**: Discover available tools and capabilities
- **Tools Listing**: Get function definitions and schemas
- **Tool Execution**: Invoke tools with parameters and receive results

For Microsoft 365 Copilot, this means you can create agents that connect to any MCP-compatible server with point-and-click configuration instead of writing custom code.

## Collection Contents

### Prompts

1. **Create Declarative Agent** ([mcp-create-declarative-agent.prompt.md](../prompts/mcp-create-declarative-agent.prompt.md))
   - Build declarative agents using Microsoft 365 Agents Toolkit
   - Configure MCP server integration with tool import
   - Set up OAuth 2.0 or SSO authentication
   - Configure response semantics for data extraction
   - Package and deploy agents for testing

2. **Create Adaptive Cards** ([mcp-create-adaptive-cards.prompt.md](../prompts/mcp-create-adaptive-cards.prompt.md))
   - Design static and dynamic Adaptive Card templates
   - Configure response semantics (data_path, properties, template_selector)
   - Use template language for conditionals and data binding
   - Create responsive cards that work across Copilot surfaces
   - Implement card actions for user interactions

3. **Deploy and Manage Agents** ([mcp-deploy-manage-agents.prompt.md](../prompts/mcp-deploy-manage-agents.prompt.md))
   - Deploy agents via Microsoft 365 admin center
   - Configure organizational or public store distribution
   - Manage agent lifecycle (publish, deploy, block, remove)
   - Set up governance and compliance controls
   - Monitor agent usage and performance

### Instructions

**MCP M365 Copilot Development Guidelines** ([mcp-m365-copilot.instructions.md](../instructions/mcp-m365-copilot.instructions.md))
- Best practices for MCP server design and tool selection
- File organization and project structure
- Response semantics configuration patterns
- Adaptive Card design principles
- Security, governance, and compliance requirements
- Testing and deployment workflows

## Key Concepts

### Declarative Agents

Declarative agents are defined through configuration files rather than code:
- **declarativeAgent.json**: Agent instructions, capabilities, conversation starters
- **ai-plugin.json**: MCP server tools, response semantics, adaptive card templates
- **mcp.json**: MCP server URL, authentication configuration
- **manifest.json**: Teams app manifest for packaging

### MCP Server Integration

The Microsoft 365 Agents Toolkit provides a visual interface for:
1. **Scaffold** a new agent project
2. **Add MCP action** to connect to a server
3. **Choose tools** from the server's available functions
4. **Configure authentication** (OAuth 2.0, SSO)
5. **Generate files** (agent config, plugin manifest)
6. **Test** in m365.cloud.microsoft/chat

### Authentication Patterns

**OAuth 2.0 Static Registration:**
- Pre-register OAuth app with service provider
- Store credentials in .env.local (never commit)
- Reference in ai-plugin.json authentication config
- Users consent once, tokens stored in plugin vault

**Single Sign-On (SSO):**
- Use Microsoft Entra ID for authentication
- Seamless experience for M365 users
- No separate login required
- Ideal for internal organizational agents

### Response Semantics

Extract and format data from MCP server responses:

```json
{
  "response_semantics": {
    "data_path": "$.items[*]",
    "properties": {
      "title": "$.name",
      "subtitle": "$.description",
      "url": "$.html_url"
    },
    "static_template": { ... }
  }
}
```

- **data_path**: JSONPath to extract array or object
- **properties**: Map response fields to Copilot properties
- **template_selector**: Choose dynamic template based on response
- **static_template**: Adaptive Card for visual formatting

### Adaptive Cards

Rich visual responses for agent outputs:

**Static Templates:**
- Defined once in ai-plugin.json
- Used for all responses with same structure
- Better performance and easier maintenance

**Dynamic Templates:**
- Returned in API response body
- Selected via template_selector JSONPath
- Useful for varied response structures

**Template Language:**
- `${property}`: Data binding
- `${if(condition, true, false)}`: Conditionals
- `${formatNumber(value, decimals)}`: Formatting
- `$when`: Conditional element rendering

## Deployment Options

### Organization Deployment
- IT admin deploys to all users or specific groups
- Requires approval in Microsoft 365 admin center
- Best for internal business agents
- Full governance and compliance controls

### Agent Store
- Submit to Partner Center for validation
- Public availability to all Copilot users
- Rigorous security and compliance review
- Suitable for partner-built agents

## Partner Examples

### monday.com
Task and project management integration:
- Create tasks directly from Copilot
- Query project status and updates
- Assign work items to team members
- View deadlines and milestones

### Canva
Design automation capabilities:
- Generate branded content
- Create social media graphics
- Access design templates
- Export in multiple formats

### Sitecore
Content management integration:
- Search content repository
- Create and update content items
- Manage workflows and approvals
- Preview content in context

## Getting Started

### Prerequisites
            return results
- Microsoft 365 Agents Toolkit extension (v6.3.x or later)
- GitHub account (for OAuth examples)
- Microsoft 365 Copilot license
- Access to an MCP-compatible server

### Quick Start
1. Install Microsoft 365 Agents Toolkit in VS Code
2. Use **Create Declarative Agent** prompt to scaffold project
3. Add MCP server URL and choose tools
4. Configure authentication with OAuth or SSO
5. Use **Create Adaptive Cards** prompt to design response templates
6. Test agent at m365.cloud.microsoft/chat
7. Use **Deploy and Manage Agents** prompt for distribution

### Development Workflow
```
1. Scaffold agent project
   ↓
2. Connect MCP server
   ↓
3. Import tools
   ↓
4. Configure authentication
   ↓
5. Design adaptive cards
   ↓
6. Test locally
   ↓
7. Deploy to organization
   ↓
8. Monitor and iterate
```

## Best Practices

### MCP Server Design
- Import only necessary tools (avoid over-scoping)
- Use secure authentication (OAuth 2.0, SSO)
- Test each tool individually
- Validate server endpoints are HTTPS
- Consider token limits when selecting tools

### Agent Instructions
- Be specific and clear about agent capabilities
- Provide examples of how to interact
- Set boundaries for what agent can/cannot do
- Use conversation starters to guide users

### Response Formatting
- Use JSONPath to extract relevant data
- Map properties clearly (title, subtitle, url)
- Design adaptive cards for readability
- Test cards across Copilot surfaces (Chat, Teams, Outlook)

### Security and Governance
- Never commit credentials to source control
- Use environment variables for secrets
- Follow principle of least privilege
- Review compliance requirements
- Monitor agent usage and performance

## Common Use Cases

### Data Retrieval
- Search external systems
- Fetch user-specific information
- Query databases or APIs
- Aggregate data from multiple sources

### Task Automation
- Create tickets or tasks
- Update records or statuses
- Trigger workflows
- Schedule actions

### Content Generation
- Create documents or designs
- Generate reports or summaries
- Format data into templates
- Export in various formats

### Integration Scenarios
- Connect CRM systems
- Integrate project management tools
- Access knowledge bases
- Connect to custom business apps

## Troubleshooting

### Agent Not Appearing in Copilot
- Verify agent is deployed in admin center
- Check user is in assigned group
- Confirm agent is not blocked
- Refresh Copilot interface

### Authentication Errors
- Validate OAuth credentials in .env.local
- Check scopes match required permissions
- Test auth flow independently
- Verify MCP server is accessible

### Response Formatting Issues
- Test JSONPath expressions with sample data
- Validate data_path extracts expected array/object
- Check property mappings are correct
- Test adaptive card with various response structures

### Performance Problems
- Monitor MCP server response times
- Reduce number of imported tools
- Optimize response data size
- Use caching where appropriate

## Resources

### Official Documentation
- [Build Declarative Agents with MCP (DevBlogs)](https://devblogs.microsoft.com/microsoft365dev/build-declarative-agents-for-microsoft-365-copilot-with-mcp/)
- [Build MCP Plugins (Microsoft Learn)](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/build-mcp-plugins)
- [API Plugin Adaptive Cards (Microsoft Learn)](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api-plugin-adaptive-cards)
- [Manage Copilot Agents (Microsoft Learn)](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-copilot-agents-integrated-apps)

### Tools and Extensions
- [Microsoft 365 Agents Toolkit](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [Teams Toolkit](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)

### MCP Resources
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP Server Directory](https://github.com/modelcontextprotocol/servers)
- Community MCP servers and examples

### Admin and Governance
- [Microsoft 365 Admin Center](https://admin.microsoft.com/)
- [Power Platform Admin Center](https://admin.powerplatform.microsoft.com/)
- [Partner Center](https://partner.microsoft.com/) for agent submissions

## Support and Community

- Join the [Microsoft 365 Developer Community](https://developer.microsoft.com/en-us/microsoft-365/community)
- Ask questions on [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/products/)
- Share feedback in [Microsoft 365 Copilot GitHub discussions](https://github.com/microsoft/copilot-feedback)

## What's Next?

After mastering MCP-based agents, explore:
- **Advanced tool composition**: Combine multiple MCP servers
- **Custom authentication flows**: Implement custom OAuth providers
- **Complex adaptive cards**: Multi-action cards with dynamic data
- **Agent analytics**: Track usage patterns and optimize
- **Multi-agent orchestration**: Build agents that work together

---

*This collection is maintained by the community and reflects current best practices for MCP-based M365 Copilot agent development. Contributions and feedback welcome!*
