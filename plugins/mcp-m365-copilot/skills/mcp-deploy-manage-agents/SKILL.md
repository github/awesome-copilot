---
name: mcp-deploy-manage-agents
description: 'Skill converted from mcp-deploy-manage-agents.prompt.md'
---

````prompt
---
mode: 'agent'
tools: ['changes', 'search/codebase', 'edit/editFiles', 'problems']
description: 'Deploy and manage MCP-based declarative agents in Microsoft 365 admin center with governance, assignments, and organizational distribution'
model: 'gpt-4.1'
tags: [mcp, m365-copilot, deployment, admin, agent-management, governance]
---

# Deploy and Manage MCP-Based Agents

Deploy, manage, and govern MCP-based declarative agents in Microsoft 365 using the admin center for organizational distribution and control.

## Agent Types

### Published by Organization
- Built with predefined instructions and actions
- Follow structured logic for predictable tasks
- Require admin approval and publishing process
- Support compliance and governance requirements

### Shared by Creator
- Created in Microsoft 365 Copilot Studio or Agent Builder
- Shared directly with specific users
- Enhanced functionality with search, actions, connectors, APIs
- Visible to admins in agent registry

### Microsoft Agents
- Developed and maintained by Microsoft
- Integrated with Microsoft 365 services
- Pre-approved and ready to use

### External Partner Agents
- Created by verified external developers/vendors
- Subject to admin approval and control
- Configurable availability and permissions

### Frontier Agents
- Experimental or advanced capabilities
- May require limited rollout or additional oversight
- Examples:
  - **App Builder agent**: Managed via M365 Copilot or Power Platform admin center
  - **Workflows agent**: Flow automation managed via Power Platform admin center

## Admin Roles and Permissions

### Required Roles
- **AI Admin**: Full agent management capabilities
- **Global Reader**: View-only access (no editing)

### Best Practices
- Use roles with fewest permissions
- Limit Global Administrator to emergency scenarios
- Follow principle of least privilege

## Agent Management in Microsoft 365 Admin Center

### Access Agent Management
1. Go to [Microsoft 365 admin center](https://admin.microsoft.com/)
2. Navigate to **Agents** page
3. View available, deployed, or blocked agents

### Available Actions

**View Agents**
- Filter by availability (available, deployed, blocked)
- Search for specific agents
- View agent details (name, creator, date, host products, status)

**Deploy Agents**
Options for distribution:
1. **Agent Store**: Submit to Partner Center for validation and public availability
2. **Organization Deployment**: IT admin deploys to all or selected employees

**Manage Agent Lifecycle**
- **Publish**: Make agent available to organization
- **Deploy**: Assign to specific users or groups
- **Block**: Prevent agent from being used
- **Remove**: Delete agent from organization

**Configure Access**
- Set availability for specific user groups
- Manage permissions per agent
- Control which agents appear in Copilot

## Deployment Workflows

### Publish to Organization

**For Agent Developers:**
1. Build agent with Microsoft 365 Agents Toolkit
2. Test thoroughly in development
3. Submit agent for approval
4. Wait for admin review

**For Admins:**
1. Review submitted agent in admin center
2. Validate compliance and security
3. Approve for organizational use
4. Configure deployment settings
5. Publish to selected users or organization-wide

### Deploy via Agent Store

**Developer Steps:**
1. Complete agent development and testing
2. Package agent for submission
3. Submit to Partner Center
4. Await validation process
5. Receive approval notification
6. Agent appears in Copilot store

**Admin Steps:**
1. Discover agents in Copilot store
2. Review agent details and permissions
3. Assign to organization or user groups
4. Monitor usage and feedback

### Deploy Organizational Agent

**Admin Deployment Options:**
```
Organization-wide:
- All employees with Copilot license
- Automatically available in Copilot

Group-based:
- Specific departments or teams
- Security group assignments
- Role-based access control
```

**Configuration Steps:**
1. Navigate to Agents page in admin center
2. Select agent to deploy
3. Choose deployment scope:
   - All users
   - Specific security groups
   - Individual users
4. Set availability status
5. Configure permissions if applicable
6. Deploy and monitor

## User Experience

### Agent Discovery
Users find agents in:
- Microsoft 365 Copilot hub
- Agent picker in Copilot interface
- Organization's agent catalog

### Agent Access Control
Users can:
- Toggle agents on/off during interactions
- Add/remove agents from their experience
- Right-click agents to manage preferences
- Only access admin-allowed agents

### Agent Usage
- Agents appear in Copilot sidebar
- Users select agent for context
- Queries routed through selected agent
- Responses leverage agent's capabilities

## Governance and Compliance

### Security Considerations
- **Data access**: Review what data agent can access
- **API permissions**: Validate required scopes
- **Authentication**: Ensure secure OAuth flows
- **External connections**: Assess risk of external integrations

### Compliance Requirements
- **Data residency**: Verify data stays within boundaries
- **Privacy policies**: Review agent privacy statement
- **Terms of use**: Validate acceptable use policies
- **Audit logs**: Monitor agent usage and activity

### Monitoring and Reporting
Track:
- Agent adoption rates
- User feedback and satisfaction
- Error rates and performance
- Security incidents or violations

## MCP-Specific Management

### MCP Agent Characteristics
- Connect to external systems via Model Context Protocol
- Use tools exposed by MCP servers
- Require OAuth 2.0 or SSO authentication
- Support same governance as REST API agents

### MCP Agent Validation
Verify:
- MCP server URL is accessible
- Authentication configuration is secure
- Tools imported are appropriate
- Response data doesn't expose sensitive info
- Server follows security best practices

### MCP Agent Deployment
Same process as REST API agents:
1. Review in admin center
2. Validate MCP server compliance
3. Test authentication flow
4. Deploy to users/groups
5. Monitor performance

## Agent Settings and Configuration

### Organizational Settings
Configure at tenant level:
- Enable/disable agent creation
- Set default permissions
- Configure approval workflows
- Define compliance policies

### Per-Agent Settings
Configure for individual agents:
- Availability (on/off)
- User assignment (all/groups/individuals)
- Permission scopes
- Usage limits or quotas

### Environment Routing
For Power Platform-based agents:
- Configure default environment
- Enable environment routing for Copilot Studio
- Manage flows via Power Platform admin center

## Shared Agent Management

### View Shared Agents
Admins can see:
- List of all shared agents
- Creator information
- Creation date
- Host products
- Availability status

### Manage Shared Agents
Admin actions:
- Search for specific shared agents
- View agent capabilities
- Block unsafe or non-compliant agents
- Monitor agent lifecycle

### User Access to Shared Agents
Users access through:
- Microsoft 365 Copilot on various surfaces
- Agent-specific tasks and assistance
- Creator-defined capabilities

## Best Practices

### Before Deployment
- **Pilot test** with small user group
- **Gather feedback** from early adopters
- **Validate security** and compliance
- **Document** agent capabilities and limitations
- **Train users** on agent usage

### During Deployment
- **Phased rollout** to manage adoption
- **Monitor performance** and errors
- **Collect feedback** continuously
- **Address issues** promptly
- **Communicate** availability to users

### Post-Deployment
- **Track metrics**: Adoption, satisfaction, errors
- **Iterate**: Improve based on feedback
- **Update**: Keep agent current with new features
- **Retire**: Remove obsolete or unused agents
- **Review**: Regular security and compliance audits

### Communication
- Announce new agents to users
- Provide documentation and examples
- Share best practices and use cases
- Highlight benefits and capabilities
- Offer support channels

## Troubleshooting

### Agent Not Appearing
- Check deployment status in admin center
- Verify user is in assigned group
- Confirm agent is not blocked
- Check user has Copilot license
- Refresh Copilot interface

### Authentication Failures
- Verify OAuth credentials are valid
- Check user has necessary permissions
- Confirm MCP server is accessible
- Test authentication flow independently

### Performance Issues
- Monitor MCP server response times
- Check network connectivity
- Review error logs in admin center
- Validate agent isn't rate-limited

### Compliance Violations
- Block agent immediately if unsafe
- Review audit logs for violations
- Investigate data access patterns
- Update policies to prevent recurrence

## Resources

- [Microsoft 365 admin center](https://admin.microsoft.com/)
- [Power Platform admin center](https://admin.powerplatform.microsoft.com/)
- [Partner Center](https://partner.microsoft.com/) for agent submissions
- [Microsoft Agent 365 Overview](https://learn.microsoft.com/en-us/microsoft-agent-365/overview)
- [Agent Registry Documentation](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/agent-registry)

## Workflow

Ask the user:
1. Is this agent ready for deployment or still in development?
2. Who should have access (all users, specific groups, individuals)?
3. Are there compliance or security requirements to address?
4. Should this be published to the organization or the public store?
5. What monitoring and reporting is needed?

Then provide:
- Step-by-step deployment guide
- Admin center configuration steps
- User assignment recommendations
- Governance and compliance checklist
- Monitoring and reporting plan

````
