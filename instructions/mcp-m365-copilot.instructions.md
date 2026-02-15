---
description: 'Best practices for building MCP-based declarative agents and API plugins for Microsoft 365 Copilot with Model Context Protocol integration'
applyTo: '**/{*mcp*,*agent*,*plugin*,declarativeAgent.json,ai-plugin.json,mcp.json,manifest.json}'
---

# MCP-based M365 Copilot Development Guidelines

## Core Principles

### Model Context Protocol First
- Leverage MCP servers for external system integration
- Import tools from server endpoints, not manual definitions
- Let MCP handle schema discovery and function generation
- Use point-and-click tool selection in Agents Toolkit

### Declarative Over Imperative
- Define agent behavior through configuration, not code
- Use declarativeAgent.json for instructions and capabilities
- Specify tools and actions in ai-plugin.json
- Configure MCP servers in mcp.json

### Security and Governance
- Always use OAuth 2.0 or SSO for authentication
- Follow principle of least privilege for tool selection
- Validate MCP server endpoints are secure
- Review compliance requirements before deployment

### User-Centric Design
- Create adaptive cards for rich visual responses
- Provide clear conversation starters
- Design for responsive experience across hubs
- Test thoroughly before organizational deployment

## MCP Server Design

### Server Selection
Choose MCP servers that:
- Expose relevant tools for user tasks
- Support secure authentication (OAuth 2.0, SSO)
- Provide reliable uptime and performance
- Follow MCP specification standards
- Return well-structured response data

### Tool Import Strategy
- Import only necessary tools (avoid over-scoping)
- Group related tools from same server
- Test each tool individually before combining
- Consider token limits when selecting multiple tools

### Authentication Configuration
**OAuth 2.0 Static Registration:**
```json
{
  "type": "OAuthPluginVault",
  "reference_id": "YOUR_AUTH_ID",
  "client_id": "github_client_id",
  "client_secret": "github_client_secret",
  "authorization_url": "https://github.com/login/oauth/authorize",
  "token_url": "https://github.com/login/oauth/access_token",
  "scope": "repo read:user"
}
```

**SSO (Microsoft Entra ID):**
```json
{
  "type": "OAuthPluginVault",
  "reference_id": "sso_auth",
  "authorization_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  "scope": "User.Read"
}
```

## File Organization

### Project Structure
```
project-root/
├── appPackage/
│   ├── manifest.json           # Teams app manifest
│   ├── declarativeAgent.json   # Agent config (instructions, capabilities)
│   ├── ai-plugin.json          # API plugin definition
│   ├── color.png               # App icon color
│   └── outline.png             # App icon outline
├── .vscode/
│   └── mcp.json               # MCP server configuration
├── .env.local                  # Credentials (NEVER commit)
└── teamsapp.yml               # Teams Toolkit config
```

### Critical Files

**declarativeAgent.json:**
- Agent name and description
- Instructions for behavior
- Conversation starters
- Capabilities (actions from plugins)

**ai-plugin.json:**
- MCP server tools import
- Response semantics (data_path, properties)
- Static adaptive card templates
- Function definitions (auto-generated)

**mcp.json:**
- MCP server URL
- Server metadata endpoint
- Authentication reference

**.env.local:**
- OAuth client credentials
- API keys and secrets
- Environment-specific config
- **CRITICAL**: Add to .gitignore

## Response Semantics Best Practices

### Data Path Configuration
Use JSONPath to extract relevant data:
```json
{
  "data_path": "$.items[*]",
  "properties": {
    "title": "$.name",
    "subtitle": "$.description", 
    "url": "$.html_url"
  }
}
```

### Template Selection
For dynamic templates:
```json
{
  "data_path": "$",
  "template_selector": "$.templateType",
  "properties": {
    "title": "$.title",
    "url": "$.url"
  }
}
```

### Static Templates
Define in ai-plugin.json for consistent formatting:
- Use when all responses follow same structure
- Better performance than dynamic templates
- Easier to maintain and version control

## Adaptive Card Guidelines

### Design Principles
- **Single-column layout**: Stack elements vertically
- **Flexible widths**: Use "stretch" or "auto", not fixed pixels
- **Responsive design**: Test in Chat, Teams, Outlook
- **Minimal complexity**: Keep cards simple and scannable

### Template Language Patterns
**Conditionals:**
```json
{
  "type": "TextBlock",
  "text": "${if(status == 'active', '✅ Active', '❌ Inactive')}"
}
```

**Data Binding:**
```json
{
  "type": "TextBlock",
  "text": "${title}",
  "weight": "bolder"
}
```

**Number Formatting:**
```json
{
  "type": "TextBlock",
  "text": "Score: ${formatNumber(score, 0)}"
}
```

**Conditional Rendering:**
```json
{
  "type": "Container",
  "$when": "${count(items) > 0}",
  "items": [ ... ]
}
```

### Card Elements Usage
- **TextBlock**: Titles, descriptions, metadata
- **FactSet**: Key-value pairs (status, dates, IDs)
- **Image**: Icons, thumbnails (use size: "small")
- **Container**: Grouping related content
- **ActionSet**: Buttons for follow-up actions

## Testing and Deployment

### Local Testing Workflow
1. **Provision**: Teams Toolkit → Provision
2. **Deploy**: Teams Toolkit → Deploy
3. **Sideload**: App uploaded to Teams
4. **Test**: Visit [m365.cloud.microsoft/chat](https://m365.cloud.microsoft/chat)
5. **Iterate**: Fix issues and re-deploy

### Pre-Deployment Checklist
- [ ] All MCP server tools tested individually
- [ ] Authentication flow works end-to-end
- [ ] Adaptive cards render correctly across hubs
- [ ] Response semantics extract expected data
- [ ] Error handling provides clear messages
- [ ] Conversation starters are relevant and clear
- [ ] Agent instructions guide proper behavior
- [ ] Compliance and security reviewed

### Deployment Options
**Organization Deployment:**
- IT admin deploys to all or selected users
- Requires approval in Microsoft 365 admin center
- Best for internal business agents

**Agent Store:**
- Submit to Partner Center for validation
- Public availability to all Copilot users
- Requires rigorous security review

## Common Patterns

### Multi-Tool Agent
Import tools from multiple MCP servers:
```json
{
  "mcpServers": {
    "github": {
      "url": "https://github-mcp.example.com"
    },
    "jira": {
      "url": "https://jira-mcp.example.com"
    }
  }
}
```

### Search and Display
1. Tool retrieves data from MCP server
2. Response semantics extract relevant fields
3. Adaptive card displays formatted results
4. User can take action from card buttons

### Authenticated Actions
1. User triggers tool requiring auth
2. OAuth flow redirects for consent
3. Access token stored in plugin vault
4. Subsequent requests use stored token

## Error Handling

### MCP Server Errors
- Provide clear error messages in agent responses
- Fall back to alternative tools if available
- Log errors for debugging
- Guide user to retry or alternative approach

### Authentication Failures
- Check OAuth credentials in .env.local
- Verify scopes match required permissions
- Test auth flow outside Copilot first
- Ensure token refresh logic works

### Response Parsing Failures
- Validate JSONPath expressions in response semantics
- Handle missing or null data gracefully
- Provide default values where appropriate
- Test with varied API responses

## Performance Optimization

### Tool Selection
- Import only necessary tools (reduces token usage)
- Avoid redundant tools from multiple servers
- Test impact of each tool on response time

### Response Size
- Use data_path to filter unnecessary data
- Limit result sets where possible
- Consider pagination for large datasets
- Keep adaptive cards lightweight

### Caching Strategy
- MCP servers should cache where appropriate
- Agent responses may be cached by M365
- Consider cache invalidation for time-sensitive data

## Security Best Practices

### Credential Management
- **NEVER** commit .env.local to source control
- Use environment variables for all secrets
- Rotate OAuth credentials regularly
- Use separate credentials for dev/prod

### Data Privacy
- Only request minimum necessary scopes
- Avoid logging sensitive user data
- Review data residency requirements
- Follow compliance policies (GDPR, etc.)

### Server Validation
- Verify MCP server is trusted and secure
- Check HTTPS endpoints only
- Review server's privacy policy
- Test for injection vulnerabilities

## Governance and Compliance

### Admin Controls
Agents can be:
- **Blocked**: Prevented from use
- **Deployed**: Assigned to specific users/groups
- **Published**: Made available organization-wide

### Monitoring
Track:
- Agent usage and adoption
- Error rates and performance
- User feedback and satisfaction
- Security incidents

### Audit Requirements
Maintain:
- Change history for agent configurations
- Access logs for sensitive operations
- Approval records for deployments
- Compliance attestations

## Resources and References

### Official Documentation
- [Build Declarative Agents with MCP (DevBlogs)](https://devblogs.microsoft.com/microsoft365dev/build-declarative-agents-for-microsoft-365-copilot-with-mcp/)
- [Build MCP Plugins (Learn)](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/build-mcp-plugins)
- [API Plugin Adaptive Cards (Learn)](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api-plugin-adaptive-cards)
- [Manage Copilot Agents (Learn)](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-copilot-agents-integrated-apps)

### Tools and SDKs
- Microsoft 365 Agents Toolkit (VS Code extension v6.3.x+)
- Teams Toolkit for agent packaging
- Adaptive Cards Designer
- MCP specification documentation

### Partner Examples
- monday.com: Task management integration
- Canva: Design automation
- Sitecore: Content management
