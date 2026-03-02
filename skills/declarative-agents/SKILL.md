---
name: declarative-agents
description: 'Complete development kit for Microsoft 365 Copilot declarative agents with three comprehensive workflows (basic, advanced, validation), TypeSpec support, and Microsoft 365 Agents Toolkit integration'
---

# Microsoft 365 Declarative Agents Development Kit

I'll help you create and develop Microsoft 365 Copilot declarative agents using the latest v1.5 schema with comprehensive TypeSpec and Microsoft 365 Agents Toolkit integration. Choose from three specialized workflows:

## Workflow 1: Basic Agent Creation
**Perfect for**: New developers, simple agents, quick prototypes

I'll guide you through:
1. **Agent Planning**: Define purpose, target users, and core capabilities
2. **Capability Selection**: Choose from 11 available capabilities (WebSearch, OneDriveAndSharePoint, GraphConnectors, etc.)
3. **Basic Schema Creation**: Generate compliant JSON manifest with proper constraints
4. **TypeSpec Alternative**: Create modern type-safe definitions that compile to JSON
5. **Testing Setup**: Configure Agents Playground for local testing
6. **Toolkit Integration**: Leverage Microsoft 365 Agents Toolkit for enhanced development

## Workflow 2: Advanced Enterprise Agent Design
**Perfect for**: Complex enterprise scenarios, production deployment, advanced features

I'll help you architect:
1. **Enterprise Requirements Analysis**: Multi-tenant considerations, compliance, security
2. **Advanced Capability Configuration**: Complex capability combinations and interactions
3. **Behavior Override Implementation**: Custom response patterns and specialized behaviors
4. **Localization Strategy**: Multi-language support with proper resource management
5. **Conversation Starters**: Strategic conversation entry points for user engagement
6. **Production Deployment**: Environment management, versioning, and lifecycle planning
7. **Monitoring & Analytics**: Implementation of tracking and performance optimization

## Workflow 3: Validation & Optimization
**Perfect for**: Existing agents, troubleshooting, performance optimization

I'll perform:
1. **Schema Compliance Validation**: Full v1.5 specification adherence checking
2. **Character Limit Optimization**: Name (100), description (1000), instructions (8000)
3. **Capability Audit**: Verify proper capability configuration and usage
4. **TypeSpec Migration**: Convert existing JSON to modern TypeSpec definitions
5. **Testing Protocol**: Comprehensive validation using Agents Playground
6. **Performance Analysis**: Identify bottlenecks and optimization opportunities
7. **Best Practices Review**: Alignment with Microsoft guidelines and recommendations

## Core Features Across All Workflows

### Microsoft 365 Agents Toolkit Integration
- **VS Code Extension**: Full integration with `teamsdevapp.ms-teams-vscode-extension`
- **TypeSpec Development**: Modern type-safe agent definitions
- **Local Debugging**: Agents Playground integration for testing
- **Environment Management**: Development, staging, production configurations
- **Lifecycle Management**: Creation, testing, deployment, monitoring

### TypeSpec Examples
```typespec
// Modern declarative agent definition
model MyAgent {
  name: string;
  description: string;
  instructions: string;
  capabilities: AgentCapability[];
  conversation_starters?: ConversationStarter[];
}
```

### JSON Schema v1.5 Validation
- Full compliance with latest Microsoft specification
- Character limit enforcement (name: 100, description: 1000, instructions: 8000)
- Array constraint validation (conversation_starters: max 4, capabilities: max 5)
- Required field validation and type checking

### Available Capabilities (Choose up to 5)
1. **WebSearch**: Internet search functionality
2. **OneDriveAndSharePoint**: File and content access
3. **GraphConnectors**: Enterprise data integration
4. **MicrosoftGraph**: Microsoft 365 service integration
5. **TeamsAndOutlook**: Communication platform access
6. **PowerPlatform**: Power Apps and Power Automate integration
7. **BusinessDataProcessing**: Enterprise data analysis
8. **WordAndExcel**: Document and spreadsheet manipulation
9. **CopilotForMicrosoft365**: Advanced Copilot features
10. **EnterpriseApplications**: Third-party system integration
11. **CustomConnectors**: Custom API and service integration

### Environment Variables Support
```json
{
  "name": "${AGENT_NAME}",
  "description": "${AGENT_DESCRIPTION}",
  "instructions": "${AGENT_INSTRUCTIONS}"
}
```

**Which workflow would you like to start with?** Share your requirements and I'll provide specialized guidance for your Microsoft 365 Copilot declarative agent development with full TypeSpec and Microsoft 365 Agents Toolkit support.
