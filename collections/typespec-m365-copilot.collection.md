# TypeSpec for Microsoft 365 Copilot

## Overview

TypeSpec for Microsoft 365 Copilot is a powerful domain-specific language (DSL) that enables developers to create declarative agents and API plugins using a clean, expressive syntax. Built on the foundation of [TypeSpec](https://typespec.io/), this specialized language provides Microsoft 365-specific decorators and capabilities that streamline the development process for extending Microsoft 365 Copilot.

## Why Use TypeSpec?

- **Type Safety**: Comprehensive type checking for all Microsoft 365 Copilot-specific constructs
- **Developer Experience**: Rich IntelliSense support in Visual Studio Code with real-time feedback
- **Simplified Authoring**: Replace verbose JSON configurations with intuitive decorator-based syntax
- **Automatic Manifest Generation**: Automatically generates valid manifest files and OpenAPI specifications
- **Maintainability**: More readable and maintainable codebase compared to manual JSON authoring

## Core Concepts

### Declarative Agents

A declarative agent is a customized version of Microsoft 365 Copilot that allows users to create personalized experiences by declaring specific instructions, actions, and knowledge.

**Basic Agent Example:**
```typescript
@agent(
  "Customer Support Assistant",
  "An AI agent that helps with customer support inquiries and ticket management"
)
@instructions("""
  You are a customer support specialist. Help users with their inquiries,
  provide troubleshooting steps, and escalate complex issues when necessary.
  Always maintain a helpful and professional tone.
""")
@conversationStarter(#{
  title: "Check Ticket Status",
  text: "What's the status of my support ticket?"
})
namespace CustomerSupportAgent {
  // Agent capabilities defined here
}
```

### API Plugins

API plugins extend Microsoft 365 Copilot with custom API operations, enabling integration with external services and data sources.

**Basic API Plugin Example:**
```typescript
import "@typespec/http";
import "@microsoft/typespec-m365-copilot";

using TypeSpec.Http;
using Microsoft.M365Copilot;

@service
@server("https://api.contoso.com")
@actions(#{
  nameForHuman: "Project Management API",
  descriptionForHuman: "Manage projects and tasks",
  descriptionForModel: "API for creating, updating, and tracking project tasks"
})
namespace ProjectAPI {
  model Project {
    id: string;
    name: string;
    description?: string;
    status: "active" | "completed" | "on-hold";
    createdDate: utcDateTime;
  }

  @route("/projects")
  @get op listProjects(): Project[];

  @route("/projects/{id}")
  @get op getProject(@path id: string): Project;

  @route("/projects")
  @post op createProject(@body project: CreateProjectRequest): Project;
}
```

## Key Decorators

### Agent Decorators

- **@agent**: Define an agent with name, description, and optional ID
- **@instructions**: Define behavioral instructions and guidelines for the agent
- **@conversationStarter**: Define conversation starter prompts for users
- **@behaviorOverrides**: Modify agent orchestration behavior settings
- **@disclaimer**: Display legal or compliance disclaimers to users
- **@customExtension**: Add custom key-value pairs for extensibility

### API Plugin Decorators

- **@actions**: Define action metadata including names, descriptions, and URLs
- **@authReferenceId**: Specify authentication reference ID for API access
- **@capabilities**: Configure function capabilities like confirmations and response formatting
- **@card**: Define Adaptive Card templates for function responses
- **@reasoning**: Provide reasoning instructions for function invocation
- **@responding**: Define response formatting instructions for functions

## Agent Capabilities

TypeSpec provides built-in capabilities for accessing Microsoft 365 services and external resources:

### Knowledge Sources

**Web Search**
```typescript
op webSearch is AgentCapabilities.WebSearch<Sites = [
  {
    url: "https://learn.microsoft.com"
  }
]>;
```

**OneDrive and SharePoint**
```typescript
op oneDriveAndSharePoint is AgentCapabilities.OneDriveAndSharePoint<
  ItemsByUrl = [
    { url: "https://contoso.sharepoint.com/sites/ProductSupport" }
  ]
>;
```

**Teams Messages**
```typescript
op teamsMessages is AgentCapabilities.TeamsMessages<Urls = [
  {
    url: "https://teams.microsoft.com/l/team/...",
  }
]>;
```

**Email**
```typescript
op email is AgentCapabilities.Email<Folders = [
  {
    folderId: "Inbox",
  }
]>;
```

**People**
```typescript
op people is AgentCapabilities.People;
```

**Copilot Connectors**
```typescript
op copilotConnectors is AgentCapabilities.GraphConnectors<Connections = [
  {
    connectionId: "policieslocal",
  }
]>;
```

**Dataverse**
```typescript
op dataverse is AgentCapabilities.Dataverse<KnowledgeSources = [
  {
    hostName: "contoso.crm.dynamics.com";
    tables: [
      { tableName: "account" },
      { tableName: "contact" }
    ];
  }
]>;
```

### Productivity Tools

**Code Interpreter**
```typescript
op codeInterpreter is AgentCapabilities.CodeInterpreter;
```

**Image Generator**
```typescript
op graphicArt is AgentCapabilities.GraphicArt;
```

**Meetings**
```typescript
op meetings is AgentCapabilities.Meetings;
```

**Scenario Models**
```typescript
op scenarioModels is AgentCapabilities.ScenarioModels<ModelsById = [
  { id: "financial-forecasting-model-v3" }
]>;
```

## Authentication

TypeSpec supports multiple authentication methods for securing API plugins:

### No Authentication (Anonymous)
```typescript
@service
@actions(ACTIONS_METADATA)
@server(SERVER_URL, API_NAME)
namespace API {
  // Endpoints
}
```

### API Key Authentication
```typescript
@service
@actions(ACTIONS_METADATA)
@server(SERVER_URL, API_NAME)
@useAuth(ApiKeyAuth<ApiKeyLocation.header, "X-Your-Key">)
namespace API {
  // Endpoints
}
```

### OAuth2 Authorization Code Flow
```typescript
@service
@actions(ACTIONS_METADATA)
@server(SERVER_URL, API_NAME)
@useAuth(OAuth2Auth<[{
  type: OAuth2FlowType.authorizationCode;
  authorizationUrl: "https://contoso.com/oauth2/v2.0/authorize";
  tokenUrl: "https://contoso.com/oauth2/v2.0/token";
  refreshUrl: "https://contoso.com/oauth2/v2.0/token";
  scopes: ["scope-1", "scope-2"];
}]>)
namespace API {
  // Endpoints
}
```

### Using Registered Authentication
```typescript
@authReferenceId("NzFmOTg4YmYtODZmMS00MWFmLTkxYWItMmQ3Y2QwMTFkYjQ3IyM5NzQ5Njc3Yi04NDk2LTRlODYtOTdmZS1kNDUzODllZjUxYjM=")
model Auth is OAuth2Auth<[{
  type: OAuth2FlowType.authorizationCode;
  authorizationUrl: "https://contoso.com/oauth2/v2.0/authorize";
  tokenUrl: "https://contoso.com/oauth2/v2.0/token";
  refreshUrl: "https://contoso.com/oauth2/v2.0/token";
  scopes: ["scope-1", "scope-2"];
}]>
```

## Common Scenarios

### Multi-Capability Knowledge Worker Agent
```typescript
import "@typespec/http";
import "@typespec/openapi3";
import "@microsoft/typespec-m365-copilot";

using TypeSpec.Http;
using TypeSpec.M365.Copilot.Agents;

@agent({
  name: "Knowledge Worker Assistant",
  description: "An intelligent assistant that helps with research, file management, and finding colleagues"
})
@instructions("""
  You are a knowledgeable research assistant specialized in helping knowledge workers
  find information efficiently. You can search the web for external research, access
  SharePoint documents for organizational content, and help locate colleagues within
  the organization.
""")
namespace KnowledgeWorkerAgent {
  op webSearch is AgentCapabilities.WebSearch<Sites = [
    {
      url: "https://learn.microsoft.com";
    }
  ]>;

  op oneDriveAndSharePoint is AgentCapabilities.OneDriveAndSharePoint<
    ItemsByUrl = [
      { url: "https://contoso.sharepoint.com/sites/IT" }
    ]
  >;

  op people is AgentCapabilities.People;
}
```

### API Plugin with Authentication
```typescript
import "@typespec/http";
import "@microsoft/typespec-m365-copilot";

using TypeSpec.Http;
using TypeSpec.M365.Copilot.Actions;

@service
@actions(#{
    nameForHuman: "Repairs Hub API",
    descriptionForModel: "Comprehensive repair management system",
    descriptionForHuman: "Manage facility repairs and track assignments"
})
@server("https://repairshub-apikey.contoso.com", "Repairs Hub API")
@useAuth(RepairsHubApiKeyAuth)
namespace RepairsHub {
  @route("/repairs")
  @get
  @action
  @card(#{
    dataPath: "$",
    title: "$.title",
    url: "$.image",
    file: "cards/card.json"
  })
  op listRepairs(
    @query assignedTo?: string
  ): string;

  @route("/repairs")
  @post
  @action
  @capabilities(#{
    confirmation: #{
      type: "AdaptiveCard",
      title: "Create a new repair",
      body: """
      Creating a new repair with the following details:
        * **Title**: {{ function.parameters.title }}
        * **Description**: {{ function.parameters.description }}
      """
    }
  })
  op createRepair(
    @body repair: Repair
  ): Repair;

  model Repair {
    id?: string;
    title: string;
    description?: string;
    assignedTo?: string;
  }

  @authReferenceId("${{REPAIRSHUBAPIKEYAUTH_REFERENCE_ID}}")
  model RepairsHubApiKeyAuth is ApiKeyAuth<ApiKeyLocation.query, "code">;
}
```

## Getting Started

### Prerequisites
- [Visual Studio Code](https://code.visualstudio.com/)
- [Microsoft 365 Agents Toolkit Visual Studio Code extension](https://aka.ms/M365AgentsToolkit)
- Microsoft 365 Copilot license

### Create Your First Agent

1. Open Visual Studio Code
2. Select **Microsoft 365 Agents Toolkit > Create a New Agent/App**
3. Select **Declarative Agent**
4. Select **Start with TypeSpec for Microsoft 365 Copilot**
5. Choose your project location and name
6. Edit the `main.tsp` file to customize your agent
7. Select **Provision** in the Lifecycle pane to deploy

## Best Practices

### Instructions
- Be specific and clear about the agent's role and expertise
- Define behaviors to avoid as well as desired behaviors
- Keep instructions under 8,000 characters
- Use triple-quoted strings for multi-line instructions

### Conversation Starters
- Provide 2-4 diverse examples of how to interact with the agent
- Make them specific to your agent's capabilities
- Keep titles concise (under 100 characters)

### Capabilities
- Only include capabilities your agent actually needs
- Scope capabilities to specific resources when possible
- Use URLs and IDs to limit access to relevant content

### API Operations
- Use descriptive operation names and clear parameter names
- Provide detailed descriptions for model and human consumers
- Use confirmation dialogs for destructive operations
- Implement proper error handling with meaningful error messages

### Authentication
- Use registered authentication configurations for production
- Follow the principle of least privilege for scopes
- Store sensitive credentials in environment variables
- Use `@authReferenceId` to reference registered configurations

## Development Workflow

1. **Create**: Use Microsoft 365 Agents Toolkit to scaffold your project
2. **Define**: Write your TypeSpec definitions in `main.tsp` and `actions.tsp`
3. **Configure**: Set up authentication and capabilities
4. **Provision**: Deploy to your development environment
5. **Test**: Validate in Microsoft 365 Copilot (https://m365.cloud.microsoft/chat)
6. **Debug**: Use Copilot developer mode to troubleshoot
7. **Iterate**: Refine based on testing feedback
8. **Publish**: Deploy to production when ready

## Common Patterns

### File Structure
```
project/
├── appPackage/
│   ├── cards/
│   │   └── card.json
│   ├── .generated/
│   ├── manifest.json
│   └── ...
├── src/
│   ├── main.tsp
│   └── actions.tsp
├── m365agents.yml
└── package.json
```

### Multi-File TypeSpec
```typescript
// main.tsp
import "@typespec/http";
import "@microsoft/typespec-m365-copilot";
import "./actions.tsp";

using TypeSpec.Http;
using TypeSpec.M365.Copilot.Agents;
using TypeSpec.M365.Copilot.Actions;

@agent("My Agent", "Description")
@instructions("Instructions here")
namespace MyAgent {
  op apiAction is MyAPI.someOperation;
}

// actions.tsp
import "@typespec/http";
import "@microsoft/typespec-m365-copilot";

@service
@actions(#{...})
@server("https://api.example.com")
namespace MyAPI {
  @route("/operation")
  @get
  @action
  op someOperation(): Response;
}
```

### Adaptive Cards
```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "$data": "${$root}",
      "items": [
        {
          "type": "TextBlock",
          "text": "Title: ${if(title, title, 'N/A')}",
          "wrap": true
        },
        {
          "type": "Image",
          "url": "${image}",
          "$when": "${image != null}"
        }
      ]
    }
  ]
}
```

## Resources

- [TypeSpec Official Documentation](https://typespec.io/)
- [Microsoft 365 Agents Toolkit](https://aka.ms/M365AgentsToolkit)
- [Declarative Agent Documentation](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/overview-declarative-agent)
- [API Plugin Documentation](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/overview-api-plugins)
- [PnP Copilot Samples](https://github.com/pnp/copilot-pro-dev-samples)

## Learn More

- [TypeSpec Overview](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/overview-typespec)
- [Build Declarative Agents with TypeSpec](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/build-declarative-agents-typespec)
- [TypeSpec Scenarios](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/typespec-scenarios)
- [TypeSpec Authentication](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/typespec-authentication)
- [TypeSpec Decorators Reference](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/typespec-decorators)
- [TypeSpec Capabilities Reference](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/typespec-capabilities)
